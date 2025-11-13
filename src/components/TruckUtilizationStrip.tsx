import React from 'react';
import { FONT_SCALE } from '../utils/sankeyTheme';
import { TruckUtilization, TRUCK_PALLET_CAPACITY, ROW_CAPACITY } from '../utils/truckUtils';

// Colors aligned with Sankey: parcel_pallets & ltl_pallets
const COLOR_PARCEL = '#5BC0F8';
const COLOR_LTL = '#2ED4A6';

interface TruckUtilizationStripProps {
  utilization: TruckUtilization;
}

export const TruckUtilizationStrip: React.FC<TruckUtilizationStripProps> = ({ utilization }) => {
  const { trucksRequired, fullTrucksToShow, trucks } = utilization;
  const partialCount = Math.max(0, trucksRequired - fullTrucksToShow);

  if (trucksRequired === 0) {
    return <div className="text-xs" style={{ color: 'var(--text-2)', fontSize: Math.round(12 * FONT_SCALE) }}>No trucks required</div>;
  }

  return (
    <div style={{ width: 680 }}>
      <div className="mb-2" style={{ color: 'var(--text-1)', fontSize: Math.round(12 * FONT_SCALE) }}>
        <span className="font-medium">Trucks required:</span> {trucksRequired}
        {partialCount > 0 && (
          <span className="ml-2 text-text-2">(+{partialCount} partial not shown)</span>
        )}
      </div>

      <div className="space-y-2">
        {trucks.map((t, idx) => (
          <TruckRow key={idx} parcelSlots={t.parcelSlots} ltlSlots={t.ltlSlots} />
        ))}
      </div>
    </div>
  );
};

const TruckRow: React.FC<{ parcelSlots: number; ltlSlots: number }> = ({ parcelSlots, ltlSlots }) => {
  // Render a 2x15 grid. First fill top row 15, then bottom 15 for each color by the requested counts.
  const totalSlots = TRUCK_PALLET_CAPACITY;
  const slots: Array<'parcel' | 'ltl'> = [];
  for (let i = 0; i < parcelSlots; i++) slots.push('parcel');
  for (let i = 0; i < ltlSlots; i++) slots.push('ltl');

  // Build 2 rows of 15; if more than 15, continue on second row.
  const row1 = slots.slice(0, ROW_CAPACITY);
  const row2 = slots.slice(ROW_CAPACITY, totalSlots);

  const slotStyle: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginRight: 3,
    background: 'transparent',
    border: '1px solid var(--brd-1)'
  };

  const wrapStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: 6,
    borderRadius: 6,
    border: '1px solid var(--brd-1)',
    background: 'var(--surface-2)'
  };

  return (
    <div style={wrapStyle}>
      <div className="flex" style={{ marginBottom: 4 }}>
        {Array.from({ length: ROW_CAPACITY }).map((_, i) => {
          const fill = row1[i];
          const style = { ...slotStyle, background: fill === 'parcel' ? COLOR_PARCEL : fill === 'ltl' ? COLOR_LTL : 'transparent' };
          return <div key={i} style={style} />;
        })}
      </div>
      <div className="flex">
        {Array.from({ length: ROW_CAPACITY }).map((_, i) => {
          const fill = row2[i];
          const style = { ...slotStyle, background: fill === 'parcel' ? COLOR_PARCEL : fill === 'ltl' ? COLOR_LTL : 'transparent' };
          return <div key={i} style={style} />;
        })}
      </div>
    </div>
  );
};

