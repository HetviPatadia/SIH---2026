import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  Building2, 
  MapPin, 
  Clock, 
  Fingerprint, 
  FileText,
  Layers
} from 'lucide-react';
import type { SimilarityAnalysis, EvidenceComparisonItemData } from '../../../types/evidence';

interface ComparisonLedgerTableProps {
  evidenceA: EvidenceComparisonItemData;
  evidenceB: EvidenceComparisonItemData;
  similarityAnalysis: SimilarityAnalysis;
}

export const ComparisonLedgerTable: React.FC<ComparisonLedgerTableProps> = ({
  evidenceA,
  evidenceB,
  similarityAnalysis,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isExactHash = similarityAnalysis.sha256_match;
  const sameContractor = similarityAnalysis.same_contractor;
  const sameDistrict = similarityAnalysis.same_district;
  const distance = similarityAnalysis.gps_distance_meters;
  const timeDelta = similarityAnalysis.time_discrepancy_days;

  const formatDistance = (meters?: number | null) => {
    if (meters === undefined || meters === null) return 'N/A';
    if (meters < 50) return '0.0 km';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
  };

  const rows = [
    {
      label: 'Evidence ID',
      icon: Layers,
      valA: (
        <span className="font-mono text-[11px] font-semibold text-foreground">
          {evidenceA.evidence_id}
        </span>
      ),
      valB: (
        <span className="font-mono text-[11px] font-semibold text-foreground">
          {evidenceB.evidence_id}
        </span>
      ),
      analysis: (
        <span className="text-xs text-muted-foreground">
          {evidenceA.evidence_id === evidenceB.evidence_id ? 'Identical Record' : 'Distinct Evidence IDs'}
        </span>
      ),
      highlight: false,
    },
    {
      label: 'MPLADS Project Sanction',
      icon: FileText,
      valA: (
        <div>
          <Link
            to={`/projects/${evidenceA.project_id}`}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>{evidenceA.project_id}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </Link>
          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2" title={evidenceA.project_title}>
            {evidenceA.project_title}
          </div>
        </div>
      ),
      valB: (
        <div>
          <Link
            to={`/projects/${evidenceB.project_id}`}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>{evidenceB.project_id}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </Link>
          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2" title={evidenceB.project_title}>
            {evidenceB.project_title}
          </div>
        </div>
      ),
      analysis: (
        <div className="text-xs font-medium">
          {evidenceA.project_id === evidenceB.project_id ? (
            <span className="text-muted-foreground">Intra-project verification (same sanction)</span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>Cross-Project comparison</span>
            </span>
          )}
        </div>
      ),
      highlight: evidenceA.project_id !== evidenceB.project_id,
    },
    {
      label: 'Implementing Contractor',
      icon: Building2,
      valA: (
        <span className="text-xs font-medium text-foreground">
          {evidenceA.contractor || 'Not Specified'}
        </span>
      ),
      valB: (
        <span className="text-xs font-medium text-foreground">
          {evidenceB.contractor || 'Not Specified'}
        </span>
      ),
      analysis: (
        <div className="text-xs">
          {sameContractor ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium border border-amber-500/20">
              Same Vendor
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-destructive/10 text-destructive font-medium border border-destructive/20">
              Different Contractors (Cross-Entity)
            </span>
          )}
        </div>
      ),
      highlight: !sameContractor && isExactHash,
    },
    {
      label: 'District & State',
      icon: MapPin,
      valA: (
        <span className="text-xs font-medium text-foreground">
          {evidenceA.district || 'N/A'}
        </span>
      ),
      valB: (
        <span className="text-xs font-medium text-foreground">
          {evidenceB.district || 'N/A'}
        </span>
      ),
      analysis: (
        <div className="text-xs">
          {sameDistrict ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              Same Administrative District
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Inter-District Separation
            </span>
          )}
        </div>
      ),
      highlight: !sameDistrict,
    },
    {
      label: 'Geotagged Coordinates (GPS)',
      icon: MapPin,
      valA: (
        <div className="font-mono text-[11px] text-muted-foreground">
          {evidenceA.latitude && evidenceA.longitude 
            ? `${evidenceA.latitude.toFixed(5)}, ${evidenceA.longitude.toFixed(5)}`
            : 'No Geotag'}
        </div>
      ),
      valB: (
        <div className="font-mono text-[11px] text-muted-foreground">
          {evidenceB.latitude && evidenceB.longitude 
            ? `${evidenceB.latitude.toFixed(5)}, ${evidenceB.longitude.toFixed(5)}`
            : 'No Geotag'}
        </div>
      ),
      analysis: (
        <div className="text-xs">
          {distance !== null && distance !== undefined ? (
            <div className="space-y-0.5">
              <span className="font-semibold text-foreground">
                Distance: {formatDistance(distance)}
              </span>
              {distance > 50000 && (
                <div className="text-[11px] text-destructive font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Severe spatial discrepancy (&gt;50km)</span>
                </div>
              )}
              {distance < 50 && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Identical coordinate location
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">GPS distance calculation unavailable</span>
          )}
        </div>
      ),
      highlight: distance !== null && distance !== undefined && distance > 50000,
    },
    {
      label: 'Capture Timestamp',
      icon: Clock,
      valA: (
        <div className="text-xs text-foreground">
          {evidenceA.capture_time 
            ? new Date(evidenceA.capture_time).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })
            : 'Missing Timestamp'}
        </div>
      ),
      valB: (
        <div className="text-xs text-foreground">
          {evidenceB.capture_time 
            ? new Date(evidenceB.capture_time).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })
            : 'Missing Timestamp'}
        </div>
      ),
      analysis: (
        <div className="text-xs">
          {timeDelta !== null && timeDelta !== undefined ? (
            <div className="space-y-0.5">
              <span className="font-medium text-foreground">
                {timeDelta === 0 ? 'Identical Timestamp' : `${timeDelta} days offset`}
              </span>
              {timeDelta === 0 && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Same second upload/capture
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">Timestamp delta unavailable</span>
          )}
        </div>
      ),
      highlight: timeDelta === 0 && evidenceA.project_id !== evidenceB.project_id,
    },
    {
      label: 'Evidence Classification',
      icon: FileText,
      valA: (
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-foreground border border-border">
          {evidenceA.evidence_type.replace(/_/g, ' ')}
        </span>
      ),
      valB: (
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-foreground border border-border">
          {evidenceB.evidence_type.replace(/_/g, ' ')}
        </span>
      ),
      analysis: (
        <span className="text-xs text-muted-foreground">
          {evidenceA.evidence_type === evidenceB.evidence_type ? 'Matching Milestone Stage' : 'Cross-Milestone Comparison'}
        </span>
      ),
      highlight: false,
    },
    {
      label: 'Cryptographic SHA-256 Digest',
      icon: Fingerprint,
      valA: (
        <div className="space-y-1">
          <div className="font-mono text-[10px] text-foreground break-all p-1.5 rounded bg-muted/40 border border-border/60">
            {evidenceA.sha256 || 'Unavailable'}
          </div>
          {evidenceA.sha256 && (
            <button
              onClick={() => handleCopy(evidenceA.sha256!, 'hash_tbl_a')}
              className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              {copiedKey === 'hash_tbl_a' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
              <span>Copy digest</span>
            </button>
          )}
        </div>
      ),
      valB: (
        <div className="space-y-1">
          <div className="font-mono text-[10px] text-foreground break-all p-1.5 rounded bg-muted/40 border border-border/60">
            {evidenceB.sha256 || 'Unavailable'}
          </div>
          {evidenceB.sha256 && (
            <button
              onClick={() => handleCopy(evidenceB.sha256!, 'hash_tbl_b')}
              className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              {copiedKey === 'hash_tbl_b' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
              <span>Copy digest</span>
            </button>
          )}
        </div>
      ),
      analysis: (
        <div className="text-xs">
          {isExactHash ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-destructive/15 text-destructive font-bold border border-destructive/30">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Byte-for-Byte SHA-256 Match</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Distinct Cryptographic Digests</span>
            </span>
          )}
        </div>
      ),
      highlight: isExactHash,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Table Header */}
      <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Forensic Metadata Ledger</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Structured attribute comparison across project administrative contexts, timestamps, and cryptographic digests.
          </p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="py-2.5 px-4 w-[20%]">Dimension</th>
              <th className="py-2.5 px-4 w-[32%] text-primary font-semibold">Exhibit A (Reference)</th>
              <th className="py-2.5 px-4 w-[32%] text-amber-700 dark:text-amber-400 font-semibold">Exhibit B (Compared)</th>
              <th className="py-2.5 px-4 w-[16%]">Consistency Analysis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs">
            {rows.map((row, idx) => {
              const Icon = row.icon;
              return (
                <tr 
                  key={idx} 
                  className={`transition-colors hover:bg-muted/30 ${
                    row.highlight ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.08]' : ''
                  }`}
                >
                  <td className="py-3 px-4 align-top font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{row.label}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 align-top text-foreground/90">
                    {row.valA}
                  </td>
                  <td className="py-3 px-4 align-top text-foreground/90">
                    {row.valB}
                  </td>
                  <td className="py-3 px-4 align-top">
                    {row.analysis}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
