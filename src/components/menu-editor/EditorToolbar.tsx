import { type MenuDesign, getTemplate, getEffectiveStyles } from '@/lib/menu-templates';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Palette, Type, Paintbrush } from 'lucide-react';

interface Props {
  design: MenuDesign;
  onChange: (design: MenuDesign) => void;
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
  { label: 'Noir profond', value: '#0a0a0f' },
  { label: 'Bleu nuit', value: '#1a1a2e' },
  { label: 'Vert forêt', value: '#1a2e1a' },
  { label: 'Bordeaux', value: '#2e1a1a' },
  { label: 'Crème', value: '#f5f0e8' },
  { label: 'Blanc', value: '#ffffff' },
  { label: 'Gris clair', value: '#f8f9fa' },
  { label: 'Anthracite', value: '#2d2d2d' },
];

const GRADIENT_PRESETS = [
  { label: 'Nuit étoilée', value: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)' },
  { label: 'Bois foncé', value: 'linear-gradient(180deg, #2c1810 0%, #4a2c20 100%)' },
  { label: 'Coucher de soleil', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #a8edea 100%)' },
  { label: 'Océan', value: 'linear-gradient(180deg, #0c3547 0%, #204051 100%)' },
  { label: 'Doré', value: 'linear-gradient(180deg, #1a1510 0%, #2a2015 100%)' },
  { label: 'Émeraude', value: 'linear-gradient(180deg, #0a1a0f 0%, #1a3020 100%)' },
  { label: 'Minuit', value: 'linear-gradient(180deg, #111111 0%, #1a1a1a 100%)' },
  { label: 'Pastel', value: 'linear-gradient(135deg, #fce4ec 0%, #e8f5e9 100%)' },
];

// Extract a usable color from a gradient or solid color for the color input
function extractColor(bg: string): string {
  if (bg.startsWith('#')) return bg;
  const match = bg.match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : '#000000';
}

export function EditorToolbar({ design, onChange }: Props) {
  const styles = getEffectiveStyles(design);

  const updateOverride = (key: string, value: string) => {
    onChange({
      ...design,
      overrides: { ...design.overrides, [key]: value },
    });
  };

  return (
    <div className="space-y-5">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Palette className="h-3.5 w-3.5" /> Personnalisation
      </h4>

      {/* Cover settings */}
      <div className="space-y-3">
        <p className="text-xs font-medium">Page de couverture</p>
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
      </div>

      {/* Backgrounds */}
      <div className="space-y-3">
        <p className="text-xs font-medium flex items-center gap-1.5"><Paintbrush className="h-3.5 w-3.5" /> Fonds</p>
        
        {/* Cover background */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground">Fond couverture</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {GRADIENT_PRESETS.map(g => (
              <button
                key={g.value}
                className={`w-full aspect-square rounded-md border-2 transition-all hover:scale-105 ${
                  styles.coverBg === g.value ? 'border-primary ring-1 ring-primary' : 'border-border'
                }`}
                style={{ background: g.value }}
                title={g.label}
                onClick={() => updateOverride('coverBg', g.value)}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <input
              type="color"
              value={extractColor(styles.coverBg)}
              onChange={e => updateOverride('coverBg', e.target.value)}
              className="w-6 h-6 rounded border-0 cursor-pointer"
            />
            <span className="text-[10px] text-muted-foreground">Couleur personnalisée</span>
          </div>
        </div>

        {/* Body background */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground">Fond du menu</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {BG_PRESETS.map(bg => (
              <button
                key={bg.value}
                className={`w-full aspect-square rounded-md border-2 transition-all hover:scale-105 ${
                  styles.bodyBg === bg.value ? 'border-primary ring-1 ring-primary' : 'border-border'
                }`}
                style={{ backgroundColor: bg.value }}
                title={bg.label}
                onClick={() => updateOverride('bodyBg', bg.value)}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <input
              type="color"
              value={extractColor(styles.bodyBg)}
              onChange={e => updateOverride('bodyBg', e.target.value)}
              className="w-6 h-6 rounded border-0 cursor-pointer"
            />
            <span className="text-[10px] text-muted-foreground">Couleur personnalisée</span>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-3">
        <p className="text-xs font-medium flex items-center gap-1.5"><Type className="h-3.5 w-3.5" /> Typographie</p>
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
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <p className="text-xs font-medium">Couleurs</p>
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
      </div>

      {/* Category & Price Style */}
      <div className="space-y-3">
        <p className="text-xs font-medium">Style des catégories</p>
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
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium">Style des prix</p>
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
      </div>

      {/* Border radius */}
      <div className="space-y-3">
        <p className="text-xs font-medium">Arrondis</p>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'Aucun', value: '0px' },
            { label: 'Léger', value: '4px' },
            { label: 'Moyen', value: '8px' },
            { label: 'Fort', value: '16px' },
          ].map(r => (
            <Button
              key={r.value}
              size="sm"
              variant={styles.borderRadius === r.value ? 'default' : 'outline'}
              className="text-[10px] h-7"
              onClick={() => updateOverride('borderRadius', r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
