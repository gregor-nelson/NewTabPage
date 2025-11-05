// optionsStrategies.js - Common options strategies definitions

/**
 * Strategy definitions with leg configurations
 */
export const strategies = {
    'long-call': {
        name: 'Long Call',
        legs: [
            { type: 'call', action: 'buy', quantity: 1 }
        ]
    },
    'long-put': {
        name: 'Long Put',
        legs: [
            { type: 'put', action: 'buy', quantity: 1 }
        ]
    },
    'covered-call': {
        name: 'Covered Call',
        legs: [
            { type: 'stock', action: 'buy', quantity: 100 },
            { type: 'call', action: 'sell', quantity: 1 }
        ]
    },
    'protective-put': {
        name: 'Protective Put',
        legs: [
            { type: 'stock', action: 'buy', quantity: 100 },
            { type: 'put', action: 'buy', quantity: 1 }
        ]
    },
    'bull-call-spread': {
        name: 'Bull Call Spread',
        legs: [
            { type: 'call', action: 'buy', quantity: 1, strikeOffset: 0 },
            { type: 'call', action: 'sell', quantity: 1, strikeOffset: 5 }
        ]
    },
    'bear-put-spread': {
        name: 'Bear Put Spread',
        legs: [
            { type: 'put', action: 'buy', quantity: 1, strikeOffset: 0 },
            { type: 'put', action: 'sell', quantity: 1, strikeOffset: -5 }
        ]
    },
    'long-straddle': {
        name: 'Long Straddle',
        legs: [
            { type: 'call', action: 'buy', quantity: 1 },
            { type: 'put', action: 'buy', quantity: 1 }
        ]
    },
    'short-straddle': {
        name: 'Short Straddle',
        legs: [
            { type: 'call', action: 'sell', quantity: 1 },
            { type: 'put', action: 'sell', quantity: 1 }
        ]
    },
    'iron-condor': {
        name: 'Iron Condor',
        legs: [
            { type: 'put', action: 'buy', quantity: 1, strikeOffset: -10 },
            { type: 'put', action: 'sell', quantity: 1, strikeOffset: -5 },
            { type: 'call', action: 'sell', quantity: 1, strikeOffset: 5 },
            { type: 'call', action: 'buy', quantity: 1, strikeOffset: 10 }
        ]
    },
    'butterfly': {
        name: 'Butterfly Spread',
        legs: [
            { type: 'call', action: 'buy', quantity: 1, strikeOffset: -5 },
            { type: 'call', action: 'sell', quantity: 2, strikeOffset: 0 },
            { type: 'call', action: 'buy', quantity: 1, strikeOffset: 5 }
        ]
    }
};

/**
 * Get list of strategy names for dropdown
 */
export function getStrategyList() {
    return Object.keys(strategies).map(key => ({
        id: key,
        name: strategies[key].name
    }));
}

/**
 * Get strategy definition by ID
 */
export function getStrategy(strategyId) {
    return strategies[strategyId] || null;
}

/**
 * Check if strategy is simple (single leg)
 */
export function isSimpleStrategy(strategyId) {
    const strategy = strategies[strategyId];
    if (!strategy) return false;
    return strategy.legs.length === 1 && strategy.legs[0].type !== 'stock';
}
