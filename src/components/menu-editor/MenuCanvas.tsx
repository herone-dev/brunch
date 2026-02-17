import { useState, useRef, useCallback, useEffect } from 'react';
import { type MenuDesign, getEffectiveStyles } from '@/lib/menu-templates';
import { FloatingToolbar, type ElementStyle } from '@/components/menu-editor/FloatingToolbar';
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
  onDesignChange: (design: MenuDesign) => void;
  onUpdateItemText: (itemId: string, field: 'name' | 'description', lang: string, value: string) => void;
  onUpdateCategoryText: (catId: string, lang: string, value: string) => void;
}

const getName = (translations: { lang: string; name: string }[], lang: string) =>
  translations.find(t => t.lang === lang)?.name || translations[0]?.name || '—';
const getDesc = (translations: { lang: string; description?: string | null }[], lang: string) =>
  translations.find(t => t.lang === lang)?.description || '';

type EditingElement = {
  id: string; // e.g. 'cover-title', 'cat-xxx', 'item-xxx-name'
  rect: DOMRect;
};

export function MenuCanvas({
  restaurant, categories, design, lang,
  selectedCategoryId, selectedItemId,
  onSelectCategory, onSelectItem, onDesignChange,
  onUpdateItemText, onUpdateCategoryText,
}: Props) {
  const s = getEffectiveStyles(design);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<EditingElement | null>(null);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });

  const elementStyles = design.elementStyles || {};

  const getElementStyle = (id: string): ElementStyle => {
    return elementStyles[id] || {};
  };

  const setElementStyle = (id: string, style: ElementStyle) => {
    const updated = { ...design, elementStyles: { ...elementStyles, [id]: style } };
    onDesignChange(updated);
  };

  const handleElementClick = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEditing({ id: elementId, rect });
    setToolbarPos({ top: rect.top, left: rect.left });
  };

  const handleCanvasClick = () => {
    setEditing(null);
  };

  const handleBlur = (elementId: string, value: string) => {
    // Parse element ID to determine what to update
    if (elementId === 'cover-title') {
      onDesignChange({ ...design, coverTitle: value });
    } else if (elementId === 'cover-subtitle') {
      onDesignChange({ ...design, coverSubtitle: value });
    } else if (elementId.startsWith('cat-')) {
      const catId = elementId.replace('cat-', '');
      onUpdateCategoryText(catId, lang, value);
    } else if (elementId.startsWith('item-')) {
      const parts = elementId.split('-');
      // item-{uuid}-name or item-{uuid}-desc
      const field = parts[parts.length - 1] as 'name' | 'desc';
      const itemId = parts.slice(1, -1).join('-');
      onUpdateItemText(itemId, field === 'desc' ? 'description' : 'name', lang, value);
    }
  };

  const mergedStyle = (elementId: string, base: React.CSSProperties): React.CSSProperties => {
    const es = getElementStyle(elementId);
    return {
      ...base,
      ...(es.fontFamily && { fontFamily: es.fontFamily }),
      ...(es.fontSize && { fontSize: es.fontSize }),
      ...(es.color && { color: es.color }),
      ...(es.fontWeight && { fontWeight: es.fontWeight }),
      ...(es.fontStyle && { fontStyle: es.fontStyle }),
      ...(es.textAlign && { textAlign: es.textAlign as any }),
      ...(es.textTransform && { textTransform: es.textTransform as any }),
      ...(es.letterSpacing && { letterSpacing: es.letterSpacing }),
    };
  };

  const editableProps = (elementId: string) => ({
    contentEditable: editing?.id === elementId,
    suppressContentEditableWarning: true,
    onClick: (e: React.MouseEvent) => handleElementClick(e, elementId),
    onBlur: (e: React.FocusEvent) => handleBlur(elementId, (e.target as HTMLElement).textContent || ''),
    className: `outline-none transition-all cursor-pointer ${
      editing?.id === elementId
        ? 'ring-2 ring-primary/60 rounded px-1 -mx-1 bg-primary/5'
        : 'hover:ring-1 hover:ring-primary/30 hover:rounded hover:px-1 hover:-mx-1'
    }`,
  });

  return (
    <>
      <FloatingToolbar
        visible={!!editing}
        position={toolbarPos}
        style={getElementStyle(editing?.id || '')}
        onChange={(s) => editing && setElementStyle(editing.id, s)}
      />

      <div
        ref={canvasRef}
        className="w-full max-w-[400px] mx-auto shadow-2xl rounded-xl overflow-hidden select-none"
        style={{ fontFamily: s.fontBody }}
        onClick={handleCanvasClick}
      >
        {/* Cover page */}
        <div
          className="relative p-8 text-center min-h-[220px] flex flex-col items-center justify-center"
          style={{ background: s.coverBg, color: s.coverTextColor }}
        >
          {design.logoUrl && (
            <img
              src={design.logoUrl}
              alt="Logo"
              className="w-16 h-16 object-contain mb-3 rounded-lg cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            />
          )}

          <h2
            {...editableProps('cover-title')}
            style={mergedStyle('cover-title', {
              fontFamily: s.fontHeading,
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '4px',
              lineHeight: 1.2,
            })}
          >
            {design.coverTitle || restaurant?.name || 'Mon Restaurant'}
          </h2>

          <p
            {...editableProps('cover-subtitle')}
            style={mergedStyle('cover-subtitle', {
              fontSize: '14px',
              opacity: 0.8,
            })}
          >
            {design.coverSubtitle || restaurant?.city || 'Notre carte'}
          </p>

          <div className="mt-4 w-12 h-px" style={{ backgroundColor: s.coverTextColor, opacity: 0.3 }} />
        </div>

        {/* Menu body */}
        <div style={{ backgroundColor: s.bodyBg, color: s.bodyTextColor }} className="p-5 min-h-[300px]">
          {categories.filter(c => c.is_visible).map(cat => {
            const catElementId = `cat-${cat.id}`;
            return (
              <div
                key={cat.id}
                className={`mb-6 transition-all rounded-lg ${
                  selectedCategoryId === cat.id ? 'ring-2 ring-primary/30 p-3 -m-3' : ''
                }`}
                onClick={(e) => { e.stopPropagation(); onSelectCategory(cat.id); }}
              >
                <CategoryHeader
                  name={getName(cat.translations, lang)}
                  catStyle={s.categoryStyle}
                  styles={s}
                  elementId={catElementId}
                  editableProps={editableProps}
                  mergedStyle={mergedStyle}
                />

                <div className="space-y-3 mt-3">
                  {cat.items.filter(i => i.is_available).map(item => {
                    const nameId = `item-${item.id}-name`;
                    const descId = `item-${item.id}-desc`;
                    const priceId = `item-${item.id}-price`;
                    const isSelected = selectedItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`transition-all rounded ${isSelected ? 'ring-2 ring-primary/30 p-2 -m-2' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onSelectItem(item.id); }}
                      >
                        {s.priceStyle === 'dots' ? (
                          <div>
                            <div className="flex items-baseline">
                              <span
                                {...editableProps(nameId)}
                                style={mergedStyle(nameId, { fontWeight: '500', fontSize: '14px' })}
                              >
                                {getName(item.translations, lang)}
                              </span>
                              <span className="flex-1 mx-2 border-b border-dotted" style={{ borderColor: s.bodyTextColor + '30' }} />
                              <span
                                {...editableProps(priceId)}
                                style={mergedStyle(priceId, { fontSize: '14px', fontWeight: '600', color: s.accentColor })}
                              >
                                {(item.price_cents / 100).toFixed(2)}€
                              </span>
                            </div>
                            {getDesc(item.translations, lang) && (
                              <p
                                {...editableProps(descId)}
                                style={mergedStyle(descId, { fontSize: '12px', marginTop: '2px', opacity: 0.6 })}
                              >
                                {getDesc(item.translations, lang)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <p
                                {...editableProps(nameId)}
                                style={mergedStyle(nameId, { fontWeight: '500', fontSize: '14px' })}
                              >
                                {getName(item.translations, lang)}
                              </p>
                              {getDesc(item.translations, lang) && (
                                <p
                                  {...editableProps(descId)}
                                  style={mergedStyle(descId, { fontSize: '12px', marginTop: '2px', opacity: 0.6 })}
                                >
                                  {getDesc(item.translations, lang)}
                                </p>
                              )}
                            </div>
                            <span
                              {...editableProps(priceId)}
                              style={mergedStyle(priceId, { fontSize: '14px', fontWeight: '600', color: s.accentColor, whiteSpace: 'nowrap' })}
                            >
                              {(item.price_cents / 100).toFixed(2)}€
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

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
    </>
  );
}

function CategoryHeader({
  name, catStyle, styles, elementId, editableProps, mergedStyle,
}: {
  name: string;
  catStyle: string;
  styles: any;
  elementId: string;
  editableProps: (id: string) => any;
  mergedStyle: (id: string, base: React.CSSProperties) => React.CSSProperties;
}) {
  const baseStyle: React.CSSProperties = { fontFamily: styles.fontHeading, color: styles.accentColor };

  switch (catStyle) {
    case 'underline':
      return (
        <div className="pb-1 mb-2" style={{ borderBottom: `2px solid ${styles.accentColor}` }}>
          <h3
            {...editableProps(elementId)}
            style={mergedStyle(elementId, { ...baseStyle, fontSize: '18px', fontWeight: '700' })}
          >
            {name}
          </h3>
        </div>
      );
    case 'elegant':
      return (
        <div className="text-center mb-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: styles.accentColor, opacity: 0.3 }} />
            <h3
              {...editableProps(elementId)}
              style={mergedStyle(elementId, {
                ...baseStyle,
                fontSize: '12px',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
              })}
            >
              {name}
            </h3>
            <div className="flex-1 h-px" style={{ backgroundColor: styles.accentColor, opacity: 0.3 }} />
          </div>
        </div>
      );
    case 'badge':
      return (
        <div className="mb-2">
          <span
            {...editableProps(elementId)}
            className={editableProps(elementId).className}
            style={mergedStyle(elementId, {
              ...baseStyle,
              display: 'inline-block',
              padding: '4px 12px',
              fontSize: '13px',
              fontWeight: '600',
              borderRadius: '999px',
              backgroundColor: styles.accentColor + '20',
            })}
          >
            {name}
          </span>
        </div>
      );
    default:
      return (
        <div className="mb-2">
          <h3
            {...editableProps(elementId)}
            style={mergedStyle(elementId, {
              ...baseStyle,
              fontSize: '14px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            })}
          >
            {name}
          </h3>
          <div className="mt-1 w-8 h-0.5" style={{ backgroundColor: styles.accentColor }} />
        </div>
      );
  }
}
