import React from 'react';
import { Building2, ArrowRight, Network, Sparkles, MapPin, Layers } from 'lucide-react';

interface NexusEmptyStateProps {
  onSelectContractor: (name: string) => void;
}

export const NexusEmptyState: React.FC<NexusEmptyStateProps> = ({
  onSelectContractor,
}) => {
  const suggestedContractors = [
    { name: 'Apex Infrastructure Ltd', count: 213, cities: 25, alert: 'High Volume' },
    { name: 'Shree Ganesh Construction Co', count: 156, cities: 18, alert: 'Multi-District' },
    { name: 'Bharat Engineers & Builders', count: 128, cities: 13, alert: 'Active Works' },
    { name: 'Kisan Rural Developers', count: 135, cities: 16, alert: 'Rural Works' },
    { name: 'Surya Shakti Engineering', count: 115, cities: 14, alert: 'Infrastructure' },
    { name: 'Sai Urban Works Pvt Ltd', count: 119, cities: 15, alert: 'Urban Dev' },
  ];

  return (
    <div className="py-16 md:py-24 px-4 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
      {/* Central Pulsing Hero Icon */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm relative z-10">
          <Building2 className="w-8 h-8" />
        </div>
        {/* Subtle decorative pulsing rings */}
        <div className="absolute -inset-2 rounded-2xl border border-amber-500/20 animate-ping opacity-25" />
        <div className="absolute -inset-4 rounded-3xl border border-amber-500/10 animate-pulse opacity-40" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Contractor Nexus Graph
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
          Select a contractor to explore connected projects and their cities. View spatial project dispersion and audit priority concentrations across municipal boundaries.
        </p>
      </div>

      {/* Structural Hierarchy Preview */}
      <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs w-full max-w-md">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-center gap-1.5">
          <Network className="w-3 h-3 text-primary" />
          <span>Focused 3-Tier Hierarchy</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Contractor
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Projects
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Cities
          </span>
        </div>
      </div>

      {/* Quick Select Chips */}
      <div className="space-y-2.5 w-full pt-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Or Choose a Recommended Contractor to Inspect:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
          {suggestedContractors.map((c, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectContractor(c.name)}
              className="p-3 bg-card hover:bg-muted/40 border border-border hover:border-primary/40 rounded-xl flex items-center justify-between transition-all group shadow-xs cursor-pointer"
            >
              <div className="truncate mr-2">
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors block truncate">
                  {c.name}
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>{c.count} Projects</span>
                  <span>•</span>
                  <span>{c.cities} Cities</span>
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
