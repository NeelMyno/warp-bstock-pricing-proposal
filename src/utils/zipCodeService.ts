// Zip code to coordinates mapping service
// This service provides coordinates for zip codes used in the CSV data

import usZips from 'us-zips';

export interface ZipCodeCoordinates {
  zipCode: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
}

// Known zip codes from the CSV files with their coordinates. These act as
// overrides/corrections on top of the generic US ZIP dataset.
export const ZIP_CODE_COORDINATES: Record<string, ZipCodeCoordinates> = {
  // Origin zip codes (Fulfillment Centers) - corrected based on CSV data
  '75201': { zipCode: '75201', latitude: 32.7767, longitude: -96.7970, city: 'Dallas', state: 'TX' }, // DFW
  '31401': { zipCode: '31401', latitude: 32.0835, longitude: -81.0998, city: 'Savannah', state: 'GA' }, // SAV (GA)
  '18503': { zipCode: '18503', latitude: 40.6084, longitude: -75.4902, city: 'Allentown', state: 'PA' }, // AVP (PA) - corrected
  '68508': { zipCode: '68508', latitude: 40.8136, longitude: -96.7026, city: 'Lincoln', state: 'NE' }, // LNK (NE) - corrected
  '46204': { zipCode: '46204', latitude: 39.7684, longitude: -86.1581, city: 'Indianapolis', state: 'IN' }, // IND (IN)
  '98101': { zipCode: '98101', latitude: 47.6062, longitude: -122.3321, city: 'Seattle', state: 'WA' }, // SEA (WA) - corrected
  '89109': { zipCode: '89109', latitude: 36.1215, longitude: -115.1739, city: 'Las Vegas', state: 'NV' }, // LAS (NV) - corrected

  // Bstock canonical origins (legacy DFW and Monroe Township, NJ)
  '75238': { zipCode: '75238', latitude: 32.8824, longitude: -96.7075, city: 'Dallas', state: 'TX' },
  '08831': { zipCode: '08831', latitude: 40.3356, longitude: -74.4335, city: 'Monroe Township', state: 'NJ' },

  // Bstock crossdocks
  '90021': { zipCode: '90021', latitude: 34.0346, longitude: -118.2410, city: 'Los Angeles', state: 'CA' }, // LAX
  '95131': { zipCode: '95131', latitude: 37.3890, longitude: -121.8850, city: 'San Jose', state: 'CA' }, // SFO (SJ area)
  '07036': { zipCode: '07036', latitude: 40.6220, longitude: -74.2510, city: 'Linden', state: 'NJ' }, // EWR region
  '28273': { zipCode: '28273', latitude: 35.1280, longitude: -80.9430, city: 'Charlotte', state: 'NC' }, // CLT
  '60632': { zipCode: '60632', latitude: 41.8130, longitude: -87.7130, city: 'Chicago', state: 'IL' }, // ORD region
  '43228': { zipCode: '43228', latitude: 39.9540, longitude: -83.1250, city: 'Columbus', state: 'OH' }, // CMH
  '43235': { zipCode: '43235', latitude: 40.1010, longitude: -83.0550, city: 'Columbus', state: 'OH' }, // CMH alt

  // Static Spreetail origins (no lanes)
  '68521': { zipCode: '68521', latitude: 40.8510, longitude: -96.7110, city: 'Lincoln', state: 'NE' },
  '98446': { zipCode: '98446', latitude: 47.1285, longitude: -122.3736, city: 'Tacoma', state: 'WA' },


  // Additional origin zips used in New lanes
  '18634': { zipCode: '18634', latitude: 41.2045, longitude: -76.0047, city: 'Nanticoke', state: 'PA' }, // AVP (PA) - New CSV
  '89115': { zipCode: '89115', latitude: 36.2353, longitude: -115.0720, city: 'Las Vegas', state: 'NV' }, // LAS (NV) - New CSV
  '75141': { zipCode: '75141', latitude: 32.6390, longitude: -96.7169, city: 'Hutchins', state: 'TX' }, // DFW - New CSV
  '31308': { zipCode: '31308', latitude: 32.1402, longitude: -81.6271, city: 'Bloomingdale', state: 'GA' }, // SAV (GA) - New CSV
  '46143': { zipCode: '46143', latitude: 39.6012, longitude: -86.1067, city: 'Greenwood', state: 'IN' }, // IND (IN) - New CSV

  // Destination zip codes from CSV files
  '77002': { zipCode: '77002', latitude: 29.7604, longitude: -95.3698, city: 'Houston', state: 'TX' },
  '78701': { zipCode: '78701', latitude: 30.2672, longitude: -97.7431, city: 'Austin', state: 'TX' },
  '73102': { zipCode: '73102', latitude: 35.4676, longitude: -97.5164, city: 'Oklahoma City', state: 'OK' },
  '87102': { zipCode: '87102', latitude: 35.0844, longitude: -106.6504, city: 'Albuquerque', state: 'NM' },
  '70112': { zipCode: '70112', latitude: 29.9511, longitude: -90.0715, city: 'New Orleans', state: 'LA' },
  '72201': { zipCode: '72201', latitude: 34.7465, longitude: -92.2896, city: 'Little Rock', state: 'AR' },
  '30303': { zipCode: '30303', latitude: 33.7490, longitude: -84.3880, city: 'Atlanta', state: 'GA' },
  '32801': { zipCode: '32801', latitude: 28.5383, longitude: -81.3792, city: 'Orlando', state: 'FL' },
  '28202': { zipCode: '28202', latitude: 35.2271, longitude: -80.8431, city: 'Charlotte', state: 'NC' },
  '29201': { zipCode: '29201', latitude: 34.0007, longitude: -81.0348, city: 'Columbia', state: 'SC' },
  '60601': { zipCode: '60601', latitude: 41.8781, longitude: -87.6298, city: 'Chicago', state: 'IL' },
  '67202': { zipCode: '67202', latitude: 37.6872, longitude: -97.3301, city: 'Wichita', state: 'KS' },
  '63101': { zipCode: '63101', latitude: 38.6270, longitude: -90.1994, city: 'St. Louis', state: 'MO' },
  '37203': { zipCode: '37203', latitude: 36.1627, longitude: -86.7816, city: 'Nashville', state: 'TN' },
  '35203': { zipCode: '35203', latitude: 33.5207, longitude: -86.8025, city: 'Birmingham', state: 'AL' },
  '33131': { zipCode: '33131', latitude: 25.7617, longitude: -80.1918, city: 'Miami', state: 'FL' }, // Updated from 33101
  '19103': { zipCode: '19103', latitude: 39.9526, longitude: -75.1652, city: 'Philadelphia', state: 'PA' }, // Updated from 19102
  '10001': { zipCode: '10001', latitude: 40.7505, longitude: -73.9934, city: 'New York', state: 'NY' },
  '07102': { zipCode: '07102', latitude: 40.7282, longitude: -74.1776, city: 'Newark', state: 'NJ' },
  '02108': { zipCode: '02108', latitude: 42.3601, longitude: -71.0589, city: 'Boston', state: 'MA' }, // Updated from 02101
  '06103': { zipCode: '06103', latitude: 41.7658, longitude: -72.6734, city: 'Hartford', state: 'CT' }, // Updated from 06101
  '03101': { zipCode: '03101', latitude: 43.2081, longitude: -71.5376, city: 'Concord', state: 'NH' }, // Updated from 03301
  '23219': { zipCode: '23219', latitude: 37.5407, longitude: -77.4360, city: 'Richmond', state: 'VA' },
  '37219': { zipCode: '37219', latitude: 36.1627, longitude: -86.7816, city: 'Nashville', state: 'TN' },
  '40202': { zipCode: '40202', latitude: 38.2527, longitude: -85.7585, city: 'Louisville', state: 'KY' },
  '19107': { zipCode: '19107', latitude: 39.9526, longitude: -75.1652, city: 'Philadelphia', state: 'PA' },
  '21201': { zipCode: '21201', latitude: 39.2904, longitude: -76.6122, city: 'Baltimore', state: 'MD' },
  '55401': { zipCode: '55401', latitude: 44.9778, longitude: -93.2650, city: 'Minneapolis', state: 'MN' },
  '53202': { zipCode: '53202', latitude: 43.0389, longitude: -87.9065, city: 'Milwaukee', state: 'WI' },
  '50309': { zipCode: '50309', latitude: 41.5868, longitude: -93.6250, city: 'Des Moines', state: 'IA' },
  '58102': { zipCode: '58102', latitude: 46.8083, longitude: -100.7837, city: 'Bismarck', state: 'ND' },
  '57104': { zipCode: '57104', latitude: 43.5460, longitude: -96.7313, city: 'Sioux Falls', state: 'SD' },
  '48226': { zipCode: '48226', latitude: 42.3314, longitude: -83.0458, city: 'Detroit', state: 'MI' },
  // Additional destination zips used in New lanes
  '08805': { zipCode: '08805', latitude: 40.5676, longitude: -74.5290, city: 'Bound Brook', state: 'NJ' }, // EWR region
  '08086': { zipCode: '08086', latitude: 39.8306, longitude: -75.1880, city: 'West Deptford', state: 'NJ' }, // PHL region
  '20166': { zipCode: '20166', latitude: 39.0010, longitude: -77.4535, city: 'Sterling', state: 'VA' }, // IAD (MD/VA)
  '06114': { zipCode: '06114', latitude: 41.7360, longitude: -72.6680, city: 'Hartford', state: 'CT' }, // MA/CT region
  '90745': { zipCode: '90745', latitude: 33.8314, longitude: -118.2656, city: 'Carson', state: 'CA' }, // LAX (& SFO)
  '85353': { zipCode: '85353', latitude: 33.4305, longitude: -112.2650, city: 'Phoenix', state: 'AZ' }, // PHX
  '75050': { zipCode: '75050', latitude: 32.7767, longitude: -97.0300, city: 'Grand Prairie', state: 'TX' }, // DFW
  '77055': { zipCode: '77055', latitude: 29.8017, longitude: -95.4840, city: 'Houston', state: 'TX' }, // HOU
  '78218': { zipCode: '78218', latitude: 29.4947, longitude: -98.4062, city: 'San Antonio', state: 'TX' }, // SAT
  '30336': { zipCode: '30336', latitude: 33.7305, longitude: -84.5566, city: 'Atlanta', state: 'GA' }, // ATL
  '33147': { zipCode: '33147', latitude: 25.8469, longitude: -80.2389, city: 'Miami', state: 'FL' }, // MIA
  '32824': { zipCode: '32824', latitude: 28.4177, longitude: -81.3550, city: 'Orlando', state: 'FL' }, // MCO
  '60106': { zipCode: '60106', latitude: 41.9550, longitude: -87.9403, city: 'Bensenville', state: 'IL' }, // CHI
  '43123': { zipCode: '43123', latitude: 39.8831, longitude: -83.0924, city: 'Grove City', state: 'OH' }, // CMH

  '90012': { zipCode: '90012', latitude: 34.0610, longitude: -118.2430, city: 'Los Angeles', state: 'CA' },
  '29401': { zipCode: '29401', latitude: 32.7765, longitude: -79.9311, city: 'Charleston', state: 'SC' },
  '23462': { zipCode: '23462', latitude: 36.8390, longitude: -76.1423, city: 'Virginia Beach', state: 'VA' },
  '06604': { zipCode: '06604', latitude: 41.1792, longitude: -73.1895, city: 'Bridgeport', state: 'CT' },
  '64106': { zipCode: '64106', latitude: 39.1031, longitude: -94.5698, city: 'Kansas City', state: 'MO' },
  '84101': { zipCode: '84101', latitude: 40.7608, longitude: -111.8910, city: 'Salt Lake City', state: 'UT' },
  '43215': { zipCode: '43215', latitude: 39.9612, longitude: -82.9988, city: 'Columbus', state: 'OH' },
  '83702': { zipCode: '83702', latitude: 43.6150, longitude: -116.2023, city: 'Boise', state: 'ID' },
  '84111': { zipCode: '84111', latitude: 40.7608, longitude: -111.8910, city: 'Salt Lake City', state: 'UT' },
  '80202': { zipCode: '80202', latitude: 39.7392, longitude: -104.9903, city: 'Denver', state: 'CO' },
  '85004': { zipCode: '85004', latitude: 33.4484, longitude: -112.0740, city: 'Phoenix', state: 'AZ' },
  '94103': { zipCode: '94103', latitude: 37.7749, longitude: -122.4194, city: 'San Francisco', state: 'CA' },
  '97204': { zipCode: '97204', latitude: 45.5152, longitude: -122.6784, city: 'Portland', state: 'OR' },
  '07302': { zipCode: '07302', latitude: 40.7282, longitude: -74.1776, city: 'Jersey City', state: 'NJ' },
  '19801': { zipCode: '19801', latitude: 39.7391, longitude: -75.5398, city: 'Wilmington', state: 'DE' },
  '02110': { zipCode: '02110', latitude: 42.3601, longitude: -71.0589, city: 'Boston', state: 'MA' },
  '21202': { zipCode: '21202', latitude: 39.2904, longitude: -76.6122, city: 'Baltimore', state: 'MD' },
  '68102': { zipCode: '68102', latitude: 41.2565, longitude: -95.9345, city: 'Omaha', state: 'NE' },
  '2110': { zipCode: '02110', latitude: 42.3601, longitude: -71.0589, city: 'Boston', state: 'MA' }, // Handle 4-digit zip
  '7302': { zipCode: '07302', latitude: 40.7282, longitude: -74.1776, city: 'Jersey City', state: 'NJ' }, // Handle 4-digit zip
  '6103': { zipCode: '06103', latitude: 41.7658, longitude: -72.6734, city: 'Hartford', state: 'CT' }, // Handle 4-digit zip
  '3301': { zipCode: '03301', latitude: 43.2081, longitude: -71.5376, city: 'Concord', state: 'NH' } // Handle 4-digit zip
};

// Approximate centroid coordinates for US states, used as a fallback when a
// destination ZIP is not present in ZIP_CODE_COORDINATES. This lets us still
// draw all lanes at a state level even if we do not have every individual ZIP.
const STATE_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  AL: { latitude: 32.8067, longitude: -86.7911 },
  AK: { latitude: 64.2008, longitude: -149.4937 },
  AZ: { latitude: 34.0489, longitude: -111.0937 },
  AR: { latitude: 34.9697, longitude: -92.3731 },
  CA: { latitude: 36.7783, longitude: -119.4179 },
  CO: { latitude: 39.5501, longitude: -105.7821 },
  CT: { latitude: 41.6032, longitude: -73.0877 },
  DE: { latitude: 38.9108, longitude: -75.5277 },
  FL: { latitude: 27.6648, longitude: -81.5158 },
  GA: { latitude: 32.1656, longitude: -82.9001 },
  HI: { latitude: 19.8968, longitude: -155.5828 },
  ID: { latitude: 44.0682, longitude: -114.7420 },
  IL: { latitude: 40.6331, longitude: -89.3985 },
  IN: { latitude: 40.5512, longitude: -85.6024 },
  IA: { latitude: 41.8780, longitude: -93.0977 },
  KS: { latitude: 39.0119, longitude: -98.4842 },
  KY: { latitude: 37.8393, longitude: -84.2700 },
  LA: { latitude: 31.2448, longitude: -92.1450 },
  ME: { latitude: 45.2538, longitude: -69.4455 },
  MD: { latitude: 39.0458, longitude: -76.6413 },
  MA: { latitude: 42.4072, longitude: -71.3824 },
  MI: { latitude: 44.3148, longitude: -85.6024 },
  MN: { latitude: 46.7296, longitude: -94.6859 },
  MS: { latitude: 32.3547, longitude: -89.3985 },
  MO: { latitude: 37.9643, longitude: -91.8318 },
  MT: { latitude: 46.8797, longitude: -110.3626 },
  NE: { latitude: 41.4925, longitude: -99.9018 },
  NV: { latitude: 38.8026, longitude: -116.4194 },
  NH: { latitude: 43.1939, longitude: -71.5724 },
  NJ: { latitude: 40.0583, longitude: -74.4057 },
  NM: { latitude: 34.5199, longitude: -105.8701 },
  NY: { latitude: 43.2994, longitude: -74.2179 },
  NC: { latitude: 35.7596, longitude: -79.0193 },
  ND: { latitude: 47.5515, longitude: -101.0020 },
  OH: { latitude: 40.4173, longitude: -82.9071 },
  OK: { latitude: 35.4676, longitude: -97.5164 },
  OR: { latitude: 43.8041, longitude: -120.5542 },
  PA: { latitude: 41.2033, longitude: -77.1945 },
  RI: { latitude: 41.5801, longitude: -71.4774 },
  SC: { latitude: 33.8361, longitude: -81.1637 },
  SD: { latitude: 43.9695, longitude: -99.9018 },
  TN: { latitude: 35.5175, longitude: -86.5804 },
  TX: { latitude: 31.9686, longitude: -99.9018 },
  UT: { latitude: 39.3210, longitude: -111.0937 },
  VT: { latitude: 44.5588, longitude: -72.5778 },
  VA: { latitude: 37.4316, longitude: -78.6569 },
  WA: { latitude: 47.7511, longitude: -120.7401 },
  WV: { latitude: 38.5976, longitude: -80.4549 },
  WI: { latitude: 43.7844, longitude: -88.7879 },
  WY: { latitude: 43.0759, longitude: -107.2903 },
  DC: { latitude: 38.9072, longitude: -77.0369 }
};

export const getStateCoordinates = (stateCode: string): ZipCodeCoordinates | null => {
  const code = stateCode.trim().toUpperCase();
  const coord = STATE_COORDINATES[code];
  if (!coord) return null;
  return {
    zipCode: code,
    latitude: coord.latitude,
    longitude: coord.longitude,
    state: code
  };
};


// Get coordinates for a zip code. We first check our curated overrides and
// then fall back to the full US ZIP dataset so every valid zip in the CSV has
// a coordinate.
export const getZipCodeCoordinates = (zipCode: string): ZipCodeCoordinates | null => {
  const cleanZipCode = zipCode.trim();
  if (!cleanZipCode) return null;

  // 1) Prefer explicit overrides/corrections defined in ZIP_CODE_COORDINATES.
  const override = ZIP_CODE_COORDINATES[cleanZipCode];
  if (override) return override;

  // 2) Fall back to the generic US ZIP dataset.
  const generic = (usZips as any)[cleanZipCode] as
    | { latitude: number; longitude: number; city?: string; state?: string }
    | undefined;

  if (generic && typeof generic.latitude === 'number' && typeof generic.longitude === 'number') {
    return {
      zipCode: cleanZipCode,
      latitude: generic.latitude,
      longitude: generic.longitude,
      city: generic.city,
      state: generic.state
    };
  }

  return null;
};

// Get all available zip codes from the curated overrides only. This is used
// for display/diagnostics and avoids pulling in the entire US ZIP list.
export const getAllZipCodes = (): string[] => {
  return Object.keys(ZIP_CODE_COORDINATES);
};

// Validate if a zip code has coordinates using the same lookup logic as above.
export const hasZipCodeCoordinates = (zipCode: string): boolean => {
  return getZipCodeCoordinates(zipCode) !== null;
};

// Get coordinates for origin and destination zip codes
export const getLaneCoordinates = (originZip: string, destinationZip: string): {
  origin: ZipCodeCoordinates | null;
  destination: ZipCodeCoordinates | null;
} => {
  return {
    origin: getZipCodeCoordinates(originZip),
    destination: getZipCodeCoordinates(destinationZip)
  };
};
