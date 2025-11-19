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

export interface StateAggregate {
  state: string;
  totalPieces: number;
  lanes: Lane[];
}

export const aggregateByDestinationState = (lanes: Lane[]): StateAggregate[] => {
  const byState = new Map<string, { totalPieces: number; lanes: Lane[] }>();

  lanes.forEach((lane) => {
    if (!lane.destState || typeof lane.totalPieces !== 'number') return;
    const key = lane.destState;
    const entry = byState.get(key) ?? { totalPieces: 0, lanes: [] };
    entry.totalPieces += lane.totalPieces || 0;
    entry.lanes.push(lane);
    byState.set(key, entry);
  });

  return Array.from(byState.entries())
    .map(([state, { totalPieces, lanes }]) => ({ state, totalPieces, lanes }))
    .sort((a, b) => a.state.localeCompare(b.state));
};


// Load Bstock single CSV and map to lanes (new category)
export const loadCSVData = async (): Promise<Lane[]> => {
  try {
    const res = await fetch('/toms/csv/bstock.csv');
    if (!res.ok) throw new Error(`Failed to load Bstock CSV: ${res.status}`);
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
    const i_origin_state = idx('origin_state');
    const i_origin_zip = idx('origin_zip');

    const i_d1 = idx('destination_1');
    const i_d1_zip = idx('destination_1_zip');
    const i_d2 = idx('destination_2');
    const i_d2_state = idx('destination_2_state');
    const i_d2_zip = idx('destination_2_zip');
    const i_total_piece = idx('total_piece');
    const i_rate = idx('rate');
    const i_carrier = idx('carrier');

    // Ensure required columns are present
    const requiredIndices = [i_origin_zip, i_d1_zip, i_d2_zip, i_d2_state, i_total_piece, i_carrier];
    if (requiredIndices.some((i) => i === -1)) {
      throw new Error('Bstock CSV is missing one or more required columns: origin_zip, destination_1_zip, destination_2_zip, destination_2_state, total_piece, carrier');
    }

    const lanes: Lane[] = [];
    const originZipSet = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (!row.length) continue;

      const originZip = extractZip(row[i_origin_zip] ?? '');
      if (!originZip) continue;

      const originCity = i_origin >= 0 ? (row[i_origin] ?? '').trim() : '';
      const originState = i_origin_state >= 0 ? (row[i_origin_state] ?? '').trim() : '';

      const crossdockName = i_d1 >= 0 ? (row[i_d1] ?? '').trim() : '';
      const crossdockZip = extractZip(row[i_d1_zip] ?? '');
      const destName = i_d2 >= 0 ? (row[i_d2] ?? '').trim() : '';
      const destZip = extractZip(row[i_d2_zip] ?? '');
      const destState = (row[i_d2_state] ?? '').trim();

      // Require crossdock, final destination, and destination state to render a lane
      if (!crossdockZip || !destZip || !destState) continue;

      const totalPieces = parseNumber(row[i_total_piece] ?? '0');
      const rate = parseCurrency(row[i_rate] ?? '');
      const carrierRaw = (row[i_carrier] ?? '').trim();
      const carrierNorm = carrierRaw.toLowerCase() === 'warp'
        ? 'Warp'
        : carrierRaw.toLowerCase() === 'ltl'
          ? 'LTL'
          : (carrierRaw || 'LTL');

      originZipSet.add(originZip);

      // Map origin_state (e.g., "NJ") to an FCCode for compatibility with the rest of the app
      const originFc: FCCode = cleanFCCode(originState || 'TX');

      const id = `${originZip}-${crossdockZip}-${destZip}-${i}`;

      const lane: Lane = {
        id,
        category: 'new',
        origin: originFc,
        destination: destName || destZip,
        parcelsPerPallet: 1,
        palletsPerDay: 0,
        maxPalletCount: 0,
        shippingCharge: rate,
        costPerPalletBreakdown: 0,
        costPerParcelFullUtilization: 0,
        numberOfTrucks: 0,
        // Zip & location fields used by the map
        originZip,
        destinationZip: destZip,
        originCity,
        originState,
        // Bstock-specific routing fields
        crossdockName,
        crossdockZip,
        destName: destName || destZip,
        destZip,
        destState,
        totalPieces,
        carrierType: carrierNorm
      };

      lanes.push(lane);
    }

    // Validate that there is only a single origin zip as expected
    if (originZipSet.size > 1) {
      throw new Error(`Bstock CSV expected a single origin_zip but found ${originZipSet.size}: ${Array.from(originZipSet).join(', ')}`);
    }

    return lanes;
  } catch (error) {
    console.error('Error loading Bstock CSV data:', error);
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
