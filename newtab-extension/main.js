// main.js - Main orchestration
import { clockWidget } from './components/clock.js';
import { calendarWidget } from './components/calendar.js';
import { financialWidget } from './components/financial.js';
import { registerWidget, initializeWidgets, updateAllWidgets, getWidgetRegistry } from './components/widgetManager.js';
import { initSettings, getSettings } from './components/settings.js';
import { initializeCustomLayout, resetLayout } from './components/layoutManager.js';

// Track if this is the initial load
let isInitialLoad = true;

// Register all available widgets
registerWidget('clock', clockWidget);
registerWidget('calendar', calendarWidget);
registerWidget('financial', financialWidget);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize settings first, with callback for when settings change
    initSettings(handleSettingsChange);

    // Initialize widgets after a short delay to let settings load
    setTimeout(() => {
        initializeApp();
    }, 100);
});

function initializeApp() {
    const settings = getSettings();
    const customLayoutEnabled = settings.customLayoutEnabled || false;

    if (customLayoutEnabled) {
        // Use custom layout mode
        const widgetRegistry = getWidgetRegistry();
        initializeCustomLayout(widgetRegistry);
    }

    // Initialize all widgets
    initializeWidgets(settings);

    // Mark initial load as complete
    isInitialLoad = false;
}

function handleSettingsChange(settings) {
    // Skip handling on initial load (widgets aren't initialized yet)
    if (isInitialLoad) {
        return;
    }

    // Handle layout mode toggle
    const wasCustomLayout = document.body.classList.contains('custom-layout-mode');
    const isCustomLayout = settings.customLayoutEnabled || false;

    if (wasCustomLayout !== isCustomLayout) {
        // Layout mode changed - reload to apply
        window.location.reload();
        return;
    }

    // Update all widgets with new settings
    updateAllWidgets(settings);
}

// Expose reset function globally for settings button
window.resetWidgetLayout = resetLayout;
