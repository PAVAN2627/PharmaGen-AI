import { Dna } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-muted/30 py-12">
    <div className="container mx-auto px-4">
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Dna className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-sm font-bold text-foreground">
            PharmaGen <span className="text-secondary">AI</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2026 PharmaGen AI — AI-Powered Pharmacogenomic Risk Assessment. For research &amp; educational purposes.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
