import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import type { RiskExplanationResponse } from '../../../types/explanation';
import { ChevronDown, ChevronRight, Cpu, CheckCircle2, XCircle, Info } from 'lucide-react';

interface TechnicalDetailsSectionProps {
  explanation: RiskExplanationResponse;
}

export const TechnicalDetailsSection: React.FC<TechnicalDetailsSectionProps> = ({ explanation }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <Card className="border-border shadow-xs overflow-hidden">
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-surface-muted/50 transition-colors focus:outline-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Cpu className="w-4 h-4 text-primary" />
          <span>Technical Anomaly Model Diagnostics (Level 3 Details)</span>
          <span className="font-mono text-[10px] text-muted-foreground bg-surface-muted px-2 py-0.5 rounded border border-border">
            {explanation.model_version || 'model_v1.0'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{isOpen ? 'Collapse' : 'Expand'} Details</span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-5 border-t border-border space-y-5 text-xs">
          {/* Metadata Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 rounded-lg bg-surface-muted/40 border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Model Engine
              </span>
              <span className="font-mono text-xs font-semibold text-foreground mt-0.5 block">
                {explanation.model_version || 'model_v1.0'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-surface-muted/40 border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Dataset Partition
              </span>
              <span className="font-mono text-xs font-semibold text-foreground mt-0.5 block">
                {explanation.dataset_version || 'DEMO-SYNTHETIC-v1'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-surface-muted/40 border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Confidence Level
              </span>
              <span className="font-mono text-xs font-semibold text-foreground mt-0.5 block">
                {explanation.evidence_confidence !== null
                  ? `${Math.round(explanation.evidence_confidence * 100)}% Verified`
                  : 'Pending Verification'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-surface-muted/40 border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Score Threshold Tier
              </span>
              <span className="font-mono text-xs font-semibold text-warning mt-0.5 block">
                {explanation.priority_level} (&ge; 80 pts)
              </span>
            </div>
          </div>

          {/* Domain Availability Grid */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground block">
              Multi-Modal Engine Availability
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              {Object.entries(explanation.domains_available || {}).map(([domain, isAvail]) => (
                <div
                  key={domain}
                  className="flex items-center justify-between p-2 rounded bg-surface border border-border/50"
                >
                  <span className="capitalize text-muted-foreground">{domain.replace(/_/g, ' ')}</span>
                  {isAvail ? (
                    <span className="text-success flex items-center gap-1 font-mono text-[10px]">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60 flex items-center gap-1 font-mono text-[10px]">
                      <XCircle className="w-3 h-3" /> N/A
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Feature Contribution Attribution Table */}
          {explanation.feature_contributions && explanation.feature_contributions.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground block">
                Individual Feature Attribution Table
              </span>
              <Table containerClassName="border border-border rounded-lg bg-surface">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-64">Attributed Feature</TableHead>
                    <TableHead>Observed Value</TableHead>
                    <TableHead className="w-28 text-right">Contribution</TableHead>
                    <TableHead className="w-32">Direction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {explanation.feature_contributions.map((feat, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-foreground py-2">
                        {feat.feature}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground py-2">
                        {feat.value}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs text-right py-2">
                        {feat.contribution.toFixed(1)} pts
                      </TableCell>
                      <TableCell className="py-2">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            feat.direction === 'INCREASES_PRIORITY'
                              ? 'bg-warning-surface text-warning border-warning/30'
                              : 'bg-surface-muted text-muted-foreground border-border'
                          }`}
                        >
                          {feat.direction}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Institutional Disclaimer */}
          <div className="p-3 rounded-lg border border-border bg-surface-muted/30 flex items-start gap-2.5 text-[11px] text-muted-foreground">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {explanation.audit_disclaimer ||
                'This score prioritizes projects for human review and does not establish fraud, misconduct, or legal liability. Requires human verification.'}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};
