import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, X, AlertTriangle, ArrowRight } from "lucide-react";

const INCLUDED = [
  "Création de carte illimitée",
  "Visualisation 3D des plats",
  "QR code personnalisé",
  "Traduction multilingue",
  "Import IA depuis photo",
  "Mises à jour illimitées",
];

const COMPARISON = [
  {
    feature: "Prix",
    brunch: "GRATUIT",
    standard: "30–60€/mois",
    threeDee: "49–199€/mois",
  },
  {
    feature: "Visualisation 3D",
    brunch: "check",
    standard: "cross",
    threeDee: "warn",
  },
  {
    feature: "Import IA photo",
    brunch: "check",
    standard: "cross",
    threeDee: "cross",
  },
  {
    feature: "Traduction",
    brunch: "check",
    standard: "warn",
    threeDee: "warn",
  },
  {
    feature: "Sans application client",
    brunch: "check",
    standard: "check",
    threeDee: "check",
  },
  {
    feature: "Sans engagement",
    brunch: "check",
    standard: "warn",
    threeDee: "check",
  },
];

function CellIcon({ value }: { value: string }) {
  if (value === "check") return <Check className="h-4 w-4 text-emerald-500 mx-auto" />;
  if (value === "cross") return <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  if (value === "warn")
    return <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />;
  return (
    <span className="font-bold text-sm text-foreground">{value}</span>
  );
}

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-card border-y border-border">
      <div className="max-w-4xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl">
            Attendez… <span className="text-primary">C'est vraiment gratuit ?</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Oui. Et on comprend votre scepticisme. La plupart des outils de menu digital coûtent entre 30 et 200€ par mois.
            Certains bloquent les fonctionnalités derrière des murs payants. D'autres vous facturent la 3D en option premium.
          </p>
          <p className="font-medium text-foreground">
            Chez BRUNCH, tout est inclus dans le plan gratuit :
          </p>
        </div>

        {/* Included list */}
        <div className="grid sm:grid-cols-2 gap-3 max-w-lg mx-auto">
          {INCLUDED.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 font-medium text-muted-foreground" />
                <th className="py-3 px-3 font-bold text-primary">BRUNCH</th>
                <th className="py-3 px-3 font-medium text-muted-foreground">
                  Concurrents standard
                </th>
                <th className="py-3 px-3 font-medium text-muted-foreground">
                  Solutions 3D
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="border-b border-border/50">
                  <td className="py-3 px-3 text-muted-foreground">
                    {row.feature}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CellIcon value={row.brunch} />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CellIcon value={row.standard} />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CellIcon value={row.threeDee} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div className="text-center space-y-3">
          <Button size="lg" className="text-base px-8" asChild>
            <Link to="/signup">
              Créer ma carte BRUNCH — gratuitement
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            ✅ Sans CB requise · ✅ Sans engagement · ✅ Toutes les features incluses
          </p>
        </div>
      </div>
    </section>
  );
}
