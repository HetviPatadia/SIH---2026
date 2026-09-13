import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  ExternalLink, 
  Crosshair, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  ArrowRight, 
  SplitSquareVertical, 
  Eye, 
  Activity,
  X,
  Info
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { api } from '../../../api/endpoints';
import type { 
  GraphNode, 
  GraphEdge, 
  ContractorInvestigationResponse 
} from '../../../types/network';

interface NexusEntityDrawerProps {
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
  totalMetrics?: {
    node_count: number;
    edge_count: number;
    project_count: number;
    contractor_count: number;
    district_count: number;
    evidence_count?: number;
  };
}

export const NexusEntityDrawer: React.FC<NexusEntityDrawerProps> = ({
  selectedNode,
  selectedEdge,
  onClose,
  onFocusNode,
  totalMetrics,
}) => {
  const [showTechnical, setShowTechnical] = useState(false);
  const [contractorDetail, setContractorDetail] = useState<ContractorInvestigationResponse | null>(null);
  const [isLoadingContractor, setIsLoadingContractor] = useState(false);

  // When a contractor node is selected, load portfolio details
  useEffect(() => {
    let active = true;
    if (selectedNode && selectedNode.type === 'CONTRACTOR') {
      const contractorName = selectedNode.metadata?.name || selectedNode.label;
      if (contractorName) {
        setIsLoadingContractor(true);
        api.network.getContractor(contractorName)
          .then((res) => {
            if (active) setContractorDetail(res);
          })
          .catch((err) => {
            console.error('Failed to load contractor portfolio:', err);
            if (active) setContractorDetail(null);
          })
          .finally(() => {
            if (active) setIsLoadingContractor(false);
          });
      }
    } else {
      setContractorDetail(null);
    }
    return () => {
      active = false;
    };
  }, [selectedNode]);

  // Format currency in Indian format
  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // 1. If an Edge is selected
  if (selectedEdge) {
    const isEvidenceReuse = selectedEdge.relation === 'POTENTIAL_EVIDENCE_REUSE';
    const isRepeated = (selectedEdge.relationship_count || 0) > 1;

    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
              isEvidenceReuse
                ? 'bg-destructive/15 text-destructive border border-destructive/30'
                : isRepeated
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}>
              {selectedEdge.relation.replace(/_/g, ' ')}
            </span>
            <span className="text-xs font-semibold text-foreground">Relationship</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Connection flow */}
        <div className="p-3 bg-muted/20 border border-border rounded-lg space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Connected Endpoints
          </div>
          <div className="flex items-center justify-between gap-2 text-xs font-mono">
            <span className="font-semibold text-foreground truncate max-w-[140px]" title={selectedEdge.source}>
              {selectedEdge.source}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-semibold text-foreground truncate max-w-[140px]" title={selectedEdge.target}>
              {selectedEdge.target}
            </span>
          </div>
        </div>

        {/* Explanation */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-foreground">Audit Explanation</span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {selectedEdge.explanation || 'Direct association between connected entities in the project execution records.'}
          </p>
        </div>

        {/* Action Link for Evidence Reuse */}
        {isEvidenceReuse && (
          <div className="pt-1">
            <Link
              to={`/evidence/compare?evidenceA=${selectedEdge.source.replace('project:', '')}&evidenceB=${selectedEdge.target.replace('project:', '')}`}
            >
              <Button variant="primary" size="sm" className="w-full text-xs font-semibold flex items-center justify-center gap-1.5">
                <SplitSquareVertical className="w-3.5 h-3.5" />
                <span>Open Evidence Comparison</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  // 2. If a Node is selected
  if (selectedNode) {
    const meta = selectedNode.metadata || {};

    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-3 gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                selectedNode.type === 'PROJECT'
                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                  : selectedNode.type === 'CONTRACTOR'
                  ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                  : selectedNode.type === 'DISTRICT'
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
              }`}>
                {selectedNode.type}
              </span>
              {selectedNode.risk_level && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                  selectedNode.risk_level === 'CRITICAL' || selectedNode.risk_level === 'HIGH'
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {selectedNode.risk_level} Priority
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-foreground line-clamp-1" title={selectedNode.label}>
              {selectedNode.label}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
            title="Deselect"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Context-Specific Attributes */}
        {selectedNode.type === 'PROJECT' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Project Title</span>
              <p className="text-xs text-foreground font-medium leading-snug">
                {meta.title || 'Title not specified'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/20 p-2 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">District</span>
                <span className="font-medium text-foreground">{meta.district || 'N/A'}</span>
              </div>
              <div className="bg-muted/20 p-2 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Sector</span>
                <span className="font-medium text-foreground truncate block" title={meta.sector || 'N/A'}>
                  {meta.sector || 'General'}
                </span>
              </div>
              <div className="bg-muted/20 p-2 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Sanctioned</span>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(meta.sanctioned_amount)}
                </span>
              </div>
              <div className="bg-muted/20 p-2 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Audit Priority</span>
                <span className="font-mono font-bold text-foreground">
                  {(selectedNode.score || 0).toFixed(1)}/100
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 space-y-2">
              <Link to={`/projects/${meta.project_id || selectedNode.label}`} className="block">
                <Button variant="primary" size="sm" className="w-full text-xs font-semibold flex items-center justify-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open Project Investigation</span>
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFocusNode(selectedNode.id)}
                className="w-full text-xs flex items-center justify-center gap-1.5"
              >
                <Crosshair className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Center in Graph Canvas</span>
              </Button>
            </div>
          </div>
        )}

        {selectedNode.type === 'CONTRACTOR' && (
          <div className="space-y-3">
            {/* Contractor Summary Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/20 p-2 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Total Projects</span>
                <span className="text-base font-bold text-foreground">
                  {contractorDetail?.summary.total_projects ?? meta.project_count ?? 1}
                </span>
              </div>
              <div className="bg-muted/20 p-2 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Districts</span>
                <span className="text-base font-bold text-foreground">
                  {contractorDetail?.summary.district_count ?? 1}
                </span>
              </div>
              <div className="bg-muted/20 p-2 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">High Priority</span>
                <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                  {contractorDetail?.summary.high_priority_projects ?? meta.high_priority_projects ?? 0}
                </span>
              </div>
              <div className="bg-muted/20 p-2 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Avg Priority</span>
                <span className="text-base font-bold text-foreground">
                  {(contractorDetail?.summary.average_audit_priority ?? meta.average_audit_priority ?? selectedNode.score ?? 0).toFixed(1)}
                </span>
              </div>
            </div>

            {/* Audit Language Notice */}
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-snug">
                Multiple project connections identified for this entity. Connection patterns serve as investigation prioritization signals. Human verification required.
              </p>
            </div>

            {/* Associated Projects List Preview */}
            {isLoadingContractor ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                <span>Loading contractor portfolio...</span>
              </div>
            ) : contractorDetail?.projects && contractorDetail.projects.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Associated Works ({contractorDetail.projects.length})</span>
                  <span className="text-[10px] text-muted-foreground">Click to investigate</span>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-border border border-border rounded-lg">
                  {contractorDetail.projects.slice(0, 6).map((p) => (
                    <Link
                      key={p.project_id}
                      to={`/projects/${p.project_id}`}
                      className="p-2 hover:bg-muted/30 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="truncate mr-2">
                        <span className="font-semibold text-primary block">{p.project_id}</span>
                        <span className="text-[11px] text-muted-foreground truncate block" title={p.title}>
                          {p.title || p.district}
                        </span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {selectedNode.type === 'EVIDENCE' && (
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Evidence Artifact ID</span>
              <span className="font-mono text-xs font-semibold text-foreground break-all">
                {meta.evidence_id || selectedNode.label}
              </span>
            </div>

            {meta.signal_type && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{String(meta.signal_type).replace(/_/g, ' ')}</span>
                </span>
                <p className="text-[11px] leading-snug">
                  Potentially linked to peer project {meta.matched_project_id || 'peer record'}.
                </p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Link to={`/evidence?search=${encodeURIComponent(meta.evidence_id || selectedNode.label)}`} className="block">
                <Button variant="outline" size="sm" className="w-full text-xs font-medium flex items-center justify-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Locate in Evidence Feed</span>
                </Button>
              </Link>

              {meta.matched_evidence_id && (
                <Link 
                  to={`/evidence/compare?evidenceA=${meta.evidence_id}&evidenceB=${meta.matched_evidence_id}`}
                  className="block"
                >
                  <Button variant="primary" size="sm" className="w-full text-xs font-semibold flex items-center justify-center gap-1.5">
                    <SplitSquareVertical className="w-3.5 h-3.5" />
                    <span>Open Evidence Comparison</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {selectedNode.type === 'DISTRICT' && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/20 p-2 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Projects Located</span>
                <span className="text-base font-bold text-foreground">
                  {meta.project_count ?? 1}
                </span>
              </div>
              <div className="bg-muted/20 p-2 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Avg Priority</span>
                <span className="text-base font-bold text-foreground">
                  {(selectedNode.score || 0).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Level 3: Technical Graph Details (Progressive Disclosure) */}
        <div className="border-t border-border pt-2">
          <button
            onClick={() => setShowTechnical(!showTechnical)}
            className="w-full flex items-center justify-between text-[11px] text-muted-foreground hover:text-foreground py-1 font-medium"
          >
            <span>Technical Graph Details</span>
            {showTechnical ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showTechnical && (
            <div className="mt-2 p-2 bg-muted/30 rounded-lg text-[10px] font-mono space-y-1 text-muted-foreground">
              <div>Node ID: <span className="text-foreground">{selectedNode.id}</span></div>
              <div>Graph Type: <span className="text-foreground">{selectedNode.type}</span></div>
              <div>Raw Score: <span className="text-foreground">{selectedNode.score}</span></div>
              <div>Priority: <span className="text-foreground">{selectedNode.risk_level}</span></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Default Panel when nothing is selected
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-4">
      <div className="space-y-1 border-b border-border pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span>Graph Metrics & Overview</span>
        </h3>
        <p className="text-xs text-muted-foreground">
          Select any node or connection in the canvas to inspect entity attributes, contract portfolios, and cross-project relationships.
        </p>
      </div>

      {totalMetrics ? (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/20 p-2 rounded-lg border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Projects</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {totalMetrics.project_count}
            </span>
          </div>
          <div className="bg-muted/20 p-2 rounded-lg border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Contractors</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {totalMetrics.contractor_count}
            </span>
          </div>
          <div className="bg-muted/20 p-2 rounded-lg border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Districts</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {totalMetrics.district_count}
            </span>
          </div>
          <div className="bg-muted/20 p-2 rounded-lg border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Evidence Items</span>
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
              {totalMetrics.evidence_count || 0}
            </span>
          </div>
        </div>
      ) : null}

      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground space-y-1.5">
        <span className="font-semibold text-foreground block">Auditor Exploration Tips:</span>
        <ul className="list-disc list-inside text-[11px] space-y-1">
          <li>Click any project to see its implementing agency and registered evidence.</li>
          <li>Click a contractor hub to inspect their complete cross-district portfolio.</li>
          <li>Red connecting edges highlight potential photo reuse across separate sanctions.</li>
        </ul>
      </div>
    </div>
  );
};
