// settings.js - Settings management
import { getAllWidgets, getDefaultEnabledWidgets } from './widgetManager.js';

const DEFAULT_SETTINGS = {
    timeFormat: '24h',
    showSeconds: true,
    weekStartsOn: 'monday',
    showWeekNumbers: true,
    githubUsername: '',
    githubToken: '',
    githubUseAPI: false,
    githubTimeRange: 28,
    githubWeeklyGoal: 20,
    enabledWidgets: {}, // Will be populated from widget registry
    customLayoutEnabled: false, // Custom drag/drop/resize layout

    // Weather settings
    weatherLocation: 'Aberdeen',
    weatherLat: 57.1497,
    weatherLon: -2.0943,
    weatherLocationName: 'Aberdeen, United Kingdom',
    temperatureUnit: 'celsius',
    windSpeedUnit: 'kmh',
    weatherRefreshInterval: 30
};

let currentSettings = { ...DEFAULT_SETTINGS };
let onSettingsChangeCallback = null;

export function initSettings(onChangeCallback) {
    onSettingsChangeCallback = onChangeCallback;

    // Initialize default enabled widgets from registry
    DEFAULT_SETTINGS.enabledWidgets = getDefaultEnabledWidgets();
    currentSettings.enabledWidgets = { ...DEFAULT_SETTINGS.enabledWidgets };

    // Set up modal controls
    setupModalControls();

    // Load settings from storage
    loadSettings();

    // Set up setting controls (including dynamically generated widget toggles)
    setupSettingControls();
}

function setupModalControls() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    
    // Open modal
    settingsBtn?.addEventListener('click', () => {
        settingsModal?.classList.add('show');
        // Refresh UI controls to match current settings
        applySettings();
    });
    
    // Close modal
    closeSettingsBtn?.addEventListener('click', closeModal);
    
    // Close on outside click
    settingsModal?.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeModal();
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsModal?.classList.contains('show')) {
            closeModal();
        }
    });
}

function closeModal() {
    const settingsModal = document.getElementById('settings-modal');
    settingsModal?.classList.remove('show');
}

function setupSettingControls() {
    // Dynamically generate widget visibility controls
    generateWidgetControls();

    // Time format toggle
    const timeFormatToggle = document.getElementById('time-format-toggle');
    timeFormatToggle?.addEventListener('change', (e) => {
        updateSetting('timeFormat', e.target.checked ? '24h' : '12h');
    });

    // Show seconds toggle
    const showSecondsToggle = document.getElementById('show-seconds-toggle');
    showSecondsToggle?.addEventListener('change', (e) => {
        updateSetting('showSeconds', e.target.checked);
    });

    // Week starts on select
    const weekStartSelect = document.getElementById('week-start-select');
    weekStartSelect?.addEventListener('change', (e) => {
        updateSetting('weekStartsOn', e.target.value);
    });

    // Show week numbers toggle
    const showWeekNumbersToggle = document.getElementById('show-week-numbers-toggle');
    showWeekNumbersToggle?.addEventListener('change', (e) => {
        updateSetting('showWeekNumbers', e.target.checked);
    });

    // GitHub username input
    const githubUsernameInput = document.getElementById('github-username-input');
    githubUsernameInput?.addEventListener('change', (e) => {
        updateSetting('githubUsername', e.target.value.trim());
    });

    // GitHub token input
    const githubTokenInput = document.getElementById('github-token-input');
    githubTokenInput?.addEventListener('change', (e) => {
        updateSetting('githubToken', e.target.value.trim());
    });

    // GitHub API mode toggle
    const githubApiModeToggle = document.getElementById('github-api-mode-toggle');
    githubApiModeToggle?.addEventListener('change', (e) => {
        updateSetting('githubUseAPI', e.target.checked);
    });

    // GitHub time range select
    const githubTimeRangeSelect = document.getElementById('github-time-range-select');
    githubTimeRangeSelect?.addEventListener('change', (e) => {
        updateSetting('githubTimeRange', parseInt(e.target.value, 10));
    });

    // GitHub weekly goal input
    const githubWeeklyGoalInput = document.getElementById('github-weekly-goal-input');
    githubWeeklyGoalInput?.addEventListener('change', (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 1 && value <= 100) {
            updateSetting('githubWeeklyGoal', value);
        }
    });

    // Custom layout toggle
    const customLayoutToggle = document.getElementById('custom-layout-toggle');
    customLayoutToggle?.addEventListener('change', (e) => {
        updateSetting('customLayoutEnabled', e.target.checked);
    });

    // Reset layout button
    const resetLayoutBtn = document.getElementById('reset-layout-btn');
    resetLayoutBtn?.addEventListener('click', () => {
        if (confirm('Reset all widgets to default positions and sizes?')) {
            if (typeof window.resetWidgetLayout === 'function') {
                window.resetWidgetLayout();
            }
        }
    });

    // Temperature unit select - auto-apply
    const tempUnitSelect = document.getElementById('temperature-unit');
    tempUnitSelect?.addEventListener('change', (e) => {
        updateSetting('temperatureUnit', e.target.value);
    });

    // Wind speed unit select - auto-apply
    const windUnitSelect = document.getElementById('wind-speed-unit');
    windUnitSelect?.addEventListener('change', (e) => {
        updateSetting('windSpeedUnit', e.target.value);
    });

    // Weather refresh interval select - auto-apply
    const refreshSelect = document.getElementById('weather-refresh-interval');
    refreshSelect?.addEventListener('change', (e) => {
        updateSetting('weatherRefreshInterval', parseInt(e.target.value));
    });

    // Weather location input - auto-apply on blur or Enter key
    const locationInput = document.getElementById('weather-location');
    const applyWeatherLocation = async () => {
        const input = locationInput?.value.trim() || '';

        try {
            // Process location if changed
            if (input && input !== currentSettings.weatherLocation) {
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
                            throw new Error('Location not found');
                        }
                    } catch (error) {
                        console.error('Geocoding error:', error);
                        alert('Location not found. Please try entering coordinates (lat, lon) instead.');
                        return;
                    }
                }

                // Save settings and notify
                saveSettings();
                if (onSettingsChangeCallback) {
                    onSettingsChangeCallback(currentSettings);
                }
            } else if (!input) {
                // Clear location
                currentSettings.weatherLocation = '';
                currentSettings.weatherLat = null;
                currentSettings.weatherLon = null;
                currentSettings.weatherLocationName = 'Unknown Location';
                saveSettings();
                if (onSettingsChangeCallback) {
                    onSettingsChangeCallback(currentSettings);
                }
            }
        } catch (error) {
            console.error('Error applying weather location:', error);
            alert('Failed to apply weather location. Please try again.');
        }
    };

    locationInput?.addEventListener('blur', applyWeatherLocation);
    locationInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            applyWeatherLocation();
        }
    });

    // Set up widget toggle listeners
    setupWidgetToggles();
}

function generateWidgetControls() {
    const widgets = getAllWidgets();
    const settingsList = document.querySelector('.settings-list');
    if (!settingsList) return;

    // Create a widget section header and container
    const widgetSection = document.createElement('div');
    widgetSection.className = 'widget-section';
    widgetSection.innerHTML = `
        <div class="section-header">Visible Widgets</div>
        <div id="widget-toggles-container"></div>
    `;

    // Insert at the beginning of settings list
    settingsList.insertBefore(widgetSection, settingsList.firstChild);

    const widgetTogglesContainer = document.getElementById('widget-toggles-container');

    // Generate toggle for each widget
    widgets.forEach(widget => {
        const isEnabled = currentSettings.enabledWidgets[widget.id] !== false;

        const widgetToggleHTML = `
            <div class="setting-item">
                <label class="setting-label">${widget.displayName}</label>
                <div class="setting-control">
                    <label class="toggle-wrapper">
                        <input type="checkbox"
                               id="widget-toggle-${widget.id}"
                               class="toggle-input widget-toggle"
                               data-widget-id="${widget.id}"
                               ${isEnabled ? 'checked' : ''}>
                        <div class="toggle-slider"></div>
                    </label>
                </div>
            </div>
        `;

        widgetTogglesContainer.insertAdjacentHTML('beforeend', widgetToggleHTML);
    });
}

function setupWidgetToggles() {
    const widgetToggles = document.querySelectorAll('.widget-toggle');
    widgetToggles.forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const widgetId = e.target.dataset.widgetId;
            const newEnabledWidgets = { ...currentSettings.enabledWidgets };
            newEnabledWidgets[widgetId] = e.target.checked;
            updateSetting('enabledWidgets', newEnabledWidgets);
        });
    });
}

function loadSettings() {
    // Try to load from chrome.storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(['newtabSettings'], (result) => {
            if (result.newtabSettings) {
                currentSettings = { ...DEFAULT_SETTINGS, ...result.newtabSettings };
            }
            applySettings();
        });
    } else {
        // Fallback to localStorage for testing
        const stored = localStorage.getItem('newtabSettings');
        if (stored) {
            try {
                currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            } catch (e) {
                console.error('Error parsing settings:', e);
            }
        }
        applySettings();
    }
}

function applySettings() {
    // Update UI controls to match current settings
    const timeFormatToggle = document.getElementById('time-format-toggle');
    if (timeFormatToggle) {
        timeFormatToggle.checked = currentSettings.timeFormat === '24h';
    }

    const showSecondsToggle = document.getElementById('show-seconds-toggle');
    if (showSecondsToggle) {
        showSecondsToggle.checked = currentSettings.showSeconds;
    }

    const weekStartSelect = document.getElementById('week-start-select');
    if (weekStartSelect) {
        weekStartSelect.value = currentSettings.weekStartsOn;
    }

    const showWeekNumbersToggle = document.getElementById('show-week-numbers-toggle');
    if (showWeekNumbersToggle) {
        showWeekNumbersToggle.checked = currentSettings.showWeekNumbers;
    }

    const customLayoutToggle = document.getElementById('custom-layout-toggle');
    if (customLayoutToggle) {
        customLayoutToggle.checked = currentSettings.customLayoutEnabled || false;
    }

    const githubUsernameInput = document.getElementById('github-username-input');
    if (githubUsernameInput) {
        githubUsernameInput.value = currentSettings.githubUsername || '';
    }

    const githubTokenInput = document.getElementById('github-token-input');
    if (githubTokenInput) {
        githubTokenInput.value = currentSettings.githubToken || '';
    }

    const githubApiModeToggle = document.getElementById('github-api-mode-toggle');
    if (githubApiModeToggle) {
        githubApiModeToggle.checked = currentSettings.githubUseAPI || false;
    }

    const githubTimeRangeSelect = document.getElementById('github-time-range-select');
    if (githubTimeRangeSelect) {
        githubTimeRangeSelect.value = currentSettings.githubTimeRange || 28;
    }

    const githubWeeklyGoalInput = document.getElementById('github-weekly-goal-input');
    if (githubWeeklyGoalInput) {
        githubWeeklyGoalInput.value = currentSettings.githubWeeklyGoal || 20;
    }

    // Weather location
    const weatherLocationInput = document.getElementById('weather-location');
    if (weatherLocationInput) {
        weatherLocationInput.value = currentSettings.weatherLocation || '';
    }

    // Temperature unit
    const temperatureUnitSelect = document.getElementById('temperature-unit');
    if (temperatureUnitSelect) {
        temperatureUnitSelect.value = currentSettings.temperatureUnit || 'celsius';
    }

    // Wind speed unit
    const windSpeedUnitSelect = document.getElementById('wind-speed-unit');
    if (windSpeedUnitSelect) {
        windSpeedUnitSelect.value = currentSettings.windSpeedUnit || 'kmh';
    }

    // Weather refresh interval
    const weatherRefreshSelect = document.getElementById('weather-refresh-interval');
    if (weatherRefreshSelect) {
        weatherRefreshSelect.value = currentSettings.weatherRefreshInterval || 30;
    }

    // Update widget toggles to match current settings
    const widgetToggles = document.querySelectorAll('.widget-toggle');
    widgetToggles.forEach(toggle => {
        const widgetId = toggle.dataset.widgetId;
        if (widgetId && currentSettings.enabledWidgets) {
            toggle.checked = currentSettings.enabledWidgets[widgetId] !== false;
        }
    });

    // Notify components of settings
    if (onSettingsChangeCallback) {
        onSettingsChangeCallback(currentSettings);
    }
}

function updateSetting(key, value) {
    currentSettings[key] = value;
    saveSettings();
    
    // Notify components of change
    if (onSettingsChangeCallback) {
        onSettingsChangeCallback(currentSettings);
    }
}

function saveSettings() {
    // Save to chrome.storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.set({ newtabSettings: currentSettings });
    } else {
        // Fallback to localStorage for testing
        localStorage.setItem('newtabSettings', JSON.stringify(currentSettings));
    }
}

export function getSettings() {
    return { ...currentSettings };
}
