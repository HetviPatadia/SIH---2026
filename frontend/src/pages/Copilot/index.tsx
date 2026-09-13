import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api } from '../../api/endpoints';
import type { CopilotBriefResponse, ProjectItem } from '../../types/project';
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
  ExternalLink
} from 'lucide-react';

const PRESET_QUERIES = [
  'Why was this project prioritized?',
  'Compare with contractor history.',
  'What changed from previous analysis?',
  'What similar projects exist?',
  'What evidence is missing?',
  'What should the auditor verify next?',
];

export const CopilotWorkspacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryProjectId = searchParams.get('projectId') || '';

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(queryProjectId);

  const [brief, setBrief] = useState<CopilotBriefResponse | null>(null);
  const [activeQuery, setActiveQuery] = useState<string>('');
  const [customQuery, setCustomQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuidelineSources, setShowGuidelineSources] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const res = await api.projects.list({ page: 1, page_size: 50, priority: 'CRITICAL,HIGH' });
        if (isMounted && res.items) {
          setProjects(res.items);
          if (!queryProjectId && res.items.length > 0) {
            setSelectedProjectId(res.items[0].project_id);
            setSearchParams({ projectId: res.items[0].project_id });
          }
        }
      } catch (err) {
        console.error('Failed to load projects for copilot:', err);
      } finally {
        if (isMounted) setLoadingProjects(false);
      }
    };

    fetchProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (queryProjectId && queryProjectId !== selectedProjectId) {
      setSelectedProjectId(queryProjectId);
    }
  }, [queryProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    runQuery(PRESET_QUERIES[0]);
  }, [selectedProjectId]);

  const runQuery = async (queryText: string) => {
    if (!queryText.trim() || !selectedProjectId) return;
    setActiveQuery(queryText);
    setLoading(true);
    setError(null);

    try {
      const res = await api.copilot.run(selectedProjectId, queryText);
      setBrief(res);
    } catch (err: unknown) {
      console.error('Copilot query error:', err);
      const msg = err instanceof Error ? err.message : 'Unable to synthesize investigation brief.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customQuery.trim()) {
      runQuery(customQuery.trim());
      setCustomQuery('');
    }
  };

  const selectProject = (id: string) => {
    setSelectedProjectId(id);
    setSearchParams({ projectId: id });
  };

  const selectedProject = projects.find((p) => p.project_id === selectedProjectId);

  return (
    <PageContainer
      title="AI Audit Copilot"
      description="Interactive conversational workspace synthesizing multi-modal signals, contractor baselines, and grounded statutory MPLADS guidelines."
      actions={
        <Badge variant="primary" size="sm">
          DECISION SUPPORT AGENT
        </Badge>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Projects Target Selector */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border border-border/80 bg-surface shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">TARGET AUDIT FILE</CardTitle>
                </div>
                <Badge variant="primary" size="sm">
                  {projects.length} Flagged
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Select a high-priority case to engage the AI Audit Copilot.
              </CardDescription>
            </CardHeader>

            <div className="p-2 divide-y divide-border/40 max-h-[580px] overflow-y-auto">
              {loadingProjects ? (
                <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">
                  Loading high-priority project files...
                </div>
              ) : (
                projects.map((p) => {
                  const isSelected = p.project_id === selectedProjectId;
                  return (
                    <button
                      key={p.project_id}
                      onClick={() => selectProject(p.project_id)}
                      className={`w-full text-left p-2.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'bg-primary/10 text-primary border border-primary/30 font-medium'
                          : 'hover:bg-surface-muted text-foreground'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-mono font-semibold text-[11px] truncate flex items-center gap-2">
                          <span>{p.project_id}</span>
                          <span className="text-[10px] text-muted-foreground font-sans">
                            {p.district}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {p.description || p.project_id}
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-primary translate-x-0.5' : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Interactive Copilot Workspace */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border border-primary/30 bg-surface shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold text-foreground">
                        AUDIT COPILOT WORKSPACE
                      </CardTitle>
                      {selectedProjectId && (
                        <Badge variant="primary" size="sm" className="font-mono">
                          {selectedProjectId}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs text-muted-foreground">
                      {selectedProject ? (selectedProject.description || selectedProject.project_id) : 'Active Case File Inquiry'}
                    </CardDescription>
                  </div>
                </div>

                {selectedProjectId && (
                  <Link to={`/projects/${selectedProjectId}`}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Dossier
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>

            <div className="p-4 space-y-5">
              {/* Presets Grid */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>PRESET AUDIT INQUIRIES</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_QUERIES.map((q) => {
                    const isSelected = activeQuery === q;
                    return (
                      <button
                        key={q}
                        onClick={() => runQuery(q)}
                        disabled={loading}
                        className={`text-left p-2 rounded border text-xs transition-colors flex items-start gap-1.5 ${
                          isSelected
                            ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                            : 'border-border/60 hover:bg-surface-muted text-foreground'
                        }`}
                      >
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="line-clamp-2">{q}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Free-form Input */}
              <form onSubmit={handleCustomSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a specific investigation question (e.g. Is this cost consistent with peer sanctions?)..."
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  disabled={loading}
                  className="flex-1 px-3 py-2 text-xs bg-surface-muted/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
                <Button type="submit" variant="primary" size="sm" disabled={loading || !customQuery.trim()} className="gap-1.5 shrink-0">
                  <Send className="w-3.5 h-3.5" />
                  <span>Inquire</span>
                </Button>
              </form>

              {/* Copilot Response Section */}
              {loading ? (
                <div className="p-8 text-center border border-border/60 rounded-lg bg-surface-muted/20 animate-pulse space-y-2">
                  <Bot className="w-6 h-6 text-primary mx-auto animate-bounce" />
                  <div className="text-xs font-semibold text-foreground">
                    Synthesizing Audit Intelligence...
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Querying multi-modal signals, contractor baselines, and statutory guideline clauses...
                  </div>
                </div>
              ) : error ? (
                <div className="p-4 rounded-lg border border-danger/30 bg-danger/5 text-danger text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : brief ? (
                <div className="space-y-4">
                  {/* Synthesis Header */}
                  <div className="p-3.5 rounded-lg border border-border/60 bg-surface-muted/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-muted-foreground block">
                        Query Inquired
                      </span>
                      <div className="text-xs font-semibold text-foreground mt-0.5">
                        "{brief.query}"
                      </div>
                    </div>
                    <Badge
                      variant={brief.priority_level === 'CRITICAL' ? 'danger' : 'neutral'}
                      size="sm"
                      className="font-mono"
                    >
                      Priority: {brief.audit_priority_score} ({brief.priority_level})
                    </Badge>
                  </div>

                  {/* Observations */}
                  {brief.observations && brief.observations.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-mono font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span>SYNTHESIZED AUDIT OBSERVATIONS</span>
                      </div>
                      <div className="space-y-2">
                        {brief.observations.map((obs, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-md border border-border/60 bg-surface text-xs text-foreground leading-relaxed flex items-start gap-2.5"
                          >
                            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{obs}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Next Checks */}
                  {brief.recommended_next_checks && brief.recommended_next_checks.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-mono font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-success" />
                        <span>RECOMMENDED AUDITOR NEXT CHECKS</span>
                      </div>
                      <div className="p-3.5 rounded-md border border-success/30 bg-success/5 space-y-2">
                        {brief.recommended_next_checks.map((check, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                            <span>{check}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grounded Guidelines */}
                  {brief.grounded_guideline_clauses && brief.grounded_guideline_clauses.length > 0 && (
                    <div className="border border-border/60 rounded-md overflow-hidden bg-surface">
                      <button
                        onClick={() => setShowGuidelineSources(!showGuidelineSources)}
                        className="w-full p-3 flex items-center justify-between text-left hover:bg-surface-muted text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-foreground">
                            Statutory Guideline Citations ({brief.grounded_guideline_clauses.length} Grounded Clauses)
                          </span>
                        </div>
                        {showGuidelineSources ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      {showGuidelineSources && (
                        <div className="p-3 pt-0 border-t border-border/40 divide-y divide-border/40 space-y-3">
                          {brief.grounded_guideline_clauses.map((clause) => (
                            <div key={clause.clause_id} className="pt-3 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-semibold text-primary">
                                  Clause {clause.clause_id}: {clause.title}
                                </span>
                                <Badge variant="neutral" size="sm">
                                  {clause.category}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground leading-relaxed text-[11px] bg-surface-muted/30 p-2 rounded">
                                {clause.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Disclaimer */}
                  {brief.disclaimer && (
                    <div className="text-[10px] text-muted-foreground border-t border-border/40 pt-3 italic">
                      {brief.disclaimer}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};

export default CopilotWorkspacePage;
