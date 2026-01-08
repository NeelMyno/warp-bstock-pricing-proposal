import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type React from 'react';

import LaneTable from './components/LaneTable';
import BstockOverview from './components/BstockOverview';


import { LaneMap } from './components/LaneMap';
import { AppState, Lane, TruckConfiguration, LaneCategory } from './types';
import { filterLanesByCategory } from './utils/calculations';
	import { loadCSVData, aggregateByDestinationState, StateAggregate } from './utils/csvParser';
import seedData from './data/seed.json';

		import { RefreshCcw } from 'lucide-react';



type CarrierFilter = 'all' | 'warp' | 'ltl';
type DistanceFilter = 'all' | 'local' | 'nonLocal';



function App() {
  const [appState, setAppState] = useState<AppState>({
    config: seedData.config as TruckConfiguration,
    lanes: [],
    selectedLane: null,
    activeCategory: 'new' as LaneCategory,
    kpis: seedData.kpis
  });

  const [hoveredLane, setHoveredLane] = useState<Lane | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tooltip positioning helpers
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });



  // Track hidden groups for map visibility
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());



	  // Bstock-specific filters and focus state
	  const [carrierFilter, setCarrierFilter] = useState<CarrierFilter>('all');
	  const [minPiecesFilter, setMinPiecesFilter] = useState<number>(0);
	  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('all');
	  const [focusedState, setFocusedState] = useState<string | null>(null);
			const [categoryNotice, setCategoryNotice] = useState<string | null>(null);

	  // Global UI state
	  const [showOnlySelected, setShowOnlySelected] = useState(false);
	  const [mapResetSignal, setMapResetSignal] = useState(0);



  // Resizable layout state
	  // Start the table wider so it can comfortably fit columns/filters,
	  // while leaving remaining space to the map.
	  const [leftWidth, setLeftWidth] = useState(40); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track when we are on a medium-and-up viewport so we can:
  // - Use the resizable split layout (table left, map right)
  // - Fall back to a stacked layout with full-width panels on small screens
  const [isMdUp, setIsMdUp] = useState(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return true;
    return window.matchMedia('(min-width: 768px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMdUp(event.matches);
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

	// Single source of truth: always load lanes from the bundled Bstock CSV.
	const loadBstockLanes = useCallback(async () => {
	  try {
	    setLoading(true);
	    setError(null);
	    const csvLanes = await loadCSVData();
	    setAppState((prev) => ({
	      ...prev,
	      lanes: [...prev.lanes.filter((l) => l.category !== 'new'), ...csvLanes]
	    }));
	  } catch (err) {
	    console.error('Failed to load Bstock CSV data:', err);
	    setError('Failed to load data. Please check if /toms/csv/bstock.csv is available.');
	  } finally {
	    setLoading(false);
	  }
	}, []);

	useEffect(() => {
	  loadBstockLanes();
	}, [loadBstockLanes]);

  // Track mouse position for tooltip
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Keep tooltip within the viewport (like native context menus)
  useEffect(() => {
    if (!hoveredLane) return;

    const tooltipEl = tooltipRef.current;
    let left = mousePosition.x + 10; // Prefer to the right of the cursor
    let top = mousePosition.y + 10;  // Prefer below the cursor

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const rect = tooltipEl?.getBoundingClientRect();
    const elWidth = rect?.width ?? 720;   // fallback to known width
    const elHeight = rect?.height ?? 360; // reasonable default

    // If overflowing right, try placing to the left
    if (left + elWidth > viewportWidth - 10) {
      left = Math.max(10, mousePosition.x - elWidth - 10);
    }

    // If overflowing bottom, try placing above
    if (top + elHeight > viewportHeight - 10) {
      top = Math.max(10, mousePosition.y - elHeight - 10);
    }

    // Final clamp to viewport
    left = Math.min(Math.max(10, left), Math.max(10, viewportWidth - elWidth - 10));
    top = Math.min(Math.max(10, top), Math.max(10, viewportHeight - elHeight - 10));

    setTooltipPos({ left, top });
  }, [hoveredLane, mousePosition]);

  // Re-clamp tooltip on resize without layout jank (rAF + transform-only move)
  useEffect(() => {
    if (!hoveredLane) return;
    let raf: number | null = null;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const tooltipEl = tooltipRef.current;
        if (!tooltipEl) return;
        let left = mousePosition.x + 10;
        let top = mousePosition.y + 10;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const elWidth = tooltipEl.offsetWidth;
        const elHeight = tooltipEl.offsetHeight;
        left = Math.min(Math.max(10, left), Math.max(10, vw - elWidth - 10));
        top = Math.min(Math.max(10, top), Math.max(10, vh - elHeight - 10));
        setTooltipPos({ left, top });
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [hoveredLane, mousePosition]);




	  const selectLane = (lane: Lane) => {
	    setAppState((prev) => ({
	      ...prev,
	      selectedLane: lane,
	    }));

	    // For Bstock lanes, keep a state highlight in sync with selection.
	    if (lane.destState) {
	      setFocusedState(lane.destState);
	    }
	  };

	  // Table selection should narrow the map to the selected state/lane group.
	  const handleLaneSelectFromTable = (lane: Lane) => {
	    selectLane(lane);
	    if (lane.destState) {
	      setShowOnlySelected(true);
	    }
	  };

	  // Map selection should not implicitly filter the map (unless already filtered).
	  const handleLaneSelectFromMap = (lane: Lane) => {
	    selectLane(lane);
	  };

			const clearFocusedState = () => {
			  setFocusedState(null);
			  setShowOnlySelected(false);
			};

	  const handleCategoryChange = (next: LaneCategory) => {
			  setCategoryNotice(null);
	    setAppState((prev) => ({
	      ...prev,
	      activeCategory: next,
	      selectedLane: null,
	    }));
	    setHoveredLane(null);
	    setFocusedState(null);
	    setShowOnlySelected(false);
	    setHiddenGroups(new Set());
	    // Reset Bstock-specific filters so switching categories doesn't retain stale state.
	    setCarrierFilter('all');
	    setDistanceFilter('all');
	    setMinPiecesFilter(0);
	  };

		  const resetView = () => {
	    setAppState((prev) => ({ ...prev, selectedLane: null }));
	    setHoveredLane(null);
	    setFocusedState(null);
	    setShowOnlySelected(false);
	    setHiddenGroups(new Set());
	    setCarrierFilter('all');
	    setDistanceFilter('all');
	    setMinPiecesFilter(0);
		    setMapResetSignal((n) => n + 1);
	  };

  const handleLaneHover = (lane: Lane | null) => {
    setHoveredLane(lane);
  };

  // Toggle group visibility on map
  const toggleGroupVisibility = (groupName: string) => {
    setHiddenGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

	  const handleMinPiecesInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
	    const raw = event.target.value.replace(/,/g, '');
	    const next = Number(raw);
	    setMinPiecesFilter(Number.isFinite(next) ? Math.max(0, next) : 0);
	  };



  // Resizable layout handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Constrain between 20% and 80%
    const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80);
    setLeftWidth(constrainedWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add global mouse event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Single category mode; category change handler removed











  // Filter lanes based on active category
  const categoryFilteredLanes = useMemo(
    () => filterLanesByCategory(appState.lanes, appState.activeCategory),
    [appState.lanes, appState.activeCategory]
  );

		// Used to disable category toggles when data doesn't exist yet.
		const categoryCounts = useMemo(() => {
		  return {
		    new: filterLanesByCategory(appState.lanes, 'new').length,
		    parcel: filterLanesByCategory(appState.lanes, 'parcel').length,
		    ltl: filterLanesByCategory(appState.lanes, 'ltl').length,
		    'parcel-ltl': filterLanesByCategory(appState.lanes, 'parcel-ltl').length,
		  };
		}, [appState.lanes]);

  // Bstock-specific lane filtering by carrier
  const carrierFilteredLanes = useMemo(() => {
    if (appState.activeCategory !== 'new') return categoryFilteredLanes;
    if (carrierFilter === 'all') return categoryFilteredLanes;

    return categoryFilteredLanes.filter((lane) => {
      const type = (lane.carrierType ?? '').toLowerCase();
      if (carrierFilter === 'warp') return type === 'warp';
      if (carrierFilter === 'ltl') return type === 'ltl';
      return true;
    });
  }, [categoryFilteredLanes, appState.activeCategory, carrierFilter]);

  // Aggregate by destination state for header metrics and volume-based filtering
  const stateAggregatesForFilters: StateAggregate[] = useMemo(() => {
    if (appState.activeCategory !== 'new') return [];
    return aggregateByDestinationState(carrierFilteredLanes);
  }, [carrierFilteredLanes, appState.activeCategory]);

  // Apply minimum total shipments per state filter (Bstock only)
  const fullyFilteredLanes = useMemo(() => {
    if (appState.activeCategory !== 'new') return carrierFilteredLanes;

    if (!minPiecesFilter || minPiecesFilter <= 0) {
      return carrierFilteredLanes;
    }

    const allowedStates = new Set(
      stateAggregatesForFilters
        .filter((agg) => agg.totalShipments >= minPiecesFilter)
        .map((agg) => agg.state)
    );

    if (allowedStates.size === 0) return [];

    return carrierFilteredLanes.filter(
      (lane) => lane.destState && allowedStates.has(lane.destState)
    );
  }, [carrierFilteredLanes, stateAggregatesForFilters, minPiecesFilter, appState.activeCategory]);

		// Distance coverage metrics are computed BEFORE applying the distance filter.
	const distanceCoverage = useMemo(() => {
		if (appState.activeCategory !== 'new') return null;
			// Per spec: compute after category + carrier filters (and before distance filter).
			const total = carrierFilteredLanes.length;
		if (total === 0) {
			return { total: 0, known: 0, unknown: 0, coveragePct: 0 };
		}
			const unknown = carrierFilteredLanes.filter((l) => l.isLocalDelivery100 == null).length;
		const known = total - unknown;
		const coveragePct = (known / total) * 100;
		return { total, known, unknown, coveragePct };
		}, [appState.activeCategory, carrierFilteredLanes]);

	const distanceFilteredLanes = useMemo(() => {
		if (appState.activeCategory !== 'new') return fullyFilteredLanes;
		if (distanceFilter === 'all') return fullyFilteredLanes;
		if (distanceFilter === 'local') {
			return fullyFilteredLanes.filter((lane) => lane.isLocalDelivery100 === true);
		}
		if (distanceFilter === 'nonLocal') {
			return fullyFilteredLanes.filter((lane) => lane.isLocalDelivery100 === false);
		}
		return fullyFilteredLanes;
	}, [appState.activeCategory, fullyFilteredLanes, distanceFilter]);

	const filteredLanes = distanceFilteredLanes;

		// Empty-state guard: if filters result in 0 lanes OR 0 destination states.
		const filteredStateCount = useMemo(() => {
		  if (appState.activeCategory !== 'new') return 0;
		  return aggregateByDestinationState(filteredLanes).length;
		}, [appState.activeCategory, filteredLanes]);

		// Bstock overview KPI block (category + carrier only; before distance filter)
		const bstockOverviewMetrics = useMemo(() => {
		  if (appState.activeCategory !== 'new') return null;
		  const totalLanes = carrierFilteredLanes.length;
		  const stateSet = new Set(
		    carrierFilteredLanes
		      .map((l) => l.destState)
		      .filter((s): s is string => Boolean(s))
		  );

		  let warpCount = 0;
		  let ltlCount = 0;
		  let localCount = 0;
		  let unknownDistanceCount = 0;

		  carrierFilteredLanes.forEach((lane) => {
		    const type = (lane.carrierType ?? '').toLowerCase();
		    if (type === 'warp') warpCount += 1;
		    else if (type === 'ltl') ltlCount += 1;

		    if (lane.isLocalDelivery100 === true) localCount += 1;
		    if (lane.isLocalDelivery100 == null) unknownDistanceCount += 1;
		  });

			  const knownDistanceCount = Math.max(0, totalLanes - unknownDistanceCount);
			  const localSharePct =
			    knownDistanceCount === 0 ? 0 : Math.round((localCount / knownDistanceCount) * 100);
			  const warpSharePct = totalLanes === 0 ? 0 : Math.round((warpCount / totalLanes) * 100);
			  const ltlSharePct = totalLanes === 0 ? 0 : Math.round((ltlCount / totalLanes) * 100);

			  return {
			    totalLanes,
			    statesCount: stateSet.size,
			    warpCount,
			    ltlCount,
			    knownDistanceCount,
			    unknownDistanceCount,
			    localCount,
			    localSharePct,
			    warpSharePct,
			    ltlSharePct,
			  };
		}, [appState.activeCategory, carrierFilteredLanes]);

		// Guard: if a non-Bstock category becomes active with no data, revert to Bstock.
		useEffect(() => {
		  const active = appState.activeCategory;
		  if (active === 'new') return;
		  const count = categoryCounts[active] ?? 0;
		  if (count > 0) return;

			  const label =
			    active === 'parcel'
			      ? 'Parcel'
			      : active === 'ltl'
			        ? 'LTL'
			        : active === 'parcel-ltl'
			          ? 'Parcel + LTL'
			          : 'that category';

		  setAppState((prev) => ({
		    ...prev,
		    activeCategory: 'new',
		    selectedLane: null,
		  }));
		  setHoveredLane(null);
		  setFocusedState(null);
		  setShowOnlySelected(false);
		  setHiddenGroups(new Set());
		  setCarrierFilter('all');
		  setDistanceFilter('all');
		  setMinPiecesFilter(0);
			  setCategoryNotice(`Switched to Bstock (no data available for ${label}).`);
		}, [appState.activeCategory, categoryCounts]);

	  // Lanes rendered on the map.
	  // - For Bstock, optionally filter down to a focused destination state.
	  // - For Bstock, also support hiding crossdock groups.
	  const mapLanes = useMemo(() => {
	    let lanesForMap = filteredLanes;
	    if (appState.activeCategory === 'new') {
	      if (showOnlySelected && focusedState) {
	        lanesForMap = lanesForMap.filter((lane) => lane.destState === focusedState);
	      }
	      lanesForMap = lanesForMap.filter(
	        (lane) => !hiddenGroups.has(lane.crossdockName ?? 'Crossdock')
	      );
	    }
	    return lanesForMap;
	  }, [filteredLanes, appState.activeCategory, focusedState, showOnlySelected, hiddenGroups]);

  // Derived responsive layout widths for table (left) and map (right) panels
  const leftPaneStyle = isMdUp ? { width: `${leftWidth}%` } : { width: '100%' };
  const rightPaneStyle = isMdUp ? { width: `${100 - leftWidth}%` } : { width: '100%' };

	  if (loading && appState.lanes.length === 0) {
    return (
      <div className="min-h-screen bg-warp-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-lg">Loading Bstock data...</p>
        </div>
      </div>
    );
  }

	  	if (error && appState.lanes.length === 0) {
    return (
      <div className="min-h-screen bg-warp-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️ Error</div>
          <p className="text-lg mb-4">{error}</p>
          <button
	            onClick={loadBstockLanes}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }



  const getCategoryDisplayName = (category: LaneCategory): string => {
    switch (category) {
      case 'parcel': return 'Parcel Only';
      case 'ltl': return 'LTL Only';
      case 'parcel-ltl': return 'Parcel + LTL';
      case 'new': return 'Bstock';
      default: return category;
    }
  };



  return (
    <div className="h-screen bg-warp-dark text-white flex flex-col">
      {/* Top Header */}
	      <div className="bg-surface-2/80 border-b border-brd-1 px-6 py-2 backdrop-blur">
	        <div className="flex flex-col gap-2">
	          <div className="flex items-center justify-between gap-4">
	            {/* App Title */}
		            <div className="flex items-center gap-3 min-w-[180px]">
	              <img src="/toms/media/logo.svg" alt="Bstock logo" className="h-6 opacity-90" />
	              <div className="flex flex-col">
	                <span className="text-xs text-text-2">Pricing Proposal</span>
	              </div>
	            </div>

	            {/* Category toggle */}
	            <div className="flex items-center justify-center">
	              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-surface-1 border border-brd-1">
			              {([
			                { id: 'new' as LaneCategory, label: 'Bstock' },
			              ] as const).map((cat) => {
	                  const isActive = appState.activeCategory === cat.id;
							  const count = categoryCounts[cat.id] ?? 0;
							  const isDisabled = cat.id !== 'new' && count === 0;
		                  if (isDisabled) {
		                    return (
		                      <span key={cat.id} title="No data for this category" className="inline-flex">
		                        <button
		                          type="button"
		                          disabled
		                          aria-disabled
		                          className={`px-3 py-1 rounded-full text-[11px] border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 ${
		                            isActive
		                              ? 'bg-accent/20 border-accent text-accent'
		                              : 'bg-transparent border-transparent text-text-2 opacity-40 cursor-not-allowed'
		                          }`}
		                        >
		                          {cat.label}
		                        </button>
		                      </span>
		                    );
		                  }

		                  return (
		                    <button
		                      key={cat.id}
		                      type="button"
		                      onClick={() => handleCategoryChange(cat.id)}
		                      className={`px-3 py-1 rounded-full text-[11px] border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 ${
		                        isActive
		                          ? 'bg-accent/20 border-accent text-accent'
		                          : 'bg-transparent border-transparent text-text-2 hover:bg-surface-3/60'
		                      }`}
		                    >
		                      {cat.label}
		                    </button>
		                  );
	                })}
	              </div>
	            </div>

	            {/* Global actions */}
		            <div className="flex items-center justify-end gap-2 min-w-[140px]">
		              <button
	                type="button"
	                onClick={resetView}
	                disabled={loading}
	                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] border border-brd-1 bg-surface-1 text-text-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 ${
	                  loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-surface-3/60'
	                }`}
		                title="Reset filters, selection, and map view"
	              >
	                <RefreshCcw className="h-4 w-4" />
		                Reset
	              </button>

	              {loading && <span className="text-[11px] text-text-2">Loading…</span>}
	            </div>
	          </div>

	          {/* Non-blocking error banner */}
	          {error && appState.lanes.length > 0 && (
	            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
	              {error}
	            </div>
	          )}
	        </div>
	      </div>



      {/* Main Content Area - Resizable Split Layout */}
      <div ref={containerRef} className="flex-1 flex flex-col md:flex-row relative min-h-0">
        {/* Left Section - Table (resizable width) */}
        <div
          className="flex flex-col border-b md:border-b-0 md:border-r border-brd-1 min-h-0"
          style={leftPaneStyle}
        >
          {/* Header Bar with controls */}
          <div className="bg-surface-2 border-b border-brd-1 px-4 py-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold text-white">
                  {getCategoryDisplayName(appState.activeCategory)} Lanes
                </h1>
                <p className="text-xs text-text-2">
	                  {filteredLanes.length} lanes
                </p>
              </div>
            </div>

							{appState.activeCategory === 'new' && bstockOverviewMetrics && (
							  <BstockOverview {...bstockOverviewMetrics} />
							)}

							{categoryNotice && (
							  <div className="mt-2 text-[11px] text-amber-200/90">{categoryNotice}</div>
							)}

            {appState.activeCategory === 'new' && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {/* Carrier filter chips */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-text-2 mr-1">Carriers:</span>
                  {(['all', 'warp', 'ltl'] as CarrierFilter[]).map((value) => {
                    const isActive = carrierFilter === value;
                    const label =
                      value === 'all' ? 'Warp + LTL' : value === 'warp' ? 'Warp only' : 'LTL only';
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCarrierFilter(value)}
                        className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors duration-150 ${
                          isActive
                            ? 'bg-accent/20 border-accent text-accent'
                            : 'bg-surface-1 border-brd-1 text-text-2 hover:bg-surface-3/60'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

					{/* Local delivery filter chips */}
					<div className="flex items-center gap-1">
						<span className="text-[11px] text-text-2 mr-1">Distance:</span>
						{(['all', 'local', 'nonLocal'] as DistanceFilter[]).map((value) => {
							const isActive = distanceFilter === value;
							const label =
								value === 'all'
									? 'All'
									: value === 'local'
											? '≤100mi'
										: '>100mi';
							return (
								<button
									key={value}
									type="button"
									onClick={() => setDistanceFilter(value)}
									className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors duration-150 ${
										isActive
											? 'bg-accent/20 border-accent text-accent'
											: 'bg-surface-1 border-brd-1 text-text-2 hover:bg-surface-3/60'
									}`}
								>
									{label}
								</button>
							);
						})}
						{distanceCoverage && distanceCoverage.total > 0 && (
							<span className="ml-2 text-[10px] text-text-2">
								Distance coverage: {distanceCoverage.coveragePct.toFixed(0)}% known
								{distanceFilter !== 'all' && distanceCoverage.unknown > 0 && (
									<span className="text-amber-200"> - {distanceCoverage.unknown} unknown excluded</span>
								)}
							</span>
						)}
					</div>

                {/* Volume threshold */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-text-2">Min total shipments/state:</span>
                  <input
                    type="number"
                    min={0}
                    value={minPiecesFilter || ''}
                    onChange={handleMinPiecesInputChange}
                    className="w-24 px-2 py-0.5 rounded border border-brd-1 bg-surface-1 text-[11px] text-text-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                    placeholder="0"
                  />
                  {minPiecesFilter > 0 && (
                    <button
                      type="button"
                      onClick={() => setMinPiecesFilter(0)}
                      className="text-[11px] text-accent hover:underline ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto no-scrollbar">
						  {appState.activeCategory === 'new' && (filteredLanes.length === 0 || filteredStateCount === 0) ? (
						    <div className="p-6">
						      <div className="rounded-lg border border-brd-1 bg-surface-1 px-4 py-6 text-center">
						        <div className="text-sm font-semibold text-text-1">No lanes match your filters</div>
						        <div className="mt-1 text-[11px] text-text-2">
						          Adjust filters or reset to see lanes again.
						        </div>
						        <button
						          type="button"
						          onClick={resetView}
						          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] border border-brd-1 bg-surface-2 text-text-1 hover:bg-surface-3/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
						        >
						          Reset filters
						        </button>
						      </div>
						    </div>
						  ) : (
						    <LaneTable
						      lanes={filteredLanes}
						      config={appState.config}
						      selectedLane={appState.selectedLane}
						      onLaneSelect={handleLaneSelectFromTable}
						      onLaneHover={handleLaneHover}
						      hiddenGroups={hiddenGroups}
						      onToggleGroupVisibility={toggleGroupVisibility}
						      activeCategory={appState.activeCategory}
						      focusedState={focusedState}
						      onClearFocusedState={clearFocusedState}
						    />
						  )}
          </div>
        </div>

        {/* Resizable Divider */}
        <div
          className={`hidden md:block resize-handle cursor-col-resize ${isResizing ? 'resizing' : ''}`}
          onMouseDown={handleMouseDown}
        />

        {/* Right Section - Map (remaining width) */}
        <div
          className="flex flex-col"
          style={rightPaneStyle}
        >
          {/* Map Header Bar */}
          <div className="bg-surface-2 border-b border-brd-1 px-4 py-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold text-white">
                  Lane Network Map
                </h1>
                <p className="text-xs text-text-2">
                  Interactive visualization of {getCategoryDisplayName(appState.activeCategory)} lanes
                </p>
              </div>
            </div>
          </div>

          {/* Map Container - Fixed height */}
          <div className="relative h-[320px] sm:h-[380px] md:flex-1">
	            <LaneMap
              lanes={mapLanes}
              selectedLane={appState.selectedLane}
              hoveredLane={hoveredLane}
	              onLaneSelect={handleLaneSelectFromMap}
	              resetSignal={mapResetSignal}
              activeCategory={appState.activeCategory}
              focusedState={focusedState}
						    onClearFocusedState={clearFocusedState}
            />
          </div>
        </div>
      </div>

      {/* Lane Details Tooltip (Bstock) */}
      {hoveredLane && (
        <div
          ref={tooltipRef}
          className="fixed z-50 max-w-xl rounded-2xl shadow-elev-2 backdrop-blur-2xl border border-brd-1 bg-surface-1/95 pointer-events-none"
          style={{
            transform: `translate3d(${tooltipPos.left}px, ${tooltipPos.top}px, 0)`,
            willChange: 'transform',
            width: 'min(300px, calc(100vw - 20px))',
            maxWidth: 'min(3000px, calc(100vw - 20px))'
          }}
        >
          <div className="px-3 pt-2 pb-1.5 border-b border-white/10">
            <div className="text-[15px] font-semibold text-text-1">
              {`${hoveredLane.originCity ?? 'Monroe Township'}, ${hoveredLane.originState ?? 'NJ'} ${
                hoveredLane.originZip ?? '08831'
              } → ${
                hoveredLane.destState ?? hoveredLane.destName ?? hoveredLane.destination ?? 'Destination'
              }`}
            </div>
            <div className="mt-0.5 text-[11px] text-text-2">
              {`Origin: ${hoveredLane.originZip ?? '08831'} · Crossdock: ${
                hoveredLane.crossdockName ?? 'Crossdock'
              }${hoveredLane.crossdockZip ? ` (${hoveredLane.crossdockZip})` : ''}`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
