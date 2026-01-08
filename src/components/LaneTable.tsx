import React, { useMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Lane, TruckConfiguration, LaneCategory } from '../types';
import { calculateLaneMetrics, formatNumber, formatPercentage } from '../utils/calculations';
import { aggregateByDestinationState, StateAggregate } from '../utils/csvParser';



interface LaneTableProps {
  lanes: Lane[];
  config: TruckConfiguration;
  selectedLane: Lane | null;
  onLaneSelect: (lane: Lane) => void;
  onLaneHover: (lane: Lane | null) => void;
  hiddenGroups: Set<string>;
  onToggleGroupVisibility: (groupName: string) => void;
  activeCategory: LaneCategory;
	focusedState?: string | null;
	onClearFocusedState?: () => void;

	// Bstock-only: allow App.tsx to own sorting state & order
	bstockStateAggregates?: StateAggregate[];
	bstockSortKey?: 'totalShipments' | 'localShipments' | 'warpShare';
	bstockSortDir?: 'asc' | 'desc';
	onBstockSortChange?: (key: 'totalShipments' | 'localShipments' | 'warpShare') => void;
}

// Group lanes by crossdock (destination_1)
interface GroupedLanes {
  [crossdockKey: string]: Lane[];
}

// Helper function to format Pallets/Day with breakdown for Parcel + LTL
const formatPalletsWithBreakdown = (lane: Lane, palletsPerDay: number): string => {
  if (lane.parcelOnlyPallets !== undefined && lane.ltlOnlyPallets !== undefined) {
    return `${palletsPerDay} (${lane.parcelOnlyPallets}P + ${lane.ltlOnlyPallets}L)`;
  }
  return palletsPerDay.toString();
};

export default function LaneTable({
  lanes,
  config,
  selectedLane,
  onLaneSelect,
  onLaneHover,
  hiddenGroups,
  onToggleGroupVisibility,
  activeCategory,
	focusedState,
	onClearFocusedState,
	bstockStateAggregates,
	bstockSortKey,
	bstockSortDir,
	onBstockSortChange,
}: LaneTableProps) {


  // Group lanes for the non-Bstock tables.
  // For seed lanes, group by FC origin (since crossdock is a Bstock concept).
  const groupedLanes = useMemo(() => {
    const groups: GroupedLanes = {};
    if (activeCategory === 'new') return groups;

    lanes.forEach((lane) => {
      const key = lane.origin;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(lane);
    });
    return groups;
  }, [lanes, activeCategory]);

	// Aggregate lanes by final destination state (Bstock view)
	// If App provides an already-sorted list, prefer it and avoid re-aggregating.
	const computedStateAggregates: StateAggregate[] = useMemo(() => {
		if (activeCategory !== 'new') return [];
		if (bstockStateAggregates) return [];
		return aggregateByDestinationState(lanes);
	}, [lanes, activeCategory, bstockStateAggregates]);

	const stateAggregates: StateAggregate[] =
		activeCategory === 'new'
			? (bstockStateAggregates ?? computedStateAggregates)
			: [];

	const thBase =
		'sticky top-0 bg-surface-2/95 backdrop-blur border-b border-brd-1 text-text-2 font-semibold tracking-wide uppercase text-[11px]';
	const thButtonBase =
		'inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 rounded-sm disabled:opacity-60 disabled:cursor-default';
	const sortIndicator = (key: 'totalShipments' | 'localShipments' | 'warpShare') => {
		if (!bstockSortKey || bstockSortKey !== key) return null;
		const dir = bstockSortDir === 'asc' ? '▲' : '▼';
		return (
			<span aria-hidden className="text-[10px] text-text-2">
				{dir}
			</span>
		);
	};
	const ariaSortFor = (key: 'totalShipments' | 'localShipments' | 'warpShare') => {
		if (!bstockSortKey || bstockSortKey !== key) return 'none' as const;
		return bstockSortDir === 'asc' ? ('ascending' as const) : ('descending' as const);
	};

  return (
    <div className="bg-surface-1 rounded-lg">
			  {activeCategory === 'new' && focusedState && (
				  <div className="px-4 py-2 border-b border-brd-1 bg-surface-2 flex items-center justify-between gap-3">
					  <div className="text-[11px] text-text-2">
						  Filtered to <span className="font-semibold text-text-1">{focusedState}</span>
					  </div>
					  <button
						  type="button"
						  onClick={onClearFocusedState}
						  className="text-[11px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 rounded"
					  >
						  Clear filter
					  </button>
				  </div>
			  )}
      {/* Control Buttons moved to App header */}

	      <div className="overflow-x-auto overflow-y-visible no-scrollbar">
	        <table className="w-full text-sm">
	          <thead className="text-text-2">
            <tr>
              <th
	                className={`text-left py-3 px-4 ${thBase} ${
	                  activeCategory === 'new'
	                    ? 'left-0 z-[30] border-r border-brd-1 shadow-elev-1'
	                    : ''
	                }`}
                style={{ minWidth: activeCategory === 'new' ? 80 : 246 }}
              >
                {activeCategory === 'new' ? 'State' : 'Route'}
              </th>
              {activeCategory === 'new' ? (
                <>
	                  <th
	                    className={`text-right py-3 px-4 whitespace-nowrap z-[10] ${thBase}`}
	                    aria-sort={ariaSortFor('totalShipments')}
	                  >
	                    <button
	                      type="button"
	                      disabled={!onBstockSortChange}
	                      onClick={() => onBstockSortChange?.('totalShipments')}
	                      className={`${thButtonBase} w-full justify-end`}
	                      title="Sort by total shipments"
	                    >
	                      <span className="tabular-nums">Total shipments</span>
	                      {sortIndicator('totalShipments')}
	                    </button>
	                  </th>
	                  <th
	                    className={`text-right py-3 px-4 whitespace-nowrap z-[10] ${thBase}`}
	                    aria-sort={ariaSortFor('localShipments')}
	                  >
	                    <button
	                      type="button"
	                      disabled={!onBstockSortChange}
	                      onClick={() => onBstockSortChange?.('localShipments')}
	                      className={`${thButtonBase} w-full justify-end`}
	                      title="Sort by local shipments"
	                    >
	                      <span className="tabular-nums">Local ≤100mi</span>
	                      {sortIndicator('localShipments')}
	                    </button>
	                  </th>
	                  <th
	                    className={`text-right py-3 px-4 whitespace-nowrap z-[10] ${thBase}`}
	                    aria-sort={ariaSortFor('warpShare')}
	                  >
	                    <button
	                      type="button"
	                      disabled={!onBstockSortChange}
	                      onClick={() => onBstockSortChange?.('warpShare')}
	                      className={`${thButtonBase} w-full justify-end`}
	                      title="Sort by Warp share"
	                    >
	                      <span>Warp share</span>
	                      {sortIndicator('warpShare')}
	                    </button>
	                  </th>
	                  <th className={`text-right py-3 px-4 whitespace-nowrap z-[10] ${thBase}`}>
	                    Dest ZIPs
	                  </th>
                </>
              ) : (
                <>
	                  <th className={`text-right py-3 px-4 whitespace-nowrap z-[10] ${thBase}`}>Pallets/Day</th>
	                  <th className={`text-right py-3 px-4 whitespace-nowrap z-[10] ${thBase}`}>Trucks/Day</th>
	                  <th className={`text-right py-3 px-4 whitespace-nowrap z-[10] ${thBase}`}>Truck Utilization</th>
	                  <th className={`text-right py-3 px-4 whitespace-nowrap z-[10] ${thBase}`}>Shipping Charge 53</th>

	                  <th className={`text-right py-3 px-4 whitespace-nowrap z-[10] ${thBase}`}>Cost/Pallet Breakdown 53</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {activeCategory === 'new' && stateAggregates.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 px-4 text-center text-xs text-text-2">
                  No states match the current filters. Adjust carrier or volume filters to see lanes.
                </td>
              </tr>
            )}

	            {activeCategory !== 'new' && lanes.length === 0 && (
	              <tr>
	                <td colSpan={6} className="py-6 px-4 text-center text-xs text-text-2">
		                  No lanes available for this category.
	                </td>
	              </tr>
	            )}

            {activeCategory === 'new' &&
              stateAggregates.map((agg, idx) => {
                const representativeLane = agg.lanes[0];
                if (!representativeLane) return null;

                // Per-state carrier mix and destination ZIP counts
                let warpShipments = 0;
                let ltlShipments = 0;
                const destZips = new Set<string>();

                agg.lanes.forEach((lane) => {
                  const type = (lane.carrierType ?? '').toLowerCase();
                  if (type === 'warp') warpShipments += 1;
                  else if (type === 'ltl') ltlShipments += 1;

                  if (lane.destZip) {
                    destZips.add(String(lane.destZip));
                  }
                });

                const totalShipments = typeof agg.totalShipments === 'number' ? agg.totalShipments : agg.lanes.length;
                const warpShare = totalShipments > 0 ? (warpShipments / totalShipments) * 100 : 0;
                const ltlShare = totalShipments > 0 ? (ltlShipments / totalShipments) * 100 : 0;
                const zipCount = destZips.size;

                const isSelected = selectedLane?.id === representativeLane.id;
                const stickyBg = isSelected
                  ? 'bg-surface-3'
                  : idx % 2 === 0
                    ? 'bg-surface-1'
                    : 'bg-surface-2';

                return (
                  <tr
                    key={agg.state}
                    className={`lane-row odd:bg-surface-1 even:bg-surface-2 border-b border-brd-2 hover:bg-surface-3/40 cursor-pointer transition-colors duration-150 ${
                      isSelected ? 'bg-surface-3/60 shadow-glow-accent scanline-accent' : ''
                    }`}
                    onClick={() => onLaneSelect(representativeLane)}
                    onMouseEnter={() => onLaneHover(representativeLane)}
                    onMouseLeave={() => onLaneHover(null)}
                  >
                    <td
                      className={`py-1 px-4 sticky left-0 z-[5] border-r border-brd-1 shadow-elev-1 ${stickyBg} ${
                        isSelected ? 'border-l-[3px] border-accent' : ''
                      }`}
                      style={{ minWidth: 80 }}
                    >
                      <div className="ml-1 py-0 flex items-center gap-2">
                        <span className="text-[11px] text-text-2 tabular-nums w-5 text-right">
                          {idx + 1}
                        </span>
                        <span className="text-text-1 text-sm">{agg.state}</span>
                      </div>
                    </td>
                    <td className="py-1 px-4">
                      <div className="text-right py-0">
                        <span className="text-text-1 text-sm tabular-nums">
                          {formatNumber(agg.totalShipments, 0)}
                        </span>
                      </div>
                    </td>
                    <td className="py-1 px-4">
                      <div className="text-right text-[11px] text-text-2 tabular-nums">
                        <span className="text-text-1 text-sm tabular-nums">
                          {formatNumber(agg.localShipments ?? 0, 0)}
                        </span>
                        {(agg.unknownDistanceShipments ?? 0) > 0 && (
                          <span className="ml-1">
                            +{formatNumber(agg.unknownDistanceShipments ?? 0, 0)} unk
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-1 px-4">
                      <div className="text-right text-[11px] text-text-2 tabular-nums">
                        <span>
                          Warp {warpShare.toFixed(0)}%
                        </span>
                        <span className="mx-1">{' | '}</span>
                        <span>
                          LTL {ltlShare.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-1 px-4">
                      <div className="text-right text-[11px] text-text-2 tabular-nums">
                        {zipCount.toLocaleString('en-US')} ZIP{zipCount === 1 ? '' : 's'}
                      </div>
                    </td>
                  </tr>
                );
              })}


            {activeCategory !== 'new' &&
              Object.entries(groupedLanes).map(([origin, groupLanes], idx) => {
              return (
                <React.Fragment key={origin}>
                  {idx > 0 && (
                    <tr>
                      <td colSpan={6} className="h-4"></td>
                    </tr>
                  )}
                  {/* Group Header Row */}
                  <tr className="lane-group-row border-b border-brd-1 bg-surface-1">
                    <td colSpan={6} className="py-2 px-4 relative">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center rounded p-1 flex-1">
                          <div className="flex items-center">
                            <div>
                              <div className="text-white font-medium">{origin}</div>
                              <div className="text-xs text-text-2 mt-0.5">
                                {groupLanes.length} lanes
                              </div>
                            </div>

                            {/* Map Visibility Toggle Button - Positioned after origin name */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleGroupVisibility(origin);
                              }}
                              aria-pressed={!hiddenGroups.has(origin)}
                              aria-label={hiddenGroups.has(origin) ? 'Show group on map' : 'Hide group from map'}
                              className={`ml-3 p-1.5 rounded-lg transition-colors duration-200 shadow-elev-1 border border-brd-1 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                                hiddenGroups.has(origin)
                                  ? 'bg-red-600/30 text-red-400 hover:bg-red-600/40 border-red-500/30'
                                  : 'bg-green-600/30 text-green-400 hover:bg-green-600/40 border-green-500/30'
                              }`}
                              title={hiddenGroups.has(origin) ? 'Show group' : 'Hide group'}
                            >
                              {hiddenGroups.has(origin) ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Lane Rows - COMPLETELY SEPARATE EVENT HANDLING */}
                  {groupLanes.map((lane, laneIdx) => {
                    const metrics = calculateLaneMetrics(lane, config);
                    const isSelected = selectedLane?.id === lane.id;
                    const stickyBg = isSelected ? 'bg-surface-3' : (laneIdx % 2 === 0 ? 'bg-surface-1' : 'bg-surface-2');

                    return (
                      <tr
                        key={lane.id}
                        className={`lane-row odd:bg-surface-1 even:bg-surface-2 border-b border-brd-2 hover:bg-surface-3/40 cursor-pointer transition-colors duration-150 ${isSelected ? 'bg-surface-3/60 shadow-glow-accent scanline-accent' : ''}` }
                        onClick={() => onLaneSelect(lane)}
                        onMouseEnter={() => onLaneHover(lane)}
                        onMouseLeave={() => onLaneHover(null)}
                      >
                        <td
                          className={`py-1 px-4 ${stickyBg} ${
                            isSelected ? 'border-l-[3px] border-accent' : ''
                          }`}
                          style={{ minWidth: 246 }}
                        >
                          <div className="ml-7 py-0">
                            <span className="text-text-1 text-sm">
                              {lane.origin} → {lane.destination}
                            </span>
                          </div>
                        </td>
                        <>
                          <td className="py-1 px-4">
                            <div className="text-right ml-7 py-0">
                              <span className="text-text-1 text-sm">
                                {formatPalletsWithBreakdown(lane, metrics.palletsPerDay)}
                              </span>
                            </div>
                          </td>
                          <td className="py-1 px-4">
                            <div className="text-right ml-7 py-0">
                              <span className="text-text-1 text-sm">
                                {formatNumber(metrics.trucksPerDay)}
                              </span>
                            </div>
                          </td>
                          <td className="py-1 px-4">
                            <div className="text-right ml-7 py-0">
                              <span className="text-text-1 text-sm">
                                {formatPercentage(metrics.utilization)}
                              </span>
                            </div>
                          </td>
                          <td className="py-1 px-4">
                            <div className="text-right ml-7 py-0">
                              <span className="text-warp-cyan text-sm">
                                ${formatNumber(metrics.costPerDay)}
                              </span>
                            </div>
                          </td>
                          <td className="py-1 px-4">
                            <div className="text-right ml-7 py-0">
                              <span className="text-text-1 text-sm">
                                ${formatNumber(lane.costPerPalletBreakdown, 2)}
                              </span>
                            </div>
                          </td>
                        </>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>


    </div>
  );
}
