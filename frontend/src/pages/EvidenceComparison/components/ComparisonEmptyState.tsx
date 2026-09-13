import React, { useState, useEffect } from 'react';
import { 
  SplitSquareVertical, 
  Search, 
  ArrowRight, 
  Sparkles, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { api } from '../../../api/endpoints';

interface HighPriorityCase {
  project_id: string;
  project_title: string;
  district?: string;
  evidence_id: string;
  signal_type: string;
  severity: string;
  confidence: number;
  explanation: string;
  details?: {
    matched_evidence_id?: string;
    matched_project_id?: string;
    matched_project_title?: string;
    matched_district?: string;
    similarity_percentage?: number;
    similarity_method?: string;
    distance_meters?: number;
  };
}

interface ComparisonEmptyStateProps {
  initialEvidenceIdA?: string;
  onSelectPair: (idA: string, idB: string) => void;
}

export const ComparisonEmptyState: React.FC<ComparisonEmptyStateProps> = ({
  initialEvidenceIdA = '',
  onSelectPair,
}) => {
  const [inputA, setInputA] = useState(initialEvidenceIdA);
  const [inputB, setInputB] = useState('');
  const [candidatePairs, setCandidatePairs] = useState<HighPriorityCase[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);

  // Sync prop changes
  useEffect(() => {
    if (initialEvidenceIdA) {
      setInputA(initialEvidenceIdA);
    }
  }, [initialEvidenceIdA]);

  // Load high priority cases for 1-click exploration
  useEffect(() => {
    let mounted = true;
    const fetchCases = async () => {
      try {
        setIsLoadingCandidates(true);
        const data = await api.evidence.getHighPriorityCases();
        if (mounted && Array.isArray(data)) {
          // Filter cases that have valid matched_evidence_id in details
          const valid = (data as unknown as HighPriorityCase[]).filter(
            (c) => c.details && c.details.matched_evidence_id
          );
          setCandidatePairs(valid.slice(0, 8));
        }
      } catch (err) {
        console.error('Failed to load candidate pairs:', err);
      } finally {
        if (mounted) setIsLoadingCandidates(false);
      }
    };
    fetchCases();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputA.trim() && inputB.trim()) {
      onSelectPair(inputA.trim(), inputB.trim());
    }
  };

  const presetDemos = [
    {
      title: 'Demo 1: Exact SHA-256 Match',
      tag: 'Exact Binary Duplicate',
      badgeClass: 'bg-destructive/15 text-destructive border-destructive/30',
      description: 'Byte-for-byte identical photo uploaded across separate sanction records in Rajkot vs Varanasi.',
      idA: 'EV-MPL-00001-20260908165909-6290',
      idB: 'EV-MPL-00002-20260908165909-5011',
    },
    {
      title: 'Demo 2: High Perceptual Similarity',
      tag: 'Visual Similarity 99.2%',
      badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
      description: 'High perceptual hash overlap (>99%) between public works in Rajkot.',
      idA: 'EV-MPL-00001-20260908165909-6290',
      idB: 'EV-MPL-00009-20260908165909-5429',
    },
    {
      title: 'Demo 3: Cross-District Anomaly',
      tag: 'Spatial Offset >700km',
      badgeClass: 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30',
      description: 'Perceptual match across separate districts (Jaipur vs Rajkot) separated by 710 kilometers.',
      idA: 'EV-MPL-00025-20260908165910-9625',
      idB: 'EV-MPL-00009-20260908165909-5429',
    },
  ];

  return (
    <div className="space-y-6 py-2">
      {/* 1. Header Banner */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-background p-6 shadow-xs">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Dual-Record Forensic Comparison</span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Compare Evidence Files Side-by-Side
          </h2>

          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            Select any two evidence artifacts to evaluate cryptographic identity (SHA-256), perceptual visual similarity (pHash, dHash, aHash), spatial separation, and temporal consistency across MPLADS project records.
          </p>

          {/* If single item passed, alert the auditor */}
          {initialEvidenceIdA && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-foreground flex items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-primary">Exhibit A Selected: </span>
                <span className="font-mono text-muted-foreground">{initialEvidenceIdA}</span>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Now provide Exhibit B below or click any of the flagged candidate pairs.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Direct Input Form */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-primary" />
          <span>Manual Evidence ID Comparison</span>
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5 space-y-1">
            <label className="text-xs font-medium text-foreground">Exhibit A ID (Reference)</label>
            <input
              type="text"
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              placeholder="e.g. EV-MPL-00001-20260908165909-6290"
              className="w-full px-3 py-2 text-xs font-mono bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              required
            />
          </div>

          <div className="md:col-span-5 space-y-1">
            <label className="text-xs font-medium text-foreground">Exhibit B ID (Comparison Subject)</label>
            <input
              type="text"
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              placeholder="e.g. EV-MPL-00009-20260908165909-5429"
              className="w-full px-3 py-2 text-xs font-mono bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              required
            />
          </div>

          <div className="md:col-span-2">
            <Button
              type="submit"
              variant="primary"
              disabled={!inputA.trim() || !inputB.trim()}
              className="w-full text-xs font-semibold py-2 flex items-center justify-center gap-1.5"
            >
              <span>Compare Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </form>
      </div>

      {/* 3. Demo / Pre-Configured Benchmark Pairs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Recommended Forensic Verification Pairs (Live Demos)</span>
          </h3>
          <span className="text-[11px] text-muted-foreground">Click to load instantly</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presetDemos.map((demo, idx) => (
            <div
              key={idx}
              className="bg-card border border-border hover:border-primary/50 transition-all rounded-xl p-4 flex flex-col justify-between space-y-3 group shadow-xs cursor-pointer"
              onClick={() => onSelectPair(demo.idA, demo.idB)}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${demo.badgeClass}`}>
                    {demo.tag}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  {demo.title}
                </h4>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {demo.description}
                </p>
              </div>

              <div className="pt-2 border-t border-border/60 text-[10px] font-mono text-muted-foreground/80 truncate">
                {demo.idA.substring(0, 16)}... ⇄ {demo.idB.substring(0, 16)}...
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. High Priority Flagged Candidate Pairs from API */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Flagged Evidence Reuse Candidate Pairs</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live anomaly detection cases flagged for high perceptual similarity or cryptographic duplicate signatures.
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted">
            {candidatePairs.length} Cases Available
          </span>
        </div>

        {isLoadingCandidates ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading flagged candidate pairs...</span>
          </div>
        ) : candidatePairs.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No pending candidate pairs detected in current database.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {candidatePairs.map((c, idx) => {
              const matchedId = c.details?.matched_evidence_id || '';
              const simPercent = c.details?.similarity_percentage ?? c.confidence;
              const dist = c.details?.distance_meters;

              return (
                <div
                  key={idx}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 px-2 rounded-lg transition-colors"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {c.project_id} ⇄ {c.details?.matched_project_id || 'Peer Project'}
                      </span>
                      <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        {simPercent.toFixed(1)}% Similarity
                      </span>
                      {dist !== undefined && dist > 50000 && (
                        <span className="px-1.5 py-0.2 text-[10px] font-medium rounded bg-destructive/10 text-destructive">
                          {(dist / 1000).toFixed(0)} km Separation
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {c.project_title}
                    </p>
                    <div className="text-[11px] font-mono text-muted-foreground/70 flex items-center gap-2">
                      <span>{c.evidence_id}</span>
                      <span>⇄</span>
                      <span>{matchedId}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectPair(c.evidence_id, matchedId)}
                    className="text-xs font-semibold shrink-0 flex items-center gap-1 hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    <span>Inspect Pair</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
