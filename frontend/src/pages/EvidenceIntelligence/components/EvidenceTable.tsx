import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EvidenceStatus } from '../../../components/audit/EvidenceStatus';
import { ConfidenceIndicator } from '../../../components/audit/ConfidenceIndicator';
import { api } from '../../../api/endpoints';
import type { GlobalEvidenceItem } from '../../../types/evidence';
import {
  Camera,
  FileText,
  MapPin,
  Clock,
  Layers,
  AlertTriangle,
  Eye,
  GitCompare,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useInvestigation } from '../../../context/InvestigationContext';

interface EvidenceTableProps {
  items: GlobalEvidenceItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  selectedEvidenceId: string | null;
  onSelectEvidence: (item: GlobalEvidenceItem) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const EvidenceTable: React.FC<EvidenceTableProps> = ({
  items,
  loading,
  error,
  onRetry,
  selectedEvidenceId,
  onSelectEvidence,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}) => {
  const { setActiveProject } = useInvestigation();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (evidenceId: string) => {
    setImageErrors((prev) => ({ ...prev, [evidenceId]: true }));
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString.slice(0, 10);
    }
  };

  const getEvidenceTypeIcon = (type: string) => {
    if (type.includes('PHOTO') || type.includes('STILL')) {
      return <Camera className="w-3.5 h-3.5 text-primary" />;
    }
    return <FileText className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  if (error) {
    return (
      <Card className="p-8 text-center border-danger/30 bg-danger/5 space-y-3">
        <AlertCircle className="w-8 h-8 text-danger mx-auto" />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            Error loading evidence registry
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="text-xs mx-auto"
        >
          Retry Connection
        </Button>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-surface-elevated/90 overflow-hidden shadow-xs">
      {/* Table Container */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-muted/60 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider select-none">
              <th className="py-2.5 px-3 w-80">Evidence Artifact & File</th>
              <th className="py-2.5 px-3 min-w-[220px]">Project Reference</th>
              <th className="py-2.5 px-3 w-48 text-center">Verification & Signals</th>
              <th className="py-2.5 px-3 w-28 text-center">Confidence</th>
              <th className="py-2.5 px-3 w-36 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              // Loading Skeleton
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-10 rounded bg-surface-muted/80 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-40 bg-surface-muted/80 rounded" />
                        <div className="h-2.5 w-24 bg-surface-muted/50 rounded" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 bg-surface-muted/80 rounded" />
                      <div className="h-2.5 w-48 bg-surface-muted/50 rounded" />
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="h-5 w-28 bg-surface-muted/70 rounded-full mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="h-4 w-16 bg-surface-muted/60 rounded mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="h-6 w-16 bg-surface-muted/60 rounded ml-auto" />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={5} className="py-12 px-4 text-center">
                  <div className="max-w-sm mx-auto space-y-2">
                    <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto stroke-1" />
                    <p className="text-sm font-semibold text-foreground">
                      No evidence records found
                    </p>
                    <p className="text-xs text-muted-foreground">
                      No photographic or documentary records match your selected filter criteria.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              // Real Data Rows
              items.map((item) => {
                const isSelected = selectedEvidenceId === item.evidence_id;
                const fileUrl = api.evidence.getFileUrl(item.evidence_id);
                const hasImgError = imageErrors[item.evidence_id];
                const isPhoto =
                  item.evidence_type.includes('PHOTO') ||
                  item.evidence_type.includes('STILL');

                return (
                  <tr
                    key={item.evidence_id}
                    onClick={() => {
                      setActiveProject(item.project_id, item.project_title);
                      onSelectEvidence(item);
                    }}
                    className={`transition-all duration-150 cursor-pointer group ${
                      isSelected
                        ? 'bg-primary/10 border-l-2 border-primary font-medium'
                        : 'table-row-hover hover:bg-surface-muted/60'
                    }`}
                  >
                    {/* Artifact & File Column */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-start gap-2.5">
                        {/* Thumbnail / Icon preview */}
                        <div className="w-12 h-10 rounded border border-border bg-surface-muted overflow-hidden shrink-0 relative flex items-center justify-center">
                          {isPhoto && !hasImgError ? (
                            <img
                              src={fileUrl}
                              alt={item.title || item.evidence_id}
                              loading="lazy"
                              onError={() => handleImageError(item.evidence_id)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-muted-foreground">
                              {getEvidenceTypeIcon(item.evidence_type)}
                            </div>
                          )}

                          {item.has_metadata && (
                            <span className="absolute bottom-0 right-0 text-[8px] font-mono px-0.5 bg-background/90 text-primary rounded-tl">
                              GPS
                            </span>
                          )}
                        </div>

                        {/* Title, Type, and Timestamp */}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground truncate max-w-[200px]" title={item.title || item.evidence_id}>
                              {item.title || item.evidence_id}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                            <span className="truncate max-w-[120px]">{item.evidence_id}</span>
                            <span>•</span>
                            <span className="text-foreground/80">
                              {item.evidence_type.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span>{formatDate(item.created_at)}</span>
                            {item.source && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[120px]">{item.source}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Project Reference Column */}
                    <td className="py-2.5 px-3 min-w-[200px]">
                      <div className="space-y-0.5">
                        <Link
                          to={`/projects/${item.project_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 group-hover:text-primary-hover"
                        >
                          {item.project_id}
                          <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                        </Link>
                        <p
                          className="text-foreground text-xs line-clamp-1 leading-snug"
                          title={item.project_title}
                        >
                          {item.project_title}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span>
                            {item.district || 'District N/A'}, {item.state || 'State N/A'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status & Consistency Column */}
                    <td className="py-2.5 px-3 text-center space-y-1.5">
                      <div className="flex justify-center">
                        <EvidenceStatus status={item.status} />
                      </div>

                      {/* Consistency Indicators & Signal Count */}
                      <div className="flex items-center justify-center gap-2 text-[10px] font-mono">
                        {/* Location consistency */}
                        <span
                          className={`inline-flex items-center gap-1 ${
                            item.location_consistency === 'CONSISTENT'
                              ? 'text-success'
                              : item.location_consistency === 'INCONSISTENT'
                              ? 'text-danger font-semibold'
                              : 'text-muted-foreground'
                          }`}
                          title={`Location: ${item.location_consistency}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.location_consistency === 'CONSISTENT'
                                ? 'bg-success'
                                : item.location_consistency === 'INCONSISTENT'
                                ? 'bg-danger'
                                : 'bg-muted-foreground'
                            }`}
                          />
                          Geo
                        </span>

                        {/* Temporal consistency */}
                        <span
                          className={`inline-flex items-center gap-1 ${
                            item.temporal_consistency === 'CONSISTENT'
                              ? 'text-success'
                              : item.temporal_consistency === 'INCONSISTENT'
                              ? 'text-warning font-semibold'
                              : 'text-muted-foreground'
                          }`}
                          title={`Temporal: ${item.temporal_consistency}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.temporal_consistency === 'CONSISTENT'
                                ? 'bg-success'
                                : item.temporal_consistency === 'INCONSISTENT'
                                ? 'bg-warning'
                                : 'bg-muted-foreground'
                            }`}
                          />
                          Time
                        </span>

                        {/* Similarity / Reuse Flag Badge */}
                        {item.similarity_signal && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] bg-warning/15 text-warning border border-warning/30 font-semibold">
                            <Layers className="w-2.5 h-2.5" />
                            Reuse
                          </span>
                        )}

                        {item.signals_count > 0 && !item.similarity_signal && (
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] bg-surface-muted text-muted-foreground border border-border">
                            <AlertTriangle className="w-2.5 h-2.5 text-warning" />
                            {item.signals_count}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Confidence Column */}
                    <td className="py-2.5 px-3 text-center">
                      {item.confidence !== null && item.confidence !== undefined ? (
                        <ConfidenceIndicator
                          score={item.confidence}
                          tier={(item.confidence_level as any) || 'MEDIUM'}
                        />
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-mono">—</span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="py-2.5 px-3 text-right">
                      <div
                        className="inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant={isSelected ? 'primary' : 'outline'}
                          onClick={() => onSelectEvidence(item)}
                          className="h-7 px-2 text-[11px] gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </Button>

                        <Link
                          to={`/evidence/compare?evidenceA=${item.evidence_id}`}
                          title="Compare Evidence Side-by-Side"
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-surface-muted/40 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
          <span>
            Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} -{' '}
            {Math.min(page * pageSize, total)} of {total.toLocaleString()} records
          </span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-6 px-1.5 rounded border border-border bg-surface text-foreground font-sans text-xs focus:outline-none"
              aria-label="Records per page"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="h-7 px-2 text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Prev
          </Button>

          <span className="px-2.5 py-1 text-xs font-mono font-medium text-foreground">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="h-7 px-2 text-xs"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
