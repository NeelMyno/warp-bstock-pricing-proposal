# Warp × TOMS Pricing Proposal

An interactive web application for visualizing carrier injections from TOMS origin FCs into nearby dense markets, combining parcel + LTL on the same truck.

## Features

### 🗺️ Interactive US Map
- Lower-48 US states with Albers USA projection
- Animated lanes with directional arrows
- Color-coded regions (TX/OK → Warp Green, Southeast → Cyan, Northeast → Purple, Other → Neutral)
- Click lanes to open truck configuration panel
- Hover for detailed lane metrics

### 🚛 Virtual Truck Visualization
- 30 pallet slots (2×15 layout) per truck
- Real-time slot filling (blue for parcel pallets, gray for LTL)
- Live utilization calculations
- Manual pallet controls with sliders
- "Top-off LTL to target utilization" functionality

### 📊 Interactive Controls
- Manual adjustment of parcel and LTL pallets per lane
- Global configuration (target utilization, pallets per truck, parcels per pallet)
- Days per week settings (1-7)
- Real-time calculations for trucks/day and utilization

### 📈 KPI Dashboard
- Editable 2024/2025 package volumes
- Live totals: daily parcels, trucks/day, average utilization
- Lane-by-lane metrics table with inline editing

### 📁 Data Management
- CSV upload with fuzzy header matching
- Auto-mapping of FC codes, destinations, parcel volumes, LTL pallets
- Export to PDF deck (cover + per-FC pages + summary)
- Export lane data to CSV

### 🎨 Modern UI
- Dark theme with Warp brand colors (#00ff33, #121212)
- Responsive design for desktop and tablet
- Smooth animations and transitions
- Accessible contrast ratios (WCAG AA)

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with custom Warp theme
- **Mapping**: D3.js + TopoJSON for US map visualization
- **Data Processing**: PapaParse for CSV handling
- **Export**: jsPDF + html2canvas for PDF generation

## Getting Started

### Prerequisites
- Node.js 16+ and npm (or yarn/pnpm)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd warp-toms-pricing-proposal
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Print/PDF Export

The app includes print-friendly CSS for generating PDF decks:

1. Click "Export Deck" to generate a multi-page PDF
2. Or use browser print (Ctrl/Cmd+P) for custom printing

## Usage Guide

### Basic Workflow

1. **View Default Data**: The app loads with seed data for 7 FCs and their lanes
2. **Explore the Map**: Click on animated lanes to see truck configurations
3. **Adjust Parameters**: Use the truck panel to modify parcel/LTL pallets
4. **Optimize Utilization**: Click "Top-off LTL to target util" to automatically fill trucks
5. **Export Results**: Generate PDF deck or CSV data export

### CSV Upload Format

The app accepts CSV files with flexible headers. It will auto-detect columns for:

- **FC/Origin**: `fc`, `origin`, `fulfillment center`, `warehouse`
- **Destination**: `dest`, `destination`, `market`, `msa`, `region`, `state`
- **Parcels/Day**: `parcels`, `packages`, `day`, `daily`, `volume`
- **LTL Pallets**: `ltl`, `pallets`, `day`, `freight`

Example CSV:
```csv
FC,Destination,Parcels Per Day,LTL Pallets Per Day
AVP,NJ,1122,5
IND,Chicago,1302,8
LAS,SoCal,1400,12
```

### Supported FC Codes
- **AVP**: Allentown, PA
- **IND**: Indianapolis, IN  
- **LAS**: Las Vegas, NV
- **SAV**: Savannah, GA
- **DFW**: Dallas, TX
- **LNK**: Lincoln, NE
- **SEA**: Seattle, WA

### Region Mappings
- **NJ/NY**: New Jersey, New York
- **Chicago/Midwest**: Illinois, Wisconsin, Michigan
- **SoCal/AZ**: California, Arizona
- **FL/Carolinas**: Florida, North Carolina, South Carolina
- **Houston/OK**: Texas, Oklahoma
- **Upper Midwest**: Minnesota, Iowa, South Dakota
- **Portland/Seattle**: Washington, Oregon

## Configuration

### Default Settings
- **Parcels per Pallet**: 30
- **Pallets per Truck**: 30 (max capacity)
- **Target Utilization**: 90%
- **Days per Week**: 7

### Calculations
- **Parcel Pallets** = ceil(parcels per day / parcels per pallet)
- **Total Pallets** = parcel pallets + LTL pallets
- **Trucks per Day** = ceil(total pallets / pallets per truck)
- **Utilization** = total pallets / (trucks per day × pallets per truck)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Accessibility

- WCAG AA contrast ratios
- Keyboard navigation support
- Screen reader friendly
- Focus indicators
- Semantic HTML structure

## License

This project is proprietary to Warp and TOMS.
