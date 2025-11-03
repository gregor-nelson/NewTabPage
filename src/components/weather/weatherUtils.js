// weatherUtils.js - Weather utility functions

/**
 * WMO Weather Code mapping to icons and descriptions
 * Source: https://open-meteo.com/en/docs
 */
export const weatherCodes = {
    0: { icon: 'ph-sun', label: 'Clear sky', description: 'Clear conditions' },
    1: { icon: 'ph-sun', label: 'Mainly clear', description: 'Mostly clear' },
    2: { icon: 'ph-cloud-sun', label: 'Partly cloudy', description: 'Partly cloudy' },
    3: { icon: 'ph-cloud', label: 'Overcast', description: 'Overcast' },
    45: { icon: 'ph-cloud-fog', label: 'Fog', description: 'Foggy conditions' },
    48: { icon: 'ph-cloud-fog', label: 'Rime fog', description: 'Depositing rime fog' },
    51: { icon: 'ph-cloud-rain', label: 'Light drizzle', description: 'Light drizzle' },
    53: { icon: 'ph-cloud-rain', label: 'Drizzle', description: 'Moderate drizzle' },
    55: { icon: 'ph-cloud-rain', label: 'Dense drizzle', description: 'Dense drizzle' },
    56: { icon: 'ph-cloud-rain', label: 'Light freezing drizzle', description: 'Freezing drizzle' },
    57: { icon: 'ph-cloud-rain', label: 'Freezing drizzle', description: 'Dense freezing drizzle' },
    61: { icon: 'ph-cloud-rain', label: 'Light rain', description: 'Light rain' },
    63: { icon: 'ph-cloud-rain', label: 'Rain', description: 'Moderate rain' },
    65: { icon: 'ph-cloud-rain', label: 'Heavy rain', description: 'Heavy rain' },
    66: { icon: 'ph-cloud-rain', label: 'Freezing rain', description: 'Light freezing rain' },
    67: { icon: 'ph-cloud-rain', label: 'Heavy freezing rain', description: 'Heavy freezing rain' },
    71: { icon: 'ph-snowflake', label: 'Light snow', description: 'Light snow fall' },
    73: { icon: 'ph-snowflake', label: 'Snow', description: 'Moderate snow fall' },
    75: { icon: 'ph-snowflake', label: 'Heavy snow', description: 'Heavy snow fall' },
    77: { icon: 'ph-snowflake', label: 'Snow grains', description: 'Snow grains' },
    80: { icon: 'ph-cloud-rain', label: 'Light showers', description: 'Light rain showers' },
    81: { icon: 'ph-cloud-rain', label: 'Showers', description: 'Moderate rain showers' },
    82: { icon: 'ph-cloud-rain', label: 'Heavy showers', description: 'Violent rain showers' },
    85: { icon: 'ph-snowflake', label: 'Light snow showers', description: 'Light snow showers' },
    86: { icon: 'ph-snowflake', label: 'Snow showers', description: 'Heavy snow showers' },
    95: { icon: 'ph-lightning', label: 'Thunderstorm', description: 'Thunderstorm' },
    96: { icon: 'ph-lightning', label: 'Thunderstorm with hail', description: 'Thunderstorm with slight hail' },
    99: { icon: 'ph-lightning', label: 'Heavy thunderstorm', description: 'Thunderstorm with heavy hail' }
};

/**
 * Get weather information from WMO code
 * @param {number} code - WMO weather code
 * @returns {Object} Weather info with icon and label
 */
export function getWeatherInfo(code) {
    return weatherCodes[code] || { icon: 'ph-question', label: 'Unknown', description: 'Unknown conditions' };
}

/**
 * Convert temperature between Celsius and Fahrenheit
 * @param {number} celsius - Temperature in Celsius
 * @param {string} toUnit - Target unit ('celsius' or 'fahrenheit')
 * @returns {number} Converted temperature
 */
export function convertTemp(celsius, toUnit = 'celsius') {
    if (toUnit === 'fahrenheit') {
        return Math.round((celsius * 9/5) + 32);
    }
    return Math.round(celsius);
}

/**
 * Format temperature with unit
 * @param {number} temp - Temperature value
 * @param {string} unit - Unit ('celsius' or 'fahrenheit')
 * @returns {string} Formatted temperature
 */
export function formatTemp(temp, unit = 'celsius') {
    const symbol = unit === 'fahrenheit' ? '°F' : '°C';
    return `${Math.round(temp)}${symbol}`;
}

/**
 * Convert wind speed between units
 * @param {number} kmh - Wind speed in km/h
 * @param {string} toUnit - Target unit ('kmh', 'mph', or 'ms')
 * @returns {number} Converted wind speed
 */
export function convertSpeed(kmh, toUnit = 'kmh') {
    if (toUnit === 'mph') {
        return Math.round(kmh * 0.621371);
    }
    if (toUnit === 'ms') {
        return Math.round(kmh / 3.6);
    }
    return Math.round(kmh);
}

/**
 * Format wind speed with unit
 * @param {number} speed - Wind speed value (in km/h from API)
 * @param {string} unit - Unit ('kmh', 'mph', or 'ms')
 * @returns {string} Formatted wind speed
 */
export function formatSpeed(speed, unit = 'kmh') {
    const converted = convertSpeed(speed, unit);
    let unitLabel;
    switch(unit) {
        case 'mph': unitLabel = ' mph'; break;
        case 'ms': unitLabel = ' m/s'; break;
        default: unitLabel = ' km/h';
    }
    return `${converted}${unitLabel}`;
}

/**
 * Convert wind direction degrees to cardinal direction
 * @param {number} degrees - Wind direction in degrees (0-360)
 * @returns {string} Cardinal direction (N, NE, E, etc.)
 */
export function getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

/**
 * Get wind direction arrow icon
 * @param {number} degrees - Wind direction in degrees
 * @returns {string} Arrow character
 */
export function getWindDirectionArrow(degrees) {
    const arrows = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
    const index = Math.round(degrees / 45) % 8;
    return arrows[index];
}

/**
 * Convert pressure between units
 * @param {number} hPa - Pressure in hPa (hectopascals)
 * @param {string} toUnit - Target unit ('hpa' or 'inhg')
 * @returns {number} Converted pressure
 */
export function convertPressure(hPa, toUnit = 'hpa') {
    if (toUnit === 'inhg') {
        return (hPa * 0.02953).toFixed(2);
    }
    return Math.round(hPa);
}

/**
 * Format pressure with unit
 * @param {number} pressure - Pressure value in hPa
 * @param {string} unit - Unit ('hpa' or 'inhg')
 * @returns {string} Formatted pressure
 */
export function formatPressure(pressure, unit = 'hpa') {
    if (unit === 'inhg') {
        return `${(pressure * 0.02953).toFixed(2)} inHg`;
    }
    return `${Math.round(pressure)} hPa`;
}

/**
 * Format humidity percentage
 * @param {number} humidity - Humidity percentage (0-100)
 * @returns {string} Formatted humidity
 */
export function formatHumidity(humidity) {
    return `${Math.round(humidity)}%`;
}

/**
 * Format time from ISO string
 * @param {string} isoString - ISO 8601 date/time string
 * @returns {string} Formatted time (e.g., "2 PM" or "14:00")
 */
export function formatHourLabel(isoString) {
    const date = new Date(isoString);
    const hours = date.getHours();

    // 12-hour format
    if (hours === 0) return '12 AM';
    if (hours === 12) return '12 PM';
    if (hours < 12) return `${hours} AM`;
    return `${hours - 12} PM`;
}

/**
 * Get Beaufort scale for wind speed
 * @param {number} windSpeed - Wind speed in km/h
 * @returns {Object} Beaufort scale and description
 */
export function getBeaufortScale(windSpeed) {
    if (windSpeed < 1) return { scale: 0, description: 'Calm' };
    if (windSpeed < 6) return { scale: 1, description: 'Light air' };
    if (windSpeed < 12) return { scale: 2, description: 'Light breeze' };
    if (windSpeed < 20) return { scale: 3, description: 'Gentle breeze' };
    if (windSpeed < 29) return { scale: 4, description: 'Moderate breeze' };
    if (windSpeed < 39) return { scale: 5, description: 'Fresh breeze' };
    if (windSpeed < 50) return { scale: 6, description: 'Strong breeze' };
    if (windSpeed < 62) return { scale: 7, description: 'High wind' };
    if (windSpeed < 75) return { scale: 8, description: 'Gale' };
    if (windSpeed < 89) return { scale: 9, description: 'Strong gale' };
    if (windSpeed < 103) return { scale: 10, description: 'Storm' };
    if (windSpeed < 118) return { scale: 11, description: 'Violent storm' };
    return { scale: 12, description: 'Hurricane' };
}
