# 🌋 QuakesPH | Philippine Earthquake Tracker

**QuakesPH** is a **progressive web application (PWA)** that provides **real-time earthquake tracking across the Philippines**, powered by live data from multiple global seismic sources.

It features **personalized location tracking** (distance to the nearest quake!), an **interactive map**, **dynamic filtering**, **offline capabilities**, and **automatic dark/light mode** — all built for fast, mobile-first access to seismic data.

---

## 🚀 Features

### ✨ Dual Source Data Integration
To provide the most comprehensive picture of seismic activity, QuakesPH intelligently combines data from two major international sources, with logic to filter out duplicates:
* **Primary Data:** **USGS Earthquake API** (United States Geological Survey)
* **Supplemental Data:** **EMSC-CSEM / Seismic Portal** (European-Mediterranean Seismological Centre)

### 📍 Personalized Location Tracking
- Uses **browser geolocation** to find your current position.
- Calculates and displays the **distance in kilometers** to the latest recorded earthquake, highlighted by a **blinking text effect**.
- Shows your location on the map with a **pulsing blue marker** (`@keyframes pulse`).
- Renders an **animated dashed path** connecting you to the latest quake for clear visualization (`@keyframes dash-animation`).

### 🌍 Real-Time Earthquake Tracking
- Fetches live, de-duplicated data from the combined sources.
- Automatically refreshes every **60 seconds**.
- Displays key details: **magnitude, depth, location, and time**.

### 🗺️ Interactive Earthquake Map
- Built using **Leaflet.js** for map rendering and animations.
- **Circle markers** show quake locations, color-coded and sized by magnitude.
- **Visual magnitude legend** with descriptive terms: **Light** (M4), **Moderate** (M5), **Strong** (M6), and **Major** (M7+).
- **Animated Map Updates:** The map automatically **flies to the latest quake** upon load or filter change, and the **latest marker blinks** to draw attention.
- **Dynamic Layers:**
    * **Tectonic Plate Boundaries** 

[Image of Philippine tectonic plates]
 are displayed when zoomed in, providing educational context on seismic risk.
    * **Philippine Search Bounds** are visibly rendered as a dashed line at higher zoom levels.
- Clickable rows in the table zoom into the corresponding map marker.

### 🧩 Dynamic Filters
- **Magnitude:** All (includes M0+ via EMSC), M4+, M5+, M6+, M7+
- **Time Period:** Last Hour, Day, Week, Month
- **Basemap:** Select from **CARTO Maps** (Auto Dark/Light), **Google Maps** (Hybrid), or **OpenStreetMap**.

### 🌗 Automatic Dark/Light Mode
- **System Preference Detection:** Automatically detects and respects the user's operating system dark/light preference.
- **Enhanced Dark Theme:** Provides a high-contrast dark theme with features like:
    * **Blurred/Transparent UI elements** (tables, controls) for a modern, focused look.
    * **Dynamically color-coded markers** and map themes that adjust for dark backgrounds.

### 📊 Earthquake Data Table
- Scrollable, responsive table listing all filtered quakes.
- Clickable rows to center the map view.
- Displays total quake count for current filters.
- Links provided directly to the source agency (USGS) for detailed information where available.

### 📱 Progressive Web App (PWA)
- Fully installable on Android, iOS, and desktop.
- **Offline support** via Service Worker caching.
- Includes robust logic for **managing PWA updates** to ensure the latest version is always used.
- Launches in **standalone app mode** with app manifest.

### ⚡ Performance & Optimization
- **Efficient Data Cancellation:** Uses **`AbortController`** to cancel outdated fetch requests, significantly improving performance when quickly switching filters.
- **Optimized for Mobile:** Fully responsive UI, ensuring fast, seamless experience across all devices (mobile, tablet, desktop).
- **Subtle Branding:** Includes a **subtle "shake" animation** on the logo and a branded background texture.

---

## 🔗 Connect

You can follow or contribute to **QuakesPH** on:
* [**GitHub**](https://github.com/juliusalfeche/quakesph)
* [**Facebook**](https://www.facebook.com/quakesph)

---

## ⚠️ Disclaimer

The information provided by **QuakesPH** is for **educational and informational purposes only**. While I strive to provide accurate and up-to-date earthquake data, I **do not guarantee the completeness, reliability, or timeliness** of the information.

**QuakesPH primarily focuses on earthquakes of magnitude 4.0 and above** (as sourced from the USGS Earthquake API), but also includes smaller events (M0.0+) through the EMSC-CSEM source for completeness when filtered. It is **not a substitute for official warnings or advice** from local authorities, emergency services, or the **Philippine Institute of Volcanology and Seismology (PHIVOLCS)**. Users should **always follow official guidance and take necessary precautions** in the event of seismic activity.

By using this service, you acknowledge that **QuakesPH is not responsible for any loss, injury, or damage** resulting from the use or reliance on the information provided.