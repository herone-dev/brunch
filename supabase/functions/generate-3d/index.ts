// supabase/functions/generate-3d/index.ts
// Edge Function : appelle TRELLIS.2 via l'API Gradio, sauvegarde le GLB dans Supabase Storage
// et met à jour le statut du modèle dans menu_item_models.
//
// Secrets requis :
//   HF_TOKEN              → token Hugging Face (read)
//   SUPABASE_URL          → auto-injecté
//   SUPABASE_SERVICE_ROLE_KEY → auto-injecté

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Helpers Gradio ──────────────────────────────────────────────────────────

const SPACE_URL = "https://microsoft-trellis-2.hf.space";

async function gradioQueueJoin(
  fnIndex: number,
  data: unknown[],
  sessionHash: string,
  hfToken: string
): Promise<string> {
  const res = await fetch(`${SPACE_URL}/queue/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${hfToken}`,
    },
    body: JSON.stringify({ fn_index: fnIndex, data, session_hash: sessionHash }),
  });
  if (!res.ok) throw new Error(`Queue join failed: ${await res.text()}`);
  const json = await res.json();
  return json.event_id;
}

async function gradioWaitForResult(
  eventId: string,
  hfToken: string
): Promise<unknown[]> {
  const startTime = Date.now();
  const TIMEOUT = 130_000;

  while (Date.now() - startTime < TIMEOUT) {
    await new Promise((r) => setTimeout(r, 3000));

    const res = await fetch(
      `${SPACE_URL}/queue/status?event_id=${eventId}`,
      { headers: { Authorization: `Bearer ${hfToken}` } }
    );
    if (!res.ok) continue;

    const json = await res.json();

    if (json.status === "complete" && json.output) {
      return json.output.data as unknown[];
    }
    if (json.status === "error") {
      throw new Error(`TRELLIS.2 error: ${JSON.stringify(json)}`);
    }
  }
  throw new Error("TRELLIS.2 generation timed out after 130s");
}

async function getApiFnIndexes(hfToken: string): Promise<Record<string, number>> {
  const res = await fetch(`${SPACE_URL}/info`, {
    headers: { Authorization: `Bearer ${hfToken}` },
  });
  if (!res.ok) return { preprocess_image: 0, image_to_3d: 2, extract_glb: 3 };
  const info = await res.json();
  const result: Record<string, number> = {};
  if (info.named_endpoints) {
    Object.entries(info.named_endpoints).forEach(([name], i) => {
      result[name] = i;
    });
  }
  return {
    preprocess_image: result.preprocess_image ?? 0,
    image_to_3d: result.image_to_3d ?? 2,
    extract_glb: result.extract_glb ?? 3,
  };
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let dishId: string | undefined;

  try {
    const hfToken = Deno.env.get("HF_TOKEN");
    if (!hfToken) throw new Error("HF_TOKEN not set in Supabase secrets");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    dishId = body.dishId;
    const imageUrl = body.imageUrl;
    if (!dishId || !imageUrl) {
      throw new Error("dishId and imageUrl are required");
    }

    // Upsert model status to "processing" in menu_item_models
    await supabase
      .from("menu_item_models")
      .upsert(
        { item_id: dishId, status: "processing", updated_at: new Date().toISOString() },
        { onConflict: "item_id" }
      );

    const sessionHash = crypto.randomUUID().replace(/-/g, "").slice(0, 11);

    // ── Step 1: Fetch image ────────────────────────────────────────────────
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Cannot fetch image: " + imageUrl);
    const imgBuffer = await imgRes.arrayBuffer();
    const imgBase64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
    const mimeType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const imageDataUrl = `data:${mimeType};base64,${imgBase64}`;

    const fnIndexes = await getApiFnIndexes(hfToken);

    // ── Step 2: Preprocess (background removal) ───────────────────────────
    console.log("[generate-3d] Step 1: preprocess image...");
    const preprocessEventId = await gradioQueueJoin(
      fnIndexes.preprocess_image,
      [{ path: imageDataUrl, url: imageDataUrl }],
      sessionHash,
      hfToken
    );
    const preprocessResult = await gradioWaitForResult(preprocessEventId, hfToken);
    const processedImage = preprocessResult[0];

    // ── Step 3: 3D Generation ─────────────────────────────────────────────
    console.log("[generate-3d] Step 2: image_to_3d...");
    const gen3dEventId = await gradioQueueJoin(
      fnIndexes.image_to_3d,
      [
        processedImage,
        0,
        "1024",
        7.5, 0.7, 12, 5.0,
        7.5, 0.5, 12, 3.0,
        1.0, 0.0, 12, 3.0,
      ],
      sessionHash,
      hfToken
    );
    const gen3dResult = await gradioWaitForResult(gen3dEventId, hfToken);
    const modelState = gen3dResult[0];

    // ── Step 4: Extract GLB ───────────────────────────────────────────────
    console.log("[generate-3d] Step 3: extract_glb...");
    const glbEventId = await gradioQueueJoin(
      fnIndexes.extract_glb,
      [modelState, 300000, 2048],
      sessionHash,
      hfToken
    );
    const glbResult = await gradioWaitForResult(glbEventId, hfToken);

    const glbFileInfo = glbResult[0] as { url?: string; path?: string };
    const glbUrl = glbFileInfo?.url ?? `${SPACE_URL}/file=${glbFileInfo?.path}`;

    // ── Step 5: Download GLB & store in Supabase Storage (bucket: models) ─
    console.log("[generate-3d] Step 4: download & store GLB...");
    const glbRes = await fetch(glbUrl, {
      headers: { Authorization: `Bearer ${hfToken}` },
    });
    if (!glbRes.ok) throw new Error("Cannot download GLB from TRELLIS.2");
    const glbBuffer = await glbRes.arrayBuffer();

    const storagePath = `3d/${dishId}.glb`;
    const { error: uploadError } = await supabase.storage
      .from("models")
      .upload(storagePath, glbBuffer, {
        contentType: "model/gltf-binary",
        upsert: true,
      });
    if (uploadError) throw new Error("Storage upload failed: " + uploadError.message);

    // Public URL
    const { data: publicUrlData } = supabase.storage
      .from("models")
      .getPublicUrl(storagePath);
    const publicGlbUrl = publicUrlData.publicUrl;

    // ── Step 6: Update menu_item_models ────────────────────────────────────
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

    console.log("[generate-3d] Done! GLB stored at:", publicGlbUrl);

    return new Response(
      JSON.stringify({ success: true, model_3d_url: publicGlbUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[generate-3d] Error:", err);

    // Mark model as failed
    if (dishId) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        await supabase
          .from("menu_item_models")
          .upsert(
            {
              item_id: dishId,
              status: "failed",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "item_id" }
          );
      } catch (_) { /* ignore */ }
    }

    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
