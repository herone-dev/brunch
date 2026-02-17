import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, ChevronRight } from 'lucide-react';
import type { CategoryWithItems, ItemWithDetails } from '@/lib/types';

interface Props {
  categories: CategoryWithItems[];
  selectedCategoryId?: string | null;
  selectedItemId?: string | null;
  onSelectCategory: (cat: CategoryWithItems) => void;
  onSelectItem: (item: ItemWithDetails) => void;
  onAddCategory: () => void;
  onAddItem: () => void;
  onDeleteCategory: (id: string) => void;
  onDeleteItem: (id: string) => void;
}

const getName = (translations: { lang: string; name: string }[], lang: string) =>
  translations.find(t => t.lang === lang)?.name || translations[0]?.name || '—';

export function CategorySidebar({
  categories, selectedCategoryId, selectedItemId,
  onSelectCategory, onSelectItem, onAddCategory, onAddItem,
  onDeleteCategory, onDeleteItem,
}: Props) {
  return (
    <div className="p-3 space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Structure</h3>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onAddCategory}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {categories.map(cat => {
        const isSelected = selectedCategoryId === cat.id;
        return (
          <div key={cat.id}>
            <div
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${
                isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
              }`}
              onClick={() => onSelectCategory(cat)}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground shrink-0 cursor-grab" />
              <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
              <span className="flex-1 truncate font-medium text-xs">{getName(cat.translations, 'fr')}</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1">{cat.items.length}</Badge>
              <button
                className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                onClick={e => { e.stopPropagation(); onDeleteCategory(cat.id); }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            {isSelected && (
              <div className="ml-6 mt-0.5 space-y-0.5 border-l border-border pl-2">
                {cat.items.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer transition-colors group ${
                      selectedItemId === item.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                    }`}
                    onClick={() => onSelectItem(item)}
                  >
                    <span className="truncate flex-1">{getName(item.translations, 'fr')}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">{(item.price_cents / 100).toFixed(2)}€</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                        onClick={e => { e.stopPropagation(); onDeleteItem(item.id); }}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="ghost" className="w-full text-[10px] h-6" onClick={onAddItem}>
                  <Plus className="h-3 w-3 mr-0.5" /> Plat
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {categories.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-xs mb-2">Aucune catégorie</p>
          <Button size="sm" onClick={onAddCategory}><Plus className="h-3 w-3 mr-1" /> Ajouter</Button>
        </div>
      )}
    </div>
  );
}
