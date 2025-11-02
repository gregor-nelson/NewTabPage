const LAYOUT_STORAGE_KEY = 'newtab-widget-layouts';
const STORAGE_VERSION = 1;

/**
 * Load all widget layouts from localStorage
 * @returns {Object|null} Layout data for all widgets
 */
export function loadLayouts() {
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);

    if (!stored) {
      return null;  // No saved layouts
    }

    const data = JSON.parse(stored);

    // Version check for future migrations
    if (data.version !== STORAGE_VERSION) {
      console.warn('Layout version mismatch, using defaults');
      return null;
    }

    return data.layouts;

  } catch (error) {
    console.error('Failed to load layouts:', error);
    return null;
  }
}

/**
 * Load layout for a specific widget
 * @param {string} widgetId - Widget identifier
 * @returns {Object|null} Layout data or null if not found
 */
export function loadWidgetLayout(widgetId) {
  const layouts = loadLayouts();
  return layouts ? layouts[widgetId] : null;
}

/**
 * Save all widget layouts to localStorage
 * @param {Object} layouts - Object containing all widget layouts
 */
export function saveLayouts(layouts) {
  try {
    const data = {
      version: STORAGE_VERSION,
      breakpoint: getCurrentBreakpoint(),
      timestamp: Date.now(),
      layouts: layouts
    };

    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(data));

  } catch (error) {
    console.error('Failed to save layouts:', error);
  }
}

/**
 * Save layout for a specific widget
 * @param {string} widgetId - Widget identifier
 * @param {Object} layout - Layout data (x, y, width, height, zIndex)
 */
export function saveWidgetLayout(widgetId, layout) {
  const layouts = loadLayouts() || {};
  layouts[widgetId] = layout;
  saveLayouts(layouts);
}

/**
 * Remove a widget's layout from storage
 * @param {string} widgetId - Widget identifier
 */
export function removeWidgetLayout(widgetId) {
  const layouts = loadLayouts();
  if (layouts && layouts[widgetId]) {
    delete layouts[widgetId];
    saveLayouts(layouts);
  }
}

/**
 * Clear all saved layouts (reset to default)
 */
export function clearAllLayouts() {
  localStorage.removeItem(LAYOUT_STORAGE_KEY);
}

/**
 * Get current responsive breakpoint
 * @returns {string} Breakpoint name
 */
function getCurrentBreakpoint() {
  const width = window.innerWidth;

  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Export layouts as JSON (for backup/sharing)
 * @returns {string} JSON string of all layouts
 */
export function exportLayouts() {
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
  return stored || '{}';
}

/**
 * Import layouts from JSON (for restore/sharing)
 * @param {string} jsonString - JSON string of layouts
 * @returns {boolean} Success status
 */
export function importLayouts(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    if (data.version && data.layouts) {
      localStorage.setItem(LAYOUT_STORAGE_KEY, jsonString);
      return true;
    }

    return false;

  } catch (error) {
    console.error('Failed to import layouts:', error);
    return false;
  }
}
