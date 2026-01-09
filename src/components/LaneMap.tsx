import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { ArcLayer, ScatterplotLayer, PathLayer, IconLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from '@deck.gl/core';
import { Map as ReactMap, Marker } from 'react-map-gl/maplibre';
import type { Layer } from '@deck.gl/core';
import { Lane, LaneCategory } from '../types';
import { getZipCodeCoordinates, getStateCoordinates } from '../utils/zipCodeService';
import { aggregateByDestinationState, StateAggregate } from '../utils/csvParser';

interface LaneMapProps {
  lanes: Lane[];
  selectedLane: Lane | null;
  hoveredLane: Lane | null;
  onLaneSelect: (lane: Lane) => void;
  // Incrementing signal from parent to reset the map camera to the initial US view.
  resetSignal?: number;
  activeCategory: LaneCategory;
  focusedState: string | null;
	// When a focusedState is active, clicking the map background should clear it.
	onClearFocusedState?: () => void;
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
  zoom: 3.5,
  pitch: 0,
  bearing: 0
};


// Hover/selected accent color for map interactions
const ACCENT: [number, number, number] = [0, 255, 51];


const WARP_RGB: [number, number, number] = [34, 197, 94]; // green
const LTL_RGB: [number, number, number] = [59, 130, 246]; // blue

// Highlight color for lanes classified as local deliveries (<= 100 miles)
const LOCAL_RGB: [number, number, number] = [245, 158, 11]; // amber

// Special highlight color for the short Monroe, NJ (08831) -> Clark, NJ (07036) lane.
const MONROE_TO_CLARK_RGB: [number, number, number] = [252, 211, 77]; // yellow

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
  resetSignal,
  activeCategory: _activeCategory,
  focusedState,
	onClearFocusedState,
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
  // Disable visual tween for instant hover/dim changes
  const transitionMs = 0;

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

  // Origin locations derived from lane data (for Costco markers)
  type OriginMarker = {
    lng: number;
    lat: number;
    zip: string;
    label: string;
  };

  const originMarkers: OriginMarker[] = useMemo(() => {
    const byZip = new Map<string, OriginMarker>();

    lanes.forEach((lane) => {
      const rawZip = lane.originZip || lane.tomsOriginZip || '08831';
      const originZip = rawZip.trim();
      if (!originZip || byZip.has(originZip)) return;

      const originC = getZipCodeCoordinates(originZip);
      if (!originC) return;

	    // Per product requirement: display origin marker as Costco (instead of a specific city name).
	    const label = 'Costco';

      byZip.set(originZip, {
        zip: originZip,
        lng: originC.longitude,
        lat: originC.latitude,
        label,
      });
    });

    return Array.from(byZip.values());
  }, [lanes]);


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

	  // Allow the parent to trigger a map camera reset while keeping a single global reset action.
	  const lastResetSignalRef = useRef<number | undefined>(undefined);
	  useEffect(() => {
	    if (resetSignal == null) return;
	    if (lastResetSignalRef.current === undefined) {
	      lastResetSignalRef.current = resetSignal;
	      return;
	    }
	    if (resetSignal !== lastResetSignalRef.current) {
	      lastResetSignalRef.current = resetSignal;
	      resetView();
	    }
	  }, [resetSignal, resetView]);












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

  const highlightState = useMemo(
    () => hoveredState || focusedState || null,
    [hoveredState, focusedState]
  );






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
	        const originLabel = 'Costco';

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

      const isStateHighlighted =
        highlightState && lane.destState && lane.destState === highlightState;
      const isSelected = selectedLane?.id === lane.id;
      const isDirectHover =
        hoveredLane?.id === lane.id || mapHoveredLaneId === lane.id;

      const hovered = Boolean(isStateHighlighted || isDirectHover);
      const baseColor = getCarrierColor(lane.carrierType);

      const isMonroeToClark = originZip === '08831' && crossZip === '07036';
      const arcColor = isMonroeToClark ? MONROE_TO_CLARK_RGB : baseColor;

      // Leg 1: origin → crossdock (per-lane, colored by carrier)
      // Very short hops (like 08831 → 07036) looked like a vertical "spike"
      // once we added curvature. For most of those, we flatten the arc
      // (height = 0) so it hugs the map. For the key 08831 → 07036 lane,
      // keep a subtle bow with a fixed, modest height.
      const dx = crossC.longitude - originC.longitude;
      const dy = crossC.latitude - originC.latitude;
      const distanceMeters = Math.sqrt(dx * dx + dy * dy) * 111000; // rough great-circle

      let height = 0;
	      if (isMonroeToClark) {
	        // Keep a very gentle bow for 08831 -> 07036 so it never "shoots into space".
        height = .8;
      } else if (distanceMeters > 100_000) {
        const rawHeight = distanceMeters * 0.05;
        height = Math.min(20000, Math.max(5000, rawHeight));
      } else {
        height = 0;
      }

      arcs.push({
        sourcePosition: [originC.longitude, originC.latitude],
        targetPosition: [crossC.longitude, crossC.latitude],
        lane,
        color: arcColor,
        width: 2,
        selected: isSelected,
        hovered,
        leg: 'o-c',
        height,
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
  }, [lanes, selectedLane, hoveredLane, mapHoveredLaneId, hoveredState, highlightState]);











  // Create layers
  // Whether any map hover or focus is active (table, map, or state focus)
  const anyMapHover = Boolean(
    hoveredLane?.id ||
    mapHoveredLaneId ||
    mapHoveredCrossdockZip ||
    highlightState
  );

  // Helper to dim carrier colors toward the background while preserving hue
  const dimRGB = (c: [number, number, number], f = 0.25): [number, number, number] => [
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

	const localArcData = useMemo(
		() => (arcData as any[]).filter((d: any) => d?.lane?.isLocalDelivery100 === true),
		[arcData]
	);
	const localPathData = useMemo(
		() => (pathData as any[]).filter((d: any) => d?.lane?.isLocalDelivery100 === true),
		[pathData]
	);

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
        const alphaMedium = 150;
        const alphaDim = 3; // ~1% opacity when another lane/state is highlighted

        if (d.selected || d.hovered) return [base[0], base[1], base[2], alphaStrong];
        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];

        const bg = dimRGB(base, 0.6);
        return [bg[0], bg[1], bg[2], alphaMedium];
      },
      getTargetColor: (d: any) => {
        const base = d.color as [number, number, number];
        const alphaStrong = 230;
        const alphaMedium = 150;
        const alphaDim = 3; // ~1% opacity when another lane/state is highlighted

        if (d.selected || d.hovered) return [base[0], base[1], base[2], alphaStrong];
        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];

        const bg = dimRGB(base, 0.6);
        return [bg[0], bg[1], bg[2], alphaMedium];
      },
      getWidth: (d: any) => (d.selected ? (d.width ?? 2) * 2 : (d.width ?? 2)),
      getHeight: (d: any) => d.height ?? 15000,
      widthUnits: 'pixels',
      pickable: false,
      transitions: {
        getSourceColor: transitionMs,
        getTargetColor: transitionMs,
        getWidth: transitionMs
      },
      updateTriggers: {
        getSourceColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, highlightState],
        getTargetColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, highlightState],
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
        const alphaMedium = 150;
        const alphaDim = 3; // ~1% opacity when another lane/state is highlighted

        if (d.selected || d.hovered) return [base[0], base[1], base[2], alphaStrong];
        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];

        const bg = dimRGB(base, 0.6);
        return [bg[0], bg[1], bg[2], alphaMedium];
      },
      getTargetColor: (d: any) => {
        const base = d.color as [number, number, number];
        const alphaStrong = 230;
        const alphaMedium = 150;
        const alphaDim = 3; // ~1% opacity when another lane/state is highlighted

        if (d.selected || d.hovered) return [base[0], base[1], base[2], alphaStrong];
        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];

        const bg = dimRGB(base, 0.6);
        return [bg[0], bg[1], bg[2], alphaMedium];
      },
      getWidth: (d: any) => (d.selected ? (d.width ?? 2) * 2 : (d.width ?? 2)),
      getHeight: (d: any) => d.height ?? 15000,
      widthUnits: 'pixels',
      pickable: false,
      transitions: {
        getSourceColor: transitionMs,
        getTargetColor: transitionMs,
        getWidth: transitionMs
      },
      updateTriggers: {
        getSourceColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, highlightState],
        getTargetColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, highlightState],
        getWidth: [selectedLane?.id]
      }
    }) as Layer,

	    // Local-delivery overlay (origin -> destination <= 100 miles)
	    // Draw on top of carrier arcs so local lanes are visually distinct.
	    new ArcLayer({
	      id: 'lane-arcs-local',
	      data: localArcData,
	      getSourcePosition: (d: any) => d.sourcePosition,
	      getTargetPosition: (d: any) => d.targetPosition,
	      getSourceColor: (d: any) => {
	        const base = LOCAL_RGB;
	        const alphaStrong = 255;
	        const alphaNormal = 220;
	        const alphaDim = 60;
	        if (d.selected || d.hovered) return [ACCENT[0], ACCENT[1], ACCENT[2], alphaStrong];
	        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];
	        return [base[0], base[1], base[2], alphaNormal];
	      },
	      getTargetColor: (d: any) => {
	        const base = LOCAL_RGB;
	        const alphaStrong = 255;
	        const alphaNormal = 220;
	        const alphaDim = 60;
	        if (d.selected || d.hovered) return [ACCENT[0], ACCENT[1], ACCENT[2], alphaStrong];
	        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];
	        return [base[0], base[1], base[2], alphaNormal];
	      },
	      getWidth: (d: any) => {
	        if (d.selected) return 6;
	        if (d.hovered) return 5;
	        return 4;
	      },
	      getHeight: (d: any) => d.height ?? 15000,
	      widthUnits: 'pixels',
	      pickable: false,
	      parameters: {
	        depthTest: false,
	      },
	      transitions: {
	        getSourceColor: transitionMs,
	        getTargetColor: transitionMs,
	        getWidth: transitionMs
	      },
	      updateTriggers: {
	        getSourceColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, highlightState],
	        getTargetColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, highlightState],
	        getWidth: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, highlightState]
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
        const alphaMedium = 150;
        const alphaDim = 3; // ~1% opacity when another lane/state is highlighted

        if (d.selected || d.hovered) return [base[0], base[1], base[2], alphaStrong];
        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];

        const bg = dimRGB(base, 0.6);
        return [bg[0], bg[1], bg[2], alphaMedium];
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
      transitions: {
        getColor: transitionMs,
        getWidth: transitionMs
      },
      updateTriggers: {
        getColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, highlightState],
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
        const alphaMedium = 150;
        const alphaDim = 3; // ~1% opacity when another lane/state is highlighted

        if (d.selected || d.hovered) return [base[0], base[1], base[2], alphaStrong];
        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];

        const bg = dimRGB(base, 0.6);
        return [bg[0], bg[1], bg[2], alphaMedium];
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
      transitions: {
        getColor: transitionMs,
        getWidth: transitionMs
      },
      updateTriggers: {
        getColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, highlightState],
        getWidth: [selectedLane?.id]
      }
    }) as Layer,

	    // Local-delivery overlay for crossdock -> destination legs
	    new PathLayer({
	      id: 'lane-dotted-paths-local',
	      data: localPathData,
	      getPath: (d: any) => d.path,
	      getColor: (d: any) => {
	        const base = LOCAL_RGB;
	        const alphaStrong = 255;
	        const alphaNormal = 220;
	        const alphaDim = 60;
	        if (d.selected || d.hovered) return [ACCENT[0], ACCENT[1], ACCENT[2], alphaStrong];
	        if (anyMapHover) return [base[0], base[1], base[2], alphaDim];
	        return [base[0], base[1], base[2], alphaNormal];
	      },
	      getWidth: (d: any) => {
	        if (d.selected) return 6;
	        if (d.hovered) return 5;
	        return 4;
	      },
	      widthUnits: 'pixels',
	      pickable: false,
	      parameters: {
	        depthTest: false,
	      },
	      transitions: {
	        getColor: transitionMs,
	        getWidth: transitionMs
	      },
	      updateTriggers: {
	        getColor: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, highlightState],
	        getWidth: [selectedLane?.id, hoveredLane?.id, mapHoveredLaneId, highlightState]
	      }
	    }) as Layer,

	    // 100-mile radius ring around the origin (local delivery zone)
	    new ScatterplotLayer({
	      id: 'origin-local-radius',
	      data: originMarkers,
	      getPosition: (d: any) => [d.lng, d.lat],
      filled: false,
      stroked: true,
      getFillColor: [0, 0, 0, 0],
	      getLineColor: [LOCAL_RGB[0], LOCAL_RGB[1], LOCAL_RGB[2], 160],
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


    // Icon layer for origin Costco logo, drawn above all lanes and points
    new IconLayer({
      id: 'origin-costco-icons',
      data: originMarkers,
      getPosition: (d: any) => [d.lng, d.lat],
      getIcon: () => 'costco',
      iconAtlas: '/toms/media/costco.svg',
      iconMapping: {
        // costco.svg is a 1080x1080 circle; use the full icon and anchor at its center
        costco: { x: 0, y: 0, width: 1080, height: 1080, anchorX: 540, anchorY: 540 },
      },
      sizeScale: 1,
      getSize: () => 32,
      billboard: true,
      parameters: {
        depthTest: false,
      },
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
			onClick={(info: any) => {
			  // Clear state focus when clicking on map background.
			  if (!info?.object && focusedState && onClearFocusedState) {
			    onClearFocusedState();
			  }
			}}
        getTooltip={({ object, x, y }: any) => {
          const _tooltipStyle = (maxW: number) => {
            const m = 12;
            const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
            // Clamp position so the tooltip stays in-viewport for the requested width
            const nearRight = x > vw - maxW - m;
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
            // Always position relative to cursor vertically
            style.top = `${y + m}px`;
            style.bottom = 'auto';
            return style;
          };
          if (object?.lane) {
            const lane = object.lane as Lane;

            // Aggregate by destination state so that hovering any lane into a state
            // shows a single tooltip and highlights all of those lanes.
            const stateKey = lane.destState ?? null;
            if (!stateKey) return null;

            const aggregate = stateAggregateMap.get(stateKey);
            const totalShipments =
              typeof aggregate?.totalShipments === 'number'
                ? aggregate.totalShipments
                : aggregate?.lanes.length ?? 1;
            const localShipments = aggregate?.localShipments ?? 0;
            const unknownShipments = aggregate?.unknownDistanceShipments ?? 0;
            const knownShipments = totalShipments - unknownShipments;
            const localPct = knownShipments > 0 ? Math.round((localShipments / knownShipments) * 100) : 0;

            const destinationState = stateKey;
            const formattedShipments = Number.isFinite(totalShipments)
              ? totalShipments.toLocaleString('en-US')
              : '-';
            const formattedLocal = Number.isFinite(localShipments)
              ? localShipments.toLocaleString('en-US')
              : '-';
            const formattedUnknown = Number.isFinite(unknownShipments)
              ? unknownShipments.toLocaleString('en-US')
              : '-';

            // Build rows
            const rows = [
              `<div class="flex items-baseline justify-between gap-3">
                <span class="text-text-2">Total shipments</span>
                <span class="font-semibold text-text-1 tabular-nums">${formattedShipments}</span>
              </div>`,
              `<div class="flex items-baseline justify-between gap-3">
                <span class="text-text-2">Local (≤100mi)</span>
                <span class="font-semibold text-text-1 tabular-nums">${formattedLocal} (${localPct}%)</span>
              </div>`
            ];
            if (unknownShipments > 0) {
              rows.push(
                `<div class="flex items-baseline justify-between gap-3">
                  <span class="text-text-2">Unknown distance</span>
                  <span class="font-medium text-amber-300 tabular-nums">${formattedUnknown}</span>
                </div>`
              );
            }

            return {
              html: `
                <div class="max-w-md rounded-2xl border border-brd-1 bg-surface-1/95 shadow-elev-2 backdrop-blur-2xl px-3 py-2.5 text-sm">
                  <div class="text-[15px] font-semibold text-text-1 mb-2">State: ${destinationState}</div>
                  <div class="space-y-1.5 text-xs">
                    ${rows.join('')}
                  </div>
                </div>
              `,
              style: _tooltipStyle(320)
            };
          }
          if (object?.type === 'origin') {
            return {
              html: `
                <div class="max-w-xs rounded-xl border border-brd-1 bg-surface-1/95 shadow-elev-2 backdrop-blur-2xl px-3 py-2">
                  <div class="text-sm font-semibold text-text-1">${object.label}</div>
	                  <div class="mt-0.5 text-[11px] text-text-2">Origin</div>
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
	          <div className="flex items-center space-x-2">
	            <div className="w-6 h-0.5 rounded" style={{ backgroundColor: 'rgb(245,158,11)' }}></div>
	            <span className="text-text-1 text-xs">Local deliveries (≤ 100mi)</span>
	          </div>
        </div>
        {/* Markers & zone */}
        <div className="space-y-1 pt-1 border-t border-brd-1/40">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ffffff' }}></div>
	            <span className="text-text-1 text-xs">Origin: Costco</span>
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
	            <div className="w-3 h-3 rounded-full border" style={{ borderColor: 'rgba(245,158,11,0.8)' }}></div>
	            <span className="text-text-1 text-xs">100-mile local zone</span>
          </div>
        </div>
      </div>

      {/* Focused state chip */}
      {focusedState && (
        <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full border border-brd-1 bg-surface-2/95 px-3 py-1.5 text-xs shadow-elev-1 backdrop-blur">
          <span className="text-text-2">Focused:</span>
          <span className="font-semibold text-text-1">{focusedState}</span>
          <button
            type="button"
            onClick={onClearFocusedState}
            className="ml-1 rounded-full p-0.5 text-text-2 hover:bg-surface-3/60 hover:text-text-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
            title="Clear focused state"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
