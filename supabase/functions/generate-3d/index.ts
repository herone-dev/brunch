// supabase/functions/generate-3d/index.ts
// Edge Function: calls TRELLIS.2 via Gradio REST API, stores GLB in Supabase Storage,
// updates menu_item_models status.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPACE_URL = "https://microsoft-trellis-2.hf.space";

// ─── Gradio REST helper with session support ─────────────────────────────────

async function gradioCall(
  apiName: string,
  data: unknown[],
  hfToken: string,
  sessionHash: string,
): Promise<unknown[]> {
  const postRes = await fetch(`${SPACE_URL}/gradio_api/call/${apiName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${hfToken}`,
    },
    body: JSON.stringify({ data, session_hash: sessionHash }),
  });

  if (!postRes.ok) {
    const errText = await postRes.text();
    throw new Error(`Gradio /call/${apiName} POST failed (${postRes.status}): ${errText}`);
  }

  const { event_id } = await postRes.json();
  if (!event_id) throw new Error(`No event_id from /call/${apiName}`);

  // GET SSE stream
  const sseRes = await fetch(`${SPACE_URL}/gradio_api/call/${apiName}/${event_id}`, {
    headers: { Authorization: `Bearer ${hfToken}` },
  });

  if (!sseRes.ok) {
    throw new Error(`Gradio SSE fetch failed (${sseRes.status})`);
  }

  const text = await sseRes.text();
  console.log(`[generate-3d] SSE response for ${apiName} (first 500 chars):`, text.slice(0, 500));

  const lines = text.split("\n");
  let completeData: string | null = null;
  let foundComplete = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "event: error") {
      // Next data line is the error
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim().startsWith("data: ")) {
          throw new Error(`TRELLIS.2 ${apiName} error: ${lines[j].trim().slice(6)}`);
        }
      }
      throw new Error(`TRELLIS.2 ${apiName} returned error event`);
    }
    if (line === "event: complete") {
      foundComplete = true;
    }
    if (foundComplete && line.startsWith("data: ")) {
      completeData = line.slice(6);
      break;
    }
  }

  if (!completeData) {
    // Fallback: grab last data line
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim().startsWith("data: ")) {
        completeData = lines[i].trim().slice(6);
        break;
      }
    }
  }

  if (!completeData) {
    throw new Error(`No data received from Gradio SSE for ${apiName}. Full response: ${text.slice(0, 1000)}`);
  }

  return JSON.parse(completeData);
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

    // Generate a unique session hash for this generation
    const sessionHash = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    console.log("[generate-3d] Session hash:", sessionHash);

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

    const CHUNK = 4096;
    const chunks: string[] = [];
    for (let i = 0; i < imgBytes.length; i += CHUNK) {
      const slice = imgBytes.subarray(i, Math.min(i + CHUNK, imgBytes.length));
      let str = "";
      for (let j = 0; j < slice.length; j++) {
        str += String.fromCharCode(slice[j]);
      }
      chunks.push(str);
    }
    const imgBase64 = btoa(chunks.join(""));
    const mimeType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const imageDataUrl = `data:${mimeType};base64,${imgBase64}`;

    // ── Step 2: Start session ─────────────────────────────────────────────
    console.log("[generate-3d] Step 0: start_session...");
    await gradioCall("start_session", [], hfToken, sessionHash);
    console.log("[generate-3d] Session started");

    // ── Step 3: Preprocess image ──────────────────────────────────────────
    console.log("[generate-3d] Step 1: preprocess_image...");
    const imgPayload = {
      url: imageDataUrl,
      meta: { _type: "gradio.FileData" },
    };
    const preprocessResult = await gradioCall(
      "preprocess_image",
      [imgPayload],
      hfToken,
      sessionHash
    );
    const processedImage = preprocessResult[0];
    console.log("[generate-3d] Preprocess done");

    // ── Step 4: Generate 3D model ─────────────────────────────────────────
    console.log("[generate-3d] Step 2: image_to_3d...");
    await gradioCall(
      "image_to_3d",
      [
        processedImage,
        0,        // seed
        "1024",   // resolution
        7.5, 0.7, 12, 5.0,  // SS params
        7.5, 0.5, 12, 3.0,  // SLat shape params
        1.0, 0.0, 12, 3.0,  // SLat tex params
      ],
      hfToken,
      sessionHash
    );
    console.log("[generate-3d] 3D generation done");

    // ── Step 5: Extract GLB ───────────────────────────────────────────────
    console.log("[generate-3d] Step 3: extract_glb...");
    const glbResult = await gradioCall(
      "extract_glb",
      [300000, 2048],
      hfToken,
      sessionHash
    );

    const glbFileInfo = glbResult[0] as { url?: string; path?: string; orig_name?: string };
    const glbDownloadUrl = glbFileInfo?.url
      ? (glbFileInfo.url.startsWith("http") ? glbFileInfo.url : `${SPACE_URL}${glbFileInfo.url}`)
      : `${SPACE_URL}/gradio_api/file=${glbFileInfo?.path}`;
    console.log("[generate-3d] GLB file info:", JSON.stringify(glbFileInfo));
    console.log("[generate-3d] GLB download URL:", glbDownloadUrl);

    // ── Step 6: Download GLB & store ──────────────────────────────────────
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

    // ── Step 7: Update status to ready ────────────────────────────────────
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
