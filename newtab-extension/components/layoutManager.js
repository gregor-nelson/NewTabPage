import {
  loadWidgetLayout,
  saveWidgetLayout,
  clearAllLayouts
} from './layoutStorage.js';

// interact.js is loaded globally via script tag
const interact = window.interact;

// Debug: Check if interact loaded
if (!interact) {
  console.error('interact.js not loaded! Make sure libs/interact.min.js is included in HTML.');
} else {
  console.log('interact.js loaded successfully');
}

// Store all widget positions (in-memory cache)
const widgetPositions = new Map();

// Debounce timer for saving
let saveTimeout = null;
const SAVE_DEBOUNCE_MS = 500;

// Track if modifier key is held (for drag anywhere)
let isModifierKeyHeld = false;

/**
 * Initialize custom layout system for all widgets
 * @param {Map} widgetRegistry - Map of registered widgets
 */
export function initializeCustomLayout(widgetRegistry) {
  // Enable custom layout mode
  document.body.classList.add('custom-layout-mode');

  // Set up modifier key listeners
  setupModifierKeyListeners();

  // Apply to each registered widget
  widgetRegistry.forEach((widgetConfig, widgetId) => {
    const container = document.getElementById(widgetConfig.containerId);

    if (container) {
      initializeWidget(widgetId, container, widgetConfig);
    }
  });
}

/**
 * Set up keyboard and mouse listeners for Ctrl + Right Click drag mode
 */
function setupModifierKeyListeners() {
  // Listen for Ctrl key press
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
      if (!isModifierKeyHeld) {
        isModifierKeyHeld = true;
        document.body.classList.add('drag-mode-active');
        console.log('Drag anywhere mode: ENABLED (Ctrl + Right Click to drag)');
      }
    }
  });

  // Listen for Ctrl key release
  document.addEventListener('keyup', (e) => {
    if (!e.ctrlKey) {
      if (isModifierKeyHeld) {
        isModifierKeyHeld = false;
        document.body.classList.remove('drag-mode-active');
        console.log('Drag anywhere mode: DISABLED');
      }
    }
  });

  // Prevent context menu when Ctrl is held (we're using right click for dragging)
  document.addEventListener('contextmenu', (e) => {
    if (e.ctrlKey && document.body.classList.contains('custom-layout-mode')) {
      e.preventDefault();
      return false;
    }
  });

  // Also handle window blur (in case user switches windows while holding key)
  window.addEventListener('blur', () => {
    if (isModifierKeyHeld) {
      isModifierKeyHeld = false;
      document.body.classList.remove('drag-mode-active');
    }
  });
}

/**
 * Initialize layout behavior for a single widget
 * @param {string} widgetId - Widget identifier
 * @param {HTMLElement} container - Widget DOM element
 * @param {Object} config - Widget configuration
 */
function initializeWidget(widgetId, container, config) {
  console.log(`Initializing layout for widget: ${widgetId}`);

  // Merge widget layout config with defaults
  const layoutConfig = getLayoutConfig(config);

  // Load saved position or use default
  const savedLayout = loadWidgetLayout(widgetId);
  const position = savedLayout || getDefaultPosition(layoutConfig);

  console.log(`Widget ${widgetId} position:`, position);

  // Apply position to DOM
  applyPosition(container, position);

  // Store in memory
  widgetPositions.set(widgetId, position);

  // Make draggable if enabled
  if (layoutConfig.draggable) {
    makeDraggable(widgetId, container, layoutConfig, config);
  }

  // Make resizable if enabled
  if (layoutConfig.resizable) {
    makeResizable(widgetId, container, layoutConfig, config);
  }

  // Add visual indicators
  addLayoutControls(container, layoutConfig);
}

/**
 * Make widget draggable using interact.js
 * @param {string} widgetId - Widget identifier
 * @param {HTMLElement} container - Widget DOM element
 * @param {Object} layoutConfig - Layout configuration
 * @param {Object} widgetConfig - Full widget configuration
 */
function makeDraggable(widgetId, container, layoutConfig, widgetConfig) {
  const dragHandle = layoutConfig.dragHandle
    ? container.querySelector(layoutConfig.dragHandle)
    : null;

  interact(container)
    .draggable({
      // Allow dragging from anywhere, we'll control it manually
      allowFrom: null,

      // Ignore dragging from certain elements (inputs, buttons, etc.)
      ignoreFrom: 'input, textarea, button, select, a',

      // Manual check if drag should start
      manualStart: false,

      // Enable inertial throwing (optional)
      inertia: false,

      // No restrictions - allow widgets to occupy entire viewport
      modifiers: [],

      // Auto-scroll when near edge (optional)
      autoScroll: false,

      // Callbacks
      listeners: {
        start: (event) => {
          // Only allow drag if:
          // 1. Ctrl key is held (for drag from anywhere), OR
          // 2. Drag started from the drag handle (if one exists)
          const isDragHandle = dragHandle && (event.target === dragHandle || dragHandle.contains(event.target));

          if (!isModifierKeyHeld && !isDragHandle) {
            // Prevent drag from starting
            event.interaction.stop();
            return;
          }

          onDragStart(widgetId, event, widgetConfig);
        },
        move: (event) => onDragMove(widgetId, event, widgetConfig),
        end: (event) => onDragEnd(widgetId, event, widgetConfig)
      }
    });

  // Change cursor on drag handle (only if it exists)
  if (dragHandle) {
    dragHandle.style.cursor = 'grab';
    dragHandle.addEventListener('mousedown', () => {
      dragHandle.style.cursor = 'grabbing';
    });
    dragHandle.addEventListener('mouseup', () => {
      dragHandle.style.cursor = 'grab';
    });
    console.log(`Drag enabled for ${widgetId} (drag from header OR Ctrl + Right Click)`);
  } else {
    console.log(`Drag enabled for ${widgetId} (Ctrl + Right Click only)`);
  }
}

/**
 * Make widget resizable using interact.js
 * @param {string} widgetId - Widget identifier
 * @param {HTMLElement} container - Widget DOM element
 * @param {Object} layoutConfig - Layout configuration
 * @param {Object} widgetConfig - Full widget configuration
 */
function makeResizable(widgetId, container, layoutConfig, widgetConfig) {
  const resizableConfig = layoutConfig.resizable;
  const canResizeWidth = typeof resizableConfig === 'object' ? resizableConfig.width !== false : true;
  const canResizeHeight = typeof resizableConfig === 'object' ? resizableConfig.height !== false : true;

  interact(container)
    .resizable({
      // Resize from edges/corners
      edges: {
        left: false,
        right: canResizeWidth,
        bottom: canResizeHeight,
        top: false
      },

      // Make resize edges more forgiving (20px margin from edge)
      margin: 20,

      // Modifiers
      modifiers: [
        // Only minimum size restriction, no maximum (allow full viewport size)
        interact.modifiers.restrictSize({
          min: {
            width: layoutConfig.minSize?.width || 200,
            height: layoutConfig.minSize?.height || 150
          }
          // No max - widgets can be as large as needed
        })
      ],

      // Inertia (optional)
      inertia: false,

      // Callbacks
      listeners: {
        start: (event) => onResizeStart(widgetId, event, widgetConfig),
        move: (event) => onResizeMove(widgetId, event, widgetConfig),
        end: (event) => onResizeEnd(widgetId, event, widgetConfig)
      }
    });

  console.log(`Resize enabled for ${widgetId}`);
}

/**
 * Drag start handler
 */
function onDragStart(widgetId, event, config) {
  const container = event.target;
  container.classList.add('dragging');

  // Bring to front
  container.style.zIndex = 1000;

  // Call widget lifecycle hook if exists
  if (config.onDragStart) {
    config.onDragStart(widgetId, event);
  }
}

/**
 * Drag move handler
 */
function onDragMove(widgetId, event, config) {
  const container = event.target;
  const position = widgetPositions.get(widgetId);

  // Update position
  position.x += event.dx;
  position.y += event.dy;

  // Apply transform
  container.style.transform = `translate(${position.x}px, ${position.y}px)`;

  // Update in-memory cache
  widgetPositions.set(widgetId, position);
}

/**
 * Drag end handler
 */
function onDragEnd(widgetId, event, config) {
  const container = event.target;
  container.classList.remove('dragging');

  // Reset z-index
  const position = widgetPositions.get(widgetId);
  container.style.zIndex = position.zIndex || 'auto';

  // Save to localStorage (debounced)
  debounceSave(widgetId, position);

  // Call widget lifecycle hook if exists
  if (config.onDragEnd) {
    config.onDragEnd(widgetId, position, event);
  }
}

/**
 * Resize start handler
 */
function onResizeStart(widgetId, event, config) {
  const container = event.target;
  container.classList.add('resizing');

  // Call widget lifecycle hook if exists
  if (config.onResizeStart) {
    config.onResizeStart(widgetId, event);
  }
}

/**
 * Resize move handler
 */
function onResizeMove(widgetId, event, config) {
  const container = event.target;
  const position = widgetPositions.get(widgetId);

  // Update size
  position.width = event.rect.width;
  position.height = event.rect.height;

  // Update position (for edges that move the widget)
  position.x += event.deltaRect.left;
  position.y += event.deltaRect.top;

  // Apply size and position
  container.style.width = `${position.width}px`;
  container.style.height = `${position.height}px`;
  container.style.transform = `translate(${position.x}px, ${position.y}px)`;

  // Update in-memory cache
  widgetPositions.set(widgetId, position);

  // Call widget lifecycle hook if exists (throttled)
  if (config.onResize) {
    config.onResize(widgetId, position, event);
  }
}

/**
 * Resize end handler
 */
function onResizeEnd(widgetId, event, config) {
  const container = event.target;
  container.classList.remove('resizing');

  const position = widgetPositions.get(widgetId);

  // Save to localStorage (debounced)
  debounceSave(widgetId, position);

  // Call widget lifecycle hook if exists
  if (config.onResizeEnd) {
    config.onResizeEnd(widgetId, position, event);
  }
}

/**
 * Debounced save to localStorage
 * @param {string} widgetId - Widget identifier
 * @param {Object} position - Position data
 */
function debounceSave(widgetId, position) {
  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    saveWidgetLayout(widgetId, position);
    console.log(`Saved layout for ${widgetId}:`, position);
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Apply position to DOM element
 * @param {HTMLElement} container - Widget container
 * @param {Object} position - Position data
 */
function applyPosition(container, position) {
  container.style.position = 'absolute';
  container.style.width = `${position.width}px`;
  container.style.height = `${position.height}px`;
  container.style.transform = `translate(${position.x}px, ${position.y}px)`;
  container.style.zIndex = position.zIndex || 'auto';
}

/**
 * Get layout configuration with defaults
 * @param {Object} widgetConfig - Widget configuration
 * @returns {Object} Merged layout config
 */
function getLayoutConfig(widgetConfig) {
  const defaults = {
    draggable: true,
    resizable: true,
    dragHandle: '.widget-header',
    minSize: { width: 200, height: 150 },
    // No maxSize default - widgets can occupy full viewport
    defaultPosition: { x: 100, y: 100 },
    defaultSize: { width: 400, height: 300 }
  };

  return { ...defaults, ...(widgetConfig.layout || {}) };
}

/**
 * Get default position for a widget
 * @param {Object} config - Layout configuration
 * @returns {Object} Position object
 */
function getDefaultPosition(config) {
  const defaultPos = config.defaultPosition || { x: 100, y: 100 };
  const defaultSize = config.defaultSize || { width: 400, height: 300 };

  return {
    x: parseValue(defaultPos.x, window.innerWidth),
    y: parseValue(defaultPos.y, window.innerHeight),
    width: parseValue(defaultSize.width, window.innerWidth),
    height: parseValue(defaultSize.height, window.innerHeight),
    zIndex: config.zIndex || 1
  };
}

/**
 * Parse position/size values (handles percentages and pixels)
 * @param {string|number} value - Value to parse
 * @param {number} reference - Reference value for percentages
 * @returns {number} Pixel value
 */
function parseValue(value, reference) {
  if (typeof value === 'string' && value.includes('%')) {
    return (parseFloat(value) / 100) * reference;
  }
  return parseFloat(value);
}

/**
 * Add visual controls to widget (drag handle, resize indicators)
 * @param {HTMLElement} container - Widget container
 * @param {Object} config - Layout configuration
 */
function addLayoutControls(container, config) {
  container.classList.add('layout-enabled');

  // Add resize handle visual indicator
  if (config.resizable) {
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    container.appendChild(resizeHandle);
  }
}

/**
 * Reset all widgets to default layout
 */
export function resetLayout() {
  clearAllLayouts();
  widgetPositions.clear();
  window.location.reload();  // Reload to apply defaults
}

/**
 * Disable custom layout mode
 */
export function disableCustomLayout() {
  document.body.classList.remove('custom-layout-mode');
  const widgets = document.querySelectorAll('.widget');
  widgets.forEach(widget => {
    interact(widget).unset();  // Remove interact.js from all widgets
  });
  window.location.reload();  // Reload to apply grid layout
}
