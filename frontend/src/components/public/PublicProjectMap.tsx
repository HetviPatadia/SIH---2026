import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { usePublicLanguage } from '../../context/PublicLanguageContext';

interface PublicProjectMapProps {
  projects: Array<Record<string, any>>;
  onSelectProject?: (project: Record<string, any>) => void;
  height?: string;
}

export const PublicProjectMap: React.FC<PublicProjectMapProps> = ({
  projects,
  onSelectProject,
  height = '500px',
}) => {
  const { t } = usePublicLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const DEFAULT_CENTER: L.LatLngExpression = [22.0, 78.9];
  const DEFAULT_ZOOM = 5;

  // Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors | eSAKSHI Public Portal',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers & Auto-Zoom when projects list changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    const validProjects = projects.filter((p) => {
      const loc = p.location || p;
      const lat = loc.latitude;
      const lon = loc.longitude;
      return lat !== null && lon !== null && lat !== undefined && lon !== undefined && typeof lat === 'number' && typeof lon === 'number' && lat >= 8.0 && lat <= 37.0 && lon >= 68.0 && lon <= 97.0;
    });

    if (validProjects.length === 0) {
      mapInstanceRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    const bounds = L.latLngBounds([]);

    validProjects.forEach((p) => {
      const loc = p.location || p;
      const lat = loc.latitude;
      const lon = loc.longitude;
      bounds.extend([lat, lon]);

      const isCompleted = p.status === 'Completed';

      const customIcon = L.divIcon({
        className: 'custom-public-marker',
        html: `
          <div style="
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background-color: ${isCompleted ? '#10B981' : '#3B82F6'};
            border: 2px solid #FFFFFF;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([lat, lon], { icon: customIcon });

      const title = p.title || p.description || p.project_id;
      const sector = p.sector || 'General';
      const status = p.status || 'Sanctioned';
      const amount = p.financial ? p.financial.sanctioned_amount : p.sanctioned_amount || 0;
      const amountStr = (amount / 100000).toFixed(2);

      const inspectText = t('map.inspectBtn', t('view_public_details', 'Inspect Project'));
      const statusTranslated = t(`statusTypes.${status}`, status);
      const lakhText = t('metrics.lakhs', 'Lakh');

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; padding: 4px; max-width: 220px;">
          <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 4px; line-height: 1.3;">
            ${title}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            ${p.district || ''}, ${p.state || ''} &middot; <strong>${sector}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${isCompleted ? '#ecfdf5' : '#eff6ff'}; color: ${isCompleted ? '#059669' : '#2563eb'}; font-weight: 600;">
              ${statusTranslated}
            </span>
            <span style="font-size: 11px; font-family: monospace; font-weight: 600; color: #0f172a;">
              ₹${amountStr} ${lakhText}
            </span>
          </div>
          <button
            id="btn-public-det-${p.project_id}"
            style="
              width: 100%;
              padding: 5px;
              background: #0f172a;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
            "
          >
            ${inspectText} &rarr;
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-public-det-${p.project_id}`);
        if (btn) {
          btn.onclick = () => {
            if (onSelectProject) onSelectProject(p);
          };
        }
      });

      markersGroupRef.current?.addLayer(marker);
    });

    if (validProjects.length > 0) {
      if (validProjects.length === 1) {
        const singleLoc = validProjects[0].location || validProjects[0];
        mapInstanceRef.current.setView([singleLoc.latitude, singleLoc.longitude], 12);
      } else {
        mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
      }
    }
  }, [projects, onSelectProject, t]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border shadow-sm bg-surface">
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />
      <div className="absolute bottom-2 left-2 z-[1000] px-2.5 py-1 rounded bg-surface/90 backdrop-blur-md border border-border text-[10px] font-mono text-muted-foreground flex items-center gap-2">
        <span>{projects.length} {t('table.results', 'markers shown')}</span>
        <span className="text-[9px] text-primary">{t('map.zoomNotice', 'Zoom in to explore village-level markers')}</span>
      </div>
    </div>
  );
};
