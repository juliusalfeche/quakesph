# 🌋 QuakesPH

**QuakesPH** is a **progressive web application (PWA)** that provides **real-time earthquake tracking across the Philippines**, powered by live data from the **USGS Earthquake API**.  

It features an **interactive map**, **dynamic filtering**, **offline capabilities**, and **dark/light mode** — all built for fast, mobile-first access to seismic data.

---

## 🚀 Features

### 🌍 Real-Time Earthquake Tracking
- Fetches **live data** from the [USGS Earthquake API](https://earthquake.usgs.gov/).  
- Automatically refreshes every **60 seconds**.  
- Displays key details: **magnitude, depth, location, and time**.  

### 🗺️ Interactive Earthquake Map
- Built using **Leaflet.js** for map rendering and animations.  
- **Circle markers** show quake locations, color-coded and sized by magnitude.  
- Clickable rows in the table zoom into the corresponding map marker.  

### 🧩 Dynamic Filters
- **Magnitude:** All, 4+, 5+, 6+, 7+  
- **Time Period:** Last Hour, Day, Week, Month  
- **Basemap:** CARTO Light/Dark, Google Hybrid, OpenStreetMap  

### 🌗 Automatic Dark/Light Mode
- Detects system preference.  
- Dynamically adjusts:
  - Map theme  
  - Table and UI colors  
  - Marker visibility and contrast  

### 📊 Earthquake Data Table
- Scrollable, responsive table listing all filtered quakes.  
- Clickable rows to center the map view.  
- Displays total quake count for current filters.  

### 📱 Progressive Web App (PWA)
- Fully installable on Android, iOS, and desktop.  
- **Offline support** via Service Worker caching:
  - HTML, CSS, JS, icons, and recent API responses.  
- Launches in **standalone app mode** with app manifest.

### ⚡ Performance & Optimization
- Uses `AbortController` to prevent duplicate fetches.  
- Auto-refresh every 60 seconds with smooth transitions.  
- Lightweight and fast — optimized for mobile and low network conditions.
