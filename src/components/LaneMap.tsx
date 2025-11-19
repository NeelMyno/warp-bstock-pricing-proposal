import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { ArcLayer, ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from '@deck.gl/core';
import { Map as ReactMap, Marker } from 'react-map-gl/maplibre';
import { PathStyleExtension } from '@deck.gl/extensions';
import { RotateCcw } from 'lucide-react';
import type { Layer } from '@deck.gl/core';
import { Lane, LaneCategory } from '../types';
import { getZipCodeCoordinates, getStateCoordinates } from '../utils/zipCodeService';
import { aggregateByDestinationState, StateAggregate } from '../utils/csvParser';

interface LaneMapProps {
  lanes: Lane[];
  selectedLane: Lane | null;
  hoveredLane: Lane | null;
  onLaneSelect: (lane: Lane) => void;
  activeCategory: LaneCategory;
}

// Map style - using a reliable raster style
const MAP_STYLE = {
  version: 8,
  name: 'Dark',
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
      ],
      tileSize: 256,
      attribution: '© CARTO © OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 18
    }
  ]
};

// Initial view state centered on the US
const INITIAL_VIEW_STATE = {
  longitude: -98.5795,
  latitude: 39.8283,
  zoom: 4,
  pitch: 0,
  bearing: 0
};


// Hover/selected accent color for map interactions
const ACCENT: [number, number, number] = [0, 255, 51];


const WARP_RGB: [number, number, number] = [34, 197, 94]; // green
const LTL_RGB: [number, number, number] = [59, 130, 246]; // blue

const getCarrierColor = (carrierType?: string): [number, number, number] => {
  const normalized = carrierType?.trim().toLowerCase();
  if (normalized === 'warp') return WARP_RGB;
  if (normalized === 'ltl') return LTL_RGB;
  // Default to LTL blue for any unknown/mixed carrier label
  return LTL_RGB;
};





export const LaneMap: React.FC<LaneMapProps> = ({
  lanes,
  selectedLane,
  hoveredLane,
  onLaneSelect,
  activeCategory: _activeCategory,
}) => {
  // State for controlling the view
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);



  // Local hover state for map interactions (separate from table hover)
  const [mapHoveredLaneId, setMapHoveredLaneId] = useState<string | null>(null);
  const [mapHoveredCrossdockZip, setMapHoveredCrossdockZip] = useState<string | null>(null);
  const hoverRaf = useRef<number | null>(null);
  const setHoverState = useCallback((laneId: string | null, crossdockZip: string | null) => {
    if (hoverRaf.current) cancelAnimationFrame(hoverRaf.current);
    hoverRaf.current = requestAnimationFrame(() => {
      setMapHoveredLaneId(laneId);
      setMapHoveredCrossdockZip(crossdockZip);
    });
  }, []);

  // Respect reduced motion for map transitions
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
  const transitionMs = prefersReducedMotion ? 0 : 120;

  // Crossdock locations state
  type CrossdockMarker = {
    lng: number;
    lat: number;
    zip: string;
    city: string;
    address: string;
    state: string;
  };
  const [crossdockMarkers, setCrossdockMarkers] = useState<CrossdockMarker[]>([]);

  // Load crossdock locations (CSV in public/warp_crossdock)
  useEffect(() => {
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result.map((v) => v.trim().replace(/^"|"$/g, ''));
    };

    const geocodeZip = async (zip: string): Promise<{ lat: number; lng: number } | null> => {
      const key = `zipcoords:${zip}`;
      try {
        const cached = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') return parsed;
        }
      } catch {}
      try {
        const res = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`);
        if (!res.ok) return null;
        const data = await res.json();
        const place = data?.places?.[0];
        const lat = place ? parseFloat(place.latitude) : NaN;
        const lng = place ? parseFloat(place.longitude) : NaN;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          try {
            if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify({ lat, lng }));
          } catch {}
          return { lat, lng };
        }
        return null;
      } catch {
        return null;
      }
    };

    const load = async () => {
      try {
        const resp = await fetch('/warp_crossdock/warp_crossdock_locations.csv');
        if (!resp.ok) return;
        const text = await resp.text();
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1) return;
        const header = parseCSVLine(lines[0]);
        const zipIdx = header.findIndex(h => /zip/i.test(h));
        const locIdx = header.findIndex(h => /location/i.test(h));
        const cityIdx = header.findIndex(h => /city/i.test(h));
        const stateIdx = header.findIndex(h => /state/i.test(h));
        const rows = lines.slice(1).map(parseCSVLine);
        const uniqueByZip = new Map<string, { zip: string; address: string; city: string; state: string }>();
        for (const r of rows) {
          const zip = r[zipIdx]?.trim();
          if (!zip) continue;
          if (!uniqueByZip.has(zip)) {
            uniqueByZip.set(zip, {
              zip,
              address: r[locIdx] || '',
              city: r[cityIdx] || '',
              state: r[stateIdx] || ''
            });
          }
        }
        const entries = Array.from(uniqueByZip.values());
        const coords = await Promise.all(entries.map(async e => {
          const c = await geocodeZip(e.zip);
          return c ? { ...e, lat: c.lat, lng: c.lng } : null;
        }));
        setCrossdockMarkers(coords.filter(Boolean) as CrossdockMarker[]);
      } catch (e) {

        console.error('Failed to load crossdock locations', e);
      }
    };

    load();
  }, []);











  // Reset view to show the entire US
  const resetView = useCallback(() => {
    setViewState({
      ...INITIAL_VIEW_STATE,
      transitionDuration: prefersReducedMotion ? 0 : 600,
      transitionInterpolator: new FlyToInterpolator()
    } as any);
  }, [prefersReducedMotion]);












  // Aggregated view by destination state for tooltips & synchronized map behavior
  const stateAggregates = useMemo<StateAggregate[]>(
    () => aggregateByDestinationState(lanes),
    [lanes]
  );

  const stateAggregateMap = useMemo(() => {
    const map = new Map<string, StateAggregate>();
    stateAggregates.forEach((agg) => {
      map.set(agg.state, agg);
    });
    return map;
  }, [stateAggregates]);

  const hoveredState = useMemo(() => {
    if (hoveredLane?.destState) return hoveredLane.destState;

    if (mapHoveredLaneId) {
      const lane = lanes.find((l) => l.id === mapHoveredLaneId);
      if (lane?.destState) return lane.destState;
    }

    if (mapHoveredCrossdockZip) {
      const lane = lanes.find((l) => l.crossdockZip && l.crossdockZip === mapHoveredCrossdockZip && l.destState);
      if (lane?.destState) return lane.destState;
    }

    return null;
  }, [hoveredLane, mapHoveredLaneId, mapHoveredCrossdockZip, lanes]);




  /* Create truck utilization HTML for tooltip (removed for Bstock simplification)
  const createTruckUtilizationHTML = useCallback((lane: Lane, allLanes?: Lane[]) => {
    // Determine pallets and trucks based on category
    let palletsPerDay = 0;
    let trucksNeeded = 0;

    // Determine parcel and LTL pallets based on category
    let parcelPallets = 0;
    let ltlPallets = 0;

    if (activeCategory === 'new') {
      parcelPallets = lane.parcelPallets || 0;
      ltlPallets = lane.ltlPallets || 0;
      palletsPerDay = parcelPallets + ltlPallets;
      trucksNeeded = palletsPerDay === 0 ? 0 : Math.ceil(palletsPerDay / config.palletsPerTruck);
    } else {
      const metrics = calculateLaneMetrics(lane, config);
      palletsPerDay = metrics.palletsPerDay;
      trucksNeeded = metrics.trucksPerDay;

      if (activeCategory === 'parcel-ltl' && allLanes) {
        // Find corresponding Parcel Only and LTL Only lanes
        const parcelLane = allLanes.find(l => l.category === 'parcel' && l.origin === lane.origin && l.destination === lane.destination);
        const ltlLane = allLanes.find(l => l.category === 'ltl' && l.origin === lane.origin && l.destination === lane.destination);
        parcelPallets = parcelLane?.palletsPerDay || 0;
        ltlPallets = ltlLane?.palletsPerDay || 0;
      } else if (activeCategory === 'parcel') {
        parcelPallets = palletsPerDay;
        ltlPallets = 0;
      } else if (activeCategory === 'ltl') {
        parcelPallets = 0;
        ltlPallets = palletsPerDay;
      }
    }

    if (trucksNeeded === 0) return '';

    // Create truck visualization for a single truck
    const createTruckVisualizationHTML = (truckIndex: number, parcelPalletsInTruck: number, ltlPalletsInTruck: number) => {
      const slots = [] as string[];
      const rows = 2;
      const cols = 15;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const slotIndex = row * cols + col;
          let slotColor = '#1f2937';
          let slotText = '';
          if (slotIndex < parcelPalletsInTruck) {
            slotColor = '#3b82f6';
            slotText = 'P';
          } else if (slotIndex < parcelPalletsInTruck + ltlPalletsInTruck) {
            slotColor = '#ef4444';
            slotText = 'L';
          }
          const x = 30 + col * 16;
          const y = 10 + row * 18;
          slots.push(`
            <rect x="${x}" y="${y}" width="14" height="16" fill="${slotColor}" stroke="#4b5563" stroke-width="0.5" rx="1"/>
            ${slotText ? `<text x="${x + 7}" y="${y + 11}" text-anchor="middle" fill="white" font-size="8" font-family="Arial">${slotText}</text>` : ''}
          `);
        }
      }

      const breakdownText = activeCategory === 'parcel-ltl' || activeCategory === 'new'
        ? `<div style="font-size: 10px; color: #6b7280; margin-top: 2px;">
             <span style=\"color: #60a5fa;\">${parcelPalletsInTruck}P</span> + <span style=\"color: #ef4444;\">${ltlPalletsInTruck}L</span>
           </div>`
        : '';

      return `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">
            Truck ${truckIndex + 1} (${parcelPalletsInTruck + ltlPalletsInTruck}/${config.palletsPerTruck} pallets)
            ${breakdownText}
          </div>
          <svg width="280" height="60" viewBox="0 0 280 60" style="border: 1px solid #4b5563; border-radius: 4px; background: #111827;">
            <rect x="5" y="5" width="270" height="50" fill="none" stroke="#4b5563" stroke-width="1" rx="4"/>
            <rect x="5" y="20" width="20" height="20" fill="#374151" stroke="#4b5563" stroke-width="1" rx="2"/>
            ${slots.join('')}
          </svg>
        </div>
      `;
    };

    // Calculate trucks and their pallet distribution (Parcel-first fill) and only render full trucks
    const trucks = [] as string[];
    let remainingParcelPallets = parcelPallets;
    let remainingLtlPallets = ltlPallets;
    const fullTrucksToShow = Math.floor((parcelPallets + ltlPallets) / config.palletsPerTruck);

    for (let i = 0; i < fullTrucksToShow; i++) {
      // Fill this truck strictly to capacity with parcel first, then LTL
      const parcelInTruck = Math.min(remainingParcelPallets, config.palletsPerTruck);
      const ltlInTruck = Math.min(remainingLtlPallets, config.palletsPerTruck - parcelInTruck);
      trucks.push(createTruckVisualizationHTML(i, parcelInTruck, ltlInTruck));
      remainingParcelPallets -= parcelInTruck;
      remainingLtlPallets -= ltlInTruck;
    }

    // Exception: Show a single partial truck for AVP (PA) → PHL when volume < capacity
    const isExceptionLane = lane.origin === 'AVP (PA)' && lane.destination === 'PHL';
    const remainingUsed = remainingParcelPallets + remainingLtlPallets;
    if (trucks.length === 0 && isExceptionLane && remainingUsed > 0) {
      trucks.push(createTruckVisualizationHTML(0, remainingParcelPallets, remainingLtlPallets));
    }

    const summaryBreakdown = (activeCategory === 'parcel-ltl' || activeCategory === 'new')
      ? `<div style=\"font-size: 10px; margin-top: 4px;\"><span style=\"color:#60a5fa;\">${parcelPallets}P</span> + <span style=\"color:#ef4444;\">${ltlPallets}L</span></div>`
      : '';

    return `
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #374151;">
        ${trucks.join('')}
        <div style="display: flex; justify-content: space-between; font-size: 10px;">
          <div>
            <span style="color: #9ca3af;">Pallets/Day</span>
            <div style="color: white; font-weight: bold;">${palletsPerDay}</div>
            ${summaryBreakdown}
          </div>
          <div style="text-align: right;">
            <span style="color: #9ca3af;">No. of trucks</span>
            <div style="color: #10b981; font-weight: bold;">${trucksNeeded}</div>
          </div>
        </div>
      </div>
    `;
  */
  // Process lanes data for visualization (Bstock two-hop: Origin → Crossdock → Destination)
  const { arcData, pathData, pointData } = useMemo(() => {
    const arcs: any[] = [];
    const paths: any[] = [];
    const points: any[] = [];

    const seenOrigin = new Set<string>();
    const seenCross = new Set<string>();
    const seenDest = new Set<string>();

    lanes.forEach((lane) => {
      const originZip = lane.originZip || lane.tomsOriginZip || '08831';
      const crossZip: string = lane.crossdockZip ?? '';
      const destZip: string = (lane.destZip ?? lane.destinationZip) ?? '';

      const originC = getZipCodeCoordinates(originZip);
      const crossC = crossZip ? getZipCodeCoordinates(crossZip) : null;
      let destC = destZip ? getZipCodeCoordinates(destZip) : null;

      // Fallback: if we don't have an exact ZIP coordinate for the destination,
      // use the approximate centroid of the destination state so that every
      // lane into that state still renders on the map.
      if (!destC && lane.destState) {
        destC = getStateCoordinates(lane.destState) ?? null;
      }

      if (!originC || !crossC || !destC) return;

      // Origin point (unique by origin zip)
      if (!seenOrigin.has(originZip)) {
        const originLabel =
          lane.originCity && lane.originState
            ? `${lane.originCity}, ${lane.originState}`
            : 'Monroe Township, NJ';

        points.push({
          position: [originC.longitude, originC.latitude],
          color: [255, 255, 255],
          radius: 8,
          type: 'origin',
          label: originLabel,
          zipCode: originZip
        });
        seenOrigin.add(originZip);
      }

      const isStateHovered =
        hoveredState && lane.destState && lane.destState === hoveredState;
      const isSelected = selectedLane?.id === lane.id;
      const isDirectHover =
        hoveredLane?.id === lane.id || mapHoveredLaneId === lane.id;

      const hovered = Boolean(isStateHovered || isDirectHover);
      const baseColor = getCarrierColor(lane.carrierType);

      // Leg 1: origin  crossdock (per-lane, colored by carrier)
      arcs.push({
        sourcePosition: [originC.longitude, originC.latitude],
        targetPosition: [crossC.longitude, crossC.latitude],
        lane,
        color: baseColor,
        width: 2,
        selected: isSelected,
        hovered,
        leg: 'o-c'
      });


      // Leg 2: crossdock → destination (per-lane, colored by carrier)
      paths.push({
        path: [
          [crossC.longitude, crossC.latitude],
          [destC.longitude, destC.latitude]
        ],
        lane,
        color: baseColor,
        width: 2,
        selected: isSelected,
        hovered,
        leg: 'c-d'
      });

      // Crossdock point (unique by zip)
      if (!seenCross.has(crossZip)) {
        points.push({
          position: [crossC.longitude, crossC.latitude],
          color: [255, 255, 255],
          radius: 5,
          type: 'crossdock',
          label: lane.crossdockName ?? 'Crossdock',
          zipCode: crossZip
        });
        seenCross.add(crossZip);
      }

      // Destination point (unique by zip)
      if (!seenDest.has(destZip)) {
        points.push({
          position: [destC.longitude, destC.latitude],
          color: baseColor,
          radius: 5,
          type: 'destination',
          label: lane.destName ?? lane.destination,
          zipCode: destZip,
          lane
        });
        seenDest.add(destZip);
      }
    });

    return { arcData: arcs, pathData: paths, pointData: points };
  }, [lanes, selectedLane, hoveredLane, mapHoveredLaneId, hoveredState]);











  // Create layers
  // Whether any map hover is active (table or map)
  const anyMapHover = Boolean(hoveredLane?.id || mapHoveredLaneId || mapHoveredCrossdockZip || hoveredState);
  const dimRGB = (c: [number, number, number], f = 0.35): [number, number, number] => [
    Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f)
  ];

  // Split lane geometry by carrier so we can draw LTL first and Warp on top,
  // ensuring green Warp lanes visually sit above blue LTL lanes.
  const splitByCarrier = <T extends { lane?: Lane }>(data: T[]) => {
    const warp: T[] = [];
    const nonWarp: T[] = [];
    data.forEach((d) => {
      const type = (d.lane?.carrierType ?? '').toLowerCase();
      if (type === 'warp') warp.push(d);
      else nonWarp.push(d);
    });
    return { warp, nonWarp };
  };

  const { warp: warpArcData, nonWarp: ltlArcData } = splitByCarrier(arcData as any[]);
  const { warp: warpPathData, nonWarp: ltlPathData } = splitByCarrier(pathData as any[]);

  const layers = [
    // Arc layers for origin → crossdock (per-lane, colored by carrier)
    // Draw LTL first, then Warp so green Warp arcs sit visually above blue LTL arcs.
    new ArcLayer({
      id: 'lane-arcs-ltl',
      data: ltlArcData,
      getSourcePosition: (d: any) => d.sourcePosition,
      getTargetPosition: (d: any) => d.targetPosition,
      getSourceColor: (d: any) => {
        const base = d.color as [number, number, number];
        const alphaStrong = 230;
        const alphaMedium = 160;
        const alphaDim = 80;

        if (d.selected || d.hovered) return [base[0], base[1], base[2], alphaStrong];
        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];
        return [base[0], base[1], base[2], alphaMedium];
      },
      getTargetColor: (d: any) => {
        const base = d.color as [number, number, number];
        const alphaStrong = 230;
        const alphaMedium = 160;
        const alphaDim = 80;

        if (d.selected || d.hovered) return [base[0], base[1], base[2], alphaStrong];
        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];
        return [base[0], base[1], base[2], alphaMedium];
      },
      getWidth: (d: any) => (d.selected ? (d.width ?? 2) * 2 : (d.width ?? 2)),
      widthUnits: 'pixels',
      pickable: false,
      transitions: {
        getSourceColor: transitionMs,
        getTargetColor: transitionMs,
        getWidth: transitionMs
      },
      updateTriggers: {
        getSourceColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, hoveredState],
        getTargetColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, hoveredState],
        getWidth: [selectedLane?.id]
      }
    }) as Layer,

    new ArcLayer({
      id: 'lane-arcs-warp',
      data: warpArcData,
      getSourcePosition: (d: any) => d.sourcePosition,
      getTargetPosition: (d: any) => d.targetPosition,
      getSourceColor: (d: any) => {
        const base = d.color as [number, number, number];
        const alphaStrong = 230;
        const alphaMedium = 160;
        const alphaDim = 80;

        if (d.selected || d.hovered) return [base[0], base[1], base[2], alphaStrong];
        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];
        return [base[0], base[1], base[2], alphaMedium];
      },
      getTargetColor: (d: any) => {
        const base = d.color as [number, number, number];
        const alphaStrong = 230;
        const alphaMedium = 160;
        const alphaDim = 80;

        if (d.selected || d.hovered) return [base[0], base[1], base[2], alphaStrong];
        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];
        return [base[0], base[1], base[2], alphaMedium];
      },
      getWidth: (d: any) => (d.selected ? (d.width ?? 2) * 2 : (d.width ?? 2)),
      widthUnits: 'pixels',
      pickable: false,
      transitions: {
        getSourceColor: transitionMs,
        getTargetColor: transitionMs,
        getWidth: transitionMs
      },
      updateTriggers: {
        getSourceColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, hoveredState],
        getTargetColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, hoveredState],
        getWidth: [selectedLane?.id]
      }
    }) as Layer,

    // Crossdock → Destination (per-lane, colored by carrier: Warp = green, LTL = blue)
    // Draw LTL first, then Warp so green Warp paths sit visually above blue LTL paths.
    new PathLayer({
      id: 'lane-dotted-paths-ltl',
      data: ltlPathData,
      getPath: (d: any) => d.path,
      getColor: (d: any) => {
        const base = d.color as [number, number, number];
        const alphaStrong = 230;
        const alphaMedium = 160;
        const alphaDim = 80;

        if (d.selected || d.hovered) return [base[0], base[1], base[2], alphaStrong];
        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];
        return [base[0], base[1], base[2], alphaMedium];
      },
      getWidth: (d: any) => {
        const base = d.width ?? 2;
        return d.selected ? base * 2 : base;
      },
      widthUnits: 'pixels',
      pickable: true,
      onHover: (info: any) => {
        if (info.object?.lane) {
          setHoverState(info.object.lane.id, info.object.lane.crossdockZip ?? null);
        } else {
          setHoverState(null, null);
        }
      },
      onClick: (info: any) => {
        if (info.object?.lane) onLaneSelect(info.object.lane);
      },
      extensions: [new PathStyleExtension({ dash: true })],
      getDashArray: () => [2, 4], // dotted
      transitions: {
        getColor: transitionMs,
        getWidth: transitionMs
      },
      updateTriggers: {
        getColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, hoveredState],
        getWidth: [selectedLane?.id]
      }
    }) as Layer,

    new PathLayer({
      id: 'lane-dotted-paths-warp',
      data: warpPathData,
      getPath: (d: any) => d.path,
      getColor: (d: any) => {
        const base = d.color as [number, number, number];
        const alphaStrong = 230;
        const alphaMedium = 160;
        const alphaDim = 80;

        if (d.selected || d.hovered) return [base[0], base[1], base[2], alphaStrong];
        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];
        return [base[0], base[1], base[2], alphaMedium];
      },
      getWidth: (d: any) => {
        const base = d.width ?? 2;
        return d.selected ? base * 2 : base;
      },
      widthUnits: 'pixels',
      pickable: true,
      onHover: (info: any) => {
        if (info.object?.lane) {
          setHoverState(info.object.lane.id, info.object.lane.crossdockZip ?? null);
        } else {
          setHoverState(null, null);
        }
      },
      onClick: (info: any) => {
        if (info.object?.lane) onLaneSelect(info.object.lane);
      },
      extensions: [new PathStyleExtension({ dash: true })],
      getDashArray: () => [2, 4], // dotted
      transitions: {
        getColor: transitionMs,
        getWidth: transitionMs
      },
      updateTriggers: {
        getColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, hoveredState],
        getWidth: [selectedLane?.id]
      }
    }) as Layer,

    // 100-mile radius ring around origin (next-day delivery zone)
    new ScatterplotLayer({
      id: 'origin-radius',
      data: pointData.filter((d: any) => d.type === 'origin'),
      getPosition: (d: any) => d.position,
      filled: false,
      stroked: true,
      getFillColor: [0, 0, 0, 0],
      getLineColor: [255, 255, 255, 160],
      radiusUnits: 'meters',
      getRadius: () => 160934, // ~100 miles
      lineWidthUnits: 'pixels',
      getLineWidth: 2,
      pickable: false
    }) as Layer,







    // Scatterplot layer for points
    new ScatterplotLayer({
      id: 'lane-points',
      data: pointData,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => {
        const isHovered = d.lane && (d.lane.id === hoveredLane?.id || d.lane.id === mapHoveredLaneId);
        if (isHovered) return ACCENT;
        if (anyMapHover) return dimRGB(d.color);
        return d.color;
      },
      getRadius: (d: any) => {
        const base = d.radius;
        const isHovered = d.lane && (d.lane.id === hoveredLane?.id || d.lane.id === mapHoveredLaneId);
        return isHovered ? base * 2 : base;
      },
      pickable: true,
      onClick: (info: any) => {
        if (info.object?.lane) {
          onLaneSelect(info.object.lane);
        }
      },
      transitions: {
        getFillColor: transitionMs,
        getRadius: transitionMs
      },
      updateTriggers: {
        getFillColor: [hoveredLane?.id, mapHoveredLaneId],
        getRadius: [hoveredLane?.id, mapHoveredLaneId]
      }
    }) as Layer,



  ];






  return (
    <div className="h-full w-full relative" onMouseLeave={() => setHoverState(null, null)}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({viewState}) => setViewState(viewState as any)}
        controller={true}
        layers={layers}
        pickingRadius={20}
        getTooltip={({ object, x, y }: any) => {
          const _tooltipStyle = (maxW: number) => {
            const m = 12;
            const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
            const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
            // Clamp position so the tooltip stays in-viewport for the requested width
            const nearRight = x > vw - maxW - m;
            const nearBottom = y > vh / 2;
            const style: Partial<CSSStyleDeclaration> = {
              transform: 'translate3d(0,0,0)',
              willChange: 'transform',
              backgroundColor: 'transparent',
              fontSize: '13px',
              maxWidth: `min(${maxW}px, calc(100vw - ${m * 2}px))`,
              // Always reset opposing sides so deck.gl doesn't keep stale values
              left: 'auto',
              right: 'auto',
              top: 'auto',
              bottom: 'auto'
            };
            if (nearRight) {
              style.right = `${m}px`;
              style.left = 'auto';
            } else {
              style.left = `${Math.max(m, Math.min(x + m, vw - m - maxW))}px`;
              style.right = 'auto';
            }
            if (nearBottom) {
              style.bottom = `${m}px`;
              style.top = 'auto';
            } else {
              style.top = `${y + m}px`;
              style.bottom = 'auto';
            }
            return style;
          };
          if (object?.lane) {
            const lane = object.lane as Lane;

            // Aggregate by destination state so that hovering any lane into a state
            // shows a single tooltip and highlights all of those lanes.
            const stateKey = lane.destState ?? null;
            if (!stateKey) return null;

            const aggregate = stateAggregateMap.get(stateKey);
            const totalPieces = aggregate?.totalPieces ?? lane.totalPieces ?? 0;


            const originCity = lane.originCity ?? 'Monroe Township';
            const originState = lane.originState ?? 'NJ';
            const originZip = lane.originZip ?? '08831';
            const destinationState = stateKey;
            const formattedPieces = Number.isFinite(totalPieces)
              ? totalPieces.toLocaleString('en-US')
              : '-';

            const title = `${originCity}, ${originState} ${originZip} → ${destinationState}`;

            return {
              html: `
                <div class="max-w-md rounded-2xl border border-brd-1 bg-surface-1/95 shadow-elev-2 backdrop-blur-2xl px-3 py-2.5 text-sm">
                  <div class="text-[15px] font-semibold text-text-1 mb-0.5">${title}</div>
                  <div class="text-[11px] text-text-2 mb-2">
                    Origin: ${originCity}, ${originState} ${originZip}<br/>
                    Destination state: ${destinationState}
                  </div>
                  <div class="space-y-2 text-xs">
                    <div class="flex items-baseline justify-between gap-3">
                      <span class="text-text-2">Total pieces into ${destinationState}</span>
                      <span class="font-semibold text-text-1 tabular-nums">${formattedPieces}</span>
                    </div>
                  </div>
                </div>
              `,
              style: _tooltipStyle(360)
            };
          }
          if (object?.type === 'origin') {
            return {
              html: `
                <div class="max-w-xs rounded-xl border border-brd-1 bg-surface-1/95 shadow-elev-2 backdrop-blur-2xl px-3 py-2">
                  <div class="text-sm font-semibold text-text-1">${object.label}</div>
                  <div class="mt-0.5 text-[11px] text-text-2">Fulfillment Center</div>
                </div>
              `,
              style: _tooltipStyle(320)
            };
          }
          if (object?.type === 'destination') {
            return {
              html: `
                <div class="max-w-xs rounded-xl border border-brd-1 bg-surface-1/95 shadow-elev-2 backdrop-blur-2xl px-3 py-2">
                  <div class="text-sm font-semibold text-text-1">${object.label}</div>
                  <div class="mt-0.5 text-[11px] text-text-2">Destination</div>
                </div>
              `,
              style: _tooltipStyle(320)
            };
          }
          return null;
        }}
      >
        <ReactMap
          mapStyle={MAP_STYLE as any}
          attributionControl={false}
          onError={(error) => {
            console.error('Map error:', error);
          }}
          onLoad={() => {
            console.log('Map loaded successfully');
          }}
        >
          {crossdockMarkers.map((m, idx) => (
            <Marker key={`crossdock-${m.zip}-${idx}`} longitude={m.lng} latitude={m.lat} anchor="bottom">
              <img
                src="/warp_crossdock/warp_warehouse.svg"
                alt={`Crossdock ${m.city} ${m.state}`}
                style={{ width: 24, height: 24, opacity: 0.7 }}
              />
            </Marker>
          ))}
        </ReactMap>
      </DeckGL>

      {/* Control Buttons */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        <button
          onClick={resetView}
          className="bg-surface-2/90 hover:bg-surface-3 text-text-1 px-3 py-2 rounded-md border border-brd-1 text-sm font-medium transition-all duration-200 hover:shadow-elev-1 active:scale-[0.98] flex items-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          title="Reset map view to show entire US"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset View</span>
        </button>


      </div>

      {/* Legend (Bstock) */}
      <div className="absolute top-4 right-4 bg-surface-2/90 p-3 rounded-md border border-brd-1 space-y-2">
        {/* Lanes by carrier */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-0.5 rounded" style={{ backgroundColor: 'rgb(34,197,94)' }}></div>
            <span className="text-text-1 text-xs">Warp lanes</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-0.5 rounded" style={{ backgroundColor: 'rgb(59,130,246)' }}></div>
            <span className="text-text-1 text-xs">LTL lanes</span>
          </div>
        </div>
        {/* Markers & zone */}
        <div className="space-y-1 pt-1 border-t border-brd-1/40">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ffffff' }}></div>
            <span className="text-text-1 text-xs">Origin: Monroe Township, NJ</span>
          </div>
          <div className="flex items-center space-x-2">
            <img src="/warp_crossdock/warp_warehouse.svg" alt="Crossdock" className="w-4 h-4 opacity-80" />
            <span className="text-text-1 text-xs">Crossdock terminals</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#cccccc' }}></div>
            <span className="text-text-1 text-xs">Destination zips</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full border border-white/60"></div>
            <span className="text-text-1 text-xs">100-mile next-day zone</span>
          </div>
        </div>
      </div>
    </div>
  );
};
