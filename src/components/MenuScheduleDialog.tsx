import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Menu } from "@/lib/types";

const ALL_DAYS = [
  { key: "mon", label: "Lun" },
  { key: "tue", label: "Mar" },
  { key: "wed", label: "Mer" },
  { key: "thu", label: "Jeu" },
  { key: "fri", label: "Ven" },
  { key: "sat", label: "Sam" },
  { key: "sun", label: "Dim" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: Menu;
  restaurantId: string;
}

export const MenuScheduleDialog = ({ open, onOpenChange, menu, restaurantId }: Props) => {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [isDefault, setIsDefault] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [scheduleDays, setScheduleDays] = useState<string[]>(ALL_DAYS.map(d => d.key));

  useEffect(() => {
    if (open && menu) {
      setIsDefault((menu as any).is_default ?? false);
      setIsGlobal((menu as any).is_global ?? false);
      setScheduleStart((menu as any).schedule_start ?? "");
      setScheduleEnd((menu as any).schedule_end ?? "");
      setScheduleDays((menu as any).schedule_days ?? ALL_DAYS.map(d => d.key));
    }
  }, [open, menu]);

  const toggleDay = (day: string) => {
    setScheduleDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // If setting as default, unset other defaults first
      if (isDefault) {
        await supabase
          .from("menus")
          .update({ is_default: false } as any)
          .eq("restaurant_id", restaurantId)
          .neq("id", menu.id);
      }
      // If setting as global, unset other globals first
      if (isGlobal) {
        await supabase
          .from("menus")
          .update({ is_global: false } as any)
          .eq("restaurant_id", restaurantId)
          .neq("id", menu.id);
      }

      const { error } = await supabase
        .from("menus")
        .update({
          is_default: isDefault,
          is_global: isGlobal,
          schedule_start: scheduleStart || null,
          schedule_end: scheduleEnd || null,
          schedule_days: scheduleDays,
        } as any)
        .eq("id", menu.id);

      if (error) throw error;

      toast.success("Paramètres du menu mis à jour !");
      qc.invalidateQueries({ queryKey: ["restaurant-menus"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paramètres — {menu.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Default + Global toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <Label className="text-sm">Menu par défaut</Label>
              </div>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} disabled={isGlobal} />
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Affiché quand aucun menu programmé ne correspond à l'heure actuelle.
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <Label className="text-sm">Menu global (fusion)</Label>
              </div>
              <Switch checked={isGlobal} onCheckedChange={(v) => { setIsGlobal(v); if (v) setIsDefault(false); }} />
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Fusionne automatiquement toutes les catégories de tous les menus publiés.
            </p>
          </div>

          {/* Schedule */}
          {!isGlobal && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Plage horaire d'affichage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={scheduleStart}
                    onChange={(e) => setScheduleStart(e.target.value)}
                    className="flex-1"
                    placeholder="11:00"
                  />
                  <span className="text-muted-foreground text-sm">à</span>
                  <Input
                    type="time"
                    value={scheduleEnd}
                    onChange={(e) => setScheduleEnd(e.target.value)}
                    className="flex-1"
                    placeholder="15:00"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour un affichage permanent.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Jours d'affichage</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map(day => (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => toggleDay(day.key)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        scheduleDays.includes(day.key)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <Button onClick={handleSave} className="w-full" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement...</> : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
