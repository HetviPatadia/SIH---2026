import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ExternalLink, 
  MapPin, 
  Clock, 
  Fingerprint, 
  Building2, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Copy,
  Check,
  Eye
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { api } from '../../../api/endpoints';
import type { EvidenceComparisonItemData } from '../../../types/evidence';

interface DualEvidencePanelsProps {
  evidenceA: EvidenceComparisonItemData;
  evidenceB: EvidenceComparisonItemData;
  isExactHashMatch: boolean;
}

export const DualEvidencePanels: React.FC<DualEvidencePanelsProps> = ({
  evidenceA,
  evidenceB,
  isExactHashMatch,
}) => {
  // Image zoom states for each panel
  const [zoomA, setZoomA] = useState(1);
  const [zoomB, setZoomB] = useState(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<{ url: string; title: string; exhibit: string } | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const renderExhibitCard = (
    item: EvidenceComparisonItemData,
    exhibitLabel: 'Exhibit A (Reference)' | 'Exhibit B (Comparison Subject)',
    badgeColor: string,
    zoom: number,
    setZoom: React.Dispatch<React.SetStateAction<number>>,
    exhibitKey: 'A' | 'B'
  ) => {
    const imageUrl = api.evidence.getFileUrl(item.evidence_id);

    return (
      <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-xs">
        {/* Panel Header */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold tracking-wide uppercase ${badgeColor}`}>
                {exhibitLabel}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border truncate max-w-[140px] sm:max-w-[200px]" title={item.evidence_id}>
                {item.evidence_id}
              </span>
            </div>
            <Link
              to={`/projects/${item.project_id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>{item.project_id}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground line-clamp-1" title={item.project_title}>
              {item.project_title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                <span className="truncate max-w-[180px]" title={item.contractor || 'Unknown Contractor'}>
                  {item.contractor || 'Agency Not Specified'}
                </span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                <span>{item.district || 'District N/A'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Visual Canvas Area */}
        <div className="relative bg-black/95 flex items-center justify-center min-h-[320px] max-h-[420px] overflow-hidden group">
          {/* Zoomable Image Container */}
          <div 
            className="w-full h-full flex items-center justify-center p-2 transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          >
            <img
              src={imageUrl}
              alt={`${exhibitLabel} - ${item.title || item.evidence_id}`}
              className="max-h-[360px] w-auto max-w-full object-contain rounded select-none"
              onError={(e) => {
                // Fallback if image fails to load
                (e.target as HTMLElement).style.display = 'none';
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'flex flex-col items-center justify-center text-muted-foreground py-16 px-4 text-center space-y-2';
                  fallback.innerHTML = `
                    <div class="p-3 rounded-full bg-muted/20 border border-border">
                      <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <span class="text-xs font-medium">Image Preview Unavailable</span>
                    <span class="text-[11px] font-mono opacity-60">${item.evidence_id}</span>
                  `;
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>

          {/* Floating Controls Overlay (top right) */}
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg p-1 border border-white/10 opacity-80 hover:opacity-100 transition-opacity z-10">
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            {zoom !== 1 && (
              <button
                onClick={() => setZoom(1)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded"
                title="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="h-3 w-px bg-white/20 my-auto mx-0.5" />
            <button
              onClick={() => setLightboxImg({ url: imageUrl, title: item.title || item.evidence_id, exhibit: exhibitLabel })}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded"
              title="Full view modal"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Evidence Type Tag (top left overlay) */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-medium text-white/90 border border-white/10 z-10">
            {item.evidence_type.replace(/_/g, ' ')}
          </div>

          {/* Bottom EXIF HUD Overlay */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-6 z-10">
            <div className="grid grid-cols-2 gap-2 text-[11px] text-white/80">
              <div className="flex items-center gap-1.5 truncate">
                <Clock className="w-3.5 h-3.5 text-primary-muted shrink-0" />
                <span className="truncate">
                  {item.capture_time 
                    ? new Date(item.capture_time).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'No timestamp metadata'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-primary-muted shrink-0" />
                <span className="truncate font-mono text-[10px]">
                  {item.latitude && item.longitude 
                    ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                    : 'No GPS geotag'}
                </span>
                {item.latitude && item.longitude && (
                  <button
                    onClick={() => handleCopy(`${item.latitude}, ${item.longitude}`, `gps_${exhibitKey}`)}
                    className="p-1 hover:bg-white/20 rounded text-white/70 hover:text-white transition-colors"
                    title="Copy GPS coordinates"
                  >
                    {copiedKey === `gps_${exhibitKey}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cryptographic SHA-256 Digest Bar */}
        <div className={`px-4 py-2.5 border-t border-border flex items-center justify-between gap-2 text-xs ${
          isExactHashMatch 
            ? 'bg-destructive/10 text-destructive font-medium' 
            : 'bg-muted/10 text-muted-foreground'
        }`}>
          <div className="flex items-center gap-1.5 truncate">
            <Fingerprint className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono text-[11px] truncate" title={item.sha256 || 'Unknown Hash'}>
              SHA-256: <span className="font-semibold text-foreground">{item.sha256 || 'Unavailable'}</span>
            </span>
          </div>

          {item.sha256 && (
            <button
              onClick={() => handleCopy(item.sha256!, `hash_${exhibitKey}`)}
              className="px-2 py-0.5 rounded text-[10px] font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors flex items-center gap-1 shrink-0"
              title="Copy full SHA-256 hash"
            >
              {copiedKey === `hash_${exhibitKey}` ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-3 border-t border-border bg-muted/5 flex items-center justify-between gap-2">
          <Link
            to={`/evidence?search=${encodeURIComponent(item.evidence_id)}`}
            className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Locate in Evidence Feed</span>
          </Link>

          <Link to={`/projects/${item.project_id}`}>
            <Button variant="outline" size="sm" className="text-xs font-semibold flex items-center gap-1">
              <span>Open Project Investigation</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderExhibitCard(
          evidenceA,
          'Exhibit A (Reference)',
          'bg-primary/10 text-primary border border-primary/20',
          zoomA,
          setZoomA,
          'A'
        )}

        {renderExhibitCard(
          evidenceB,
          'Exhibit B (Comparison Subject)',
          isExactHashMatch 
            ? 'bg-destructive/15 text-destructive border border-destructive/30' 
            : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30',
          zoomB,
          setZoomB,
          'B'
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl flex items-center justify-between pb-3 text-white">
            <div className="space-y-0.5">
              <span className="text-xs uppercase tracking-wider text-white/60 font-semibold">{lightboxImg.exhibit}</span>
              <h4 className="text-sm font-semibold">{lightboxImg.title}</h4>
            </div>
            <button
              onClick={() => setLightboxImg(null)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors text-xs font-medium"
            >
              Close (Esc)
            </button>
          </div>
          <div className="max-h-[80vh] max-w-4xl overflow-auto flex items-center justify-center">
            <img
              src={lightboxImg.url}
              alt={lightboxImg.title}
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg border border-white/10"
            />
          </div>
        </div>
      )}
    </>
  );
};
