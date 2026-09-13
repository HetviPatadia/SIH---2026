import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, DEMO_AUDITOR_EMAIL, DEMO_AUDITOR_PASSWORD } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound
} from 'lucide-react';

export const AuditorLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // If already authenticated, redirect directly to dashboard (or from origin)
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        const from =
          (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } catch {
      setError('An unexpected authentication error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail(DEMO_AUDITOR_EMAIL);
    setPassword(DEMO_AUDITOR_PASSWORD);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between select-none">
      {/* Top Bar */}
      <header className="h-14 px-6 border-b border-border bg-surface/80 backdrop-blur-md flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Landing Page</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-surface-muted border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>SESSION #SEC-AUDIT</span>
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-4">
          <Card className="p-6 sm:p-8 border-border bg-surface-elevated shadow-xl space-y-6">
            {/* Header / Institutional Branding */}
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary mx-auto flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Auditor Workspace Access
              </h1>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Restricted decision-support portal for authorized audit officers and vigilance teams.
              </p>
            </div>

            {/* SIH 2026 Evaluation Notice / Quick-Fill Card */}
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  SIH 2026 Demo Credentials
                </span>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-[11px] font-semibold text-primary hover:underline hover:text-primary-hover transition-colors"
                >
                  Quick Fill
                </button>
              </div>
              <div className="font-mono text-[11px] text-muted-foreground space-y-0.5 bg-background/60 p-2 rounded border border-border/60">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="text-foreground font-semibold">{DEMO_AUDITOR_EMAIL}</span>
                </div>
                <div className="flex justify-between">
                  <span>Password:</span>
                  <span className="text-foreground font-semibold">{DEMO_AUDITOR_PASSWORD}</span>
                </div>
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-3 rounded-lg border border-danger/40 bg-danger/10 text-danger text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Authentication Failed</p>
                  <p className="text-[11px] opacity-90">{error}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="auditor-email"
                  className="block text-xs font-semibold text-foreground uppercase tracking-wider text-[10px]"
                >
                  Auditor Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="auditor-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="auditor@mplads-demo.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-border bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="auditor-password"
                  className="block text-xs font-semibold text-foreground uppercase tracking-wider text-[10px]"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="auditor-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-9 pl-9 pr-9 text-xs rounded-md border border-border bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="md"
                disabled={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full text-xs font-semibold h-10 mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              </Button>
            </form>

            <div className="pt-2 border-t border-border text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span>Zero Trust Audit Verification Protocol</span>
              </div>
            </div>
          </Card>

          {/* Prototype Evaluation Disclaimer */}
          <p className="text-[11px] text-center text-muted-foreground leading-relaxed px-4">
            Fictional prototype account for Smart India Hackathon 2026. This system provides
            explainable anomaly indicators for human audit review.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-6 border-t border-border bg-surface/50 text-center text-[10px] text-muted-foreground font-mono">
        MPLADS Audit Intelligence &middot; AI-Assisted Evidence Verification &middot; SIH26102
      </footer>
    </div>
  );
};

export default AuditorLoginPage;
