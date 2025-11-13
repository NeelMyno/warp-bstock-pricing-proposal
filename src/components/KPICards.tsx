import React from 'react';
import { Lane, TruckConfiguration } from '../types';
import { calculateTotalMetrics, formatNumber, formatPercentage } from '../utils/calculations';

interface KPICardsProps {
  lanes: Lane[];
  config: TruckConfiguration;
  kpis: {
    packages2024: number;
    packages2025: number;
  };
  onUpdateKPIs: (kpis: { packages2024: number; packages2025: number }) => void;
}

const KPICards: React.FC<KPICardsProps> = ({ lanes, config, kpis, onUpdateKPIs }) => {
  const totals = calculateTotalMetrics(lanes, config);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* 2024 Packages */}
      <div className="card p-4">
        <div className="text-sm text-text-2 mb-1">2024 Packages</div>
        <input
          type="number"
          value={kpis.packages2024}
          onChange={(e) => onUpdateKPIs({ ...kpis, packages2024: parseInt(e.target.value) || 0 })}
          className="text-2xl font-bold text-accent bg-transparent border-none outline-none w-full"
          placeholder="0"
        />
      </div>

      {/* 2025 Packages */}
      <div className="card p-4">
        <div className="text-sm text-text-2 mb-1">2025 Packages</div>
        <input
          type="number"
          value={kpis.packages2025}
          onChange={(e) => onUpdateKPIs({ ...kpis, packages2025: parseInt(e.target.value) || 0 })}
          className="text-2xl font-bold text-accent bg-transparent border-none outline-none w-full"
          placeholder="0"
        />
      </div>

      {/* Daily Parcels */}
      <div className="card p-4">
        <div className="text-sm text-text-2 mb-1">Daily Parcels</div>
        <div className="text-2xl font-bold text-text-1">
          {formatNumber(totals.totalParcels)}
        </div>
      </div>

      {/* Trucks per Day */}
      <div className="card p-4">
        <div className="text-sm text-text-2 mb-1">No. of trucks</div>
        <div className="text-2xl font-bold text-text-1">
          {formatNumber(totals.totalTrucks)}
        </div>
      </div>

      {/* Average Utilization */}
      <div className="card p-4">
        <div className="text-sm text-text-2 mb-1">Avg Utilization</div>
        <div className="text-2xl font-bold text-accent">
          {formatPercentage(totals.avgUtilization)}
        </div>
      </div>
    </div>
  );
};

export default KPICards;
