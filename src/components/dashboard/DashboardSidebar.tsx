import { useState } from "react";
import { Upload, BarChart3, Users, Home, Dna, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export type DashboardView = "upload" | "results";

interface DashboardSidebarProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  selectedPatient: string | null;
  onSelectPatient: (id: string) => void;
  patients: { id: string; patient_id: string; status: string }[];
}

const navItems = [
  { id: "upload" as const, label: "Upload VCF", icon: Upload },
  { id: "results" as const, label: "Results", icon: BarChart3 },
];

const DashboardSidebar = ({
  activeView,
  onViewChange,
  selectedPatient,
  onSelectPatient,
  patients,
}: DashboardSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        "sticky top-16 flex h-[calc(100vh-4rem)] flex-col border-r border-border bg-card/50 backdrop-blur-sm transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand area */}
      <div className="flex items-center justify-between border-b border-border px-3 py-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Dna className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-sm font-bold text-foreground">Dashboard</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                activeView === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>

        {/* Patient list when in results */}
        <AnimatePresence>
          {!collapsed && activeView === "results" && patients.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="mb-2 flex items-center gap-2 px-3">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Patients
                </span>
              </div>
              <div className="space-y-0.5">
                {patients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onSelectPatient(p.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                      selectedPatient === p.id
                        ? "bg-secondary/10 text-secondary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        p.status === "completed" ? "bg-risk-safe" : p.status === "processing" ? "bg-risk-adjust" : "bg-risk-toxic"
                      )}
                    />
                    <span className="truncate">{p.patient_id}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Bottom link */}
      <div className="border-t border-border px-2 py-3">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={collapsed ? "Home" : undefined}
        >
          <Home className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Back to Home</span>}
        </Link>
      </div>
    </motion.aside>
  );
};

export default DashboardSidebar;
