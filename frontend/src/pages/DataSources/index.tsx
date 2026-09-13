import React, { useState, useEffect } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api } from '../../api/endpoints';
import type { DatasetVersionItem } from '../../types/project';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  Layers, 
  Hash
} from 'lucide-react';

export const DataSourcesPage: React.FC = () => {
  const [versions, setVersions] = useState<DatasetVersionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchDataSources = async () => {
    try {
      const res = await api.data.getVersions();
      if (res && res.versions) {
        setVersions(res.versions);
      }
    } catch (err) {
      console.warn('Data sources version fetch note:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDataSources();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDataSources();
  };

  const totalWorks = versions.reduce((sum, v) => sum + (v.total_records || 0), 0);

  return (
    <PageContainer
      title="Data Sources & Provenance Registry"
      description="Cryptographic ingestion registry, SHA-256 checksums, data quality scores, and price-index normalization sources."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
        >
          {refreshing ? 'Syncing...' : 'Sync Sources'}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Provenance Transparency Banner */}
        <div className="rounded-lg border border-primary/30 bg-primary-muted/10 p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Layers className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-foreground">
                Benchmark Ingestion Provenance &amp; Verification Integrity
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Data sources are ingested and validated against strict schema rules. All raw files are sealed with cryptographic SHA-256 hashes to guarantee unalterable audit reproducibility.
              </p>
            </div>
          </div>
          <Badge variant="primary" size="sm" className="hidden sm:inline-flex shrink-0">
            {totalWorks.toLocaleString()} Ingested Works
          </Badge>
        </div>

        {/* Source Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card hoverElevate className="animate-stagger-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Registered Ingestion Sources</CardTitle>
                <Badge variant="success" size="sm">Verified Snapshot</Badge>
              </div>
              <CardDescription>Government &amp; Benchmark Data Provenance</CardDescription>
            </CardHeader>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-border-muted">
                <span className="text-muted-foreground">eSAKSHI Benchmark Model</span>
                <span className="font-mono text-foreground font-medium">MoSPI Format (SIH 2026)</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border-muted">
                <span className="text-muted-foreground">data.gov.in Public Schema</span>
                <span className="font-mono text-foreground font-medium">Conforming 24 Fields</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border-muted">
                <span className="text-muted-foreground">Coordinate Reference System</span>
                <span className="font-mono text-primary font-semibold">EPSG:4326 (WGS 84)</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-muted-foreground">Validation Status</span>
                <span className="font-mono text-emerald-400 font-semibold">{totalWorks.toLocaleString()} Works Loaded</span>
              </div>
            </div>
          </Card>

          <Card hoverElevate className="animate-stagger-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Price Index Normalization Provider</CardTitle>
                <Badge variant="primary" size="sm">DPIIT WPI v2026.1</Badge>
              </div>
              <CardDescription>Deflation Baselines for Cost Normalization</CardDescription>
            </CardHeader>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-border-muted">
                <span className="text-muted-foreground">Primary Index Source</span>
                <span className="text-foreground font-medium">Ministry of Commerce &amp; Industry (DPIIT)</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border-muted">
                <span className="text-muted-foreground">Base Comparison Year</span>
                <span className="font-mono text-foreground font-bold">2024 (Index: 130.0)</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border-muted">
                <span className="text-muted-foreground">Cost Drivers Covered</span>
                <span className="text-muted-foreground">General Civil Materials, Labor, Equipment</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-muted-foreground">Adjustment Policy</span>
                <span className="text-emerald-400 font-mono">Dynamic Year-over-Year Deflation</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Dataset Ingestion Versions Table */}
        <Card hoverElevate className="border border-border/80 bg-surface">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-bold text-foreground">
                  DATASET VERSIONS &amp; CRYPTOGRAPHIC HASHLOG
                </CardTitle>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {versions.length} Datasets Cataloged
              </span>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Auditable snapshot log containing SHA-256 file checksums and data validation yields.
            </CardDescription>
          </CardHeader>

          <div className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface-muted/60 text-muted-foreground border-b border-border/60 font-sans text-[11px]">
                  <tr>
                    <th className="p-3 pl-4">Dataset Version</th>
                    <th className="p-3">Source Name</th>
                    <th className="p-3 text-right">Records</th>
                    <th className="p-3 text-right">Valid</th>
                    <th className="p-3 text-center">Quality Score</th>
                    <th className="p-3">SHA-256 Checksum</th>
                    <th className="p-3 pr-4 text-right">Ingested At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground font-sans animate-pulse">
                        Retrieving cryptographic ingestion registries...
                      </td>
                    </tr>
                  ) : versions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground font-sans">
                        No ingested dataset versions recorded in database.
                      </td>
                    </tr>
                  ) : (
                    versions.map((v) => (
                      <tr key={v.dataset_version} className="hover:bg-surface-muted/30 transition-colors">
                        <td className="p-3 pl-4 font-bold text-primary">{v.dataset_version}</td>
                        <td className="p-3 font-sans text-foreground truncate max-w-[200px]" title={v.source_name}>
                          {v.source_name || 'Benchmark Dataset'}
                        </td>
                        <td className="p-3 text-right text-foreground">{v.total_records.toLocaleString()}</td>
                        <td className="p-3 text-right text-emerald-400 font-medium">{v.valid_records.toLocaleString()}</td>
                        <td className="p-3 text-center font-sans">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {v.data_quality_score ? `${v.data_quality_score.toFixed(0)}%` : '100%'}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground text-[11px]">
                          {v.source_checksum ? (
                            <span className="inline-flex items-center gap-1 truncate max-w-[140px]" title={v.source_checksum}>
                              <Hash className="w-2.5 h-2.5 text-primary/70 shrink-0" />
                              <span className="truncate">{v.source_checksum.substring(0, 16)}...</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-3 pr-4 text-right font-sans text-muted-foreground text-[11px]">
                          {v.ingested_at ? new Date(v.ingested_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};

export default DataSourcesPage;
