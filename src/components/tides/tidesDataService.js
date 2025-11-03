// ============================================
// TIDES DATA SERVICE - Independent Module
// Handles all API calls and data processing
// Safe to delete without affecting other widgets
// ============================================

// Storage keys (namespaced to avoid conflicts)
const TIDE_CACHE_KEY = 'tidesWidget.cache.v1';
const TIDE_SETTINGS_KEY = 'tidesWidget.settings.v1';

// API Endpoints
const API_EA = 'https://environment.data.gov.uk/flood-monitoring';
const UKHO_BASE = '/ukho'; // Proxy endpoint (configure in your server)

// Service state (private to this module)
let serviceState = {
    settings: null,
    lastFetch: null,
    cachedData: null,
    fetchController: null
};

/**
 * Initialize the tide data service
 * @param {Object} settings - Service settings
 * @param {string} settings.stationId - EA station ID or UKHO station ID
 * @param {string} settings.ukhoKey - UKHO API key (optional)
 * @param {number} settings.refreshInterval - Refresh interval in minutes
 */
export async function initTideService(settings) {
    console.log('TidesDataService: Initializing with settings', settings);

    serviceState.settings = settings;

    // Load cached data on init
    try {
        const cached = localStorage.getItem(TIDE_CACHE_KEY);
        if (cached) {
            const parsedCache = JSON.parse(cached);
            serviceState.cachedData = parsedCache.data;
            serviceState.lastFetch = parsedCache.timestamp ? new Date(parsedCache.timestamp) : null;
            console.log('TidesDataService: Loaded cached data from', serviceState.lastFetch);
        }
    } catch (err) {
        console.warn('TidesDataService: Failed to load cache', err);
    }

    // Save settings
    try {
        localStorage.setItem(TIDE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
        console.warn('TidesDataService: Failed to save settings', err);
    }
}

/**
 * Get tide data for a station
 * @param {string} stationId - Station identifier
 * @returns {Promise<Object>} Processed tide data
 */
export async function getTideData(stationId) {
    console.log('TidesDataService: Fetching data for station', stationId);
    console.log('TidesDataService: Current settings:', serviceState.settings);

    // Cancel any ongoing fetch
    if (serviceState.fetchController) {
        serviceState.fetchController.abort();
    }

    serviceState.fetchController = new AbortController();

    try {
        // Fetch EA observations (always available)
        const observations = await fetchEAObservations(stationId, serviceState.fetchController.signal);

        // Fetch UKHO predictions (may fail if no API key)
        let predictions = [];
        try {
            predictions = await fetchUKHOPredictions(stationId, serviceState.fetchController.signal);
        } catch (ukhoErr) {
            console.warn('TidesDataService: UKHO predictions unavailable', ukhoErr.message);
            // Continue with just observations
        }

        // Process and combine data
        const processedData = processTideData(observations, predictions);

        // Cache result
        cacheData(processedData);

        serviceState.lastFetch = new Date();

        console.log('TidesDataService: Data fetched successfully', {
            observations: observations.length,
            predictions: predictions.length
        });

        return processedData;

    } catch (error) {
        console.error('TidesDataService: Error fetching data', error);

        // Return cached data on error if available
        if (serviceState.cachedData) {
            console.log('TidesDataService: Using cached data due to fetch error');
            return serviceState.cachedData;
        }

        throw error;
    } finally {
        serviceState.fetchController = null;
    }
}

/**
 * Get available tide stations (for station picker)
 * @returns {Promise<Array>} List of tide stations
 */
export async function getTideStations() {
    try {
        const url = `${API_EA}/id/stations?type=TideGauge&_limit=100`;
        const response = await sendMessageToBackground({
            type: 'TIDES_FETCH_STATION',
            url: url
        });

        if (!response.success) {
            throw new Error(`EA API error: ${response.error}`);
        }

        const data = response.data;
        const stations = (data.items || []).map(s => ({
            id: s.notation || s.stationReference || s['@id'],
            name: s.label,
            lat: s.lat,
            lon: s.long,
            town: s.town,
            river: s.riverName
        }));

        // Sort by name
        stations.sort((a, b) => a.name.localeCompare(b.name));

        return stations;
    } catch (error) {
        console.error('TidesDataService: Failed to fetch stations', error);
        return [];
    }
}

/**
 * Cleanup the service
 */
export function cleanupTideService() {
    console.log('TidesDataService: Cleaning up');

    // Cancel any ongoing fetch
    if (serviceState.fetchController) {
        serviceState.fetchController.abort();
    }

    // Clear state
    serviceState = {
        settings: null,
        lastFetch: null,
        cachedData: null,
        fetchController: null
    };
}

/**
 * Get last fetch timestamp
 * @returns {Date|null}
 */
export function getLastFetchTime() {
    return serviceState.lastFetch;
}

// ============================================
// PRIVATE FUNCTIONS
// ============================================

/**
 * Fetch EA observations via background service worker
 */
async function fetchEAObservations(stationId, signal) {
    // Get station details first to find measure URI
    const stationUrl = `${API_EA}/id/stations/${encodeURIComponent(stationId)}`;
    const stationResponse = await sendMessageToBackground({
        type: 'TIDES_FETCH_STATION',
        url: stationUrl
    });

    if (!stationResponse.success) {
        throw new Error(`EA station API error: ${stationResponse.error}`);
    }

    const stationData = stationResponse.data;
    const station = stationData.items;

    // Log station info for debugging
    console.log('TidesDataService: Fetched station:', {
        id: stationId,
        name: station.label,
        notation: station.notation,
        lat: station.lat,
        long: station.long
    });

    // Get measures for this station
    const measuresUrl = `${API_EA}/id/stations/${encodeURIComponent(stationId)}/measures`;
    const measuresResponse = await sendMessageToBackground({
        type: 'TIDES_FETCH_MEASURES',
        url: measuresUrl
    });

    if (!measuresResponse.success) {
        throw new Error(`EA measures API error: ${measuresResponse.error}`);
    }

    const measuresData = measuresResponse.data;
    const measures = measuresData.items || [];

    // Find a suitable measure (prefer mAOD, fall back to first available)
    const measure = measures.find(m => m.unitName === 'mAOD') || measures[0];

    if (!measure) {
        throw new Error('No measures found for station');
    }

    const measureId = measure['@id'].split('/').pop();

    // Fetch today's readings
    const readingsUrl = `${API_EA}/id/measures/${encodeURIComponent(measureId)}/readings?today&_sorted`;
    const readingsResponse = await sendMessageToBackground({
        type: 'TIDES_FETCH_READINGS',
        url: readingsUrl
    });

    if (!readingsResponse.success) {
        throw new Error(`EA readings API error: ${readingsResponse.error}`);
    }

    const readingsData = readingsResponse.data;
    const readings = readingsData.items || [];

    // Add station info to readings for context
    return readings.map(r => ({
        ...r,
        stationName: station.label,
        unit: measure.unitName
    }));
}

/**
 * Fetch UKHO predictions via background service worker
 */
async function fetchUKHOPredictions(stationId, signal) {
    // Default to Aberdeen if no specific mapping
    const ukhoStationId = serviceState.settings?.ukhoStationId || '0244';

    const url = `${UKHO_BASE}/Stations/${encodeURIComponent(ukhoStationId)}/TidalEvents?duration=7`;

    const response = await sendMessageToBackground({
        type: 'TIDES_FETCH_UKHO',
        url: url
    });

    if (!response.success) {
        throw new Error(`UKHO API error: ${response.error}`);
    }

    const data = response.data;
    return data.items || data || [];
}

/**
 * Process and combine tide data
 */
function processTideData(observations, predictions) {
    const now = new Date();

    // Get station info
    const stationName = observations.length > 0 ? observations[0].stationName : 'Unknown';
    const unit = observations.length > 0 ? observations[0].unit : 'mAOD';

    // Get current reading (latest observation)
    const latest = observations[observations.length - 1];
    const current = latest ? {
        value: parseFloat(latest.value),
        time: new Date(latest.dateTime),
        unit: unit,
        trend: calculateTrend(observations)
    } : null;

    // Find next high and low from predictions
    const futureEvents = predictions
        .filter(e => {
            const eventTime = e.DateTime ? new Date(e.DateTime) : null;
            return eventTime && eventTime > now && e.Height != null;
        })
        .map(e => ({
            time: new Date(e.DateTime),
            height: parseFloat(e.Height),
            type: /high/i.test(e.EventType || '') ? 'High' : 'Low',
            isApprox: e.IsApproximateTime || e.IsApproximateHeight
        }))
        .sort((a, b) => a.time - b.time);

    const nextHigh = futureEvents.find(e => e.type === 'High');
    const nextLow = futureEvents.find(e => e.type === 'Low');

    // Format readings for chart
    const readings = observations.map(r => ({
        time: new Date(r.dateTime),
        value: parseFloat(r.value)
    }));

    return {
        stationName,
        unit,
        current,
        nextHigh,
        nextLow,
        readings,
        events: futureEvents.slice(0, 10), // Next 10 events
        lastUpdated: now
    };
}

/**
 * Calculate tide trend from recent observations
 */
function calculateTrend(observations) {
    if (observations.length < 2) {
        return { direction: 'steady', rate: 0, text: 'Steady →' };
    }

    // Use last 10 readings to determine trend
    const recent = observations.slice(-10);
    const first = parseFloat(recent[0].value);
    const last = parseFloat(recent[recent.length - 1].value);
    const diff = last - first;

    // Calculate rate (meters per hour)
    const timeFirst = new Date(recent[0].dateTime);
    const timeLast = new Date(recent[recent.length - 1].dateTime);
    const hours = (timeLast - timeFirst) / (1000 * 60 * 60);
    const rate = hours > 0 ? diff / hours : 0;

    // Determine direction (threshold: 0.05m difference)
    let direction, text;
    if (diff > 0.05) {
        direction = 'rising';
        text = `Rising ↑ (${rate >= 0 ? '+' : ''}${rate.toFixed(2)}m/hr)`;
    } else if (diff < -0.05) {
        direction = 'falling';
        text = `Falling ↓ (${rate.toFixed(2)}m/hr)`;
    } else {
        direction = 'steady';
        text = 'Steady →';
    }

    return { direction, rate, text };
}

/**
 * Cache data to localStorage
 */
function cacheData(data) {
    try {
        const cacheObject = {
            data,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(TIDE_CACHE_KEY, JSON.stringify(cacheObject));
        serviceState.cachedData = data;

        console.log('TidesDataService: Data cached successfully');
    } catch (err) {
        console.warn('TidesDataService: Failed to cache data', err);
    }
}

/**
 * Send message to background service worker
 * @param {Object} message - Message to send
 * @returns {Promise<Object>} Response from background
 */
function sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}
