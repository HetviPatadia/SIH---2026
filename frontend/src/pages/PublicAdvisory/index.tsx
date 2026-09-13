import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import {
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Lock,
  Globe2,
  FileCheck2
} from 'lucide-react';

export const PublicAdvisoryPage: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between select-none">
      {/* Top Bar */}
      <header className="h-14 px-6 border-b border-border bg-surface/80 backdrop-blur-md flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Return to Overview</span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Advisory Box */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg space-y-4">
          <Card className="p-6 sm:p-8 border-border bg-surface-elevated shadow-xl space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-warning/10 border border-warning/30 text-warning mx-auto flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold px-2 py-0.5 rounded bg-surface-muted border border-border">
                Access Advisory &middot; Institutional Decision-Support
              </span>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Restricted Supervisory System
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                The <strong className="text-foreground">MPLADS Audit Intelligence Platform</strong> is an internal decision-support and evidence verification environment designed for authorized district audit officers, technical examiners, and state vigilance divisions.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-surface-muted/50 text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Lock className="w-4 h-4 text-primary" />
                <span>Auditor-Only Workspace Protocols</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Project risk scores, perceptual cross-project photo reuse matches, and contractor network topologies are accessible exclusively to credentialed evaluators to ensure due process and administrative fairness.
              </p>
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span className="flex items-center gap-1">
                  <Globe2 className="w-3.5 h-3.5 text-primary" />
                  Public Portal: In Development
                </span>
                <span className="flex items-center gap-1">
                  <FileCheck2 className="w-3.5 h-3.5 text-success" />
                  Auditor Workspace: Active
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link to="/auditor/login" className="w-full sm:w-auto">
                <Button
                  size="md"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full sm:w-auto text-xs font-semibold h-10 px-6"
                >
                  Auditor Sign In
                </Button>
              </Link>
              <Link to="/" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full sm:w-auto text-xs font-semibold h-10 px-5"
                >
                  Return to Overview
                </Button>
              </Link>
            </div>
          </Card>

          <p className="text-[11px] text-center text-muted-foreground">
            Smart India Hackathon 2026 &middot; Ministry of Statistics and Programme Implementation (MoSPI)
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-6 border-t border-border bg-surface/50 text-center text-[10px] text-muted-foreground font-mono">
        MPLADS Audit Intelligence &middot; Confidential Institutional System
      </footer>
    </div>
  );
};

export default PublicAdvisoryPage;
