import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Crosshair, 
  RotateCcw, 
  Play, 
  Pause 
} from 'lucide-react';
import type { ContractorInvestigationResponse, ContractorProjectItem } from '../../../types/network';

interface NexusMagneticCanvasProps {
  contractorData: ContractorInvestigationResponse;
  selectedProjectId: string | null;
  selectedCityName: string | null;
  onSelectProject: (project: ContractorProjectItem) => void;
  onSelectCity: (cityName: string, projects: ContractorProjectItem[]) => void;
  onSelectContractor: () => void;
  resolvedTheme: 'light' | 'dark';
}

interface SimNode {
  id: string;
  type: 'CONTRACTOR' | 'PROJECT' | 'CITY';
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  anchorX: number;
  anchorY: number;
  radius: number;
  color: string;
  borderColor: string;
  projectData?: ContractorProjectItem;
  cityData?: { cityName: string; projects: ContractorProjectItem[] };
}

interface SimEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'CONTRACTOR_TO_PROJECT' | 'PROJECT_TO_CITY';
}

export const NexusMagneticCanvas: React.FC<NexusMagneticCanvasProps> = ({
  contractorData,
  selectedProjectId,
  selectedCityName,
  onSelectProject,
  onSelectCity,
  onSelectContractor,
  resolvedTheme,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [isPhysicsActive, setIsPhysicsActive] = useState(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [visibleProjectLimit, setVisibleProjectLimit] = useState(12);

  const isDark = resolvedTheme === 'dark';

  // Measure container dimensions dynamically to guarantee 100% synchronized coordinates
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Filter and limit projects (sorted by Audit Priority descending)
  const sortedProjects = useMemo(() => {
    return [...(contractorData.projects || [])].sort((a, b) => {
      const pA = a.audit_priority ?? 0;
      const pB = b.audit_priority ?? 0;
      return pB - pA;
    });
  }, [contractorData.projects]);

  const displayedProjects = useMemo(() => {
    return sortedProjects.slice(0, visibleProjectLimit);
  }, [sortedProjects, visibleProjectLimit]);

  // Group displayed projects by city
  const cityGroups = useMemo(() => {
    const map = new Map<string, ContractorProjectItem[]>();
    displayedProjects.forEach((p) => {
      const city = p.district?.trim() || 'Unassigned City';
      if (!map.has(city)) {
        map.set(city, []);
      }
      map.get(city)!.push(p);
    });
    return map;
  }, [displayedProjects]);

  // Build simulation nodes and edges with target anchor orbits
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: SimNode[] = [];
    const edges: SimEdge[] = [];

    // 1. Central Contractor Node (Anchor at 0, 0)
    const contractorNode: SimNode = {
      id: `contractor_${contractorData.entity_id || 'root'}`,
      type: 'CONTRACTOR',
      label: contractorData.contractor,
      sublabel: 'Contractor',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      anchorX: 0,
      anchorY: 0,
      radius: 36,
      color: '#f59e0b',
      borderColor: '#b45309',
    };
    nodes.push(contractorNode);

    // 2. Project Nodes (Orbit 1, Radius ~ 210px)
    const R1 = 210;
    const projCount = displayedProjects.length;

    displayedProjects.forEach((p, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, projCount) - Math.PI / 2;
      const ax = Math.cos(angle) * R1;
      const ay = Math.sin(angle) * R1;

      // Color by Audit Priority
      const score = p.audit_priority ?? 0;
      let pColor = isDark ? '#475569' : '#64748b';
      let pBorder = isDark ? '#64748b' : '#94a3b8';

      if (p.priority_level === 'CRITICAL' || score >= 80) {
        pColor = '#ef4444';
        pBorder = '#b91c1c';
      } else if (p.priority_level === 'HIGH' || score >= 60) {
        pColor = '#f97316';
        pBorder = '#c2410c';
      } else if (p.priority_level === 'MEDIUM' || score >= 40) {
        pColor = '#3b82f6';
        pBorder = '#1d4ed8';
      }

      const pNodeId = `proj_${p.project_id}`;
      nodes.push({
        id: pNodeId,
        type: 'PROJECT',
        label: p.project_id,
        sublabel: p.title ? (p.title.length > 20 ? `${p.title.substring(0, 18)}...` : p.title) : p.sector,
        x: ax + (Math.random() - 0.5) * 6,
        y: ay + (Math.random() - 0.5) * 6,
        vx: 0,
        vy: 0,
        anchorX: ax,
        anchorY: ay,
        radius: 24,
        color: pColor,
        borderColor: pBorder,
        projectData: p,
      });

      // Edge: Contractor -> Project
      edges.push({
        id: `edge_c_${p.project_id}`,
        sourceId: contractorNode.id,
        targetId: pNodeId,
        type: 'CONTRACTOR_TO_PROJECT',
      });
    });

    // 3. City Nodes (Orbit 2, Radius ~ R1 + 105px = 315px)
    const R2 = R1 + 105;
    const cityList = Array.from(cityGroups.entries());

    // Calculate circular mean angle using atan2(sum(sin), sum(cos)) to prevent cross-graph edge detachment
    const resolvedCities = cityList.map(([cityName, projs]) => {
      let sumSin = 0;
      let sumCos = 0;
      projs.forEach((p) => {
        const pIdx = displayedProjects.findIndex((dp) => dp.project_id === p.project_id);
        const angle = (2 * Math.PI * (pIdx >= 0 ? pIdx : 0)) / Math.max(1, projCount) - Math.PI / 2;
        sumSin += Math.sin(angle);
        sumCos += Math.cos(angle);
      });
      let angle = Math.atan2(sumSin, sumCos);
      if (angle < 0) angle += 2 * Math.PI;
      return { cityName, projs, angle };
    }).sort((a, b) => a.angle - b.angle);

    // Enforce minimum angular spacing between adjacent cities to prevent overlap
    const minGap = 0.25; // ~14.3 degrees separation (~78px at R=315)
    for (let i = 1; i < resolvedCities.length; i++) {
      if (resolvedCities[i].angle - resolvedCities[i - 1].angle < minGap) {
        resolvedCities[i].angle = resolvedCities[i - 1].angle + minGap;
      }
    }

    resolvedCities.forEach(({ cityName, projs, angle }) => {
      const cx = Math.cos(angle) * R2;
      const cy = Math.sin(angle) * R2;

      const cityNodeId = `city_${cityName}`;
      nodes.push({
        id: cityNodeId,
        type: 'CITY',
        label: cityName,
        sublabel: projs.length > 1 ? `${projs.length} Projects` : 'City',
        x: cx + (Math.random() - 0.5) * 6,
        y: cy + (Math.random() - 0.5) * 6,
        vx: 0,
        vy: 0,
        anchorX: cx,
        anchorY: cy,
        radius: 20,
        color: '#10b981',
        borderColor: '#047857',
        cityData: { cityName, projects: projs },
      });

      // Edges: Each project -> City
      projs.forEach((p) => {
        edges.push({
          id: `edge_p_${p.project_id}_${cityName}`,
          sourceId: `proj_${p.project_id}`,
          targetId: cityNodeId,
          type: 'PROJECT_TO_CITY',
        });
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [contractorData, displayedProjects, cityGroups, isDark]);

  // Live simulation node coordinates stored in ref for 60fps physics
  const nodesRef = useRef<SimNode[]>(initialNodes);
  const edgesRef = useRef<SimEdge[]>(initialEdges);
  const [, setRenderTrigger] = useState(0);

  // Synchronize ref when contractor or projects change
  useEffect(() => {
    nodesRef.current = initialNodes;
    edgesRef.current = initialEdges;
    setRenderTrigger((r) => r + 1);
  }, [initialNodes, initialEdges]);

  // Soft Magnetic Force Simulation Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const tick = (time: number) => {
      const dt = Math.min(32, time - lastTime) / 1000;
      lastTime = time;

      if (isPhysicsActive) {
        const nodes = nodesRef.current;
        const springK = 8.5; // Soft magnetic spring stiffness
        const damping = 0.82; // Friction damping
        const repulsionK = 6500; // Repulsion between siblings
        const idleBreathing = Math.sin(time * 0.0018) * 1.8;

        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (n.id === draggedNodeId) continue; // Skip physics for currently dragged node

          // Center node remains anchored
          if (n.type === 'CONTRACTOR') {
            n.x = 0;
            n.y = 0;
            continue;
          }

          // 1. Spring force towards anchor slot
          const targetX = n.anchorX + (n.type === 'PROJECT' ? idleBreathing * 0.6 : -idleBreathing * 0.4);
          const targetY = n.anchorY + (n.type === 'PROJECT' ? -idleBreathing * 0.6 : idleBreathing * 0.4);

          let fx = (targetX - n.x) * springK;
          let fy = (targetY - n.y) * springK;

          // 2. Soft magnetic repulsion between siblings to avoid overlap
          for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue;
            const other = nodes[j];
            if (n.type === other.type) {
              const dx = n.x - other.x;
              const dy = n.y - other.y;
              const distSq = dx * dx + dy * dy;
              const minDist = (n.radius + other.radius) * 1.8;

              if (distSq > 0 && distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                const force = (repulsionK / (distSq + 100)) * (1 - dist / minDist);
                fx += (dx / dist) * force;
                fy += (dy / dist) * force;
              }
            }
          }

          // Apply forces and damping
          n.vx = (n.vx + fx * dt) * damping;
          n.vy = (n.vy + fy * dt) * damping;

          n.x += n.vx * dt;
          n.y += n.vy * dt;
        }

        // Trigger React SVG re-render
        setRenderTrigger((r) => (r + 1) % 10000);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPhysicsActive, draggedNodeId]);

  // Pointer Pan & Drag Interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    // If clicked on canvas background, start panning
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'nexus-bg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (draggedNodeId) {
      const node = nodesRef.current.find((n) => n.id === draggedNodeId);
      if (node && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - dimensions.width / 2 - pan.x) / zoom;
        const mouseY = (e.clientY - rect.top - dimensions.height / 2 - pan.y) / zoom;

        node.x = mouseX;
        node.y = mouseY;
        node.vx = 0;
        node.vy = 0;
      }
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  // Node Drag Handler: peripheral nodes can be dragged; dragging contractor pans view
  const startDragNode = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    if (nodeId.startsWith('contractor_')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }
    setDraggedNodeId(nodeId);
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(2.5, z * 1.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, z * 0.8));
  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.min(2.5, Math.max(0.4, z * zoomFactor)));
  };
  const handleFit = () => {
    setZoom(0.92);
    setPan({ x: 0, y: 0 });
  };
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    // Reset nodes to anchors
    nodesRef.current.forEach((n) => {
      n.x = n.anchorX;
      n.y = n.anchorY;
      n.vx = 0;
      n.vy = 0;
    });
  };

  // Fresh Live Node Map for edge path calculation (guarantees zero coordinate detachment)
  const nodeMap = new Map<string, SimNode>();
  for (let i = 0; i < nodesRef.current.length; i++) {
    const n = nodesRef.current[i];
    nodeMap.set(n.id, n);
  }

  // Branch highlight logic
  const isBranchHighlighted = (node: SimNode) => {
    if (!hoveredNodeId && !selectedProjectId && !selectedCityName) return true;

    // If contractor hovered or selected
    if (hoveredNodeId?.startsWith('contractor_')) return true;

    const activeId = hoveredNodeId || (selectedProjectId ? `proj_${selectedProjectId}` : `city_${selectedCityName}`);
    if (node.id === activeId) return true;

    // Check if connected
    if (activeId?.startsWith('proj_')) {
      const pid = activeId.replace('proj_', '');
      if (node.id === `contractor_${contractorData.entity_id || 'root'}`) return true;
      if (node.id.startsWith('city_') && node.cityData?.projects.some((p) => p.project_id === pid)) return true;
    } else if (activeId?.startsWith('city_')) {
      const cname = activeId.replace('city_', '');
      if (node.id === `contractor_${contractorData.entity_id || 'root'}`) return true;
      if (node.id.startsWith('proj_') && node.projectData?.district === cname) return true;
    }

    return false;
  };

  const isEdgeHighlighted = (edge: SimEdge) => {
    if (!hoveredNodeId && !selectedProjectId && !selectedCityName) return false;

    const activeId = hoveredNodeId || (selectedProjectId ? `proj_${selectedProjectId}` : `city_${selectedCityName}`);
    if (edge.sourceId === activeId || edge.targetId === activeId) return true;

    // Path connection
    if (activeId?.startsWith('city_') && edge.type === 'CONTRACTOR_TO_PROJECT') {
      const cityNode = nodeMap.get(activeId);
      const projNode = nodeMap.get(edge.targetId);
      if (cityNode && projNode && cityNode.cityData?.projects.some((p) => p.project_id === projNode.projectData?.project_id)) {
        return true;
      }
    }
    return false;
  };

  const contractorNode = nodesRef.current.find((n) => n.type === 'CONTRACTOR') || nodesRef.current[0];

  return (
    <div 
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      className="relative w-full h-[600px] lg:h-[680px] bg-card/60 dark:bg-[#070b14] border border-border rounded-2xl overflow-hidden shadow-xs select-none"
    >
      {/* Background grid dots for spatial depth */}
      <svg
        id="nexus-bg"
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <defs>
          <pattern id="nexus-grid-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill={isDark ? '#1e293b' : '#cbd5e1'} opacity="0.6" />
          </pattern>

          {/* Glow filter for central contractor and highlight */}
          <filter id="contractor-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Radial gradient for central aura */}
          <radialGradient id="contractor-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={isDark ? "0.2" : "0.15"} />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity={isDark ? "0.05" : "0.03"} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Grid dots */}
        <rect width="100%" height="100%" fill="url(#nexus-grid-dots)" />

        {/* Dynamic Zoom & Pan Transform Group */}
        <g transform={`translate(${pan.x + dimensions.width / 2}, ${pan.y + dimensions.height / 2}) scale(${zoom})`}>
          
          {/* ==================================================== */}
          {/* 1. CONTRACTOR CENTRAL RIPPLE RINGS (Subtle Pure SVG) */}
          {/* ==================================================== */}
          {contractorNode && (
            <g transform={`translate(${contractorNode.x}, ${contractorNode.y})`}>
              {/* Central soft background aura */}
              <circle r="120" fill="url(#contractor-aura)" />

              {/* Expanding Continuous Ripple Rings */}
              <circle r="38" stroke="#f59e0b" className="nexus-ripple-ring nexus-ripple-ring-1" />
              <circle r="38" stroke="#f59e0b" className="nexus-ripple-ring nexus-ripple-ring-2" />
              <circle r="38" stroke="#f59e0b" className="nexus-ripple-ring nexus-ripple-ring-3" />
            </g>
          )}

          {/* ==================================================== */}
          {/* 2. EDGES (Contractor -> Project & Project -> City)   */}
          {/* ==================================================== */}
          <g>
            {edgesRef.current.map((edge) => {
              const src = nodeMap.get(edge.sourceId);
              const tgt = nodeMap.get(edge.targetId);
              if (!src || !tgt) return null;

              const isContractorToProject = edge.type === 'CONTRACTOR_TO_PROJECT';
              const isHighlighted = isEdgeHighlighted(edge);
              const isDimmed = !isHighlighted && (hoveredNodeId || selectedProjectId || selectedCityName);

              // Smooth curved bezier control point
              const midX = (src.x + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2;
              // Add slight magnetic curve curvature
              const dx = tgt.x - src.x;
              const dy = tgt.y - src.y;
              const curveOffsetX = -dy * 0.12;
              const curveOffsetY = dx * 0.12;

              const pathD = `M ${src.x} ${src.y} Q ${midX + curveOffsetX} ${midY + curveOffsetY} ${tgt.x} ${tgt.y}`;

              return (
                <g key={edge.id} className="transition-opacity duration-300" opacity={isDimmed ? 0.15 : 1}>
                  {/* Base Edge Path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={
                      isHighlighted
                        ? '#38bdf8'
                        : isContractorToProject
                        ? isDark ? '#d97706' : '#f59e0b'
                        : isDark ? '#334155' : '#cbd5e1'
                    }
                    strokeWidth={isHighlighted ? 2.5 : isContractorToProject ? 1.8 : 1.2}
                    strokeDasharray={isContractorToProject ? undefined : '4 5'}
                    opacity={isHighlighted ? 1 : isContractorToProject ? 0.75 : 0.6}
                  />

                  {/* Animated Energy Flow Particles along Contractor -> Project */}
                  {isContractorToProject && isPhysicsActive && (
                    <>
                      {/* Flowing highlight stroke */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2.2"
                        className="nexus-energy-edge"
                        opacity={isHighlighted ? 0.9 : 0.5}
                      />
                      {/* Traveling Particle Dot */}
                      <circle r="3" fill="#fbbf24" opacity="0.85">
                        <animateMotion
                          dur="2.4s"
                          repeatCount="indefinite"
                          path={pathD}
                        />
                      </circle>
                    </>
                  )}
                </g>
              );
            })}
          </g>

          {/* ==================================================== */}
          {/* 3. CITY NODES (Leaf Level 3)                         */}
          {/* ==================================================== */}
          <g>
            {nodesRef.current.filter((n) => n.type === 'CITY').map((node) => {
              const isSelected = selectedCityName === node.cityData?.cityName;
              const isHighlighted = isBranchHighlighted(node);
              const isHovered = hoveredNodeId === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer transition-opacity duration-200"
                  opacity={isHighlighted ? 1 : 0.25}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (node.cityData) {
                      onSelectCity(node.cityData.cityName, node.cityData.projects);
                    }
                  }}
                  onPointerDown={(e) => startDragNode(e, node.id)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  {/* Subtle City Selected Pulse */}
                  {isSelected && (
                    <circle r="22" stroke="#10b981" className="nexus-project-pulse" />
                  )}

                  {/* Main City Circle */}
                  <circle
                    r={isHovered ? node.radius + 3 : node.radius}
                    fill={isDark ? '#064e3b' : '#ecfdf5'}
                    stroke={isSelected ? '#38bdf8' : isHovered ? '#10b981' : node.borderColor}
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all duration-150"
                  />

                  {/* Icon */}
                  <MapPin 
                    x={-7}
                    y={-7}
                    width={14}
                    height={14}
                    className="pointer-events-none" 
                    color={isDark ? '#34d399' : '#059669'} 
                  />

                  {/* Multi-project Badge count on City */}
                  {node.cityData && node.cityData.projects.length > 1 && (
                    <g transform="translate(14, -12)">
                      <circle r="8" fill="#10b981" />
                      <text
                        textAnchor="middle"
                        dy="3"
                        fontSize="9"
                        fontWeight="bold"
                        fill="#ffffff"
                      >
                        {node.cityData.projects.length}
                      </text>
                    </g>
                  )}

                  {/* City Label */}
                  <text
                    y={node.radius + 13}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill={isDark ? '#f1f5f9' : '#1e293b'}
                    className="select-none pointer-events-none"
                  >
                    {node.label}
                  </text>
                  <text
                    y={node.radius + 23}
                    textAnchor="middle"
                    fontSize="8.5"
                    fill={isDark ? '#94a3b8' : '#64748b'}
                    className="select-none pointer-events-none"
                  >
                    City
                  </text>
                </g>
              );
            })}
          </g>

          {/* ==================================================== */}
          {/* 4. PROJECT NODES (Orbiting Level 2)                  */}
          {/* ==================================================== */}
          <g>
            {nodesRef.current.filter((n) => n.type === 'PROJECT').map((node) => {
              const isSelected = selectedProjectId === node.projectData?.project_id;
              const isHighlighted = isBranchHighlighted(node);
              const isHovered = hoveredNodeId === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer transition-opacity duration-200"
                  opacity={isHighlighted ? 1 : 0.25}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (node.projectData) {
                      onSelectProject(node.projectData);
                    }
                  }}
                  onPointerDown={(e) => startDragNode(e, node.id)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  {/* Selected Project Ripple */}
                  {isSelected && (
                    <circle r="26" stroke={node.color} className="nexus-project-pulse" />
                  )}

                  {/* Project Node Base Shape */}
                  <circle
                    r={isHovered ? node.radius + 3 : node.radius}
                    fill={isDark ? '#1e293b' : '#ffffff'}
                    stroke={isSelected ? '#38bdf8' : isHovered ? node.color : node.borderColor}
                    strokeWidth={isSelected ? 3.5 : 2.2}
                    className="transition-all duration-150"
                  />

                  {/* Priority Accent Dot */}
                  <circle
                    r="3.5"
                    cy="-9"
                    fill={node.color}
                  />

                  {/* Project Index Badge inside node circle */}
                  <text
                    y="5"
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                    fill={isDark ? '#f8fafc' : '#0f172a'}
                    className="select-none pointer-events-none"
                  >
                    {`P-${(displayedProjects.findIndex((p) => p.project_id === node.projectData?.project_id) + 1).toString().padStart(2, '0')}`}
                  </text>

                  {/* Project ID text below circle */}
                  <text
                    y={node.radius + 13}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                    fill={isDark ? '#f1f5f9' : '#1e293b'}
                    className="select-none pointer-events-none"
                  >
                    {node.label}
                  </text>

                  {/* Title or sector subtitle */}
                  <text
                    y={node.radius + 24}
                    textAnchor="middle"
                    fontSize="8.5"
                    fill={isDark ? '#94a3b8' : '#64748b'}
                    className="select-none pointer-events-none"
                  >
                    {node.sublabel}
                  </text>

                  {/* Priority Label */}
                  {node.projectData?.priority_level && (
                    <text
                      y={node.radius + 33}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="bold"
                      fill={node.color}
                      className="select-none pointer-events-none uppercase tracking-wider"
                    >
                      {node.projectData.priority_level}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* ==================================================== */}
          {/* 5. CONTRACTOR NODE (Central Anchor Level 1)          */}
          {/* ==================================================== */}
          {contractorNode && (
            <g
              transform={`translate(${contractorNode.x}, ${contractorNode.y})`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectContractor();
              }}
              onPointerDown={(e) => startDragNode(e, contractorNode.id)}
              onMouseEnter={() => setHoveredNodeId(contractorNode.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              {/* Central Solid Circle */}
              <circle
                r={hoveredNodeId === contractorNode.id ? contractorNode.radius + 2 : contractorNode.radius}
                fill={isDark ? '#78350f' : '#fef3c7'}
                stroke="#f59e0b"
                strokeWidth="3.5"
                filter="url(#contractor-glow)"
                className="transition-all duration-200"
              />

              {/* Building Icon */}
              <Building2 
                x={-13}
                y={-22}
                width={26}
                height={26}
                className="pointer-events-none" 
                color="#f59e0b" 
              />

              {/* "Contractor" tag */}
              <text
                y="9"
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
                letterSpacing="0.05em"
                fill="#f59e0b"
                className="select-none pointer-events-none uppercase"
              >
                Contractor
              </text>

              {/* Contractor Name label */}
              <text
                y={contractorNode.radius + 15}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill={isDark ? '#f8fafc' : '#0f172a'}
                className="select-none pointer-events-none"
              >
                {contractorNode.label.length > 24 
                  ? `${contractorNode.label.substring(0, 22)}...` 
                  : contractorNode.label}
              </text>
            </g>
          )}

        </g>
      </svg>

      {/* Floating Control Toolbar (Top Right) */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/85 backdrop-blur-md rounded-xl p-1 border border-border shadow-xs z-10">
        <button
          onClick={handleZoomIn}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          title="Zoom in (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          title="Zoom out (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleFit}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          title="Fit view to screen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setPan({ x: 0, y: 0 })}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          title="Center on contractor"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          title="Reset positions & zoom"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <div className="h-3.5 w-px bg-border my-auto mx-0.5" />
        <button
          onClick={() => setIsPhysicsActive(!isPhysicsActive)}
          className={`p-1.5 rounded-lg transition-colors ${
            isPhysicsActive 
              ? 'text-primary hover:bg-muted' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title={isPhysicsActive ? 'Pause magnetic physics' : 'Resume magnetic physics'}
        >
          {isPhysicsActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Visible Projects Limiter Filter (Top Left) */}
      {contractorData.projects && contractorData.projects.length > 12 && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/85 backdrop-blur-md rounded-xl px-2.5 py-1 border border-border shadow-xs text-xs z-10">
          <span className="text-muted-foreground text-[11px]">Displaying:</span>
          <select
            value={visibleProjectLimit}
            onChange={(e) => setVisibleProjectLimit(Number(e.target.value))}
            className="bg-transparent border-none text-[11px] font-bold text-foreground focus:outline-none cursor-pointer"
          >
            <option value="8">Top 8 Projects</option>
            <option value="12">Top 12 Projects</option>
            <option value="20">Top 20 Projects</option>
            <option value="30">Top 30 Projects</option>
          </select>
          <span className="text-muted-foreground text-[10px] font-mono">
            (of {contractorData.projects.length})
          </span>
        </div>
      )}

      {/* Small Unobtrusive Legend (Bottom Left) */}
      <div className="absolute bottom-3 left-3 bg-background/85 backdrop-blur-md border border-border rounded-xl p-2.5 shadow-xs text-xs space-y-1.5 z-10 max-w-xs pointer-events-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Nexus Legend</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span className="text-foreground font-medium">Contractor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shrink-0" />
            <span className="text-foreground font-medium">Project</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-foreground font-medium">City</span>
          </div>
        </div>
      </div>

      {/* Help Text Banner (Bottom Right) */}
      <div className="absolute bottom-3 right-3 hidden sm:block bg-background/80 backdrop-blur-md border border-border/80 rounded-xl px-3 py-1.5 text-[11px] text-muted-foreground max-w-md shadow-xs pointer-events-none">
        This graph shows how a selected contractor is connected to their projects and the cities where those projects are located.
      </div>
    </div>
  );
};
