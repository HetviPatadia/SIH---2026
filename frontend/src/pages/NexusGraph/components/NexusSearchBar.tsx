import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building2, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../../../api/endpoints';

interface ContractorOption {
  name: string;
  projectCount?: number;
  highPriorityCount?: number;
}

interface NexusSearchBarProps {
  selectedContractor: string | null;
  onSelectContractor: (name: string) => void;
  onClearContractor: () => void;
  isLoading: boolean;
}

export const NexusSearchBar: React.FC<NexusSearchBarProps> = ({
  selectedContractor,
  onSelectContractor,
  onClearContractor,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState(selectedContractor || '');
  const [isOpen, setIsOpen] = useState(false);
  const [contractorOptions, setContractorOptions] = useState<ContractorOption[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state when selectedContractor prop changes
  useEffect(() => {
    setSearchTerm(selectedContractor || '');
  }, [selectedContractor]);

  // Pre-load common contractors on mount
  useEffect(() => {
    let active = true;
    api.network.getGraph({ node_type: 'CONTRACTOR', limit: 250 })
      .then((res) => {
        if (!active || !res?.nodes) return;
        const contractors = res.nodes
          .filter((n) => n.type === 'CONTRACTOR')
          .map((n) => ({
            name: n.label,
            projectCount: (n.metadata?.project_count as number) || 1,
            highPriorityCount: (n.metadata?.high_priority_projects as number) || 0,
          }))
          .sort((a, b) => (b.projectCount || 0) - (a.projectCount || 0));

        setContractorOptions(contractors);
      })
      .catch((err) => {
        console.error('Failed to load contractor options:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  // Close dropdown on click outside or ESC key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filter options based on search term
  const filteredOptions = contractorOptions.filter((opt) =>
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (name: string) => {
    setSearchTerm(name);
    setIsOpen(false);
    onSelectContractor(name);
  };

  const handleClear = () => {
    setSearchTerm('');
    onClearContractor();
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      const match = filteredOptions[0];
      if (match) {
        handleSelect(match.name);
      } else {
        handleSelect(searchTerm.trim());
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto z-40">
      <form onSubmit={handleSubmit} className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Search contractor name (e.g. Sharma, Apex, Bharat, Ganesh)..."
          className="w-full pl-10 pr-10 py-3 text-xs md:text-sm bg-surface dark:bg-[#111827] border border-border dark:border-[#263248] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground placeholder:text-muted-foreground/60 shadow-md transition-all"
        />

        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground p-1"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Autocomplete Dropdown:
          - 100% solid opaque background (bg-white dark:bg-[#111827])
          - absolute left-0 right-0 top-full: perfectly locked to search bar width & alignment
          - z-50 with shadow-2xl: cleanly covers the empty state underneath without bleed-through
      */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#263248] rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1e293b]">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#161f30] sticky top-0 border-b border-slate-200 dark:border-[#263248] flex items-center justify-between">
            <span>
              {filteredOptions.length > 0
                ? `${filteredOptions.length} contractor${filteredOptions.length !== 1 ? 's' : ''} found`
                : 'No matching contractors'}
            </span>
            <span className="text-[9px] font-normal lowercase tracking-normal text-muted-foreground">
              esc to close
            </span>
          </div>

          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={() => handleSelect(opt.name)}
                className={`w-full px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-[#1e293b] flex items-center justify-between text-xs transition-colors group cursor-pointer ${
                  selectedContractor === opt.name ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-800 dark:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate group-hover:text-primary transition-colors font-medium">
                    {opt.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {opt.highPriorityCount !== undefined && opt.highPriorityCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>{opt.highPriorityCount}</span>
                    </span>
                  )}
                  {opt.projectCount !== undefined && (
                    <span className="text-[11px] font-mono text-muted-foreground bg-slate-100 dark:bg-[#1e293b] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {opt.projectCount}P
                    </span>
                  )}
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground bg-white dark:bg-[#111827]">
              Press Enter to search &quot;{searchTerm}&quot; directly across all database records
            </div>
          )}
        </div>
      )}
    </div>
  );
};
