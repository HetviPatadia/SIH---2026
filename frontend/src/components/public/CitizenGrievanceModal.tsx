import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertCircle, Send, Copy, Check, Search } from 'lucide-react';
import { api } from '../../api/endpoints';
import { usePublicLanguage } from '../../context/PublicLanguageContext';

interface CitizenGrievanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Record<string, any> | null;
  initialTab?: 'file' | 'track';
}

export const CitizenGrievanceModal: React.FC<CitizenGrievanceModalProps> = ({
  isOpen,
  onClose,
  project,
  initialTab = 'file',
}) => {
  const { t } = usePublicLanguage();

  const [activeTab, setActiveTab] = useState<'file' | 'track'>(initialTab);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [issueType, setIssueType] = useState('quality');
  const [description, setDescription] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenContact, setCitizenContact] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedTicketNumber, setSubmittedTicketNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Track Ticket State
  const [trackInput, setTrackInput] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackResult, setTrackResult] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (project) {
      setCompanyName(project.implementing_agency || 'Public Works Department (PWD)');
      setContractorName(project.contractor_name || 'Apex Infrastructure Ltd');
      setIssueType('quality');
      setDescription('');
      setCitizenName('');
      setCitizenContact('');
      setError(null);
      setSubmittedTicketNumber(null);
      setCopied(false);
    }
  }, [project]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 20) {
      setError(t('grievance.descriptionPlaceholder', t('description_placeholder', 'Description must be at least 20 characters long.')));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.public.submitGrievance({
        project_id: project?.project_id || 'GENERAL',
        project_title: project?.title || project?.description || project?.project_id || 'Public Work Complaint',
        company_name: companyName,
        contractor_name: contractorName,
        issue_type: issueType,
        description: description.trim(),
        citizen_name: citizenName.trim() || 'Anonymous',
        citizen_contact: citizenContact.trim() || undefined,
      });

      const ticketNo = res.ticket_number || res.grievance_id;
      setSubmittedTicketNumber(ticketNo);
    } catch (err: any) {
      console.error('Error submitting grievance:', err);
      setError(err?.message || 'Failed to submit grievance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTicket = () => {
    if (!submittedTicketNumber) return;
    navigator.clipboard.writeText(submittedTicketNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryNo = trackInput.trim();
    if (!queryNo) return;

    setTrackLoading(true);
    setTrackError(null);
    setTrackResult(null);

    try {
      const res = await api.public.trackGrievance(queryNo);
      setTrackResult(res);
    } catch (err: any) {
      console.error('Error tracking grievance:', err);
      setTrackError(err?.message || `Ticket '${queryNo}' not found in public records.`);
    } finally {
      setTrackLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/30 text-warning flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                {activeTab === 'file' 
                  ? t('grievance.title', t('complaint_modal_title', 'File a Citizen Grievance / Complaint'))
                  : t('grievance.trackTitle', t('trackGrievance', 'Track Existing Grievance'))
                }
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {t('grievance.subtitle', t('complaint_modal_subtitle', 'This complaint will be permanently stored and associated with the project record.'))}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center p-1 bg-surface-muted rounded-xl border border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              activeTab === 'file' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('nav.fileGrievance', t('fileGrievance', 'File Complaint'))}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('track')}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              activeTab === 'track' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('nav.trackGrievance', t('trackGrievance', 'Track Grievance'))}
          </button>
        </div>

        {/* TAB 1: FILE COMPLAINT */}
        {activeTab === 'file' && (
          submittedTicketNumber ? (
            /* Success Confirmation Screen */
            <div className="py-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-success/10 border border-success/30 text-success mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-foreground">
                  {t('grievance.ticketAssigned', t('grievance_submitted_title', 'Your Grievance Has Been Recorded'))}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t('grievance.saveTicketNotice', 'Please save this reference number to check grievance progress.')}
                </p>
              </div>

              {/* Reference ID Ticket Box */}
              <div className="p-4 rounded-xl bg-surface-muted border border-border text-center space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold font-mono block">
                  {t('grievance.ticketLabel', t('reference_id', 'Grievance Tracking Number'))}
                </span>
                <span className="text-xl font-extrabold text-primary font-mono select-all block">
                  {submittedTicketNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyTicket}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated border border-border text-xs font-semibold text-foreground transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success" />
                      <span className="text-success font-bold">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Reference ID</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTrackInput(submittedTicketNumber);
                    setActiveTab('track');
                  }}
                  className="flex-1 py-2 bg-surface-muted hover:bg-surface-elevated border border-border text-foreground font-semibold text-xs rounded-xl"
                >
                  {t('grievance.trackTitle', 'Track Status Now')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl"
                >
                  {t('modal.closeBtn', t('close', 'Close'))}
                </button>
              </div>
            </div>
          ) : (
            /* Complaint Submission Form */
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Read-Only Project Info */}
              {project && (
                <div className="p-3 rounded-xl bg-surface-muted/70 border border-border space-y-1">
                  <label className="text-[10px] font-mono uppercase font-semibold text-muted-foreground block">
                    {t('table.workTitle', t('project_name_id', 'Development Work Title'))}
                  </label>
                  <div className="font-bold text-foreground text-xs leading-snug">
                    {project.project_id} &middot; {project.title || project.description}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t('table.location', 'Location')}: {project.district}, {project.state} ({project.sector})
                  </div>
                </div>
              )}

              {/* Editable Implementing Agency / Department */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  {t('grievance.companyLabel', t('company_agency', 'Implementing Agency / Department'))}
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Public Works Department (PWD)"
                  className="w-full h-9 px-3 text-xs bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>

              {/* Editable Contractor Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  {t('grievance.contractorLabel', t('contractor_name', 'Contractor Name'))}
                </label>
                <input
                  type="text"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="e.g. Apex Infrastructure Ltd"
                  className="w-full h-9 px-3 text-xs bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>

              {/* Issue Type Category Dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  {t('grievance.issueTypeLabel', t('issue_type', 'Nature of Issue / Irregularity'))}
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  <option value="quality">{t('grievance.issues.quality', t('issue_quality', 'Substandard Construction / Material Quality'))}</option>
                  <option value="delay">{t('grievance.issues.delay', t('issue_delay', 'Unjustified Delay / Abandoned Site'))}</option>
                  <option value="financial">{t('grievance.issues.financial', t('issue_fund', 'Discrepancy in Sanctioned vs Ground Work'))}</option>
                  <option value="abandoned">{t('grievance.issues.notStarted', t('issue_abandoned', 'Work Sanctioned but Ground Work Not Started'))}</option>
                  <option value="other">{t('grievance.issues.other', t('issue_other', 'Other Public Grievance'))}</option>
                </select>
              </div>

              {/* Description Textarea */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    {t('grievance.descriptionLabel', t('description_label', 'Describe the Issue in Detail (Minimum 20 characters)'))}
                  </label>
                  <span className={`text-[10px] font-mono ${description.length < 20 ? 'text-destructive' : 'text-success'}`}>
                    {description.length} / 20 chars min
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder={t('grievance.descriptionPlaceholder', t('description_placeholder', 'State specific observations regarding quality, delays, incomplete works, or site status...'))}
                  className="w-full p-3 text-xs bg-surface-elevated border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium resize-none"
                />
              </div>

              {/* Optional Citizen Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    {t('grievance.nameLabel', t('citizen_name_label', 'Your Name (Optional)'))}
                  </label>
                  <input
                    type="text"
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    placeholder="Anonymous"
                    className="w-full h-9 px-3 text-xs bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    {t('grievance.contactLabel', t('citizen_contact_label', 'Phone / Email (Optional)'))}
                  </label>
                  <input
                    type="text"
                    value={citizenContact}
                    onChange={(e) => setCitizenContact(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-9 px-3 text-xs bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-surface-muted hover:bg-surface-elevated border border-border text-foreground font-semibold text-xs rounded-xl"
                >
                  {t('grievance.cancelBtn', t('close', 'Cancel'))}
                </button>
                <button
                  type="submit"
                  disabled={loading || description.trim().length < 20}
                  className="px-5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50 transition-opacity shadow-xs"
                >
                  <span>{loading ? t('grievance.submitting', t('submitting', 'Submitting...')) : t('grievance.submitBtn', t('submit_grievance', 'Submit Grievance to Official Record'))}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )
        )}

        {/* TAB 2: TRACK EXISTING GRIEVANCE */}
        {activeTab === 'track' && (
          <div className="space-y-4 text-xs">
            <form onSubmit={handleTrackSubmit} className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground">
                {t('grievance.enterTicketPlaceholder', 'Enter GRV-YYYYMMDD-XXXX')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={trackInput}
                  onChange={(e) => setTrackInput(e.target.value)}
                  placeholder="e.g. GRV-20260913-ABCD"
                  className="flex-1 h-10 px-3.5 text-xs font-mono uppercase bg-surface-elevated border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!trackInput.trim() || trackLoading}
                  className="h-10 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{t('table.actions', 'Track')}</span>
                </button>
              </div>
            </form>

            {trackLoading && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Checking public grievance ledger...
              </div>
            )}

            {trackError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{trackError}</span>
              </div>
            )}

            {trackResult && (
              <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block">Ticket Reference</span>
                    <span className="font-extrabold text-foreground text-sm">{trackResult.ticket_number}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-primary/10 border border-primary/30 text-primary">
                    {trackResult.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Official Status</span>
                    <span className="font-semibold text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      {t(`grievance.trackStatus.${trackResult.status?.toLowerCase()}`, trackResult.status_description || trackResult.status)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Project Details</span>
                    <p className="font-bold text-foreground">{trackResult.project_id} &middot; {trackResult.project_title}</p>
                  </div>

                  {trackResult.contractor_name && (
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Assigned Contractor</span>
                      <p className="text-foreground">{trackResult.contractor_name}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Complaint Description</span>
                    <p className="text-muted-foreground leading-relaxed bg-surface p-2.5 rounded-lg border border-border/60">
                      {trackResult.description}
                    </p>
                  </div>

                  <div className="text-[10px] text-muted-foreground font-mono pt-1">
                    Submitted on: {new Date(trackResult.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
