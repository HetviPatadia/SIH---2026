import React, { useState } from 'react';
import { 
  Network, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import type { GraphEdge, GraphNode } from '../../../types/network';

interface NexusRelationshipTableProps {
  edges: GraphEdge[];
  nodes: GraphNode[];
  onSelectNode: (node: GraphNode) => void;
  onSelectEdge: (edge: GraphEdge) => void;
}

export const NexusRelationshipTable: React.FC<NexusRelationshipTableProps> = ({
  edges,
  nodes,
  onSelectNode,
  onSelectEdge,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterRel, setFilterRel] = useState<string>('');

  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const filteredEdges = filterRel
    ? edges.filter((e) => e.relation === filterRel)
    : edges;

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Textual Relationship Ledger</span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                {edges.length} Active Links
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tabular relationship summary ensuring accessible navigation and structured inspection of cross-record associations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span>{isOpen ? 'Hide Ledger' : 'Show Ledger'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Table */}
      {isOpen && (
        <div className="p-4 border-t border-border bg-muted/5 space-y-3">
          {/* Relation filter bar */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground">Filter by Relationship:</span>
            <select
              value={filterRel}
              onChange={(e) => setFilterRel(e.target.value)}
              className="bg-background border border-input rounded-md px-2 py-1 text-xs text-foreground focus:outline-none"
            >
              <option value="">All Relationships ({edges.length})</option>
              <option value="AWARDED_TO">AWARDED_TO</option>
              <option value="LOCATED_IN">LOCATED_IN</option>
              <option value="POTENTIAL_EVIDENCE_REUSE">POTENTIAL_EVIDENCE_REUSE</option>
              <option value="ASSOCIATED_WITH">ASSOCIATED_WITH</option>
            </select>
          </div>

          <div className="max-h-72 overflow-y-auto border border-border rounded-lg bg-background">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 px-3">Source Entity</th>
                  <th className="py-2 px-3">Relationship</th>
                  <th className="py-2 px-3">Target Entity</th>
                  <th className="py-2 px-3">Explanation</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEdges.map((e, idx) => {
                  const srcNode = nodeMap.get(e.source);
                  const tgtNode = nodeMap.get(e.target);

                  return (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 align-middle font-medium text-foreground">
                        {srcNode ? (
                          <button
                            onClick={() => onSelectNode(srcNode)}
                            className="hover:underline text-left text-primary"
                          >
                            {srcNode.label}
                          </button>
                        ) : (
                          <span>{e.source}</span>
                        )}
                      </td>

                      <td className="py-2 px-3 align-middle">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          e.relation === 'POTENTIAL_EVIDENCE_REUSE'
                            ? 'bg-destructive/15 text-destructive'
                            : e.relation === 'AWARDED_TO'
                            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {e.relation.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-2 px-3 align-middle font-medium text-foreground">
                        {tgtNode ? (
                          <button
                            onClick={() => onSelectNode(tgtNode)}
                            className="hover:underline text-left text-primary"
                          >
                            {tgtNode.label}
                          </button>
                        ) : (
                          <span>{e.target}</span>
                        )}
                      </td>

                      <td className="py-2 px-3 align-middle text-muted-foreground text-[11px] max-w-xs truncate" title={e.explanation}>
                        {e.explanation || 'Direct association'}
                      </td>

                      <td className="py-2 px-3 align-middle text-right">
                        <button
                          onClick={() => onSelectEdge(e)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium border border-border hover:bg-muted text-foreground transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
