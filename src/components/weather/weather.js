// weather.js - Weather widget with current conditions and hourly forecast

import {
    initWeatherService,
    getWeatherData,
    forceRefreshWeather,
    cleanupWeatherService,
    updateWeatherSettings
} from './weatherDataService.js';

import {
    getWeatherInfo,
    formatTemp,
    formatSpeed,
    getWindDirection,
    formatPressure,
    formatHumidity,
    formatHourLabel
} from './weatherUtils.js';

// Private state
let weatherState = {
    updateInterval: null,
    settings: {
        tempUnit: 'celsius',
        windUnit: 'kmh',
        refreshInterval: 30 // minutes
    }
};

// Widget configuration
export const weatherWidget = {
    displayName: 'Weather',
    defaultEnabled: true,
    containerId: 'weather-container',
    init: initWeather,
    update: updateWeather,
    cleanup: cleanupWeather,

    layout: {
        defaultPosition: { x: '55%', y: '50px' },
        defaultSize: { width: '560px', height: '380px' },
        minSize: { width: 450, height: 320 },
        resizable: true,
        draggable: true,
        dragHandle: '.widget-header',
        zIndex: 3
    }
};

/**
 * Initialize weather widget
 */
async function initWeather(settings) {
    console.log('Weather Widget: Initializing');

    // Extract weather settings
    weatherState.settings = {
        lat: settings.weatherLat || null,
        lon: settings.weatherLon || null,
        locationName: settings.weatherLocationName || 'Unknown Location',
        tempUnit: settings.temperatureUnit || 'celsius',
        windUnit: settings.windSpeedUnit || 'kmh',
        refreshInterval: settings.weatherRefreshInterval || 30
    };

    console.log('Weather Widget: Using location:', weatherState.settings.lat, weatherState.settings.lon);

    // Initialize data service
    await initWeatherService(handleDataUpdate, weatherState.settings);

    // Render initial UI
    renderWeatherWidget();

    // Start auto-refresh
    startAutoRefresh(weatherState.settings.refreshInterval);

    console.log('Weather Widget: Initialized successfully');
}

/**
 * Update weather widget (when settings change)
 */
async function updateWeather(settings) {
    console.log('Weather Widget: Updating with new settings');

    const newSettings = {
        weatherLat: settings.weatherLat || weatherState.settings.lat,
        weatherLon: settings.weatherLon || weatherState.settings.lon,
        weatherLocationName: settings.weatherLocationName || weatherState.settings.locationName,
        temperatureUnit: settings.temperatureUnit || weatherState.settings.tempUnit,
        windSpeedUnit: settings.windSpeedUnit || weatherState.settings.windUnit,
        weatherRefreshInterval: settings.weatherRefreshInterval || weatherState.settings.refreshInterval
    };

    // Check if location changed
    const locationChanged =
        newSettings.weatherLat !== weatherState.settings.lat ||
        newSettings.weatherLon !== weatherState.settings.lon;

    weatherState.settings = {
        lat: newSettings.weatherLat,
        lon: newSettings.weatherLon,
        locationName: newSettings.weatherLocationName,
        tempUnit: newSettings.temperatureUnit,
        windUnit: newSettings.windSpeedUnit,
        refreshInterval: newSettings.weatherRefreshInterval
    };

    // Update service settings
    updateWeatherSettings(weatherState.settings);

    // Restart auto-refresh if interval changed
    startAutoRefresh(weatherState.settings.refreshInterval);

    // Re-render
    renderWeatherWidget();
}

/**
 * Cleanup weather widget
 */
function cleanupWeather() {
    console.log('Weather Widget: Cleaning up');

    // Clear intervals
    if (weatherState.updateInterval) {
        clearInterval(weatherState.updateInterval);
        weatherState.updateInterval = null;
    }

    // Cleanup data service
    cleanupWeatherService();
}

/**
 * Handle data updates from service
 */
function handleDataUpdate(data) {
    console.log('Weather Widget: Data updated');
    renderWeatherWidget();
}

/**
 * Start auto-refresh interval
 */
function startAutoRefresh(intervalMinutes) {
    // Clear existing interval
    if (weatherState.updateInterval) {
        clearInterval(weatherState.updateInterval);
    }

    // Set new interval
    weatherState.updateInterval = setInterval(() => {
        console.log('Weather Widget: Auto-refresh');
        forceRefreshWeather();
    }, intervalMinutes * 60 * 1000);
}

/**
 * Render weather widget UI
 */
function renderWeatherWidget() {
    const container = document.getElementById('weather-container');
    if (!container) return;

    const data = getWeatherData();

    // Widget HTML structure
    const widgetHTML = `
        <div class="weather-widget">
            <div class="widget-header">
                <div class="widget-title">
                    <i class="ph ph-cloud-sun"></i>
                    <span>Weather</span>
                </div>
                <button class="widget-refresh-btn" id="weather-refresh-btn" title="Refresh">
                    <i class="ph ph-arrows-clockwise"></i>
                </button>
            </div>
            <div class="weather-content">
                ${renderWeatherContent(data)}
            </div>
        </div>
    `;

    container.innerHTML = widgetHTML;

    // Add event listeners
    const refreshBtn = document.getElementById('weather-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            forceRefreshWeather();
        });
    }
}

/**
 * Render weather content (current + hourly)
 */
function renderWeatherContent(data) {
    if (!data) {
        return renderLoading();
    }

    if (data.error) {
        return renderError(data.error);
    }

    if (data.isLoading && !data.current) {
        return renderLoading();
    }

    if (!data.current) {
        return renderNoData();
    }

    return `
        ${renderCurrentWeather(data)}
        ${renderHourlyForecast(data)}
    `;
}

/**
 * Render current weather conditions
 */
function renderCurrentWeather(data) {
    const { current, locationName } = data;
    const weatherInfo = getWeatherInfo(current.weatherCode);

    return `
        <div class="weather-current">
            <div class="weather-location">${locationName || 'Unknown Location'}</div>
            <div class="weather-main">
                <div class="weather-icon-large">
                    <i class="ph-fill ${weatherInfo.icon}"></i>
                </div>
                <div class="weather-temp-main">
                    <div class="weather-temp-large">${formatTemp(current.temperature, weatherState.settings.tempUnit)}</div>
                    <div class="weather-description">${weatherInfo.label}</div>
                </div>
            </div>
            <div class="weather-details">
                <div class="weather-detail-item">
                    <i class="ph ph-thermometer-simple"></i>
                    <span>Feels like ${formatTemp(current.feelsLike, weatherState.settings.tempUnit)}</span>
                </div>
                <div class="weather-detail-item">
                    <i class="ph ph-drop"></i>
                    <span>Humidity ${formatHumidity(current.humidity)}</span>
                </div>
                <div class="weather-detail-item">
                    <i class="ph ph-wind"></i>
                    <span>Wind ${formatSpeed(current.windSpeed, weatherState.settings.windUnit)} ${getWindDirection(current.windDirection)}</span>
                </div>
                <div class="weather-detail-item">
                    <i class="ph ph-gauge"></i>
                    <span>Pressure ${formatPressure(current.pressure)}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render hourly forecast
 */
function renderHourlyForecast(data) {
    if (!data.hourly) {
        return '';
    }

    const { hourly } = data;
    const hours = hourly.time.slice(0, 12); // Show next 12 hours

    const hourCards = hours.map((time, index) => {
        const temp = hourly.temperature[index];
        const code = hourly.weatherCode[index];
        const precip = hourly.precipitationProbability[index];
        const weatherInfo = getWeatherInfo(code);

        return `
            <div class="weather-hour-card">
                <div class="weather-hour-time">${formatHourLabel(time)}</div>
                <i class="ph ${weatherInfo.icon} weather-hour-icon"></i>
                <div class="weather-hour-temp">${formatTemp(temp, weatherState.settings.tempUnit)}</div>
                ${precip > 0 ? `<div class="weather-hour-precip">${Math.round(precip)}%</div>` : '<div class="weather-hour-precip-empty"></div>'}
            </div>
        `;
    }).join('');

    return `
        <div class="weather-hourly">
            <div class="weather-hourly-title">Hourly Forecast</div>
            <div class="weather-hourly-scroll">
                ${hourCards}
            </div>
        </div>
    `;
}

/**
 * Render loading state
 */
function renderLoading() {
    return `
        <div class="weather-loading">
            <i class="ph ph-spinner weather-spinner"></i>
            <div>Loading weather data...</div>
        </div>
    `;
}

/**
 * Render error state
 */
function renderError(error) {
    return `
        <div class="weather-error">
            <i class="ph ph-warning-circle"></i>
            <div class="weather-error-message">${error}</div>
            <div class="weather-error-hint">Check your location settings</div>
        </div>
    `;
}

/**
 * Render no data state
 */
function renderNoData() {
    return `
        <div class="weather-no-data">
            <i class="ph ph-map-pin-line"></i>
            <div>No weather data available</div>
            <div class="weather-error-hint">Please configure your location in settings</div>
        </div>
    `;
}
