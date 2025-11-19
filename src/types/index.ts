// Core data types for the Warp × Bstock Pricing Proposal app

export type FCCode = 'AVP (PA)' | 'IND (IN)' | 'LAS (NV)' | 'SAV (GA)' | 'DFW' | 'LNK (NE)' | 'SEA (WA)';

export type LaneCategory = 'parcel' | 'ltl' | 'parcel-ltl' | 'new';

export interface FulfillmentCenter {
  code: FCCode;
  name: string;
  state: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Region {
  name: string;
  states: string[];
  color: string;
  centroid: [number, number]; // [longitude, latitude]
}


// Updated Lane interface based on new simplified CSV structure
export interface Lane {
  id: string;
  category: LaneCategory;
  origin: FCCode;
  destination: string;
  parcelsPerPallet: number;
  palletsPerDay?: number; // Pallets per day from CSV (Column C in all files)
  maxPalletCount: number;
  shippingCharge: number;
  costPerPalletBreakdown: number;
  costPerParcelFullUtilization: number;
  numberOfTrucks: number;
  // Optional breakdown data for Parcel + LTL category
  parcelOnlyPallets?: number; // Pallets from Parcel Only category
  ltlOnlyPallets?: number; // Pallets from LTL Only category
  // Zip code & location data for mapping
  originZip?: string;
  destinationZip?: string;
  originCity?: string;
  originState?: string;
  destState?: string; // destination_2_state
  totalPieces?: number; // Total pieces for this shipment (from total_piece)
  carrierType?: 'Warp' | 'LTL' | string;
  // New category specific fields (legacy/new mode)
  costPerTruck?: number; // Cost/Truck
  costPerParcel?: number; // Cost/Parcel
  palletsPerTruck?: number; // Pallets/Truck
  ltlPallets?: number; // LTL Pallets
  parcelPallets?: number; // Parcel Pallets
  totalParcelCount?: number; // Total Parcel Count
  bigBulkyParcelCounts?: number; // Big & Bulky Parcel Counts
  timeInTransit?: string; // Time in Transit
  departureTime?: string; // Departure Time
  arrivalTime?: string; // Arrival Time
  totalMiles?: number; // Total Miles

  // Bstock-specific fields
  tomsOriginZip?: string; // Canonical origin zip used for all rows
  crossdockName?: string;
  crossdockZip?: string;
  destName?: string;
  destZip?: string;
  boxesPerGaylord?: number;
  earliestPickup?: string;
  driveTime?: string;
  earliestDropoff?: string;
  middleMileTransit?: string;
}

export interface TruckConfiguration {
  parcelsPerPallet: number;
  palletsPerTruck: number;
  targetUtilization: number;
  daysPerWeek: number;
  // Pricing configuration
  costPerTruck?: number;
  costPerMile?: number;
}

export interface LaneMetrics {
  palletsPerDay: number;
  trucksPerDay: number;
  utilization: number;
  costPerDay: number;
}

export interface CategoryMetrics {
  category: LaneCategory;
  palletsPerDay: number;
  trucksNeeded: number;
  utilization: number;
  costPerDay: number;
}

export interface AppState {
  config: TruckConfiguration;
  lanes: Lane[];
  selectedLane: Lane | null;
  activeCategory: LaneCategory;
  kpis: {
    packages2024: number;
    packages2025: number;
  };
}

// CSV Row interface matching the actual CSV structure
export interface CSVRow {
  origin: string;
  destination: string;
  totalParcelCountPerDay?: string;
  parcelsPerPallet: string;
  palletsPerDay?: string;
  palletsPerDayPerState?: string;
  maxPalletCount: string;
  shippingCharge: string;
  costPerPalletBreakdown: string;
  costPerParcelFullUtilization: string;
  numberOfTrucks: string;
}

export interface ExportData {
  coverPage: {
    title: string;
    totalParcels: number;
    totalTrucks: number;
    avgUtilization: number;
  };
  fcPages: Array<{
    fc: FCCode;
    lanes: Array<Lane & LaneMetrics>;
    totalTrucks: number;
    avgUtilization: number;
  }>;
  summary: {
    beforeAfter: Array<{
      lane: string;
      beforeUtil: number;
      afterUtil: number;
      trucksSaved: number;
    }>;
  };
}

// Map projection types
export interface MapDimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

export interface LanePathData {
  id: string;
  path: string;
  length: number;
  color: string;
  fc: FCCode;
  region: string;
  metrics: LaneMetrics;
}
