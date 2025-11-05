// calculatorCore.js - Expression parser and evaluator

/**
 * Safe expression evaluator using Function constructor
 * Supports: +, -, *, /, %, ^, (), sqrt, sin, cos, tan, log, ln, pi, e
 */

// Math constants and functions
const mathContext = {
    pi: Math.PI,
    e: Math.E,
    sqrt: Math.sqrt,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    log: Math.log10,
    ln: Math.log,
    abs: Math.abs,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    pow: Math.pow
};

/**
 * Parse and evaluate mathematical expression
 * @param {string} expression - Mathematical expression
 * @param {number} previousResult - Previous calculation result (for 'ans')
 * @returns {number} Result of calculation
 */
export function evaluate(expression, previousResult = null) {
    try {
        // Clean the expression
        let cleaned = expression.trim().toLowerCase();

        // Handle empty expression
        if (!cleaned) {
            throw new Error('Empty expression');
        }

        // Replace 'ans' or '_' with previous result
        if (previousResult !== null) {
            cleaned = cleaned.replace(/\bans\b/g, previousResult);
            cleaned = cleaned.replace(/\b_\b/g, previousResult);
        }

        // Replace ^ with ** for exponentiation
        cleaned = cleaned.replace(/\^/g, '**');

        // Security: Only allow safe characters
        if (!/^[0-9+\-*/(). epilosqrtancbdflw,]+$/.test(cleaned)) {
            throw new Error('Invalid characters in expression');
        }

        // Build safe evaluation function
        const paramNames = Object.keys(mathContext);
        const paramValues = Object.values(mathContext);

        // Create function with math context
        const fn = new Function(...paramNames, `"use strict"; return (${cleaned});`);
        const result = fn(...paramValues);

        // Validate result
        if (typeof result !== 'number' || !isFinite(result)) {
            throw new Error('Invalid result');
        }

        return result;

    } catch (error) {
        console.error('Calculation error:', error);
        throw new Error('Invalid expression');
    }
}

/**
 * Format number for display
 * @param {number} value - Number to format
 * @param {number} decimals - Decimal places (default: auto)
 * @returns {string} Formatted number
 */
export function formatNumber(value, decimals = null) {
    if (!isFinite(value)) {
        return 'Error';
    }

    // Auto-determine decimals if not specified
    if (decimals === null) {
        // Show up to 8 decimals, but remove trailing zeros
        const str = value.toFixed(8);
        return parseFloat(str).toString();
    }

    return value.toFixed(decimals);
}

/**
 * Check if expression is valid (without evaluating)
 * @param {string} expression - Expression to validate
 * @returns {boolean} True if valid
 */
export function isValidExpression(expression) {
    try {
        // Basic validation: balanced parentheses
        let depth = 0;
        for (const char of expression) {
            if (char === '(') depth++;
            if (char === ')') depth--;
            if (depth < 0) return false;
        }
        if (depth !== 0) return false;

        // Check for valid characters
        const cleaned = expression.toLowerCase();
        return /^[0-9+\-*/(). epilosqrtancbdflw,^]+$/.test(cleaned);

    } catch {
        return false;
    }
}
