import React, { useMemo } from 'react';
import { buildSankeyData, LaneMetrics } from '../utils/sankeyUtils';
import { getSankeyTheme, FONT_SCALE, toRgba } from '../utils/sankeyTheme';

interface LaneSankeyProps {
  lane: LaneMetrics;
  showFootnote?: boolean;
}

export const LaneSankey: React.FC<LaneSankeyProps> = ({ lane, showFootnote = true }) => {
  const sankeyData = useMemo(() => buildSankeyData(lane), [lane]);

  // Check for empty state
  const hasData = sankeyData.links.length > 0;

  if (!hasData) {
    return (
      <div style={{ width: '700px', height: '210px' }} className="flex items-center justify-center text-text-2 text-sm">
        No flow data available
      </div>
    );
  }

  // Theme and palette helpers
  const theme = getSankeyTheme();

  // Calmer neon palette by node id
  const nodeColor = (id: string): string => {
    switch (id) {
      case 'ltl_pallets': return '#2ED4A6';
      case 'parcel_pallets': return '#5BC0F8';
      case 'total_parcels': return '#7C5CFF';
      case 'big_bulky': return '#B46BFF';
      case 'remaining_parcels': return '#FFB020';
      default: return '#7DD3FC';
    }
  };

  // Prepare chart data with stable colors
  const chartData = useMemo(() => {
    const nodes = sankeyData.nodes.map(node => ({
      id: node.id,
      label: node.name,
      color: nodeColor(node.id)
    }));

    const links = sankeyData.links.map(link => ({
      source: link.source,
      target: link.target,
      value: link.value,
      color: toRgba(nodeColor(link.source), 0.92)
    }));

    return { nodes, links };
  }, [sankeyData]);

  // Neon/dark styled mini Sankey
  return (
    <div style={{ width: 700, height: 210, padding: 14 }}>
      <div className="w-full rounded-xl" style={{ backgroundColor: 'transparent' }}>
        <SimpleSankeyChart data={chartData} theme={theme} />
      </div>
      {showFootnote && (
        <div className="mt-2 px-1" style={{ color: 'var(--text-2)', fontSize: Math.round(12 * FONT_SCALE) }}>
          {sankeyData.unitNotes}
        </div>
      )}
    </div>
  );
};

// Simple SVG Sankey implementation
interface SimpleSankeyChartProps {
  data: {
    nodes: Array<{ id: string; label: string; color: string }>;
    links: Array<{ source: string; target: string; value: number; color: string }>;
  };
  theme: ReturnType<typeof getSankeyTheme>;
}

const SimpleSankeyChart: React.FC<SimpleSankeyChartProps> = ({ data, theme }) => {
  const width = 520; // inner drawing width; leave right margin for labels
  const height = 140; // leave room for footnote outside
  const nodeWidth = 14; // slimmer nodes per spec
  const nodePadding = 28; // increased spacing
  const nodeHeight = 20;

  // Calculate node positions (4 columns)
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number; height: number }> = {};
    const columns = [
      ['lane'],
      ['ltl_pallets', 'parcel_pallets'],
      ['total_parcels'],
      ['big_bulky', 'remaining_parcels']
    ];

    columns.forEach((column, colIndex) => {
      const x = (colIndex * (width - nodeWidth)) / (columns.length - 1);
      const totalHeight = column.length * nodeHeight + (column.length - 1) * nodePadding;
      const startY = Math.max(0, (height - totalHeight) / 2);

      column.forEach((nodeId, nodeIndex) => {
        const y = startY + nodeIndex * (nodeHeight + nodePadding);
        positions[nodeId] = { x, y, height: nodeHeight };
      });
    });

    return positions;
  }, [height, width, nodePadding, nodeWidth]);

  const labelColor = 'var(--text-1)';
  const labelFont = `${Math.round(12 * FONT_SCALE)}px`;
  const edgeLabelFont = `${Math.round(11 * FONT_SCALE)}px`;

  return (
    <svg width={width} height={height} className="overflow-visible" style={{ background: 'transparent' }}>
      {/* Links */}
      {data.links.map((link, index) => {
        const sourcePos = nodePositions[link.source];
        const targetPos = nodePositions[link.target];
        if (!sourcePos || !targetPos) return null;

        const x1 = sourcePos.x + nodeWidth;
        const y1 = sourcePos.y + sourcePos.height / 2;
        const x2 = targetPos.x;
        const y2 = targetPos.y + targetPos.height / 2;

        // Curveness similar to ECharts: place control points along the line
        const dx = x2 - x1;
        const c = 0.52; // smoother curve per spec
        const cx1 = x1 + dx * c;
        const cy1 = y1;
        const cx2 = x2 - dx * c;
        const cy2 = y2;
        const path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

        return (
          <path
            key={index}
            d={path}
            stroke={link.color}
            strokeWidth={Math.max(3, Math.sqrt(link.value) * 0.6)}
            fill="none"
            opacity={0.92}
            style={{
              filter: `drop-shadow(8px 2px 8px rgba(0,0,0,0.35))`,
              mixBlendMode: 'lighten'
            }}
          />
        );
      })}

      {/* Nodes */}
      {data.nodes.map((node) => {
        const pos = nodePositions[node.id];
        if (!pos) return null;

        return (
          <g key={node.id}>
            <rect
              x={pos.x}
              y={pos.y}
              width={nodeWidth}
              height={pos.height}
              fill={node.color}
              rx={6}
              stroke="var(--brd-2)"
              strokeWidth={1}
              style={{ filter: `drop-shadow(0 2px ${theme.itemStyle.shadowBlur}px ${theme.itemStyle.shadowColor})` }}
            />
            {node.id !== 'lane' && (
              <text
                x={pos.x + nodeWidth + 8}
                y={pos.y + pos.height / 2}
                dy="0.35em"
                fill={labelColor}
                fontSize={labelFont}
                fontWeight={500}
              >
                {node.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Edge labels (values) */}
      {data.links.map((link, index) => {
        const sourcePos = nodePositions[link.source];
        const targetPos = nodePositions[link.target];
        if (!sourcePos || !targetPos) return null;

        // Show only for: parcel_pallets→total_parcels, total_parcels→(big_bulky|remaining_parcels)
        const isConversion = link.source === 'parcel_pallets' && link.target === 'total_parcels';
        const isRightSplit = link.source === 'total_parcels' && (link.target === 'big_bulky' || link.target === 'remaining_parcels');
        const isLeftSmall = link.source === 'lane';
        const SHOW_EDGE_LABEL_MIN = 50;
        const show = !isLeftSmall && (isConversion || isRightSplit) && link.value >= SHOW_EDGE_LABEL_MIN;
        if (!show) return null;

        const x = (sourcePos.x + nodeWidth + targetPos.x) / 2;
        const y = (sourcePos.y + sourcePos.height / 2 + targetPos.y + targetPos.height / 2) / 2;

        return (
          <text
            key={`value-${index}`}
            x={x}
            y={y}
            dy="0.35em"
            fill="var(--text-1)"
            fontSize={edgeLabelFont}
            fontWeight={600}
            textAnchor="middle"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
          >
            {Intl.NumberFormat('en-US').format(link.value)}
          </text>
        );
      })}
    </svg>
  );
};
