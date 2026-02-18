import { useState, useEffect } from 'react';
import { MENU_TEMPLATES, type MenuDesign, type AdvancedPageSettings } from '@/lib/menu-templates';
import { Check, Save, Trash2, ChevronDown, ChevronUp, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Restaurant } from '@/lib/types';

interface Props {
  design: MenuDesign;
  onChange: (design: MenuDesign) => void;
  restaurant?: Restaurant | null;
  restaurantId?: string;
}

type HeaderFooterSection = 'header' | 'footer';

interface CustomTemplate {
  id: string;
  name: string;
  design_json: MenuDesign;
}

export function TemplatePicker({ design, onChange, restaurant, restaurantId }: Props) {
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [activeHFSection, setActiveHFSection] = useState<HeaderFooterSection>('header');
  const [hfOpen, setHfOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load custom templates
  useEffect(() => {
    if (!restaurantId) return;
    supabase
      .from('custom_templates')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setCustomTemplates(data.map(d => ({ id: d.id, name: d.name, design_json: d.design_json as unknown as MenuDesign })));
      });
  }, [restaurantId]);

  const handleSaveTemplate = async () => {
    if (!saveName.trim() || !restaurantId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('custom_templates').insert({
        restaurant_id: restaurantId,
        name: saveName.trim(),
        design_json: design as any,
      }).select().single();
      if (error) throw error;
      setCustomTemplates(prev => [{ id: data.id, name: data.name, design_json: data.design_json as unknown as MenuDesign }, ...prev]);
      setSaveName('');
      setShowSaveInput(false);
      toast.success('Template sauvegardé !');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    await supabase.from('custom_templates').delete().eq('id', id);
    setCustomTemplates(prev => prev.filter(t => t.id !== id));
    toast.success('Template supprimé');
  };

  const getHFSettings = (section: HeaderFooterSection): AdvancedPageSettings => {
    return design[section] || {};
  };

  const updateHFSettings = (section: HeaderFooterSection, updates: Partial<AdvancedPageSettings>) => {
    onChange({
      ...design,
      advancedMode: true,
      [section]: { ...getHFSettings(section), ...updates },
    });
  };

  const handleHFBgUpload = async (e: React.ChangeEvent<HTMLInputElement>, section: HeaderFooterSection) => {
    const file = e.target.files?.[0];
    if (!file || !restaurantId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${restaurantId}/bg-${section}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('menu-media').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('menu-media').getPublicUrl(path);
      updateHFSettings(section, { backgroundImageUrl: urlData.publicUrl });
      toast.success('Image uploadée !');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const hfSettings = getHFSettings(activeHFSection);

  return (
    <div className="space-y-4">
      {/* Built-in templates */}
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Templates</h4>
      <div className="grid grid-cols-2 gap-2">
        {MENU_TEMPLATES.map(t => {
          const active = design.templateId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange({ ...design, templateId: t.id })}
              className={`relative rounded-lg overflow-hidden border-2 transition-all text-left ${
                active ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
              }`}
            >
              <div className="h-20 w-full" style={{ background: t.previewGradient }} />
              <div className="p-2">
                <p className="text-xs font-medium truncate">{t.name}</p>
              </div>
              {active && (
                <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom saved templates */}
      {customTemplates.length > 0 && (
        <>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mes templates</h4>
          <div className="space-y-1.5">
            {customTemplates.map(ct => (
              <div key={ct.id} className="flex items-center gap-1.5 group">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-8 justify-start"
                  onClick={() => onChange(ct.design_json)}
                >
                  {ct.name}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => handleDeleteTemplate(ct.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Save current as template */}
      <div className="space-y-2">
        {showSaveInput ? (
          <div className="flex items-center gap-1.5">
            <Input
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Nom du template"
              className="h-8 text-xs flex-1"
              onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
            />
            <Button size="sm" className="h-8 text-xs" onClick={handleSaveTemplate} disabled={saving || !saveName.trim()}>
              <Save className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => setShowSaveInput(true)}>
            <Save className="h-3 w-3 mr-1.5" /> Sauvegarder comme template
          </Button>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Header / Footer customization */}
      <button
        className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        onClick={() => setHfOpen(!hfOpen)}
      >
        <span>En-tête & Pied de page</span>
        {hfOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {hfOpen && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              size="sm"
              variant={activeHFSection === 'header' ? 'default' : 'outline'}
              className="text-[10px] h-8"
              onClick={() => setActiveHFSection('header')}
            >
              ⬆️ En-tête
            </Button>
            <Button
              size="sm"
              variant={activeHFSection === 'footer' ? 'default' : 'outline'}
              className="text-[10px] h-8"
              onClick={() => setActiveHFSection('footer')}
            >
              ⬇️ Pied de page
            </Button>
          </div>

          {/* Background image */}
          <div className="space-y-2">
            <p className="text-xs font-medium flex items-center gap-1.5">
              <Image className="h-3.5 w-3.5" /> Image de fond
            </p>
            {hfSettings.backgroundImageUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={hfSettings.backgroundImageUrl} alt="Fond" className="w-full h-16 object-cover" />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 text-[10px] px-2"
                    onClick={() => updateHFSettings(activeHFSection, { backgroundImageUrl: undefined })}
                  >
                    ✕
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">
                    Opacité ({Math.round((hfSettings.backgroundOpacity ?? 0.3) * 100)}%)
                  </Label>
                  <Slider
                    value={[hfSettings.backgroundOpacity ?? 0.3]}
                    onValueChange={([v]) => updateHFSettings(activeHFSection, { backgroundOpacity: v })}
                    min={0.05} max={1} step={0.05}
                    className="w-full"
                  />
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                <span className="text-[10px] text-muted-foreground">
                  {uploading ? 'Upload...' : 'Ajouter une image'}
                </span>
                <input type="file" accept="image/*" onChange={e => handleHFBgUpload(e, activeHFSection)} className="hidden" disabled={uploading} />
              </label>
            )}
          </div>

          {/* Info toggles */}
          <div className="space-y-2">
            <p className="text-xs font-medium">Informations affichées</p>
            <div className="space-y-1.5">
              <ToggleRow label="Logo" checked={hfSettings.showLogo ?? false} onChange={v => updateHFSettings(activeHFSection, { showLogo: v })} />
              <ToggleRow label="Adresse" checked={hfSettings.showAddress ?? false} onChange={v => updateHFSettings(activeHFSection, { showAddress: v })} available={!!restaurant?.address} />
              <ToggleRow label="Téléphone" checked={hfSettings.showPhone ?? false} onChange={v => updateHFSettings(activeHFSection, { showPhone: v })} available={!!restaurant?.phone} />
              <ToggleRow label="Email" checked={hfSettings.showEmail ?? false} onChange={v => updateHFSettings(activeHFSection, { showEmail: v })} available={!!restaurant?.email} />
              <ToggleRow label="Site web" checked={hfSettings.showWebsite ?? false} onChange={v => updateHFSettings(activeHFSection, { showWebsite: v })} available={!!restaurant?.website} />
              <ToggleRow label="Réseaux sociaux" checked={hfSettings.showSocials ?? false} onChange={v => updateHFSettings(activeHFSection, { showSocials: v })} available={!!(restaurant?.instagram || restaurant?.facebook || restaurant?.tiktok)} />
            </div>
          </div>

          {/* Custom text */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Texte personnalisé</Label>
            <Textarea
              value={hfSettings.customText || ''}
              onChange={e => updateHFSettings(activeHFSection, { customText: e.target.value })}
              rows={2}
              className="text-xs min-h-[48px]"
              placeholder={activeHFSection === 'footer' ? 'Bon appétit !' : 'Bienvenue...'}
            />
          </div>
        </div>
      )}
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
