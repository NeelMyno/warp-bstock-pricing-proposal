import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Lane, TruckConfiguration, LaneCategory, ShippingCadence } from '../types';
import { calculateLaneMetrics, formatNumber, formatPercentage } from '../utils/calculations';
import { formatCurrencyUSD, formatCurrencyUSDFixed2 } from '../utils/format';


interface LaneTableProps {
  lanes: Lane[];
  config: TruckConfiguration;
  selectedLane: Lane | null;
  onLaneSelect: (lane: Lane) => void;
  onLaneHover: (lane: Lane | null) => void;
  hiddenGroups: Set<string>;
  onToggleGroupVisibility: (groupName: string) => void;
  activeCategory: LaneCategory;
  cadence: ShippingCadence;
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
  cadence,
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

  // Track which groups are expanded (default: all expanded)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Initialize with all groups expanded
    return new Set(Object.keys(groupedLanes));
  });
  const [userCollapsedGroups, setUserCollapsedGroups] = useState<Set<string>>(new Set());

  // Calculate which groups should be expanded (all groups minus user-collapsed ones)
  const currentGroupKeys = Object.keys(groupedLanes);
  const shouldBeExpanded = React.useMemo(() => {
    const allGroups = new Set(currentGroupKeys);
    userCollapsedGroups.forEach(collapsed => allGroups.delete(collapsed));
    return allGroups;
  }, [currentGroupKeys, userCollapsedGroups]);

  // Update expanded groups when the calculated set changes
  React.useEffect(() => {
    if (currentGroupKeys.length > 0) {
      setExpandedGroups(prev => {
        // Only update if the sets are actually different
        const prevArray = Array.from(prev).sort();
        const shouldBeArray = Array.from(shouldBeExpanded).sort();
        if (prevArray.join(',') !== shouldBeArray.join(',')) {
          return shouldBeExpanded;
        }
        return prev;
      });
    }
  }, [currentGroupKeys.join(','), Array.from(userCollapsedGroups).sort().join(',')]);

  // COMPLETELY ISOLATED TOGGLE FUNCTION - NO EVENT CONFLICTS
  const handleToggleGroup = (origin: string) => {
    setUserCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(origin)) {
        // User wants to expand - remove from collapsed set
        newSet.delete(origin);
      } else {
        // User wants to collapse - add to collapsed set
        newSet.add(origin);
      }
      return newSet;
    });
  };

  // Expand/Collapse all functions
  const expandAll = () => {
    setUserCollapsedGroups(new Set()); // Clear all user-collapsed groups
  };

  const collapseAll = () => {
    setUserCollapsedGroups(new Set(Object.keys(groupedLanes))); // Mark all groups as user-collapsed
  };

      {/* External controls via window events dispatched from App header */}
      {React.useEffect(() => {
        const onExpand = () => expandAll();
        const onCollapse = () => collapseAll();
        window.addEventListener('lanetable:expandAll', onExpand);
        window.addEventListener('lanetable:collapseAll', onCollapse);
        return () => {
          window.removeEventListener('lanetable:expandAll', onExpand);
          window.removeEventListener('lanetable:collapseAll', onCollapse);
        };
      }, [])}

  return (
    <div className="bg-surface-1 rounded-lg">
      {/* Control Buttons moved to App header */}

      <div className="overflow-x-auto overflow-y-visible no-scrollbar">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-text-2">
            <tr>
              <th className={`text-left py-3 px-4 font-semibold tracking-wide uppercase text-[11px] ${
                activeCategory === 'new' ? 'sticky left-0 bg-surface-2 z-[5] border-r border-brd-1 shadow-elev-1' : ''
              }`} style={{minWidth: 246}}>Route</th>
              {activeCategory === 'new' ? (
                <>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Gaylords/Week</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Boxes/Gaylord</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Boxes/Week</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Cost/Truck</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Cost/Gaylord</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Cost/Box</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Earliest Pickup</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Drive Time</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Earliest Dropoff</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Transit</th>
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
            {Object.entries(groupedLanes).map(([origin, groupLanes], idx) => {
              const isExpanded = expandedGroups.has(origin);

              return (
                <React.Fragment key={origin}>
                  {idx > 0 && (
                    <tr>
                      <td colSpan={activeCategory === 'new' ? 11 : 6} className="h-4"></td>
                    </tr>
                  )}
                  {/* Group Header Row - COMPLETELY SEPARATE FROM LANE INTERACTIONS */}
                  <tr className="lane-group-row border-b border-brd-1 bg-surface-1">
                    {activeCategory === 'new' ? (
                      <>
                        {/* Sticky first cell for crossdock group name */}
                        <td className="py-1 px-4 sticky left-0 bg-surface-1 z-[6] shadow-elev-1 border-r border-brd-1">
                          <div
                            className="flex items-center transition-colors rounded p-1 cursor-pointer hover:bg-surface-3/40"
                            onClick={() => handleToggleGroup(origin)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-text-2 mr-2 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-text-2 mr-2 flex-shrink-0" />
                            )}
                            <div className="flex items-center">
                              <div>
                                <div className="text-white font-medium">
                                  {origin}
                                </div>
                                <div className="text-xs text-text-2 mt-0.5">
                                  {groupLanes.length} lanes
                                </div>
                              </div>

                              {/* Map Visibility Toggle Button - Positioned after group name */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleGroupVisibility(origin);
                                }}
                                aria-pressed={!hiddenGroups.has(origin)}
                                aria-label={hiddenGroups.has(origin) ? 'Show group on map' : 'Hide group from map'}
                                className={`ml-3 p-1.5 rounded-lg transition-all duration-200 hover:shadow-elev-2 active:scale-[0.98] shadow-elev-1 border border-brd-1 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
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
                        </td>
                        {/* Empty cells for other columns: total 10 for 'new' */}
                        <td className="py-1 px-4 bg-surface-1"></td>
                        <td className="py-1 px-4 bg-surface-1"></td>
                        <td className="py-1 px-4 bg-surface-1"></td>
                        <td className="py-1 px-4 bg-surface-1"></td>
                        <td className="py-1 px-4 bg-surface-1"></td>
                        <td className="py-1 px-4 bg-surface-1"></td>
                        <td className="py-1 px-4 bg-surface-1"></td>
                        <td className="py-1 px-4 bg-surface-1"></td>
                        <td className="py-1 px-4 bg-surface-1"></td>
                        <td className="py-1 px-4 bg-surface-1"></td>
                      </>
                    ) : (
                      <td colSpan={6} className="py-2 px-4 relative">
                        <div className="flex items-center justify-between w-full">
                          <div
                            className="flex items-center transition-colors rounded p-1 flex-1 cursor-pointer hover:bg-surface-3/40"
                            onClick={() => handleToggleGroup(origin)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-text-2 mr-2 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-text-2 mr-2 flex-shrink-0" />
                            )}
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
                    )}
                  </tr>

                  {/* Lane Rows - COMPLETELY SEPARATE EVENT HANDLING */}
                  {isExpanded && groupLanes.map((lane, laneIdx) => {
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
                        <td className={`py-1 px-4 ${ activeCategory === 'new' ? `sticky left-0 z-[5] border-r border-brd-1 shadow-elev-1 ${stickyBg}` : '' } ${ isSelected ? 'border-l-[3px] border-accent' : '' }`} style={{minWidth: 246}}>
                          <div className="ml-7 py-0">
                            <span className="text-text-1 text-sm">
                              Dallas, TX → {lane.crossdockName} → {lane.destName}
                            </span>
                          </div>
                        </td>
                        {activeCategory === 'new' ? (
                          <>
                            {(() => { const c = lane.tomsSchedule?.[cadence]; const bpg = lane.boxesPerGaylord || 0; const gay = c?.totalGaylordWeek || 0; const boxesWk = gay * bpg; return (
                              <>
                                <td className="py-1 px-4"><div className="text-right ml-7 py-0 whitespace-nowrap"><span className="text-text-1 text-sm whitespace-nowrap">{formatNumber(gay, 0)}</span></div></td>
                                <td className="py-1 px-4"><div className="text-right ml-7 py-0 whitespace-nowrap"><span className="text-text-1 text-sm whitespace-nowrap">{formatNumber(bpg, 0)}</span></div></td>
                                <td className="py-1 px-4"><div className="text-right ml-7 py-0 whitespace-nowrap"><span className="text-text-1 text-sm whitespace-nowrap">{formatNumber(boxesWk, 0)}</span></div></td>
                                <td className="py-1 px-4"><div className="text-right ml-7 py-0 whitespace-nowrap"><span className="text-warp-cyan text-sm whitespace-nowrap">{formatCurrencyUSD(c?.costPerTruckWeek || 0)}</span></div></td>
                                <td className="py-1 px-4"><div className="text-right ml-7 py-0 whitespace-nowrap"><span className="text-accent text-sm whitespace-nowrap">{formatCurrencyUSD(c?.costPerGaylordWeek || 0)}</span></div></td>
                                <td className="py-1 px-4"><div className="text-right ml-7 py-0 whitespace-nowrap"><span className="text-warp-purple text-sm whitespace-nowrap">{formatCurrencyUSDFixed2(c?.costPerBoxWeek || 0)}</span></div></td>
                                <td className="py-1 px-4"><div className="text-right ml-7 py-0 whitespace-nowrap"><span className="text-text-1 text-sm whitespace-nowrap">{lane.earliestPickup || '-'}</span></div></td>
                                <td className="py-1 px-4"><div className="text-right ml-7 py-0 whitespace-nowrap"><span className="text-text-1 text-sm whitespace-nowrap">{lane.driveTime || '-'}</span></div></td>
                                <td className="py-1 px-4"><div className="text-right ml-7 py-0 whitespace-nowrap"><span className="text-text-1 text-sm whitespace-nowrap">{lane.earliestDropoff || '-'}</span></div></td>
                                <td className="py-1 px-4"><div className="text-right ml-7 py-0 whitespace-nowrap"><span className="text-text-1 text-sm whitespace-nowrap">{lane.middleMileTransit || '-'}</span></div></td>
                              </>
                            ); })()}
                          </>
                        ) : (
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
                        )}
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
