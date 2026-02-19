import Navbar from "@/components/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import GeneDrugSection from "@/components/landing/GeneDrugSection";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <HeroSection />
      <FeaturesSection />
      <GeneDrugSection />
    </div>
  );
};

export default Index;
