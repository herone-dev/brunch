import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

export default function ProblemSection() {
  const ref = useScrollFadeIn();

  return (
    <section ref={ref} className="fade-in-section max-w-3xl mx-auto px-5 py-24">
      <h2 className="text-3xl md:text-[2.5rem] text-center mb-8">
        Vous en avez marre de courir chez l'imprimeur{" "}
        <span className="text-primary">à chaque changement de prix ?</span>
      </h2>
      <div className="space-y-4 text-muted-foreground text-center text-base leading-[1.7] max-w-[600px] mx-auto">
        <p>
          Un fournisseur en rupture. Un plat qui change. Une promotion de dernière minute.
        </p>
        <p>
          Et vous voilà à réimprimer 50 cartes plastifiées à 23h pour que ce soit prêt demain matin.
        </p>
        <p>
          Pendant ce temps, vos concurrents modifient leur menu en 30 secondes depuis leur téléphone.
          Et leurs clients visualisent les plats en 3D avant même de les commander.
        </p>
        <p className="text-foreground font-medium">
          La digitalisation de votre carte n'est plus une option. La bonne nouvelle :{" "}
          <span className="text-primary">avec BRUNCH, elle prend 5 minutes et ne coûte rien.</span>
        </p>
      </div>
    </section>
  );
}
