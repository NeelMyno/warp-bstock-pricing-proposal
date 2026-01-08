import { Lane, TruckConfiguration, LaneMetrics, LaneCategory, CategoryMetrics } from '../types';

export function calculateLaneMetrics(lane: Lane, config: TruckConfiguration): LaneMetrics {
  // Use the palletsPerDay directly from the lane (already calculated in CSV parser)
  const palletsPerDay = lane.palletsPerDay || 0;

  // If no pallets data, return metrics with zero values (will be handled as '-' in display)
  if (palletsPerDay === 0) {
    return {
      palletsPerDay: 0,
      trucksPerDay: 0,
      utilization: 0,
      costPerDay: 0
    };
  }

  // Calculate trucks needed per day using correct math:
  // Use Math.ceil to ensure we have enough trucks for all pallets
  const trucksPerDay = Math.ceil(palletsPerDay / config.palletsPerTruck);

  // Calculate actual utilization (pallets used / total truck capacity)
  const totalCapacity = trucksPerDay * config.palletsPerTruck;
  const utilization = totalCapacity > 0 ? palletsPerDay / totalCapacity : 0;

  // Calculate cost per day using the correct trucks needed
  const costPerDay = trucksPerDay * lane.shippingCharge;

  return {
    palletsPerDay,
    trucksPerDay,
    utilization,
    costPerDay
  };
}



export function calculateCategoryMetrics(
  lane: Lane,
  config: TruckConfiguration,
  category: LaneCategory
): CategoryMetrics {
  const metrics = calculateLaneMetrics(lane, config);

  return {
    category,
    palletsPerDay: metrics.palletsPerDay,
    trucksNeeded: metrics.trucksPerDay,
    utilization: metrics.utilization,
    costPerDay: metrics.costPerDay
  };
}

export function calculateTopOffLTL(
  lane: Lane,
  config: TruckConfiguration
): number {
  const currentPallets = lane.palletsPerDay || 0;
  const trucksNeeded = Math.ceil(currentPallets / config.palletsPerTruck);
  const totalCapacity = trucksNeeded * config.palletsPerTruck;
  const targetPallets = Math.floor(totalCapacity * config.targetUtilization);
  const ltlPalletsNeeded = Math.max(0, targetPallets - currentPallets);

  return ltlPalletsNeeded;
}

// Filter lanes by category using the new structure
export function filterLanesByCategory(lanes: Lane[], category: LaneCategory): Lane[] {
  return lanes.filter(lane => lane.category === category);
}

export function calculateTotalMetrics(
  lanes: Lane[],
  config: TruckConfiguration,
  category?: LaneCategory
): {
  totalParcels: number;
  totalPallets: number;
  totalTrucks: number;
  avgUtilization: number;
  totalCost: number;
} {
  let totalParcels = 0;
  let totalPallets = 0;
  let totalTrucks = 0;
  let totalUtilization = 0;
  let totalCost = 0;

  const filteredLanes = category ? filterLanesByCategory(lanes, category) : lanes;

  filteredLanes.forEach(lane => {
    const metrics = calculateLaneMetrics(lane, config);
    totalParcels += metrics.palletsPerDay; // Use pallets per day as parcel count
    totalPallets += metrics.palletsPerDay;
    totalTrucks += metrics.trucksPerDay;
    totalUtilization += metrics.utilization;
    totalCost += metrics.costPerDay;
  });

  const avgUtilization = filteredLanes.length > 0 ? totalUtilization / filteredLanes.length : 0;

  return {
    totalParcels,
    totalPallets,
    totalTrucks,
    avgUtilization,
    totalCost
  };
}

// New function for category-specific metrics using the new structure
export function calculateCategoryTotalMetrics(
  lanes: Lane[],
  config: TruckConfiguration,
  category: LaneCategory
): CategoryMetrics {
  const categoryLanes = filterLanesByCategory(lanes, category);

  let totalPallets = 0;
  let totalTrucks = 0;
  let totalCost = 0;

  categoryLanes.forEach(lane => {
    const metrics = calculateLaneMetrics(lane, config);
    totalPallets += metrics.palletsPerDay;
    totalTrucks += metrics.trucksPerDay;
    totalCost += metrics.costPerDay;
  });

  const utilization = totalTrucks > 0 ? totalPallets / (totalTrucks * config.palletsPerTruck) : 0;

  return {
    category,
    palletsPerDay: totalPallets,
    trucksNeeded: totalTrucks,
    utilization,
    costPerDay: totalCost
  };
}



export function formatNumber(num: number | null | undefined, decimals: number = 0): string {
  // Treat 0 as a valid value (especially for Bstock aggregates).
  // Only render '-' for null/undefined/NaN/non-finite.
  if (num == null || !Number.isFinite(num)) return '-';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

export function formatPercentage(num: number | null | undefined, decimals: number = 1): string {
  // Treat 0 as a valid value.
  if (num == null || !Number.isFinite(num)) return '-';

  return `${(num * 100).toFixed(decimals)}%`;
}

export function formatCurrency(num: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}
