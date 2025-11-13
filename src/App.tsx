import { useState, useEffect, useRef, useCallback } from 'react';
import LaneTable from './components/LaneTable';


import { LaneMap } from './components/LaneMap';
import { AppState, Lane, TruckConfiguration, LaneCategory, ShippingCadence } from './types';
import { filterLanesByCategory } from './utils/calculations';
import { loadCSVData } from './utils/csvParser';
import { formatCurrencyUSD, formatCurrencyUSDFixed2 } from './utils/format';
import seedData from './data/seed.json';


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
  // Shipping cadence selector (default 7d)
  const [cadence, setCadence] = useState<ShippingCadence>('7d');


  // Resizable layout state
  const [leftWidth, setLeftWidth] = useState(50); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load CSV data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('Starting to load CSV data...');
        const csvLanes = await loadCSVData();
        console.log('CSV data loaded successfully, lanes:', csvLanes.length);
        console.log('All loaded lanes:', csvLanes.map(l => `${l.origin} → ${l.destination} (${l.category})`));

        // Use all lanes from the TOMS CSV (single category: 'new')
        setAppState(prev => ({
          ...prev,
          lanes: csvLanes
        }));
        setError(null);
      } catch (err) {
        console.error('Failed to load CSV data:', err);
        setError('Failed to load data. Please check if the CSV file is available.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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




  const handleLaneClick = (lane: Lane) => {
    setAppState(prev => ({
      ...prev,
      selectedLane: lane
    }));
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
  const filteredLanes = filterLanesByCategory(appState.lanes, appState.activeCategory);

  // Filter lanes for map (exclude hidden crossdock groups)
  const mapLanes = filteredLanes.filter(lane => !hiddenGroups.has(lane.crossdockName ?? 'Crossdock'));

  if (loading) {
    return (
      <div className="min-h-screen bg-warp-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-lg">Loading TOMS data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-warp-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️ Error</div>
          <p className="text-lg mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
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
      case 'new': return 'TOMS';
      default: return category;
    }
  };



  return (
    <div className="h-screen bg-warp-dark text-white flex flex-col">
      {/* Top Header */}
      <div className="bg-surface-2/80 border-b border-brd-1 px-6 py-2 backdrop-blur">
        <div className="flex items-center justify-between">
          {/* App Title */}
          <div className="flex items-center gap-3">
            <img src="/toms/media/logo.svg" alt="TOMS logo" className="h-6 opacity-90" />
            <span className="text-xs text-text-2">Pricing Proposal</span>
          </div>
          {/* Cadence selector */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-text-2">Cadence</span>
            <div className="segmented" role="group" aria-label="Shipping cadence">
              {(['7d','6d','5d','4d'] as ShippingCadence[]).map(c => (
                <button
                  key={c}
                  aria-pressed={cadence === c}
                  onClick={() => setCadence(c)}
                  className="segmented-item"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>



      {/* Main Content Area - Resizable Split Layout */}
      <div ref={containerRef} className="flex-1 flex relative min-h-0">
        {/* Left Section - Table (resizable width) */}
        <div
          className="flex flex-col border-r border-brd-1 min-h-0"
          style={{ width: `${leftWidth}%` }}
        >
          {/* Header Bar with controls */}
          <div className="bg-surface-2 border-b border-brd-1 px-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-white">
                  {getCategoryDisplayName(appState.activeCategory)} Lanes
                </h1>
                <p className="text-xs text-text-2">{filteredLanes.length} lanes</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.dispatchEvent(new Event('lanetable:expandAll'))}
                  className="px-3 py-1.5 rounded-md text-xs bg-accent text-black hover:brightness-110 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                >
                  Expand All
                </button>
                <button
                  onClick={() => window.dispatchEvent(new Event('lanetable:collapseAll'))}
                  className="px-3 py-1.5 rounded-md text-xs bg-surface-2 border border-brd-1 text-text-1 hover:bg-surface-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                >
                  Collapse All
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto no-scrollbar">
            <LaneTable
              lanes={filteredLanes}
              config={appState.config}
              selectedLane={appState.selectedLane}
              onLaneSelect={handleLaneClick}
              onLaneHover={handleLaneHover}
              hiddenGroups={hiddenGroups}
              onToggleGroupVisibility={toggleGroupVisibility}
              activeCategory={appState.activeCategory}
              cadence={cadence}
            />
          </div>
        </div>

        {/* Resizable Divider */}
        <div
          className={`resize-handle cursor-col-resize ${isResizing ? 'resizing' : ''}`}
          onMouseDown={handleMouseDown}
        />

        {/* Right Section - Map (remaining width) */}
        <div
          className="flex flex-col h-full"
          style={{ width: `${100 - leftWidth}%` }}
        >
          {/* Map Header Bar */}
          <div className="bg-surface-2 border-b border-brd-1 px-4 py-2">
            <h1 className="text-lg font-bold text-white">
              Lane Network Map
            </h1>
            <p className="text-xs text-text-2">
              Interactive visualization of {getCategoryDisplayName(appState.activeCategory)} lanes
            </p>
          </div>

          {/* Map Container - Fixed height */}
          <div className="flex-1 relative">
            <LaneMap
              lanes={mapLanes}
              selectedLane={appState.selectedLane}
              hoveredLane={hoveredLane}
              onLaneSelect={handleLaneClick}
              activeCategory={appState.activeCategory}
              cadence={cadence}
            />
          </div>
        </div>
      </div>

      {/* Lane Details Tooltip (TOMS) */}
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
              {`Dallas, TX → ${hoveredLane.crossdockName ?? 'Crossdock'} → ${hoveredLane.destName ?? hoveredLane.destination}`}
            </div>
            <div className="mt-0.5 text-[11px] text-text-2">
              {`DFW (75238) · ${hoveredLane.crossdockName} (${hoveredLane.crossdockZip}) · ${hoveredLane.destName} (${hoveredLane.destZip})`}
            </div>
          </div>
          <div className="px-3 py-2.5 text-sm">
            {(() => {
              const c = hoveredLane.tomsSchedule?.[cadence];
              if (!c) return null;
              const bpg = hoveredLane.boxesPerGaylord || 0;
              const boxesWk = (c.totalGaylordWeek || 0) * bpg;
              return (
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] font-semibold tracking-[0.16em] uppercase text-text-2/80 mb-0.5">
                      Volume
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-text-2">Gaylords/week</span>
                        <span className="font-medium text-text-1 tabular-nums">{c.totalGaylordWeek}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-text-2">Boxes/gaylord</span>
                        <span className="font-medium text-text-1 tabular-nums">{bpg}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-text-2">Boxes/week</span>
                        <span className="font-medium text-text-1 tabular-nums">{boxesWk}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold tracking-[0.16em] uppercase text-text-2/80 mb-0.5">
                      Cost
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-text-2">Weekly cost</span>
                        <div className="flex items-baseline justify-end gap-2">
                          <span className="font-semibold text-emerald-400 tabular-nums">
                            {formatCurrencyUSD(c.costPerTruckWeek)}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-brd-2 bg-white/5 px-2 py-0.5 text-[11px] text-text-2">
                            per truck
                          </span>
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 pl-5">
                        <span className="text-text-2" />
                        <div className="flex items-baseline justify-end gap-2">
                          <span className="font-semibold text-emerald-400 tabular-nums">
                            {formatCurrencyUSD(c.costPerGaylordWeek)}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-brd-2 bg-white/5 px-2 py-0.5 text-[11px] text-text-2">
                            per gaylord
                          </span>
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 pl-5">
                        <span className="text-text-2" />
                        <div className="flex items-baseline justify-end gap-2">
                          <span className="font-semibold text-purple-400 tabular-nums">
                            {formatCurrencyUSDFixed2(c.costPerBoxWeek)}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-brd-2 bg-white/5 px-2 py-0.5 text-[11px] text-text-2">
                            per box
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold tracking-[0.16em] uppercase text-text-2/80 mb-0.5">
                      Timing
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-text-2">Earliest pickup</span>
                        <span className="text-text-1">{hoveredLane.earliestPickup || '-'}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-text-2">Drive time</span>
                        <span className="text-text-1">{hoveredLane.driveTime || '-'}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-text-2">Earliest dropoff</span>
                        <span className="text-text-1">{hoveredLane.earliestDropoff || '-'}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-text-2">Transit</span>
                        <span className="text-text-1">{hoveredLane.middleMileTransit || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
