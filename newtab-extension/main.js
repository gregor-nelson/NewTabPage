// main.js - Main orchestration
import { clockWidget } from './components/clock.js';
import { calendarWidget } from './components/calendar.js';
import { financialWidget } from './components/financial.js';
import { registerWidget, initializeWidgets, updateAllWidgets } from './components/widgetManager.js';
import { initSettings, getSettings } from './components/settings.js';

// Register all available widgets
registerWidget('clock', clockWidget);
registerWidget('calendar', calendarWidget);
registerWidget('financial', financialWidget);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize settings first, with callback for when settings change
    initSettings(handleSettingsChange);
});

function handleSettingsChange(settings) {
    // Update all widgets with new settings
    updateAllWidgets(settings);
}

// Initialize widgets after settings are loaded
setTimeout(() => {
    const settings = getSettings();
    initializeWidgets(settings);
}, 100);
