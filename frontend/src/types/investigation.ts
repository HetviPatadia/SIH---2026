export type InvestigationStatus = 
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'VERIFICATION_REQUIRED'
  | 'VERIFIED'
  | 'DISMISSED'
  | 'ESCALATED'
  | 'CLOSED';

export interface InvestigationNote {
  id: number;
  case_id?: string;
  author: string;
  note_text: string;
  action_taken?: string | null;
  created_at: string;
}

export interface InvestigationCase {
  case_id: string;
  project_id: string;
  assigned_to?: string | null;
  status: InvestigationStatus;
  priority: string;
  created_at: string;
  updated_at: string;
  notes: InvestigationNote[];
}

export interface CaseSummaryResponse {
  total_reviews: number;
  new: number;
  under_review: number;
  verification_required: number;
  verified: number;
  dismissed: number;
  escalated: number;
  closed: number;
  high_priority_reviews: number;
  critical_priority_reviews: number;
}
