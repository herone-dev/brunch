import { type MenuDesign, getEffectiveStyles } from '@/lib/menu-templates';
import type { CategoryWithItems, ItemWithDetails, Restaurant } from '@/lib/types';

interface Props {
  restaurant: Restaurant | null;
  categories: CategoryWithItems[];
  design: MenuDesign;
  lang: string;
  selectedCategoryId?: string | null;
  selectedItemId?: string | null;
  onSelectCategory: (id: string) => void;
  onSelectItem: (id: string) => void;
}

const getName = (translations: { lang: string; name: string }[], lang: string) =>
  translations.find(t => t.lang === lang)?.name || translations[0]?.name || '—';

const getDesc = (translations: { lang: string; description?: string | null }[], lang: string) =>
  translations.find(t => t.lang === lang)?.description || '';

function PriceDisplay({ priceCents, style, accentColor }: { priceCents: number; style: string; accentColor: string }) {
  const price = `${(priceCents / 100).toFixed(2)}€`;
  if (style === 'dots') return <span style={{ color: accentColor }}>{price}</span>;
  return <span style={{ fontWeight: 600, color: accentColor }}>{price}</span>;
}

export function MenuCanvas({ restaurant, categories, design, lang, selectedCategoryId, selectedItemId, onSelectCategory, onSelectItem }: Props) {
  const s = getEffectiveStyles(design);

  return (
    <div className="w-full max-w-[380px] mx-auto shadow-2xl rounded-xl overflow-hidden" style={{ fontFamily: s.fontBody }}>
      {/* Cover page */}
      <div
        className="relative p-8 text-center min-h-[200px] flex flex-col items-center justify-center"
        style={{ background: s.coverBg, color: s.coverTextColor }}
      >
        {design.logoUrl && (
          <img src={design.logoUrl} alt="Logo" className="w-16 h-16 object-contain mb-3 rounded-lg" />
        )}
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: s.fontHeading }}>
          {design.coverTitle || restaurant?.name || 'Mon Restaurant'}
        </h2>
        <p className="text-sm opacity-75">
          {design.coverSubtitle || restaurant?.city || 'Notre carte'}
        </p>
        <div className="mt-4 w-12 h-px" style={{ backgroundColor: s.coverTextColor, opacity: 0.3 }} />
      </div>

      {/* Menu body */}
      <div style={{ backgroundColor: s.bodyBg, color: s.bodyTextColor }} className="p-5 min-h-[300px]">
        {categories.filter(c => c.is_visible).map(cat => (
          <div
            key={cat.id}
            className={`mb-6 cursor-pointer transition-all rounded-lg ${
              selectedCategoryId === cat.id ? 'ring-2 ring-primary/50 p-2 -m-2' : ''
            }`}
            onClick={() => onSelectCategory(cat.id)}
          >
            {/* Category header */}
            <CategoryHeader name={getName(cat.translations, lang)} style={s.categoryStyle} styles={s} />

            {/* Items */}
            <div className="space-y-3 mt-3">
              {cat.items.filter(i => i.is_available).map(item => (
                <div
                  key={item.id}
                  className={`cursor-pointer transition-all rounded ${
                    selectedItemId === item.id ? 'ring-2 ring-primary/50 p-2 -m-2' : ''
                  }`}
                  onClick={(e) => { e.stopPropagation(); onSelectItem(item.id); }}
                >
                  {s.priceStyle === 'dots' ? (
                    <DotsItem item={item} lang={lang} styles={s} />
                  ) : (
                    <StandardItem item={item} lang={lang} styles={s} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-12 opacity-50">
            <p style={{ fontFamily: s.fontHeading }} className="text-lg">Votre menu est vide</p>
            <p className="text-sm mt-1">Ajoutez des catégories et des plats</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="p-4 text-center text-xs opacity-60"
        style={{ backgroundColor: s.bodyBg, color: s.bodyTextColor, borderTop: `1px solid ${s.accentColor}22` }}
      >
        {restaurant?.name} • Bon appétit !
      </div>
    </div>
  );
}

function CategoryHeader({ name, style, styles }: { name: string; style: string; styles: ReturnType<typeof getEffectiveStyles> }) {
  switch (style) {
    case 'underline':
      return (
        <div className="pb-1 mb-2" style={{ borderBottom: `2px solid ${styles.accentColor}` }}>
          <h3 className="text-lg font-bold" style={{ fontFamily: styles.fontHeading, color: styles.accentColor }}>{name}</h3>
        </div>
      );
    case 'elegant':
      return (
        <div className="text-center mb-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: styles.accentColor, opacity: 0.3 }} />
            <h3 className="text-sm uppercase tracking-[0.2em] font-medium" style={{ fontFamily: styles.fontHeading, color: styles.accentColor }}>{name}</h3>
            <div className="flex-1 h-px" style={{ backgroundColor: styles.accentColor, opacity: 0.3 }} />
          </div>
        </div>
      );
    case 'badge':
      return (
        <div className="mb-2">
          <span
            className="inline-block px-3 py-1 text-sm font-semibold rounded-full"
            style={{ backgroundColor: styles.accentColor + '20', color: styles.accentColor, fontFamily: styles.fontHeading }}
          >
            {name}
          </span>
        </div>
      );
    case 'divider':
    default:
      return (
        <div className="mb-2">
          <h3 className="text-base font-bold uppercase tracking-wider" style={{ fontFamily: styles.fontHeading }}>{name}</h3>
          <div className="mt-1 w-8 h-0.5" style={{ backgroundColor: styles.accentColor }} />
        </div>
      );
  }
}

function DotsItem({ item, lang, styles }: { item: ItemWithDetails; lang: string; styles: ReturnType<typeof getEffectiveStyles> }) {
  const name = getName(item.translations, lang);
  const desc = getDesc(item.translations, lang);
  return (
    <div>
      <div className="flex items-baseline">
        <span className="font-medium text-sm">{name}</span>
        <span className="flex-1 mx-2 border-b border-dotted" style={{ borderColor: styles.bodyTextColor + '30' }} />
        <span className="text-sm font-semibold" style={{ color: styles.accentColor }}>
          {(item.price_cents / 100).toFixed(2)}€
        </span>
      </div>
      {desc && <p className="text-xs mt-0.5 opacity-60">{desc}</p>}
    </div>
  );
}

function StandardItem({ item, lang, styles }: { item: ItemWithDetails; lang: string; styles: ReturnType<typeof getEffectiveStyles> }) {
  const name = getName(item.translations, lang);
  const desc = getDesc(item.translations, lang);
  return (
    <div className="flex justify-between items-start gap-2">
      <div className="flex-1">
        <p className="font-medium text-sm">{name}</p>
        {desc && <p className="text-xs mt-0.5 opacity-60">{desc}</p>}
      </div>
      <span className="text-sm font-semibold whitespace-nowrap" style={{ color: styles.accentColor }}>
        {(item.price_cents / 100).toFixed(2)}€
      </span>
    </div>
  );
}
