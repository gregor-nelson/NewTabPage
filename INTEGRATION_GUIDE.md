# Weather Widget Integration Guide

## ⚠️ IMPORTANT: READ FIRST - DO NOT START CODING YET! ⚠️

**STOP!** Before writing any integration code, you **MUST** complete a thorough review of:

1. **The current New Tab Dashboard project structure and architecture**
2. **The source WeatherDashboard project to understand the original implementation**

This is a **MANDATORY EXPLORATION PHASE**. Jumping straight to coding without understanding the existing patterns will result in integration failures and inconsistencies.

### Step 1: Explore the Current Project (NewTabPage)

**Read and understand these files IN ORDER:**

1. **Project entry point:**
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/NewTabPage/src/main.js` - Application initialization and widget registration

2. **Widget system architecture:**
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/NewTabPage/src/components/settings/widgetManager.js` - Widget registry and lifecycle
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/NewTabPage/src/components/settings/settings.js` - Settings management

3. **Example widget implementation (REQUIRED READING):**
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/NewTabPage/src/components/finance/financial.js` - Widget component
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/NewTabPage/src/components/finance/financialDataService.js` - Data service pattern
   - These show the EXACT patterns you must follow for weather

4. **Layout system:**
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/NewTabPage/src/components/layout/layoutManager.js` - Drag/drop system (first 150 lines)
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/NewTabPage/src/components/layout/layoutStorage.js` - Position persistence

5. **UI structure:**
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/NewTabPage/src/newtab.html` - HTML structure and settings modal
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/NewTabPage/src/manifest.json` - Extension configuration

6. **Weather implementation (already created):**
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/NewTabPage/src/components/weather/weather.js`
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/NewTabPage/src/components/weather/weatherDataService.js`
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/NewTabPage/src/components/weather/weatherUtils.js`

### Step 2: Explore the Source WeatherDashboard Project

**Review the original weather dashboard to understand design decisions:**

1. **Documentation (if exists):**
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/WeatherDashboard/COMPONENT_OVERVIEW.md`
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/WeatherDashboard/README_COMPONENTS.md`
   - `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/WeatherDashboard/QUICK_REFERENCE.md`

2. **Source files:**
   - Search for weather service implementations
   - Search for API integration patterns
   - Look for utility functions that were extracted
   - Understand the original data structures

3. **Compare implementations:**
   - Note what was adapted from WeatherDashboard → NewTabPage/weather/
   - Understand why certain features were included/excluded
   - Identify any architectural patterns that should be maintained

### Step 3: Create a Todo List

After completing your exploration:
- Use the TodoWrite tool to create a task list for the integration
- Break down the 6 integration tasks into smaller steps
- Mark tasks as you complete them

### Step 4: Ask Questions (If Needed)

If anything is unclear after your exploration:
- Use the AskUserQuestion tool to clarify
- Don't make assumptions about architectural decisions
- Verify your understanding before implementing

### Workflow Summary

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: EXPLORATION (Mandatory - 15-30 minutes)           │
├─────────────────────────────────────────────────────────────┤
│  1. Read this guide completely                              │
│  2. Explore NewTabPage project structure                    │
│     → Read main.js, widgetManager.js, settings.js           │
│     → Study financial widget (PATTERN TEMPLATE)             │
│     → Understand layout system                              │
│  3. Explore WeatherDashboard source                         │
│     → Read documentation if exists                          │
│     → Find original weather implementations                 │
│  4. Review weather/ components already created              │
│  5. Create detailed todo list with TodoWrite tool           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2: INTEGRATION (6 Tasks)                             │
├─────────────────────────────────────────────────────────────┤
│  Task 1: Register weather widget in main.js                 │
│  Task 2: Add weather-container to newtab.html               │
│  Task 3: Add settings UI controls to settings modal         │
│  Task 4: Add settings handlers in settings.js               │
│  Task 5: Add API permissions to manifest.json               │
│  Task 6: Add weather CSS styles                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 3: TESTING (24-point checklist)                      │
├─────────────────────────────────────────────────────────────┤
│  • Widget visibility and settings                           │
│  • Location input (city names & coordinates)                │
│  • Weather data display and refresh                         │
│  • Drag/drop and resize functionality                       │
│  • Settings persistence                                     │
└─────────────────────────────────────────────────────────────┘
```

**REMEMBER:** The exploration phase is NOT optional. Spending time understanding the architecture will save hours of debugging and rework later!

---

## Context & Overview

You are completing the integration of a weather widget into a Chrome new tab extension located at `/mnt/c/Users/Default.DESKTOP-8TCQEDR/Downloads/Dev/NewTabPage`.

**Current Status:** The weather widget component files have been created but NOT yet integrated into the application.

## What You'll Discover During Exploration

### In the NewTabPage Project:

**Architecture you'll learn:**
- **Widget registry pattern** - How widgets self-register and get managed
- **Data service pattern** - How widgets fetch/cache API data (see financialDataService.js)
- **Settings flow** - How user settings trigger widget updates
- **Layout system** - Drag/drop with interact.js (Ctrl + Right Click)
- **Component structure** - Each widget is self-contained in its own folder

**Key patterns to observe:**
- Widgets expose: `{ displayName, defaultEnabled, containerId, init, update, cleanup, layout }`
- Data services use callbacks: `initService(onDataUpdate, settings)`
- Settings are stored in Chrome storage and loaded on startup
- Each widget can be toggled on/off independently
- Position/size persistence handled by layoutManager.js

**Existing widgets to study:**
- **Financial widget** - Best example! Has data service, caching, API integration
- **Clock/Calendar** - Simpler widgets without external APIs
- **GitHub widget** - Another API integration example

### In the WeatherDashboard Project:

**What was extracted:**
- Weather API integration (Open-Meteo API)
- Weather utility functions (formatting, conversions)
- WMO weather code mappings
- UI component structure

**What was adapted:**
- Service layer → weatherDataService.js (following financial widget pattern)
- Utilities → weatherUtils.js (extracted pure functions)
- Widget → weather.js (adapted to extension widget system)

**What was excluded:**
- Marine analysis system (not needed)
- Daily forecast (only using hourly)
- Air quality (not requested)
- Original 4-layer architecture (simplified to match extension patterns)

## Project Structure

```
NewTabPage/
├── src/
│   ├── components/
│   │   ├── calendar/
│   │   │   └── calendar.js
│   │   ├── clock/
│   │   │   └── clock.js
│   │   ├── finance/
│   │   │   ├── financial.js
│   │   │   └── financialDataService.js
│   │   ├── github/
│   │   │   ├── github.js
│   │   │   └── githubDataService.js
│   │   ├── layout/
│   │   │   ├── layoutManager.js
│   │   │   └── layoutStorage.js
│   │   ├── settings/
│   │   │   ├── settings.js
│   │   │   └── widgetManager.js
│   │   └── weather/              ✅ CREATED (not integrated)
│   │       ├── weather.js         ✅ Complete
│   │       ├── weatherDataService.js  ✅ Complete
│   │       └── weatherUtils.js    ✅ Complete
│   ├── libs/
│   │   ├── chart.min.js
│   │   ├── chartjs-adapter-date-fns.bundle.min.js
│   │   └── interact.min.js
│   ├── styles/
│   │   └── styles.css
│   ├── icons/
│   ├── phosphor-icons/
│   ├── main.js                    ❌ Needs weather import/registration
│   ├── newtab.html                ❌ Needs weather container & settings
│   ├── manifest.json              ❌ Needs Open-Meteo API permission
│   ├── background.js
│   ├── PRIVACY.md
│   └── README.md
├── dist/
│   └── newtab-extension.zip
├── scripts/
└── README.md
```

## Existing Architecture

### Widget System

**Registry Pattern** (`src/components/settings/widgetManager.js`):
- Widgets are registered with `registerWidget(id, config)`
- Each widget has a standard interface:
  ```javascript
  {
    displayName: string,
    defaultEnabled: boolean,
    containerId: string,
    init: function(settings),
    update: function(settings),
    cleanup: function(),
    layout: {
      defaultPosition: { x: string, y: string },
      defaultSize: { width: string, height: string },
      minSize: { width: number, height: number },
      resizable: boolean,
      draggable: boolean,
      dragHandle: string,
      zIndex: number
    }
  }
  ```

### Layout System

**Drag & Drop** (`src/components/layout/layoutManager.js`):
- Uses interact.js library for drag/drop and resize
- Custom layout mode: Ctrl + Right Click to drag widgets anywhere
- Widgets can be positioned, resized, and overlapped
- Positions saved to Chrome storage and persisted
- Two modes:
  - Normal grid layout (CSS grid)
  - Custom layout mode (absolute positioning, drag/drop enabled)

### Data Service Pattern

Example from `src/components/finance/financialDataService.js`:
- Initialization with callback: `initService(onDataUpdate, settings)`
- Caching strategy: localStorage with expiry timestamps
- Periodic refresh with configurable intervals
- Settings update handling
- Cleanup on widget disable

## Weather Widget Implementation (Already Done ✅)

### 1. Weather Service (`src/components/weather/weatherDataService.js`)

**Features:**
- Open-Meteo API integration (`https://api.open-meteo.com/v1/forecast`)
- 30-minute cache duration
- Fetches current conditions + 24-hour forecast
- Settings: location (lat/lon), temp unit, wind unit
- Request throttling (30 second minimum)

**API Parameters:**
- Current: temperature_2m, humidity, feels_like, weather_code, wind_speed, wind_direction, pressure
- Hourly: temperature_2m, weather_code, precipitation_probability
- Units: celsius/fahrenheit, kmh/mph/ms

### 2. Weather Utilities (`src/components/weather/weatherUtils.js`)

**Functions:**
- `getWeatherInfo(code)` - WMO code → icon & description
- `formatTemp(temp, unit)` - Temperature formatting
- `formatSpeed(speed, unit)` - Wind speed conversion
- `getWindDirection(degrees)` - Degrees → cardinal direction
- `formatPressure(pressure)` - Pressure formatting
- `formatHumidity(humidity)` - Humidity percentage
- `formatHourLabel(isoString)` - Time formatting

**Weather Codes:**
- WMO standard codes (0-99)
- Mapped to Phosphor icons: ph-sun, ph-cloud, ph-cloud-rain, ph-snowflake, ph-lightning
- Clear sky, clouds, rain, snow, thunderstorms

### 3. Weather Widget (`src/components/weather/weather.js`)

**UI Components:**
- Current weather card (location, icon, temp, feels-like, humidity, wind, pressure)
- Hourly forecast (12 hours, horizontal scroll)
- Loading state
- Error state
- No data state (when location not configured)
- Refresh button

**Layout Configuration:**
- Default position: `{ x: '55%', y: '50px' }`
- Default size: `{ width: '560px', height: '380px' }`
- Minimum size: `{ width: 450, height: 320 }`
- Resizable: true
- Draggable: true

## Integration Tasks (What Needs to Be Done)

### Task 1: Register Weather Widget in main.js

**File:** `src/main.js`

**Changes needed:**
```javascript
// Add import at top
import { weatherWidget } from './components/weather/weather.js';

// Add registration with other widgets (after line 19)
registerWidget('weather', weatherWidget);
```

### Task 2: Add Weather Container to HTML

**File:** `src/newtab.html`

**Add after GitHub widget (around line 64):**
```html
<!-- Weather Widget -->
<div id="weather-container" class="widget">
    <div class="widget-header">
        <span class="widget-title">Weather</span>
    </div>
    <!-- Weather content will be rendered by weather.js -->
</div>
```

### Task 3: Add Weather Settings to Settings Modal

**File:** `src/newtab.html` (inside settings modal, around line 86-200)

**Add before closing `</div>` of `.settings-list`:**
```html
<!-- Weather Widget Toggle -->
<div class="setting-item">
    <label class="setting-label">Weather Widget</label>
    <label class="toggle-wrapper">
        <input type="checkbox" id="weather-widget-toggle" class="toggle-input widget-toggle" data-widget="weather" checked>
        <div class="toggle-slider"></div>
    </label>
</div>

<!-- Weather Location -->
<div class="setting-item">
    <label class="setting-label">
        Weather Location
        <span class="setting-hint">Enter city name or coordinates (lat, lon)</span>
    </label>
    <input type="text" id="weather-location" class="text-input" placeholder="London or 51.5074, -0.1278">
</div>

<!-- Temperature Unit -->
<div class="setting-item">
    <label class="setting-label">Temperature Unit</label>
    <select id="temperature-unit" class="select-input">
        <option value="celsius">Celsius (°C)</option>
        <option value="fahrenheit">Fahrenheit (°F)</option>
    </select>
</div>

<!-- Wind Speed Unit -->
<div class="setting-item">
    <label class="setting-label">Wind Speed Unit</label>
    <select id="wind-speed-unit" class="select-input">
        <option value="kmh">Kilometers per Hour (km/h)</option>
        <option value="mph">Miles per Hour (mph)</option>
        <option value="ms">Meters per Second (m/s)</option>
    </select>
</div>

<!-- Weather Refresh Interval -->
<div class="setting-item">
    <label class="setting-label">Weather Refresh Interval</label>
    <select id="weather-refresh-interval" class="select-input">
        <option value="15">15 minutes</option>
        <option value="30" selected>30 minutes</option>
        <option value="60">60 minutes</option>
    </select>
</div>
```

### Task 4: Update Settings JavaScript

**File:** `src/components/settings/settings.js`

**Add to DEFAULT_SETTINGS object:**
```javascript
const DEFAULT_SETTINGS = {
    // ... existing settings

    // Weather settings
    weatherEnabled: true,
    weatherLocation: '',
    weatherLat: null,
    weatherLon: null,
    weatherLocationName: 'Unknown Location',
    temperatureUnit: 'celsius',
    windSpeedUnit: 'kmh',
    weatherRefreshInterval: 30,
};
```

**Add to setupEventListeners() function:**
```javascript
// Weather location input
const weatherLocationInput = document.getElementById('weather-location');
if (weatherLocationInput) {
    weatherLocationInput.addEventListener('change', async (e) => {
        const input = e.target.value.trim();

        if (!input) {
            currentSettings.weatherLocation = '';
            currentSettings.weatherLat = null;
            currentSettings.weatherLon = null;
            currentSettings.weatherLocationName = 'Unknown Location';
            saveSettings(currentSettings);
            return;
        }

        // Check if input is coordinates (lat, lon)
        const coordPattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;
        const match = input.match(coordPattern);

        if (match) {
            // User entered coordinates
            currentSettings.weatherLat = parseFloat(match[1]);
            currentSettings.weatherLon = parseFloat(match[2]);
            currentSettings.weatherLocationName = `${match[1]}, ${match[2]}`;
            currentSettings.weatherLocation = input;
        } else {
            // User entered city name - use geocoding
            try {
                const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(input)}&count=1&language=en&format=json`;
                const response = await fetch(geoUrl);
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                    const location = data.results[0];
                    currentSettings.weatherLat = location.latitude;
                    currentSettings.weatherLon = location.longitude;
                    currentSettings.weatherLocationName = location.name + (location.country ? `, ${location.country}` : '');
                    currentSettings.weatherLocation = input;
                } else {
                    alert('Location not found. Please try entering coordinates (lat, lon) instead.');
                    return;
                }
            } catch (error) {
                console.error('Geocoding error:', error);
                alert('Failed to find location. Please try entering coordinates (lat, lon) instead.');
                return;
            }
        }

        saveSettings(currentSettings);
    });
}

// Temperature unit
const temperatureUnitSelect = document.getElementById('temperature-unit');
if (temperatureUnitSelect) {
    temperatureUnitSelect.addEventListener('change', (e) => {
        currentSettings.temperatureUnit = e.target.value;
        saveSettings(currentSettings);
    });
}

// Wind speed unit
const windSpeedUnitSelect = document.getElementById('wind-speed-unit');
if (windSpeedUnitSelect) {
    windSpeedUnitSelect.addEventListener('change', (e) => {
        currentSettings.windSpeedUnit = e.target.value;
        saveSettings(currentSettings);
    });
}

// Weather refresh interval
const weatherRefreshSelect = document.getElementById('weather-refresh-interval');
if (weatherRefreshSelect) {
    weatherRefreshSelect.addEventListener('change', (e) => {
        currentSettings.weatherRefreshInterval = parseInt(e.target.value);
        saveSettings(currentSettings);
    });
}
```

**Add to populateSettings() function:**
```javascript
// Weather location
const weatherLocationInput = document.getElementById('weather-location');
if (weatherLocationInput) {
    weatherLocationInput.value = settings.weatherLocation || '';
}

// Temperature unit
const temperatureUnitSelect = document.getElementById('temperature-unit');
if (temperatureUnitSelect) {
    temperatureUnitSelect.value = settings.temperatureUnit || 'celsius';
}

// Wind speed unit
const windSpeedUnitSelect = document.getElementById('wind-speed-unit');
if (windSpeedUnitSelect) {
    windSpeedUnitSelect.value = settings.windSpeedUnit || 'kmh';
}

// Weather refresh interval
const weatherRefreshSelect = document.getElementById('weather-refresh-interval');
if (weatherRefreshSelect) {
    weatherRefreshSelect.value = settings.weatherRefreshInterval || 30;
}
```

### Task 5: Add API Permissions to Manifest

**File:** `src/manifest.json`

**Update description to include weather:**
```json
"description": "Clean new tab page with digital clock, calendar, markets, GitHub stats, and weather. No tracking, no clutter.",
```

**Add to host_permissions array:**
```json
"host_permissions": [
    "https://query1.finance.yahoo.com/*",
    "https://query2.finance.yahoo.com/*",
    "https://api.github.com/*",
    "https://api.open-meteo.com/*",
    "https://geocoding-api.open-meteo.com/*"
],
```

### Task 6: Add Weather Styles

**File:** `src/styles/styles.css` or create `src/styles/weather.css`

**Add weather-specific styles:**
```css
/* Weather Widget */
.weather-widget {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
}

.weather-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
    flex: 1;
}

/* Current Weather */
.weather-current {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.weather-location {
    font-size: 0.875rem;
    color: #a3a3a3;
    font-weight: 500;
}

.weather-main {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.weather-icon-large {
    font-size: 4rem;
    color: #fbbf24;
}

.weather-temp-main {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.weather-temp-large {
    font-size: 3rem;
    font-weight: 300;
    line-height: 1;
}

.weather-description {
    font-size: 1rem;
    color: #a3a3a3;
    font-weight: 400;
}

.weather-details {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    margin-top: 0.5rem;
}

.weather-detail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #d4d4d4;
}

.weather-detail-item i {
    font-size: 1.25rem;
    color: #a3a3a3;
}

/* Hourly Forecast */
.weather-hourly {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.weather-hourly-title {
    font-size: 0.875rem;
    color: #a3a3a3;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.weather-hourly-scroll {
    display: flex;
    gap: 0.75rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
}

.weather-hourly-scroll::-webkit-scrollbar {
    height: 6px;
}

.weather-hourly-scroll::-webkit-scrollbar-track {
    background: #262626;
    border-radius: 3px;
}

.weather-hourly-scroll::-webkit-scrollbar-thumb {
    background: #404040;
    border-radius: 3px;
}

.weather-hourly-scroll::-webkit-scrollbar-thumb:hover {
    background: #525252;
}

.weather-hour-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #1a1a1a;
    border-radius: 0.5rem;
    min-width: 70px;
    flex-shrink: 0;
}

.weather-hour-time {
    font-size: 0.75rem;
    color: #a3a3a3;
    font-weight: 500;
}

.weather-hour-icon {
    font-size: 1.5rem;
    color: #fbbf24;
}

.weather-hour-temp {
    font-size: 0.875rem;
    font-weight: 500;
}

.weather-hour-precip {
    font-size: 0.75rem;
    color: #60a5fa;
}

.weather-hour-precip-empty {
    height: 1rem;
}

/* Widget Refresh Button */
.widget-refresh-btn {
    background: none;
    border: none;
    color: #a3a3a3;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
}

.widget-refresh-btn:hover {
    color: #f5f5f5;
}

.widget-refresh-btn i {
    font-size: 1.25rem;
}

/* Loading State */
.weather-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem;
    color: #a3a3a3;
}

.weather-spinner {
    font-size: 2rem;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* Error State */
.weather-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 3rem;
    color: #ef4444;
}

.weather-error i {
    font-size: 2.5rem;
}

.weather-error-message {
    font-size: 0.875rem;
    font-weight: 500;
}

.weather-error-hint {
    font-size: 0.75rem;
    color: #a3a3a3;
}

/* No Data State */
.weather-no-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 3rem;
    color: #a3a3a3;
}

.weather-no-data i {
    font-size: 2.5rem;
}

/* Widget Header Enhancement */
.widget-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
}

.widget-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #a3a3a3;
}

.widget-title i {
    font-size: 1.25rem;
}
```

**If creating separate file `src/styles/weather.css`, add to `newtab.html`:**
```html
<link rel="stylesheet" href="styles/weather.css">
```

## Testing Checklist

After integration, test the following:

- [ ] Weather widget appears on new tab page
- [ ] Weather widget can be toggled on/off in settings
- [ ] Location input accepts city names (e.g., "London")
- [ ] Location input accepts coordinates (e.g., "51.5074, -0.1278")
- [ ] Geocoding converts city names to coordinates
- [ ] Current weather displays correctly
- [ ] Temperature is shown in selected unit (C/F)
- [ ] Wind speed is shown in selected unit (km/h, mph, m/s)
- [ ] Hourly forecast displays 12 hours
- [ ] Weather icons match conditions
- [ ] Refresh button updates data
- [ ] Auto-refresh works at configured interval
- [ ] Data caches in localStorage
- [ ] Loading state appears during fetch
- [ ] Error state appears on API failure
- [ ] No data state appears when location not set
- [ ] Widget is draggable (Ctrl + Right Click)
- [ ] Widget is resizable
- [ ] Widget position persists after reload
- [ ] Settings persist after browser restart
- [ ] No console errors

## Architecture Patterns to Follow

### Widget Initialization Flow
```
main.js → registerWidget() → widgetManager.js
  ↓
initializeWidgets() → widget.init(settings)
  ↓
widget initializes data service with callback
  ↓
service fetches data (cache first, then API)
  ↓
callback updates widget UI
```

### Settings Change Flow
```
User changes setting → settings.js event handler
  ↓
saveSettings() → Chrome storage
  ↓
settingsChangeCallback() in main.js
  ↓
updateAllWidgets() → widget.update(newSettings)
  ↓
widget updates internal state and re-renders
```

### Data Service Pattern
```javascript
// 1. State management
let cache = null;
let callback = null;

// 2. Initialize with callback
export function initService(onDataUpdate, settings) {
    callback = onDataUpdate;
    // Load cache immediately
    const cached = getCached();
    if (cached) callback(cached);
    // Fetch fresh data
    fetchData();
}

// 3. Fetch and cache
async function fetchData() {
    const data = await fetch(API_URL);
    cache = data;
    setCached(data);
    if (callback) callback(data);
}

// 4. Cleanup
export function cleanupService() {
    callback = null;
}
```

## Important Notes

- **No drag/drop implementation needed** - Already exists via layoutManager.js
- **Follow existing patterns** - Match style of financial.js and financialDataService.js
- **Error handling** - Network failures, invalid locations, API rate limits
- **Caching** - Aggressive caching (30 min) to respect API limits
- **Loading states** - Always show loading/error/empty states
- **Settings validation** - Validate location input before saving
- **Geocoding** - Use Open-Meteo Geocoding API for city name → coordinates
- **Privacy** - No tracking, all data stored locally
- **Icons** - Use Phosphor icons (already included)

## External Resources

- **Open-Meteo API Docs:** https://open-meteo.com/en/docs
- **Open-Meteo Geocoding:** https://open-meteo.com/en/docs/geocoding-api
- **WMO Weather Codes:** https://open-meteo.com/en/docs#weathervariables
- **Phosphor Icons:** https://phosphoricons.com
- **interact.js Docs:** https://interactjs.io

## Next Steps - CRITICAL WORKFLOW

### Phase 1: Exploration (MANDATORY - Do NOT skip!)

1. **Read this entire guide** from top to bottom
2. **Explore NewTabPage project:**
   - Read all files listed in "Step 1: Explore the Current Project" section above
   - Pay special attention to the financial widget (it's the pattern template)
   - Understand the widget lifecycle: init → update → cleanup
   - Understand how settings flow through the system
3. **Explore WeatherDashboard project:**
   - Read documentation files if they exist
   - Search for weather-related source files
   - Understand what was extracted and adapted
4. **Compare weather implementation:**
   - Read the three weather files in src/components/weather/
   - Compare to financial widget pattern
   - Verify it follows the same patterns
5. **Create a Todo List:**
   - Use TodoWrite tool to plan your work
   - Break down the 6 tasks into smaller sub-tasks
   - Include testing in your todo list

### Phase 2: Integration (Only after Phase 1 is complete!)

6. Complete Task 1: Register widget in main.js
7. Complete Task 2: Add HTML container
8. Complete Task 3: Add settings UI controls
9. Complete Task 4: Update settings.js logic
10. Complete Task 5: Update manifest.json permissions
11. Complete Task 6: Add CSS styles

### Phase 3: Testing & Validation

12. Test all functionality from checklist (24 items)
13. Check console for errors
14. Test widget drag/drop and resize
15. Test settings persistence across browser restarts
16. Build extension and load in Chrome for final testing

### Important Reminders

- **DO NOT rush into coding** - Understanding the architecture is critical
- **Follow existing patterns exactly** - Consistency prevents bugs
- **Test incrementally** - Don't wait until the end to test
- **Ask questions if unclear** - Better to clarify than assume

Good luck! 🚀
