import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/Button';
import { InvestigationHeader } from './components/InvestigationHeader';
import { WhyPrioritizedSection } from './components/WhyPrioritizedSection';
import { ProjectFactsAndFinancials } from './components/ProjectFactsAndFinancials';
import { ContractorIntelligenceCard } from './components/ContractorIntelligenceCard';
import { CostContextSection } from './components/CostContextSection';
import { HistoricalChangeSection } from './components/HistoricalChangeSection';
import { InvestigationCopilotSection } from './components/InvestigationCopilotSection';
import { InvestigationEntryPoints } from './components/InvestigationEntryPoints';
import { InvestigationNotesSection } from './components/InvestigationNotesSection';
import { TechnicalDetailsSection } from './components/TechnicalDetailsSection';
import { api } from '../../api/endpoints';
import type { ProjectItem } from '../../types/project';
import type { RiskExplanationResponse } from '../../types/explanation';
import type { ProjectEvidenceItem } from '../../types/evidence';
import type { InvestigationCase, InvestigationNote } from '../../types/investigation';
import { useInvestigation } from '../../context/InvestigationContext';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export const ProjectInvestigationPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { setActiveProject } = useInvestigation();

  // Data States
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [explanation, setExplanation] = useState<RiskExplanationResponse | null>(null);
  const [evidenceList, setEvidenceList] = useState<ProjectEvidenceItem[]>([]);
  const [nearbyData, setNearbyData] = useState<{
    project_id: string;
    nearby: Array<{
      project_id: string;
      title: string;
      distance_km: number;
      distance_meters: number;
      sector?: string;
    }>;
  } | null>(null);
  const [caseDetail, setCaseDetail] = useState<InvestigationCase | null>(null);

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load project and all investigation layers
  const loadProjectDossier = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      // 1. Fetch primary Project record
      let projData: ProjectItem;
      try {
        projData = await api.projects.getById(projectId);
        setProject(projData);
        setActiveProject(projData.project_id, projData.description);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        throw err;
      }

      // 2. Fetch associated multi-modal layers in parallel (resilient to partial failures)
      const [explRes, evidRes, nearRes] = await Promise.allSettled([
        api.explanations.getById(projectId),
        api.evidence.getProjectEvidence(projectId),
        api.projects.getNearby(projectId, 2.0),
      ]);

      if (explRes.status === 'fulfilled') {
        setExplanation(explRes.value);
      }

      if (evidRes.status === 'fulfilled') {
        setEvidenceList(evidRes.value || []);
      }

      if (nearRes.status === 'fulfilled') {
        setNearbyData(nearRes.value);
      }

      // 3. Fetch Case notes if case_id exists
      const targetCaseId = projData.case_id || `CASE-${projectId}`;
      try {
        const cData = await api.investigations.getById(targetCaseId);
        setCaseDetail(cData);
      } catch {
        // Case record may not exist yet if unreviewed
        setCaseDetail(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to load project investigation dossier';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectDossier();
  }, [loadProjectDossier]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProjectDossier();
    setRefreshing(false);
  };

  // Status mutation handler
  const handleStatusUpdate = async (newStatus: string) => {
    if (!project) return;
    const targetCaseId = project.case_id || `CASE-${project.project_id}`;

    try {
      const updatedCase = await api.investigations.updateStatus(targetCaseId, newStatus);
      setCaseDetail(updatedCase);
      setProject((prev) => (prev ? { ...prev, review_status: newStatus } : null));
    } catch (err: unknown) {
      console.error('Failed to update case status:', err);
      // Fallback update local state for immediate feedback
      setProject((prev) => (prev ? { ...prev, review_status: newStatus } : null));
    }
  };

  // Add note handler
  const handleAddNote = async (noteText: string, actionTaken?: string, author?: string) => {
    if (!project) return;
    const targetCaseId = project.case_id || `CASE-${project.project_id}`;

    await api.investigations.addNote(targetCaseId, author || 'Auditor', noteText, actionTaken);

    // Refresh case notes
    try {
      const updatedCase = await api.investigations.getById(targetCaseId);
      setCaseDetail(updatedCase);
    } catch {
      // If fetching updated case fails, append locally
      const mockNote: InvestigationNote = {
        id: Date.now(),
        author: author || 'Auditor',
        note_text: noteText,
        action_taken: actionTaken,
        created_at: new Date().toISOString(),
      };
      setCaseDetail((prev) =>
        prev
          ? { ...prev, notes: [mockNote, ...(prev.notes || [])] }
          : {
              case_id: targetCaseId,
              project_id: project.project_id,
              status: (project.review_status as any) || 'UNDER_REVIEW',
              priority: (project.priority_level as any) || 'CRITICAL',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              notes: [mockNote],
            }
      );
    }
  };

  // 1. 404 Not Found State
  if (notFound) {
    return (
      <PageContainer title="Project Not Found" description="The requested project could not be located in the benchmark registry.">
        <div className="p-12 text-center flex flex-col items-center justify-center gap-4 bg-surface rounded-xl border border-border">
          <AlertCircle className="w-12 h-12 text-muted-foreground/60" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">Project &quot;{projectId}&quot; Not Found</h2>
            <p className="text-xs text-muted-foreground max-w-sm">
              The project identifier does not match any records in the active MPLADS benchmark database.
            </p>
          </div>
          <Link to="/reviews">
            <Button size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Review Queue
            </Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  // 2. Primary Error State
  if (error && !project) {
    return (
      <PageContainer title="Investigation Error" description="Unable to load project dossier.">
        <div className="p-12 text-center flex flex-col items-center justify-center gap-4 bg-surface rounded-xl border border-danger/30">
          <AlertCircle className="w-12 h-12 text-danger/80" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">Unable to Load Project Dossier</h2>
            <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/reviews">
              <Button variant="outline" size="sm">
                Back to Reviews
              </Button>
            </Link>
            <Button size="sm" onClick={loadProjectDossier} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
              Retry Loading
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  // 3. Loading Skeleton State
  if (loading || !project) {
    return (
      <PageContainer title="Loading Project Dossier..." description="Retrieving multi-modal audit diagnosis, evidence records, and proximity telemetry.">
        <div className="space-y-6 animate-pulse">
          <div className="h-32 rounded-xl bg-surface border border-border" />
          <div className="h-64 rounded-xl bg-surface border border-border" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 h-56 rounded-xl bg-surface border border-border" />
            <div className="lg:col-span-7 h-56 rounded-xl bg-surface border border-border" />
          </div>
        </div>
      </PageContainer>
    );
  }

  // Contractor name inferred from network explanation or top finding
  const contractorName =
    explanation?.domain_signals?.network?.details?.contractor_name as string ||
    'Apex Infrastructure Ltd';

  return (
    <PageContainer
      title={`Investigation: ${project.project_id}`}
      description="Multi-modal forensic investigation dossier spanning spatial proximity, procurement velocity, and asset evidence."
    >
      <div className="space-y-6">
        {/* 1. Dossier Header Banner */}
        <div className="animate-stagger-1">
          <InvestigationHeader
            project={project}
            onStatusUpdate={handleStatusUpdate}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        </div>

        {/* 2. Core Diagnostic: Why This Project Was Prioritized */}
        <div className="animate-stagger-2">
          <WhyPrioritizedSection
            explanation={explanation}
            loading={false}
          />
        </div>

        {/* 3. Project Facts, Financials & Execution Timeline */}
        <div className="animate-stagger-3 space-y-6">
          <ProjectFactsAndFinancials project={project} />
          
          {/* Price-Aware Cost Context (WPI Normalization & Peer Deviation) */}
          <CostContextSection 
            projectId={project.project_id} 
            sanctionedAmount={project.financial?.sanctioned_amount} 
          />

          {/* Longitudinal Contractor Intelligence & Sector Specialization */}
          <ContractorIntelligenceCard 
            contractorName={contractorName} 
            projectId={project.project_id} 
          />

          {/* Longitudinal Run Changes: What Changed? */}
          <HistoricalChangeSection 
            projectId={project.project_id} 
            currentScore={project.audit_priority} 
          />
        </div>

        {/* 4. Forensic Entry Points (Evidence, GIS Proximity, Entity Nexus) */}
        <div className="animate-stagger-4">
          <InvestigationEntryPoints
            project={project}
            evidenceList={evidenceList}
            nearbyData={nearbyData}
            contractorName={contractorName}
          />
        </div>

        {/* 5. AI Investigation Copilot (Controlled Decision Support & Grounded RAG) */}
        <InvestigationCopilotSection projectId={project.project_id} />

        {/* 6. Human Audit Findings & Case Notes */}
        <InvestigationNotesSection
          caseId={project.case_id || `CASE-${project.project_id}`}
          notes={caseDetail?.notes || []}
          onAddNote={handleAddNote}
        />

        {/* 7. Technical Model Diagnostics (Level 3 Collapsible Details) */}
        {explanation && <TechnicalDetailsSection explanation={explanation} />}
      </div>
    </PageContainer>
  );
};

export default ProjectInvestigationPage;
