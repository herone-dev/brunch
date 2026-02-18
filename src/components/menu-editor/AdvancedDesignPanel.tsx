import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Upload, Image, FileText, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MenuDesign, AdvancedPageSettings } from '@/lib/menu-templates';
import type { Restaurant } from '@/lib/types';

interface Props {
  design: MenuDesign;
  onChange: (design: MenuDesign) => void;
  restaurant: Restaurant | null;
  restaurantId: string;
}

type PageSection = 'firstPage' | 'lastPage';

const SECTION_LABELS: Record<PageSection, { label: string; icon: string }> = {
  firstPage: { label: 'Première page', icon: '📄' },
  lastPage: { label: 'Dernière page', icon: '📃' },
};

export function AdvancedDesignPanel({ design, onChange, restaurant, restaurantId }: Props) {
  const [activeSection, setActiveSection] = useState<PageSection>('firstPage');
  const [uploading, setUploading] = useState(false);

  const getSettings = (section: PageSection): AdvancedPageSettings => {
    return design[section] || {};
  };

  const updateSettings = (section: PageSection, updates: Partial<AdvancedPageSettings>) => {
    onChange({
      ...design,
      advancedMode: true,
      [section]: { ...getSettings(section), ...updates },
    });
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>, section: PageSection) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${restaurantId}/bg-${section}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('menu-media').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('menu-media').getPublicUrl(path);
      updateSettings(section, { backgroundImageUrl: urlData.publicUrl });
      toast.success('Image de fond uploadée !');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const settings = getSettings(activeSection);

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Layers className="h-3.5 w-3.5" /> Mode avancé
      </h4>

      {/* Section selector */}
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(SECTION_LABELS) as PageSection[]).map(s => (
          <Button
            key={s}
            size="sm"
            variant={activeSection === s ? 'default' : 'outline'}
            className="text-[10px] h-8 flex gap-1"
            onClick={() => setActiveSection(s)}
          >
            <span>{SECTION_LABELS[s].icon}</span>
            <span>{SECTION_LABELS[s].label}</span>
          </Button>
        ))}
      </div>

      <div className="h-px bg-border" />

      {/* Background image */}
      <div className="space-y-2">
        <p className="text-xs font-medium flex items-center gap-1.5">
          <Image className="h-3.5 w-3.5" /> Image de fond
        </p>
        {settings.backgroundImageUrl ? (
          <div className="space-y-2">
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img src={settings.backgroundImageUrl} alt="Fond" className="w-full h-20 object-cover" />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-1 right-1 h-6 text-[10px] px-2"
                onClick={() => updateSettings(activeSection, { backgroundImageUrl: undefined })}
              >
                ✕
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">
                Opacité ({Math.round((settings.backgroundOpacity ?? 0.3) * 100)}%)
              </Label>
              <Slider
                value={[settings.backgroundOpacity ?? 0.3]}
                onValueChange={([v]) => updateSettings(activeSection, { backgroundOpacity: v })}
                min={0.05}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="h-5 w-5 text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">
              {uploading ? 'Upload...' : 'Ajouter une image'}
            </span>
            <input type="file" accept="image/*" onChange={e => handleBgUpload(e, activeSection)} className="hidden" disabled={uploading} />
          </label>
        )}
      </div>

      {/* Restaurant info toggles */}
      {(activeSection === 'firstPage' || activeSection === 'lastPage') && (
        <div className="space-y-2">
          <p className="text-xs font-medium flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Informations affichées
          </p>
          <div className="space-y-1.5">
            <ToggleRow label="Logo" checked={settings.showLogo ?? (activeSection === 'firstPage')} onChange={v => updateSettings(activeSection, { showLogo: v })} />
            <ToggleRow label="Adresse" checked={settings.showAddress ?? false} onChange={v => updateSettings(activeSection, { showAddress: v })} available={!!restaurant?.address} />
            <ToggleRow label="Téléphone" checked={settings.showPhone ?? false} onChange={v => updateSettings(activeSection, { showPhone: v })} available={!!restaurant?.phone} />
            <ToggleRow label="Email" checked={settings.showEmail ?? false} onChange={v => updateSettings(activeSection, { showEmail: v })} available={!!restaurant?.email} />
            <ToggleRow label="Site web" checked={settings.showWebsite ?? false} onChange={v => updateSettings(activeSection, { showWebsite: v })} available={!!restaurant?.website} />
            <ToggleRow label="Réseaux sociaux" checked={settings.showSocials ?? false} onChange={v => updateSettings(activeSection, { showSocials: v })} available={!!(restaurant?.instagram || restaurant?.facebook || restaurant?.tiktok)} />
          </div>
        </div>
      )}

      {/* Custom text */}
      <div className="space-y-1.5">
        <Label className="text-[10px] text-muted-foreground">Texte personnalisé</Label>
        <Textarea
          value={settings.customText || ''}
          onChange={e => updateSettings(activeSection, { customText: e.target.value })}
          rows={2}
          className="text-xs min-h-[48px]"
          placeholder={activeSection === 'lastPage' ? 'Bon appétit !' : 'Texte libre...'}
        />
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange, available = true }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; available?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-0.5 ${!available ? 'opacity-40' : ''}`}>
      <Label className="text-[10px]">{label}{!available && ' (non renseigné)'}</Label>
      <Switch checked={checked && available} onCheckedChange={onChange} disabled={!available} className="scale-75" />
    </div>
  );
}
