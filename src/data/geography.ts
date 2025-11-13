import { FulfillmentCenter, Region } from '../types';

export const fulfillmentCenters: FulfillmentCenter[] = [
  {
    code: 'AVP (PA)',
    name: 'Allentown, PA',
    state: 'PA',
    coordinates: [-75.4714, 40.6023]
  },
  {
    code: 'IND (IN)',
    name: 'Indianapolis, IN',
    state: 'IN',
    coordinates: [-86.1581, 39.7684]
  },
  {
    code: 'LAS (NV)',
    name: 'Las Vegas, NV',
    state: 'NV',
    coordinates: [-115.1398, 36.1699]
  },
  {
    code: 'SAV (GA)',
    name: 'Savannah, GA',
    state: 'GA',
    coordinates: [-81.0912, 32.0835]
  },
  {
    code: 'DFW',
    name: 'Dallas, TX',
    state: 'TX',
    coordinates: [-96.7970, 32.7767]
  },
  {
    code: 'LNK (NE)',
    name: 'Lincoln, NE',
    state: 'NE',
    coordinates: [-96.6917, 40.8136]
  },
  {
    code: 'SEA (WA)',
    name: 'Seattle, WA',
    state: 'WA',
    coordinates: [-122.3321, 47.6062]
  }
];

export const regions: Region[] = [
  {
    name: 'NJ/NY',
    states: ['NJ', 'NY'],
    color: '#b084ff', // Purple for Northeast
    centroid: [-74.2591, 40.8178]
  },
  {
    name: 'Chicago/Midwest',
    states: ['IL', 'WI', 'MI'],
    color: '#9aa0a6', // Neutral for Other
    centroid: [-87.6298, 41.8781]
  },
  {
    name: 'SoCal/AZ',
    states: ['CA', 'AZ'],
    color: '#9aa0a6', // Neutral for Other
    centroid: [-117.1611, 34.0522]
  },
  {
    name: 'FL/Carolinas',
    states: ['FL', 'NC', 'SC'],
    color: '#3ad6ff', // Cyan for Southeast
    centroid: [-81.5158, 27.7663]
  },
  {
    name: 'Houston/OK',
    states: ['TX', 'OK'],
    color: '#00ff33', // Warp Green for TX/OK region
    centroid: [-95.3698, 29.7604]
  },
  {
    name: 'Upper Midwest',
    states: ['MN', 'IA', 'SD'],
    color: '#9aa0a6', // Neutral for Other
    centroid: [-93.2650, 44.9778]
  },
  {
    name: 'Portland/Seattle',
    states: ['WA', 'OR'],
    color: '#9aa0a6', // Neutral for Other
    centroid: [-122.6784, 45.5152]
  }
];

// State centroids for mapping (approximate centers)
export const stateCentroids: Record<string, [number, number]> = {
  'AL': [-86.79113, 32.377716],
  'AZ': [-111.431221, 34.048928],
  'AR': [-92.373123, 34.736009],
  'CA': [-119.681564, 36.116203],
  'CO': [-105.311104, 39.059811],
  'CT': [-72.755371, 41.767],
  'DE': [-75.507141, 39.318523],
  'DC': [-77.026817, 38.907192],
  'FL': [-82.451178, 27.766279],
  'GA': [-83.441162, 32.157435],
  'ID': [-114.478828, 44.240459],
  'IL': [-88.986137, 40.349457],
  'IN': [-86.147685, 39.790942],
  'IA': [-93.620866, 42.032974],
  'KS': [-98.484246, 39.04],
  'KY': [-84.86311, 37.839333],
  'LA': [-91.8, 30.45809],
  'ME': [-69.765261, 44.323535],
  'MD': [-76.501157, 39.045755],
  'MA': [-71.530106, 42.230171],
  'MI': [-84.5467, 44.182205],
  'MN': [-94.6859, 46.39241],
  'MS': [-89.678696, 32.741646],
  'MO': [-92.189283, 38.572954],
  'MT': [-110.454353, 47.052632],
  'NE': [-99.901813, 41.492537],
  'NV': [-116.419389, 38.313515],
  'NH': [-71.549709, 43.452492],
  'NJ': [-74.756138, 40.221741],
  'NM': [-106.248482, 34.57532],
  'NY': [-74.948051, 42.659829],
  'NC': [-79.806419, 35.759573],
  'ND': [-101.002012, 47.551493],
  'OH': [-82.764915, 40.269789],
  'OK': [-97.534994, 35.482309],
  'OR': [-120.767258, 43.804133],
  'PA': [-77.209755, 40.269789],
  'RI': [-71.422132, 41.82355],
  'SC': [-81.035, 33.836082],
  'SD': [-99.901813, 44.299782],
  'TN': [-86.580447, 35.860119],
  'TX': [-97.563461, 31.106],
  'UT': [-111.892622, 39.419220],
  'VT': [-72.710686, 44.0],
  'VA': [-78.169968, 37.54],
  'WA': [-121.490494, 47.042418],
  'WV': [-80.954570, 38.349497],
  'WI': [-89.616508, 44.268543],
  'WY': [-107.30249, 42.755966]
};
