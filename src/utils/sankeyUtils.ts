// Type definitions
export type LaneMetrics = {
  origin: string;            // e.g., "PA"
  destination: string;       // e.g., "EWR"
  ltlPallets: number;        // integer >= 0
  parcelPallets: number;     // integer >= 0
  bigBulkyParcelCount: number; // integer >= 0  (already counted in parcels)
};

export type SankeyData = {
  nodes: { id: string; name: string }[];
  links: { source: string; target: string; value: number }[];
  unitNotes: string; // explain units in tooltip footer
};

// Constants (configurable)
export const PARCELS_PER_PARCEL_PALLET = 55; // integer

// Helper function to clamp integer values
function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value || 0)));
}

// Pure function to build Sankey data
export function buildSankeyData(lane: LaneMetrics): SankeyData {
  // Treat null/undefined as 0
  const ltlPallets = Math.floor(lane.ltlPallets || 0);
  const parcelPallets = Math.floor(lane.parcelPallets || 0);
  const bigBulkyParcelCount = Math.floor(lane.bigBulkyParcelCount || 0);

  // Calculations (MUST follow these exactly)
  const totalParcelCount = parcelPallets * PARCELS_PER_PARCEL_PALLET; // units: parcels
  const bigBulky = clampInt(bigBulkyParcelCount, 0, totalParcelCount);
  const remainingParcels = totalParcelCount - bigBulky;

  // Sankey structure (node IDs are stable strings)
  const nodes = [
    { id: 'lane', name: `${lane.origin} → ${lane.destination}` },
    { id: 'ltl_pallets', name: 'LTL Pallets' },
    { id: 'parcel_pallets', name: 'Total No. of Parcels' },
    { id: 'total_parcels', name: 'Total Parcel Count' },
    { id: 'big_bulky', name: 'Big & Bulky Parcels' },
    { id: 'remaining_parcels', name: 'Remaining Parcels' }
  ];

  const links = [];

  // Links and values
  if (ltlPallets > 0) {
    links.push({ source: 'lane', target: 'ltl_pallets', value: ltlPallets });
  }

  if (parcelPallets > 0) {
    links.push({ source: 'lane', target: 'parcel_pallets', value: parcelPallets });
    links.push({ source: 'parcel_pallets', target: 'total_parcels', value: totalParcelCount });
    
    if (bigBulky > 0) {
      links.push({ source: 'total_parcels', target: 'big_bulky', value: bigBulky });
    }
    
    if (remainingParcels > 0) {
      links.push({ source: 'total_parcels', target: 'remaining_parcels', value: remainingParcels });
    }
  }

  const unitNotes = "Left branch values are pallets. After conversion, values are parcels (55 parcels per parcel pallet).";

  return {
    nodes,
    links,
    unitNotes
  };
}
