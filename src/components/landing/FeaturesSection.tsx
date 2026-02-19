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
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
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
              className="glass-card group p-6"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
