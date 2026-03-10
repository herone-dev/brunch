// supabase/functions/generate-3d/index.ts
// Architecture async : répond immédiatement au frontend, génère en arrière-plan.
// Le frontend reçoit les mises à jour via Supabase Realtime sur menu_item_models.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPACE_URL = "https://microsoft-trellis-2.hf.space";

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

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

// ─── Gradio Named REST API call ───────────────────────────────────────────────
// Uses /gradio_api/call/<endpoint> (POST to submit, GET to stream results)
// This is simpler and more reliable than queue/join + SSE with fn_index.

async function gradioCallNamed(
  endpoint: string,
  data: unknown[],
  hfToken: string,
  timeoutMs = 300_000
): Promise<unknown[]> {
  // 1. Submit
  const submitUrl = `${SPACE_URL}/gradio_api/call${endpoint}`;
  console.log(`[generate-3d] POST ${endpoint}`);
  const submitRes = await fetch(submitUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${hfToken}` },
    body: JSON.stringify({ data }),
    signal: AbortSignal.timeout(30000),
  });
  if (!submitRes.ok) {
    const txt = await submitRes.text().catch(() => "");
    throw new Error(`POST ${endpoint} failed ${submitRes.status}: ${txt}`);
  }
  const { event_id } = await submitRes.json();
  console.log(`[generate-3d] ${endpoint} event_id=${event_id}`);

  // 2. Read SSE result stream
  const resultUrl = `${SPACE_URL}/gradio_api/call${endpoint}/${event_id}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(resultUrl, {
      headers: { Authorization: `Bearer ${hfToken}`, Accept: "text/event-stream" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`GET ${endpoint}/${event_id} failed: ${res.status}`);
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events (split by double newline)
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const lines = part.trim().split("\n");
        const eventLine = lines.find((l) => l.startsWith("event: "));
        const dataLine = lines.find((l) => l.startsWith("data: "));

        if (!eventLine) continue;
        const event = eventLine.slice(7).trim();

        if (event === "heartbeat") continue;

        if (event === "log") {
          if (dataLine) console.log(`[generate-3d] ${endpoint} log:`, dataLine.slice(6));
          continue;
        }

        if (event === "error") {
          const errMsg = dataLine ? dataLine.slice(6) : "Unknown error";
          reader.cancel().catch(() => {});
          throw new Error(`${endpoint} error: ${errMsg}`);
        }

        if (event === "complete") {
          reader.cancel().catch(() => {});
          if (!dataLine) {
            console.log(`[generate-3d] ${endpoint} completed (no data — void endpoint)`);
            return [];
          }
          try {
            const parsed = JSON.parse(dataLine.slice(6));
            console.log(`[generate-3d] ${endpoint} completed:`, JSON.stringify(parsed).slice(0, 500));
            if (Array.isArray(parsed)) return parsed;
            return [];
          } catch {
            console.log(`[generate-3d] ${endpoint} completed (unparseable data)`);
            return [];
          }
        }
      }
    }
    throw new Error(`${endpoint}: SSE stream ended without complete event`);
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Upload file to Gradio ────────────────────────────────────────────────────

async function gradioUpload(fileBytes: Uint8Array, filename: string, hfToken: string): Promise<string> {
  const formData = new FormData();
  formData.append("files", new Blob([fileBytes]), filename);

  const res = await fetch(`${SPACE_URL}/gradio_api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${hfToken}` },
    body: formData,
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gradio upload failed ${res.status}: ${txt}`);
  }
  const paths = await res.json();
  console.log("[generate-3d] Uploaded to Gradio:", JSON.stringify(paths));
  if (Array.isArray(paths) && paths.length > 0) return paths[0];
  throw new Error("Gradio upload returned no path");
}

function validateGlb(buffer: ArrayBuffer): void {
  if (buffer.byteLength < 12) throw new Error(`GLB trop petit: ${buffer.byteLength} bytes`);
  const magic = new DataView(buffer).getUint32(0, true);
  if (magic !== 0x46546C67) throw new Error(`Pas un GLB valide (magic: 0x${magic.toString(16)})`);
  console.log(`[generate-3d] GLB OK: ${(buffer.byteLength / 1024).toFixed(0)} KB`);
}

// ─── Pipeline principal (tourne en arrière-plan) ──────────────────────────────

async function runPipeline(
  dishId: string,
  imageUrl: string,
  hfToken: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const updateStatus = async (status: string, extra: Record<string, unknown> = {}) => {
    console.log(`[generate-3d] Updating status → ${status}`, extra);
    const { error } = await supabase
      .from("menu_item_models")
      .upsert({ item_id: dishId, status, ...extra }, { onConflict: "item_id" });
    if (error) console.error("[generate-3d] updateStatus error:", error);
  };

  try {
    await waitForSpaceReady(hfToken);
    await updateStatus("processing");

    // Step 0: Initialize session (void endpoint, no params/returns)
    console.log("[generate-3d] 0/3 start_session");
    await gradioCallNamed("/start_session", [], hfToken, 60_000);
    console.log("[generate-3d] Session started");

    // Step 1: Fetch image & upload to Gradio
    console.log("[generate-3d] Fetching image:", imageUrl);
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
    if (!imgRes.ok) throw new Error(`Cannot fetch image: ${imgRes.status}`);
    const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
    console.log(`[generate-3d] Image loaded: ${(imgBytes.length / 1024).toFixed(0)} KB`);

    const ext = imageUrl.split(".").pop()?.split("?")[0] || "jpg";
    const gradioPath = await gradioUpload(imgBytes, `dish.${ext}`, hfToken);

    // Step 2: Preprocess image
    console.log("[generate-3d] 1/3 preprocess_image");
    const preprocessResult = await gradioCallNamed(
      "/preprocess_image",
      [{ path: gradioPath, meta: { _type: "gradio.FileData" } }],
      hfToken
    );
    const processedImage = preprocessResult[0];
    console.log("[generate-3d] preprocess result:", JSON.stringify(processedImage).slice(0, 300));

    // Step 3: Image → 3D (15 params matching the API spec)
    console.log("[generate-3d] 2/3 image_to_3d");
    const i3dResult = await gradioCallNamed(
      "/image_to_3d",
      [
        processedImage,  // image (preprocessed)
        0,               // seed
        "1024",          // resolution
        7.5,             // ss_guidance_strength
        0.7,             // ss_guidance_rescale
        12,              // ss_sampling_steps
        5.0,             // ss_rescale_t
        7.5,             // shape_slat_guidance_strength
        0.5,             // shape_slat_guidance_rescale
        12,              // shape_slat_sampling_steps
        3.0,             // shape_slat_rescale_t
        1.0,             // tex_slat_guidance_strength
        0.0,             // tex_slat_guidance_rescale
        12,              // tex_slat_sampling_steps
        3.0,             // tex_slat_rescale_t
      ],
      hfToken, 300_000
    );
    console.log("[generate-3d] image_to_3d result:", JSON.stringify(i3dResult).slice(0, 300));

    // Step 4: Extract GLB
    console.log("[generate-3d] 3/3 extract_glb");
    const extractResult = await gradioCallNamed(
      "/extract_glb",
      [300000, 2048],  // decimation_target, texture_size
      hfToken, 120_000
    );
    console.log("[generate-3d] extract_glb result:", JSON.stringify(extractResult).slice(0, 500));

    // extract_glb returns [glbFileData, downloadFileData]
    const glbInfo = (extractResult[0] ?? extractResult[1]) as { url?: string; path?: string } | null;
    if (!glbInfo) throw new Error("extract_glb returned no file data");

    const glbUrl = glbInfo.url ?? `${SPACE_URL}/gradio_api/file=${glbInfo.path}`;
    console.log("[generate-3d] Downloading GLB from:", glbUrl);

    // Step 5: Download + validate GLB
    const glbRes = await fetch(glbUrl, {
      headers: { Authorization: `Bearer ${hfToken}` },
      signal: AbortSignal.timeout(60000),
    });
    if (!glbRes.ok) throw new Error(`Cannot download GLB: ${glbRes.status}`);
    const glbBuffer = await glbRes.arrayBuffer();
    validateGlb(glbBuffer);

    // Step 6: Upload to Supabase Storage
    const storagePath = `${dishId}.glb`;
    const { error: uploadErr } = await supabase.storage
      .from("models")
      .upload(storagePath, glbBuffer, { contentType: "model/gltf-binary", upsert: true });
    if (uploadErr) throw new Error(`Storage upload: ${uploadErr.message}`);

    const { data: { publicUrl } } = supabase.storage.from("models").getPublicUrl(storagePath);
    console.log("[generate-3d] Uploaded to storage:", publicUrl);

    // Step 7: Mark "ready" → triggers Realtime on frontend
    await updateStatus("ready", { glb_path: storagePath });
    console.log("[generate-3d] ✅ Done:", publicUrl);

  } catch (err) {
    console.error("[generate-3d] ❌ Pipeline error:", err);
    await updateStatus("failed");
  }
}

// ─── Handler HTTP ────────────────────────────────────────────────────────────

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

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error: upsertErr } = await supabase
      .from("menu_item_models")
      .upsert({ item_id: dishId, status: "pending" }, { onConflict: "item_id" });
    if (upsertErr) console.error("[generate-3d] upsert error:", upsertErr);

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