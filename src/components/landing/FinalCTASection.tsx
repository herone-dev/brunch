import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function FinalCTASection() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-6">
        <h2 className="text-3xl md:text-4xl text-primary-foreground">
          2 minutes pour tester. Une vie sans imprimeur.
        </h2>
        <div className="text-primary-foreground/80 text-lg space-y-1">
          <p>Dans 5 minutes, votre carte interactive est en ligne.</p>
          <p>Dans 7 minutes, vos plats sont visibles en 3D.</p>
          <p>Dans 30 secondes, vous comprendrez pourquoi +1 000 restaurants ont choisi BRUNCH.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            variant="secondary"
            className="text-base px-8"
            asChild
          >
            <Link to="/signup">
              Créer ma carte gratuitement — sans CB
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            asChild
          >
            <Link to="/m/demo">Voir un vrai menu</Link>
          </Button>
        </div>
        <p className="text-xs text-primary-foreground/60">
          ✅ Gratuit pour toujours · ✅ Sans CB · ✅ Sans engagement · ✅ 3D incluse
        </p>
      </div>
    </section>
  );
}
