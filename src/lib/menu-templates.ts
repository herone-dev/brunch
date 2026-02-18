export type MenuFormat = 'portrait' | 'landscape' | 'book';

export type IconStyle = 'emoji' | 'lucide' | 'none';

export interface AdvancedPageSettings {
  backgroundImageUrl?: string;
  backgroundOpacity?: number; // 0-1
  showLogo?: boolean;
  showAddress?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
  showWebsite?: boolean;
  showSocials?: boolean;
  customText?: string;
  iconStyle?: IconStyle;
}

export interface MenuDesign {
  templateId: string;
  activeCustomTemplateId?: string;
  format?: MenuFormat;
  coverTitle?: string;
  coverSubtitle?: string;
  logoUrl?: string;
  overrides?: Partial<TemplateStyles>;
  elementStyles?: Record<string, import('@/components/menu-editor/FloatingToolbar').ElementStyle>;
  // Advanced mode
  advancedMode?: boolean;
  firstPage?: AdvancedPageSettings;
  lastPage?: AdvancedPageSettings;
  header?: AdvancedPageSettings;
  footer?: AdvancedPageSettings;
}

export interface TemplateStyles {
  coverBg: string;
  coverTextColor: string;
  bodyBg: string;
  bodyTextColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  categoryStyle: 'underline' | 'divider' | 'badge' | 'elegant';
  priceStyle: 'inline' | 'dots' | 'right';
  borderRadius: string;
}

export interface MenuTemplate {
  id: string;
  name: string;
  description: string;
  styles: TemplateStyles;
  previewGradient: string;
}

export const MENU_TEMPLATES: MenuTemplate[] = [
  {
    id: 'bistrot',
    name: 'Bistrot Parisien',
    description: 'Classique et chaleureux, avec des prix en pointillés',
    previewGradient: 'linear-gradient(135deg, #f5f0e8 0%, #e8dcc8 100%)',
    styles: {
      coverBg: 'linear-gradient(180deg, #2c1810 0%, #4a2c20 100%)',
      coverTextColor: '#f5f0e8',
      bodyBg: '#f5f0e8',
      bodyTextColor: '#2c1810',
      accentColor: '#8b4513',
      fontHeading: "'Playfair Display', serif",
      fontBody: "'Lora', serif",
      categoryStyle: 'underline',
      priceStyle: 'dots',
      borderRadius: '0px',
    },
  },
  {
    id: 'gastronomique',
    name: 'Gastronomique',
    description: 'Élégant et raffiné, fond sombre avec accents dorés',
    previewGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    styles: {
      coverBg: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)',
      coverTextColor: '#d4af37',
      bodyBg: '#0f0f14',
      bodyTextColor: '#e8e8e8',
      accentColor: '#d4af37',
      fontHeading: "'Cormorant Garamond', serif",
      fontBody: "'Montserrat', sans-serif",
      categoryStyle: 'elegant',
      priceStyle: 'right',
      borderRadius: '0px',
    },
  },
  {
    id: 'modern',
    name: 'Modern Minimal',
    description: 'Épuré et contemporain, typographie nette',
    previewGradient: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
    styles: {
      coverBg: 'linear-gradient(180deg, #111111 0%, #1a1a1a 100%)',
      coverTextColor: '#ffffff',
      bodyBg: '#ffffff',
      bodyTextColor: '#111111',
      accentColor: '#e65100',
      fontHeading: "'Space Grotesk', sans-serif",
      fontBody: "'Inter', sans-serif",
      categoryStyle: 'divider',
      priceStyle: 'inline',
      borderRadius: '8px',
    },
  },
  {
    id: 'brunch',
    name: 'Brunch & Co',
    description: 'Frais et coloré, ambiance décontractée',
    previewGradient: 'linear-gradient(135deg, #fce4ec 0%, #e8f5e9 100%)',
    styles: {
      coverBg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #a8edea 100%)',
      coverTextColor: '#2d2d2d',
      bodyBg: '#fefefe',
      bodyTextColor: '#2d2d2d',
      accentColor: '#e91e63',
      fontHeading: "'Poppins', sans-serif",
      fontBody: "'Quicksand', sans-serif",
      categoryStyle: 'badge',
      priceStyle: 'inline',
      borderRadius: '16px',
    },
  },
];

export const DEFAULT_DESIGN: MenuDesign = {
  templateId: 'bistrot',
};

export function getTemplate(id: string): MenuTemplate {
  return MENU_TEMPLATES.find(t => t.id === id) || MENU_TEMPLATES[0];
}

export function getEffectiveStyles(design: MenuDesign): TemplateStyles {
  const base = getTemplate(design.templateId).styles;
  return { ...base, ...design.overrides };
}
