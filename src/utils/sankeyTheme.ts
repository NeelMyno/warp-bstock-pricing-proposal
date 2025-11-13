// Sankey theme utilities (ECharts-style options)
// This can be reused by any renderer (ECharts, SVG, etc.)

export const FONT_SCALE = 1.15;

export const palette = ['#4CC9F0', '#38E1AE', '#A66BFF', '#FFA800', '#FF5252'];

// Stable color by node id
export function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export function toRgba(hex: string, alpha = 0.9): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Returns a fragment compatible with ECharts Sankey options
export function getSankeyTheme() {
  return {
    orient: 'horizontal' as const,
    nodeAlign: 'justify' as const,
    nodeWidth: 14,
    nodeGap: 28,
    layoutIterations: 64,
    draggable: false,
    emphasis: { focus: 'adjacency' as const },
    blendMode: 'lighter' as const,
    lineStyle: {
      curveness: 0.52,
      opacity: 0.92,
      shadowBlur: 8,
      shadowColor: 'rgba(0,0,0,0.35)'
    },
    itemStyle: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      shadowBlur: 10,
      shadowColor: 'rgba(0,0,0,0.4)',
      borderRadius: 6
    },
    label: {
      color: '#EAEFF7',
      fontSize: Math.round(12 * FONT_SCALE),
      fontWeight: 500
    },
    edgeLabel: {
      show: true,
      color: '#FFFFFF',
      fontSize: Math.round(11 * FONT_SCALE),
      fontWeight: 600,
      formatter: ({ value }: any) => value
    },
    backgroundColor: 'transparent'
  };
}

