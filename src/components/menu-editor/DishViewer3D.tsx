// src/components/menu-editor/DishViewer3D.tsx
// Composant viewer 3D GLB pour le menu public (PublicMenu.tsx)
// Utilise @google/model-viewer — chargé via CDN dans index.html
//
// Utilisation dans PublicMenu.tsx :
//   import { DishViewer3D } from "@/components/menu-editor/DishViewer3D";
//   <DishViewer3D glbUrl={item.model_3d_url} dishName={item.name} />

import { useState } from "react";
import { Box, X, RotateCcw, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Déclaration du custom element pour TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          "auto-rotate"?: boolean | string;
          "camera-controls"?: boolean | string;
          "shadow-intensity"?: string;
          "environment-image"?: string;
          exposure?: string;
          poster?: string;
          ar?: boolean | string;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DishViewer3DProps {
  glbUrl: string | null | undefined;
  dishName?: string;
  /** Mode compact : affiche un bouton "Voir en 3D" qui ouvre une modale */
  compact?: boolean;
  className?: string;
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function DishViewer3D({
  glbUrl,
  dishName = "Plat",
  compact = true,
  className,
}: DishViewer3DProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!glbUrl) return null;

  // Mode inline (non-compact)
  if (!compact) {
    return (
      <div className={cn("rounded-xl overflow-hidden bg-neutral-900", className)}>
        <Viewer3D glbUrl={glbUrl} dishName={dishName} />
      </div>
    );
  }

  // Mode compact : bouton + modale
  return (
    <>
      {/* Bouton "Voir en 3D" */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn(
          "gap-1.5 border-primary/40 text-primary hover:bg-primary/5",
          className
        )}
      >
        <Box className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Voir en 3D</span>
      </Button>

      {/* Modale */}
      {isOpen && (
        <DishModal
          glbUrl={glbUrl}
          dishName={dishName}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

// ─── Viewer interne ───────────────────────────────────────────────────────────

function Viewer3D({ glbUrl, dishName }: { glbUrl: string; dishName: string }) {
  return (
    // @ts-ignore
    <model-viewer
      src={glbUrl}
      alt={`Modèle 3D de ${dishName}`}
      auto-rotate
      camera-controls
      shadow-intensity="1.2"
      exposure="1"
      environment-image="neutral"
      style={{
        width: "100%",
        height: "100%",
        minHeight: "320px",
        background: "transparent",
      }}
    />
  );
}

// ─── Modale ───────────────────────────────────────────────────────────────────

function DishModal({
  glbUrl,
  dishName,
  onClose,
}: {
  glbUrl: string;
  dishName: string;
  onClose: () => void;
}) {
  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Contenu (stoppe la propagation du clic) */}
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/80 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm text-white">{dishName}</span>
            <span className="text-xs text-white/40">Vue 3D interactive</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4 text-white/70" />
          </button>
        </div>

        {/* Viewer 3D */}
        <div className="aspect-square bg-gradient-to-b from-neutral-900 to-neutral-950">
          <Viewer3D glbUrl={glbUrl} dishName={dishName} />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-neutral-900/60 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-white/40 text-xs">
            <RotateCcw className="h-3 w-3" />
            <span>Glisse pour tourner</span>
            <span className="mx-1">·</span>
            <ZoomIn className="h-3 w-3" />
            <span>Pinch pour zoomer</span>
          </div>
          <span className="text-[10px] text-white/20">
            Propulsé par TRELLIS.2
          </span>
        </div>
      </div>
    </div>
  );
}

export default DishViewer3D;
