import { TrendingUp, TrendingDown, ShoppingCart, Clock } from "lucide-react";

const STATS = [
  { value: "+35%", label: "Visibilité sur les plats avec la 3D", icon: TrendingUp },
  { value: "-50%", label: "Frais d'impression économisés", icon: TrendingDown },
  { value: "+20%", label: "Commandes sur les plats phares", icon: ShoppingCart },
  { value: "5 min", label: "Temps moyen pour créer sa première carte", icon: Clock },
];

export default function StatsSection() {
  return (
    <section className="bg-card border-y border-border">
      <div className="max-w-6xl mx-auto px-6 py-20 text-center space-y-12">
        <h2 className="text-3xl md:text-4xl">
          Les chiffres qui parlent <span className="text-primary">d'eux-mêmes</span>
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-background p-8 space-y-2"
            >
              <stat.icon className="mx-auto h-8 w-8 text-primary/60" />
              <p className="text-4xl md:text-5xl font-bold text-primary">
                {stat.value}
              </p>
              <p className="text-muted-foreground text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
