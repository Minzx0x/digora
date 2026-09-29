import Hero from "@/components/Hero";
import Products from "@/components/Products";
import SmmProducts from "@/components/SmmProducts";
import HowItWorks from "@/components/HowItWorks";
import Benefits from "@/components/Benefits";
import Faq from "@/components/Faq";
import Cta from "@/components/Cta";
import Footer from "@/components/Footer";
import FitWidth from "@/components/FitWidth";
import FloatingNav from "@/components/FloatingNav";

export default function Home() {
  return (
    <>
      <FloatingNav />
      <main className="page">
        <div className="page-inner">
          <Hero />
        </div>
      </main>

      <FitWidth>
        <div className="stack">
          <SmmProducts />
          <Products />
          <HowItWorks />
          <Benefits />
          <Faq />
          <Cta />
        </div>

      </FitWidth>

      <FitWidth>
        <Footer />
      </FitWidth>
    </>
  );
}