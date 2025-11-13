import React from 'react';
import { LaneCategory } from '../types';

interface CategoryStats {
  lanes: number;
  trucks: number;
}

interface SidebarProps {
  activeCategory: LaneCategory;
  onCategoryChange: (category: LaneCategory) => void;
  categoryStats: {
    parcel: CategoryStats;
    ltl: CategoryStats;
    'parcel-ltl': CategoryStats;
  };
}

const Sidebar: React.FC<SidebarProps> = ({
  activeCategory,
  onCategoryChange,
  categoryStats
}) => {
  const categories = [
    {
      id: 'parcel' as LaneCategory,
      name: 'Parcel Only',
      description: 'Direct parcel shipping lanes with standard truck utilization',
      stats: categoryStats.parcel
    },
    {
      id: 'ltl' as LaneCategory,
      name: 'LTL Only',
      description: 'Less-than-truckload shipping for consolidated freight',
      stats: categoryStats.ltl
    },
    {
      id: 'parcel-ltl' as LaneCategory,
      name: 'Parcel + LTL',
      description: 'Combined parcel and LTL shipping for maximum efficiency',
      stats: categoryStats['parcel-ltl']
    }
  ];

  return (
    <div className="w-64 bg-surface-1 border-r border-brd-1 flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-brd-1">
        <h1 className="text-xl font-bold text-accent mb-1">Warp × TOMS</h1>
        <p className="text-sm text-text-2">Pricing Proposal Dashboard</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4">
        <h2 className="text-sm font-semibold text-text-2 mb-4 uppercase tracking-wide">
          Categories
        </h2>
        
        <div className="space-y-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`w-full text-left p-4 rounded-md border transition-all duration-200 ${
                activeCategory === category.id
                  ? 'bg-surface-3 text-text-1 border-brd-1 shadow-elev-1'
                  : 'bg-surface-2 text-text-1 hover:bg-surface-3 hover:text-text-1 border-brd-1 hover:border-brd-1'
              }` }
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-sm">{category.name}</h3>
                <div className="text-xs opacity-75">
                  {category.stats.lanes} lanes
                </div>
              </div>
              
              <p className="text-xs opacity-75 leading-relaxed">
                {category.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-brd-1">
        <div className="text-xs text-text-2">
          <div className="mb-2">
            <span className="font-medium">Data Source:</span>
          </div>
          <div className="space-y-1 text-text-2">
            <div>• spreetail_source_parcel.csv</div>
            <div>• spreetail_source_ltl.csv</div>
            <div>• spreetail_source_p_ltl.csv</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
