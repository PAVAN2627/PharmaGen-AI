import { motion } from "framer-motion";
import {
  FileText, Dna, AlertTriangle, BookOpen, Brain, ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "VCF Parsing Engine",
    desc: "Upload standard VCF v4.2 files. Automatically extracts chromosome, rsID, gene names, and star alleles across 6 key pharmacogenomic genes.",
  },
  {
    icon: Dna,
    title: "Pharmacogenomic Interpretation",
    desc: "Maps genetic variants to diplotypes and phenotypes (PM, IM, NM, RM, URM) for drugs like Codeine, Warfarin, and Simvastatin.",
  },
  {
    icon: AlertTriangle,
    title: "Risk Prediction Engine",
    desc: "Classifies drug-gene interactions as Safe, Adjust Dosage, Toxic, or Ineffective with confidence scores and severity levels.",
  },
  {
    icon: BookOpen,
    title: "CPIC Recommendations",
    desc: "Generates CPIC-guideline-aligned dosage recommendations, alternative drugs, and clinical monitoring advice.",
  },
  {
    icon: Brain,
    title: "LLM Explanations",
    desc: "AI-generated biological mechanism explanations, variant interpretations, and clinical impact summaries for every result.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy & Compliance",
    desc: "No patient data retention. In-memory processing only with GDPR/HIPAA-ready architecture. Your data stays yours.",
  },
];

const container = {
  hidden: {},
  show: { 
    transition: { 
      staggerChildren: 0.12,
      delayChildren: 0.2,
    } 
  },
};

const item = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.9,
    rotateY: -10
  },
  show: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    rotateY: 0,
    transition: { 
      duration: 0.6,
      type: "spring",
      stiffness: 100,
      damping: 15,
    } 
  },
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            Core Modules
          </span>
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Comprehensive Pharmacogenomic Pipeline
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            From VCF file upload to AI-powered clinical insights — every step is automated, validated, and aligned with CPIC guidelines.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              variants={item}
              whileHover={{
                y: -8,
                boxShadow: "0 20px 40px rgba(99, 102, 241, 0.15)",
                transition: { duration: 0.3 }
              }}
              className="glass-card group relative overflow-hidden p-6 transition-all duration-300 cursor-pointer"
            >
              {/* Animated background glow on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-primary/0 opacity-0 group-hover:opacity-5"
                animate={{
                  backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              />

              <motion.div
                className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground"
                whileHover={{
                  scale: 1.15,
                  rotate: 10,
                }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 10,
                }}
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <f.icon className="h-6 w-6" />
                </motion.div>
              </motion.div>

              <motion.h3
                className="relative mb-2 font-display text-lg font-semibold text-foreground"
                whileHover={{ x: 4 }}
                transition={{ duration: 0.2 }}
              >
                {f.title}
              </motion.h3>

              <motion.p
                className="relative text-sm leading-relaxed text-muted-foreground"
                whileHover={{ color: "var(--foreground)" }}
                transition={{ duration: 0.2 }}
              >
                {f.desc}
              </motion.p>

              {/* Bottom accent line */}
              <motion.div
                className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-primary to-secondary group-hover:w-full"
                transition={{ duration: 0.4 }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
