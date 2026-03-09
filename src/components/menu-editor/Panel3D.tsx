// src/components/menu-editor/Panel3D.tsx
// Panneau d'administration pour générer un modèle 3D d'un plat via TRELLIS.2
// S'intègre dans MenuEditor.tsx — remplace l'ancien Panel3D.

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Wand2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Box,
  ImagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type GenerationStatus = "idle" | "uploading" | "generating" | "ready" | "error";

interface Panel3DProps {
  /** ID du plat dans menu_items */
  dishId: string;
  /** URL GLB existante (si déjà générée) */
  existingModelUrl?: string | null;
  /** Appelé quand un nouveau modèle est prêt */
  onModelReady?: (glbUrl: string) => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function Panel3D({ dishId, existingModelUrl, onModelReady }: Panel3DProps) {
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [status, setStatus] = useState<GenerationStatus>(
    existingModelUrl ? "ready" : "idle"
  );
  const [progress, setProgress] = useState(0);
  const [modelUrl, setModelUrl] = useState<string | null>(existingModelUrl ?? null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Dropzone ──────────────────────────────────────────────────────────────

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPhotos = acceptedFiles.slice(0, 6 - photos.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    setStatus("idle");
    setErrorMsg(null);
  }, [photos]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 6,
    disabled: status === "generating" || status === "uploading",
  });

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ── Upload photos vers Supabase Storage ───────────────────────────────────

  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const { file } of photos) {
      const ext = file.name.split(".").pop();
      const path = `dish-photos/${dishId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("dish-photos")
        .upload(path, file, { upsert: true });
      if (error) throw new Error(`Upload failed: ${error.message}`);

      const { data } = supabase.storage.from("dish-photos").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  // ── Génération 3D ─────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (photos.length === 0) {
      toast.error("Ajoute au moins une photo du plat.");
      return;
    }

    try {
      setStatus("uploading");
      setProgress(10);
      setErrorMsg(null);

      // 1. Upload des photos
      const urls = await uploadPhotos();
      setUploadedUrls(urls);
      setProgress(25);

      // 2. Appel Edge Function avec la première photo (meilleure vue du plat)
      setStatus("generating");
      setProgress(35);

      // Simulation de progression pendant que TRELLIS.2 tourne (1-3 min)
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 2, 90));
      }, 3000);

      const { data, error } = await supabase.functions.invoke("generate-3d", {
        body: { dishId, imageUrl: urls[0] },
      });

      clearInterval(progressInterval);

      if (error || !data?.success) {
        throw new Error(data?.error ?? error?.message ?? "Erreur inconnue");
      }

      setProgress(100);
      setStatus("ready");
      setModelUrl(data.model_3d_url);
      onModelReady?.(data.model_3d_url);
      toast.success("Modèle 3D généré avec succès !");
    } catch (err) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      toast.error("Échec de la génération 3D. Réessaie.");
      console.error("[Panel3D] Error:", err);
    }
  };

  const handleReset = () => {
    setPhotos([]);
    setUploadedUrls([]);
    setStatus("idle");
    setProgress(0);
    setModelUrl(null);
    setErrorMsg(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Modèle 3D TRELLIS.2</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Zone d'upload */}
      {status !== "ready" && (
        <>
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
              (status === "generating" || status === "uploading") &&
                "pointer-events-none opacity-50"
            )}
          >
            <input {...getInputProps()} />
            <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? "Dépose les photos ici…"
                : "Glisse-dépose jusqu'à 6 photos du plat"}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              JPG, PNG, WEBP · Vue de face recommandée en premier
            </p>
          </div>

          {/* Grille photos */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={p.preview}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground rounded px-1">
                      Principal
                    </span>
                  )}
                  <button
                    onClick={() => removePhoto(i)}
                    disabled={status === "generating" || status === "uploading"}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <div
                  {...getRootProps()}
                  className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <Upload className="h-5 w-5 text-muted-foreground/50" />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Barre de progression */}
      {(status === "uploading" || status === "generating") && (
        <div className="space-y-1.5">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {status === "uploading"
              ? "Upload des photos…"
              : `Génération 3D en cours avec TRELLIS.2… (1-3 min)`}
          </p>
        </div>
      )}

      {/* Erreur */}
      {status === "error" && errorMsg && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Modèle prêt : preview */}
      {status === "ready" && modelUrl && (
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden bg-muted aspect-video flex items-center justify-center">
            {/* @ts-ignore — custom element model-viewer */}
            <model-viewer
              src={modelUrl}
              alt="Modèle 3D du plat"
              auto-rotate
              camera-controls
              shadow-intensity="1"
              style={{ width: "100%", height: "100%", minHeight: "200px" }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Le modèle sera affiché sur votre menu public
          </p>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex gap-2">
        {status !== "ready" && (
          <Button
            onClick={handleGenerate}
            disabled={
              photos.length === 0 ||
              status === "generating" ||
              status === "uploading"
            }
            className="flex-1 gap-2"
          >
            {status === "generating" || status === "uploading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {status === "uploading" ? "Upload…" : "Génération…"}
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Générer en 3D
              </>
            )}
          </Button>
        )}

        {(status === "ready" || status === "error") && (
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Recommencer
          </Button>
        )}

        {status === "ready" && (
          <Button variant="outline" asChild className="gap-2">
            <a href={modelUrl!} download target="_blank" rel="noreferrer">
              Télécharger GLB
            </a>
          </Button>
        )}
      </div>

      {/* Info */}
      {status === "idle" && photos.length === 0 && (
        <p className="text-xs text-muted-foreground/60 text-center">
          Propulsé par{" "}
          <a
            href="https://huggingface.co/spaces/microsoft/TRELLIS.2"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Microsoft TRELLIS.2
          </a>{" "}
          · Photo → Modèle 3D GLB
        </p>
      )}
    </div>
  );
}

// ─── Badge de statut ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: GenerationStatus }) {
  const config: Record<GenerationStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    idle: {
      label: "Prêt",
      variant: "outline",
      icon: <Box className="h-3 w-3" />,
    },
    uploading: {
      label: "Upload…",
      variant: "secondary",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    generating: {
      label: "Génération…",
      variant: "default",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    ready: {
      label: "Modèle prêt",
      variant: "default",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    error: {
      label: "Erreur",
      variant: "destructive",
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };
  const { label, variant, icon } = config[status];
  return (
    <Badge variant={variant} className="gap-1 text-xs">
      {icon}
      {label}
    </Badge>
  );
}

export default Panel3D;
