// src/components/menu-editor/Panel3D.tsx
// Upload de photos + génération 3D via TRELLIS.2 (appel direct frontend)

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Wand2, CheckCircle, AlertCircle,
  Loader2, Trash2, Box, ImagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGenerate3D } from "@/hooks/useGenerate3D";

type Status = "idle" | "uploading" | "pending" | "processing" | "ready" | "failed";

const STATUS_LABELS: Record<Status, string> = {
  idle:       "Prêt",
  uploading:  "Upload photos…",
  pending:    "Réveil du Space IA… (30s-2min)",
  processing: "Génération 3D… (1-3 min)",
  ready:      "Modèle prêt ✓",
  failed:     "Erreur",
};

const STATUS_PROGRESS: Record<Status, number> = {
  idle: 0, uploading: 15, pending: 30, processing: 60, ready: 100, failed: 0,
};

interface Panel3DProps {
  dishId: string;
  existingModelUrl?: string | null;
  existingStatus?: string | null;
  onModelReady?: (glbUrl: string) => void;
}

export function Panel3D({ dishId, existingModelUrl, existingStatus, onModelReady }: Panel3DProps) {
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);

  const { status, modelUrl, generate, reset: resetPipeline, setStatus, setModelUrl } = useGenerate3D({
    dishId,
    onModelReady,
  });

  // Init from existing state
  useState(() => {
    if (existingStatus === "ready" && existingModelUrl) {
      setStatus("ready");
      setModelUrl(existingModelUrl);
    } else if (existingStatus === "failed") {
      setStatus("failed");
    }
  });

  // Dropzone
  const onDrop = useCallback((accepted: File[]) => {
    const newPhotos = accepted.slice(0, 6 - photos.length).map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setPhotos((p) => [...p, ...newPhotos]);
  }, [photos]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 6,
    disabled: status !== "idle" && status !== "failed",
  });

  const removePhoto = (i: number) => {
    setPhotos((p) => { URL.revokeObjectURL(p[i].preview); return p.filter((_, j) => j !== i); });
  };

  const handleGenerate = async () => {
    if (photos.length === 0) { toast.error("Ajoute au moins une photo."); return; }
    await generate(photos[0].file);
  };

  const handleReset = () => {
    setPhotos([]);
    resetPipeline();
  };

  const isProcessing = status === "pending" || status === "processing" || status === "uploading";

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Modèle 3D — TRELLIS.2</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Upload zone */}
      {status !== "ready" && (
        <>
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
              isProcessing && "pointer-events-none opacity-40",
              !isProcessing && "cursor-pointer"
            )}
          >
            <input {...getInputProps()} />
            <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {isDragActive ? "Dépose ici…" : "Glisse jusqu'à 6 photos du plat"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              JPG, PNG, WEBP · Vue de face en premier pour meilleur résultat
            </p>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={p.preview} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground rounded px-1 leading-5">
                      Principal
                    </span>
                  )}
                  {!isProcessing && (
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3 text-white" />
                    </button>
                  )}
                </div>
              ))}
              {photos.length < 6 && !isProcessing && (
                <div
                  {...getRootProps()}
                  className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors"
                >
                  <Upload className="h-5 w-5 text-muted-foreground/40" />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Progress bar */}
      {isProcessing && (
        <div className="space-y-2">
          <Progress value={STATUS_PROGRESS[status]} className="h-2" />
          <div className="flex items-center gap-2 justify-center">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</p>
          </div>
          <p className="text-xs text-muted-foreground/50 text-center">
            Ne ferme pas cette page pendant la génération.
          </p>
        </div>
      )}

      {/* Error */}
      {status === "failed" && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>La génération a échoué. Vérifie que le Space TRELLIS.2 est accessible et réessaie.</span>
        </div>
      )}

      {/* Model ready */}
      {status === "ready" && modelUrl && (
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden bg-neutral-900 aspect-square">
            {/* @ts-ignore */}
            <model-viewer
              src={modelUrl}
              alt="Modèle 3D"
              auto-rotate
              camera-controls
              shadow-intensity="1"
              style={{ width: "100%", height: "100%", minHeight: "240px" }}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Le modèle est affiché sur ton menu public avec un bouton "Voir en 3D"
          </p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        {(status === "idle" || status === "failed") && (
          <Button onClick={handleGenerate} disabled={photos.length === 0} className="flex-1 gap-2">
            <Wand2 className="h-4 w-4" />
            Générer en 3D
          </Button>
        )}
        {isProcessing && (
          <Button disabled className="flex-1 gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {STATUS_LABELS[status]}
          </Button>
        )}
        {(status === "ready" || status === "failed") && (
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Recommencer
          </Button>
        )}
        {status === "ready" && modelUrl && (
          <Button variant="outline" asChild>
            <a href={modelUrl} download target="_blank" rel="noreferrer">↓ GLB</a>
          </Button>
        )}
      </div>

      {status === "idle" && (
        <p className="text-xs text-center text-muted-foreground/50">
          Propulsé par{" "}
          <a href="https://huggingface.co/spaces/microsoft/TRELLIS.2" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            Microsoft TRELLIS.2
          </a>
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; spin?: boolean }> = {
    idle:       { label: "Prêt",          variant: "outline" },
    uploading:  { label: "Upload…",       variant: "secondary", spin: true },
    pending:    { label: "Réveil Space…", variant: "secondary", spin: true },
    processing: { label: "Génération…",   variant: "default",   spin: true },
    ready:      { label: "Prêt ✓",        variant: "default" },
    failed:     { label: "Erreur",        variant: "destructive" },
  };
  const { label, variant, spin } = map[status];
  return (
    <Badge variant={variant} className="gap-1 text-xs">
      {spin ? <Loader2 className="h-3 w-3 animate-spin" />
        : status === "ready" ? <CheckCircle className="h-3 w-3" />
        : status === "failed" ? <AlertCircle className="h-3 w-3" />
        : <Box className="h-3 w-3" />}
      {label}
    </Badge>
  );
}

export default Panel3D;
