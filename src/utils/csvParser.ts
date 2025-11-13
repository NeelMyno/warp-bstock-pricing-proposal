import { Lane, LaneCategory, FCCode } from '../types';

// Parse currency string to number (e.g., "$1,430" -> 1430, "\"$2,502 \"" -> 2502)
const parseCurrency = (value: string): number => {
  if (!value) return 0;
  return parseFloat(value.replace(/[$,\s"]/g, '')) || 0;
};

// Parse number string (e.g., "55" -> 55)
const parseNumber = (value: string): number => {
  if (!value) return 0;
  return parseFloat(value.replace(/[,\s]/g, '')) || 0;
};

// Clean FC code to match our type system
const cleanFCCode = (fc: string): FCCode => {
  const cleaned = fc.trim();
  switch (cleaned) {
    case 'DFW': return 'DFW';
    case 'DFW (Dallas, TX)': return 'DFW'; // Handle Big & Bulky format
    case 'SAV (GA)': return 'SAV (GA)';
    case 'SAV (Savannah, GA)': return 'SAV (GA)'; // Handle Big & Bulky format
    case 'AVP (PA)': return 'AVP (PA)';
    case 'AVP (Nanticoke, PA)': return 'AVP (PA)'; // Handle Big & Bulky format
    case 'LNK (NE)': return 'LNK (NE)';
    case 'LNK (Lincoln, NE)': return 'LNK (NE)'; // Handle Big & Bulky format
    case 'IND (IN)': return 'IND (IN)';
    case 'IND (Indianapolis, IN)': return 'IND (IN)'; // Handle Big & Bulky format
    case 'SEA (WA)': return 'SEA (WA)';
    case 'SEA (Tacoma, WA)': return 'SEA (WA)'; // Handle Big & Bulky format
    case 'LAS (NV)': return 'LAS (NV)';
    case 'LAS (Las Vegas, NV)': return 'LAS (NV)'; // Handle Big & Bulky format
    // Handle new CSV format short codes
    case 'PA': return 'AVP (PA)';
    case 'NV': return 'LAS (NV)';
    case 'TX': return 'DFW';
    case 'GA': return 'SAV (GA)';
    case 'IN': return 'IND (IN)';
    case 'NE': return 'LNK (NE)';
    case 'WA': return 'SEA (WA)';
    default: return 'DFW'; // fallback
  }
};






// Parse CSV line handling quoted fields with commas
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add the last field
  result.push(current.trim());

  return result;
};



// Load TOMS single CSV and map to lanes (new category)
export const loadCSVData = async (): Promise<Lane[]> => {
  try {
    const res = await fetch('/toms/csv/toms.csv');
    if (!res.ok) throw new Error(`Failed to load TOMS CSV: ${res.status}`);
    const text = await res.text();

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const extractZip = (s: string): string => {
      const m = String(s).match(/\d{5}/);
      return m ? m[0] : String(s).trim();
    };

    const headers = parseCSVLine(lines[0]);
    const idx = (h: string) => headers.findIndex(x => x.trim().toLowerCase() === h);

    const i_origin = idx('origin');
    const i_origin_zip = idx('origin_zip');

    const i_d1 = idx('destination_1');
    const i_d1_zip = idx('destination_1_zip');
    const i_d2 = idx('destination_2');
    const i_d2_zip = idx('destination_2_zip');
    const i_boxes_per_gaylord = idx('boxes_per_gaylord');
    const i_tg_7 = idx('total_gaylord_7d_week');
    const i_ct_7 = idx('cost_per_truck_7d_week');
    const i_cg_7 = idx('cost_per_gaylord_7d_week');
    const i_cb_7 = idx('cost_per_box_7d_week');
    const i_tg_6 = idx('total_gaylord_6d_week');
    const i_ct_6 = idx('cost_per_truck_6d_week');
    const i_cg_6 = idx('cost_per_gaylord_6d_week');
    const i_cb_6 = idx('cost_per_box_6d_week');
    const i_tg_5 = idx('total_gaylord_5d_week');
    const i_ct_5 = idx('cost_per_truck_5d_week');
    const i_cg_5 = idx('cost_per_gaylord_5d_week');
    const i_cb_5 = idx('cost_per_box_5d_week');
    const i_tg_4 = idx('total_gaylord_4d_week');
    const i_ct_4 = idx('cost_per_truck_4d_week');
    const i_cg_4 = idx('cost_per_gaylord_4d_week');
    const i_cb_4 = idx('cost_per_box_4d_week');
    const i_ep = idx('earliest_pickup');
    const i_dt = idx('drive_time');
    const i_ed = idx('earliest_dropoff');
    const i_mmit = idx('middle_mile_time_in_transit');

    const lanes: Lane[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (!row.length) continue;

      const originCode = cleanFCCode(row[i_origin] ?? 'TX');

      const crossdockName = (row[i_d1] ?? '').trim();
      const crossdockZip = extractZip(row[i_d1_zip] ?? '');
      const destName = (row[i_d2] ?? '').trim();
      const destZip = extractZip(row[i_d2_zip] ?? '');

      if (!crossdockZip || !destZip) continue;

      const boxesPerGaylord = parseNumber(row[i_boxes_per_gaylord] ?? '0');

      const schedule = {
        '7d': {
          totalGaylordWeek: parseNumber(row[i_tg_7] ?? '0'),
          costPerTruckWeek: parseCurrency(row[i_ct_7] ?? '0'),
          costPerGaylordWeek: parseCurrency(row[i_cg_7] ?? '0'),
          costPerBoxWeek: parseCurrency(row[i_cb_7] ?? '0')
        },
        '6d': {
          totalGaylordWeek: parseNumber(row[i_tg_6] ?? '0'),
          costPerTruckWeek: parseCurrency(row[i_ct_6] ?? '0'),
          costPerGaylordWeek: parseCurrency(row[i_cg_6] ?? '0'),
          costPerBoxWeek: parseCurrency(row[i_cb_6] ?? '0')
        },
        '5d': {
          totalGaylordWeek: parseNumber(row[i_tg_5] ?? '0'),
          costPerTruckWeek: parseCurrency(row[i_ct_5] ?? '0'),
          costPerGaylordWeek: parseCurrency(row[i_cg_5] ?? '0'),
          costPerBoxWeek: parseCurrency(row[i_cb_5] ?? '0')
        },
        '4d': {
          totalGaylordWeek: parseNumber(row[i_tg_4] ?? '0'),
          costPerTruckWeek: parseCurrency(row[i_ct_4] ?? '0'),
          costPerGaylordWeek: parseCurrency(row[i_cg_4] ?? '0'),
          costPerBoxWeek: parseCurrency(row[i_cb_4] ?? '0')
        }
      } as Lane['tomsSchedule'];

      const earliestPickup = (row[i_ep] ?? '').trim();
      const driveTime = (row[i_dt] ?? '').trim();
      const earliestDropoff = (row[i_ed] ?? '').trim();
      const middleMileTransit = (row[i_mmit] ?? '').trim();

      // Use per-row origin_zip if available; fallback to 75238
      const originZip = extractZip(row[i_origin_zip] ?? '75238');

      const id = `${originZip}-${crossdockZip}-${destZip}`;

      const lane: Lane = {
        id,
        category: 'new',
        origin: originCode,
        destination: destName || destZip,
        parcelsPerPallet: 55,
        palletsPerDay: 0,
        maxPalletCount: 30,
        shippingCharge: 0,
        costPerPalletBreakdown: 0,
        costPerParcelFullUtilization: 0,
        numberOfTrucks: 0,
        // Zip fields used by map
        originZip: originZip,
        destinationZip: destZip,
        // TOMS specific
        tomsOriginZip: originZip,
        crossdockName,
        crossdockZip,
        destName: destName,
        destZip: destZip,
        boxesPerGaylord,
        tomsSchedule: schedule!,
        earliestPickup,
        driveTime,
        earliestDropoff,
        middleMileTransit
      };

      lanes.push(lane);
    }

    return lanes;
  } catch (error) {
    console.error('Error loading TOMS CSV data:', error);
    throw error;
  }
};

// Filter lanes by category
export const filterLanesByCategory = (lanes: Lane[], category: LaneCategory): Lane[] => {
  return lanes.filter(lane => lane.category === category);
};

// Get unique origins from lanes
export const getUniqueOrigins = (lanes: Lane[]): FCCode[] => {
  const origins = new Set<FCCode>();
  lanes.forEach(lane => origins.add(lane.origin));
  return Array.from(origins);
};

// Get unique destinations from lanes
export const getUniqueDestinations = (lanes: Lane[]): string[] => {
  const destinations = new Set<string>();
  lanes.forEach(lane => destinations.add(lane.destination));
  return Array.from(destinations);
};
