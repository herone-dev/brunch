import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera, Paintbrush, QrCode } from "lucide-react";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

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
  const ref = useScrollFadeIn();

  return (
    <section id="how" style={{ background: 'hsl(40, 15%, 95%)' }} className="border-y border-border">
      <div ref={ref} className="fade-in-section max-w-landing mx-auto px-5 py-24">
        <h2 className="text-3xl md:text-[2.5rem] text-center mb-16">
          De votre carte papier à la 3D interactive.{" "}
          <span className="text-primary">En 3 étapes.</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {STEPS.map((item, i) => (
            <div key={item.step} className="relative text-center space-y-4 px-2">
              {/* Background number */}
              <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[80px] font-bold text-foreground/[0.04] leading-none select-none pointer-events-none">
                {item.step}
              </span>
              {/* Icon */}
              <div className="mx-auto w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="text-[15px] text-muted-foreground max-w-xs mx-auto leading-[1.65]">
                {item.desc}
              </p>
              {/* Connector arrow (desktop only) */}
              {i < STEPS.length - 1 && (
                <span className="hidden md:block absolute top-10 -right-4 text-2xl text-border select-none">→</span>
              )}
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Button size="lg" className="h-12 px-7 rounded-[10px] font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200" asChild>
            <Link to="/signup">Je commence maintenant — c'est gratuit</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
