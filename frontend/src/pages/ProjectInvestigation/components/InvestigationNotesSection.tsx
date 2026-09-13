import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type { InvestigationNote } from '../../../types/investigation';
import { MessageSquare, Send, User, Calendar, CheckSquare, Plus } from 'lucide-react';

interface InvestigationNotesSectionProps {
  caseId?: string | null;
  notes: InvestigationNote[];
  onAddNote: (noteText: string, actionTaken?: string, author?: string) => Promise<void>;
}

export const InvestigationNotesSection: React.FC<InvestigationNotesSectionProps> = ({
  caseId,
  notes,
  onAddNote,
}) => {
  const [noteText, setNoteText] = useState<string>('');
  const [actionTaken, setActionTaken] = useState<string>('');
  const [author, setAuthor] = useState<string>('Auditor');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await onAddNote(noteText.trim(), actionTaken.trim() || undefined, author.trim() || 'Auditor');
      setNoteText('');
      setActionTaken('');
      setShowForm(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record audit note';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="border-border shadow-xs space-y-4">
      <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span>Audit Findings & Investigator Notes</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-muted text-muted-foreground border border-border">
              {notes.length} Records
            </span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Administrative record of human verification actions, site inspection notes, and evidence reviews
          </CardDescription>
        </div>

        {!showForm && caseId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Add Note
          </Button>
        )}
      </CardHeader>

      <div className="p-4 space-y-4">
        {/* Add Note Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 rounded-lg border border-primary/30 bg-surface-muted/30 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Record New Audit Finding</span>
              <span className="text-[11px] font-mono text-muted-foreground">Case: {caseId}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Auditor / Author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Lead Auditor Rao"
                className="text-xs"
                required
              />
              <Input
                label="Action Taken / Decision"
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="e.g. Physical site inspection requested"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-foreground">
                Audit Observation / Verification Note
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                placeholder="Record specific observations regarding spatial overlap, expenditure justification, or field photo verification..."
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                required
              />
            </div>

            {submitError && (
              <p className="text-xs text-danger">{submitError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
                className="text-xs text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !noteText.trim()}
                leftIcon={<Send className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                {submitting ? 'Saving Note...' : 'Save Finding to Case'}
              </Button>
            </div>
          </form>
        )}

        {/* Existing Notes List */}
        {notes.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs font-medium text-foreground">No audit notes currently recorded for this work.</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              {caseId
                ? 'Auditors can log preliminary desk review observations or request field physical verification using the button above.'
                : 'A formal case record will be created upon initial verification triage.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-3.5 rounded-lg border border-border bg-surface space-y-2 text-xs leading-relaxed"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-[11px] pb-1 border-b border-border/40">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <User className="w-3 h-3 text-primary shrink-0" />
                    <span>{note.author}</span>
                  </div>

                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(note.created_at)}</span>
                  </div>
                </div>

                <p className="text-foreground">{note.note_text}</p>

                {note.action_taken && (
                  <div className="pt-1 flex items-center gap-1.5 text-[11px] text-primary font-medium">
                    <CheckSquare className="w-3 h-3" />
                    <span>Action: {note.action_taken}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
