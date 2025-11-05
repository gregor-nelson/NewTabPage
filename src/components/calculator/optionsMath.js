// optionsMath.js - Options pricing mathematics (Black-Scholes model)

/**
 * Standard normal cumulative distribution function
 * @param {number} x - Input value
 * @returns {number} CDF value
 */
function normalCDF(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return x > 0 ? 1 - probability : probability;
}

/**
 * Standard normal probability density function
 * @param {number} x - Input value
 * @returns {number} PDF value
 */
function normalPDF(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Calculate d1 parameter for Black-Scholes
 */
function calculateD1(S, K, T, r, sigma) {
    return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
}

/**
 * Calculate d2 parameter for Black-Scholes
 */
function calculateD2(d1, sigma, T) {
    return d1 - sigma * Math.sqrt(T);
}

/**
 * Black-Scholes option pricing model
 * @param {number} S - Current stock price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiration (in years)
 * @param {number} r - Risk-free interest rate (annual, as decimal, e.g., 0.05 for 5%)
 * @param {number} sigma - Implied volatility (annual, as decimal, e.g., 0.30 for 30%)
 * @param {string} type - 'call' or 'put'
 * @returns {number} Option price
 */
export function blackScholes(S, K, T, r, sigma, type) {
    // Handle edge cases
    if (T <= 0) {
        // At expiration, return intrinsic value
        if (type === 'call') {
            return Math.max(0, S - K);
        } else {
            return Math.max(0, K - S);
        }
    }

    if (sigma <= 0) {
        // No volatility, return intrinsic value
        if (type === 'call') {
            return Math.max(0, S - K);
        } else {
            return Math.max(0, K - S);
        }
    }

    const d1 = calculateD1(S, K, T, r, sigma);
    const d2 = calculateD2(d1, sigma, T);

    if (type === 'call') {
        return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
    } else {
        return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
    }
}

/**
 * Calculate option Greeks
 * @param {number} S - Current stock price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiration (years)
 * @param {number} r - Risk-free rate
 * @param {number} sigma - Implied volatility
 * @param {string} type - 'call' or 'put'
 * @returns {Object} Greeks {delta, gamma, theta, vega}
 */
export function calculateGreeks(S, K, T, r, sigma, type) {
    if (T <= 0) {
        return { delta: 0, gamma: 0, theta: 0, vega: 0 };
    }

    const d1 = calculateD1(S, K, T, r, sigma);
    const d2 = calculateD2(d1, sigma, T);
    const pdf_d1 = normalPDF(d1);

    // Delta
    let delta;
    if (type === 'call') {
        delta = normalCDF(d1);
    } else {
        delta = normalCDF(d1) - 1;
    }

    // Gamma (same for calls and puts)
    const gamma = pdf_d1 / (S * sigma * Math.sqrt(T));

    // Theta (per day)
    let theta;
    const term1 = -(S * pdf_d1 * sigma) / (2 * Math.sqrt(T));
    if (type === 'call') {
        const term2 = r * K * Math.exp(-r * T) * normalCDF(d2);
        theta = (term1 - term2) / 365; // Convert to per-day
    } else {
        const term2 = r * K * Math.exp(-r * T) * normalCDF(-d2);
        theta = (term1 + term2) / 365; // Convert to per-day
    }

    // Vega (per 1% change in volatility)
    const vega = (S * pdf_d1 * Math.sqrt(T)) / 100;

    return { delta, gamma, theta, vega };
}

/**
 * Calculate intrinsic value of option
 * @param {number} S - Current stock price
 * @param {number} K - Strike price
 * @param {string} type - 'call' or 'put'
 * @returns {number} Intrinsic value
 */
export function intrinsicValue(S, K, type) {
    if (type === 'call') {
        return Math.max(0, S - K);
    } else {
        return Math.max(0, K - S);
    }
}

/**
 * Calculate time value of option
 * @param {number} optionPrice - Current option price
 * @param {number} S - Current stock price
 * @param {number} K - Strike price
 * @param {string} type - 'call' or 'put'
 * @returns {number} Time value
 */
export function timeValue(optionPrice, S, K, type) {
    return optionPrice - intrinsicValue(S, K, type);
}

/**
 * Calculate breakeven price for a long position
 * @param {number} K - Strike price
 * @param {number} premium - Option premium paid
 * @param {string} type - 'call' or 'put'
 * @returns {number} Breakeven price
 */
export function breakeven(K, premium, type) {
    if (type === 'call') {
        return K + premium;
    } else {
        return K - premium;
    }
}

/**
 * Calculate profit/loss for an option position
 * @param {number} S - Current stock price
 * @param {number} K - Strike price
 * @param {number} premium - Premium paid (positive for long, negative for short)
 * @param {string} type - 'call' or 'put'
 * @param {number} quantity - Number of contracts
 * @returns {number} P&L in dollars
 */
export function calculatePL(S, K, premium, type, quantity = 1) {
    const multiplier = 100; // Standard contract multiplier
    const intrinsic = intrinsicValue(S, K, type);
    const contractValue = intrinsic * multiplier;
    const costBasis = premium * multiplier * quantity;

    return (contractValue * quantity) - costBasis;
}

/**
 * Calculate probability of profit (simplified)
 * Uses normal distribution approximation
 * @param {number} S - Current stock price
 * @param {number} breakeven - Breakeven price
 * @param {number} sigma - Implied volatility
 * @param {number} T - Time to expiration (years)
 * @param {string} type - 'call' or 'put'
 * @returns {number} Probability (0-1)
 */
export function probabilityOfProfit(S, breakeven, sigma, T, type) {
    if (T <= 0) {
        // At expiration
        if (type === 'call') {
            return S > breakeven ? 1 : 0;
        } else {
            return S < breakeven ? 1 : 0;
        }
    }

    // Calculate z-score
    const drift = 0; // Assume no drift for simplicity
    const stdDev = sigma * Math.sqrt(T);
    const z = (Math.log(breakeven / S) - drift) / stdDev;

    if (type === 'call') {
        return 1 - normalCDF(z);
    } else {
        return normalCDF(z);
    }
}

/**
 * Convert days to years for time calculations
 * @param {number} days - Number of days
 * @returns {number} Years
 */
export function daysToYears(days) {
    return days / 365;
}

/**
 * Convert annual rate to decimal
 * @param {number} percentage - Rate as percentage (e.g., 5 for 5%)
 * @returns {number} Decimal (e.g., 0.05)
 */
export function percentToDecimal(percentage) {
    return percentage / 100;
}
