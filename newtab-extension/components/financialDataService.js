// financialDataService.js - Yahoo Finance API integration

// Constants
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache (only fetch on page reload)
const FETCH_THROTTLE = 60 * 1000; // 60 seconds between fetches for same symbol
const STAGGER_DELAY = 300; // 300ms between staggered requests
const YAHOO_API_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';

// Asset configurations with Yahoo Finance symbols
const ASSET_CONFIGS = [
    {
        symbol: 'GOLD',
        name: 'Gold',
        yahooSymbol: 'GC=F',
        icon: 'ph-coins',
        category: 'commodity',
        formatPrice: (price) => new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(price)
    },
    {
        symbol: 'WTI',
        name: 'WTI Crude',
        yahooSymbol: 'CL=F',
        icon: 'ph-drop',
        category: 'commodity',
        formatPrice: (price) => new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(price)
    },
    {
        symbol: '10Y',
        name: '10Y T-Bill',
        yahooSymbol: '^TNX',
        icon: 'ph-bank',
        category: 'bond',
        formatPrice: (price) => `${price.toFixed(4)}%`
    },
    {
        symbol: 'GILT30',
        name: 'UK 30Y Gilt',
        yahooSymbol: '^TYX',
        icon: 'ph-bank',
        category: 'bond',
        formatPrice: (price) => `${price.toFixed(4)}%`
    },
    {
        symbol: 'VIX',
        name: 'VIX',
        yahooSymbol: '^VIX',
        icon: 'ph-chart-line',
        category: 'index',
        formatPrice: (price) => price.toFixed(2)
    },
    {
        symbol: 'NVDA',
        name: 'NVIDIA',
        yahooSymbol: 'NVDA',
        icon: 'ph-cpu',
        category: 'stock',
        formatPrice: (price) => new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(price)
    },
    {
        symbol: 'GBPUSD',
        name: 'GBP/USD',
        yahooSymbol: 'USDGBP=X',
        icon: 'ph-currency-dollar',
        category: 'forex',
        formatPrice: (price) => price.toFixed(4)
    }
];

// State management
let dataCache = {};
let lastFetchTimes = {};
let refreshIntervalId = null;
let currentRotationIndex = 0;

// Callbacks for UI updates
let onDataUpdateCallback = null;

/**
 * Initialize the data service
 * @param {Function} onDataUpdate - Callback function when data is updated
 */
export function initDataService(onDataUpdate) {
    onDataUpdateCallback = onDataUpdate;

    // Load all cached data immediately
    loadAllCachedData();

    // Start staggered fetch for all assets (only on init/page reload)
    startStaggeredFetch();

    // NOTE: Automatic refresh disabled to avoid rate limiting
    // Data will only refresh on page reload
}

/**
 * Load cached data for all assets
 */
function loadAllCachedData() {
    ASSET_CONFIGS.forEach(asset => {
        const cachedData = getCachedData(asset.symbol);
        if (cachedData) {
            dataCache[asset.symbol] = {
                ...cachedData,
                isLoading: false
            };

            // Notify UI immediately with cached data
            if (onDataUpdateCallback) {
                onDataUpdateCallback(asset.symbol, dataCache[asset.symbol]);
            }
        } else {
            // Initialize with loading state
            dataCache[asset.symbol] = {
                currentPrice: 0,
                change: 0,
                changePercent: 0,
                trend: 'neutral',
                isLoading: true,
                error: null,
                lastUpdated: null
            };
        }
    });
}

/**
 * Get cached data from localStorage
 */
function getCachedData(symbol) {
    try {
        const cachedStr = localStorage.getItem(`financial_${symbol}_data`);
        if (!cachedStr) return null;

        const cached = JSON.parse(cachedStr);

        // Check if cache is still valid
        if (Date.now() - cached.timestamp <= CACHE_DURATION) {
            return {
                currentPrice: cached.currentPrice,
                change: cached.change,
                changePercent: cached.changePercent,
                trend: cached.trend,
                lastUpdated: cached.timestamp
            };
        }
    } catch (error) {
        console.error(`Error reading cache for ${symbol}:`, error);
    }
    return null;
}

/**
 * Store data in localStorage
 */
function setCachedData(symbol, data) {
    try {
        const cacheData = {
            currentPrice: data.currentPrice,
            change: data.change,
            changePercent: data.changePercent,
            trend: data.trend,
            timestamp: Date.now()
        };
        localStorage.setItem(`financial_${symbol}_data`, JSON.stringify(cacheData));
    } catch (error) {
        console.error(`Error caching data for ${symbol}:`, error);
    }
}

/**
 * Start staggered fetch for all assets
 */
function startStaggeredFetch() {
    ASSET_CONFIGS.forEach((asset, index) => {
        setTimeout(() => {
            fetchAssetData(asset);
        }, index * STAGGER_DELAY);
    });
}

/**
 * Fetch data for a specific asset
 */
async function fetchAssetData(asset) {
    const now = Date.now();
    const lastFetch = lastFetchTimes[asset.symbol];

    // Throttle: Skip if fetched recently
    if (lastFetch && now - lastFetch < FETCH_THROTTLE) {
        return;
    }

    // Update last fetch time
    lastFetchTimes[asset.symbol] = now;

    // Update loading state
    dataCache[asset.symbol] = {
        ...dataCache[asset.symbol],
        isLoading: true
    };

    try {
        // Use chart API with minimal time range (just need current data)
        const endDate = Math.floor(now / 1000);
        const startDate = endDate - (2 * 24 * 60 * 60); // Last 2 days
        const url = `${YAHOO_API_BASE}${asset.yahooSymbol}?period1=${startDate}&period2=${endDate}&interval=1d`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();

        if (!result.chart?.result?.[0]) {
            throw new Error('No data available in response');
        }

        const chartData = result.chart.result[0];
        const meta = chartData.meta;

        // Extract data from time series (more accurate for daily changes)
        const quotes = chartData.indicators?.quote?.[0];
        const closes = quotes?.close || [];

        // Get current price and previous close from the time series
        let currentPrice = meta.regularMarketPrice || 0;
        let previousClose = 0;

        // If we have close data, use the last two values
        if (closes.length >= 2) {
            // Filter out null values
            const validCloses = closes.filter(c => c !== null && c !== undefined);
            if (validCloses.length >= 2) {
                currentPrice = validCloses[validCloses.length - 1];
                previousClose = validCloses[validCloses.length - 2];
            } else if (validCloses.length === 1) {
                currentPrice = validCloses[0];
                previousClose = meta.chartPreviousClose || meta.previousClose || 0;
            }
        } else {
            // Fallback to meta data if no time series available
            currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
            previousClose = meta.chartPreviousClose || meta.previousClose || 0;
        }

        // Calculate change
        const change = currentPrice - previousClose;
        const changePercent = previousClose !== 0 ? ((change / previousClose) * 100) : 0;

        // Determine trend
        const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

        // Update cache
        const newData = {
            currentPrice,
            change,
            changePercent,
            trend,
            isLoading: false,
            error: null,
            lastUpdated: now
        };

        dataCache[asset.symbol] = newData;
        setCachedData(asset.symbol, newData);

        // Notify UI
        if (onDataUpdateCallback) {
            onDataUpdateCallback(asset.symbol, newData);
        }

    } catch (error) {
        console.error(`Error fetching ${asset.symbol}:`, error);

        const errorData = {
            ...dataCache[asset.symbol],
            isLoading: false,
            error: error.message
        };

        dataCache[asset.symbol] = errorData;

        // Notify UI with error
        if (onDataUpdateCallback) {
            onDataUpdateCallback(asset.symbol, errorData);
        }
    }
}

/**
 * Start rotating refresh interval
 * DISABLED: To avoid rate limiting from Yahoo Finance API
 */
// function startRotatingRefresh() {
//     refreshIntervalId = setInterval(() => {
//         const asset = ASSET_CONFIGS[currentRotationIndex];
//         fetchAssetData(asset);
//         currentRotationIndex = (currentRotationIndex + 1) % ASSET_CONFIGS.length;
//     }, REFRESH_INTERVAL);
// }

/**
 * Setup visibility change listener
 * DISABLED: To avoid rate limiting from Yahoo Finance API
 */
// function setupVisibilityListener() {
//     document.addEventListener('visibilitychange', handleVisibilityChange);
// }

/**
 * Handle visibility change event
 * DISABLED: To avoid rate limiting from Yahoo Finance API
 */
// function handleVisibilityChange() {
//     if (document.visibilityState === 'visible') {
//         const now = Date.now();
//         ASSET_CONFIGS.forEach((asset, index) => {
//             const lastFetch = lastFetchTimes[asset.symbol];
//             if (!lastFetch || now - lastFetch > 30000) {
//                 setTimeout(() => {
//                     fetchAssetData(asset);
//                 }, index * STAGGER_DELAY);
//             }
//         });
//     }
// }

/**
 * Get current data for a specific asset
 */
export function getAssetData(symbol) {
    return dataCache[symbol] || null;
}

/**
 * Get all asset data formatted for display
 */
export function getAllAssetData() {
    return ASSET_CONFIGS.map(asset => {
        const data = dataCache[asset.symbol] || {};

        return {
            symbol: asset.symbol,
            label: asset.name,
            value: asset.formatPrice(data.currentPrice || 0),
            change: formatChange(data.change || 0),
            changePercent: formatChangePercent(data.changePercent || 0),
            trend: data.trend || 'neutral',
            icon: asset.icon,
            category: asset.category,
            isLoading: data.isLoading || false,
            error: data.error || null
        };
    });
}

/**
 * Format change value
 */
function formatChange(change) {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
}

/**
 * Format change percentage
 */
function formatChangePercent(changePercent) {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(4)}%`;
}

/**
 * Get asset configuration
 */
export function getAssetConfig(symbol) {
    return ASSET_CONFIGS.find(asset => asset.symbol === symbol);
}

/**
 * Cleanup service - stop all intervals and listeners
 */
export function cleanupService() {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
    }

    // Visibility listener disabled - no need to remove
    // document.removeEventListener('visibilitychange', handleVisibilityChange);

    onDataUpdateCallback = null;
    currentRotationIndex = 0;
}

/**
 * Force refresh all assets (for testing or manual refresh)
 */
export function forceRefreshAll() {
    startStaggeredFetch();
}
