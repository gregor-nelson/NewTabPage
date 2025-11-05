// optionsGrid.js - P&L grid/heatmap generator

import { blackScholes, calculatePL, daysToYears, percentToDecimal } from './optionsMath.js';

/**
 * Generate price range around current price
 * @param {number} currentPrice - Current stock price
 * @param {number} rangePercent - Range as percentage (e.g., 15 for ±15%)
 * @param {number} steps - Number of price steps
 * @returns {Array<number>} Array of prices
 */
export function generatePriceRange(currentPrice, rangePercent = 20, steps = 15) {
    const prices = [];
    const stepSize = (currentPrice * rangePercent / 100 * 2) / (steps - 1);
    const minPrice = currentPrice * (1 - rangePercent / 100);

    for (let i = 0; i < steps; i++) {
        const price = minPrice + (stepSize * i);
        prices.push(Math.round(price * 100) / 100); // Round to 2 decimals
    }

    return prices;
}

/**
 * Generate time periods (dates) from now until expiration
 * @param {number} daysToExpiration - Days until expiration
 * @param {number} steps - Number of time steps
 * @returns {Array<Object>} Array of {date, daysLeft, label}
 */
export function generateTimePeriods(daysToExpiration, steps = 8) {
    const periods = [];
    const today = new Date();
    const stepSize = Math.floor(daysToExpiration / (steps - 1));

    for (let i = 0; i < steps; i++) {
        const daysAhead = i * stepSize;
        const daysLeft = daysToExpiration - daysAhead;
        const date = new Date(today);
        date.setDate(date.getDate() + daysAhead);

        periods.push({
            date: date,
            daysLeft: Math.max(0, daysLeft),
            label: formatDateLabel(date, daysLeft)
        });
    }

    return periods;
}

/**
 * Format date label for column headers
 */
function formatDateLabel(date, daysLeft) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (daysLeft === 0) {
        return 'Exp';
    }

    const month = months[date.getMonth()];
    const day = date.getDate();
    return `${month} ${day}`;
}

/**
 * Calculate P&L for entire grid
 * @param {Object} position - Option position details
 * @param {number} priceRangePercent - Price range percentage (default: 20)
 * @param {number} priceSteps - Number of price steps (default: 15)
 * @param {number} timeSteps - Number of time steps (default: 8)
 * @returns {Array<Array<number>>} 2D array of P&L values
 */
export function generatePLGrid(position, priceRangePercent = 20, priceSteps = 15, timeSteps = 8) {
    const {
        strike,
        premium,
        type,
        quantity,
        currentPrice,
        daysToExpiration,
        volatility,
        riskFreeRate = 0.05
    } = position;

    const prices = generatePriceRange(currentPrice, priceRangePercent, priceSteps);
    const periods = generateTimePeriods(daysToExpiration, timeSteps);

    const grid = [];

    for (const price of prices) {
        const row = [];

        for (const period of periods) {
            let pl;

            if (period.daysLeft === 0) {
                // At expiration, use intrinsic value
                pl = calculatePL(price, strike, premium, type, quantity);
            } else {
                // Before expiration, use Black-Scholes
                const T = daysToYears(period.daysLeft);
                const sigma = percentToDecimal(volatility);
                const r = percentToDecimal(riskFreeRate);

                const optionValue = blackScholes(price, strike, T, r, sigma, type);
                const costBasis = premium * 100 * quantity;
                pl = (optionValue * 100 * quantity) - costBasis;
            }

            row.push(Math.round(pl));
        }

        grid.push(row);
    }

    return grid;
}

/**
 * Calculate summary metrics for position
 * @param {Object} position - Option position details
 * @returns {Object} Summary metrics
 */
export function calculateSummaryMetrics(position) {
    const {
        strike,
        premium,
        type,
        quantity
    } = position;

    const multiplier = 100;
    const netDebit = premium * multiplier * quantity;

    let maxLoss, maxProfit, breakeven;

    if (type === 'call') {
        // Long call
        maxLoss = netDebit;
        maxProfit = Infinity;
        breakeven = strike + premium;
    } else {
        // Long put
        maxLoss = netDebit;
        maxProfit = (strike - premium) * multiplier * quantity;
        breakeven = strike - premium;
    }

    return {
        netDebit,
        maxLoss,
        maxProfit,
        breakeven
    };
}

/**
 * Get color for P&L cell (gradient green to red)
 * @param {number} pl - P&L value
 * @param {number} maxPL - Maximum absolute P&L for scaling
 * @returns {string} RGB color string
 */
export function getPLColor(pl, maxPL) {
    if (maxPL === 0) return 'rgb(38, 38, 38)'; // Neutral gray

    const intensity = Math.min(Math.abs(pl) / maxPL, 1);

    if (pl > 0) {
        // Green gradient
        const r = Math.round(14 + (57 - 14) * intensity);
        const g = Math.round(68 + (211 - 68) * intensity);
        const b = Math.round(41 + (83 - 41) * intensity);
        return `rgb(${r}, ${g}, ${b})`;
    } else if (pl < 0) {
        // Red gradient
        const r = Math.round(90 + (239 - 90) * intensity);
        const g = Math.round(26 + (68 - 26) * intensity);
        const b = Math.round(26 + (68 - 26) * intensity);
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        // Neutral
        return 'rgb(38, 38, 38)';
    }
}
