import { useState, useRef, useEffect } from 'react';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ElementStyle {
  fontFamily?: string;
  fontSize?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  textTransform?: string;
  letterSpacing?: string;
}

interface Props {
  style: ElementStyle;
  onChange: (style: ElementStyle) => void;
  position: { top: number; left: number };
  visible: boolean;
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

const SIZE_OPTIONS = ['10px', '11px', '12px', '13px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '42px', '48px'];

const QUICK_COLORS = [
  '#000000', '#333333', '#666666', '#999999', '#ffffff',
  '#d4af37', '#8b4513', '#2c1810', '#e65100', '#e91e63',
  '#1a1a2e', '#16213e', '#0a5c36', '#4a148c', '#01579b',
];

export function FloatingToolbar({ style, onChange, position, visible }: Props) {
  const [showFonts, setShowFonts] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowFonts(false);
    setShowSizes(false);
    setShowColors(false);
  }, [visible]);

  if (!visible) return null;

  const currentFontLabel = FONT_OPTIONS.find(f => f.value === style.fontFamily)?.label || 'Police';
  const isBold = style.fontWeight === '700' || style.fontWeight === 'bold';
  const isItalic = style.fontStyle === 'italic';

  const update = (key: keyof ElementStyle, value: string) => {
    onChange({ ...style, [key]: value });
  };

  const toggleBold = () => update('fontWeight', isBold ? '400' : '700');
  const toggleItalic = () => update('fontStyle', isItalic ? 'normal' : 'italic');

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-xl px-1.5 py-1 animate-in fade-in slide-in-from-bottom-2 duration-150"
      style={{
        top: Math.max(8, position.top - 48),
        left: Math.max(8, position.left),
      }}
      onMouseDown={e => e.preventDefault()}
    >
      {/* Font family */}
      <div className="relative">
        <button
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded hover:bg-muted transition-colors max-w-[120px]"
          onClick={() => { setShowFonts(!showFonts); setShowSizes(false); setShowColors(false); }}
        >
          <span className="truncate">{currentFontLabel}</span>
          <ChevronDown className="h-3 w-3 shrink-0" />
        </button>
        {showFonts && (
          <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl py-1 w-48 max-h-52 overflow-y-auto z-50">
            {FONT_OPTIONS.map(f => (
              <button
                key={f.value}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors ${style.fontFamily === f.value ? 'bg-primary/10 text-primary font-medium' : ''}`}
                style={{ fontFamily: f.value }}
                onClick={() => { update('fontFamily', f.value); setShowFonts(false); }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Font size */}
      <div className="relative">
        <button
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded hover:bg-muted transition-colors"
          onClick={() => { setShowSizes(!showSizes); setShowFonts(false); setShowColors(false); }}
        >
          <span>{style.fontSize || '14px'}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
        {showSizes && (
          <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl py-1 w-20 max-h-52 overflow-y-auto z-50">
            {SIZE_OPTIONS.map(s => (
              <button
                key={s}
                className={`w-full text-left px-3 py-1 text-xs hover:bg-muted transition-colors ${style.fontSize === s ? 'bg-primary/10 text-primary' : ''}`}
                onClick={() => { update('fontSize', s); setShowSizes(false); }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Bold / Italic */}
      <button
        className={`p-1.5 rounded hover:bg-muted transition-colors ${isBold ? 'bg-primary/15 text-primary' : ''}`}
        onClick={toggleBold}
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        className={`p-1.5 rounded hover:bg-muted transition-colors ${isItalic ? 'bg-primary/15 text-primary' : ''}`}
        onClick={toggleItalic}
      >
        <Italic className="h-3.5 w-3.5" />
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Text align */}
      <button
        className={`p-1.5 rounded hover:bg-muted transition-colors ${(!style.textAlign || style.textAlign === 'left') ? 'bg-primary/15 text-primary' : ''}`}
        onClick={() => update('textAlign', 'left')}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </button>
      <button
        className={`p-1.5 rounded hover:bg-muted transition-colors ${style.textAlign === 'center' ? 'bg-primary/15 text-primary' : ''}`}
        onClick={() => update('textAlign', 'center')}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </button>
      <button
        className={`p-1.5 rounded hover:bg-muted transition-colors ${style.textAlign === 'right' ? 'bg-primary/15 text-primary' : ''}`}
        onClick={() => update('textAlign', 'right')}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Color picker */}
      <div className="relative">
        <button
          className="p-1.5 rounded hover:bg-muted transition-colors flex items-center gap-1"
          onClick={() => { setShowColors(!showColors); setShowFonts(false); setShowSizes(false); }}
        >
          <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: style.color || '#000' }} />
          <ChevronDown className="h-3 w-3" />
        </button>
        {showColors && (
          <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-xl p-2 z-50 w-44">
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {QUICK_COLORS.map(c => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${style.color === c ? 'ring-2 ring-primary ring-offset-1' : 'border-border'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => { update('color', c); setShowColors(false); }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 pt-1 border-t border-border">
              <input
                type="color"
                value={style.color || '#000000'}
                onChange={e => update('color', e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0"
              />
              <span className="text-[10px] text-muted-foreground">Personnalisé</span>
            </div>
          </div>
        )}
      </div>

      {/* Letter spacing */}
      <div className="w-px h-5 bg-border mx-0.5" />
      <button
        className={`px-1.5 py-1 rounded hover:bg-muted transition-colors text-[10px] font-medium ${style.textTransform === 'uppercase' ? 'bg-primary/15 text-primary' : ''}`}
        onClick={() => update('textTransform', style.textTransform === 'uppercase' ? 'none' : 'uppercase')}
        title="Majuscules"
      >
        AA
      </button>
    </div>
  );
}
