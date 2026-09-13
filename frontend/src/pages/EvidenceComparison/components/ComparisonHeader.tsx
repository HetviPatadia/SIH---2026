import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowLeftRight, 
  Search, 
  RotateCcw, 
  Printer, 
  Layers
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface ComparisonHeaderProps {
  evidenceIdA: string;
  evidenceIdB: string;
  onCompare: (idA: string, idB: string) => void;
  onSwap: () => void;
  onReset: () => void;
  isLoading: boolean;
  hasActiveComparison: boolean;
}

export const ComparisonHeader: React.FC<ComparisonHeaderProps> = ({
  evidenceIdA,
  evidenceIdB,
  onCompare,
  onSwap,
  onReset,
  isLoading,
  hasActiveComparison,
}) => {
  const [inputA, setInputA] = useState(evidenceIdA);
  const [inputB, setInputB] = useState(evidenceIdB);

  // Synchronize internal input state if props change externally
  React.useEffect(() => {
    setInputA(evidenceIdA);
  }, [evidenceIdA]);

  React.useEffect(() => {
    setInputB(evidenceIdB);
  }, [evidenceIdB]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputA.trim() && inputB.trim()) {
      onCompare(inputA.trim(), inputB.trim());
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-2 border-b border-border">
      {/* Top navigation & breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link 
            to="/evidence" 
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2.5 rounded-md hover:bg-muted"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Evidence Intelligence</span>
          </Link>
          <span className="text-muted-foreground/40 hidden sm:inline">|</span>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
            <Layers className="w-3 h-3" />
            <span>DUAL-EXHIBIT COMPARATOR</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveComparison && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="text-xs flex items-center gap-1.5"
                title="Print or export forensic dossier to PDF"
              >
                <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="hidden md:inline">Export Dossier</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="text-xs flex items-center gap-1.5"
                title="Clear current comparison"
              >
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Reset</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Title & Core Subtitle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span>Evidence Forensic Comparison</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-3xl">
            Side-by-side forensic analysis of photographic proof, cryptographic SHA-256 digests, and spatial-temporal metadata across MPLADS projects.
          </p>
        </div>
      </div>

      {/* Quick Pair Selector Bar */}
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-3 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          {/* Exhibit A input */}
          <div className="md:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-muted/80 text-foreground px-1.5 py-0.5 rounded border border-border">A</span>
            </div>
            <input
              type="text"
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              placeholder="Exhibit A Evidence ID (e.g. EV-MPL-00001-...)"
              className="w-full pl-10 pr-3 py-2 text-xs font-mono bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground/60 transition-colors"
            />
          </div>

          {/* Swap button */}
          <div className="md:col-span-1 flex justify-center">
            <button
              type="button"
              onClick={() => {
                const temp = inputA;
                setInputA(inputB);
                setInputB(temp);
                if (evidenceIdA && evidenceIdB) {
                  onSwap();
                }
              }}
              title="Swap Exhibit A and Exhibit B"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg border border-border transition-colors flex items-center justify-center"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Exhibit B input */}
          <div className="md:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-muted/80 text-foreground px-1.5 py-0.5 rounded border border-border">B</span>
            </div>
            <input
              type="text"
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              placeholder="Exhibit B Evidence ID (e.g. EV-MPL-00009-...)"
              className="w-full pl-10 pr-3 py-2 text-xs font-mono bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground/60 transition-colors"
            />
          </div>

          {/* Compare Action */}
          <div className="md:col-span-2 flex gap-1.5">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isLoading || !inputA.trim() || !inputB.trim()}
              className="w-full text-xs font-semibold py-2 flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Compare Pair</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
