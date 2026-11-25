# 🪵 Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

---

## [3.0.0] - 2026-11-25
### 🌟 Major Release — *“A full rebuild: fixed map, flat dark design, hardened code”*

### 🗺️ Map
- **Fixed the “API KEY REQUIRED” watermark.** CARTO now requires an API key for its free basemaps. QuakesPH now uses key-free **Esri Dark Gray**, **Esri Satellite** and **OpenStreetMap** tiles instead.
- Removed the Google Maps tile option (it used an unofficial endpoint that breaks Google's terms).
- Added the required map **attributions** (they were hidden before).
- The map no longer jumps to the latest quake every minute while you are exploring it.
- Plate boundary data trimmed from 226 KB to 24 KB; it is now a simple on/off toggle.

### 🎨 Design
- New flat, minimal dark design with the same palette as the DLBB forum (red `#d32f2f` on `#121212`).
- New summary tiles (quake count, strongest, latest), segmented filters, and a clean list instead of a wide table.
- New logo, app icons (including an Android maskable icon) and social cover image.
- Times are shown in Philippine Time (PHT), with “x min ago” next to each quake.
- Location is now requested only when you tap **Show my distance**, not on page load.

### 🔒 Security
- Fixed a **cross-site scripting (XSS) risk**: place names from outside servers were inserted as HTML. Everything is now inserted as plain text, and links are only allowed to USGS over https.
- Added a strict **Content Security Policy**.
- Leaflet is now **pinned to version 1.9.4 with an integrity hash** (it used to load “latest” from unpkg, which could break or change at any time).
- Removed Font Awesome (an external dependency); icons are now inline SVG.
- Removed the code that blocked right-click and F12 (it did not add security and hurt accessibility).

### 🐛 Fixes
- Quakes with a missing magnitude no longer break the whole list.
- If one data source is down, the other still works and a notice explains it. If both are down, a clear message and a “Try again” button appear.
- Slow requests now time out after 15 seconds; refreshing pauses while the tab is hidden.
- Magnitude ranges no longer skip values such as 4.95.
- The service worker no longer re-registers on every page load, and no longer depends on the `/quakesph/` folder name.
- Keyboard and screen-reader support: list rows are real buttons, with focus outlines and a skip link.

### 📁 Project
- Files are now organised into `assets/` (css, js, data, icons, images).
- The code is split into small modules, and a test suite was added (`npm test`).

---

## [2.0.0] - 2025-11-24
### 🌟 Major Release — *“QuakesPH v2.0: Dual Source Data”*

This is a major architectural release focused on data completeness. The most significant change is the integration of a **dual data source** to provide a more comprehensive view of seismic activity, especially for smaller quakes.

---

### 🌐 Data & Architecture
- **Dual Data Source Integration:** Added **EMSC-CSEM / Seismic Portal** data to supplement the primary **USGS Earthquake API** feed.
- **Enhanced Coverage:** Quakes of magnitude **M0.0 to M3.9** are now included when the filter is set to "All Magnitudes," greatly increasing the density of seismic data.
- **Data Deduplication:** Implemented custom logic to cross-reference and **filter out duplicate earthquake events** reported by both USGS and EMSC, ensuring a clean and reliable dataset.
- **Improved Filtering:** Magnitude filters now support a wider range, accurately reflecting data availability (e.g., M0-M10).

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
