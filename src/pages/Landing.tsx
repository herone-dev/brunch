import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import StatsSection from "@/components/landing/StatsSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import { Button } from "@/components/ui/button";

const Landing = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.08)]"
            : "bg-transparent"
        }`}
        style={{ height: 60 }}
      >
        <div className="max-w-landing mx-auto flex items-center justify-between px-5 h-full">
          <h1 className="text-2xl font-bold text-primary tracking-tight !leading-normal !tracking-normal !letter-spacing-normal">BRUNCH</h1>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition-colors duration-200">Comment ça marche</a>
            <a href="#features" className="hover:text-foreground transition-colors duration-200">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-foreground transition-colors duration-200">Tarifs</a>
            <a href="#faq" className="hover:text-foreground transition-colors duration-200">FAQ</a>
          </nav>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-lg text-sm font-medium" asChild>
              <Link to="/login">Connexion</Link>
            </Button>
            <Button size="sm" className="rounded-lg text-sm font-semibold" asChild>
              <Link to="/signup">S'inscrire</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
        <StatsSection />
        <FAQSection />
        <FinalCTASection />
      </main>

      <footer className="bg-[hsl(0,0%,7%)]">
        <div className="max-w-landing mx-auto px-5 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-[hsl(0,0%,42%)]">© 2026 BRUNCH — La carte digitale restaurant interactive gratuite</p>
          <div className="flex gap-6 text-[13px] text-[hsl(0,0%,61%)]">
            <Link to="/login" className="hover:text-white transition-colors duration-200">Connexion</Link>
            <Link to="/signup" className="hover:text-white transition-colors duration-200">S'inscrire</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
