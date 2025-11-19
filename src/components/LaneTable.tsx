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
}: LaneTableProps) {


  // Group lanes by crossdock (destination_1)
  const groupedLanes = useMemo(() => {
    const groups: GroupedLanes = {};
    lanes.forEach(lane => {
      const key = lane.crossdockName || 'Crossdock';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(lane);
    });
    return groups;
  }, [lanes]);

  // Aggregate lanes by final destination state (Bstock view)
  const stateAggregates: StateAggregate[] = useMemo(
    () => aggregateByDestinationState(lanes),
    [lanes]
  );

  return (
    <div className="bg-surface-1 rounded-lg">
      {/* Control Buttons moved to App header */}

      <div className="overflow-x-auto overflow-y-visible no-scrollbar">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-text-2">
            <tr>
              <th
                className={`text-left py-3 px-4 font-semibold tracking-wide uppercase text-[11px] ${
                  activeCategory === 'new'
                    ? 'sticky left-0 bg-surface-2 z-[5] border-r border-brd-1 shadow-elev-1'
                    : ''
                }`}
                style={{ minWidth: activeCategory === 'new' ? 80 : 246 }}
              >
                {activeCategory === 'new' ? 'State' : 'Route'}
              </th>
              {activeCategory === 'new' ? (
                <>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">
                    Total pieces
                  </th>
                </>
              ) : (
                <>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Pallets/Day</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Trucks/Day</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Truck Utilization</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Shipping Charge 53</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Cost/Pallet Breakdown 53</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {activeCategory === 'new' &&
              stateAggregates.map((agg, idx) => {
                const representativeLane = agg.lanes[0];
                if (!representativeLane) return null;
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
                      <div className="ml-1 py-0">
                        <span className="text-text-1 text-sm">{agg.state}</span>
                      </div>
                    </td>
                    <td className="py-1 px-4">
                      <div className="text-right py-0">
                        <span className="text-text-1 text-sm tabular-nums">
                          {formatNumber(agg.totalPieces, 0)}
                        </span>
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
                              <div className="text-white font-medium">
                                {origin}
                              </div>
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
                              title={hiddenGroups.has(origin) ? 'Show on map' : 'Hide from map'}
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
                              Dallas, TX → {lane.crossdockName} → {lane.destName}
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
