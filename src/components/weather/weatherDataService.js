// weatherDataService.js - Open-Meteo Weather API integration

// Constants
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const API_BASE = 'https://api.open-meteo.com/v1/forecast';

// State
let weatherCache = null;
let lastFetchTime = null;
let onDataUpdateCallback = null;
let serviceSettings = {
    lat: null,
    lon: null,
    locationName: '',
    tempUnit: 'celsius',
    windUnit: 'kmh'
};

/**
 * Initialize weather data service
 * @param {Function} onDataUpdate - Callback when data updates
 * @param {Object} settings - Service settings
 */
export function initWeatherService(onDataUpdate, settings = {}) {
    console.log('Weather Service: Initializing');

    onDataUpdateCallback = onDataUpdate;

    // Update service settings
    serviceSettings = {
        lat: settings.weatherLat || null,
        lon: settings.weatherLon || null,
        locationName: settings.weatherLocationName || 'Unknown Location',
        tempUnit: settings.temperatureUnit || 'celsius',
        windUnit: settings.windSpeedUnit || 'kmh'
    };

    // Load cached data immediately
    const cached = getCachedData();
    if (cached) {
        weatherCache = {
            ...cached,
            isLoading: false
        };

        // Notify UI with cached data
        if (onDataUpdateCallback) {
            onDataUpdateCallback(weatherCache);
        }
    } else {
        weatherCache = {
            current: null,
            hourly: null,
            isLoading: true,
            error: null,
            lastUpdated: null,
            locationName: serviceSettings.locationName
        };
    }

    // Fetch fresh data if we have location
    if (serviceSettings.lat && serviceSettings.lon) {
        fetchWeatherData();
    } else {
        // No location configured
        const errorData = {
            ...weatherCache,
            isLoading: false,
            error: 'Location not configured'
        };
        weatherCache = errorData;
        if (onDataUpdateCallback) {
            onDataUpdateCallback(errorData);
        }
    }
}

/**
 * Update service settings
 * @param {Object} newSettings - New settings to apply
 */
export function updateWeatherSettings(newSettings) {
    const settingsChanged =
        newSettings.weatherLat !== serviceSettings.lat ||
        newSettings.weatherLon !== serviceSettings.lon ||
        newSettings.temperatureUnit !== serviceSettings.tempUnit ||
        newSettings.windSpeedUnit !== serviceSettings.windUnit;

    if (settingsChanged) {
        serviceSettings = {
            lat: newSettings.weatherLat || serviceSettings.lat,
            lon: newSettings.weatherLon || serviceSettings.lon,
            locationName: newSettings.weatherLocationName || serviceSettings.locationName,
            tempUnit: newSettings.temperatureUnit || serviceSettings.tempUnit,
            windUnit: newSettings.windSpeedUnit || serviceSettings.windUnit
        };

        // Refetch with new settings
        if (serviceSettings.lat && serviceSettings.lon) {
            lastFetchTime = null; // Reset throttle
            fetchWeatherData();
        }
    }
}

/**
 * Fetch weather data from Open-Meteo API
 */
async function fetchWeatherData() {
    if (!serviceSettings.lat || !serviceSettings.lon) {
        console.error('Weather Service: No location configured');
        return;
    }

    // Throttle requests (30 second minimum between fetches)
    const now = Date.now();
    if (lastFetchTime && (now - lastFetchTime) < 30000) {
        console.log('Weather Service: Throttled (too soon)');
        return;
    }

    lastFetchTime = now;

    console.log('Weather Service: Fetching data for', serviceSettings.lat, serviceSettings.lon);

    // Update loading state
    weatherCache = {
        ...weatherCache,
        isLoading: true
    };

    try {
        // Build API request
        const params = new URLSearchParams({
            latitude: serviceSettings.lat,
            longitude: serviceSettings.lon,
            current: [
                'temperature_2m',
                'relative_humidity_2m',
                'apparent_temperature',
                'weather_code',
                'wind_speed_10m',
                'wind_direction_10m',
                'pressure_msl'
            ].join(','),
            hourly: [
                'temperature_2m',
                'weather_code',
                'precipitation_probability'
            ].join(','),
            temperature_unit: serviceSettings.tempUnit,
            wind_speed_unit: serviceSettings.windUnit,
            forecast_hours: 24
        });

        const url = `${API_BASE}?${params}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        // Parse current weather
        const current = {
            temperature: data.current.temperature_2m,
            feelsLike: data.current.apparent_temperature,
            humidity: data.current.relative_humidity_2m,
            windSpeed: data.current.wind_speed_10m,
            windDirection: data.current.wind_direction_10m,
            pressure: data.current.pressure_msl,
            weatherCode: data.current.weather_code
        };

        // Parse hourly forecast (next 24 hours)
        const hourly = {
            time: data.hourly.time.slice(0, 24),
            temperature: data.hourly.temperature_2m.slice(0, 24),
            weatherCode: data.hourly.weather_code.slice(0, 24),
            precipitationProbability: data.hourly.precipitation_probability.slice(0, 24)
        };

        // Update cache
        const newData = {
            current,
            hourly,
            isLoading: false,
            error: null,
            lastUpdated: now,
            locationName: serviceSettings.locationName
        };

        weatherCache = newData;
        setCachedData(newData);

        console.log('Weather Service: Data fetched successfully');

        // Notify UI
        if (onDataUpdateCallback) {
            onDataUpdateCallback(newData);
        }

    } catch (error) {
        console.error('Weather Service: Fetch error', error);

        const errorData = {
            ...weatherCache,
            isLoading: false,
            error: error.message
        };

        weatherCache = errorData;

        // Notify UI
        if (onDataUpdateCallback) {
            onDataUpdateCallback(errorData);
        }
    }
}

/**
 * Get cached data from localStorage
 */
function getCachedData() {
    try {
        const cachedStr = localStorage.getItem('weather_data');
        if (!cachedStr) return null;

        const cached = JSON.parse(cachedStr);

        // Check if cache is still valid
        if (Date.now() - cached.timestamp <= CACHE_DURATION) {
            return {
                current: cached.current,
                hourly: cached.hourly,
                lastUpdated: cached.timestamp,
                locationName: cached.locationName
            };
        }
    } catch (error) {
        console.error('Weather Service: Cache read error', error);
    }
    return null;
}

/**
 * Store data in localStorage
 */
function setCachedData(data) {
    try {
        const cacheData = {
            current: data.current,
            hourly: data.hourly,
            locationName: data.locationName,
            timestamp: Date.now()
        };
        localStorage.setItem('weather_data', JSON.stringify(cacheData));
    } catch (error) {
        console.error('Weather Service: Cache write error', error);
    }
}

/**
 * Get current weather data
 */
export function getWeatherData() {
    return weatherCache;
}

/**
 * Force refresh weather data
 */
export function forceRefreshWeather() {
    lastFetchTime = null; // Reset throttle
    fetchWeatherData();
}

/**
 * Cleanup service
 */
export function cleanupWeatherService() {
    console.log('Weather Service: Cleaning up');
    onDataUpdateCallback = null;
    lastFetchTime = null;
}

/**
 * Get last fetch time (for debugging)
 */
export function getLastFetchTime() {
    return lastFetchTime;
}
