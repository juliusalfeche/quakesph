# 🪵 Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

---

## [2.0.0] - 2025-11-24
### 🌟 Major Release — *“QuakesPH v2.0: Dual Source Data & Enhanced UX”*

This is a major architectural release focused on data completeness, redundancy, and user experience. The most significant change is the integration of a **dual data source** to provide a more comprehensive view of seismic activity, especially for smaller quakes.

---

### 🌐 Data & Architecture
- **Dual Data Source Integration:** Added **EMSC-CSEM / Seismic Portal** data to supplement the primary **USGS Earthquake API** feed.
- **Enhanced Coverage:** Quakes of magnitude **M0.0 to M3.9** are now included when the filter is set to "All Magnitudes," greatly increasing the density of seismic data.
- **Data Deduplication:** Implemented custom logic to cross-reference and **filter out duplicate earthquake events** reported by both USGS and EMSC, ensuring a clean and reliable dataset.
- **Improved Filtering:** Magnitude filters now support a wider range, accurately reflecting data availability (e.g., M0-M10).

### 🗺️ Map & Visualization
- **Persistent Boundary Layers:** Explicitly added and managed **Tectonic Plate Boundaries** and **Philippine Search Bounds** as map layers, visible at higher zoom levels (zoom $\ge 4$). 

[Image of Philippine tectonic plates]

- **Latest Quake Focus:** The map now uses `flyTo` animation to focus on the latest earthquake upon initial load and filter changes.
- **Enhanced Animation:** The latest quake marker is highlighted with a **blinking effect** (`.blinking-marker`).

### 🎨 User Interface & Performance
- **Optimized Dark Mode:** Implemented a refined dark theme with **blurred/transparent UI backgrounds** and better contrast for controls and tables.
- **Performance:** Implemented robust **Service Worker update logic** (using `SKIP_WAITING` messages) to ensure the PWA updates instantly in the background.
- **Branding:** Added subtle "shake" animation to the header logo and a transparent branded background image.
- **UX Refinements:** The distance-to-quake display is now animated with a **blinking text effect** to draw immediate attention.

> *“Comprehensive, reliable, and faster than ever — tracking the full picture of the Earth’s movement.”*

---

## [1.1.0] - 2025-10-28
### 🚀 Update — *“QuakesPH v1.1: Geolocation & Performance”*

This update introduces **user geolocation**, the ability to calculate the distance to the nearest quake, and key architectural performance enhancements.

---

### 📍 User Geolocation & Nearest Quake
- Added **user location marker** with pulsing animation on the map.
- Computes and displays the **distance and magnitude** of the latest quake to the user dynamically.
- Implemented an **animated dashed line** connecting the user to the latest quake on the map.

### 🎨 Enhanced Visualization & UI
- Magnitude values in table and nearest quake display are now **color-coded** according to severity.
- Table magnitude values are formatted to **one decimal place** (`toFixed(1)`).
- Markers are now **smoothly faded in** after the map fly-to animation completes.

### 🗺️ Map Improvements
- User location integrates smoothly with map navigation.
- Map **fly-to animation** focuses on the latest quake.
- Marker blinking animation retained for most recent quake.
- Centered the **user location marker icon** correctly on its coordinates.

### ⚙️ Performance & Optimization
- Refined earthquake data loading with **`AbortController`** to cancel outdated requests, improving filter responsiveness.
- Improved dark/light mode handling to sync marker and legend colors dynamically.
- Added **`aria-live`** attributes for improved screen reader accessibility of dynamic status updates.

> *“Stay aware of your surroundings — now with personalized quake info!”*

---

## [1.0.0] - 2025-10-27
### 🎉 Initial Release — *“QuakesPH v1.0”*

This is the first public release of **QuakesPH**, a Progressive Web App (PWA) for real-time earthquake tracking across the Philippines.

---

### 🌍 Core Features
- Real-time **earthquake data** fetching from **USGS Earthquake API**.
- Auto-refresh every **60 seconds** with live updates.
- Displays key quake details: **magnitude, depth, location, and timestamp**.

### 🗺️ Interactive Map
- Built using **Leaflet.js** with smooth animations and transitions.
- Color-coded **circle markers** representing quake magnitudes.
- Clickable map markers and table rows for interactive navigation.

### 🧩 Filters & Controls
- Filter earthquakes by:
  - **Magnitude:** All, 4+, 5+, 6+, 7+
  - **Time Period:** Last Hour, Day, Week, Month
- Change basemap view (CARTO Light/Dark, Google Hybrid, OSM).

### 🌗 Dark / Light Mode
- Automatic theme detection.
- Dynamically updates map tiles, table styling, and markers.

### 🧭 Geographic Overlays
- Displays **Philippine boundaries** and **tectonic plate layers**.
- Auto-adjusts visibility based on zoom level.

### 📊 Earthquake Table
- Responsive, scrollable list of filtered earthquakes.
- Clickable rows center the corresponding quake on the map.
- Displays total quake count.

### 📱 Progressive Web App (PWA)
- Offline support via **Service Worker**.
- Installable through **Web App Manifest**.
- Works as a standalone app on desktop and mobile.

### ⚙️ Performance & Optimization
- Efficient data updates and caching.
- Lightweight, responsive, and mobile-first design.
- Smooth animations for quake markers and logo effects.

> *“Made with ❤️ in the Philippines — Stay safe, stay informed.”*