import React from 'react';
import { LaneCategory } from '../types';

interface CategoryTabsProps {
  activeCategory: LaneCategory;
  onCategoryChange: (category: LaneCategory) => void;
  categoryStats?: {
    parcel: { lanes: number; trucks: number };
    ltl: { lanes: number; trucks: number };
    'parcel-ltl': { lanes: number; trucks: number };
    'new': { lanes: number; trucks: number };
  };
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeCategory,
  onCategoryChange,
  categoryStats
}) => {
  const tabs = [
    {
      id: 'parcel' as LaneCategory,
      label: 'Parcel Only',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'bg-blue-600 hover:bg-blue-700',
      activeColor: 'bg-blue-600 border-blue-400'
    },
    {
      id: 'ltl' as LaneCategory,
      label: 'LTL Only',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-gray-600 hover:bg-gray-700',
      activeColor: 'bg-gray-600 border-gray-400'
    },
    {
      id: 'parcel-ltl' as LaneCategory,
      label: 'Parcel + LTL',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: 'bg-warp-green hover:bg-green-600',
      activeColor: 'bg-warp-green border-green-400'
    },
    {
      id: 'new' as LaneCategory,
      label: 'New',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      color: 'bg-purple-600 hover:bg-purple-700',
      activeColor: 'bg-purple-600 border-purple-400'
    }
  ];

  return (
    <div className="bg-surface-1 rounded-lg p-4 border border-brd-1 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-1">Shipment Categories</h2>
        <div className="text-sm text-text-2">
          Select category to view lanes and truck configurations
        </div>
      </div>
      
      <div className="flex space-x-2">
        {tabs.map((tab) => {
          const isActive = activeCategory === tab.id;
          const stats = categoryStats?.[tab.id];
          
          return (
            <button
              key={tab.id}
              onClick={() => onCategoryChange(tab.id)}
              className={`
                flex-1 flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200
                ${isActive
                  ? `${tab.activeColor} ${tab.id === 'parcel-ltl' ? 'text-warp-dark' : 'text-text-1'} border-opacity-50`
                  : 'bg-surface-2 hover:bg-surface-3 text-text-1 border-brd-1 hover:border-brd-1'
                }
              `}
            >
              <div className="flex items-center space-x-2 mb-2">
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </div>
              
              {stats && (
                <div className="text-xs text-center">
                  <div className="opacity-80">
                    {stats.lanes} lanes • {stats.trucks} trucks/day
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Category Description */}
      <div className="mt-4 p-3 bg-surface-2 rounded-lg">
        <div className="text-sm text-text-1">
          {activeCategory === 'parcel' && (
            <div>
              <span className="font-medium text-blue-400">Parcel Only:</span> Lanes dedicated to parcel shipments only. 
              Each truck position filled with parcel pallets (30 parcels per pallet).
            </div>
          )}
          {activeCategory === 'ltl' && (
            <div>
              <span className="font-medium text-text-2">LTL Only:</span> Lanes dedicated to Less-Than-Truckload freight only.
              Each truck position filled with LTL pallets.
            </div>
          )}
          {activeCategory === 'parcel-ltl' && (
            <div>
              <span className="font-medium text-warp-green">Parcel + LTL:</span> Mixed lanes combining both parcel and LTL shipments. 
              Optimized truck utilization with both shipment types.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryTabs;
