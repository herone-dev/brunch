import { Star } from "lucide-react";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

const TESTIMONIALS = [
  {
    before: "Je passais ma vie à imprimer mes cartes.",
    after: "Je modifie mon menu en un clin d'œil. Et mes clients adorent voir les plats en 3D.",
    name: "Marie L.",
    place: "Bistrot du Marché, Lyon",
    initials: "ML",
  },
  {
    before: "Chaque changement de prix = une nouvelle impression.",
    after: "Ajouter des plats, changer les prix, c'est en 2 clics. Très rapide.",
    name: "Thomas K.",
    place: "La Brasserie, Paris 11e",
    initials: "TK",
  },
  {
    before: "Des menus papier à gérer en permanence.",
    after: "Mes clients adorent le QR code. Le rendu 3D, c'est la cerise sur le gâteau.",
    name: "Sofia R.",
    place: "Chez Sofia, Marseille",
    initials: "SR",
  },
];

export default function TestimonialsSection() {
  const ref = useScrollFadeIn();

  return (
    <section ref={ref} className="fade-in-section max-w-landing mx-auto px-5 py-24">
      <h2 className="text-3xl md:text-[2.5rem] text-center mb-12">
        Ils ont arrêté d'imprimer.{" "}
        <span className="text-primary">Voilà ce qu'ils en disent.</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t, i) => (
          <div
            key={i}
            className="rounded-2xl bg-background p-7 space-y-0 border border-border shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:shadow-[0_4px_24px_rgba(0,0,0,0.1)] transition-all duration-250"
          >
            {/* Stars */}
            <div className="flex gap-1 mb-3">
              {Array(5).fill(0).map((_, j) => (
                <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            {/* Quotes */}
            <div className="space-y-2">
              <p className="text-[15px] text-muted-foreground leading-[1.65]">
                <span className="font-semibold text-foreground">Avant BRUNCH :</span>{" "}
                "{t.before}"
              </p>
              <p className="text-[15px] leading-[1.65]">
                <span className="font-semibold text-primary">Après BRUNCH :</span>{" "}
                "{t.after}"
              </p>
            </div>
            {/* Separator */}
            <div className="border-t border-border my-5" />
            {/* Author */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold">
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-[13px] text-[hsl(0,0%,64%)]">{t.place}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
