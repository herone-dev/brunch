import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera, Paintbrush, QrCode } from "lucide-react";

const STEPS = [
  {
    step: "1",
    icon: Camera,
    title: "Importez votre carte existante",
    desc: "Prenez en photo votre menu papier. Notre IA le lit, le structure, le catégorise automatiquement. Plats, prix, descriptions, catégories — tout est reconnu en quelques secondes. Vous n'avez rien à retaper.",
  },
  {
    step: "2",
    icon: Paintbrush,
    title: "Personnalisez à votre image",
    desc: "Interface type Canva, accessible à tous. Ajoutez vos photos de plats, activez la 3D, choisissez vos couleurs, activez la traduction. Aucune compétence technique requise.",
  },
  {
    step: "3",
    icon: QrCode,
    title: "Partagez votre QR code",
    desc: "Générez votre QR code aux couleurs de votre restaurant. Imprimez-le, posez-le sur vos tables. Vos clients scannent, ils découvrent votre carte interactive. C'est tout.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how" className="bg-card border-y border-border">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl text-center mb-16">
          De votre carte papier à la 3D interactive.{" "}
          <span className="text-primary">En 3 étapes.</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((item) => (
            <div key={item.step} className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                {item.step}
              </div>
              <item.icon className="mx-auto h-8 w-8 text-primary" />
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Button size="lg" asChild>
            <Link to="/signup">Je commence maintenant — c'est gratuit</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
