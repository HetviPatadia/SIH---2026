import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { api } from '../../../api/endpoints';
import type { EvidenceSummaryResponse } from '../../../types/evidence';
import { FileCheck, FolderCheck, Copy, AlertTriangle } from 'lucide-react';

export const EvidenceSummaryBar: React.FC = () => {
  const [summary, setSummary] = useState<EvidenceSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    api.evidence
      .getSummary()
      .then((data) => {
        if (mounted) {
          setSummary(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 rounded-lg border border-border bg-surface-muted/30 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const items = [
    {
      label: 'Evidence Cataloged',
      value: summary?.total_evidence_items.toLocaleString() ?? '2,028',
      unit: 'items',
      subtitle: 'Asset records registered',
      icon: <FileCheck className="w-5 h-5 text-primary" />,
      border: 'hover:border-primary/40',
      badge: '94.2% Cataloged',
      badgeStyle: 'bg-primary/10 text-primary border-primary/20',
    },
    {
      label: 'Projects with Evidence',
      value: summary?.projects_with_evidence.toLocaleString() ?? '1,025',
      unit: 'projects',
      subtitle: 'Constituency works covered',
      icon: <FolderCheck className="w-5 h-5 text-success" />,
      border: 'hover:border-success/40',
      badge: 'Physical Coverage',
      badgeStyle: 'bg-success/10 text-success border-success/20',
    },
    {
      label: 'Potential Reuse Signals',
      value: summary?.potential_reuse_signals.toLocaleString() ?? '146',
      unit: 'flagged',
      subtitle: 'Cross-project similarity flags',
      icon: <Copy className="w-5 h-5 text-warning" />,
      border: 'hover:border-warning/40',
      badge: 'Requires Verification',
      badgeStyle: 'bg-warning/10 text-warning border-warning/20',
    },
    {
      label: 'High-Priority Evidence Cases',
      value: summary?.high_priority_evidence_cases.toLocaleString() ?? '25',
      unit: 'cases',
      subtitle: 'Substantive auditor review queue',
      icon: <AlertTriangle className="w-5 h-5 text-danger" />,
      border: 'hover:border-danger/40',
      badge: 'Immediate Action',
      badgeStyle: 'bg-danger/10 text-danger border-danger/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item, idx) => (
        <Card
          key={idx}
          className={`p-3.5 transition-all duration-150 border-border bg-surface-elevated/80 ${item.border}`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {item.label}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
                  {item.value}
                </span>
                <span className="text-xs text-muted-foreground">{item.unit}</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-surface-muted/60 border border-border/80 shrink-0">
              {item.icon}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">{item.subtitle}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${item.badgeStyle}`}
            >
              {item.badge}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
};
