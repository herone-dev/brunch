// src/hooks/useGenerate3D.ts
// Frontend-driven 3D generation pipeline calling Gradio API directly.
// Avoids edge function timeout by running each step from the browser.

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SPACE_URL = "https://microsoft-trellis-2.hf.space";

type Status = "idle" | "uploading" | "pending" | "processing" | "ready" | "failed";

interface UseGenerate3DOptions {
  dishId: string;
  onModelReady?: (glbUrl: string) => void;
}

export function useGenerate3D({ dishId, onModelReady }: UseGenerate3DOptions) {
  const [status, setStatus] = useState<Status>("idle");
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const updateDbStatus = async (dbStatus: string, extra: Record<string, unknown> = {}) => {
    await supabase
      .from("menu_item_models")
      .upsert({ item_id: dishId, status: dbStatus, ...extra } as any, { onConflict: "item_id" });
  };

  // Get HF token from edge function
  const getHfToken = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("get-hf-token");
    if (error || !data?.token) throw new Error("Cannot get HF token");
    return data.token;
  };

  // Wait for Space to wake up
  const waitForSpace = async (hfToken: string, signal: AbortSignal) => {
    const maxWait = 5 * 60 * 1000;
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      signal.throwIfAborted();
      try {
        const res = await fetch(`${SPACE_URL}/gradio_api/info`, {
          headers: { Authorization: `Bearer ${hfToken}` },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) return;
      } catch (_) { /* retry */ }
      console.log("[3D] Space sleeping, retry in 10s...");
      await new Promise((r) => setTimeout(r, 10000));
    }
    throw new Error("Space did not wake up within 5 minutes");
  };

  // Call a Gradio named endpoint
  const gradioCall = async (
    endpoint: string,
    data: unknown[],
    hfToken: string,
    signal: AbortSignal,
    timeoutMs = 300_000
  ): Promise<unknown[]> => {
    // 1. Submit
    console.log(`[3D] POST ${endpoint}`);
    const submitRes = await fetch(`${SPACE_URL}/gradio_api/call${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${hfToken}` },
      body: JSON.stringify({ data }),
      signal,
    });
    if (!submitRes.ok) {
      const txt = await submitRes.text().catch(() => "");
      throw new Error(`POST ${endpoint} failed ${submitRes.status}: ${txt}`);
    }
    const { event_id } = await submitRes.json();
    console.log(`[3D] ${endpoint} event_id=${event_id}`);

    // 2. Read SSE
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
    // Abort if parent signal aborts
    const onAbort = () => timeoutController.abort();
    signal.addEventListener("abort", onAbort);

    try {
      const res = await fetch(`${SPACE_URL}/gradio_api/call${endpoint}/${event_id}`, {
        headers: { Authorization: `Bearer ${hfToken}`, Accept: "text/event-stream" },
        signal: timeoutController.signal,
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

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.trim().split("\n");
          const eventLine = lines.find((l) => l.startsWith("event: "));
          const dataLine = lines.find((l) => l.startsWith("data: "));
          if (!eventLine) continue;
          const event = eventLine.slice(7).trim();

          if (event === "heartbeat" || event === "log") continue;
          if (event === "error") {
            reader.cancel().catch(() => {});
            throw new Error(`${endpoint} error: ${dataLine?.slice(6) ?? "Unknown"}`);
          }
          if (event === "complete") {
            reader.cancel().catch(() => {});
            if (!dataLine) return [];
            try {
              const parsed = JSON.parse(dataLine.slice(6));
              console.log(`[3D] ${endpoint} completed:`, JSON.stringify(parsed).slice(0, 300));
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          }
        }
      }
      throw new Error(`${endpoint}: stream ended without complete`);
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
    }
  };

  // Upload file to Gradio
  const gradioUpload = async (file: Blob, filename: string, hfToken: string, signal: AbortSignal): Promise<string> => {
    const formData = new FormData();
    formData.append("files", file, filename);
    const res = await fetch(`${SPACE_URL}/gradio_api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${hfToken}` },
      body: formData,
      signal,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const paths = await res.json();
    if (Array.isArray(paths) && paths.length > 0) return paths[0];
    throw new Error("Upload returned no path");
  };

  const generate = useCallback(async (imageFile: File) => {
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    try {
      // Step 0: Get token + set pending
      setStatus("uploading");
      await updateDbStatus("pending");
      const hfToken = await getHfToken();

      // Step 1: Upload photo to Supabase Storage
      const ext = imageFile.name.split(".").pop() || "jpg";
      const storagePath = `dish-photos/${dishId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("menu-media")
        .upload(storagePath, imageFile, { upsert: true });
      if (uploadErr) throw new Error(`Photo upload: ${uploadErr.message}`);

      // Step 2: Wait for Space
      setStatus("pending");
      toast.info("Réveil du Space IA… (30s-2min)");
      await waitForSpace(hfToken, signal);

      // Step 3: Processing
      setStatus("processing");
      await updateDbStatus("processing");
      toast.info("Génération 3D en cours… (1-3 min)");

      // 3a: Start session
      console.log("[3D] start_session");
      await gradioCall("/start_session", [], hfToken, signal, 60_000);

      // 3b: Upload image to Gradio
      console.log("[3D] Uploading to Gradio...");
      const gradioPath = await gradioUpload(imageFile, `dish.${ext}`, hfToken, signal);
      console.log("[3D] Gradio path:", gradioPath);

      // 3c: Preprocess
      console.log("[3D] preprocess_image");
      const preprocessResult = await gradioCall(
        "/preprocess_image",
        [{ path: gradioPath, meta: { _type: "gradio.FileData" } }],
        hfToken, signal
      );
      const processedImage = preprocessResult[0];
      console.log("[3D] preprocessed:", JSON.stringify(processedImage).slice(0, 200));

      // 3d: Image to 3D (15 params)
      console.log("[3D] image_to_3d");
      await gradioCall(
        "/image_to_3d",
        [
          processedImage, 0, "1024",
          7.5, 0.7, 12, 5.0,
          7.5, 0.5, 12, 3.0,
          1.0, 0.0, 12, 3.0,
        ],
        hfToken, signal, 300_000
      );

      // 3e: Extract GLB
      console.log("[3D] extract_glb");
      const extractResult = await gradioCall(
        "/extract_glb",
        [300000, 2048],
        hfToken, signal, 120_000
      );
      console.log("[3D] extract result:", JSON.stringify(extractResult).slice(0, 500));

      const glbInfo = (extractResult[0] ?? extractResult[1]) as { url?: string; path?: string } | null;
      if (!glbInfo) throw new Error("extract_glb returned no file data");

      // Step 4: Download GLB from Gradio
      const glbUrl = glbInfo.url ?? `${SPACE_URL}/gradio_api/file=${glbInfo.path}`;
      console.log("[3D] Downloading GLB:", glbUrl);
      const glbRes = await fetch(glbUrl, {
        headers: { Authorization: `Bearer ${hfToken}` },
        signal,
      });
      if (!glbRes.ok) throw new Error(`GLB download failed: ${glbRes.status}`);
      const glbBlob = await glbRes.blob();

      // Validate GLB magic
      const glbBuffer = await glbBlob.arrayBuffer();
      if (glbBuffer.byteLength < 12) throw new Error("GLB too small");
      const magic = new DataView(glbBuffer).getUint32(0, true);
      if (magic !== 0x46546C67) throw new Error("Not a valid GLB file");
      console.log(`[3D] GLB valid: ${(glbBuffer.byteLength / 1024).toFixed(0)} KB`);

      // Step 5: Upload GLB to Supabase Storage
      const glbStoragePath = `${dishId}.glb`;
      const { error: glbUploadErr } = await supabase.storage
        .from("models")
        .upload(glbStoragePath, glbBlob, { contentType: "model/gltf-binary", upsert: true });
      if (glbUploadErr) throw new Error(`GLB storage upload: ${glbUploadErr.message}`);

      const { data: { publicUrl } } = supabase.storage.from("models").getPublicUrl(glbStoragePath);
      console.log("[3D] ✅ Done:", publicUrl);

      // Step 6: Update DB → ready
      await updateDbStatus("ready", { glb_path: glbStoragePath });
      setStatus("ready");
      setModelUrl(publicUrl);
      onModelReady?.(publicUrl);
      toast.success("Modèle 3D généré !");

    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.log("[3D] Aborted");
        return;
      }
      console.error("[3D] ❌ Pipeline error:", err);
      setStatus("failed");
      await updateDbStatus("failed");
      toast.error("Erreur lors de la génération 3D.");
    } finally {
      abortRef.current = null;
    }
  }, [dishId, onModelReady]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abort();
    setStatus("idle");
    setModelUrl(null);
  }, [abort]);

  return { status, modelUrl, generate, abort, reset, setStatus, setModelUrl };
}
