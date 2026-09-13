import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { api } from '../../../api/endpoints';
import type { CopilotBriefResponse } from '../../../types/project';
import { 
  Bot, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ShieldCheck, 
  ChevronRight, 
  ChevronDown,
  BookOpen,
  Search,
  RefreshCw
} from 'lucide-react';

interface InvestigationCopilotSectionProps {
  projectId: string;
}

const PRESET_QUERIES = [
  'Why was this project prioritized?',
  'Compare with contractor history.',
  'What changed from previous analysis?',
  'What similar projects exist?',
  'What evidence is missing?',
  'What should the auditor verify next?',
];

export const InvestigationCopilotSection: React.FC<InvestigationCopilotSectionProps> = ({
  projectId,
}) => {
  const [brief, setBrief] = useState<CopilotBriefResponse | null>(null);
  const [activeQuery, setActiveQuery] = useState<string>('');
  const [customQuery, setCustomQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuidelineSources, setShowGuidelineSources] = useState<boolean>(false);

  const runQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setActiveQuery(queryText);
    setLoading(true);
    setError(null);

    try {
      const res = await api.copilot.run(projectId, queryText);
      setBrief(res);
    } catch (err: unknown) {
      console.error('Copilot query error:', err);
      const msg = err instanceof Error ? err.message : 'Unable to synthesize investigation brief.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (q: string) => {
    runQuery(q);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customQuery.trim()) {
      runQuery(customQuery.trim());
      setCustomQuery('');
    }
  };

  return (
    <Card hoverElevate className="border border-primary/30 bg-surface shadow-xs">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold tracking-wide text-foreground">
                  INVESTIGATION COPILOT
                </CardTitle>
                <Badge variant="primary" size="sm" className="font-mono">
                  {projectId}
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Grounded AI audit brief synthesizing multi-modal signals, contractor baselines, and statutory guidelines.
              </CardDescription>
            </div>
          </div>

          <Badge variant="neutral" size="sm" className="text-[11px]">
            Controlled Audit Decision Support
          </Badge>
        </div>
      </CardHeader>

      <div className="p-4 space-y-4">
        {/* Preset Query Chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Suggested Auditor Inquiries
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_QUERIES.map((q) => {
              const isActive = activeQuery === q;
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => handlePresetClick(q)}
                  disabled={loading}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary font-medium shadow-xs'
                      : 'bg-surface-muted/60 text-foreground border-border/60 hover:bg-surface-muted hover:border-primary/40'
                  }`}
                >
                  {q}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Input Form */}
        <form onSubmit={handleCustomSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Ask Copilot a specific audit question about this work..."
              disabled={loading}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg bg-surface-muted/50 border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary/80 transition-colors"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={loading || !customQuery.trim()}
            leftIcon={loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          >
            Ask Copilot
          </Button>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="p-6 rounded-lg bg-surface-muted/30 border border-border/40 text-center space-y-2 animate-pulse">
            <Bot className="w-6 h-6 text-primary mx-auto animate-bounce" />
            <p className="text-xs font-medium text-foreground">
              Synthesizing evidence, contractor baseline, and regulatory corpus...
            </p>
            <p className="text-[11px] text-muted-foreground">
              Formulating objective factual brief for query &quot;{activeQuery}&quot;
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Copilot Service Notice</span>
              <span>{error} The main project investigation dossier remains fully operational.</span>
            </div>
          </div>
        )}

        {/* Synthesized Brief Result */}
        {brief && !loading && (
          <div className="space-y-4 pt-2 border-t border-border/40">
            {/* Active Query Banner */}
            <div className="flex items-center justify-between text-xs p-2 rounded-md bg-primary/10 border border-primary/20">
              <span className="font-semibold text-primary">Inquiry: &quot;{brief.query}&quot;</span>
              <span className="text-[11px] font-mono text-muted-foreground">
                Priority: {brief.audit_priority_score.toFixed(1)}/100 ({brief.priority_level})
              </span>
            </div>

            {/* Factual Distinction: OBSERVED DATA */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Observed Data (Verified Backend Facts)</span>
              </div>
              <ul className="space-y-1.5 pl-1">
                {brief.observations.map((obs, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{obs}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Supporting Signals */}
            {brief.supporting_signals?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Supporting Analytical Signals</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {brief.supporting_signals.map((sig, idx) => {
                    const isObj = typeof sig === 'object' && sig !== null;
                    const reason = isObj ? sig.reason : String(sig);
                    const domain = isObj ? sig.domain : null;
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-md bg-surface-muted/40 border border-border/40 text-xs space-y-1"
                      >
                        {domain && (
                          <Badge variant="neutral" size="sm" className="text-[10px] uppercase">
                            {domain}
                          </Badge>
                        )}
                        <p className="text-muted-foreground leading-relaxed">{reason}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Data Gaps & Uncertainties */}
            {brief.data_gaps_and_uncertainties?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Data Gaps &amp; Uncertainties</span>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
                  {brief.data_gaps_and_uncertainties.map((gap, idx) => (
                    <div key={idx} className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{gap}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grounded Guidelines (RAG) */}
            {brief.grounded_guideline_clauses?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Relevant Guideline Context</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGuidelineSources(!showGuidelineSources)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showGuidelineSources ? 'Hide sources' : 'View sources'}
                    {showGuidelineSources ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                </div>

                {showGuidelineSources ? (
                  <div className="space-y-2">
                    {brief.grounded_guideline_clauses.map((clause) => (
                      <div
                        key={clause.clause_id}
                        className="p-3 rounded-lg bg-surface-muted/50 border border-border/40 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold font-mono text-primary">
                            {clause.clause_id}: {clause.title}
                          </span>
                          <Badge variant="neutral" size="sm">
                            {clause.category}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{clause.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-surface-muted/30 border border-border/30 text-xs text-muted-foreground">
                    Grounded against {brief.grounded_guideline_clauses.length} official MPLADS Guideline clauses: {' '}
                    <span className="font-mono text-foreground">
                      {brief.grounded_guideline_clauses.map((c) => c.clause_id).join(', ')}
                    </span>. Click &quot;View sources&quot; for complete text.
                  </div>
                )}
              </div>
            )}

            {/* Recommended Next Checks */}
            {brief.recommended_next_checks?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  <span>Recommended Next Investigative Checks</span>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                  {brief.recommended_next_checks.map((check, idx) => (
                    <div key={idx} className="text-xs text-foreground flex items-start gap-2">
                      <span className="font-mono font-bold text-primary">{idx + 1}.</span>
                      <span className="leading-relaxed">{check}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legal / Non-Accusatory Disclaimer */}
            <div className="p-2 rounded-md bg-surface-muted/30 border border-border/30 text-[10px] text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-primary/70 shrink-0 mt-0.5" />
              <span>{brief.disclaimer}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
