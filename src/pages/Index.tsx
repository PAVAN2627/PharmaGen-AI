import Navbar from "@/components/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ArchitectureSection from "@/components/landing/ArchitectureSection";
import GeneDrugSection from "@/components/landing/GeneDrugSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ArchitectureSection />
      <GeneDrugSection />
      <Footer />
    </div>
  );
};

export default Index;
