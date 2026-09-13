import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import type { RiskExplanationResponse } from '../../../types/explanation';
import { AlertTriangle, ShieldAlert, Network, MapPin, SplitSquareVertical, FileText, IndianRupee, Clock, Camera } from 'lucide-react';

interface WhyPrioritizedSectionProps {
  explanation: RiskExplanationResponse | null;
  loading: boolean;
  error?: string | null;
}

export const WhyPrioritizedSection: React.FC<WhyPrioritizedSectionProps> = ({
  explanation,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <Card className="p-5 space-y-4 animate-pulse">
        <div className="h-4 w-48 bg-surface-highest rounded" />
        <div className="h-3 w-80 bg-surface-highest rounded" />
        <div className="h-20 bg-surface-highest rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-surface-highest rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (error || !explanation) {
    return (
      <Card className="p-5 text-center flex flex-col items-center justify-center space-y-2">
        <AlertTriangle className="w-8 h-8 text-warning/70" />
        <p className="text-xs font-semibold text-foreground">Diagnostic explanation unavailable</p>
        <p className="text-[11px] text-muted-foreground">
          {error || 'Could not retrieve multi-modal anomaly contributions for this project.'}
        </p>
      </Card>
    );
  }

  // Domain Contribution items
  const contributions = [
    {
      domain: 'Contractor Nexus',
      value: explanation.network_contribution,
      icon: <Network className="w-3.5 h-3.5 text-primary" />,
      color: 'bg-primary',
    },
    {
      domain: 'Spatial Proximity',
      value: explanation.spatial_contribution,
      icon: <MapPin className="w-3.5 h-3.5 text-danger" />,
      color: 'bg-danger',
    },
    {
      domain: 'Split-Tender Risk',
      value: explanation.split_tender_contribution,
      icon: <SplitSquareVertical className="w-3.5 h-3.5 text-warning" />,
      color: 'bg-warning',
    },
    {
      domain: 'Text Similarity',
      value: explanation.text_contribution,
      icon: <FileText className="w-3.5 h-3.5 text-info" />,
      color: 'bg-info',
    },
    {
      domain: 'Cost Benchmark',
      value: explanation.financial_contribution,
      icon: <IndianRupee className="w-3.5 h-3.5 text-foreground" />,
      color: 'bg-foreground',
    },
    {
      domain: 'Timeline Window',
      value: explanation.temporal_contribution,
      icon: <Clock className="w-3.5 h-3.5 text-muted-foreground" />,
      color: 'bg-muted-foreground',
    },
    {
      domain: 'Asset Evidence',
      value: explanation.evidence_contribution,
      icon: <Camera className="w-3.5 h-3.5 text-muted-foreground" />,
      color: 'bg-muted-foreground',
    },
  ];

  // Maximum single contribution for relative bar scaling
  const maxContrib = Math.max(...contributions.map((c) => c.value), 1);

  return (
    <Card className="space-y-5 border-border shadow-xs">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-warning" />
            <span>Why This Project Was Prioritized</span>
          </CardTitle>
          <span className="text-[11px] font-mono text-muted-foreground">
            Multi-Modal Score: {Math.round(explanation.unified_score)} / 100
          </span>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Composite anomaly diagnosis computed across spatial, contractor, textual, financial, and temporal dimensions
        </CardDescription>
      </CardHeader>

      <div className="px-5 space-y-5">
        {/* 1. Primary Diagnostic Explanation Box */}
        <div className="p-3.5 rounded-lg border border-warning/30 bg-warning-surface/20 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            <span>Diagnostic Summary</span>
          </div>
          <p className="text-xs text-foreground leading-relaxed">
            {explanation.explanation_summary}
          </p>
        </div>

        {/* 2. Multi-Domain Contribution Breakdown Bars */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-medium text-foreground">
            <span>Domain Contribution Weights</span>
            <span className="text-[11px] font-mono text-muted-foreground">Score Contribution (pts)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {contributions.map((item) => {
              const pct = Math.round((item.value / maxContrib) * 100);
              const isFlagged = item.value > 10;

              return (
                <div
                  key={item.domain}
                  className="p-2.5 rounded-lg border border-border/60 bg-surface-muted/30 space-y-1.5 hover-elevate transition-all duration-150 hover:border-primary/40"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                      {item.icon}
                      <span className="text-[11px] truncate">{item.domain}</span>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold ${
                        isFlagged ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {item.value.toFixed(1)} pts
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-surface-highest rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Cross-Domain Flagged Findings Checklist */}
        <div className="space-y-2.5 pt-2 border-t border-border pb-1">
          <h4 className="text-xs font-semibold text-foreground">
            Substantive Audit Findings ({explanation.why_flagged.length})
          </h4>

          <div className="space-y-2">
            {explanation.why_flagged.map((finding, idx) => {
              // Extract tag like [PHYSICAL_PROXIMITY_OVERLAP] if present
              const match = finding.match(/^\[(.*?)\]\s*(.*)$/);
              const tag = match ? match[1].replace(/_/g, ' ') : 'AUDIT SIGNAL';
              const text = match ? match[2] : finding;

              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-border bg-surface flex items-start gap-3 text-xs leading-relaxed"
                >
                  <Badge variant="warning" size="sm" className="shrink-0 uppercase text-[10px] mt-0.5">
                    {tag}
                  </Badge>
                  <p className="text-foreground flex-1">{text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};
