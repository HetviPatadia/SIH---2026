import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../api/endpoints';
import type { ContractorInvestigationResponse, ContractorProjectItem } from '../../types/network';

// Redesigned F7 Sub-components
import { NexusHeader } from './components/NexusHeader';
import { NexusSearchBar } from './components/NexusSearchBar';
import { NexusMagneticCanvas } from './components/NexusMagneticCanvas';
import { NexusContractorDrawer } from './components/NexusContractorDrawer';
import { NexusEmptyState } from './components/NexusEmptyState';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useInvestigation } from '../../context/InvestigationContext';

export const NexusGraphPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { resolvedTheme } = useTheme();
  const { setActiveProject } = useInvestigation();

  // Parse URL search parameters
  const urlContractor = searchParams.get('contractor');
  const urlProjectId = searchParams.get('projectId') || searchParams.get('project_id');

  const [selectedContractorName, setSelectedContractorName] = useState<string | null>(urlContractor);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(urlProjectId);
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null);

  const [contractorData, setContractorData] = useState<ContractorInvestigationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selected sub-entities
  const [selectedProject, setSelectedProject] = useState<ContractorProjectItem | null>(null);
  const [selectedCity, setSelectedCity] = useState<{ cityName: string; projects: ContractorProjectItem[] } | null>(null);

  // Fetch contractor data
  const loadContractorData = useCallback(async (contractorName: string, targetProjectId?: string | null) => {
    if (!contractorName.trim()) {
      setContractorData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.network.getContractor(contractorName.trim());
      if (res && res.contractor) {
        setContractorData(res);
        setSelectedContractorName(res.contractor);

        // Update URL
        setSearchParams({ contractor: res.contractor }, { replace: true });

        // If target project ID was specified, auto-select it
        if (targetProjectId && res.projects) {
          const match = res.projects.find((p) => p.project_id === targetProjectId);
          if (match) {
            setSelectedProject(match);
            setSelectedProjectId(match.project_id);
            setSelectedCity(null);
            setSelectedCityName(null);
          }
        } else {
          setSelectedProject(null);
          setSelectedProjectId(null);
          setSelectedCity(null);
          setSelectedCityName(null);
        }
      } else {
        throw new Error(`Contractor '${contractorName}' not found or has no registered works.`);
      }
    } catch (err: unknown) {
      console.error('Failed to load contractor data:', err);
      const msg = err instanceof Error ? err.message : 'Unable to load contractor relationships.';
      setError(msg);
      setContractorData(null);
    } finally {
      setIsLoading(false);
    }
  }, [setSearchParams]);

  // Initial mount resolution
  useEffect(() => {
    // 1. If contractor is in URL, load it directly
    if (urlContractor) {
      loadContractorData(urlContractor, urlProjectId);
      return;
    }

    // 2. If projectId is in URL but no contractor, query graph to find its contractor
    if (urlProjectId) {
      setIsLoading(true);
      api.network.getGraph({ project_id: urlProjectId, depth: 1 })
        .then((res) => {
          const cNode = res.nodes.find((n) => n.type === 'CONTRACTOR');
          if (cNode && cNode.label) {
            loadContractorData(cNode.label, urlProjectId);
          } else {
            // Fallback default
            loadContractorData('Bharat Engineers & Builders', urlProjectId);
          }
        })
        .catch(() => {
          loadContractorData('Bharat Engineers & Builders', urlProjectId);
        });
    }
  }, [urlContractor, urlProjectId, loadContractorData]);

  // Handler: Select a new contractor
  const handleSelectContractor = (contractorName: string) => {
    setSelectedContractorName(contractorName);
    loadContractorData(contractorName);
  };

  // Handler: Clear contractor (return to empty state)
  const handleClearContractor = () => {
    setSelectedContractorName(null);
    setSelectedProjectId(null);
    setSelectedCityName(null);
    setSelectedProject(null);
    setSelectedCity(null);
    setContractorData(null);
    setError(null);
    setSearchParams({}, { replace: true });
  };

  // Handler: Project click
  const handleSelectProject = (project: ContractorProjectItem) => {
    setActiveProject(project.project_id, project.title);
    setSelectedProject(project);
    setSelectedProjectId(project.project_id);
    setSelectedCity(null);
    setSelectedCityName(null);
  };

  // Handler: City click
  const handleSelectCity = (cityName: string, projects: ContractorProjectItem[]) => {
    setSelectedCity({ cityName, projects });
    setSelectedCityName(cityName);
    setSelectedProject(null);
    setSelectedProjectId(null);
  };

  // Handler: Reset sub-selection back to contractor view
  const handleClearSubSelection = () => {
    setSelectedProject(null);
    setSelectedProjectId(null);
    setSelectedCity(null);
    setSelectedCityName(null);
  };

  return (
    <PageContainer>
      <div className="space-y-4">
        {/* Header */}
        <NexusHeader
          selectedContractorName={selectedContractorName}
          selectedProjectId={selectedProjectId}
          selectedCityName={selectedCityName}
          onClearContractor={handleClearContractor}
          onClearSubSelection={handleClearSubSelection}
          projectCount={contractorData?.summary.total_projects || 0}
          cityCount={contractorData?.summary.district_count || 0}
          onResetGraph={() => {
            if (selectedContractorName) {
              loadContractorData(selectedContractorName);
            }
          }}
        />

        {/* Contractor Search & Autocomplete Bar */}
        <div className="flex justify-center">
          <NexusSearchBar
            selectedContractor={selectedContractorName}
            onSelectContractor={handleSelectContractor}
            onClearContractor={handleClearContractor}
            isLoading={isLoading}
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive flex items-start justify-between gap-3 max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold">Unable to Load Contractor Relationships</h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  {error}. Please check the contractor name or select one of the suggested contractors.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedContractorName) loadContractorData(selectedContractorName);
                }}
                className="text-xs flex items-center gap-1 bg-background"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-card border border-border rounded-2xl">
            <div className="w-9 h-9 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-center space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Loading Contractor Relationships...</h4>
              <p className="text-xs text-muted-foreground">
                Connecting contractor to associated works and municipal cities...
              </p>
            </div>
          </div>
        )}

        {/* Active Contractor Graph Workspace */}
        {!isLoading && !error && contractorData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Magnetic Physics Canvas (8 cols on lg, 9 on xl) */}
            <div className="lg:col-span-8 xl:col-span-9">
              <NexusMagneticCanvas
                contractorData={contractorData}
                selectedProjectId={selectedProjectId}
                selectedCityName={selectedCityName}
                onSelectProject={handleSelectProject}
                onSelectCity={handleSelectCity}
                onSelectContractor={handleClearSubSelection}
                resolvedTheme={resolvedTheme}
              />
            </div>

            {/* Right-Side Contractor / Project / City Inspector Drawer */}
            <div className="lg:col-span-4 xl:col-span-3 sticky top-4">
              <NexusContractorDrawer
                contractorData={contractorData}
                selectedProject={selectedProject}
                selectedCity={selectedCity}
                onClearSelection={handleClearSubSelection}
                onSelectProject={handleSelectProject}
              />
            </div>
          </div>
        )}

        {/* Empty State (when no contractor is chosen) */}
        {!isLoading && !error && !contractorData && (
          <NexusEmptyState onSelectContractor={handleSelectContractor} />
        )}
      </div>
    </PageContainer>
  );
};

export default NexusGraphPage;
