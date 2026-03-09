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

// ─── Gradio REST helper ──────────────────────────────────────────────────────

async function gradioCall(
  apiName: string,
  data: unknown[],
  hfToken: string,
  sessionHash: string,
): Promise<unknown[]> {
  console.log(`[generate-3d] Calling ${apiName} with session ${sessionHash}`);
  console.log(`[generate-3d] Payload: ${JSON.stringify(data).slice(0, 300)}`);

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

  const postBody = await postRes.json();
  const eventId = postBody.event_id;
  if (!eventId) throw new Error(`No event_id from /call/${apiName}: ${JSON.stringify(postBody)}`);

  console.log(`[generate-3d] Got event_id: ${eventId}, polling SSE...`);

  // GET SSE stream
  const sseRes = await fetch(`${SPACE_URL}/gradio_api/call/${apiName}/${eventId}`, {
    headers: { Authorization: `Bearer ${hfToken}` },
  });

  if (!sseRes.ok) {
    const sseErr = await sseRes.text();
    throw new Error(`Gradio SSE fetch failed (${sseRes.status}): ${sseErr.slice(0, 500)}`);
  }

  const text = await sseRes.text();
  console.log(`[generate-3d] SSE response for ${apiName} (first 800 chars):`, text.slice(0, 800));

  // Parse SSE events
  const lines = text.split("\n");
  let lastEventType = "";
  let completeData: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("event: ")) {
      lastEventType = line.slice(7).trim();
    }

    if (line.startsWith("data: ")) {
      const dataStr = line.slice(6);

      if (lastEventType === "error") {
        throw new Error(`TRELLIS.2 ${apiName} error: ${dataStr}`);
      }

      if (lastEventType === "complete") {
        completeData = dataStr;
        break;
      }
    }
  }

  if (!completeData) {
    throw new Error(`No complete event from Gradio SSE for ${apiName}. Full: ${text.slice(0, 2000)}`);
  }

  const parsed = JSON.parse(completeData);
  console.log(`[generate-3d] ${apiName} result:`, JSON.stringify(parsed).slice(0, 300));
  return parsed;
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

    const sessionHash = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    console.log("[generate-3d] Starting. Session:", sessionHash, "Image:", imageUrl);

    // Set status to processing
    await supabase
      .from("menu_item_models")
      .upsert(
        { item_id: dishId, status: "processing", updated_at: new Date().toISOString() },
        { onConflict: "item_id" }
      );

    // ── Step 0: Start session ─────────────────────────────────────────────
    console.log("[generate-3d] Step 0: start_session...");
    await gradioCall("start_session", [], hfToken, sessionHash);
    console.log("[generate-3d] Session started");

    // ── Step 1: Preprocess image ──────────────────────────────────────────
    // Use public URL directly — no need for base64 conversion
    console.log("[generate-3d] Step 1: preprocess_image...");
    const imgPayload = {
      path: imageUrl,
      url: imageUrl,
      orig_name: "dish.jpg",
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

    // ── Step 2: Generate 3D model ─────────────────────────────────────────
    console.log("[generate-3d] Step 2: image_to_3d...");
    await gradioCall(
      "image_to_3d",
      [
        processedImage, // image (FileData from preprocess)
        0,              // seed
        "1024",         // resolution
        7.5,            // ss_guidance_strength
        0.7,            // ss_guidance_rescale
        12,             // ss_sampling_steps
        5.0,            // ss_rescale_t
        7.5,            // shape_slat_guidance_strength
        0.5,            // shape_slat_guidance_rescale
        12,             // shape_slat_sampling_steps
        3.0,            // shape_slat_rescale_t
        1.0,            // tex_slat_guidance_strength
        0.0,            // tex_slat_guidance_rescale
        12,             // tex_slat_sampling_steps
        3.0,            // tex_slat_rescale_t
      ],
      hfToken,
      sessionHash
    );
    console.log("[generate-3d] 3D generation done");

    // ── Step 3: Extract GLB ───────────────────────────────────────────────
    console.log("[generate-3d] Step 3: extract_glb...");
    const glbResult = await gradioCall(
      "extract_glb",
      [300000, 2048],
      hfToken,
      sessionHash
    );

    // extract_glb returns [Model3dFileData, DownloadFileData]
    // Use the second one (download button) or first one
    const glbFileInfo = (glbResult[1] || glbResult[0]) as {
      url?: string;
      path?: string;
      orig_name?: string;
    };

    let glbDownloadUrl: string;
    if (glbFileInfo?.url) {
      glbDownloadUrl = glbFileInfo.url.startsWith("http")
        ? glbFileInfo.url
        : `${SPACE_URL}${glbFileInfo.url}`;
    } else if (glbFileInfo?.path) {
      glbDownloadUrl = `${SPACE_URL}/gradio_api/file=${glbFileInfo.path}`;
    } else {
      throw new Error("No GLB URL or path in result: " + JSON.stringify(glbResult));
    }

    console.log("[generate-3d] GLB file info:", JSON.stringify(glbFileInfo));
    console.log("[generate-3d] GLB download URL:", glbDownloadUrl);

    // ── Step 4: Download GLB & store ──────────────────────────────────────
    console.log("[generate-3d] Step 4: downloading GLB...");
    const glbRes = await fetch(glbDownloadUrl, {
      headers: { Authorization: `Bearer ${hfToken}` },
    });
    if (!glbRes.ok) {
      const errBody = await glbRes.text();
      throw new Error(`Cannot download GLB (${glbRes.status}): ${errBody.slice(0, 500)}`);
    }
    const glbBuffer = await glbRes.arrayBuffer();
    console.log("[generate-3d] GLB downloaded, size:", glbBuffer.byteLength);

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

    // ── Step 5: Update status to ready ────────────────────────────────────
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
