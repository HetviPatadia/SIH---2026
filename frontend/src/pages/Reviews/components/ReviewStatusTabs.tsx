import React from 'react';
import type { CaseSummaryResponse } from '../../../types/investigation';
import { cn } from '../../../lib/utils';
import { AlertTriangle, Clock, ShieldAlert, CheckCircle, Flame } from 'lucide-react';

interface ReviewStatusTabsProps {
  summary: CaseSummaryResponse | null;
  activePriority: string;
  activeStatus: string;
  onSelectTab: (priority: string, status: string) => void;
  totalProjects: number;
}

export const ReviewStatusTabs: React.FC<ReviewStatusTabsProps> = ({
  summary,
  activePriority,
  activeStatus,
  onSelectTab,
  totalProjects,
}) => {
  const tabs = [
    {
      id: 'all',
      label: 'All Queue',
      count: totalProjects || summary?.total_reviews || 0,
      priority: '',
      status: '',
      icon: null,
      color: 'hover:border-primary',
    },
    {
      id: 'critical',
      label: 'Critical Priority',
      count: summary?.critical_priority_reviews ?? 0,
      priority: 'CRITICAL',
      status: '',
      icon: <Flame className="w-3.5 h-3.5 text-danger" />,
      color: 'border-danger/30 hover:border-danger',
      activeColor: 'bg-danger-surface text-danger border-danger/50',
    },
    {
      id: 'high',
      label: 'High Priority',
      count: summary?.high_priority_reviews ?? 0,
      priority: 'HIGH',
      status: '',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-warning" />,
      color: 'border-warning/30 hover:border-warning',
      activeColor: 'bg-warning-surface text-warning border-warning/50',
    },
    {
      id: 'verification_required',
      label: 'Field Verification Needed',
      count: summary?.verification_required ?? 0,
      priority: '',
      status: 'VERIFICATION_REQUIRED',
      icon: <Clock className="w-3.5 h-3.5 text-warning" />,
      color: 'border-warning/30 hover:border-warning',
      activeColor: 'bg-warning-surface text-warning border-warning/50',
    },
    {
      id: 'under_review',
      label: 'Under Review',
      count: summary?.under_review ?? 0,
      priority: '',
      status: 'UNDER_REVIEW',
      icon: <Clock className="w-3.5 h-3.5 text-info" />,
      color: 'border-info/30 hover:border-info',
      activeColor: 'bg-info-surface text-info border-info/50',
    },
    {
      id: 'escalated',
      label: 'Escalated Cases',
      count: summary?.escalated ?? 0,
      priority: '',
      status: 'ESCALATED',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-danger" />,
      color: 'border-danger/30 hover:border-danger',
      activeColor: 'bg-danger-surface text-danger border-danger/50',
    },
    {
      id: 'verified',
      label: 'Verified',
      count: summary?.verified ?? 0,
      priority: '',
      status: 'VERIFIED',
      icon: <CheckCircle className="w-3.5 h-3.5 text-success" />,
      color: 'border-success/30 hover:border-success',
      activeColor: 'bg-success-surface text-success border-success/50',
    },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs select-none no-scrollbar">
      {tabs.map((tab) => {
        const isActive =
          (tab.id === 'all' && !activePriority && !activeStatus) ||
          (tab.priority && activePriority === tab.priority) ||
          (tab.status && activeStatus === tab.status);

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.priority, tab.status)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap',
              isActive
                ? tab.activeColor || 'bg-primary-muted/20 text-primary border-primary/40'
                : 'bg-surface text-muted-foreground hover:text-foreground border-border ' + tab.color
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span
              className={cn(
                'font-mono text-[11px] px-1.5 py-0.2 rounded-full',
                isActive ? 'bg-background/80 font-bold' : 'bg-surface-highest text-foreground'
              )}
            >
              {tab.count.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
};
