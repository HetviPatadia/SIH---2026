import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { api } from '../../../api/endpoints';
import type { CostContextResponse } from '../../../types/project';
import { IndianRupee, Scale, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface CostContextSectionProps {
  projectId: string;
  sanctionedAmount?: number;
}

export const CostContextSection: React.FC<CostContextSectionProps> = ({
  projectId,
  sanctionedAmount,
}) => {
  const [costData, setCostData] = useState<CostContextResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [unavailable, setUnavailable] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCostContext = async () => {
      setLoading(true);
      try {
        const data = await api.projects.getCostContext(projectId);
        if (isMounted) {
          setCostData(data);
          setUnavailable(false);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Price context lookup note:', err);
          setUnavailable(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCostContext();
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return 'N/A';
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${val.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Card className="border border-border/80 bg-surface animate-pulse">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-44 bg-surface-muted rounded" />
            <div className="h-4 w-24 bg-surface-muted rounded" />
          </div>
        </CardHeader>
        <div className="p-4 pt-0 space-y-3">
          <div className="h-16 bg-surface-muted rounded" />
        </div>
      </Card>
    );
  }

  if (unavailable || !costData) {
    return (
      <Card hoverElevate className="border border-border/80 bg-surface">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold tracking-wide">
                PRICE-AWARE COST CONTEXT
              </CardTitle>
            </div>
            <Badge variant="neutral" size="sm">Price adjustment unavailable</Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Cost evaluation normalized against regional price indices.
          </CardDescription>
        </CardHeader>
        <div className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground/70 shrink-0" />
          <span>
            Official price index adjustment unavailable for this project sanction year. Comparing strictly against unadjusted sector averages.
          </span>
        </div>
      </Card>
    );
  }

  const { normalization, deviation_evaluation, observed_cost } = costData;
  const isAdjusted = normalization?.is_adjusted;
  const devSignal = deviation_evaluation?.signal || 'WITHIN_EXPECTATION';
  const devRatio = deviation_evaluation?.ratio_to_peer;

  // Semantic audit terminology
  const getStatusBadge = () => {
    if (!isAdjusted) {
      return <Badge variant="neutral" size="sm">Price adjustment unavailable</Badge>;
    }
    if (devSignal === 'ABOVE_ADJUSTED_RANGE') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3" />
          Above adjusted peer expectation
        </span>
      );
    }
    if (devSignal === 'BELOW_ADJUSTED_RANGE') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
          <Info className="w-3 h-3" />
          Below adjusted peer expectation
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" />
        Within peer expectation
      </span>
    );
  };

  return (
    <Card hoverElevate className="border border-border/80 bg-surface shadow-xs">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-foreground">
                  COST CONTEXT (PRICE-ADJUSTED)
                </CardTitle>
                {getStatusBadge()}
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Sanctioned baseline normalized against official CPI/WPI deflation indices.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <div className="p-4 space-y-4">
        {/* Core Financial Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-surface-muted/50 border border-border/40">
            <span className="text-xs text-muted-foreground block mb-1">Observed Cost</span>
            <span className="text-base font-bold font-mono text-foreground">
              {formatCurrency(observed_cost || sanctionedAmount)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Sanctioned administrative amount
            </span>
          </div>

          <div className="p-3 rounded-lg bg-surface-muted/50 border border-border/40">
            <span className="text-xs text-muted-foreground block mb-1">Expected Adjusted Range</span>
            <span className="text-base font-bold font-mono text-foreground">
              {formatCurrency(deviation_evaluation?.expected_range_min || normalization?.expected_min)} – {formatCurrency(deviation_evaluation?.expected_range_max || normalization?.expected_max)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Adjusted peer median: {formatCurrency(deviation_evaluation?.adjusted_peer_median)}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-surface-muted/50 border border-border/40">
            <span className="text-xs text-muted-foreground block mb-1">Deviation Evaluation</span>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold font-mono text-foreground">
                {devRatio ? `${devRatio.toFixed(2)}x` : '1.00x'}
              </span>
              {deviation_evaluation?.deviation_percentage !== undefined && (
                <span className={`text-xs font-mono font-medium ${deviation_evaluation.deviation_percentage > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                  {deviation_evaluation.deviation_percentage > 0 ? '+' : ''}
                  {deviation_evaluation.deviation_percentage.toFixed(1)}%
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Peer ratio comparison
            </span>
          </div>
        </div>

        {/* Methodology & Provenance Details */}
        {isAdjusted && normalization?.provenance && (
          <div className="p-3 rounded-lg bg-surface-muted/30 border border-border/40 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <span className="font-semibold text-foreground">Price Normalization Provenance</span>
              <span className="font-mono text-primary">
                Factor: {normalization.adjustment_factor?.toFixed(4) || '1.0000'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {normalization.reason}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground font-mono">
              <span>Source: {normalization.provenance.source || 'Ministry of Commerce & Industry (DPIIT) WPI'}</span>
              <span>• Base Year: {normalization.provenance.base_year || 2024}</span>
              {normalization.provenance.version && <span>• {normalization.provenance.version}</span>}
            </div>
          </div>
        )}

        {/* Audit Guidance Note */}
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="w-3.5 h-3.5 text-primary/80 shrink-0 mt-0.5" />
          <span>
            {deviation_evaluation?.reason ||
              'Cost context evaluates whether project expenditure aligns with inflation-adjusted peer works in the same sector. Deviations warrant verification of technical item-rate estimates.'}
          </span>
        </div>
      </div>
    </Card>
  );
};
