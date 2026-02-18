import { useState, useRef } from 'react';
import { type MenuDesign, getEffectiveStyles } from '@/lib/menu-templates';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Palette, Type, Paintbrush, ChevronDown, ChevronUp, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Restaurant } from '@/lib/types';

interface Props {
  design: MenuDesign;
  onChange: (design: MenuDesign) => void;
  restaurant?: Restaurant | null;
  restaurantId?: string;
}

const FONT_OPTIONS = [
  { label: 'Playfair Display', value: "'Playfair Display', serif" },
  { label: 'Cormorant Garamond', value: "'Cormorant Garamond', serif" },
  { label: 'Space Grotesk', value: "'Space Grotesk', sans-serif" },
  { label: 'Poppins', value: "'Poppins', sans-serif" },
  { label: 'Lora', value: "'Lora', serif" },
  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
  { label: 'Inter', value: "'Inter', sans-serif" },
  { label: 'DM Sans', value: "'DM Sans', sans-serif" },
  { label: 'DM Serif Display', value: "'DM Serif Display', serif" },
  { label: 'Quicksand', value: "'Quicksand', sans-serif" },
];

const BG_PRESETS = [
  { label: 'Crème', value: '#f5f0e8' },
  { label: 'Blanc', value: '#ffffff' },
  { label: 'Gris clair', value: '#f8f9fa' },
];

const GRADIENT_PRESETS = [
  { label: 'Nuit étoilée', value: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)' },
  { label: 'Bois foncé', value: 'linear-gradient(180deg, #2c1810 0%, #4a2c20 100%)' },
  { label: 'Océan', value: 'linear-gradient(180deg, #0c3547 0%, #204051 100%)' },
];

function extractColor(bg: string): string {
  if (bg.startsWith('#')) return bg;
  const match = bg.match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : '#000000';
}

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        className="w-full flex items-center justify-between py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="mt-2 space-y-3">{children}</div>}
    </div>
  );
}

export function EditorToolbar({ design, onChange, restaurantId }: Props) {
  const styles = getEffectiveStyles(design);
  const [uploading, setUploading] = useState<'cover' | 'body' | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);

  const updateOverride = (key: string, value: string) => {
    onChange({
      ...design,
      overrides: { ...design.overrides, [key]: value },
    });
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'cover' | 'body') => {
    const file = e.target.files?.[0];
    if (!file || !restaurantId) return;
    setUploading(target);
    try {
      const ext = file.name.split('.').pop();
      const path = `${restaurantId}/bg-${target}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('menu-media').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('menu-media').getPublicUrl(path);
      const key = target === 'cover' ? 'coverBgImage' : 'bodyBgImage';
      updateOverride(key, urlData.publicUrl);
      toast.success('Image de fond uploadée !');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(null);
    }
  };

  const removeBgImage = (target: 'cover' | 'body') => {
    const key = target === 'cover' ? 'coverBgImage' : 'bodyBgImage';
    updateOverride(key, '');
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Palette className="h-3.5 w-3.5" /> Personnalisation
      </h4>

      {/* Cover settings */}
      <CollapsibleSection title="Page de couverture" defaultOpen>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Titre</Label>
          <Input
            value={design.coverTitle || ''}
            onChange={e => onChange({ ...design, coverTitle: e.target.value })}
            placeholder="Nom du restaurant"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Sous-titre</Label>
          <Input
            value={design.coverSubtitle || ''}
            onChange={e => onChange({ ...design, coverSubtitle: e.target.value })}
            placeholder="Notre carte"
            className="h-8 text-xs"
          />
        </div>
      </CollapsibleSection>

      <div className="h-px bg-border" />

      {/* Backgrounds */}
      <CollapsibleSection title="Fonds">
        {/* Cover background */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground">Fond couverture</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {GRADIENT_PRESETS.map(g => (
              <button
                key={g.value}
                className={`w-full aspect-square rounded-md border-2 transition-all hover:scale-105 ${
                  styles.coverBg === g.value && !design.overrides?.coverBgImage ? 'border-primary ring-1 ring-primary' : 'border-border'
                }`}
                style={{ background: g.value }}
                title={g.label}
                onClick={() => { updateOverride('coverBg', g.value); removeBgImage('cover'); }}
              />
            ))}
            {/* Image upload slot */}
            {design.overrides?.coverBgImage ? (
              <div className="relative w-full aspect-square rounded-md border-2 border-primary ring-1 ring-primary overflow-hidden">
                <img src={design.overrides.coverBgImage} alt="" className="w-full h-full object-cover" />
                <button
                  className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center hover:scale-110 transition-transform"
                  onClick={() => removeBgImage('cover')}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="w-full aspect-square rounded-md border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex items-center justify-center transition-all"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploading === 'cover'}
              >
                <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            <input ref={coverInputRef} type="file" accept="image/*" onChange={e => handleBgImageUpload(e, 'cover')} className="hidden" />
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <input
              type="color"
              value={extractColor(styles.coverBg)}
              onChange={e => updateOverride('coverBg', e.target.value)}
              className="w-6 h-6 rounded border-0 cursor-pointer"
            />
            <Input
              value={extractColor(styles.coverBg)}
              onChange={e => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) updateOverride('coverBg', v);
              }}
              className="h-6 text-[10px] w-20 px-1.5 font-mono"
              placeholder="#000000"
            />
          </div>
          {design.overrides?.coverBgImage && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">Opacité</span>
              <Slider
                value={[design.overrides?.coverBgOpacity ?? 1]}
                onValueChange={([v]) => onChange({ ...design, overrides: { ...design.overrides, coverBgOpacity: v } })}
                min={0.05} max={1} step={0.05}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-7 text-right">{Math.round((design.overrides?.coverBgOpacity ?? 1) * 100)}%</span>
            </div>
          )}
        </div>

        {/* Body background */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground">Fond du menu</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {BG_PRESETS.map(bg => (
              <button
                key={bg.value}
                className={`w-full aspect-square rounded-md border-2 transition-all hover:scale-105 ${
                  styles.bodyBg === bg.value && !design.overrides?.bodyBgImage ? 'border-primary ring-1 ring-primary' : 'border-border'
                }`}
                style={{ backgroundColor: bg.value }}
                title={bg.label}
                onClick={() => { updateOverride('bodyBg', bg.value); removeBgImage('body'); }}
              />
            ))}
            {/* Image upload slot */}
            {design.overrides?.bodyBgImage ? (
              <div className="relative w-full aspect-square rounded-md border-2 border-primary ring-1 ring-primary overflow-hidden">
                <img src={design.overrides.bodyBgImage} alt="" className="w-full h-full object-cover" />
                <button
                  className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center hover:scale-110 transition-transform"
                  onClick={() => removeBgImage('body')}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="w-full aspect-square rounded-md border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex items-center justify-center transition-all"
                onClick={() => bodyInputRef.current?.click()}
                disabled={uploading === 'body'}
              >
                <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            <input ref={bodyInputRef} type="file" accept="image/*" onChange={e => handleBgImageUpload(e, 'body')} className="hidden" />
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <input
              type="color"
              value={extractColor(styles.bodyBg)}
              onChange={e => updateOverride('bodyBg', e.target.value)}
              className="w-6 h-6 rounded border-0 cursor-pointer"
            />
            <Input
              value={extractColor(styles.bodyBg)}
              onChange={e => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) updateOverride('bodyBg', v);
              }}
              className="h-6 text-[10px] w-20 px-1.5 font-mono"
              placeholder="#000000"
            />
          </div>
          {design.overrides?.bodyBgImage && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">Opacité</span>
              <Slider
                value={[design.overrides?.bodyBgOpacity ?? 1]}
                onValueChange={([v]) => onChange({ ...design, overrides: { ...design.overrides, bodyBgOpacity: v } })}
                min={0.05} max={1} step={0.05}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-7 text-right">{Math.round((design.overrides?.bodyBgOpacity ?? 1) * 100)}%</span>
            </div>
          )}
        </div>
      </CollapsibleSection>

      <div className="h-px bg-border" />

      {/* Typography */}
      <CollapsibleSection title="Typographie">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Police titres</Label>
          <select
            value={styles.fontHeading}
            onChange={e => updateOverride('fontHeading', e.target.value)}
            className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
          >
            {FONT_OPTIONS.map(f => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Police corps</Label>
          <select
            value={styles.fontBody}
            onChange={e => updateOverride('fontBody', e.target.value)}
            className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
          >
            {FONT_OPTIONS.map(f => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
            ))}
          </select>
        </div>
      </CollapsibleSection>

      <div className="h-px bg-border" />

      {/* Colors */}
      <CollapsibleSection title="Couleurs">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Accent</Label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={styles.accentColor}
                onChange={e => updateOverride('accentColor', e.target.value)}
                className="w-6 h-6 rounded border-0 cursor-pointer"
              />
              <span className="text-[10px] text-muted-foreground">{styles.accentColor}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Texte menu</Label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={styles.bodyTextColor}
                onChange={e => updateOverride('bodyTextColor', e.target.value)}
                className="w-6 h-6 rounded border-0 cursor-pointer"
              />
              <span className="text-[10px] text-muted-foreground">{styles.bodyTextColor}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Texte couverture</Label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={styles.coverTextColor}
                onChange={e => updateOverride('coverTextColor', e.target.value)}
                className="w-6 h-6 rounded border-0 cursor-pointer"
              />
              <span className="text-[10px] text-muted-foreground">{styles.coverTextColor}</span>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <div className="h-px bg-border" />

      {/* Category & Price Style */}
      <CollapsibleSection title="Style des catégories">
        <div className="grid grid-cols-2 gap-1.5">
          {(['underline', 'elegant', 'badge', 'divider'] as const).map(st => (
            <Button
              key={st}
              size="sm"
              variant={styles.categoryStyle === st ? 'default' : 'outline'}
              className="text-[10px] h-7"
              onClick={() => updateOverride('categoryStyle', st)}
            >
              {st === 'underline' ? 'Souligné' : st === 'elegant' ? 'Élégant' : st === 'badge' ? 'Badge' : 'Diviseur'}
            </Button>
          ))}
        </div>
      </CollapsibleSection>

      <div className="h-px bg-border" />

      <CollapsibleSection title="Style des prix">
        <div className="grid grid-cols-3 gap-1.5">
          {(['inline', 'dots', 'right'] as const).map(st => (
            <Button
              key={st}
              size="sm"
              variant={styles.priceStyle === st ? 'default' : 'outline'}
              className="text-[10px] h-7"
              onClick={() => updateOverride('priceStyle', st)}
            >
              {st === 'inline' ? 'Inline' : st === 'dots' ? 'Pointillés' : 'Droite'}
            </Button>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}