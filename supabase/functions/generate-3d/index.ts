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

// ─── Wait for Space to be awake ──────────────────────────────────────────────

async function waitForSpaceReady(hfToken: string, maxWaitMs = 300_000): Promise<void> {
  const start = Date.now();
  console.log("[generate-3d] Checking if Space is awake...");

  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(`${SPACE_URL}/gradio_api/info`, {
        headers: { Authorization: `Bearer ${hfToken}` },
      });
      if (res.ok) {
        const body = await res.text();
        if (body.includes("named_endpoints")) {
          console.log("[generate-3d] Space is awake and ready!");
          return;
        }
      }
      console.log(`[generate-3d] Space not ready (status ${res.status}), waiting...`);
      await res.text(); // consume body
    } catch (e) {
      console.log(`[generate-3d] Space check failed: ${e}, retrying...`);
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  throw new Error("TRELLIS.2 Space did not wake up within timeout");
}

// ─── Gradio REST helper ──────────────────────────────────────────────────────

async function gradioCall(
  apiName: string,
  data: unknown[],
  hfToken: string,
  sessionHash: string,
): Promise<unknown[]> {
  console.log(`[generate-3d] Calling /${apiName} with session ${sessionHash}`);
  console.log(`[generate-3d] Payload: ${JSON.stringify(data).slice(0, 500)}`);

  // POST to queue the call
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
    throw new Error(`Gradio POST /call/${apiName} failed (${postRes.status}): ${errText.slice(0, 500)}`);
  }

  const postBody = await postRes.json();
  const eventId = postBody.event_id;
  if (!eventId) {
    throw new Error(`No event_id from /call/${apiName}: ${JSON.stringify(postBody)}`);
  }

  console.log(`[generate-3d] Got event_id: ${eventId}, polling SSE...`);

  // GET SSE stream — poll with retries for long-running tasks
  const sseUrl = `${SPACE_URL}/gradio_api/call/${apiName}/${eventId}`;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    const sseRes = await fetch(sseUrl, {
      headers: { Authorization: `Bearer ${hfToken}` },
    });

    if (!sseRes.ok) {
      const sseErr = await sseRes.text();
      if (attempts < maxAttempts) {
        console.log(`[generate-3d] SSE attempt ${attempts} failed (${sseRes.status}), retrying in 5s...`);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      throw new Error(`Gradio SSE failed (${sseRes.status}): ${sseErr.slice(0, 500)}`);
    }

    const text = await sseRes.text();
    console.log(`[generate-3d] SSE response for /${apiName} (first 1000 chars):`, text.slice(0, 1000));

    // Parse SSE events
    const lines = text.split("\n");
    let currentEvent = "";
    let completeData: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith("event:")) {
        currentEvent = trimmed.slice(6).trim();
      } else if (trimmed.startsWith("data:")) {
        const dataStr = trimmed.slice(5).trim();

        if (currentEvent === "error") {
          throw new Error(`TRELLIS.2 /${apiName} returned error: ${dataStr}`);
        }

        if (currentEvent === "complete") {
          completeData = dataStr;
          break;
        }
      }
    }

    if (completeData) {
      const parsed = JSON.parse(completeData);
      console.log(`[generate-3d] /${apiName} result:`, JSON.stringify(parsed).slice(0, 500));
      return parsed;
    }

    // If we got a response but no complete event, it might still be processing
    if (text.includes("event: heartbeat") || text.includes("event: generating")) {
      console.log(`[generate-3d] /${apiName} still processing, retrying SSE...`);
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    throw new Error(`No complete event from SSE for /${apiName}. Response: ${text.slice(0, 2000)}`);
  }

  throw new Error(`Max SSE attempts reached for /${apiName}`);
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

    // ── Step 0: Ensure Space is awake ─────────────────────────────────────
    await waitForSpaceReady(hfToken);

    // ── Step 1: Start session ─────────────────────────────────────────────
    console.log("[generate-3d] Step 1: start_session...");
    await gradioCall("start_session", [], hfToken, sessionHash);
    console.log("[generate-3d] Session started OK");

    // ── Step 2: Preprocess image ──────────────────────────────────────────
    console.log("[generate-3d] Step 2: preprocess_image...");
    const imgPayload = {
      path: imageUrl,
      url: imageUrl,
      orig_name: "dish.jpg",
      mime_type: "image/jpeg",
      meta: { _type: "gradio.FileData" },
    };
    const preprocessResult = await gradioCall(
      "preprocess_image",
      [imgPayload],
      hfToken,
      sessionHash
    );
    const processedImage = preprocessResult[0];
    console.log("[generate-3d] Preprocess done, result:", JSON.stringify(processedImage).slice(0, 300));

    // ── Step 3: Generate 3D model ─────────────────────────────────────────
    console.log("[generate-3d] Step 3: image_to_3d (this takes 1-3 min)...");
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

    // ── Step 4: Extract GLB ───────────────────────────────────────────────
    console.log("[generate-3d] Step 4: extract_glb...");
    const glbResult = await gradioCall(
      "extract_glb",
      [300000, 2048],
      hfToken,
      sessionHash
    );

    // extract_glb returns [Model3dFileData, DownloadFileData]
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

    console.log("[generate-3d] GLB download URL:", glbDownloadUrl);

    // ── Step 5: Download GLB & store ──────────────────────────────────────
    console.log("[generate-3d] Step 5: downloading GLB...");
    const glbRes = await fetch(glbDownloadUrl, {
      headers: { Authorization: `Bearer ${hfToken}` },
    });
    if (!glbRes.ok) {
      const errBody = await glbRes.text();
      throw new Error(`Cannot download GLB (${glbRes.status}): ${errBody.slice(0, 500)}`);
    }
    const glbBuffer = await glbRes.arrayBuffer();
    console.log("[generate-3d] GLB downloaded, size:", glbBuffer.byteLength, "bytes");

    if (glbBuffer.byteLength < 100) {
      throw new Error("GLB file too small, generation likely failed");
    }

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

    console.log("[generate-3d] ✅ Done! GLB:", publicGlbUrl);

    return new Response(
      JSON.stringify({ success: true, model_3d_url: publicGlbUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[generate-3d] ❌ Error:", err);

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
