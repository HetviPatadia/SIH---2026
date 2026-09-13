import React, { useState, useEffect } from 'react';
import { Star, X, CheckCircle, Sparkles, ThumbsUp } from 'lucide-react';
import { usePublicLanguage } from '../../context/PublicLanguageContext';
import { api } from '../../api/endpoints';

interface CitizenReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Record<string, any> | null;
  onReviewSubmitted?: () => void;
}

export const CitizenReviewModal: React.FC<CitizenReviewModalProps> = ({
  isOpen,
  onClose,
  project,
  onReviewSubmitted,
}) => {
  const { t } = usePublicLanguage();

  const [overallRating, setOverallRating] = useState<number>(5);
  const [qualityRating, setQualityRating] = useState<number>(5);
  const [timelineRating, setTimelineRating] = useState<number>(5);
  const [utilityRating, setUtilityRating] = useState<number>(5);
  const [transparencyRating, setTransparencyRating] = useState<number>(5);

  const [feedbackText, setFeedbackText] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>('');
  const [reviewerContact, setReviewerContact] = useState<string>('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(true);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedReviewId, setSubmittedReviewId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOverallRating(5);
      setQualityRating(5);
      setTimelineRating(5);
      setUtilityRating(5);
      setTransparencyRating(5);
      setFeedbackText('');
      setReviewerName('');
      setReviewerContact('');
      setWouldRecommend(true);
      setSubmittedReviewId(null);
      setErrorMsg(null);
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackText.trim().length < 10) {
      setErrorMsg(t('review.feedbackTooShort', 'Feedback comments must be at least 10 characters in length.'));
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.public.submitReview({
        project_id: project.project_id,
        project_title: project.title || project.description || project.project_id,
        overall_rating: overallRating,
        quality_rating: qualityRating,
        timeline_rating: timelineRating,
        utility_rating: utilityRating,
        transparency_rating: transparencyRating,
        feedback_text: feedbackText.trim(),
        reviewer_name: reviewerName.trim() || undefined,
        reviewer_contact: reviewerContact.trim() || undefined,
        would_recommend: wouldRecommend,
      });

      setSubmittedReviewId(res.review_id);
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setErrorMsg(err.message || 'Failed to submit review. Please check requirements.');
    } finally {
      setSubmitting(false);
    }
  };

  const StarPicker: React.FC<{
    label: string;
    value: number;
    onChange: (val: number) => void;
  }> = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-muted border border-border">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 text-warning transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={`w-4 h-4 ${
                star <= value ? 'fill-warning text-warning' : 'text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
        <span className="text-xs font-mono font-bold text-foreground w-4 text-right ml-1">
          {value}
        </span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
          <div>
            <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 border border-primary/20 inline-block">
              {t('review.rateProject', 'Rate & Review Project')}
            </span>
            <h3 className="text-base font-bold text-foreground leading-snug mt-1">
              {project.title || project.project_id}
            </h3>
            <p className="text-xs text-muted-foreground">
              {project.district}, {project.state} &middot; ID: {project.project_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedReviewId ? (
          /* Success Screen */
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto border border-success/30">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-foreground">
                {t('review.reviewSuccessTitle', 'Thank You! Your Review Has Been Recorded')}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                {t('review.reviewSuccessDesc', 'Your multi-factor rating and feedback comments have been logged to the public ledger.')}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-muted border border-border inline-block text-left text-xs space-y-1 font-mono">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Review Reference ID</span>
              <span className="font-bold text-foreground">{submittedReviewId}</span>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs"
              >
                {t('modal.closeBtn', 'Close')}
              </button>
            </div>
          </div>
        ) : (
          /* Form Screen */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs">
                {errorMsg}
              </div>
            )}

            {/* Factor Star Pickers */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                {t('review.factorBreakdown', 'Multi-Factor Rating Breakdown')}
              </span>

              <StarPicker
                label={t('review.overallRating', 'Overall Satisfaction Rating')}
                value={overallRating}
                onChange={setOverallRating}
              />
              <StarPicker
                label={t('review.workQuality', 'Construction & Work Quality')}
                value={qualityRating}
                onChange={setQualityRating}
              />
              <StarPicker
                label={t('review.timelineSpeed', 'Timeline & Execution Speed')}
                value={timelineRating}
                onChange={setTimelineRating}
              />
              <StarPicker
                label={t('review.communityBenefit', 'Community Benefit & Public Utility')}
                value={utilityRating}
                onChange={setUtilityRating}
              />
              <StarPicker
                label={t('review.costTransparency', 'Cost & Info Transparency')}
                value={transparencyRating}
                onChange={setTransparencyRating}
              />
            </div>

            {/* Recommendation Checkbox */}
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-muted border border-border cursor-pointer select-none">
              <input
                type="checkbox"
                checked={wouldRecommend}
                onChange={(e) => setWouldRecommend(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <ThumbsUp className="w-3.5 h-3.5 text-success" />
                {t('review.wouldRecommend', 'Would recommend this project to local community')}
              </span>
            </label>

            {/* Written Feedback Comments Portion */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                {t('review.feedbackComments', 'Citizen Feedback & Detailed Review')} <span className="text-danger">*</span>
              </label>
              <textarea
                rows={3}
                required
                minLength={10}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={t(
                  'review.feedbackPlaceholder',
                  'Share your observations about construction durability, community impact, site maintenance, or completion speed...'
                )}
                className="w-full p-3 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Optional Citizen Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground block">
                  {t('review.reviewerName', 'Your Name (Optional)')}
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground block">
                  {t('review.reviewerContact', 'Email / Phone (Optional)')}
                </label>
                <input
                  type="text"
                  value={reviewerContact}
                  onChange={(e) => setReviewerContact(e.target.value)}
                  placeholder="For record verification"
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-surface-muted text-muted-foreground hover:text-foreground border border-border rounded-xl font-semibold text-xs"
              >
                {t('grievance.cancelBtn', 'Cancel')}
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{submitting ? t('review.submittingReview', 'Submitting...') : t('review.submitReviewBtn', 'Submit Citizen Review & Feedback')}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
