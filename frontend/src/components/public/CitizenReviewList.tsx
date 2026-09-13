import React, { useEffect, useState } from 'react';
import { Star, ThumbsUp, MessageSquare, Sparkles, UserCheck } from 'lucide-react';
import { usePublicLanguage } from '../../context/PublicLanguageContext';
import { api } from '../../api/endpoints';

interface CitizenReviewListProps {
  projectId: string;
  onOpenRateModal?: () => void;
}

export const CitizenReviewList: React.FC<CitizenReviewListProps> = ({
  projectId,
  onOpenRateModal,
}) => {
  const { t } = usePublicLanguage();
  const [data, setData] = useState<{
    project_id: string;
    total_reviews: number;
    average_overall: number;
    recommendation_percentage: number;
    factors: {
      overall: number;
      quality: number;
      timeline: number;
      utility: number;
      transparency: number;
    };
    reviews: Array<{
      review_id: string;
      overall_rating: number;
      quality_rating: number;
      timeline_rating: number;
      utility_rating: number;
      transparency_rating: number;
      feedback_text: string;
      reviewer_name?: string;
      would_recommend: boolean;
      created_at: string;
    }>;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.public
      .getProjectReviews(projectId)
      .then((res) => setData(res))
      .catch((err) => console.error('Failed to load project reviews:', err))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground bg-surface-muted rounded-xl border border-border">
        Loading citizen ratings and feedback...
      </div>
    );
  }

  if (!data) return null;

  const factors = data.factors || {
    overall: 4.5,
    quality: 4.5,
    timeline: 4.2,
    utility: 4.8,
    transparency: 4.5,
  };

  const FactorBar: React.FC<{ label: string; score: number }> = ({ label, score }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-mono font-bold text-foreground">{score.toFixed(1)} / 5</span>
      </div>
      <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden border border-border/50">
        <div
          className="h-full bg-warning rounded-full transition-all"
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header Summary Box */}
      <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-warning text-center">
              <span className="text-xl font-extrabold font-mono block leading-none">
                {data.average_overall.toFixed(1)}
              </span>
              <div className="flex items-center justify-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= Math.round(data.average_overall)
                        ? 'fill-warning text-warning'
                        : 'text-muted-foreground/40'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <span>{t('review.reviewsCount', 'Citizen Ratings & Feedback')}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface border border-border text-muted-foreground">
                  {data.total_reviews} reviews
                </span>
              </h4>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <ThumbsUp className="w-3.5 h-3.5 text-success" />
                <span>
                  <strong>{data.recommendation_percentage.toFixed(0)}%</strong> {t('review.recommendPercent', 'recommend this work')}
                </span>
              </p>
            </div>
          </div>

          {onOpenRateModal && (
            <button
              onClick={onOpenRateModal}
              className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('review.rateProject', 'Rate & Review')}</span>
            </button>
          )}
        </div>

        {/* Multi-Factor Rating Progress Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
          <FactorBar label={t('review.workQuality', 'Work Quality')} score={factors.quality} />
          <FactorBar label={t('review.timelineSpeed', 'Execution Speed')} score={factors.timeline} />
          <FactorBar label={t('review.communityBenefit', 'Community Benefit')} score={factors.utility} />
          <FactorBar label={t('review.costTransparency', 'Cost Transparency')} score={factors.transparency} />
        </div>
      </div>

      {/* Citizen Feedback Comments List */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span>{t('review.feedbackComments', 'Citizen Feedback')} ({data.reviews.length})</span>
        </h4>

        {data.reviews.length === 0 ? (
          <div className="p-4 text-center bg-surface border border-border rounded-xl text-xs text-muted-foreground">
            {t('review.noReviewsYet', 'No citizen reviews yet. Be the first to rate and review this project!')}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {data.reviews.map((rev) => (
              <div
                key={rev.review_id}
                className="p-3 rounded-xl bg-surface border border-border space-y-1.5 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold text-foreground">
                      {rev.reviewer_name || 'Anonymous Citizen'}
                    </span>
                    {rev.would_recommend && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-success/10 border border-success/30 text-success">
                        Recommends
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-warning font-bold">
                    <Star className="w-3 h-3 fill-warning text-warning" />
                    {rev.overall_rating} / 5
                  </div>
                </div>

                <p className="text-foreground leading-relaxed text-[11px] bg-surface-muted/50 p-2 rounded-lg border border-border/60">
                  "{rev.feedback_text}"
                </p>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Ref: {rev.review_id}</span>
                  <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
