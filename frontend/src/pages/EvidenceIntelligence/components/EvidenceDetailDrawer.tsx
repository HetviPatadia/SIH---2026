import React, { useEffect, useState } from 'react';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';
import { EvidenceStatus } from '../../../components/audit/EvidenceStatus';
import { ConfidenceIndicator } from '../../../components/audit/ConfidenceIndicator';
import { api } from '../../../api/endpoints';
import type {
  GlobalEvidenceItem,
  ProjectEvidenceItem,
  SimilarEvidenceMatch,
} from '../../../types/evidence';
import {
  Clock,
  Layers,
  AlertTriangle,
  FileCheck2,
  Copy,
  Check,
  Download,
  ArrowRight,
  GitCompare,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  Compass,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface EvidenceDetailDrawerProps {
  item: GlobalEvidenceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EvidenceDetailDrawer: React.FC<EvidenceDetailDrawerProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  const [detailedEvidence, setDetailedEvidence] = useState<ProjectEvidenceItem | null>(null);
  const [similarMatches, setSimilarMatches] = useState<SimilarEvidenceMatch[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    if (!item || !isOpen) {
      setDetailedEvidence(null);
      setSimilarMatches([]);
      setImgError(false);
      return;
    }

    setLoadingDetails(true);
    setImgError(false);

    // Fetch full evidence details (including hashes, raw EXIF)
    const fetchDetails = api.evidence.getById(item.evidence_id);

    // Fetch similar evidence matches for the project
    const fetchSimilar = api.evidence.getSimilarEvidence(item.project_id, 0.7, 5);

    Promise.allSettled([fetchDetails, fetchSimilar])
      .then(([detailsRes, similarRes]) => {
        if (detailsRes.status === 'fulfilled') {
          setDetailedEvidence(detailsRes.value);
        }
        if (similarRes.status === 'fulfilled') {
          setSimilarMatches(similarRes.value);
        }
      })
      .finally(() => {
        setLoadingDetails(false);
      });
  }, [item, isOpen]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!item) return null;

  const fileUrl = api.evidence.getFileUrl(item.evidence_id);
  const meta = detailedEvidence?.metadata_record;
  const fileDetails = detailedEvidence?.file;
  const hashes = detailedEvidence?.hashes;

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const isPhoto =
    item.evidence_type.includes('PHOTO') || item.evidence_type.includes('STILL');

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Evidence Inspector • ${item.evidence_id}`}
      description="Cryptographic verification, sensor metadata inspection, and perceptual reuse analysis."
      widthClass="max-w-2xl w-full"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close Inspector
          </Button>

          <div className="flex items-center gap-2">
            <Link
              to={`/evidence/compare?evidenceA=${item.evidence_id}`}
              onClick={onClose}
            >
              <Button
                variant="outline"
                size="sm"
                leftIcon={<GitCompare className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Compare Side-by-Side
              </Button>
            </Link>

            <Link to={`/projects/${item.project_id}`} onClick={onClose}>
              <Button
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Open Investigation
              </Button>
            </Link>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-foreground pb-6">
        {/* Top Header Card */}
        <div className="p-3 rounded-lg border border-border bg-surface-elevated flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-foreground">
                {item.evidence_id}
              </span>
              <EvidenceStatus status={item.status} />
              {loadingDetails && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span>syncing</span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-sans">
              {item.title || 'Verification Record'}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">
              Confidence Score
            </div>
            <div className="mt-0.5">
              {item.confidence !== null && item.confidence !== undefined ? (
                <ConfidenceIndicator
                  score={item.confidence}
                  tier={(item.confidence_level as any) || 'MEDIUM'}
                />
              ) : (
                <span className="text-xs font-mono text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Level 2: Visual Evidence Preview & EXIF HUD */}
        <div className="rounded-lg border border-border bg-surface-elevated overflow-hidden">
          <div className="relative h-56 bg-surface-muted flex items-center justify-center overflow-hidden">
            {isPhoto && !imgError ? (
              <img
                src={fileUrl}
                alt={item.title || item.evidence_id}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2">
                <FileText className="w-12 h-12 stroke-1" />
                <p className="text-xs font-medium text-foreground">
                  {fileDetails?.file_name || 'Documentary Evidence Artifact'}
                </p>
                <p className="text-[11px]">
                  {item.evidence_type.replace(/_/g, ' ')} • {formatBytes(fileDetails?.file_size)}
                </p>
              </div>
            )}

            {/* Forensic EXIF HUD Overlay */}
            {isPhoto && !imgError && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/50 pointer-events-none p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border backdrop-blur-xs ${
                      item.location_consistency === 'CONSISTENT'
                        ? 'bg-success/20 text-success border-success/40'
                        : item.location_consistency === 'INCONSISTENT'
                        ? 'bg-danger/20 text-danger border-danger/40'
                        : 'bg-black/60 text-muted-foreground border-border'
                    }`}
                  >
                    {item.location_consistency === 'CONSISTENT'
                      ? 'GEO-VALIDATED'
                      : item.location_consistency === 'INCONSISTENT'
                      ? 'LOCATION DEVIATION'
                      : 'GPS UNAVAILABLE'}
                  </span>

                  {meta?.device_make && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/60 text-white/90 border border-white/20 backdrop-blur-xs">
                      {meta.device_make} {meta.device_model}
                    </span>
                  )}
                </div>

                <div className="space-y-1 font-mono text-[11px] text-white select-text">
                  {meta?.latitude && meta?.longitude ? (
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-semibold">
                        {meta.latitude.toFixed(6)}° N, {meta.longitude.toFixed(6)}° E
                      </span>
                      <span className="text-white/60 text-[10px]">
                        (Reliability: {Math.round((meta.metadata_reliability || 1) * 100)}%)
                      </span>
                    </div>
                  ) : (
                    <span className="text-white/60">GPS coordinates not embedded</span>
                  )}

                  <div className="text-[10px] text-white/75 flex items-center gap-2">
                    <span>
                      Captured:{' '}
                      {meta?.capture_time
                        ? new Date(meta.capture_time).toLocaleString('en-IN')
                        : new Date(item.created_at).toLocaleString('en-IN')}
                    </span>
                    {fileDetails?.width && fileDetails?.height && (
                      <>
                        <span>•</span>
                        <span>
                          {fileDetails.width} × {fileDetails.height} px
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

            {/* File Info Bar */}
            <div className="p-2.5 border-t border-border bg-surface-muted/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate font-mono text-[11px] text-muted-foreground">
              <span className="text-foreground font-medium truncate">
                {fileDetails?.file_name || `${item.evidence_id}.jpg`}
              </span>
              <span>•</span>
              <span>{formatBytes(fileDetails?.file_size)}</span>
              {fileDetails?.mime_type && (
                <>
                  <span>•</span>
                  <span>{fileDetails.mime_type}</span>
                </>
              )}
            </div>

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-[11px] shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download Artifact
            </a>
          </div>
        </div>

        {/* Section: Why This Evidence Matters (Signals & Findings) */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Audit Findings & Integrity Signals
          </div>

          {item.similarity_signal ? (
            <div className="p-3 rounded-lg border border-warning/30 bg-warning/10 space-y-1.5">
              <div className="flex items-center gap-2 text-warning font-semibold text-xs">
                <Layers className="w-4 h-4 shrink-0" />
                <span>Potential Evidence Reuse Detected</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                Perceptual hash analysis identifies high visual similarity between this submission and
                previously submitted physical progress photographs across another project. Substantive
                on-site verification is required to verify the distinct physical existence of the asset.
              </p>
            </div>
          ) : null}

          {item.location_consistency === 'INCONSISTENT' ? (
            <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 space-y-1.5">
              <div className="flex items-center gap-2 text-danger font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Location Inconsistency Signal</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                The embedded GPS coordinates from the inspection device deviate significantly from the
                sanctioned geographic site coordinates recorded in the administrative approval.
              </p>
            </div>
          ) : null}

          {item.temporal_consistency === 'INCONSISTENT' ? (
            <div className="p-3 rounded-lg border border-warning/30 bg-warning/10 space-y-1.5">
              <div className="flex items-center gap-2 text-warning font-semibold text-xs">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Temporal Timeline Anomaly</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                The photograph capture timestamp indicates an anomaly relative to project milestone dates
                (e.g., recorded prior to administrative sanction or prior to physical work commencement).
              </p>
            </div>
          ) : null}

          {item.status === 'VERIFIED' && !item.similarity_signal && (
            <div className="p-3 rounded-lg border border-success/30 bg-success/10 space-y-1.5">
              <div className="flex items-center gap-2 text-success font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Evidence Baseline Consistent</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                Device telemetry, geo-coordinates, and timestamp metadata match sanctioned parameters.
                No perceptual duplicate was found in cross-constituency catalog scans.
              </p>
            </div>
          )}
        </div>

        {/* Section: Associated Project Reference */}
        <div className="p-3.5 rounded-lg border border-border bg-surface-elevated space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Associated Project Reference
            </span>
            <Link
              to={`/projects/${item.project_id}`}
              onClick={onClose}
              className="text-xs text-primary hover:underline font-mono font-medium inline-flex items-center gap-1"
            >
              {item.project_id}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <p className="font-semibold text-sm text-foreground leading-snug">
            {item.project_title}
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px]">District & State</span>
              <span className="font-medium text-foreground">
                {item.district || 'N/A'}, {item.state || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Evidence Source</span>
              <span className="font-mono text-foreground">{item.source || 'eSAKSHI Mobile App'}</span>
            </div>
          </div>
        </div>

        {/* Section: Cross-Project Similar Evidence Matches */}
        {similarMatches.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Flagged Cross-Project Matches ({similarMatches.length})
              </span>
              <span className="text-[10px] text-muted-foreground">
                Matched via Perceptual Hash
              </span>
            </div>

            <div className="space-y-2">
              {similarMatches.map((match, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-warning/30 bg-surface-elevated space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="font-semibold text-primary">{match.matched_project_id}</span>
                        <span>•</span>
                        <span className="text-muted-foreground">{match.matched_district}</span>
                      </div>
                      <p className="text-xs text-foreground font-medium line-clamp-1">
                        {match.matched_project_title}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-warning/20 text-warning border border-warning/30 shrink-0">
                      {match.similarity_percentage.toFixed(1)}% Match
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px] text-muted-foreground font-mono">
                    <div className="flex items-center gap-1">
                      <Compass className="w-3 h-3 text-muted-foreground" />
                      <span>
                        {match.distance_meters
                          ? `${(match.distance_meters / 1000).toFixed(1)} km apart`
                          : 'Spatial distance unavailable'}
                      </span>
                    </div>

                    <Link
                      to={`/evidence/compare?evidenceA=${item.evidence_id}&evidenceB=${match.matched_evidence_id}`}
                      onClick={onClose}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-primary hover:text-primary-hover gap-1"
                      >
                        <GitCompare className="w-3 h-3" />
                        Compare Side-by-Side
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Level 3: Cryptographic Hashes & Technical Details (Collapsible) */}
        <div className="rounded-lg border border-border bg-surface-elevated overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-surface-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
              <FileCheck2 className="w-4 h-4 text-primary" />
              <span>Technical Details (Level 3 Cryptographic Ledger)</span>
            </div>
            {showTechnicalDetails ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showTechnicalDetails && (
            <div className="p-3 pt-0 border-t border-border space-y-3 font-mono text-xs">
              {/* SHA-256 Digest */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-sans">
                  <span>Cryptographic Hash (SHA-256):</span>
                  <button
                    onClick={() =>
                      handleCopy(hashes?.sha256 || fileDetails?.sha256 || '', 'sha256')
                    }
                    className="flex items-center gap-1 text-primary hover:underline lowercase"
                  >
                    {copiedField === 'sha256' ? (
                      <>
                        <Check className="w-3 h-3 text-success" />
                        <span className="text-success">copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2 rounded bg-surface-muted border border-border/80 break-all select-all text-[11px] text-foreground">
                  {hashes?.sha256 || fileDetails?.sha256 || 'Digest unavailable'}
                </div>
              </div>

              {/* Perceptual Hashes Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-surface-muted border border-border/80 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-sans">
                    <span>Perceptual Hash (pHash)</span>
                    {hashes?.phash && (
                      <button
                        onClick={() => handleCopy(hashes.phash!, 'phash')}
                        className="text-primary hover:underline"
                      >
                        {copiedField === 'phash' ? 'copied' : 'copy'}
                      </button>
                    )}
                  </div>
                  <div className="font-mono text-foreground font-semibold text-[11px] truncate">
                    {hashes?.phash || 'N/A'}
                  </div>
                </div>

                <div className="p-2 rounded bg-surface-muted border border-border/80 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-sans">
                    <span>Difference Hash (dHash)</span>
                    {hashes?.dhash && (
                      <button
                        onClick={() => handleCopy(hashes.dhash!, 'dhash')}
                        className="text-primary hover:underline"
                      >
                        {copiedField === 'dhash' ? 'copied' : 'copy'}
                      </button>
                    )}
                  </div>
                  <div className="font-mono text-foreground font-semibold text-[11px] truncate">
                    {hashes?.dhash || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Sensor Accuracy & Ingestion Record */}
              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 text-muted-foreground">
                <div>
                  <span className="block font-sans">Ingestion Source</span>
                  <span className="text-foreground font-mono">{item.source || 'eSAKSHI Mobile'}</span>
                </div>
                <div>
                  <span className="block font-sans">Ingestion Timestamp</span>
                  <span className="text-foreground font-mono">{item.created_at}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
