import { motion } from "framer-motion";
import { ArrowRight, Upload, Dna } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";
import { ANIMATION_DURATIONS, ANIMATION_DELAYS } from "@/lib/constants";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="Genomic DNA visualization" className="h-full w-full object-cover" />
        <div className="absolute inset-0 hero-overlay opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      <div className="container relative z-10 mx-auto flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.SLOW }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2 text-sm text-secondary-foreground backdrop-blur-sm"
        >
          <Dna className="h-4 w-4 text-secondary" />
          <span className="text-secondary">AI-Powered Pharmacogenomic Analysis</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.SLOW, delay: ANIMATION_DELAYS.FAST }}
          className="mb-6 max-w-4xl font-display text-4xl font-bold leading-tight tracking-tight text-primary-foreground md:text-6xl lg:text-7xl"
        >
          Predict Drug Risks with{" "}
          <span className="bg-gradient-to-r from-secondary to-primary-foreground bg-clip-text text-transparent">
            Genomic Intelligence
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.SLOW, delay: ANIMATION_DELAYS.MEDIUM }}
          className="mb-10 max-w-2xl text-lg text-primary-foreground/70 md:text-xl"
        >
          Upload patient VCF files, analyze genetic variants, and receive CPIC-aligned 
          dosage recommendations powered by AI — reducing adverse drug reactions.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.SLOW, delay: ANIMATION_DELAYS.SLOW }}
          className="flex flex-col items-center gap-4 sm:flex-row"
        >
          <Link to="/dashboard">
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2 px-8 text-base">
              <Upload className="h-5 w-5" />
              Upload VCF &amp; Analyze
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline" className="gap-2 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 px-8 text-base">
              Explore Features
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.SLOW, delay: 0.5 }}
          className="mt-20 grid grid-cols-2 gap-6 md:grid-cols-4"
        >
          {[
            { value: "100K+", label: "ADR Deaths/Year Preventable" },
            { value: "6", label: "Key PGx Genes Analyzed" },
            { value: "CPIC", label: "Guideline Aligned" },
            { value: "AI", label: "LLM-Powered Explanations" },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 px-6 py-4 backdrop-blur-sm"
            >
              <div className="font-display text-2xl font-bold text-secondary">{stat.value}</div>
              <div className="mt-1 text-xs text-primary-foreground/60">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
