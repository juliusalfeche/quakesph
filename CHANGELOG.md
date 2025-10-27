# 🪵 Changelog

All notable changes to this project will be documented in this file.  
This project adheres to [Semantic Versioning](https://semver.org/).

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
