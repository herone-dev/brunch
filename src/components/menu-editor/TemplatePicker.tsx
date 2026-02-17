import { MENU_TEMPLATES, type MenuDesign } from '@/lib/menu-templates';
import { Check } from 'lucide-react';

interface Props {
  design: MenuDesign;
  onChange: (design: MenuDesign) => void;
}

export function TemplatePicker({ design, onChange }: Props) {
  return (
    <div className="space-y-3">
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
              <div
                className="h-20 w-full"
                style={{ background: t.previewGradient }}
              />
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
    </div>
  );
}
