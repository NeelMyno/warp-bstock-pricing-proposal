import React from 'react';

interface BstockOverviewProps {
  totalLanes: number;
  statesCount: number;
  warpCount: number;
  ltlCount: number;
  knownDistanceCount: number;
  unknownDistanceCount: number;
  localCount: number;
  localSharePct: number; // 0–100
  warpSharePct: number; // 0–100
  ltlSharePct: number; // 0–100
}

const fmtInt = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-US') : '-');

const BstockOverview: React.FC<BstockOverviewProps> = ({
  totalLanes,
  statesCount,
	warpCount,
	ltlCount,
  knownDistanceCount,
  unknownDistanceCount,
  localCount,
  localSharePct,
  warpSharePct,
  ltlSharePct,
}) => {
  const kpiClass =
    'rounded-lg border border-brd-1 bg-surface-1 px-3 py-2.5 min-w-0';
  const labelClass = 'text-[10px] uppercase tracking-wide text-text-2';
  const valueClass = 'mt-1 text-[20px] font-semibold text-text-1 tabular-nums leading-none whitespace-nowrap';
  const subClass = 'mt-0.5 text-[11px] text-text-2 tabular-nums leading-snug whitespace-normal';

	const distanceTotal = Math.max(0, knownDistanceCount + unknownDistanceCount);
	const distanceCoveragePct =
		distanceTotal === 0 ? 0 : Math.round((knownDistanceCount / distanceTotal) * 100);

	return (
	  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
	    <div className={kpiClass}>
	      <div className={labelClass}>Lanes</div>
	      <div className={valueClass}>{fmtInt(totalLanes)}</div>
	      <div className={subClass}>Warp {warpSharePct}% · LTL {ltlSharePct}%</div>
	      <div className={subClass}>Warp: {fmtInt(warpCount)} · LTL: {fmtInt(ltlCount)}</div>
	    </div>

	    <div className={kpiClass}>
	      <div className={labelClass}>States</div>
	      <div className={valueClass}>{fmtInt(statesCount)}</div>
	      <div className={subClass}>States with shipments</div>
	    </div>

	    <div
	      className={kpiClass}
	      title={`Distance coverage is the share of lanes with known ZIP coordinates, used to classify Local (≤100mi) vs Non-local. Unknown: ${fmtInt(unknownDistanceCount)}.`}
	    >
	      <div className={labelClass}>Distance coverage</div>
	      <div className={valueClass}>{distanceCoveragePct}%</div>
	      <div className={subClass}>{fmtInt(knownDistanceCount)} known lanes</div>
	      <div className={subClass}>Unknown: {fmtInt(unknownDistanceCount)}</div>
	    </div>

	    <div
	      className={kpiClass}
	      title={`Local is straight-line distance from Origin ZIP to Destination ZIP. Percent is among lanes with known distance (unknown: ${fmtInt(unknownDistanceCount)}).`}
	    >
	      <div className={labelClass}>Local (≤100mi)</div>
	      <div className={valueClass}>{localSharePct}%</div>
	      <div className={subClass}>
	        {fmtInt(localCount)} / {fmtInt(knownDistanceCount)} known
	      </div>
	    </div>
	  </div>
	);
};

export default BstockOverview;

