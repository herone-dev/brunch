import { useState, useRef, useCallback, useEffect } from 'react';
import { type MenuDesign, type MenuFormat, type AdvancedPageSettings, type IconStyle, type LogoPosition, type TextSize, TEXT_SIZE_SCALES, getEffectiveStyles } from '@/lib/menu-templates';
import { FloatingToolbar, type ElementStyle } from '@/components/menu-editor/FloatingToolbar';
import { MapPin, Phone, Mail, Globe, Instagram, Facebook } from 'lucide-react';
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
  id: string;
  rect: DOMRect;
};

const FORMAT_SIZES: Record<MenuFormat, { width: number; height: number; label: string }> = {
  portrait: { width: 400, height: 566, label: 'A4 Portrait' },
  landscape: { width: 566, height: 400, label: 'A4 Paysage' },
  book: { width: 800, height: 566, label: 'Livre (2 pages)' },
};

export function MenuCanvas({
  restaurant, categories, design, lang,
  selectedCategoryId, selectedItemId,
  onSelectCategory, onSelectItem, onDesignChange,
  onUpdateItemText, onUpdateCategoryText,
}: Props) {
  const s = getEffectiveStyles(design);
  const ts = TEXT_SIZE_SCALES[s.textSize || 'medium'];
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<EditingElement | null>(null);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });

  const format: MenuFormat = design.format || 'portrait';
  const formatSize = FORMAT_SIZES[format];
  const elementStyles = design.elementStyles || {};

  const getElementStyle = (id: string): ElementStyle => elementStyles[id] || {};

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

  const handleCanvasClick = () => setEditing(null);

  const handleBlur = (elementId: string, value: string) => {
    if (elementId === 'cover-title') {
      onDesignChange({ ...design, coverTitle: value });
    } else if (elementId === 'cover-subtitle') {
      onDesignChange({ ...design, coverSubtitle: value });
    } else if (elementId.startsWith('cat-')) {
      const catId = elementId.replace('cat-', '');
      onUpdateCategoryText(catId, lang, value);
    } else if (elementId.startsWith('item-')) {
      const parts = elementId.split('-');
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

  const renderBgOverlay = (settings?: AdvancedPageSettings) => {
    if (!settings?.backgroundImageUrl) return null;
    return (
      <div className="absolute inset-0 z-0" style={{
        backgroundImage: `url(${settings.backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: settings.backgroundOpacity ?? 0.3,
      }} />
    );
  };

  const renderIcon = (type: 'address' | 'phone' | 'email' | 'website' | 'instagram' | 'facebook' | 'tiktok', iconStyle: IconStyle, size = 10) => {
    if (iconStyle === 'none') return null;
    if (iconStyle === 'lucide') {
      const iconProps = { size, strokeWidth: 1.5, className: 'shrink-0' };
      switch (type) {
        case 'address': return <MapPin {...iconProps} />;
        case 'phone': return <Phone {...iconProps} />;
        case 'email': return <Mail {...iconProps} />;
        case 'website': return <Globe {...iconProps} />;
        case 'instagram': return <Instagram {...iconProps} />;
        case 'facebook': return <Facebook {...iconProps} />;
        case 'tiktok': return <span style={{ fontSize: size }}>♪</span>;
      }
    }
    // emoji
    const emojis: Record<string, string> = { address: '📍', phone: '📞', email: '✉️', website: '🌐', instagram: '📸', facebook: '👤', tiktok: '🎵' };
    return <span style={{ fontSize: size - 1 }}>{emojis[type]}</span>;
  };

  const renderRestaurantInfo = (settings?: AdvancedPageSettings, compact = false) => {
    if (!settings || !restaurant) return null;
    const iconStyle: IconStyle = settings.iconStyle || 'emoji';
    const infos: { type: 'address' | 'phone' | 'email' | 'website'; text: string }[] = [];
    if (settings.showAddress && restaurant.address) infos.push({ type: 'address', text: restaurant.address });
    if (settings.showPhone && restaurant.phone) infos.push({ type: 'phone', text: restaurant.phone });
    if (settings.showEmail && restaurant.email) infos.push({ type: 'email', text: restaurant.email });
    if (settings.showWebsite && restaurant.website) infos.push({ type: 'website', text: restaurant.website });
    const socialItems: { type: 'instagram' | 'facebook' | 'tiktok'; text: string }[] = [];
    if (settings.showSocials) {
      if (restaurant.instagram) socialItems.push({ type: 'instagram', text: `@${restaurant.instagram}` });
      if (restaurant.facebook) socialItems.push({ type: 'facebook', text: restaurant.facebook });
      if (restaurant.tiktok) socialItems.push({ type: 'tiktok', text: restaurant.tiktok });
    }
    if (!infos.length && !socialItems.length && !settings.customText) return null;

    if (compact) {
      return (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5" style={{ fontSize: '9px', opacity: 0.75 }}>
          {infos.map((info, i) => (
            <span key={i} className="whitespace-nowrap inline-flex items-center gap-0.5">
              {renderIcon(info.type, iconStyle, 9)} {info.text}
            </span>
          ))}
          {socialItems.map((s, i) => (
            <span key={`s-${i}`} className="whitespace-nowrap inline-flex items-center gap-0.5">
              {renderIcon(s.type, iconStyle, 9)} {s.text}
            </span>
          ))}
          {settings.customText && <span className="italic">{settings.customText}</span>}
        </div>
      );
    }

    return (
      <div className="text-center space-y-1" style={{ fontSize: '10px', opacity: 0.7 }}>
        {infos.map((info, i) => (
          <div key={i} className="flex items-center justify-center gap-1">
            {renderIcon(info.type, iconStyle)} <span>{info.text}</span>
          </div>
        ))}
        {socialItems.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-[9px]">
            {socialItems.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-0.5">
                {renderIcon(s.type, iconStyle, 9)} {s.text}
              </span>
            ))}
          </div>
        )}
        {settings.customText && <div className="mt-1 italic text-[9px]">{settings.customText}</div>}
      </div>
    );
  };

  const renderHeaderFooter = (section: 'header' | 'footer') => {
    const settings = design[section];
    if (!design.advancedMode || !settings) return null;
    const hasContent = settings.backgroundImageUrl || settings.showLogo || settings.showAddress ||
      settings.showPhone || settings.showEmail || settings.showWebsite || settings.showSocials || settings.customText;
    if (!hasContent) return null;

    const isHeader = section === 'header';
    return (
      <div
        className="relative overflow-hidden"
        style={{
          backgroundColor: s.bodyBg,
          color: s.bodyTextColor,
          borderTop: !isHeader ? `1px solid ${s.accentColor}15` : undefined,
          borderBottom: isHeader ? `1px solid ${s.accentColor}15` : undefined,
          padding: '8px 16px',
        }}
      >
        {renderBgOverlay(settings)}
        <div className="relative z-10 flex items-center gap-3" style={{
          justifyContent: settings.logoPosition === 'right' ? 'flex-end' : settings.logoPosition === 'center' ? 'center' : 'flex-start',
        }}>
          {settings.showLogo && design.logoUrl && settings.logoPosition !== 'right' && (
            <img src={design.logoUrl} alt="Logo" className="w-6 h-6 object-contain rounded-sm shrink-0" />
          )}
          <div className={`${settings.logoPosition === 'center' ? '' : 'flex-1'} min-w-0`}>
            {renderRestaurantInfo(settings, true)}
          </div>
          {settings.showLogo && design.logoUrl && settings.logoPosition === 'right' && (
            <img src={design.logoUrl} alt="Logo" className="w-6 h-6 object-contain rounded-sm shrink-0" />
          )}
        </div>
      </div>
    );
  };

  const renderCoverPage = () => {
    const firstPage = design.firstPage;
    const hasAdvanced = design.advancedMode && firstPage;

    return (
      <div
        className="relative p-8 text-center min-h-[220px] flex flex-col items-center justify-center overflow-hidden"
        style={{ background: s.coverBg, color: s.coverTextColor }}
      >
        {design.overrides?.coverBgImage && (
          <div className="absolute inset-0 z-0" style={{
            backgroundImage: `url(${design.overrides.coverBgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: design.overrides?.coverBgOpacity ?? 1,
          }} />
        )}
        {hasAdvanced && renderBgOverlay(firstPage)}
        <div className="relative z-10">
          {(hasAdvanced ? firstPage?.showLogo !== false : true) && design.logoUrl && (
            <img src={design.logoUrl} alt="Logo" className="w-16 h-16 object-contain mb-3 rounded-lg cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" />
          )}
          <h2
            {...editableProps('cover-title')}
            style={mergedStyle('cover-title', { fontFamily: s.fontHeading, fontSize: `${ts.title}px`, fontWeight: '700', marginBottom: '4px', lineHeight: 1.2 })}
          >
            {design.coverTitle || restaurant?.name || 'Mon Restaurant'}
          </h2>
          <p
            {...editableProps('cover-subtitle')}
            style={mergedStyle('cover-subtitle', { fontSize: '14px', opacity: 0.8 })}
          >
            {design.coverSubtitle || restaurant?.city || 'Notre carte'}
          </p>
          <div className="mt-4 w-12 h-px" style={{ backgroundColor: s.coverTextColor, opacity: 0.3 }} />
          {hasAdvanced && renderRestaurantInfo(firstPage)}
        </div>
      </div>
    );
  };

  const renderLastPage = () => {
    const lastPage = design.lastPage;
    if (!design.advancedMode || !lastPage) return null;
    const hasContent = lastPage.backgroundImageUrl || lastPage.showLogo || lastPage.showAddress ||
      lastPage.showPhone || lastPage.showEmail || lastPage.showWebsite || lastPage.showSocials || lastPage.customText;
    if (!hasContent) return null;

    return (
      <div className="relative p-8 text-center min-h-[160px] flex flex-col items-center justify-center" style={{ background: s.coverBg, color: s.coverTextColor }}>
        {renderBgOverlay(lastPage)}
        <div className="relative z-10 space-y-2">
          {lastPage.showLogo && design.logoUrl && (
            <img src={design.logoUrl} alt="Logo" className="w-12 h-12 object-contain mx-auto rounded-lg" />
          )}
          {renderRestaurantInfo(lastPage)}
        </div>
      </div>
    );
  };

  const renderMenuBody = () => (
    <div style={{ backgroundColor: s.bodyBg, color: s.bodyTextColor }} className="relative p-5 min-h-[300px] overflow-hidden">
      {design.overrides?.bodyBgImage && (
        <div className="absolute inset-0 z-0" style={{
          backgroundImage: `url(${design.overrides.bodyBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: design.overrides?.bodyBgOpacity ?? 1,
        }} />
      )}
      <div className="relative z-10">
      {categories.filter(c => c.is_visible).map(cat => {
        const catElementId = `cat-${cat.id}`;
        return (
          <div
            key={cat.id}
            className={`mb-6 transition-all rounded-lg ${selectedCategoryId === cat.id ? 'ring-2 ring-primary/30 p-3 -m-3' : ''}`}
            onClick={(e) => { e.stopPropagation(); onSelectCategory(cat.id); }}
          >
            <CategoryHeader
              name={getName(cat.translations, lang)}
              catStyle={s.categoryStyle}
              styles={s}
              catTitleSize={ts.catTitle}
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
                          <span {...editableProps(nameId)} style={mergedStyle(nameId, { fontWeight: '500', fontSize: `${ts.item}px` })}>
                            {getName(item.translations, lang)}
                          </span>
                          <span className="flex-1 mx-2 border-b border-dotted" style={{ borderColor: s.bodyTextColor + '30' }} />
                          <span {...editableProps(priceId)} style={mergedStyle(priceId, { fontSize: `${ts.price}px`, fontWeight: '600', color: s.accentColor })}>
                            {(item.price_cents / 100).toFixed(2)}€
                          </span>
                        </div>
                        {getDesc(item.translations, lang) && (
                          <p {...editableProps(descId)} style={mergedStyle(descId, { fontSize: `${ts.desc}px`, marginTop: '2px', opacity: 0.6 })}>
                            {getDesc(item.translations, lang)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p {...editableProps(nameId)} style={mergedStyle(nameId, { fontWeight: '500', fontSize: `${ts.item}px` })}>
                            {getName(item.translations, lang)}
                          </p>
                          {getDesc(item.translations, lang) && (
                            <p {...editableProps(descId)} style={mergedStyle(descId, { fontSize: `${ts.desc}px`, marginTop: '2px', opacity: 0.6 })}>
                              {getDesc(item.translations, lang)}
                            </p>
                          )}
                        </div>
                        <span {...editableProps(priceId)} style={mergedStyle(priceId, { fontSize: `${ts.price}px`, fontWeight: '600', color: s.accentColor, whiteSpace: 'nowrap' })}>
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
    </div>
  );

  const defaultFooter = () => {
    if (design.advancedMode && design.footer) return null;
    return (
      <div className="p-4 text-center text-xs opacity-60" style={{ backgroundColor: s.bodyBg, color: s.bodyTextColor, borderTop: `1px solid ${s.accentColor}22` }}>
        {restaurant?.name} • Bon appétit !
      </div>
    );
  };

  // Book format: side-by-side
  if (format === 'book') {
    return (
      <>
        <FloatingToolbar visible={!!editing} position={toolbarPos} style={getElementStyle(editing?.id || '')} onChange={(s) => editing && setElementStyle(editing.id, s)} />
        <div className="flex items-start justify-center">
          <div className="flex shadow-2xl rounded-xl overflow-hidden select-none" style={{ fontFamily: s.fontBody, width: `${formatSize.width}px` }} onClick={handleCanvasClick}>
            {/* Left page: cover */}
            <div className="flex-1 flex flex-col" style={{ maxWidth: '50%' }}>
              {renderCoverPage()}
            </div>
            {/* Right page: menu */}
            <div className="flex-1 flex flex-col overflow-y-auto" style={{ maxWidth: '50%', borderLeft: `1px solid ${s.accentColor}15` }}>
              {renderHeaderFooter('header')}
              {renderMenuBody()}
              {renderHeaderFooter('footer')}
              {defaultFooter()}
            </div>
          </div>
        </div>
        {/* Format indicator */}
        <div className="text-center mt-2">
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{formatSize.label}</span>
        </div>
      </>
    );
  }

  return (
    <>
      <FloatingToolbar visible={!!editing} position={toolbarPos} style={getElementStyle(editing?.id || '')} onChange={(s) => editing && setElementStyle(editing.id, s)} />
      <div
        ref={canvasRef}
        className="mx-auto shadow-2xl rounded-xl overflow-hidden select-none"
        style={{ fontFamily: s.fontBody, width: `${formatSize.width}px` }}
        onClick={handleCanvasClick}
      >
        {renderCoverPage()}
        {renderHeaderFooter('header')}
        {renderMenuBody()}
        {renderHeaderFooter('footer')}
        {defaultFooter()}
        {renderLastPage()}
      </div>
    </>
  );
}

function CategoryHeader({
  name, catStyle, styles, catTitleSize, elementId, editableProps, mergedStyle,
}: {
  name: string; catStyle: string; styles: any; catTitleSize: number; elementId: string;
  editableProps: (id: string) => any;
  mergedStyle: (id: string, base: React.CSSProperties) => React.CSSProperties;
}) {
  const baseStyle: React.CSSProperties = { fontFamily: styles.fontHeading, color: styles.accentColor };
  const elegantSize = Math.max(10, catTitleSize - 6);
  const badgeSize = Math.max(11, catTitleSize - 5);
  switch (catStyle) {
    case 'underline':
      return (
        <div className="pb-1 mb-2" style={{ borderBottom: `2px solid ${styles.accentColor}` }}>
          <h3 {...editableProps(elementId)} style={mergedStyle(elementId, { ...baseStyle, fontSize: `${catTitleSize}px`, fontWeight: '700' })}>{name}</h3>
        </div>
      );
    case 'elegant':
      return (
        <div className="text-center mb-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: styles.accentColor, opacity: 0.3 }} />
            <h3 {...editableProps(elementId)} style={mergedStyle(elementId, { ...baseStyle, fontSize: `${elegantSize}px`, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.2em' })}>{name}</h3>
            <div className="flex-1 h-px" style={{ backgroundColor: styles.accentColor, opacity: 0.3 }} />
          </div>
        </div>
      );
    case 'badge':
      return (
        <div className="mb-2">
          <span {...editableProps(elementId)} className={editableProps(elementId).className} style={mergedStyle(elementId, { ...baseStyle, display: 'inline-block', padding: '4px 12px', fontSize: `${badgeSize}px`, fontWeight: '600', borderRadius: '999px', backgroundColor: styles.accentColor + '20' })}>{name}</span>
        </div>
      );
    default:
      return (
        <div className="mb-2">
          <h3 {...editableProps(elementId)} style={mergedStyle(elementId, { ...baseStyle, fontSize: `${catTitleSize - 4}px`, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' })}>{name}</h3>
          <div className="mt-1 w-8 h-0.5" style={{ backgroundColor: styles.accentColor }} />
        </div>
      );
  }
}
