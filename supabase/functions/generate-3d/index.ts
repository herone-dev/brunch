// supabase/functions/generate-3d/index.ts
// Edge Function : appelle TRELLIS.2 via l'API Gradio, sauvegarde le GLB dans Supabase Storage
// et met à jour le statut du plat dans la DB.
//
// Variables d'environnement Supabase requises (supabase secrets set) :
//   HF_TOKEN          → ton token Hugging Face (read)
//   SUPABASE_URL      → auto-injecté par Supabase
//   SUPABASE_SERVICE_ROLE_KEY → auto-injecté par Supabase

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Helpers Gradio ──────────────────────────────────────────────────────────

const SPACE_URL = "https://microsoft-trellis-2.hf.space";

/** Soumet un job dans la queue Gradio et retourne l'event_id */
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

/** Poll la queue Gradio jusqu'à completion (timeout 130s) */
async function gradioWaitForResult(
  eventId: string,
  hfToken: string
): Promise<unknown[]> {
  const startTime = Date.now();
  const TIMEOUT = 130_000; // 130 secondes max

  while (Date.now() - startTime < TIMEOUT) {
    await new Promise((r) => setTimeout(r, 3000)); // poll toutes les 3s

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
    // statuts intermédiaires : "pending", "processing" → on continue
  }
  throw new Error("TRELLIS.2 generation timed out after 130s");
}

/** Récupère les fn_index de l'API Gradio */
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
  // fallback sur les valeurs connues de l'app.py TRELLIS.2
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

  try {
    const hfToken = Deno.env.get("HF_TOKEN");
    if (!hfToken) throw new Error("HF_TOKEN not set in Supabase secrets");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { dishId, imageUrl } = await req.json();
    if (!dishId || !imageUrl) {
      throw new Error("dishId and imageUrl are required");
    }

    // Marque le plat comme "en cours de génération"
    await supabase
      .from("menu_items")
      .update({ model_3d_status: "generating" })
      .eq("id", dishId);

    const sessionHash = crypto.randomUUID().replace(/-/g, "").slice(0, 11);

    // ── Étape 1 : récupérer l'image depuis l'URL publique ──────────────────
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Cannot fetch image: " + imageUrl);
    const imgBuffer = await imgRes.arrayBuffer();
    const imgBase64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
    const mimeType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const imageDataUrl = `data:${mimeType};base64,${imgBase64}`;

    const fnIndexes = await getApiFnIndexes(hfToken);

    // ── Étape 2 : Prétraitement (suppression de fond) ──────────────────────
    console.log("[generate-3d] Step 1: preprocess image...");
    const preprocessEventId = await gradioQueueJoin(
      fnIndexes.preprocess_image,
      [{ path: imageDataUrl, url: imageDataUrl }],
      sessionHash,
      hfToken
    );
    const preprocessResult = await gradioWaitForResult(preprocessEventId, hfToken);
    const processedImage = preprocessResult[0];

    // ── Étape 3 : Génération 3D ────────────────────────────────────────────
    console.log("[generate-3d] Step 2: image_to_3d...");
    const gen3dEventId = await gradioQueueJoin(
      fnIndexes.image_to_3d,
      [
        processedImage,  // image preprocessée
        0,               // seed
        "1024",          // resolution
        7.5, 0.7, 12, 5.0,   // ss params
        7.5, 0.5, 12, 3.0,   // shape_slat params
        1.0, 0.0, 12, 3.0,   // tex_slat params
      ],
      sessionHash,
      hfToken
    );
    const gen3dResult = await gradioWaitForResult(gen3dEventId, hfToken);
    const modelState = gen3dResult[0]; // état interne du modèle

    // ── Étape 4 : Export GLB ───────────────────────────────────────────────
    console.log("[generate-3d] Step 3: extract_glb...");
    const glbEventId = await gradioQueueJoin(
      fnIndexes.extract_glb,
      [modelState, 300000, 2048],
      sessionHash,
      hfToken
    );
    const glbResult = await gradioWaitForResult(glbEventId, hfToken);

    // glbResult[0] est le chemin du fichier GLB sur le serveur Gradio
    const glbFileInfo = glbResult[0] as { url?: string; path?: string };
    const glbUrl = glbFileInfo?.url ?? `${SPACE_URL}/file=${glbFileInfo?.path}`;

    // ── Étape 5 : Télécharger le GLB et le stocker dans Supabase Storage ──
    console.log("[generate-3d] Step 4: download & store GLB...");
    const glbRes = await fetch(glbUrl, {
      headers: { Authorization: `Bearer ${hfToken}` },
    });
    if (!glbRes.ok) throw new Error("Cannot download GLB from TRELLIS.2");
    const glbBuffer = await glbRes.arrayBuffer();

    const storagePath = `3d-models/${dishId}.glb`;
    const { error: uploadError } = await supabase.storage
      .from("dish-models")
      .upload(storagePath, glbBuffer, {
        contentType: "model/gltf-binary",
        upsert: true,
      });
    if (uploadError) throw new Error("Storage upload failed: " + uploadError.message);

    // URL publique du fichier GLB
    const { data: publicUrlData } = supabase.storage
      .from("dish-models")
      .getPublicUrl(storagePath);
    const publicGlbUrl = publicUrlData.publicUrl;

    // ── Étape 6 : Mettre à jour le plat en DB ──────────────────────────────
    const { error: dbError } = await supabase
      .from("menu_items")
      .update({
        model_3d_url: publicGlbUrl,
        model_3d_status: "ready",
      })
      .eq("id", dishId);
    if (dbError) throw new Error("DB update failed: " + dbError.message);

    console.log("[generate-3d] Done! GLB stored at:", publicGlbUrl);

    return new Response(
      JSON.stringify({ success: true, model_3d_url: publicGlbUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[generate-3d] Error:", err);

    // Marque le plat comme erreur si on a le dishId
    try {
      const { dishId } = await (async () => {
        const body = await req.clone().json().catch(() => ({}));
        return body;
      })();
      if (dishId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        await supabase
          .from("menu_items")
          .update({ model_3d_status: "error" })
          .eq("id", dishId);
      }
    } catch (_) { /* ignore */ }

    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
