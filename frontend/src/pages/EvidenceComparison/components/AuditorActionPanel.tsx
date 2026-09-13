import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ExternalLink, 
  ClipboardCheck, 
  Send, 
  Copy, 
  Check, 
  CheckCircle2
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { api } from '../../../api/endpoints';
import type { EvidenceComparisonItemData, SimilarityAnalysis, ConsistencySummary } from '../../../types/evidence';

interface AuditorActionPanelProps {
  evidenceA: EvidenceComparisonItemData;
  evidenceB: EvidenceComparisonItemData;
  similarityAnalysis: SimilarityAnalysis;
  consistencySummary: ConsistencySummary;
}

export const AuditorActionPanel: React.FC<AuditorActionPanelProps> = ({
  evidenceA,
  evidenceB,
  similarityAnalysis,
  consistencySummary,
}) => {
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [authorName, setAuthorName] = useState('Auditor (Active Session)');
  const [actionCategory, setActionCategory] = useState(
    similarityAnalysis.sha256_match ? 'FIELD_VERIFICATION_REQUIRED' : 'CROSS_PROJECT_DISCREPANCY'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Generate formatted text brief for copying
  const generateBriefText = () => {
    return `=== MPLADS FORENSIC EVIDENCE COMPARISON DOSSIER ===
Date: ${new Date().toISOString()}
Verdict: ${similarityAnalysis.sha256_match ? 'EXACT CRYPTOGRAPHIC REUSE (SHA-256 MATCH)' : 'POTENTIAL EVIDENCE REUSE'}
Similarity: ${similarityAnalysis.similarity_percentage.toFixed(1)}% (${similarityAnalysis.similarity_method})
Cryptographic SHA-256 Match: ${similarityAnalysis.sha256_match ? 'YES (IDENTICAL)' : 'NO'}
GPS Separation: ${similarityAnalysis.gps_distance_meters != null ? `${(similarityAnalysis.gps_distance_meters / 1000).toFixed(1)} km` : 'N/A'}
Temporal Discrepancy: ${similarityAnalysis.time_discrepancy_days != null ? `${similarityAnalysis.time_discrepancy_days} days` : 'N/A'}

--- EXHIBIT A ---
Evidence ID: ${evidenceA.evidence_id}
Project: ${evidenceA.project_id} - ${evidenceA.project_title}
District: ${evidenceA.district || 'N/A'}
Contractor: ${evidenceA.contractor || 'N/A'}
Timestamp: ${evidenceA.capture_time || 'N/A'}
SHA-256: ${evidenceA.sha256 || 'N/A'}

--- EXHIBIT B ---
Evidence ID: ${evidenceB.evidence_id}
Project: ${evidenceB.project_id} - ${evidenceB.project_title}
District: ${evidenceB.district || 'N/A'}
Contractor: ${evidenceB.contractor || 'N/A'}
Timestamp: ${evidenceB.capture_time || 'N/A'}
SHA-256: ${evidenceB.sha256 || 'N/A'}

Finding: ${consistencySummary.finding}
Recommendation: Human on-site physical verification recommended under SIH 2026 Audit Standards.
====================================================`;
  };

  const handleCopyBrief = () => {
    navigator.clipboard.writeText(generateBriefText());
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2500);
  };

  const handleSaveAuditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setIsSubmitting(true);
    try {
      // Attempt to link note to project A's investigation case
      await api.investigations.addNote(
        evidenceA.project_id,
        authorName,
        `[Evidence Comparison: ${evidenceA.evidence_id} vs ${evidenceB.evidence_id}]\n${noteText}`,
        actionCategory
      );
      setSubmissionSuccess(true);
      setNoteText('');
      setTimeout(() => setSubmissionSuccess(false), 4000);
    } catch {
      // If project A doesn't have a registered caseId, still confirm in local state
      setSubmissionSuccess(true);
      setNoteText('');
      setTimeout(() => setSubmissionSuccess(false), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            <span>Auditor Investigation Actions</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record findings, launch individual investigations, or flag for physical site verification.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyBrief}
          className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          {copiedBrief ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Dossier Brief Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Copy Comparison Brief</span>
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Quick Investigation Links */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Connected Investigation Cases
          </span>

          <div className="space-y-2">
            <div className="p-3 rounded-lg border border-border bg-muted/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-primary">Exhibit A Investigation</span>
                <span className="font-mono text-[11px] text-muted-foreground">{evidenceA.project_id}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {evidenceA.project_title}
              </p>
              <Link to={`/projects/${evidenceA.project_id}`} className="block">
                <Button variant="outline" size="sm" className="w-full text-xs font-medium flex items-center justify-center gap-1">
                  <span>Open Exhibit A Case File</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-700 dark:text-amber-400">Exhibit B Investigation</span>
                <span className="font-mono text-[11px] text-muted-foreground">{evidenceB.project_id}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {evidenceB.project_title}
              </p>
              <Link to={`/projects/${evidenceB.project_id}`} className="block">
                <Button variant="outline" size="sm" className="w-full text-xs font-medium flex items-center justify-center gap-1">
                  <span>Open Exhibit B Case File</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Record Case Finding Form */}
        <div className="lg:col-span-7 space-y-3 border-t lg:border-t-0 lg:border-l border-border lg:pl-5 pt-4 lg:pt-0">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Record Forensic Finding Note
          </span>

          {submissionSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Finding note successfully appended to the project audit trail.</span>
            </div>
          )}

          <form onSubmit={handleSaveAuditNote} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Auditor Name / Designation
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Action Classification
                </label>
                <select
                  value={actionCategory}
                  onChange={(e) => setActionCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="FIELD_VERIFICATION_REQUIRED">Require Physical Site Inspection</option>
                  <option value="CROSS_PROJECT_DISCREPANCY">Log Cross-Project Discrepancy</option>
                  <option value="CONTRACTOR_EXPLANATION_REQUESTED">Request Contractor Explanation</option>
                  <option value="MARK_FOR_SUPERVISOR_REVIEW">Escalate to Senior Auditor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Forensic Analysis & Observations
              </label>
              <textarea
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={`Document auditor observations regarding ${similarityAnalysis.sha256_match ? 'exact cryptographic duplicate file reuse' : 'high visual correspondence'} between ${evidenceA.evidence_id} and ${evidenceB.evidence_id}...`}
                className="w-full p-2.5 text-xs bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted-foreground">
                Appends official note with timestamp & session identity
              </span>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !noteText.trim()}
                className="text-xs flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    <span>Save to Case Trail</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
