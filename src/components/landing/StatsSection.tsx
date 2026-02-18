import { TrendingUp, TrendingDown, ShoppingCart, Clock } from "lucide-react";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

const STATS = [
  { value: "+35%", label: "Visibilité sur les plats avec la 3D", icon: TrendingUp },
  { value: "-50%", label: "Frais d'impression économisés", icon: TrendingDown },
  { value: "+20%", label: "Commandes sur les plats phares", icon: ShoppingCart },
  { value: "5 min", label: "Temps moyen pour créer sa première carte", icon: Clock },
];

export default function StatsSection() {
  const ref = useScrollFadeIn();

  return (
    <section style={{ background: 'hsl(40, 15%, 95%)' }} className="border-y border-border">
      <div ref={ref} className="fade-in-section max-w-landing mx-auto px-5 py-24 text-center space-y-12">
        <h2 className="text-3xl md:text-[2.5rem]">
          Les chiffres qui parlent <span className="text-primary">d'eux-mêmes</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
          {STATS.map((stat, i) => (
            <div
              key={i}
              className={`p-8 space-y-2 ${
                i < STATS.length - 1 ? "md:border-r border-border" : ""
              }`}
            >
              <stat.icon className="mx-auto h-6 w-6 text-primary/50 mb-2" />
              <p className="text-[48px] font-bold text-primary leading-none">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground max-w-[140px] mx-auto">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
