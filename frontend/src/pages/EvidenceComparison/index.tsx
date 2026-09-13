import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { api } from '../../api/endpoints';
import type { EvidenceComparisonResponse } from '../../types/evidence';

// Subcomponents
import { ComparisonHeader } from './components/ComparisonHeader';
import { ComparisonVerdictBar } from './components/ComparisonVerdictBar';
import { DualEvidencePanels } from './components/DualEvidencePanels';
import { ComparisonLedgerTable } from './components/ComparisonLedgerTable';
import { ComparisonTechnicalDrawer } from './components/ComparisonTechnicalDrawer';
import { AuditorActionPanel } from './components/AuditorActionPanel';
import { ComparisonEmptyState } from './components/ComparisonEmptyState';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const EvidenceComparisonPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query parameters supporting both naming conventions
  const rawIdA = searchParams.get('evidenceA') || searchParams.get('evidence_id_a') || '';
  const rawIdB = searchParams.get('evidenceB') || searchParams.get('evidence_id_b') || '';

  const [evidenceIdA, setEvidenceIdA] = useState<string>(rawIdA);
  const [evidenceIdB, setEvidenceIdB] = useState<string>(rawIdB);

  const [comparisonData, setComparisonData] = useState<EvidenceComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize internal state with URL parameters
  useEffect(() => {
    setEvidenceIdA(rawIdA);
    setEvidenceIdB(rawIdB);
  }, [rawIdA, rawIdB]);

  // Execute comparison API call
  const performComparison = useCallback(async (idA: string, idB: string) => {
    if (!idA.trim() || !idB.trim()) {
      setComparisonData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.evidence.compare({
        evidence_id_a: idA.trim(),
        evidence_id_b: idB.trim(),
      });

      if (response && response.similarity_analysis) {
        setComparisonData(response);
      } else {
        throw new Error('Incomplete response received from evidence comparator API.');
      }
    } catch (err: unknown) {
      console.error('Evidence comparison error:', err);
      const msg = err instanceof Error ? err.message : 'Unable to complete forensic evidence comparison.';
      setError(msg);
      setComparisonData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch comparison whenever both IDs are set in URL
  useEffect(() => {
    if (evidenceIdA && evidenceIdB) {
      performComparison(evidenceIdA, evidenceIdB);
    } else {
      setComparisonData(null);
    }
  }, [evidenceIdA, evidenceIdB, performComparison]);

  // Handler for comparing a new pair
  const handleCompare = (idA: string, idB: string) => {
    setSearchParams({ evidenceA: idA, evidenceB: idB });
  };

  // Handler for swapping Exhibit A and Exhibit B
  const handleSwap = () => {
    if (evidenceIdA && evidenceIdB) {
      setSearchParams({ evidenceA: evidenceIdB, evidenceB: evidenceIdA });
    }
  };

  // Handler for resetting comparison
  const handleReset = () => {
    setSearchParams({});
    setComparisonData(null);
    setError(null);
  };

  const hasActiveComparison = Boolean(comparisonData && !isLoading);

  return (
    <PageContainer
      title="Forensic Evidence Comparator"
      description="Dual-pane side-by-side inspection of photographic proof, perceptual similarity metrics, and EXIF consistency across sanction records."
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <ComparisonHeader
          evidenceIdA={evidenceIdA}
          evidenceIdB={evidenceIdB}
          onCompare={handleCompare}
          onSwap={handleSwap}
          onReset={handleReset}
          isLoading={isLoading}
          hasActiveComparison={hasActiveComparison}
        />

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold">Comparison Inspection Failed</h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  {error}. Please verify that both Evidence IDs exist in the database and have photographic artifacts uploaded.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => performComparison(evidenceIdA, evidenceIdB)}
                className="text-xs flex items-center gap-1 bg-background"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </Button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-card border border-border rounded-xl">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="text-center space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Computing Forensic Comparison</h4>
              <p className="text-xs text-muted-foreground">
                Evaluating SHA-256 binary hash, calculating perceptual DCT and gradient hashes, and verifying EXIF spatial-temporal metadata...
              </p>
            </div>
          </div>
        )}

        {/* Active Comparison Workspace */}
        {!isLoading && comparisonData && comparisonData.evidence_a && comparisonData.evidence_b && (
          <div className="space-y-6">
            {/* Level 1: Primary Verdict & 4 Forensic KPI Cards */}
            <ComparisonVerdictBar
              similarityAnalysis={comparisonData.similarity_analysis}
              consistencySummary={comparisonData.consistency_summary}
              evidenceA={comparisonData.evidence_a}
              evidenceB={comparisonData.evidence_b}
            />

            {/* Level 2: Dual Exhibit Image & HUD Panels */}
            <DualEvidencePanels
              evidenceA={comparisonData.evidence_a}
              evidenceB={comparisonData.evidence_b}
              isExactHashMatch={comparisonData.similarity_analysis.sha256_match}
            />

            {/* Level 3: Forensic Metadata Ledger Table */}
            <ComparisonLedgerTable
              evidenceA={comparisonData.evidence_a}
              evidenceB={comparisonData.evidence_b}
              similarityAnalysis={comparisonData.similarity_analysis}
            />

            {/* Level 4: Progressive Disclosure Algorithmic Details */}
            <ComparisonTechnicalDrawer
              similarityAnalysis={comparisonData.similarity_analysis}
            />

            {/* Level 5: Auditor Case Workflow & Decision Actions */}
            <AuditorActionPanel
              evidenceA={comparisonData.evidence_a}
              evidenceB={comparisonData.evidence_b}
              similarityAnalysis={comparisonData.similarity_analysis}
              consistencySummary={comparisonData.consistency_summary}
            />
          </div>
        )}

        {/* Empty / Selection State */}
        {!isLoading && !comparisonData && !error && (
          <ComparisonEmptyState
            initialEvidenceIdA={evidenceIdA}
            onSelectPair={handleCompare}
          />
        )}
      </div>
    </PageContainer>
  );
};

export default EvidenceComparisonPage;
