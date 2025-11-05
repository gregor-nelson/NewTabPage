// calculatorHistory.js - Calculation history management

const STORAGE_KEY = 'calculatorHistory';
const MAX_HISTORY = 50;

let history = [];

/**
 * Load history from localStorage
 */
export function loadHistory() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            history = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Failed to load calculator history:', error);
        history = [];
    }
}

/**
 * Save history to localStorage
 */
function saveHistory() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
        console.error('Failed to save calculator history:', error);
    }
}

/**
 * Add calculation to history
 * @param {string} expression - The expression
 * @param {number} result - The result
 */
export function addToHistory(expression, result) {
    const entry = {
        expression,
        result,
        timestamp: Date.now()
    };

    // Add to beginning of array
    history.unshift(entry);

    // Keep only MAX_HISTORY items
    if (history.length > MAX_HISTORY) {
        history = history.slice(0, MAX_HISTORY);
    }

    saveHistory();
}

/**
 * Get history entries
 * @param {number} limit - Maximum number of entries to return
 * @returns {Array} History entries
 */
export function getHistory(limit = 10) {
    return history.slice(0, limit);
}

/**
 * Clear all history
 */
export function clearHistory() {
    history = [];
    saveHistory();
}

/**
 * Get last result
 * @returns {number|null} Last calculation result
 */
export function getLastResult() {
    if (history.length === 0) return null;
    return history[0].result;
}

// Initialize on load
loadHistory();
