// widgetManager.js - Widget registry and lifecycle management

// Widget registry - all available widgets in the system
const widgetRegistry = new Map();

// Active widget instances
const activeWidgets = new Map();

/**
 * Register a widget in the system
 * @param {string} id - Unique widget identifier
 * @param {Object} config - Widget configuration
 * @param {string} config.displayName - User-facing name for settings UI
 * @param {boolean} config.defaultEnabled - Whether widget is enabled by default
 * @param {Function} config.init - Initialization function(settings)
 * @param {Function} config.update - Update function(settings)
 * @param {Function} config.cleanup - Cleanup function()
 * @param {string} config.containerId - DOM element ID for the widget
 */
export function registerWidget(id, config) {
    if (!id || !config) {
        console.error('Invalid widget registration:', id);
        return;
    }

    // Validate required properties
    const required = ['displayName', 'init', 'update', 'containerId'];
    for (const prop of required) {
        if (!config[prop]) {
            console.error(`Widget ${id} missing required property: ${prop}`);
            return;
        }
    }

    widgetRegistry.set(id, {
        id,
        displayName: config.displayName,
        defaultEnabled: config.defaultEnabled !== false, // default to true
        init: config.init,
        update: config.update,
        cleanup: config.cleanup || (() => {}),
        containerId: config.containerId,
        layout: config.layout || {}, // Store layout configuration
        onDragStart: config.onDragStart,
        onDragEnd: config.onDragEnd,
        onResize: config.onResize,
        onResizeStart: config.onResizeStart,
        onResizeEnd: config.onResizeEnd
    });

    console.log(`Widget registered: ${id}`);
}

/**
 * Get all registered widgets
 * @returns {Array} Array of widget configurations
 */
export function getAllWidgets() {
    return Array.from(widgetRegistry.values());
}

/**
 * Get default enabled state for all widgets
 * @returns {Object} Map of widget IDs to default enabled state
 */
export function getDefaultEnabledWidgets() {
    const defaults = {};
    widgetRegistry.forEach((widget, id) => {
        defaults[id] = widget.defaultEnabled;
    });
    return defaults;
}

/**
 * Initialize all enabled widgets
 * @param {Object} settings - User settings containing enabled widgets and widget-specific settings
 */
export function initializeWidgets(settings) {
    const enabledWidgets = settings.enabledWidgets || getDefaultEnabledWidgets();

    widgetRegistry.forEach((widget, id) => {
        if (enabledWidgets[id]) {
            showWidget(id);
            initializeWidget(id, settings);
        } else {
            hideWidget(id);
        }
    });
}

/**
 * Initialize a specific widget
 * @param {string} id - Widget ID
 * @param {Object} settings - User settings
 */
function initializeWidget(id, settings) {
    const widget = widgetRegistry.get(id);
    if (!widget) {
        console.error(`Widget not found: ${id}`);
        return;
    }

    try {
        // Call widget's init function with settings
        widget.init(settings);
        activeWidgets.set(id, widget);
        console.log(`Widget initialized: ${id}`);
    } catch (error) {
        console.error(`Error initializing widget ${id}:`, error);
    }
}

/**
 * Update all active widgets with new settings
 * @param {Object} settings - Updated settings
 */
export function updateAllWidgets(settings) {
    const enabledWidgets = settings.enabledWidgets || getDefaultEnabledWidgets();

    // Handle widgets that were toggled on/off
    widgetRegistry.forEach((widget, id) => {
        const isEnabled = enabledWidgets[id];
        const isActive = activeWidgets.has(id);

        if (isEnabled && !isActive) {
            // Widget was just enabled
            showWidget(id);
            initializeWidget(id, settings);
        } else if (!isEnabled && isActive) {
            // Widget was just disabled
            cleanupWidget(id);
            hideWidget(id);
        } else if (isEnabled && isActive) {
            // Widget is active, update it
            updateWidget(id, settings);
        }
    });
}

/**
 * Update a specific widget
 * @param {string} id - Widget ID
 * @param {Object} settings - Updated settings
 */
function updateWidget(id, settings) {
    const widget = widgetRegistry.get(id);
    if (!widget) return;

    try {
        widget.update(settings);
    } catch (error) {
        console.error(`Error updating widget ${id}:`, error);
    }
}

/**
 * Cleanup a widget (call its cleanup function and remove from active widgets)
 * @param {string} id - Widget ID
 */
function cleanupWidget(id) {
    const widget = activeWidgets.get(id);
    if (!widget) return;

    try {
        widget.cleanup();
        activeWidgets.delete(id);
        console.log(`Widget cleaned up: ${id}`);
    } catch (error) {
        console.error(`Error cleaning up widget ${id}:`, error);
    }
}

/**
 * Show a widget's container
 * @param {string} id - Widget ID
 */
function showWidget(id) {
    const widget = widgetRegistry.get(id);
    if (!widget) return;

    const container = document.getElementById(widget.containerId);
    if (container) {
        container.style.display = '';
    }
}

/**
 * Hide a widget's container
 * @param {string} id - Widget ID
 */
function hideWidget(id) {
    const widget = widgetRegistry.get(id);
    if (!widget) return;

    const container = document.getElementById(widget.containerId);
    if (container) {
        container.style.display = 'none';
    }
}

/**
 * Cleanup all active widgets
 */
export function cleanupAllWidgets() {
    activeWidgets.forEach((widget, id) => {
        cleanupWidget(id);
    });
}

/**
 * Get the widget registry
 * @returns {Map} Widget registry map
 */
export function getWidgetRegistry() {
    return widgetRegistry;
}
