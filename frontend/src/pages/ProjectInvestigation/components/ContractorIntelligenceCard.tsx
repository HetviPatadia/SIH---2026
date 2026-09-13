import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { api } from '../../../api/endpoints';
import type { ContractorProfileData } from '../../../types/project';
import { Building2, Layers, Clock, TrendingUp, ExternalLink, ShieldCheck, AlertCircle, Info } from 'lucide-react';

interface ContractorIntelligenceCardProps {
  contractorName?: string | null;
  projectId: string;
}

export const ContractorIntelligenceCard: React.FC<ContractorIntelligenceCardProps> = ({
  contractorName,
  projectId,
}) => {
  const [profile, setProfile] = useState<ContractorProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractorName || contractorName.trim() === '') {
      setProfile(null);
      return;
    }

    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.network.getContractorProfile(contractorName.trim());
        if (isMounted) {
          setProfile(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.warn('Contractor profile lookup note:', err);
          setError('Contractor baseline profile currently unavailable.');
          setProfile(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [contractorName]);

  // Format currency helper
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

  if (!contractorName) {
    return (
      <Card hoverElevate className="border border-border/80 bg-surface">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold tracking-wide">
                CONTRACTOR INTELLIGENCE
              </CardTitle>
            </div>
            <Badge variant="neutral" size="sm">No Contractor Assigned</Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Longitudinal contractor baseline and historical sector specialization.
          </CardDescription>
        </CardHeader>
        <div className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground/70 shrink-0" />
          <span>No executing agency or contractor is currently registered in the database for this project.</span>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border border-border/80 bg-surface animate-pulse">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <div className="h-4 w-40 bg-surface-muted rounded" />
            </div>
            <div className="h-4 w-20 bg-surface-muted rounded" />
          </div>
        </CardHeader>
        <div className="p-4 pt-0 space-y-3">
          <div className="h-10 bg-surface-muted rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-surface-muted rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error || !profile) {
    return (
      <Card hoverElevate className="border border-border/80 bg-surface">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold tracking-wide">
                CONTRACTOR INTELLIGENCE
              </CardTitle>
            </div>
            <Badge variant="neutral" size="sm">Baseline Unavailable</Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Contractor: <span className="font-semibold text-foreground">{contractorName}</span>
          </CardDescription>
        </CardHeader>
        <div className="p-4 pt-0 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500/80 shrink-0" />
            <span>No historical baseline profile recorded for &quot;{contractorName}&quot;.</span>
          </div>
          <Link to={`/nexus?contractor=${encodeURIComponent(contractorName)}`}>
            <Button variant="ghost" size="sm" rightIcon={<ExternalLink className="w-3 h-3" />}>
              Inspect in Nexus
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  // Calculate sector distribution percentages
  const sectorEntries = Object.entries(profile.sector_distribution || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const completedCount = profile.projects_by_status?.['Completed'] ?? profile.projects_by_status?.['COMPLETED'] ?? null;
  const inProgressCount = profile.projects_by_status?.['In Progress'] ?? profile.projects_by_status?.['IN_PROGRESS'] ?? null;

  return (
    <Card hoverElevate className="border border-border/80 bg-surface shadow-xs">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-foreground">
                  {profile.name}
                </CardTitle>
                {profile.primary_district && (
                  <Badge variant="neutral" size="sm">
                    {profile.primary_district}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Primary Sector: <span className="text-foreground font-medium">{profile.primary_sector || 'General Works'}</span>
                {profile.normalized_name && ` • Registry ID: ${profile.normalized_name}`}
              </CardDescription>
            </div>
          </div>

          <Link to={`/nexus?contractor=${encodeURIComponent(profile.name)}&projectId=${encodeURIComponent(projectId)}`}>
            <Button variant="outline" size="sm" rightIcon={<ExternalLink className="w-3 h-3" />}>
              Open in Nexus Graph
            </Button>
          </Link>
        </div>
      </CardHeader>

      <div className="p-4 space-y-4">
        {/* Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-2.5 rounded-lg bg-surface-muted/50 border border-border/40">
            <div className="flex items-center justify-between text-muted-foreground text-[11px] mb-1">
              <span>Historical Portfolio</span>
              <Layers className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-base font-bold font-mono text-foreground">
              {profile.total_projects} <span className="text-xs font-normal text-muted-foreground">projects</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {completedCount !== null && inProgressCount !== null
                ? `${completedCount} completed • ${inProgressCount} active`
                : 'Across regional works'}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-muted/50 border border-border/40">
            <div className="flex items-center justify-between text-muted-foreground text-[11px] mb-1">
              <span>Total Sanctioned Value</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-base font-bold font-mono text-foreground">
              {formatCurrency(profile.total_sanctioned_amount)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Avg: {formatCurrency(profile.avg_project_value)}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-muted/50 border border-border/40">
            <div className="flex items-center justify-between text-muted-foreground text-[11px] mb-1">
              <span>Median Project Cost</span>
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-base font-bold font-mono text-foreground">
              {formatCurrency(profile.median_project_value)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              MAD: {formatCurrency(profile.value_mad)}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-muted/50 border border-border/40">
            <div className="flex items-center justify-between text-muted-foreground text-[11px] mb-1">
              <span>Execution Cadence</span>
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-base font-bold font-mono text-foreground">
              {profile.median_duration_days ? `${Math.round(profile.median_duration_days)} days` : 'N/A'}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Median execution span
            </div>
          </div>
        </div>

        {/* Sector Specialization Breakdown */}
        {sectorEntries.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-border/40">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Historical Sector Specialization</span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {sectorEntries.map(([sec, share]) => `${sec} ${(share * 100).toFixed(0)}%`).join(' | ')}
              </span>
            </div>

            {/* Visual multi-segmented bar */}
            <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden flex">
              {sectorEntries.map(([sec, share], idx) => {
                const colors = ['bg-primary', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500'];
                const colorClass = colors[idx % colors.length];
                return (
                  <div
                    key={sec}
                    title={`${sec}: ${(share * 100).toFixed(1)}%`}
                    style={{ width: `${share * 100}%` }}
                    className={`${colorClass} transition-all duration-500`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Audit Context Disclaimer */}
        <div className="flex items-start gap-2 p-2 rounded-md bg-surface-muted/40 border border-border/30 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary/80 shrink-0 mt-0.5" />
          <span>
            Contractor baseline profile reflects historical administrative records for peer context, not a determination of culpability.
          </span>
        </div>
      </div>
    </Card>
  );
};
