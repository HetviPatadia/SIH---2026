import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Fingerprint, 
  MapPin, 
  Clock, 
  Activity, 
  Info,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import type { SimilarityAnalysis, ConsistencySummary, EvidenceComparisonItemData } from '../../../types/evidence';

interface ComparisonVerdictBarProps {
  similarityAnalysis: SimilarityAnalysis;
  consistencySummary: ConsistencySummary;
  evidenceA?: EvidenceComparisonItemData | null;
  evidenceB?: EvidenceComparisonItemData | null;
}

export const ComparisonVerdictBar: React.FC<ComparisonVerdictBarProps> = ({
  similarityAnalysis,
  consistencySummary,
  evidenceA,
  evidenceB,
}) => {
  const [progressWidth, setProgressWidth] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setProgressWidth(Math.min(100, Math.max(0, similarityAnalysis.similarity_percentage)));
    }, 80);
    return () => clearTimeout(timer);
  }, [similarityAnalysis.similarity_percentage]);

  const isExactMatch = similarityAnalysis.sha256_match;
  const isSuspectReuse = consistencySummary.is_suspect_reuse || similarityAnalysis.similarity_percentage >= 80;
  const isModerate = similarityAnalysis.similarity_percentage >= 50 && !isSuspectReuse;
  const hasInconsistency = Boolean(consistencySummary.location_inconsistent || consistencySummary.temporal_inconsistent);

  // Categorical Badge Text
  const getVerdictBadge = () => {
    if (isExactMatch) return 'EXACT FILE MATCH';
    if (isSuspectReuse) return 'SIMILARITY DETECTED';
    if (hasInconsistency) return 'METADATA INCONSISTENCY';
    return 'REQUIRES HUMAN VERIFICATION';
  };

  // Format distance
  const formatDistance = (meters?: number | null) => {
    if (meters === undefined || meters === null) return 'No GPS Data';
    if (meters < 50) return '0.0 km (Identical Location)';
    if (meters < 1000) return `${Math.round(meters)} meters`;
    return `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
  };

  // Format time delta
  const formatTimeDelta = (days?: number | null) => {
    if (days === undefined || days === null) return 'No Time Data';
    if (days === 0) return 'Identical Timestamp';
    if (days === 1) return '1 day apart';
    return `${days} days apart`;
  };

  return (
    <div className="space-y-3">
      {/* 1. Primary Verdict Banner */}
      <div 
        className={`p-4 rounded-xl border transition-all ${
          isExactMatch
            ? 'bg-destructive/10 border-destructive/30 text-destructive'
            : isSuspectReuse
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
            : isModerate
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
              isExactMatch
                ? 'bg-destructive text-destructive-foreground'
                : isSuspectReuse
                ? 'bg-amber-500 text-white'
                : isModerate
                ? 'bg-blue-500 text-white'
                : 'bg-emerald-500 text-white'
            }`}>
              {isExactMatch ? (
                <Fingerprint className="w-5 h-5" />
              ) : isSuspectReuse ? (
                <ShieldAlert className="w-5 h-5" />
              ) : isModerate ? (
                <Info className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase ${
                  isExactMatch
                    ? 'bg-destructive/20 text-destructive border border-destructive/30'
                    : isSuspectReuse
                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                    : isModerate
                    ? 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-500/30'
                    : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                }`}>
                  {getVerdictBadge()}
                </span>
                <span className="text-xs font-semibold opacity-90">
                  {similarityAnalysis.match_tier} MATCH TIER
                </span>
              </div>

              <h2 className="text-base md:text-lg font-bold tracking-tight text-foreground">
                {consistencySummary.finding || (
                  isExactMatch
                    ? 'Identical photographic proof uploaded across different sanction records.'
                    : isSuspectReuse
                    ? 'High visual similarity detected between evidence photographs.'
                    : 'Evidence items appear distinct based on multi-hash analysis.'
                )}
              </h2>

              <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
                {isExactMatch ? (
                  <span>
                    Cryptographic SHA-256 hash match confirmed. Exhibit B contains the identical digital binary file as Exhibit A. This strongly suggests improper file reuse across separate sanctions. <strong className="text-foreground">Human verification required.</strong>
                  </span>
                ) : isSuspectReuse ? (
                  <span>
                    Multi-hash perceptual analysis (pHash, dHash, aHash) and visual embeddings indicate structural duplication ({similarityAnalysis.similarity_percentage.toFixed(1)}% correspondence). While hashes differ slightly (due to compression or metadata re-saving), visual features correspond. <strong className="text-foreground">Human review required.</strong>
                  </span>
                ) : isModerate ? (
                  <span>
                    Partial visual overlap ({similarityAnalysis.similarity_percentage.toFixed(1)}%). Likely represents similar construction typology, standardized signage, or common building components rather than identical imagery.
                  </span>
                ) : (
                  <span>
                    No automated reuse signals detected between these two records. Cryptographic digests and perceptual representations are independent.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-border/50 pt-2 md:pt-0 md:pl-4">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Priority Status</span>
            <span className={`text-xs font-bold px-2 py-1 rounded mt-0.5 ${
              isExactMatch || isSuspectReuse
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                : 'bg-muted text-muted-foreground'
            }`}>
              {isExactMatch ? 'Immediate Review' : isSuspectReuse ? 'High-Priority Review' : 'Routine / Reference'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Key Forensic KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Overall Similarity Score */}
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Overall Similarity</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {similarityAnalysis.similarity_percentage.toFixed(1)}%
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                ({(similarityAnalysis.similarity_score).toFixed(4)})
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  similarityAnalysis.similarity_percentage >= 95
                    ? 'bg-destructive'
                    : similarityAnalysis.similarity_percentage >= 80
                    ? 'bg-amber-500'
                    : similarityAnalysis.similarity_percentage >= 50
                    ? 'bg-blue-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${progressWidth}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground truncate" title={similarityAnalysis.similarity_method}>
            Method: <span className="font-medium text-foreground">{similarityAnalysis.similarity_method.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* Metric 2: Cryptographic Match */}
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between space-y-2 hover-elevate animate-stagger-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Cryptographic Match</span>
            <Fingerprint className={`w-4 h-4 ${isExactMatch ? 'text-destructive' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
              {isExactMatch ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <span className="text-destructive">Identical SHA-256</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Distinct Digests</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
              {isExactMatch 
                ? 'Byte-for-byte duplicate file' 
                : 'Independent cryptographic signatures'}
            </p>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono truncate" title={`A: ${evidenceA?.sha256 || 'N/A'}\nB: ${evidenceB?.sha256 || 'N/A'}`}>
            <span>A: {evidenceA?.sha256 ? `${evidenceA.sha256.substring(0, 8)}...` : 'N/A'}</span>
            <span className="mx-1 opacity-50">|</span>
            <span>B: {evidenceB?.sha256 ? `${evidenceB.sha256.substring(0, 8)}...` : 'N/A'}</span>
          </div>
        </div>

        {/* Metric 3: Spatial Separation (GPS) */}
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Spatial Separation</span>
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-foreground truncate">
              {formatDistance(similarityAnalysis.gps_distance_meters)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {similarityAnalysis.gps_distance_meters !== null && similarityAnalysis.gps_distance_meters !== undefined ? (
                similarityAnalysis.gps_distance_meters > 50000 ? (
                  <span className="text-destructive font-medium">Cross-district anomaly (&gt;50km)</span>
                ) : similarityAnalysis.gps_distance_meters < 100 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Same geo-coordinates</span>
                ) : (
                  <span>Recorded in close radius</span>
                )
              ) : (
                <span>GPS metadata missing</span>
              )}
            </p>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <span>District Context:</span>
            <span className={`font-semibold ${similarityAnalysis.same_district ? 'text-foreground' : 'text-amber-600 dark:text-amber-400'}`}>
              {similarityAnalysis.same_district ? 'Same District' : 'Different Districts'}
            </span>
          </div>
        </div>

        {/* Metric 4: Temporal Discrepancy */}
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Temporal Discrepancy</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-foreground truncate">
              {formatTimeDelta(similarityAnalysis.time_discrepancy_days)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {similarityAnalysis.time_discrepancy_days !== null && similarityAnalysis.time_discrepancy_days !== undefined ? (
                similarityAnalysis.time_discrepancy_days > 180 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">&gt;6 months apart</span>
                ) : similarityAnalysis.time_discrepancy_days === 0 ? (
                  <span>Identical capture timestamp</span>
                ) : (
                  <span>Recorded {similarityAnalysis.time_discrepancy_days}d apart</span>
                )
              ) : (
                <span>Capture timestamp missing</span>
              )}
            </p>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <span>Contractor:</span>
            <span className={`font-semibold ${similarityAnalysis.same_contractor ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
              {similarityAnalysis.same_contractor ? 'Same Agency' : 'Different Agencies'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
