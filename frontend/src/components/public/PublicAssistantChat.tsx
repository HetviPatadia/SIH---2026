import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  RotateCcw,
  Info,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api } from '../../api/endpoints';
import type { PublicProjectFilters } from './LocationFilterBar';
import { usePublicLanguage } from '../../context/PublicLanguageContext';

interface PublicAssistantChatProps {
  activeFilters: PublicProjectFilters;
  onApplyFilters: (filters: PublicProjectFilters) => void;
  onResetFilters?: () => void;
  isFloating?: boolean;
  onCloseFloating?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  language?: string;
  source?: string;
  intent?: string;
  filtersApplied?: PublicProjectFilters;
  resultCount?: number;
  previews?: Array<Record<string, any>>;
  isAmbiguous?: boolean;
  ambiguousOptions?: string[];
  timestamp: string;
}

export const PublicAssistantChat: React.FC<PublicAssistantChatProps> = ({
  activeFilters,
  onApplyFilters,
  isFloating = false,
  onCloseFloating,
}) => {
  const { language, t } = usePublicLanguage();

  const samplePrompts = [
    { label: 'English', text: t('assistant.prompts.0', 'How many completed works are in Rajkot?') },
    { label: 'Hindi', text: t('assistant.prompts.1', 'Show road projects in Gujarat') },
    { label: 'Financial', text: t('assistant.prompts.2', 'Total funds sanctioned for drinking water') },
    { label: 'Contractor', text: t('assistant.prompts.3', 'Who is the contractor for community halls?') },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: t('assistant_welcome', 'Namaste! I am the MPLADS Public Assistant. Ask me any question in English, Hindi (हिन्दी), or Gujarati (ગુજરાતી) about public development projects.'),
      source: 'Public Portal project records',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>(t('assistant.thinking', 'Understanding your question...'));

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || loading) return;

    const userMsgId = `usr_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);
    setLoadingStep(t('assistant.thinking', 'Understanding your question...'));

    const stepTimer = setTimeout(() => {
      setLoadingStep(t('assistant.searchingDb', 'Checking verified project records...'));
    }, 450);

    try {
      const activeClean = {
        state: activeFilters.state || null,
        district: activeFilters.district || null,
        constituency: activeFilters.constituency || null,
        block: activeFilters.block || null,
        village: activeFilters.village || null,
        sector: activeFilters.sector || null,
        status: activeFilters.status || null,
      };

      const res = await api.public.assistantChat({
        message: textToSend,
        active_filters: activeClean,
        language: language,
      });

      clearTimeout(stepTimer);

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        language: res.language,
        intent: res.intent,
        filtersApplied: res.filters_applied as PublicProjectFilters,
        resultCount: res.result_count,
        source: 'Public Project Database',
        previews: res.previews,
        isAmbiguous: res.is_ambiguous,
        ambiguousOptions: res.ambiguous_options,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

      // If backend dispatched action to apply filters, update UI automatically
      if (res.actions && res.actions.length > 0) {
        const action = res.actions.find((a) => a.type === 'APPLY_PUBLIC_FILTERS');
        if (action && action.filters) {
          onApplyFilters(action.filters as PublicProjectFilters);
        }
      }
    } catch (err: any) {
      clearTimeout(stepTimer);
      console.error('Public Assistant Error:', err);

      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: 'The AI assistant is temporarily unavailable. You can still search and filter public works directly below.',
        source: 'System Fallback',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearConversation = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: t('assistant_welcome', 'Conversation reset. Ask a new question about public development works.'),
        source: 'Public Portal project records',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className={`bg-surface border border-border rounded-xl shadow-lg flex flex-col overflow-hidden ${isFloating ? 'h-[540px] w-full sm:w-[420px]' : 'h-[520px] w-full'}`}>
      {/* Header */}
      <header className="px-4 py-3 bg-surface-elevated border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground tracking-tight">
                {t('assistant.name', t('assistant_name', 'MPLADS Public Assistant'))}
              </h2>
              <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-success/10 border border-success/30 text-success">
                Public Verified
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t('assistant.subtitle', t('assistant_subtitle', 'Ask questions about projects, budgets, locations, and contractors'))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClearConversation}
            title={t('assistant.clearChat', 'New Conversation')}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-muted rounded-md transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {isFloating && onCloseFloating && (
            <button
              onClick={onCloseFloating}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-muted rounded-md transition-colors"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </header>

      {/* Messages List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-background/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-primary text-primary-foreground font-medium rounded-br-xs'
                  : 'bg-surface-elevated border border-border text-foreground rounded-bl-xs space-y-2'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* Ambiguous options buttons */}
              {msg.isAmbiguous && msg.ambiguousOptions && (
                <div className="pt-2 flex flex-col gap-1.5">
                  {msg.ambiguousOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleSend(`Projects in ${opt}`)}
                      className="text-left px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-primary/10 border border-border text-primary font-medium text-xs transition-colors flex items-center justify-between"
                    >
                      <span>{opt}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              )}

              {/* Previews / Cards inside Assistant Response */}
              {msg.previews && msg.previews.length > 0 && (
                <div className="pt-2 space-y-2 border-t border-border/60">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">
                    Matching Public Works ({msg.resultCount})
                  </span>
                  <div className="space-y-1.5">
                    {msg.previews.slice(0, 3).map((item: any) => (
                      <div
                        key={item.project_id}
                        className="p-2 rounded-lg bg-surface-muted/70 border border-border/80 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between gap-1 font-semibold text-foreground">
                          <span className="truncate">{item.title}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border">
                            {item.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                          <span>{item.district}, {item.state} &middot; {item.sector}</span>
                          <span className="font-mono font-medium text-foreground">₹{(item.sanctioned_amount / 100000).toFixed(2)} {t('metrics.lakhs', 'Lakh')}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(
                              new CustomEvent('OPEN_PUBLIC_PROJECT_MODAL', {
                                detail: { projectId: item.project_id, project: item },
                              })
                            );
                          }}
                          className="w-full mt-1.5 px-2 py-1 rounded bg-surface hover:bg-surface-elevated border border-border text-[10px] text-primary font-semibold flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span>{t('assistant.viewProjectCTA', t('view_public_details', 'Open Project Record'))}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {msg.filtersApplied && (
                    <button
                      onClick={() => onApplyFilters(msg.filtersApplied!)}
                      className="w-full mt-2 py-1.5 px-3 rounded-lg bg-primary text-primary-foreground font-semibold text-xs transition-opacity hover:opacity-90 flex items-center justify-center gap-1.5"
                    >
                      <span>{t('assistant.applyFilterCTA', 'Filter Projects Table & Map')} ({msg.resultCount})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Source Tag */}
              {msg.sender === 'assistant' && (
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/40">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-success" />
                    {msg.source || 'Public project dataset'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-start">
            <div className="bg-surface-elevated border border-border rounded-2xl rounded-bl-xs px-4 py-3 text-xs text-muted-foreground flex items-center gap-2 shadow-xs">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span>{loadingStep}</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Sample Quick Prompts Carousel */}
      <div className="px-3 py-2 bg-surface-muted/50 border-t border-border overflow-x-auto whitespace-nowrap flex items-center gap-1.5 no-scrollbar">
        <span className="text-[10px] font-mono font-semibold uppercase text-muted-foreground px-1 shrink-0">
          {t('assistant.suggestedQuestions', t('examples', 'Suggested Inquiries:'))}
        </span>
        {samplePrompts.map((p) => (
          <button
            key={p.text}
            onClick={() => handleSend(p.text)}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground transition-colors shrink-0"
          >
            "{p.text}"
          </button>
        ))}
      </div>

      {/* Disclaimer Notice */}
      <div className="px-4 py-1.5 bg-surface-muted/30 border-t border-border/60 text-[10px] text-muted-foreground flex items-center gap-1.5">
        <Info className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="truncate">
          {t('assistant.disclaimer', t('demo_notice', 'Answers are grounded strictly in the public demonstration dataset. Internal audit information is restricted.'))}
        </span>
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-surface border-t border-border flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('assistant.inputPlaceholder', t('ask_input_placeholder', 'Ask in English, हिन्दी, or ગુજરાતી...'))}
          className="flex-1 h-10 px-3.5 text-xs bg-surface-elevated border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="h-10 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50 transition-opacity shadow-xs"
        >
          <span>{t('ask_button', 'Ask')}</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
