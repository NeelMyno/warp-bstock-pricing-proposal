// Truck utilization calculation utilities

export const TRUCK_PALLET_CAPACITY = 30; // 15 per row × 2 rows
export const ROW_CAPACITY = 15;

export type TruckFill = { parcelSlots: number; ltlSlots: number }; // sums to 30
export type TruckUtilization = {
  totalPallets: number;
  trucksRequired: number;
  fullTrucksToShow: number;
  trucks: TruckFill[]; // length === fullTrucksToShow
};

export type LaneMetricsForUtil = {
  ltlPallets: number;
  parcelPallets: number;
};

export function buildTruckUtilization(lane: LaneMetricsForUtil): TruckUtilization {
  const ltl = Math.max(0, Math.floor(lane.ltlPallets || 0));
  const parcel = Math.max(0, Math.floor(lane.parcelPallets || 0));

  const totalPallets = ltl + parcel;
  const trucksRequired = totalPallets === 0 ? 0 : Math.ceil(totalPallets / TRUCK_PALLET_CAPACITY);
  const fullTrucksToShow = Math.floor(totalPallets / TRUCK_PALLET_CAPACITY);

  const trucks: TruckFill[] = [];
  if (fullTrucksToShow > 0) {
    let parcelRemaining = parcel;
    let ltlRemaining = ltl;

    for (let i = 0; i < fullTrucksToShow; i++) {
      const useParcel = Math.min(parcelRemaining, TRUCK_PALLET_CAPACITY);
      const useLTL = TRUCK_PALLET_CAPACITY - useParcel;
      trucks.push({ parcelSlots: useParcel, ltlSlots: useLTL });
      parcelRemaining -= useParcel;
      ltlRemaining -= useLTL;
    }
  }

  return { totalPallets, trucksRequired, fullTrucksToShow, trucks };
}

