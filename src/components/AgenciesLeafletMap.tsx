"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapAgencyItem {
  id: string;
  name: string;
  type?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
}

interface AgenciesLeafletMapProps {
  agencies: MapAgencyItem[];
  selectedAgencyId: string | null;
  onSelectAgency: (id: string) => void;
}

export default function AgenciesLeafletMap({
  agencies,
  selectedAgencyId,
  onSelectAgency,
}: AgenciesLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const validAgencies = agencies.filter(
    (ag) =>
      typeof ag.latitude === "number" &&
      typeof ag.longitude === "number" &&
      Number.isFinite(ag.latitude) &&
      Number.isFinite(ag.longitude)
  );

  // Initialisation de la carte Leaflet
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      validAgencies.length > 0
        ? [validAgencies[0].latitude!, validAgencies[0].longitude!]
        : [46.603354, 1.888334];

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: validAgencies.length > 0 ? 10 : 6,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mise à jour des marqueurs et du cadrage
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (validAgencies.length === 0) return;

    const bounds = L.latLngBounds([]);

    for (const ag of validAgencies) {
      const isSelected = ag.id === selectedAgencyId;
      const lat = ag.latitude!;
      const lon = ag.longitude!;
      bounds.extend([lat, lon]);

      const marker = L.circleMarker([lat, lon], {
        radius: isSelected ? 10 : 7,
        color: "#ffffff",
        weight: 2,
        fillColor: isSelected ? "#2563eb" : "#059669",
        fillOpacity: 0.95,
      });

      const locationLine = [ag.address, ag.postalCode, ag.city]
        .filter(Boolean)
        .join(" ");
      const popupHtml = `
        <div style="min-width:170px;font-size:12px;line-height:1.4">
          <div style="font-weight:700;color:#0f172a">${ag.name}</div>
          ${locationLine ? `<div style="color:#475569;margin-top:2px">${locationLine}</div>` : ""}
          ${ag.phone ? `<div style="color:#1e40af;margin-top:2px">Tél : ${ag.phone}</div>` : ""}
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on("click", () => {
        onSelectAgency(ag.id);
      });

      if (isSelected) {
        marker.openPopup();
      }

      marker.addTo(markersLayer);
    }

    const selected = validAgencies.find((ag) => ag.id === selectedAgencyId);
    if (selected) {
      map.setView([selected.latitude!, selected.longitude!], Math.max(map.getZoom(), 11), {
        animate: true,
      });
    } else if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
    }
  }, [validAgencies, selectedAgencyId, onSelectAgency]);

  if (validAgencies.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
        Aucune coordonnée GPS disponible pour ce département. Sélectionne une agence dans la liste ou lance un scan.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="z-0 h-72 w-full overflow-hidden rounded-xl border border-slate-200"
    />
  );
}