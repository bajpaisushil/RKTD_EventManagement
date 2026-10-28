import { FestivalContent } from "@/booking/FestivalContent";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { TempleVisual } from "@/temple/TempleVisual";

export default function HomePage() {
  return (
    <>
      <Hero visual={<TempleVisual />} />
      <main>
        <FestivalContent />
      </main>
      <Footer />
    </>
  );
}
