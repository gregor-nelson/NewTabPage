// settings.js - Settings management
import { getAllWidgets, getDefaultEnabledWidgets } from './widgetManager.js';

const DEFAULT_SETTINGS = {
    timeFormat: '24h',
    showSeconds: true,
    weekStartsOn: 'monday',
    showWeekNumbers: true,
    githubUsername: '',
    githubWeeklyGoal: 20,
    enabledWidgets: {}, // Will be populated from widget registry
    customLayoutEnabled: false // Custom drag/drop/resize layout
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
                <label class="toggle-wrapper">
                    <input type="checkbox"
                           id="widget-toggle-${widget.id}"
                           class="toggle-input widget-toggle"
                           data-widget-id="${widget.id}"
                           ${isEnabled ? 'checked' : ''}>
                    <div class="toggle-slider"></div>
                </label>
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

    const githubWeeklyGoalInput = document.getElementById('github-weekly-goal-input');
    if (githubWeeklyGoalInput) {
        githubWeeklyGoalInput.value = currentSettings.githubWeeklyGoal || 20;
    }

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
