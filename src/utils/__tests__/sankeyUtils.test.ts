import { buildSankeyData, LaneMetrics, PARCELS_PER_PARCEL_PALLET } from '../sankeyUtils';

describe('buildSankeyData', () => {
  test('PA→EWR example numbers', () => {
    const input: LaneMetrics = {
      origin: "PA",
      destination: "EWR",
      ltlPallets: 34,
      parcelPallets: 20,
      bigBulkyParcelCount: 253
    };

    const result = buildSankeyData(input);

    // Expected derived numbers:
    // totalParcelCount = 20 * 55 = 1100
    // bigBulky = 253
    // remainingParcels = 1100 - 253 = 847

    // Check nodes
    expect(result.nodes).toEqual([
      { id: 'lane', name: 'PA → EWR' },
      { id: 'ltl_pallets', name: 'LTL Pallets' },
      { id: 'parcel_pallets', name: 'Parcel Pallets' },
      { id: 'total_parcels', name: 'Total Parcel Count' },
      { id: 'big_bulky', name: 'Big & Bulky Parcels' },
      { id: 'remaining_parcels', name: 'Remaining Parcels' }
    ]);

    // Check links with exact values
    expect(result.links).toEqual([
      { source: 'lane', target: 'ltl_pallets', value: 34 },
      { source: 'lane', target: 'parcel_pallets', value: 20 },
      { source: 'parcel_pallets', target: 'total_parcels', value: 1100 },
      { source: 'total_parcels', target: 'big_bulky', value: 253 },
      { source: 'total_parcels', target: 'remaining_parcels', value: 847 }
    ]);

    // Check unit notes
    expect(result.unitNotes).toBe(
      "Left branch values are pallets. After conversion, values are parcels (55 parcels per parcel pallet)."
    );
  });

  test('edge case: parcelPallets = 0', () => {
    const input: LaneMetrics = {
      origin: "NY",
      destination: "LA",
      ltlPallets: 10,
      parcelPallets: 0,
      bigBulkyParcelCount: 0
    };

    const result = buildSankeyData(input);

    // Should only have LTL link, no parcel links
    expect(result.links).toEqual([
      { source: 'lane', target: 'ltl_pallets', value: 10 }
    ]);
  });

  test('edge case: bigBulkyParcelCount > totalParcelCount', () => {
    const input: LaneMetrics = {
      origin: "TX",
      destination: "FL",
      ltlPallets: 5,
      parcelPallets: 2, // 2 * 55 = 110 total parcels
      bigBulkyParcelCount: 200 // More than total
    };

    const result = buildSankeyData(input);

    // bigBulky should be capped at totalParcelCount (110)
    // remainingParcels should be 0
    const totalParcelCount = 2 * PARCELS_PER_PARCEL_PALLET; // 110
    
    expect(result.links).toEqual([
      { source: 'lane', target: 'ltl_pallets', value: 5 },
      { source: 'lane', target: 'parcel_pallets', value: 2 },
      { source: 'parcel_pallets', target: 'total_parcels', value: totalParcelCount },
      { source: 'total_parcels', target: 'big_bulky', value: totalParcelCount }
      // No remaining_parcels link since it would be 0
    ]);
  });

  test('edge case: all inputs are zero', () => {
    const input: LaneMetrics = {
      origin: "CA",
      destination: "WA",
      ltlPallets: 0,
      parcelPallets: 0,
      bigBulkyParcelCount: 0
    };

    const result = buildSankeyData(input);

    // Should have nodes but no links
    expect(result.links).toEqual([]);
    expect(result.nodes.length).toBe(6); // All nodes should still be present
  });

  test('handles null/undefined inputs', () => {
    const input: LaneMetrics = {
      origin: "OR",
      destination: "NV",
      ltlPallets: null as any,
      parcelPallets: undefined as any,
      bigBulkyParcelCount: null as any
    };

    const result = buildSankeyData(input);

    // Should treat all as 0
    expect(result.links).toEqual([]);
  });

  test('handles decimal inputs by flooring', () => {
    const input: LaneMetrics = {
      origin: "AZ",
      destination: "CO",
      ltlPallets: 5.7,
      parcelPallets: 3.9,
      bigBulkyParcelCount: 100.5
    };

    const result = buildSankeyData(input);

    // Should floor all values
    // ltlPallets: 5, parcelPallets: 3, bigBulkyParcelCount: 100
    // totalParcelCount = 3 * 55 = 165
    // bigBulky = 100, remainingParcels = 65
    
    expect(result.links).toEqual([
      { source: 'lane', target: 'ltl_pallets', value: 5 },
      { source: 'lane', target: 'parcel_pallets', value: 3 },
      { source: 'parcel_pallets', target: 'total_parcels', value: 165 },
      { source: 'total_parcels', target: 'big_bulky', value: 100 },
      { source: 'total_parcels', target: 'remaining_parcels', value: 65 }
    ]);
  });
});
