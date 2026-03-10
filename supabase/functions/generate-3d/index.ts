// supabase/functions/generate-3d/index.ts
// Architecture async : répond immédiatement au frontend, génère en arrière-plan.
// Le frontend reçoit les mises à jour via Supabase Realtime.

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
      const res = await fetch(`${SPACE_URL}/queue/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${hfToken}` },
        body: JSON.stringify({ fn_index: fnIndex, data, session_hash: sessionHash }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.event_id) return json.event_id;
      }
      throw new Error(`queue/join ${res.status}`);
    } catch (err) {
      if (i === retries) throw err;
      await sleep(3000);
    }
  }
  throw new Error("queueJoin: all retries failed");
}

async function waitResult(eventId: string, hfToken: string, timeoutMs = 130_000): Promise<unknown[]> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await sleep(3000);
    try {
      const res = await fetch(`${SPACE_URL}/queue/status?event_id=${eventId}`, {
        headers: { Authorization: `Bearer ${hfToken}` },
        signal: AbortSignal.timeout(10000),
      });
      if (res.status === 404) throw new Error("SSE 404: Space went back to sleep");
      if (!res.ok) continue;

      const json = await res.json();
      if (json.status === "complete" && json.output?.data) return json.output.data as unknown[];
      if (json.status === "error") throw new Error(`Gradio error: ${JSON.stringify(json)}`);
    } catch (err) {
      if (String(err).includes("404") || String(err).includes("sleep")) throw err;
    }
  }
  throw new Error(`Timed out after ${timeoutMs / 1000}s`);
}

async function getFnIndexes(hfToken: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(`${SPACE_URL}/gradio_api/info`, {
      headers: { Authorization: `Bearer ${hfToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const info = await res.json();
      const result: Record<string, number> = {};
      if (info.named_endpoints) {
        Object.keys(info.named_endpoints).forEach((name, i) => (result[name] = i));
      }
      return {
        preprocess_image: result.preprocess_image ?? 0,
        image_to_3d: result.image_to_3d ?? 2,
        extract_glb: result.extract_glb ?? 3,
      };
    }
  } catch (_) { /* use fallback */ }
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

  const updateStatus = (status: string, extra: Record<string, unknown> = {}) =>
    supabase.from("menu_items").update({ model_3d_status: status, ...extra }).eq("id", dishId);

  try {
    // 0. Réveille le Space
    await waitForSpaceReady(hfToken);
    await updateStatus("generating");

    const sessionHash = crypto.randomUUID().replace(/-/g, "").slice(0, 11);
    const fnIdx = await getFnIndexes(hfToken);

    // 1. Fetch image
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
    if (!imgRes.ok) throw new Error(`Cannot fetch image: ${imgRes.status}`);
    const imgBase64 = btoa(String.fromCharCode(...new Uint8Array(await imgRes.arrayBuffer())));
    const mimeType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const imageDataUrl = `data:${mimeType};base64,${imgBase64}`;

    // 2. Preprocess
    console.log("[generate-3d] 1/3 preprocess_image");
    const preprocessId = await queueJoin(fnIdx.preprocess_image, [{ path: imageDataUrl, url: imageDataUrl }], sessionHash, hfToken);
    const [processedImage] = await waitResult(preprocessId, hfToken);

    // 3. Image → 3D
    console.log("[generate-3d] 2/3 image_to_3d");
    const gen3dId = await queueJoin(
      fnIdx.image_to_3d,
      [processedImage, 0, "1024", 7.5, 0.7, 12, 5.0, 7.5, 0.5, 12, 3.0, 1.0, 0.0, 12, 3.0],
      sessionHash,
      hfToken
    );
    const [modelState] = await waitResult(gen3dId, hfToken, 130_000);

    // 4. Extract GLB
    console.log("[generate-3d] 3/3 extract_glb");
    const glbId = await queueJoin(fnIdx.extract_glb, [modelState, 300000, 2048], sessionHash, hfToken);
    const [glbInfo] = await waitResult(glbId, hfToken, 60_000) as [{ url?: string; path?: string }];
    const glbUrl = glbInfo?.url ?? `${SPACE_URL}/file=${glbInfo?.path}`;

    // 5. Download + validate GLB
    const glbRes = await fetch(glbUrl, { headers: { Authorization: `Bearer ${hfToken}` }, signal: AbortSignal.timeout(60000) });
    if (!glbRes.ok) throw new Error(`Cannot download GLB: ${glbRes.status}`);
    const glbBuffer = await glbRes.arrayBuffer();
    validateGlb(glbBuffer);

    // 6. Upload vers Supabase Storage
    const storagePath = `3d-models/${dishId}.glb`;
    const { error: uploadErr } = await supabase.storage
      .from("dish-models")
      .upload(storagePath, glbBuffer, { contentType: "model/gltf-binary", upsert: true });
    if (uploadErr) throw new Error(`Storage: ${uploadErr.message}`);

    const { data: { publicUrl } } = supabase.storage.from("dish-models").getPublicUrl(storagePath);

    // 7. Marque "ready" → déclenche Realtime côté frontend
    await updateStatus("ready", { model_3d_url: publicUrl });
    console.log("[generate-3d] ✅ Done:", publicUrl);

  } catch (err) {
    console.error("[generate-3d] ❌ Pipeline error:", err);
    await updateStatus("error");
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

    // Marque immédiatement "waking_up" pour que le frontend affiche le bon état
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from("menu_items").update({ model_3d_status: "waking_up" }).eq("id", dishId);

    // Lance le pipeline en arrière-plan — ne bloque PAS la réponse HTTP
    EdgeRuntime.waitUntil(runPipeline(dishId, imageUrl, hfToken, supabaseUrl, supabaseKey));

    // Répond immédiatement au frontend (<1 seconde)
    return new Response(
      JSON.stringify({ success: true, status: "waking_up", message: "Génération lancée en arrière-plan" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
