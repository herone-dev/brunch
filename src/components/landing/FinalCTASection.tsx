import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function FinalCTASection() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto px-5 py-24 text-center space-y-6">
        <h2 className="text-3xl md:text-[2.75rem] text-white !text-white">
          2 minutes pour tester. Une vie sans imprimeur.
        </h2>
        <div className="text-white/80 text-[17px] space-y-1 leading-[1.65]">
          <p>Dans 5 minutes, votre carte interactive est en ligne.</p>
          <p>Dans 7 minutes, vos plats sont visibles en 3D.</p>
          <p>Dans 30 secondes, vous comprendrez pourquoi +1 000 restaurants ont choisi BRUNCH.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            variant="secondary"
            className="h-12 px-8 rounded-[10px] text-base font-semibold bg-white text-primary hover:bg-white/90 hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
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
            className="h-12 text-base rounded-[10px] border-secondary/50 text-secondary hover:bg-secondary/10"
            asChild
          >
            <Link to="/m/demo">Voir un vrai menu</Link>
          </Button>
        </div>
        <p className="text-[13px] text-white/60 tracking-wide">
          ✅ Gratuit pour toujours · ✅ Sans CB · ✅ Sans engagement · ✅ 3D incluse
        </p>
      </div>
    </section>
  );
}
