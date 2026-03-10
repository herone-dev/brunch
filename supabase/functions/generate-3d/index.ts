// supabase/functions/generate-3d/index.ts
// Architecture async : répond immédiatement au frontend, génère en arrière-plan.
// Le frontend reçoit les mises à jour via Supabase Realtime sur menu_item_models.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPACE_URL = "https://microsoft-trellis-2.hf.space";

// ─── Wake-up du Space ─────────────────────────────────────────────────────────

async function waitForSpaceReady(hfToken: string): Promise<void> {
  const MAX_WAIT_MS = 5 * 60 * 1000;
  const POLL_MS = 10_000;
  const start = Date.now();
  console.log("[generate-3d] Waiting for Space to wake up...");

  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const res = await fetch(`${SPACE_URL}/gradio_api/info`, {
        headers: { Authorization: `Bearer ${hfToken}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        console.log(`[generate-3d] Space ready (${Math.round((Date.now() - start) / 1000)}s)`);
        return;
      }
    } catch (_) { /* continue */ }
    console.log("[generate-3d] Space sleeping, retry in 10s...");
    await sleep(POLL_MS);
  }
  throw new Error("Space did not wake up within 5 minutes");
}

// ─── Gradio helpers ───────────────────────────────────────────────────────────

async function queueJoin(
  fnIndex: number,
  data: unknown[],
  sessionHash: string,
  hfToken: string,
  retries = 3
): Promise<string> {
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetch(`${SPACE_URL}/gradio_api/queue/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${hfToken}` },
        body: JSON.stringify({ fn_index: fnIndex, data, session_hash: sessionHash }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.event_id) return json.event_id;
      }
      const text = await res.text().catch(() => "");
      throw new Error(`queue/join ${res.status}: ${text}`);
    } catch (err) {
      console.error(`[generate-3d] queueJoin attempt ${i}/${retries}:`, err);
      if (i === retries) throw err;
      await sleep(3000);
    }
  }
  throw new Error("queueJoin: all retries failed");
}

async function waitResult(sessionHash: string, hfToken: string, timeoutMs = 180_000): Promise<unknown[]> {
  const url = `${SPACE_URL}/gradio_api/queue/data?session_hash=${sessionHash}`;
  console.log(`[generate-3d] SSE connecting: ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${hfToken}`, Accept: "text/event-stream" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`SSE connect failed: ${res.status}`);
    if (!res.body) throw new Error("SSE: no body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
        if (!dataLine) continue;
        try {
          const json = JSON.parse(dataLine.slice(6));
          console.log(`[generate-3d] SSE event: ${json.msg}`);

          if (json.msg === "process_completed" && json.output?.data) {
            reader.cancel();
            return json.output.data as unknown[];
          }
          if (json.msg === "process_completed" && json.output?.error) {
            throw new Error(`Gradio error: ${json.output.error}`);
          }
          if (json.msg === "close_stream") {
            throw new Error("Stream closed without result");
          }
        } catch (e) {
          if (String(e).includes("Gradio error") || String(e).includes("Stream closed")) throw e;
          // ignore parse errors
        }
      }
    }
    throw new Error("SSE stream ended without result");
  } finally {
    clearTimeout(timeout);
  }
}

async function getFnIndexes(hfToken: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(`${SPACE_URL}/gradio_api/info`, {
      headers: { Authorization: `Bearer ${hfToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const info = await res.json();
      console.log("[generate-3d] API info endpoints:", JSON.stringify(Object.keys(info.named_endpoints || {})));
      const result: Record<string, number> = {};
      if (info.named_endpoints) {
        const names = Object.keys(info.named_endpoints);
        names.forEach((name, i) => {
          // Strip leading slash
          const clean = name.replace(/^\//, "");
          result[clean] = i;
        });
      }
      return {
        preprocess_image: result["preprocess_image"] ?? 0,
        image_to_3d: result["image_to_3d"] ?? 2,
        extract_glb: result["extract_glb"] ?? 3,
      };
    }
  } catch (e) {
    console.error("[generate-3d] getFnIndexes error:", e);
  }
  return { preprocess_image: 0, image_to_3d: 2, extract_glb: 3 };
}

function validateGlb(buffer: ArrayBuffer): void {
  if (buffer.byteLength < 12) throw new Error(`GLB trop petit: ${buffer.byteLength} bytes`);
  const magic = new DataView(buffer).getUint32(0, true);
  if (magic !== 0x46546C67) throw new Error(`Pas un GLB valide (magic: 0x${magic.toString(16)})`);
  console.log(`[generate-3d] GLB OK: ${(buffer.byteLength / 1024).toFixed(0)} KB`);
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ─── Pipeline principal (tourne en arrière-plan) ──────────────────────────────

async function runPipeline(
  dishId: string,
  imageUrl: string,
  hfToken: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Utilise la bonne table : menu_item_models (pas menu_items)
  const updateStatus = async (status: string, extra: Record<string, unknown> = {}) => {
    console.log(`[generate-3d] Updating status → ${status}`, extra);
    const { error } = await supabase
      .from("menu_item_models")
      .upsert({ item_id: dishId, status, ...extra }, { onConflict: "item_id" });
    if (error) console.error("[generate-3d] updateStatus error:", error);
  };

  try {
    // 0. Réveille le Space
    await waitForSpaceReady(hfToken);
    await updateStatus("processing");

    const sessionHash = crypto.randomUUID().replace(/-/g, "").slice(0, 11);
    const fnIdx = await getFnIndexes(hfToken);
    console.log("[generate-3d] fnIndexes:", JSON.stringify(fnIdx));

    // 1. Fetch image & convert to base64 data URL
    console.log("[generate-3d] Fetching image:", imageUrl);
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
    if (!imgRes.ok) throw new Error(`Cannot fetch image: ${imgRes.status}`);
    const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
    
    // Build base64 in chunks to avoid stack overflow on large images
    let imgBase64 = "";
    const chunkSize = 8192;
    for (let i = 0; i < imgBytes.length; i += chunkSize) {
      imgBase64 += String.fromCharCode(...imgBytes.slice(i, i + chunkSize));
    }
    imgBase64 = btoa(imgBase64);
    
    const mimeType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const imageDataUrl = `data:${mimeType};base64,${imgBase64}`;
    console.log(`[generate-3d] Image loaded: ${(imgBytes.length / 1024).toFixed(0)} KB`);

    // 2. Preprocess
    console.log("[generate-3d] 1/3 preprocess_image (fn_index:", fnIdx.preprocess_image, ")");
    const preprocessId = await queueJoin(
      fnIdx.preprocess_image,
      [{ path: imageDataUrl, url: imageDataUrl, orig_name: "dish.jpg", meta: { _type: "gradio.FileData" } }],
      sessionHash,
      hfToken
    );
    const [processedImage] = await waitResult(preprocessId, hfToken);
    console.log("[generate-3d] preprocess result:", JSON.stringify(processedImage).slice(0, 200));

    // 3. Image → 3D
    console.log("[generate-3d] 2/3 image_to_3d (fn_index:", fnIdx.image_to_3d, ")");
    const gen3dId = await queueJoin(
      fnIdx.image_to_3d,
      [processedImage, 0, "1024", 7.5, 0.7, 12, 5.0, 7.5, 0.5, 12, 3.0, 1.0, 0.0, 12, 3.0],
      sessionHash,
      hfToken
    );
    const [modelState] = await waitResult(gen3dId, hfToken, 180_000);
    console.log("[generate-3d] image_to_3d result:", JSON.stringify(modelState).slice(0, 200));

    // 4. Extract GLB
    console.log("[generate-3d] 3/3 extract_glb (fn_index:", fnIdx.extract_glb, ")");
    const glbId = await queueJoin(fnIdx.extract_glb, [modelState, 300000, 2048], sessionHash, hfToken);
    const [glbInfo] = await waitResult(glbId, hfToken, 60_000) as [{ url?: string; path?: string }];
    console.log("[generate-3d] extract_glb result:", JSON.stringify(glbInfo).slice(0, 300));
    
    const glbUrl = glbInfo?.url ?? `${SPACE_URL}/gradio_api/file=${glbInfo?.path}`;
    console.log("[generate-3d] Downloading GLB from:", glbUrl);

    // 5. Download + validate GLB
    const glbRes = await fetch(glbUrl, {
      headers: { Authorization: `Bearer ${hfToken}` },
      signal: AbortSignal.timeout(60000),
    });
    if (!glbRes.ok) throw new Error(`Cannot download GLB: ${glbRes.status}`);
    const glbBuffer = await glbRes.arrayBuffer();
    validateGlb(glbBuffer);

    // 6. Upload vers Supabase Storage (bucket = "models")
    const storagePath = `${dishId}.glb`;
    const { error: uploadErr } = await supabase.storage
      .from("models")
      .upload(storagePath, glbBuffer, { contentType: "model/gltf-binary", upsert: true });
    if (uploadErr) throw new Error(`Storage upload: ${uploadErr.message}`);

    const { data: { publicUrl } } = supabase.storage.from("models").getPublicUrl(storagePath);
    console.log("[generate-3d] Uploaded to storage:", publicUrl);

    // 7. Marque "ready" → déclenche Realtime côté frontend
    await updateStatus("ready", { glb_path: storagePath });
    console.log("[generate-3d] ✅ Done:", publicUrl);

  } catch (err) {
    console.error("[generate-3d] ❌ Pipeline error:", err);
    await updateStatus("failed");
  }
}

// ─── Handler HTTP (répond immédiatement) ─────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const hfToken = Deno.env.get("HF_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!hfToken) throw new Error("HF_TOKEN not configured");

    const { dishId, imageUrl } = await req.json();
    if (!dishId || !imageUrl) throw new Error("dishId and imageUrl required");

    console.log(`[generate-3d] Request received for dish ${dishId}`);

    // Marque immédiatement "pending" dans menu_item_models
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error: upsertErr } = await supabase
      .from("menu_item_models")
      .upsert({ item_id: dishId, status: "pending" }, { onConflict: "item_id" });
    
    if (upsertErr) console.error("[generate-3d] upsert error:", upsertErr);

    // Lance le pipeline en arrière-plan — ne bloque PAS la réponse HTTP
    EdgeRuntime.waitUntil(runPipeline(dishId, imageUrl, hfToken, supabaseUrl, supabaseKey));

    return new Response(
      JSON.stringify({ success: true, status: "pending", message: "Génération lancée en arrière-plan" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[generate-3d] Handler error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
