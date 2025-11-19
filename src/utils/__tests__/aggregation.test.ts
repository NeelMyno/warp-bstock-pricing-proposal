import { describe, it, expect } from 'vitest';
import type { Lane } from '../../types';
import { aggregateByDestinationState } from '../csvParser';

const makeLane = (overrides: Partial<Lane>): Lane => ({
  id: '1',
  category: 'new',
  origin: 'DFW',
  destination: 'Test',
  parcelsPerPallet: 1,
  palletsPerDay: 0,
  maxPalletCount: 0,
  shippingCharge: 0,
  costPerPalletBreakdown: 0,
  costPerParcelFullUtilization: 0,
  numberOfTrucks: 0,
  ...overrides,
});

describe('aggregateByDestinationState', () => {
  it('groups lanes by destination state and sums totalPieces', () => {
    const lanes: Lane[] = [
      makeLane({ id: 'a', destState: 'PA', totalPieces: 100 }),
      makeLane({ id: 'b', destState: 'PA', totalPieces: 50 }),
      makeLane({ id: 'c', destState: 'NJ', totalPieces: 25 }),
    ];

    const result = aggregateByDestinationState(lanes);

    expect(result).toEqual([
      {
        state: 'PA',
        totalPieces: 150,
        lanes: [lanes[0], lanes[1]],
      },
      {
        state: 'NJ',
        totalPieces: 25,
        lanes: [lanes[2]],
      },
    ]);
  });

  it('ignores lanes without destState or totalPieces', () => {
    const lanes: Lane[] = [
      makeLane({ id: 'a', destState: 'PA', totalPieces: 100 }),
      makeLane({ id: 'b', destState: undefined, totalPieces: 50 }),
      makeLane({ id: 'c', destState: 'NJ', totalPieces: undefined }),
    ];

    const result = aggregateByDestinationState(lanes);

    expect(result).toEqual([
      {
        state: 'PA',
        totalPieces: 100,
        lanes: [lanes[0]],
      },
    ]);
  });
});

