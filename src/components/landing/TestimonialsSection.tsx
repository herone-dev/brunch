import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    before: "Je passais ma vie à imprimer mes cartes.",
    after: "Je modifie mon menu en un clin d'œil. Et mes clients adorent voir les plats en 3D.",
    name: "Marie L.",
    place: "Bistrot du Marché, Lyon",
  },
  {
    before: "Chaque changement de prix = une nouvelle impression.",
    after: "Ajouter des plats, changer les prix, c'est en 2 clics. Très rapide.",
    name: "Thomas K.",
    place: "La Brasserie, Paris 11e",
  },
  {
    before: "Des menus papier à gérer en permanence.",
    after: "Mes clients adorent le QR code. Le rendu 3D, c'est la cerise sur le gâteau.",
    name: "Sofia R.",
    place: "Chez Sofia, Marseille",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <h2 className="text-3xl md:text-4xl text-center mb-12">
        Ils ont arrêté d'imprimer.{" "}
        <span className="text-primary">Voilà ce qu'ils en disent.</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-6 space-y-4"
          >
            <div className="flex gap-1">
              {Array(5)
                .fill(0)
                .map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Avant BRUNCH :</span>{" "}
                "{t.before}"
              </p>
              <p className="text-sm">
                <span className="font-semibold text-primary">Après BRUNCH :</span>{" "}
                "{t.after}"
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.place}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
