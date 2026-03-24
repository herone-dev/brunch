import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Panel3D } from "@/components/menu-editor/Panel3D";
import type { ItemWithDetails } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemWithDetails | null;
}

export function Generate3DDialog({ open, onOpenChange, item }: Props) {
  if (!item) return null;

  const frName = item.translations.find((t) => t.lang === "fr")?.name || "Sans nom";
  const modelUrl = item.model?.glb_path
    ? supabase.storage.from("models").getPublicUrl(item.model.glb_path).data.publicUrl
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-base">3D — {frName}</DialogTitle>
        </DialogHeader>
        <Panel3D
          dishId={item.id}
          existingModelUrl={modelUrl}
          existingStatus={item.model?.status}
          onModelReady={() => {}}
        />
      </DialogContent>
    </Dialog>
  );
}
