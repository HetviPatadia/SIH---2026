import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Globe,
  Sparkles,
  MapPin,
  Building2,
  ShieldAlert,
  ChevronRight,
  X,
  Star,
  Info,
  Lock,
  Languages,
  Search,
} from 'lucide-react';

import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { LocationFilterBar, PublicProjectFilters } from '../../components/public/LocationFilterBar';
import { PublicAssistantChat } from '../../components/public/PublicAssistantChat';
import { PublicProjectMap } from '../../components/public/PublicProjectMap';
import { CitizenGrievanceModal } from '../../components/public/CitizenGrievanceModal';
import { CitizenReviewModal } from '../../components/public/CitizenReviewModal';
import { CitizenReviewList } from '../../components/public/CitizenReviewList';
import { PublicLanguageProvider, usePublicLanguage } from '../../context/PublicLanguageContext';
import { api } from '../../api/endpoints';

const PublicPortalContent: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language, setLanguage, t } = usePublicLanguage();

  // Initialize filter state from URL parameters
  const [filters, setFilters] = useState<PublicProjectFilters>(() => {
    return {
      state: searchParams.get('state') || undefined,
      district: searchParams.get('district') || undefined,
      constituency: searchParams.get('constituency') || undefined,
      block: searchParams.get('block') || undefined,
      village: searchParams.get('village') || undefined,
      sector: searchParams.get('sector') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    };
  });

  const [page, setPage] = useState<number>(1);
  const [projectsData, setProjectsData] = useState<{ total: number; items: Array<Record<string, any>> }>({
    total: 0,
    items: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<{
    total_projects: number;
    total_sanctioned: number;
    total_expenditure: number;
    completed_works: number;
    in_progress_works: number;
  }>({
    total_projects: 2200,
    total_sanctioned: 3121637833,
    total_expenditure: 2654217377,
    completed_works: 1550,
    in_progress_works: 650,
  });
  const [mapProjects, setMapProjects] = useState<Array<Record<string, any>>>([]);

  // Selected project for Public Detail Modal
  const [selectedProject, setSelectedProject] = useState<Record<string, any> | null>(null);

  // Grievance & Review Modal states
  const [isGrievanceModalOpen, setIsGrievanceModalOpen] = useState<boolean>(false);
  const [grievanceModalTab, setGrievanceModalTab] = useState<'file' | 'track'>('file');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);

  // Floating Assistant state
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState<boolean>(false);

  const heroAssistantRef = useRef<HTMLDivElement>(null);

  // Sync state to URL search parameters
  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.state) params.state = filters.state;
    if (filters.district) params.district = filters.district;
    if (filters.constituency) params.constituency = filters.constituency;
    if (filters.block) params.block = filters.block;
    if (filters.village) params.village = filters.village;
    if (filters.sector) params.sector = filters.sector;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (page > 1) params.page = String(page);

    setSearchParams(params, { replace: true });
  }, [filters, page, setSearchParams]);

  // Fetch Public Projects list
  useEffect(() => {
    setLoading(true);
    api.public.listProjects({ ...filters, page, page_size: 10 })
      .then((res) => {
        setProjectsData({ total: res.total, items: res.items });
      })
      .catch((err) => console.error('Error fetching public projects:', err))
      .finally(() => setLoading(false));
  }, [filters, page]);

  // Fetch live auditor database stats & map markers for current filters
  useEffect(() => {
    api.public.getStats(filters)
      .then(setStats)
      .catch((err) => console.error('Error fetching public stats:', err));

    api.public.getMapProjects({ ...filters, limit: 1000 })
      .then(setMapProjects)
      .catch((err) => console.error('Error fetching public map markers:', err));
  }, [filters]);

  // Event Listeners for Bidirectional Sync (OPEN_PUBLIC_PROJECT_MODAL & APPLY_PUBLIC_FILTERS)
  useEffect(() => {
    const handleOpenModal = (e: CustomEvent) => {
      const { projectId, project } = e.detail || {};
      if (project) {
        setSelectedProject(project);
      } else if (projectId) {
        api.public.getProject(projectId).then(setSelectedProject).catch(console.error);
      }
    };

    const handleApplyFilters = (e: CustomEvent) => {
      if (e.detail?.filters) {
        setFilters(e.detail.filters);
        setPage(1);
      }
    };

    window.addEventListener('OPEN_PUBLIC_PROJECT_MODAL', handleOpenModal as EventListener);
    window.addEventListener('APPLY_PUBLIC_FILTERS', handleApplyFilters as EventListener);

    return () => {
      window.removeEventListener('OPEN_PUBLIC_PROJECT_MODAL', handleOpenModal as EventListener);
      window.removeEventListener('APPLY_PUBLIC_FILTERS', handleApplyFilters as EventListener);
    };
  }, []);

  const handleFilterChange = (newFilters: PublicProjectFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({});
    setPage(1);
  };

  const scrollToAssistant = () => {
    heroAssistantRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const openGrievanceModal = (tab: 'file' | 'track' = 'file') => {
    setGrievanceModalTab(tab);
    setIsGrievanceModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* 1. Header Bar */}
      <header className="h-16 px-6 border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between shadow-xs">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity" title="Back to Overview">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <span>{t('nav.portalTitle', t('portal_title', 'Public Development Works Portal'))}</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary">
                {t('citizens_portal', 'Citizens Portal')}
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground">{t('nav.portalSubtitle', t('portal_subtitle', 'Ministry of Statistics & Programme Implementation (MoSPI)'))}</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* Public Language Selector */}
          <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-border">
            <Languages className="w-3.5 h-3.5 text-muted-foreground ml-1 mr-0.5" />
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 text-xs font-semibold rounded-lg transition-colors ${
                language === 'en' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-2 py-0.5 text-xs font-semibold rounded-lg transition-colors ${
                language === 'hi' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => setLanguage('gu')}
              className={`px-2 py-0.5 text-xs font-semibold rounded-lg transition-colors ${
                language === 'gu' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ગુજરાતી
            </button>
          </div>

          {/* Track Grievance Button */}
          <button
            onClick={() => openGrievanceModal('track')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-muted border border-border text-foreground hover:bg-surface-elevated transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-primary" />
            <span>{t('nav.trackGrievance', 'Track Grievance')}</span>
          </button>

          <button
            onClick={scrollToAssistant}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('ask_ai', 'Ask AI')}</span>
          </button>

          <ThemeToggle />

          <div className="h-4 w-[1px] bg-border mx-1" />

          <Link to="/auditor/login">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-surface-muted border border-border rounded-lg transition-colors">
              <Lock className="w-3.5 h-3.5 text-warning" />
              <span>{t('auditor_workspace', 'Auditor Workspace')}</span>
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Synthetic Demonstration Notice Banner */}
        <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/30 text-warning text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              {t('assistant.disclaimer', t('demo_notice', 'Answers are grounded strictly in the public demonstration dataset. Internal audit information is restricted.'))}
            </span>
          </div>
        </div>

        {/* 2. Hero + Embedded Assistant Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Hero Left Intro */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-primary px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 inline-block">
                {t('hero_eyebrow', 'Transparent & Accessible Public Records')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
                {t('hero.title', t('hero_title', 'Explore Public Development Works Across India'))}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t('hero.subtitle', t('hero_description', 'Ask questions, discover project investments, inspect contractor details, and verify progress in real-time.'))}
              </p>
            </div>

            {/* Quick Public Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-surface border border-border shadow-xs">
                <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold block">
                  {t('metrics.totalProjects', t('total_projects', 'Total Works Listed'))}
                </span>
                <span className="text-base font-extrabold text-foreground font-mono">
                  {stats.total_projects.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border shadow-xs">
                <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold block">
                  {t('metrics.totalSanctioned', t('sanctioned_value', 'Total Sanctioned Funds'))}
                </span>
                <span className="text-base font-extrabold text-primary font-mono">
                  ₹{(stats.total_sanctioned / 10000000).toFixed(1)} {t('metrics.crores', 'Cr')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border shadow-xs">
                <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold block">
                  {t('metrics.totalExpenditure', t('recorded_expenditure', 'Total Expenditure'))}
                </span>
                <span className="text-base font-extrabold text-success font-mono">
                  ₹{(stats.total_expenditure / 10000000).toFixed(1)} {t('metrics.crores', 'Cr')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border shadow-xs">
                <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold block">
                  {t('metrics.completedWorks', t('completed_works', 'Completed Works'))}
                </span>
                <span className="text-base font-extrabold text-foreground font-mono">
                  {stats.completed_works.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Hero Right AI Public Assistant Component */}
          <div ref={heroAssistantRef} className="lg:col-span-5">
            <PublicAssistantChat
              activeFilters={filters}
              onApplyFilters={handleFilterChange}
              onResetFilters={handleResetFilters}
            />
          </div>
        </section>

        {/* 3. Location Hierarchy Filter Bar */}
        <section>
          <LocationFilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            resultCount={projectsData.total}
          />
        </section>

        {/* 4. Main Discovery Layout: Project Explorer List (Left) + Interactive Map (Right) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Project Explorer Cards List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span>{t('project_records', 'Project Records')} ({projectsData.total})</span>
              </h3>
              <span className="text-xs text-muted-foreground font-mono">
                {t('table.page', 'Page')} {page} {t('table.of', 'of')} {Math.ceil(projectsData.total / 10) || 1}
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center bg-surface border border-border rounded-xl text-xs text-muted-foreground space-y-2">
                <Sparkles className="w-6 h-6 text-primary animate-spin mx-auto" />
                <p>{t('assistant.searchingDb', t('checking_records', 'Fetching public project records...'))}</p>
              </div>
            ) : projectsData.items.length === 0 ? (
              <div className="p-12 text-center bg-surface border border-border rounded-xl text-xs text-muted-foreground space-y-3">
                <Info className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="font-semibold text-foreground">{t('table.noResults', 'No development works found matching your filter criteria.')}</p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg inline-block"
                >
                  {t('filters.resetFilters', t('clear_filters', 'Clear all filters'))}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {projectsData.items.map((project) => {
                  const isCompleted = project.status === 'Completed';
                  const amount = project.financial ? project.financial.sanctioned_amount : 0;
                  const exp = project.financial ? project.financial.expenditure : 0;

                  return (
                    <div
                      key={project.project_id}
                      className="p-4 rounded-xl bg-surface border border-border hover:border-primary/40 transition-all shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {project.project_id} &middot; {project.dataset_version}
                          </span>
                          <h4 className="text-sm font-bold text-foreground leading-snug">
                            {project.title}
                          </h4>
                        </div>
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border shrink-0 ${
                          isCompleted
                            ? 'bg-success/10 border-success/30 text-success'
                            : 'bg-primary/10 border-primary/30 text-primary'
                        }`}>
                          {t(`statusTypes.${project.status}`, project.status)}
                        </span>
                      </div>

                      {/* Location & Sector info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          {project.district}, {project.state}
                        </span>
                        {project.location?.village && (
                          <span>{t('filters.village', 'Village')}: <strong>{project.location.village}</strong></span>
                        )}
                        <span>{t('table.sector', 'Sector')}: <strong className="text-foreground">{project.sector}</strong></span>
                      </div>

                      {/* Financial Bar */}
                      <div className="p-2.5 rounded-lg bg-surface-muted/60 border border-border/80 flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">{t('table.sanctioned', 'Sanctioned')}</span>
                          <span className="font-bold text-foreground">₹{(amount / 100000).toFixed(2)} {t('metrics.lakhs', 'Lakh')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">{t('table.expenditure', 'Expenditure')}</span>
                          <span className="font-bold text-success">₹{(exp / 100000).toFixed(2)} {t('metrics.lakhs', 'Lakh')}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">Citizen Rating</span>
                          <span className="font-bold text-warning flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                            4.2 (24)
                          </span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-[11px] text-muted-foreground">
                          MP: {project.mp_name}
                        </span>

                        <button
                          onClick={() => setSelectedProject(project)}
                          className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-muted border border-border text-foreground font-semibold text-xs transition-colors flex items-center gap-1"
                        >
                          <span>{t('table.viewDetails', t('view_public_details', 'View Details'))}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination Controls */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border text-foreground disabled:opacity-50"
                  >
                    &larr; Previous Page
                  </button>
                  <span className="text-xs text-muted-foreground font-mono">
                    {t('table.page', 'Page')} {page} {t('table.of', 'of')} {Math.ceil(projectsData.total / 10) || 1}
                  </span>
                  <button
                    disabled={page >= Math.ceil(projectsData.total / 10)}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border text-foreground disabled:opacity-50"
                  >
                    Next Page &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Map (Right) */}
          <div className="lg:col-span-5 sticky top-20">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <span>{t('map.title', 'Geographic Work Distribution')}</span>
                </h3>
              </div>
              <PublicProjectMap
                projects={mapProjects.length > 0 ? mapProjects : projectsData.items}
                onSelectProject={(p) => setSelectedProject(p)}
                height="580px"
              />
            </div>
          </div>
        </section>
      </main>

      {/* Floating Persistent Assistant Trigger */}
      {!isFloatingChatOpen && (
        <button
          onClick={() => setIsFloatingChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-105 transition-transform flex items-center gap-2 font-semibold text-xs"
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span>{t('assistant.name', t('assistant_name', 'MPLADS Public Assistant'))}</span>
        </button>
      )}

      {/* Floating Assistant Modal Window */}
      {isFloatingChatOpen && (
        <div className="fixed bottom-6 right-6 z-50 shadow-2xl">
          <PublicAssistantChat
            activeFilters={filters}
            onApplyFilters={handleFilterChange}
            onResetFilters={handleResetFilters}
            isFloating={true}
            onCloseFloating={() => setIsFloatingChatOpen(false)}
          />
        </div>
      )}

      {/* Public Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">
                  {selectedProject.project_id} &middot; {t('modal.projectDetails', 'Public Project Record')}
                </span>
                <h3 className="text-lg font-bold text-foreground leading-snug">
                  {selectedProject.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">{t('table.workTitle', 'Description')}</span>
                <p className="text-foreground leading-relaxed">{selectedProject.description || 'Standard MPLADS civil development work.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface-muted border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">{t('table.location', 'Location')}</span>
                  <p className="font-semibold text-foreground">{selectedProject.district}, {selectedProject.state}</p>
                  <p className="text-muted-foreground">{t('filters.constituency', 'Constituency')}: {selectedProject.constituency}</p>
                  {selectedProject.location?.village && <p className="text-muted-foreground">{t('filters.village', 'Village')}: {selectedProject.location.village}</p>}
                </div>
                <div className="p-3 rounded-xl bg-surface-muted border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">{t('modal.costBreakdown', 'Financials')}</span>
                  <p className="font-semibold text-foreground">{t('modal.sanctionedAmount', 'Sanctioned')}: ₹{((selectedProject.financial?.sanctioned_amount || 0) / 100000).toFixed(2)} {t('metrics.lakhs', 'Lakh')}</p>
                  <p className="text-success font-semibold">{t('modal.actualExpenditure', 'Spent')}: ₹{((selectedProject.financial?.expenditure || 0) / 100000).toFixed(2)} {t('metrics.lakhs', 'Lakh')}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-muted border border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">{t('modal.contractorInfo', 'Public Contractor')}</span>
                  <span className="font-semibold text-foreground">{selectedProject.contractor_name || 'Apex Infrastructure Ltd'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/30 text-warning hover:bg-warning/20 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                  <span>{t('review.rateProject', 'Rate & Review')}</span>
                </button>
              </div>

              {/* Multi-Factor Rating & Citizen Feedback Component */}
              <div className="pt-2 border-t border-border">
                <CitizenReviewList
                  projectId={selectedProject.project_id}
                  onOpenRateModal={() => setIsReviewModalOpen(true)}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="px-3 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                  <span>{t('review.rateProject', 'Rate & Review')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openGrievanceModal('file')}
                  className="px-3 py-2 bg-warning/10 hover:bg-warning/20 border border-warning/30 text-warning font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{t('table.complainBtn', t('raise_complaint', 'Report Issue'))}</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl"
              >
                {t('modal.closeBtn', t('close', 'Close Record'))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Citizen Grievance / Complaint Modal */}
      <CitizenGrievanceModal
        isOpen={isGrievanceModalOpen}
        onClose={() => setIsGrievanceModalOpen(false)}
        project={selectedProject}
        initialTab={grievanceModalTab}
      />

      {/* Citizen Rating & Review Modal */}
      <CitizenReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        project={selectedProject}
        onReviewSubmitted={() => {
          // Re-trigger review refresh if needed
        }}
      />

      {/* Footer */}
      <footer className="mt-12 py-6 px-6 border-t border-border bg-surface/50 text-center text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground">
          {t('nav.portalTitle', 'MPLADS Public Information Portal')}
        </p>
        <p className="text-[11px]">
          {t('nav.tagline', 'Ministry of Statistics & Programme Implementation (MoSPI)')}
        </p>
      </footer>
    </div>
  );
};

export const PublicPortalPage: React.FC = () => (
  <PublicLanguageProvider>
    <PublicPortalContent />
  </PublicLanguageProvider>
);

export default PublicPortalPage;
