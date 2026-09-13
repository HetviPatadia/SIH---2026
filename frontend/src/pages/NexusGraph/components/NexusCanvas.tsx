import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Crosshair 
} from 'lucide-react';
import type { GraphNode, GraphEdge } from '../../../types/network';

interface NexusCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId?: string | null;
  onSelectNode: (node: GraphNode) => void;
  onSelectEdge: (edge: GraphEdge) => void;
  onDeselect: () => void;
  resolvedTheme: 'light' | 'dark';
}

export const NexusCanvas: React.FC<NexusCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onSelectEdge,
  onDeselect,
  resolvedTheme,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [layoutMode, setLayoutMode] = useState<'cose' | 'concentric' | 'circle'>('cose');

  // Theme palette tokens
  const isDark = resolvedTheme === 'dark';
  const labelColor = isDark ? '#f1f5f9' : '#1e293b';
  const edgeColor = isDark ? '#475569' : '#94a3b8';

  // Initialize and update cytoscape graph
  useEffect(() => {
    if (!containerRef.current) return;

    // Convert nodes to cytoscape element format
    const cyElements: cytoscape.ElementDefinition[] = [];

    nodes.forEach((n) => {
      let bg = '#64748b'; // default slate
      let size = 38;

      if (n.type === 'PROJECT') {
        if (n.risk_level === 'CRITICAL') bg = '#ef4444';
        else if (n.risk_level === 'HIGH') bg = '#f97316';
        else if (n.risk_level === 'MEDIUM') bg = '#3b82f6';
        else bg = isDark ? '#475569' : '#64748b';
      } else if (n.type === 'CONTRACTOR') {
        size = 46;
        bg = '#f59e0b'; // amber
      } else if (n.type === 'DISTRICT') {
        size = 42;
        bg = '#10b981'; // emerald
      } else if (n.type === 'EVIDENCE' || n.type === 'PHOTO') {
        size = 34;
        bg = '#8b5cf6'; // purple
      }

      // Truncate label for readability inside graph
      const shortLabel = n.label.length > 20 ? `${n.label.substring(0, 18)}...` : n.label;

      cyElements.push({
        group: 'nodes',
        data: {
          id: n.id,
          label: shortLabel,
          fullLabel: n.label,
          type: n.type,
          risk_level: n.risk_level || 'LOW',
          score: n.score || 0,
          rawNode: n,
          bgColor: bg,
          nodeSize: size,
        },
      });
    });

    edges.forEach((e, idx) => {
      const edgeId = `edge_${e.source}_${e.target}_${e.relation}_${idx}`;
      let lineStyle = 'solid';
      let lineColor = edgeColor;
      let width = 1.5;

      if (e.relation === 'LOCATED_IN') {
        lineStyle = 'dashed';
        lineColor = isDark ? '#64748b' : '#94a3b8';
      } else if (e.relation === 'ASSOCIATED_WITH') {
        lineStyle = 'dotted';
        lineColor = '#8b5cf6';
        width = 2;
      } else if (e.relation === 'POTENTIAL_EVIDENCE_REUSE') {
        lineStyle = 'solid';
        lineColor = '#f43f5e'; // rose/alert
        width = 2.5;
      } else if (e.relation === 'AWARDED_TO') {
        lineStyle = 'solid';
        lineColor = isDark ? '#94a3b8' : '#64748b';
        if (e.relationship_count && e.relationship_count > 1) {
          width = Math.min(4, 1.5 + e.relationship_count * 0.3);
        }
      }

      cyElements.push({
        group: 'edges',
        data: {
          id: edgeId,
          source: e.source,
          target: e.target,
          relation: e.relation,
          weight: e.weight || 1,
          explanation: e.explanation,
          rawEdge: e,
          lineStyle: lineStyle,
          lineColor: lineColor,
          edgeWidth: width,
        },
      });
    });

    // Destroy existing instance before creating new one
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: cyElements,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(bgColor)',
            'width': 'data(nodeSize)',
            'height': 'data(nodeSize)',
            'label': 'data(label)',
            'color': labelColor,
            'font-size': '10px',
            'font-weight': 600,
            'font-family': 'Inter, system-ui, sans-serif',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'text-background-opacity': isDark ? 0.75 : 0.85,
            'text-background-color': isDark ? '#0f172a' : '#ffffff',
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
            'border-width': 2,
            'border-color': isDark ? '#334155' : '#cbd5e1',
            'transition-property': 'background-color, border-color, border-width, opacity',
            'transition-duration': 200,
          },
        },
        {
          selector: 'node[type = "PROJECT"]',
          style: {
            'shape': 'round-rectangle',
          },
        },
        {
          selector: 'node[type = "CONTRACTOR"]',
          style: {
            'shape': 'diamond',
          },
        },
        {
          selector: 'node[type = "DISTRICT"]',
          style: {
            'shape': 'round-pentagon',
          },
        },
        {
          selector: 'node[type = "EVIDENCE"], node[type = "PHOTO"]',
          style: {
            'shape': 'rectangle',
          },
        },
        {
          selector: 'node:selected, node.highlighted',
          style: {
            'border-width': 3.5,
            'border-color': '#38bdf8', // sky/cyan focus ring
            'border-opacity': 1,
            'text-background-color': '#38bdf8',
            'text-background-opacity': 0.2,
            'z-index': 999,
          },
        },
        {
          selector: 'node.dimmed',
          style: {
            'opacity': 0.25,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 'data(edgeWidth)',
            'line-color': 'data(lineColor)',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': 'data(lineColor)',
            'arrow-scale': 0.9,
            'curve-style': 'bezier',
            'opacity': 0.85,
            'transition-property': 'line-color, width, opacity',
            'transition-duration': 200,
          },
        },
        {
          selector: 'edge[lineStyle = "dashed"]',
          style: {
            'line-style': 'dashed',
          },
        },
        {
          selector: 'edge[lineStyle = "dotted"]',
          style: {
            'line-style': 'dotted',
          },
        },
        {
          selector: 'edge[lineStyle = "solid"]',
          style: {
            'line-style': 'solid',
          },
        },
        {
          selector: 'edge.highlighted',
          style: {
            'width': 3.5,
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            'opacity': 1,
            'z-index': 999,
          },
        },
        {
          selector: 'edge.dimmed',
          style: {
            'opacity': 0.15,
          },
        },
      ],
      layout: {
        name: layoutMode,
        animate: false,
        padding: 40,
        ...(layoutMode === 'cose'
          ? {
              nodeRepulsion: () => 4500,
              idealEdgeLength: () => 70,
              edgeElasticity: () => 0.45,
              nestingFactor: 0.1,
              gravity: 0.35,
              numIter: 600,
            }
          : {}),
      },
    });

    // Event listener: node click
    cy.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target;
      const raw = node.data('rawNode') as GraphNode;

      // Highlight neighborhood
      cy.elements().removeClass('highlighted dimmed');
      const neighborhood = node.neighborhood().add(node);
      cy.elements().difference(neighborhood).addClass('dimmed');
      neighborhood.addClass('highlighted');

      onSelectNode(raw);
    });

    // Event listener: edge click
    cy.on('tap', 'edge', (evt: EventObject) => {
      const edge = evt.target;
      const raw = edge.data('rawEdge') as GraphEdge;

      cy.elements().removeClass('highlighted dimmed');
      edge.addClass('highlighted');
      edge.source().addClass('highlighted');
      edge.target().addClass('highlighted');

      onSelectEdge(raw);
    });

    // Event listener: background tap (deselect)
    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        cy.elements().removeClass('highlighted dimmed');
        onDeselect();
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [nodes, edges, layoutMode, isDark, labelColor, edgeColor, onSelectNode, onSelectEdge, onDeselect]);

  // Handle external selection update (e.g. from props)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (selectedNodeId) {
      const targetNode = cy.getElementById(selectedNodeId);
      if (targetNode.length > 0) {
        cy.elements().removeClass('highlighted dimmed');
        const neighborhood = targetNode.neighborhood().add(targetNode);
        cy.elements().difference(neighborhood).addClass('dimmed');
        neighborhood.addClass('highlighted');
        // Smooth center on node
        cy.animate({
          center: { eles: targetNode },
          zoom: Math.max(cy.zoom(), 1.2),
          duration: 350,
        });
      }
    } else {
      cy.elements().removeClass('highlighted dimmed');
    }
  }, [selectedNodeId]);

  // Toolbar Actions
  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.25);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 35);
    }
  };

  const handleCenter = () => {
    if (cyRef.current) {
      if (selectedNodeId) {
        const node = cyRef.current.getElementById(selectedNodeId);
        if (node.length > 0) {
          cyRef.current.center(node);
          return;
        }
      }
      cyRef.current.center();
    }
  };

  return (
    <div className="relative w-full h-[580px] lg:h-[660px] bg-card/60 dark:bg-card/40 border border-border rounded-xl overflow-hidden shadow-xs flex flex-col">
      {/* Cytoscape DOM container */}
      <div 
        ref={containerRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating Toolbar Controls (Top Right) */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/80 backdrop-blur-md rounded-lg p-1 border border-border shadow-xs z-10">
        <button
          onClick={handleZoomIn}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          title="Zoom in (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          title="Zoom out (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleFit}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          title="Fit graph to view"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleCenter}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          title="Center view"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
        <div className="h-3 w-px bg-border my-auto mx-0.5" />
        {/* Layout Mode Selector */}
        <select
          value={layoutMode}
          onChange={(e) => setLayoutMode(e.target.value as 'cose' | 'concentric' | 'circle')}
          className="bg-transparent border-none text-[11px] font-medium text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer px-1"
          title="Graph layout algorithm"
        >
          <option value="cose">Force-Directed (Cose)</option>
          <option value="concentric">Concentric Hierarchy</option>
          <option value="circle">Circular Topology</option>
        </select>
      </div>

      {/* Graph Legend Overlay (Bottom Left) */}
      <div className="absolute bottom-3 left-3 bg-background/85 backdrop-blur-md border border-border rounded-lg p-2.5 shadow-xs text-xs space-y-1.5 z-10 pointer-events-auto max-w-xs">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Legend</span>
          <span className="text-[9px] opacity-70">Click node to inspect</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shrink-0" />
            <span className="text-foreground">Project</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-amber-500 shrink-0" />
            <span className="text-foreground">Contractor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-foreground">District</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-purple-500 shrink-0" />
            <span className="text-foreground">Evidence</span>
          </div>
        </div>
        <div className="pt-1 border-t border-border/60 text-[10px] text-muted-foreground space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-muted-foreground" />
            <span>Awarded / Located</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-rose-500" />
            <span className="text-rose-600 dark:text-rose-400 font-medium">Potential Evidence Reuse</span>
          </div>
        </div>
      </div>
    </div>
  );
};
