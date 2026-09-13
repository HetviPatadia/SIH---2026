import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Cpu, 
  ShieldCheck, 
  Info
} from 'lucide-react';
import type { SimilarityAnalysis } from '../../../types/evidence';

interface ComparisonTechnicalDrawerProps {
  similarityAnalysis: SimilarityAnalysis;
}

export const ComparisonTechnicalDrawer: React.FC<ComparisonTechnicalDrawerProps> = ({
  similarityAnalysis,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const hashMetrics = [
    {
      name: 'pHash (Perceptual DCT)',
      score: similarityAnalysis.phash_similarity,
      percentage: (similarityAnalysis.phash_similarity * 100).toFixed(1),
      desc: 'Discrete Cosine Transform frequency fingerprint; robust to scaling, JPEG compression, and minor aspect adjustments.',
    },
    {
      name: 'dHash (Difference Gradient)',
      score: similarityAnalysis.dhash_similarity,
      percentage: (similarityAnalysis.dhash_similarity * 100).toFixed(1),
      desc: 'Horizontal adjacent pixel brightness gradient; tracks structural contours and edges across the scene.',
    },
    {
      name: 'aHash (Average Luminance)',
      score: similarityAnalysis.ahash_similarity,
      percentage: (similarityAnalysis.ahash_similarity * 100).toFixed(1),
      desc: 'Mean luminance distribution comparison; detects general light and shadow blocking.',
    },
    {
      name: 'Visual Neural Embedding Cosine',
      score: similarityAnalysis.visual_embedding_similarity,
      percentage: (similarityAnalysis.visual_embedding_similarity * 100).toFixed(1),
      desc: 'High-dimensional semantic feature vector similarity; detects scene and architectural context similarity.',
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Collapsible Trigger Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Algorithmic & Forensic Technical Breakdown</span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                {similarityAnalysis.similarity_method.replace(/_/g, ' ')}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Progressive disclosure of multi-hash perceptual scores, cryptographic bit parity, and forensic confidence parameters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span>{isOpen ? 'Collapse Details' : 'View Algorithmic Scores'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-4 border-t border-border bg-muted/5 space-y-4">
          {/* Methodology Explainer Box */}
          <div className="rounded-lg border border-primary/20 bg-primary-muted/10 p-3 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Cryptographic vs. Perceptual Similarity Methodology:</span>
              <p>
                <strong>Cryptographic SHA-256</strong> hashes produce an identical 256-bit string if and only if two files are byte-for-byte identical. 
                In contrast, <strong>Perceptual Hashes (pHash, dHash, aHash)</strong> compute visual frequency fingerprints invariant to re-encoding, resolution changes, or minor metadata alterations. 
                Visual embedding cosine similarity uses deep learning feature maps to verify structural physical objects.
              </p>
            </div>
          </div>

          {/* Multi-Hash Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hashMetrics.map((m, idx) => {
              const val = m.score * 100;
              return (
                <div key={idx} className="bg-background border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{m.name}</span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      {m.percentage}%
                    </span>
                  </div>

                  {/* Meter bar */}
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        val >= 95
                          ? 'bg-destructive'
                          : val >= 80
                          ? 'bg-amber-500'
                          : val >= 50
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {m.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Forensic Parameters Summary */}
          <div className="bg-background border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-foreground">Evaluated Match Tier:</span>
              <div className="text-muted-foreground">
                Confidence categorization determined by consensus between perceptual hashing and binary verification.
              </div>
            </div>
            <span className="font-mono font-bold px-2.5 py-1 rounded bg-muted text-foreground border border-border self-start sm:self-center">
              {similarityAnalysis.match_tier}
            </span>
          </div>

          {/* Legal / Audit Disclaimer */}
          <div className="text-[11px] text-muted-foreground/80 italic border-t border-border/50 pt-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              Disclaimer: Algorithmic similarity values are investigation prioritization indicators designed to assist human auditors under SIH 2026 guidelines. They do not constitute automated evidence invalidation without human inspection.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
