import { buildTruckUtilization, TRUCK_PALLET_CAPACITY } from '../truckUtils';

describe('buildTruckUtilization', () => {
  test('example: ltl=34, parcel=20 => total=54, trucksRequired=2, full=1, truck0 20 parcel + 10 ltl', () => {
    const res = buildTruckUtilization({ ltlPallets: 34, parcelPallets: 20 });
    expect(res.totalPallets).toBe(54);
    expect(res.trucksRequired).toBe(2);
    expect(res.fullTrucksToShow).toBe(1);
    expect(res.trucks.length).toBe(1);
    expect(res.trucks[0]).toEqual({ parcelSlots: 20, ltlSlots: 10 });
  });

  test('totalPallets=0 => trucksRequired=0, show nothing', () => {
    const res = buildTruckUtilization({ ltlPallets: 0, parcelPallets: 0 });
    expect(res.totalPallets).toBe(0);
    expect(res.trucksRequired).toBe(0);
    expect(res.fullTrucksToShow).toBe(0);
    expect(res.trucks).toHaveLength(0);
  });

  test('totalPallets=30 => trucksRequired=1, show 1 full truck, parcel first', () => {
    const res = buildTruckUtilization({ ltlPallets: 0, parcelPallets: 30 });
    expect(res.trucksRequired).toBe(1);
    expect(res.fullTrucksToShow).toBe(1);
    expect(res.trucks[0]).toEqual({ parcelSlots: 30, ltlSlots: 0 });
  });

  test('totalPallets=31 => trucksRequired=2, show 1 full truck; note partial not shown', () => {
    const res = buildTruckUtilization({ ltlPallets: 1, parcelPallets: 30 });
    expect(res.totalPallets).toBe(31);
    expect(res.trucksRequired).toBe(2);
    expect(res.fullTrucksToShow).toBe(1);
    expect(res.trucks[0]).toEqual({ parcelSlots: 30, ltlSlots: 0 });
  });

  test('parcel fills first across multiple full trucks', () => {
    const pallets = TRUCK_PALLET_CAPACITY * 2 + 5; // 65 total
    const res = buildTruckUtilization({ ltlPallets: 5, parcelPallets: 60 });
    expect(res.totalPallets).toBe(pallets);
    expect(res.trucksRequired).toBe(3);
    expect(res.fullTrucksToShow).toBe(2);
    expect(res.trucks[0]).toEqual({ parcelSlots: 30, ltlSlots: 0 });
    expect(res.trucks[1]).toEqual({ parcelSlots: 30, ltlSlots: 0 });
  });
});

