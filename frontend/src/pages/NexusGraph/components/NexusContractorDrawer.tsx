import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  ExternalLink, 
  FileText, 
  AlertTriangle, 
  Info,
  Briefcase
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { api } from '../../../api/endpoints';
import type { ContractorProfileData } from '../../../types/project';
import type { ContractorInvestigationResponse, ContractorProjectItem } from '../../../types/network';

interface NexusContractorDrawerProps {
  contractorData: ContractorInvestigationResponse;
  selectedProject: ContractorProjectItem | null;
  selectedCity: { cityName: string; projects: ContractorProjectItem[] } | null;
  onClearSelection: () => void;
  onSelectProject: (project: ContractorProjectItem) => void;
}

export const NexusContractorDrawer: React.FC<NexusContractorDrawerProps> = ({
  contractorData,
  selectedProject,
  selectedCity,
  onClearSelection,
  onSelectProject,
}) => {
  const [profile, setProfile] = useState<ContractorProfileData | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (contractorData?.contractor) {
      api.network.getContractorProfile(contractorData.contractor)
        .then((res) => {
          if (isMounted) setProfile(res);
        })
        .catch(() => {
          if (isMounted) setProfile(null);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [contractorData?.contractor]);

  // Currency formatter
  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // 1. PROJECT VIEW
  if (selectedProject) {
    const priorityScore = selectedProject.audit_priority ?? 0;
    const priorityLevel = selectedProject.priority_level || (
      priorityScore >= 80 ? 'CRITICAL' : priorityScore >= 60 ? 'HIGH' : priorityScore >= 40 ? 'MEDIUM' : 'LOW'
    );

    return (
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Project
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                priorityLevel === 'CRITICAL' || priorityLevel === 'HIGH'
                  ? 'bg-destructive/15 text-destructive border border-destructive/30'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {priorityLevel} Priority
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground font-mono">
              {selectedProject.project_id}
            </h3>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
          >
            <span>Contractor View</span>
          </Button>
        </div>

        {/* Project Title */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Title</span>
          <p className="text-xs font-medium text-foreground leading-snug">
            {selectedProject.title || 'Official project title not specified'}
          </p>
        </div>

        {/* Attribute Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">City / District</span>
            <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-emerald-500" />
              <span>{selectedProject.district || 'Unassigned'}</span>
            </span>
          </div>

          <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Audit Priority</span>
            <span className="font-mono font-bold text-foreground mt-0.5 block">
              {priorityScore.toFixed(1)}/100
            </span>
          </div>

          <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Sanctioned Amount</span>
            <span className="font-mono font-semibold text-foreground mt-0.5 block truncate">
              {formatCurrency(selectedProject.sanctioned_amount)}
            </span>
          </div>

          <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Status</span>
            <span className="font-medium text-foreground mt-0.5 block truncate">
              {selectedProject.status || 'In Progress'}
            </span>
          </div>
        </div>

        {/* Audit Guidance */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Info className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Audit Relationship Context</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Awarded to <strong className="text-foreground">{contractorData.contractor}</strong> in {selectedProject.district || 'district'}. Audit priority represents automated risk ranking, not proof of irregularity.
          </p>
        </div>

        {/* Action Links */}
        <div className="pt-2 space-y-1.5">
          <Link to={`/projects/${selectedProject.project_id}`} className="block">
            <Button variant="primary" size="sm" className="w-full text-xs font-semibold flex items-center justify-center gap-1.5 py-2">
              <FileText className="w-3.5 h-3.5" />
              <span>Open Project Investigation</span>
              <ExternalLink className="w-3 h-3 ml-auto" />
            </Button>
          </Link>

          <Link to={`/gis?projectId=${selectedProject.project_id}`} className="block">
            <Button variant="outline" size="sm" className="w-full text-xs font-medium flex items-center justify-center gap-1.5 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>Open GIS Map</span>
              <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 2. CITY VIEW
  if (selectedCity) {
    const totalSanctionedInCity = selectedCity.projects.reduce(
      (sum, p) => sum + (p.sanctioned_amount || 0),
      0
    );

    return (
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> City Node
              </span>
              <span className="text-xs font-semibold text-foreground">
                {selectedCity.projects.length} Works
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {selectedCity.cityName}
            </h3>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
          >
            <span>Contractor View</span>
          </Button>
        </div>

        {/* Spatial Summary */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Connected Works</span>
            <span className="text-base font-bold text-foreground">
              {selectedCity.projects.length}
            </span>
          </div>

          <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Total Sanctioned</span>
            <span className="font-mono font-bold text-foreground truncate block">
              {formatCurrency(totalSanctionedInCity)}
            </span>
          </div>
        </div>

        {/* Projects in this city list */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
            Projects in {selectedCity.cityName}
          </span>
          <div className="max-h-64 overflow-y-auto divide-y divide-border border border-border rounded-xl">
            {selectedCity.projects.map((p) => (
              <div
                key={p.project_id}
                onClick={() => onSelectProject(p)}
                className="p-2.5 hover:bg-muted/40 cursor-pointer transition-colors space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-primary">{p.project_id}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-muted text-foreground">
                    {formatCurrency(p.sanctioned_amount)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1" title={p.title}>
                  {p.title || 'Project title'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. CONTRACTOR VIEW (Default)
  const summary = contractorData.summary;
  const projects = contractorData.projects || [];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-4">
      {/* Header */}
      <div className="border-b border-border pb-3 space-y-1">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Contractor
          </span>
          {summary.high_priority_projects > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>{summary.high_priority_projects} High Priority</span>
            </span>
          )}
        </div>
        <h3 className="text-base font-bold text-foreground line-clamp-2" title={contractorData.contractor}>
          {contractorData.contractor}
        </h3>
        <span className="text-[11px] font-mono text-muted-foreground block">
          Entity ID: {contractorData.entity_id || 'Registered Entity'}
        </span>
      </div>

      {/* Spatial Summary Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Connected Projects</span>
          <span className="text-lg font-bold text-foreground">
            {summary.total_projects}
          </span>
        </div>

        <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Connected Cities</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {summary.district_count}
          </span>
        </div>

        <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Avg Audit Priority</span>
          <span className="text-base font-bold text-foreground">
            {summary.average_audit_priority.toFixed(1)}/100
          </span>
        </div>

        <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Total Sanctioned</span>
          <span className="font-mono font-semibold text-foreground truncate block">
            {formatCurrency(summary.total_sanctioned_amount)}
          </span>
        </div>
      </div>

      {/* Audit Observation Note */}
      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-snug">
          Multiple project connections identified across {summary.district_count} cities. Connection pattern serves as an investigation prioritization signal. Human verification required.
        </p>
      </div>

      {/* Historical Profile & Sector Specialization */}
      {profile && (
        <div className="p-2.5 rounded-xl bg-muted/20 border border-border space-y-2 text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-primary" />
              Primary: {profile.primary_sector || 'General'}
            </span>
            <span className="font-mono text-muted-foreground">
              {profile.total_projects} Historical Works
            </span>
          </div>

          {/* Sector distribution bar */}
          {profile.sector_distribution && Object.keys(profile.sector_distribution).length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground flex justify-between font-mono">
                {Object.entries(profile.sector_distribution)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([sec, share]) => `${sec.split(' ')[0]} ${(share * 100).toFixed(0)}%`)
                  .join(' | ')}
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex">
                {Object.entries(profile.sector_distribution)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([sec, share], idx) => {
                    const colors = ['bg-primary', 'bg-blue-500', 'bg-emerald-500'];
                    return (
                      <div
                        key={sec}
                        style={{ width: `${share * 100}%` }}
                        className={colors[idx % colors.length]}
                      />
                    );
                  })}
              </div>
            </div>
          )}

          {/* Activity summary */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
            <span>Median Span: {profile.median_duration_days ? `${Math.round(profile.median_duration_days)} days` : 'N/A'}</span>
            {profile.projects_by_status?.['Completed'] !== undefined && (
              <span>{profile.projects_by_status['Completed']} Completed</span>
            )}
          </div>
        </div>
      )}

      {/* Connected Projects List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-foreground uppercase tracking-wider">
            Connected Projects ({projects.length})
          </span>
          <span className="text-[10px] text-muted-foreground">Click to inspect</span>
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-border border border-border rounded-xl">
          {projects.map((p) => {
            const score = p.audit_priority ?? 0;
            const level = p.priority_level || (score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW');

            return (
              <div
                key={p.project_id}
                onClick={() => onSelectProject(p)}
                className="p-2.5 hover:bg-muted/40 cursor-pointer transition-colors space-y-1 group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-primary group-hover:underline">
                    {p.project_id}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                    level === 'CRITICAL' || level === 'HIGH'
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {level}
                  </span>
                </div>

                <p className="text-[11px] text-foreground/90 line-clamp-1" title={p.title}>
                  {p.title || 'Title not specified'}
                </p>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-emerald-500" />
                    <span>{p.district || 'Unassigned'}</span>
                  </span>
                  <span className="font-mono">{formatCurrency(p.sanctioned_amount)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
