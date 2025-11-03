// ============================================
// TIDES WIDGET - Fully Independent Module
// Safe to delete without affecting other widgets
// ============================================

import {
    getTideData,
    initTideService,
    cleanupTideService,
    getLastFetchTime
} from './tidesDataService.js';

import {
    renderTideChart,
    destroyChart
} from './tidesChart.js';

// ---- PRIVATE STATE (scoped to this module only) ----
let tidesState = {
    currentReading: null,
    nextHigh: null,
    nextLow: null,
    stationName: null,
    unit: 'mAOD',
    chart: null,
    updateInterval: null,
    stationId: null,
    isLoading: false,
    hasError: false
};

// ---- WIDGET CONFIGURATION ----
export const tidesWidget = {
    displayName: 'Tides',
    defaultEnabled: true,
    containerId: 'tides-container',
    init: initTides,
    update: updateTides,
    cleanup: cleanupTides,

    layout: {
        defaultPosition: { x: '10%', y: '400px' },
        defaultSize: { width: '450px', height: '420px' },
        minSize: { width: 350, height: 320 },
        resizable: true,
        draggable: true,
        dragHandle: '.widget-header',
        zIndex: 4
    }
};

// ---- INITIALIZATION ----
async function initTides(settings) {
    console.log('Tides Widget: Initializing');

    // Extract tide-specific settings
    const tidesSettings = {
        stationId: settings.tidesStationId || 'E70739', // Aberdeen (EA station)
        ukhoStationId: settings.tidesUkhoStationId || '0244', // Aberdeen (UKHO station)
        ukhoKey: settings.tidesUkhoKey || '',
        refreshInterval: settings.tidesRefreshInterval || 15 // minutes
    };

    tidesState.stationId = tidesSettings.stationId;

    console.log('Tides Widget: Using station ID:', tidesState.stationId);

    // Initialize data service
    await initTideService(tidesSettings);

    // Render initial UI
    renderTidesWidget();

    // Show loading state
    showLoading();

    // Fetch initial data
    await refreshTideData();

    // Start auto-refresh
    startAutoRefresh(tidesSettings.refreshInterval);

    console.log('Tides Widget: Initialized successfully');
}

// ---- UPDATE (when settings change) ----
async function updateTides(settings) {
    console.log('Tides Widget: Updating with new settings');

    const tidesSettings = {
        stationId: settings.tidesStationId || tidesState.stationId,
        ukhoStationId: settings.tidesUkhoStationId || '0244', // Aberdeen
        ukhoKey: settings.tidesUkhoKey || '',
        refreshInterval: settings.tidesRefreshInterval || 15
    };

    // Only re-init if station changed
    if (tidesSettings.stationId !== tidesState.stationId) {
        await cleanupTides();
        await initTides(settings);
    } else {
        // Just refresh data
        await refreshTideData();
    }
}

// ---- CLEANUP (called when widget disabled or app closes) ----
function cleanupTides() {
    console.log('Tides Widget: Cleaning up');

    // Clear intervals
    if (tidesState.updateInterval) {
        clearInterval(tidesState.updateInterval);
        tidesState.updateInterval = null;
    }

    // Destroy chart if exists
    if (tidesState.chart) {
        destroyChart(tidesState.chart);
        tidesState.chart = null;
    }

    // Cleanup data service
    cleanupTideService();

    // Clear state
    tidesState = {
        currentReading: null,
        nextHigh: null,
        nextLow: null,
        stationName: null,
        unit: 'mAOD',
        chart: null,
        updateInterval: null,
        stationId: null,
        isLoading: false,
        hasError: false
    };
}

// ============================================
// PRIVATE FUNCTIONS
// ============================================

/**
 * Refresh tide data from APIs
 */
async function refreshTideData() {
    console.log('Tides Widget: Refreshing data');

    tidesState.isLoading = true;
    tidesState.hasError = false;

    try {
        const data = await getTideData(tidesState.stationId);

        tidesState.currentReading = data.current;
        tidesState.nextHigh = data.nextHigh;
        tidesState.nextLow = data.nextLow;
        tidesState.stationName = data.stationName;
        tidesState.unit = data.unit;

        // Update display
        updateTidesDisplay();

        // Update chart
        updateTidesChart(data.readings);

        tidesState.isLoading = false;

        console.log('Tides Widget: Data refreshed successfully');

    } catch (error) {
        console.error('Tides Widget: Failed to fetch data', error);

        tidesState.isLoading = false;
        tidesState.hasError = true;

        displayError('Unable to load tide data. Please check your connection.');
    }
}

/**
 * Render the widget UI structure
 */
function renderTidesWidget() {
    const container = document.getElementById('tides-container');
    if (!container) {
        console.error('Tides Widget: Container not found');
        return;
    }

    container.innerHTML = `
        <div class="tides-widget">
            <!-- Station Info -->
            <div class="tides-station-selector" id="tides-station-info">
                <span class="tides-station-label">📍</span>
                <span class="tides-station-name">Loading...</span>
            </div>

            <!-- Current Tide Reading -->
            <div class="tides-current" id="tides-current">
                <div class="tides-value">--</div>
                <div class="tides-trend">Loading...</div>
            </div>

            <!-- Next High/Low Events -->
            <div class="tides-next" id="tides-next">
                <div class="tides-next-event tides-next-high">
                    <div>
                        <div class="tides-event-label">Next High</div>
                        <div class="tides-event-time" id="tides-high-time">--</div>
                    </div>
                    <div class="tides-event-height" id="tides-high-height">--</div>
                </div>

                <div class="tides-next-event tides-next-low">
                    <div>
                        <div class="tides-event-label">Next Low</div>
                        <div class="tides-event-time" id="tides-low-time">--</div>
                    </div>
                    <div class="tides-event-height" id="tides-low-height">--</div>
                </div>
            </div>

            <!-- Chart Container -->
            <div class="tides-chart-container">
                <canvas id="tides-chart"></canvas>
            </div>

            <!-- Status Bar -->
            <div class="tides-status" id="tides-status">
                <div class="tides-last-update">
                    <span class="tides-status-icon" id="tides-status-icon"></span>
                    <span id="tides-status-text">Ready</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Show loading state
 */
function showLoading() {
    const statusIcon = document.getElementById('tides-status-icon');
    const statusText = document.getElementById('tides-status-text');

    if (statusIcon) {
        statusIcon.className = 'tides-status-icon loading';
    }

    if (statusText) {
        statusText.textContent = 'Loading...';
    }
}

/**
 * Update the tide display with current data
 */
function updateTidesDisplay() {
    // Update station name
    const stationInfo = document.getElementById('tides-station-info');
    if (stationInfo && tidesState.stationName) {
        stationInfo.querySelector('.tides-station-name').textContent = tidesState.stationName;
    }

    // Update current reading
    const currentEl = document.getElementById('tides-current');
    if (currentEl && tidesState.currentReading) {
        const value = tidesState.currentReading.value;
        const trend = tidesState.currentReading.trend;

        const valueEl = currentEl.querySelector('.tides-value');
        const trendEl = currentEl.querySelector('.tides-trend');

        if (valueEl) {
            valueEl.textContent = `${value.toFixed(2)} ${tidesState.unit}`;
        }

        if (trendEl) {
            trendEl.textContent = trend.text;
            trendEl.className = `tides-trend ${trend.direction}`;
        }
    }

    // Update next high
    if (tidesState.nextHigh) {
        const timeEl = document.getElementById('tides-high-time');
        const heightEl = document.getElementById('tides-high-height');

        if (timeEl) {
            const time = formatTime(tidesState.nextHigh.time);
            const countdown = formatCountdown(tidesState.nextHigh.time);
            timeEl.textContent = `${time} • ${countdown}`;
        }

        if (heightEl) {
            heightEl.textContent = `${tidesState.nextHigh.height.toFixed(2)} ${tidesState.unit}`;
        }
    }

    // Update next low
    if (tidesState.nextLow) {
        const timeEl = document.getElementById('tides-low-time');
        const heightEl = document.getElementById('tides-low-height');

        if (timeEl) {
            const time = formatTime(tidesState.nextLow.time);
            const countdown = formatCountdown(tidesState.nextLow.time);
            timeEl.textContent = `${time} • ${countdown}`;
        }

        if (heightEl) {
            heightEl.textContent = `${tidesState.nextLow.height.toFixed(2)} ${tidesState.unit}`;
        }
    }

    // Update status
    updateStatus();
}

/**
 * Update the chart with readings
 */
function updateTidesChart(readings) {
    const canvas = document.getElementById('tides-chart');
    if (!canvas) return;

    // Destroy previous chart
    if (tidesState.chart) {
        destroyChart(tidesState.chart);
        tidesState.chart = null;
    }

    // Render new chart
    if (readings && readings.length > 0) {
        tidesState.chart = renderTideChart(canvas, readings, {
            unit: tidesState.unit,
            datasetOptions: {}
        });
    }
}

/**
 * Update status indicator
 */
function updateStatus() {
    const statusIcon = document.getElementById('tides-status-icon');
    const statusText = document.getElementById('tides-status-text');

    if (!statusIcon || !statusText) return;

    const lastFetch = getLastFetchTime();

    if (lastFetch) {
        const timeAgo = formatTimeAgo(lastFetch);
        statusIcon.className = 'tides-status-icon';
        statusText.textContent = `Updated ${timeAgo}`;
    } else {
        statusIcon.className = 'tides-status-icon';
        statusText.textContent = 'No data';
    }
}

/**
 * Start auto-refresh interval
 */
function startAutoRefresh(intervalMinutes) {
    // Clear existing interval
    if (tidesState.updateInterval) {
        clearInterval(tidesState.updateInterval);
    }

    // Set new interval
    tidesState.updateInterval = setInterval(() => {
        console.log('Tides Widget: Auto-refresh triggered');
        refreshTideData();
    }, intervalMinutes * 60 * 1000);

    console.log(`Tides Widget: Auto-refresh set to ${intervalMinutes} minutes`);
}

/**
 * Display error message
 */
function displayError(message) {
    const container = document.getElementById('tides-container');
    if (!container) return;

    container.querySelector('.tides-widget').innerHTML = `
        <div class="tides-error">
            <div class="tides-error-icon">⚠️</div>
            <div class="tides-error-message">${message}</div>
            <button class="tides-error-retry">Retry</button>
        </div>
    `;

    // Add event listener programmatically (CSP compliant)
    const retryButton = container.querySelector('.tides-error-retry');
    if (retryButton) {
        retryButton.addEventListener('click', async () => {
            renderTidesWidget();
            await refreshTideData();
        });
    }

    // Update status
    const statusIcon = document.getElementById('tides-status-icon');
    const statusText = document.getElementById('tides-status-text');

    if (statusIcon) {
        statusIcon.className = 'tides-status-icon error';
    }

    if (statusText) {
        statusText.textContent = 'Error';
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format time as HH:MM
 */
function formatTime(date) {
    return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(new Date(date));
}

/**
 * Format countdown to event
 */
function formatCountdown(targetTime) {
    const now = new Date();
    const target = new Date(targetTime);
    const diffMs = target - now;

    if (diffMs <= 0) {
        return 'now';
    }

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
        return `in ${hours}h ${mins}m`;
    } else {
        return `in ${mins}m`;
    }
}

/**
 * Format time ago
 */
function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) {
        return 'just now';
    } else if (diffMins < 60) {
        return `${diffMins}m ago`;
    } else {
        const hours = Math.floor(diffMins / 60);
        return `${hours}h ago`;
    }
}
