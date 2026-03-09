// supabase/functions/generate-3d/index.ts
// Edge Function: calls TRELLIS.2 via Gradio REST API, stores GLB in Supabase Storage,
// updates menu_item_models status.
//
// Secrets: HF_TOKEN, SUPABASE_URL (auto), SUPABASE_SERVICE_ROLE_KEY (auto)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPACE_URL = "https://microsoft-trellis-2.hf.space";

// ─── Gradio REST helpers ─────────────────────────────────────────────────────

async function gradioCall(
  apiName: string,
  data: unknown[],
  hfToken: string,
  timeoutMs = 180_000
): Promise<unknown[]> {
  // Step 1: POST to /call/{api_name}
  const postRes = await fetch(`${SPACE_URL}/call/${apiName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${hfToken}`,
    },
    body: JSON.stringify({ data }),
  });

  if (!postRes.ok) {
    const errText = await postRes.text();
    throw new Error(`Gradio /call/${apiName} POST failed (${postRes.status}): ${errText}`);
  }

  const { event_id } = await postRes.json();
  if (!event_id) throw new Error(`No event_id from /call/${apiName}`);

  // Step 2: GET SSE stream /call/{api_name}/{event_id}
  const sseRes = await fetch(`${SPACE_URL}/call/${apiName}/${event_id}`, {
    headers: { Authorization: `Bearer ${hfToken}` },
  });

  if (!sseRes.ok) {
    throw new Error(`Gradio SSE fetch failed (${sseRes.status})`);
  }

  const text = await sseRes.text();

  // Parse SSE: look for "event: complete" followed by "data: ..."
  const lines = text.split("\n");
  let lastData: string | null = null;
  let foundComplete = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "event: complete") {
      foundComplete = true;
    }
    if (line.startsWith("data: ") && foundComplete) {
      lastData = line.slice(6);
      break;
    }
    // Also capture any data line (fallback for non-standard SSE)
    if (line.startsWith("data: ")) {
      lastData = line.slice(6);
    }
  }

  // Check for error events
  for (const line of lines) {
    if (line.trim() === "event: error") {
      const errorDataIdx = lines.indexOf(line) + 1;
      if (errorDataIdx < lines.length) {
        const errorData = lines[errorDataIdx].trim();
        if (errorData.startsWith("data: ")) {
          throw new Error(`TRELLIS.2 error: ${errorData.slice(6)}`);
        }
      }
      throw new Error("TRELLIS.2 returned an error event");
    }
  }

  if (!lastData) {
    throw new Error(`No data received from Gradio SSE for ${apiName}`);
  }

  return JSON.parse(lastData);
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let dishId: string | undefined;

  try {
    const hfToken = Deno.env.get("HF_TOKEN");
    if (!hfToken) throw new Error("HF_TOKEN not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    dishId = body.dishId;
    const imageUrl = body.imageUrl;
    if (!dishId || !imageUrl) throw new Error("dishId and imageUrl required");

    // Set status to processing
    await supabase
      .from("menu_item_models")
      .upsert(
        { item_id: dishId, status: "processing", updated_at: new Date().toISOString() },
        { onConflict: "item_id" }
      );

    // ── Step 1: Fetch image & convert to base64 data URL ──────────────────
    console.log("[generate-3d] Fetching image...");
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Cannot fetch image: " + imageUrl);
    const imgBuffer = await imgRes.arrayBuffer();
    const imgBytes = new Uint8Array(imgBuffer);

    // Build base64 in chunks to avoid stack overflow
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < imgBytes.length; i += chunkSize) {
      binary += String.fromCharCode(...imgBytes.slice(i, i + chunkSize));
    }
    const imgBase64 = btoa(binary);
    const mimeType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const imageDataUrl = `data:${mimeType};base64,${imgBase64}`;

    // ── Step 2: Preprocess image (background removal) ─────────────────────
    console.log("[generate-3d] Step 1: preprocess_image...");
    const preprocessResult = await gradioCall(
      "preprocess_image",
      [{ path: imageDataUrl, url: imageDataUrl }],
      hfToken
    );
    const processedImage = preprocessResult[0];
    console.log("[generate-3d] Preprocess done");

    // ── Step 3: Generate 3D model ─────────────────────────────────────────
    console.log("[generate-3d] Step 2: image_to_3d...");
    const gen3dResult = await gradioCall(
      "image_to_3d",
      [
        processedImage,
        0,        // seed
        "1024",   // resolution
        7.5, 0.7, 12, 5.0,  // SS guidance, step size, steps, cfg
        7.5, 0.5, 12, 3.0,  // SLat params
        1.0, 0.0, 12, 3.0,  // additional params
      ],
      hfToken,
      180_000
    );
    const modelState = gen3dResult[0];
    console.log("[generate-3d] 3D generation done");

    // ── Step 4: Extract GLB ───────────────────────────────────────────────
    console.log("[generate-3d] Step 3: extract_glb...");
    const glbResult = await gradioCall(
      "extract_glb",
      [modelState, 300000, 2048],
      hfToken
    );

    const glbFileInfo = glbResult[0] as { url?: string; path?: string; orig_name?: string };
    const glbDownloadUrl = glbFileInfo?.url ?? `${SPACE_URL}/file=${glbFileInfo?.path}`;
    console.log("[generate-3d] GLB file info:", JSON.stringify(glbFileInfo));

    // ── Step 5: Download GLB & store in Supabase Storage ──────────────────
    console.log("[generate-3d] Step 4: downloading GLB...");
    const glbRes = await fetch(glbDownloadUrl, {
      headers: { Authorization: `Bearer ${hfToken}` },
    });
    if (!glbRes.ok) throw new Error("Cannot download GLB: " + glbDownloadUrl);
    const glbBuffer = await glbRes.arrayBuffer();

    const storagePath = `3d/${dishId}.glb`;
    const { error: uploadError } = await supabase.storage
      .from("models")
      .upload(storagePath, glbBuffer, {
        contentType: "model/gltf-binary",
        upsert: true,
      });
    if (uploadError) throw new Error("Storage upload failed: " + uploadError.message);

    const { data: publicUrlData } = supabase.storage
      .from("models")
      .getPublicUrl(storagePath);
    const publicGlbUrl = publicUrlData.publicUrl;

    // ── Step 6: Update status to ready ────────────────────────────────────
    const { error: dbError } = await supabase
      .from("menu_item_models")
      .upsert(
        {
          item_id: dishId,
          status: "ready",
          glb_path: publicGlbUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "item_id" }
      );
    if (dbError) throw new Error("DB update failed: " + dbError.message);

    console.log("[generate-3d] Done! GLB:", publicGlbUrl);

    return new Response(
      JSON.stringify({ success: true, model_3d_url: publicGlbUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[generate-3d] Error:", err);

    if (dishId) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        await supabase
          .from("menu_item_models")
          .upsert(
            { item_id: dishId, status: "failed", updated_at: new Date().toISOString() },
            { onConflict: "item_id" }
          );
      } catch (_) { /* ignore */ }
    }

    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
