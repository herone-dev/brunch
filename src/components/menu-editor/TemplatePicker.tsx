import { useState, useEffect } from 'react';
import { MENU_TEMPLATES, type MenuDesign, type AdvancedPageSettings, type IconStyle, type LogoPosition } from '@/lib/menu-templates';
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
  onLogoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

type HeaderFooterSection = 'header' | 'footer';

interface CustomTemplate {
  id: string;
  name: string;
  design_json: MenuDesign;
}

export function TemplatePicker({ design, onChange, restaurant, restaurantId, onLogoUpload }: Props) {
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [activeHFSection, setActiveHFSection] = useState<HeaderFooterSection>('header');
  const [hfOpen, setHfOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(true);

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

  // Extract a preview gradient from a saved design
  const getPreviewFromDesign = (d: MenuDesign): string => {
    const tpl = MENU_TEMPLATES.find(t => t.id === d.templateId);
    if (d.overrides?.coverBg) return d.overrides.coverBg;
    return tpl?.previewGradient || 'linear-gradient(135deg, #667 0%, #999 100%)';
  };

  return (
    <div className="space-y-3">
      {/* Built-in templates */}
      <button
        className="w-full flex items-center justify-between py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        onClick={() => setTemplatesOpen(!templatesOpen)}
      >
        <span>Templates</span>
        {templatesOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {templatesOpen && (
        <div className="grid grid-cols-3 gap-1.5">
          {MENU_TEMPLATES.map(t => {
            const active = design.templateId === t.id && !design.activeCustomTemplateId;
            return (
              <button
                key={t.id}
                onClick={() => onChange({ ...design, templateId: t.id, activeCustomTemplateId: undefined })}
                className={`relative rounded-md overflow-hidden border-2 transition-all text-left ${
                  active ? 'border-primary ring-1 ring-primary/20' : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="h-10 w-full" style={{ background: t.previewGradient }} />
                <div className="px-1.5 py-1">
                  <p className="text-[9px] font-medium truncate">{t.name}</p>
                </div>
                {active && (
                  <div className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground rounded-full p-px">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                )}
              </button>
            );
          })}
          {/* Custom saved templates in same grid */}
          {customTemplates.map(ct => {
            const active = design.activeCustomTemplateId === ct.id;
            return (
              <button
                key={ct.id}
                onClick={() => onChange({ ...ct.design_json, activeCustomTemplateId: ct.id })}
                className={`relative rounded-md overflow-hidden border-2 transition-all text-left group ${
                  active ? 'border-primary ring-1 ring-primary/20' : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="h-10 w-full" style={{ background: getPreviewFromDesign(ct.design_json) }} />
                <div className="px-1.5 py-1">
                  <p className="text-[9px] font-medium truncate">{ct.name}</p>
                </div>
                {active && (
                  <div className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground rounded-full p-px">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                )}
                <button
                  className="absolute top-0.5 left-0.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                  onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(ct.id); }}
                >
                  ✕
                </button>
              </button>
            );
          })}
        </div>
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
        className="w-full flex items-center justify-between py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        onClick={() => setHfOpen(!hfOpen)}
      >
        <span>En-tête & Pied de page</span>
        {hfOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {hfOpen && (
        <div className="space-y-4 rounded-lg border border-border p-3 bg-muted/30">
          {/* Tab selector */}
          <div className="flex rounded-md overflow-hidden border border-border">
            {(['header', 'footer'] as HeaderFooterSection[]).map(s => (
              <button
                key={s}
                className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${
                  activeHFSection === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
                onClick={() => setActiveHFSection(s)}
              >
                {s === 'header' ? '↑ En-tête' : '↓ Pied de page'}
              </button>
            ))}
          </div>

          {/* Logo upload + position */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
              <Image className="h-3.5 w-3.5" /> Logo
            </p>
            <label className="flex items-center gap-2 p-2 border border-dashed border-border rounded-md cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
              {design.logoUrl ? (
                <img src={design.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded shrink-0" />
              ) : (
                <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="text-[10px] text-muted-foreground flex-1">
                {design.logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
              </span>
              {onLogoUpload && <input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />}
            </label>
            {design.logoUrl && (
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Position du logo (couverture)</Label>
                <div className="flex rounded-md overflow-hidden border border-border">
                  {([
                    { id: 'left' as LogoPosition, label: '← Gauche' },
                    { id: 'center' as LogoPosition, label: '↔ Centre' },
                    { id: 'right' as LogoPosition, label: '→ Droite' },
                  ]).map(opt => (
                    <button
                      key={opt.id}
                      className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${
                        (design.logoPosition || 'center') === opt.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-muted-foreground hover:bg-muted'
                      }`}
                      onClick={() => onChange({ ...design, logoPosition: opt.id })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info toggles */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-foreground">Éléments à afficher</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <ToggleRow label="Adresse" checked={hfSettings.showAddress ?? false} onChange={v => updateHFSettings(activeHFSection, { showAddress: v })} available={!!restaurant?.address} />
              <ToggleRow label="Téléphone" checked={hfSettings.showPhone ?? false} onChange={v => updateHFSettings(activeHFSection, { showPhone: v })} available={!!restaurant?.phone} />
              <ToggleRow label="Email" checked={hfSettings.showEmail ?? false} onChange={v => updateHFSettings(activeHFSection, { showEmail: v })} available={!!restaurant?.email} />
              <ToggleRow label="Site web" checked={hfSettings.showWebsite ?? false} onChange={v => updateHFSettings(activeHFSection, { showWebsite: v })} available={!!restaurant?.website} />
              <ToggleRow label="Réseaux" checked={hfSettings.showSocials ?? false} onChange={v => updateHFSettings(activeHFSection, { showSocials: v })} available={!!(restaurant?.instagram || restaurant?.facebook || restaurant?.tiktok)} />
            </div>
          </div>
          {/* Background image */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-foreground">Image de fond</p>
            {hfSettings.backgroundImageUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-md overflow-hidden border border-border h-14">
                  <img src={hfSettings.backgroundImageUrl} alt="Fond" className="w-full h-full object-cover" />
                  <button
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:scale-110 transition-transform"
                    onClick={() => updateHFSettings(activeHFSection, { backgroundImageUrl: undefined })}
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">Opacité</span>
                  <Slider
                    value={[hfSettings.backgroundOpacity ?? 0.3]}
                    onValueChange={([v]) => updateHFSettings(activeHFSection, { backgroundOpacity: v })}
                    min={0.05} max={1} step={0.05}
                    className="flex-1"
                  />
                  <span className="text-[10px] text-muted-foreground w-7 text-right">{Math.round((hfSettings.backgroundOpacity ?? 0.3) * 100)}%</span>
                </div>
              </div>
            ) : (
              <label className="flex items-center gap-2 p-2 border border-dashed border-border rounded-md cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
                <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground">
                  {uploading ? 'Upload...' : 'Ajouter une image de fond'}
                </span>
                <input type="file" accept="image/*" onChange={e => handleHFBgUpload(e, activeHFSection)} className="hidden" disabled={uploading} />
              </label>
            )}
          </div>

          {/* Icon style */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-foreground">Style des icônes</p>
            <div className="flex rounded-md overflow-hidden border border-border">
              {([
                { id: 'emoji' as IconStyle, label: '😊 Emoji' },
                { id: 'lucide' as IconStyle, label: '◯ Ligne' },
                { id: 'none' as IconStyle, label: 'Aucune' },
              ]).map(opt => (
                <button
                  key={opt.id}
                  className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${
                    (hfSettings.iconStyle || 'emoji') === opt.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                  onClick={() => updateHFSettings(activeHFSection, { iconStyle: opt.id })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom text */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-foreground">Texte personnalisé</p>
            <Textarea
              value={hfSettings.customText || ''}
              onChange={e => updateHFSettings(activeHFSection, { customText: e.target.value })}
              rows={2}
              className="text-xs min-h-[40px] resize-none"
              placeholder={activeHFSection === 'footer' ? 'Bon appétit !' : 'Bienvenue chez nous...'}
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
    <div className={`flex items-center justify-between py-0.5 ${!available ? 'opacity-30 pointer-events-none' : ''}`}>
      <Label className="text-[10px] leading-none cursor-pointer">{label}</Label>
      <Switch checked={checked && available} onCheckedChange={onChange} disabled={!available} className="scale-[0.65]" />
    </div>
  );
}
