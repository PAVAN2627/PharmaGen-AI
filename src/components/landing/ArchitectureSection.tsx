import { motion } from "framer-motion";

const steps = [
  { label: "Frontend (React)", color: "primary" },
  { label: "Backend API", color: "primary" },
  { label: "VCF Parser Engine", color: "secondary" },
  { label: "Pharmacogenomic Engine", color: "secondary" },
  { label: "Risk Prediction Engine", color: "secondary" },
  { label: "CPIC Recommendations", color: "primary" },
  { label: "LLM Explanation Generator", color: "accent" },
  { label: "Structured JSON Output", color: "primary" },
];

const ArchitectureSection = () => {
  return (
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <span className="mb-3 inline-block rounded-full bg-secondary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary">
            System Architecture
          </span>
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            End-to-End Processing Pipeline
          </h2>
        </motion.div>

        <div className="mx-auto flex max-w-md flex-col items-center">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="glass-card w-72 px-5 py-3.5 text-center font-display text-sm font-semibold text-foreground">
                {step.label}
              </div>
              {i < steps.length - 1 && (
                <div className="flow-line my-1 h-8 w-0.5 rounded-full" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ArchitectureSection;
