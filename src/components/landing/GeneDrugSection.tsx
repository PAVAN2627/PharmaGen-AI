import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const geneData = [
  { gene: "CYP2D6", drug: "Codeine", relevance: "Metabolizer status" },
  { gene: "CYP2C19", drug: "Clopidogrel", relevance: "Activation efficiency" },
  { gene: "CYP2C9", drug: "Warfarin", relevance: "Clearance rate" },
  { gene: "SLCO1B1", drug: "Simvastatin", relevance: "Myopathy risk" },
  { gene: "TPMT", drug: "Azathioprine", relevance: "Bone marrow toxicity" },
  { gene: "DPYD", drug: "Fluorouracil", relevance: "Severe toxicity risk" },
];

const GeneDrugSection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            Gene-Drug Mapping
          </span>
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Supported Pharmacogenomic Genes
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-border"
        >
          <div className="grid grid-cols-3 bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            <span>Gene</span>
            <span>Drug</span>
            <span>Clinical Relevance</span>
          </div>
          {geneData.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i }}
              className={`grid grid-cols-3 px-6 py-3.5 text-sm ${
                i % 2 === 0 ? "bg-card" : "bg-muted/50"
              }`}
            >
              <span className="font-semibold font-display text-primary">{row.gene}</span>
              <span className="text-foreground">{row.drug}</span>
              <span className="text-muted-foreground">{row.relevance}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <Link to="/dashboard">
            <Button size="lg" className="gap-2 px-8">
              Try the Dashboard Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default GeneDrugSection;
