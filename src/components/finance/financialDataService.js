// financialDataService.js - Yahoo Finance API integration

// Constants
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache (only fetch on page reload)
const FETCH_THROTTLE = 60 * 1000; // 60 seconds between fetches for same symbol
const STAGGER_DELAY = 300; // 300ms between staggered requests
const YAHOO_API_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';

// Header indices - Major market overview
const HEADER_INDICES = [
    {
        symbol: 'SPX',
        name: 'S&P 500',
        yahooSymbol: '^GSPC',
        formatPrice: (price) => price.toFixed(2)
    },
    {
        symbol: 'NASDAQ',
        name: 'Nasdaq',
        yahooSymbol: '^IXIC',
        formatPrice: (price) => price.toFixed(2)
    },
    {
        symbol: 'DJI',
        name: 'Dow',
        yahooSymbol: '^DJI',
        formatPrice: (price) => price.toFixed(2)
    }
];

// Progressive loading phases
const LOADING_PHASES = {
    critical: 0,    // Load immediately (header indices + key metrics)
    important: 1,   // Load after 2 seconds
    secondary: 2    // Load after 8 seconds
};

// Symbol categories for organized display
const SYMBOL_CATEGORIES = {
    // Volatility metrics
    volatility: [
        {
            symbol: 'VIX',
            name: 'VIX',
            yahooSymbol: '^VIX',
            icon: 'ph-chart-line',
            category: 'volatility',
            loadPhase: LOADING_PHASES.critical,
            formatPrice: (price) => price.toFixed(2)
        },
        {
            symbol: 'VVIX',
            name: 'VVIX',
            yahooSymbol: '^VVIX',
            icon: 'ph-chart-line',
            category: 'volatility',
            loadPhase: LOADING_PHASES.important,
            formatPrice: (price) => price.toFixed(2)
        },
        {
            symbol: 'VIX9D',
            name: 'VIX 9-Day',
            yahooSymbol: '^VIX9D',
            icon: 'ph-chart-line',
            category: 'volatility',
            loadPhase: LOADING_PHASES.important,
            formatPrice: (price) => price.toFixed(2)
        },
        {
            symbol: 'VXST',
            name: 'VXST',
            yahooSymbol: '^VXST',
            icon: 'ph-chart-line',
            category: 'volatility',
            loadPhase: LOADING_PHASES.important,
            formatPrice: (price) => price.toFixed(2)
        }
    ],

    // Treasury yields
    treasuries: [
        {
            symbol: '3M',
            name: '3-Month',
            yahooSymbol: '^IRX',
            icon: 'ph-bank',
            category: 'treasuries',
            loadPhase: LOADING_PHASES.important,
            formatPrice: (price) => `${price.toFixed(3)}%`
        },
        {
            symbol: '5Y',
            name: '5-Year',
            yahooSymbol: '^FVX',
            icon: 'ph-bank',
            category: 'treasuries',
            loadPhase: LOADING_PHASES.important,
            formatPrice: (price) => `${price.toFixed(3)}%`
        },
        {
            symbol: '10Y',
            name: '10-Year',
            yahooSymbol: '^TNX',
            icon: 'ph-bank',
            category: 'treasuries',
            loadPhase: LOADING_PHASES.critical,
            formatPrice: (price) => `${price.toFixed(3)}%`
        },
        {
            symbol: '30Y',
            name: '30-Year',
            yahooSymbol: '^TYX',
            icon: 'ph-bank',
            category: 'treasuries',
            loadPhase: LOADING_PHASES.important,
            formatPrice: (price) => `${price.toFixed(3)}%`
        }
    ],

    // Currencies
    currencies: [
        {
            symbol: 'DXY',
            name: 'US Dollar Index',
            yahooSymbol: 'DX-Y.NYB',
            icon: 'ph-currency-dollar-simple',
            category: 'currencies',
            loadPhase: LOADING_PHASES.critical,
            formatPrice: (price) => price.toFixed(2)
        },
        {
            symbol: 'EURUSD',
            name: 'EUR/USD',
            yahooSymbol: 'EURUSD=X',
            icon: 'ph-currency-eur',
            category: 'currencies',
            loadPhase: LOADING_PHASES.important,
            formatPrice: (price) => price.toFixed(4)
        },
        {
            symbol: 'GBPUSD',
            name: 'GBP/USD',
            yahooSymbol: 'GBPUSD=X',
            icon: 'ph-currency-gbp',
            category: 'currencies',
            loadPhase: LOADING_PHASES.important,
            formatPrice: (price) => price.toFixed(4)
        },
        {
            symbol: 'USDJPY',
            name: 'USD/JPY',
            yahooSymbol: 'JPY=X',
            icon: 'ph-currency-jpy',
            category: 'currencies',
            loadPhase: LOADING_PHASES.important,
            formatPrice: (price) => price.toFixed(2)
        },
        {
            symbol: 'AUDUSD',
            name: 'AUD/USD',
            yahooSymbol: 'AUDUSD=X',
            icon: 'ph-currency-circle-dollar',
            category: 'currencies',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => price.toFixed(4)
        },
        {
            symbol: 'USDCAD',
            name: 'USD/CAD',
            yahooSymbol: 'USDCAD=X',
            icon: 'ph-currency-dollar',
            category: 'currencies',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => price.toFixed(4)
        }
    ],

    // Additional indices
    indicesAdditional: [
        {
            symbol: 'RUT',
            name: 'Russell 2000',
            yahooSymbol: '^RUT',
            icon: 'ph-chart-line-up',
            category: 'indices',
            loadPhase: LOADING_PHASES.critical,
            formatPrice: (price) => price.toFixed(2)
        },
        {
            symbol: 'RLG',
            name: 'Russell 1000 Growth',
            yahooSymbol: '^RLG',
            icon: 'ph-chart-line-up',
            category: 'indices',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => price.toFixed(2)
        },
        {
            symbol: 'RLV',
            name: 'Russell 1000 Value',
            yahooSymbol: '^RLV',
            icon: 'ph-chart-line-up',
            category: 'indices',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => price.toFixed(2)
        },
        {
            symbol: 'W5000',
            name: 'Wilshire 5000',
            yahooSymbol: '^W5000',
            icon: 'ph-chart-line-up',
            category: 'indices',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => price.toFixed(2)
        }
    ],

    // Commodities (additional)
    commoditiesAdditional: [
        {
            symbol: 'GOLD',
            name: 'Gold',
            yahooSymbol: 'GC=F',
            icon: 'ph-crown',
            category: 'commodities',
            loadPhase: LOADING_PHASES.important,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'SILVER',
            name: 'Silver',
            yahooSymbol: 'SI=F',
            icon: 'ph-coins',
            category: 'commodities',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'COPPER',
            name: 'Copper',
            yahooSymbol: 'HG=F',
            icon: 'ph-cube',
            category: 'commodities',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'WTI',
            name: 'WTI Crude Oil',
            yahooSymbol: 'CL=F',
            icon: 'ph-drop',
            category: 'commodities',
            loadPhase: LOADING_PHASES.important,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'CORN',
            name: 'Corn',
            yahooSymbol: 'ZC=F',
            icon: 'ph-plant',
            category: 'commodities',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'WHEAT',
            name: 'Wheat',
            yahooSymbol: 'ZW=F',
            icon: 'ph-plant',
            category: 'commodities',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        }
    ],

    // International markets
    international: [
        {
            symbol: 'FTSE',
            name: 'FTSE 100',
            yahooSymbol: '^FTSE',
            icon: 'ph-globe',
            category: 'international',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => price.toFixed(2)
        },
        {
            symbol: 'DAX',
            name: 'DAX',
            yahooSymbol: '^GDAXI',
            icon: 'ph-globe',
            category: 'international',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => price.toFixed(2)
        },
        {
            symbol: 'CAC',
            name: 'CAC 40',
            yahooSymbol: '^FCHI',
            icon: 'ph-globe',
            category: 'international',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => price.toFixed(2)
        },
        {
            symbol: 'NIKKEI',
            name: 'Nikkei 225',
            yahooSymbol: '^N225',
            icon: 'ph-globe',
            category: 'international',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => price.toFixed(2)
        },
        {
            symbol: 'SHANGHAI',
            name: 'Shanghai',
            yahooSymbol: '000001.SS',
            icon: 'ph-globe',
            category: 'international',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => price.toFixed(2)
        },
        {
            symbol: 'HSI',
            name: 'Hang Seng',
            yahooSymbol: '^HSI',
            icon: 'ph-globe',
            category: 'international',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => price.toFixed(2)
        },
        {
            symbol: 'ASX',
            name: 'ASX 200',
            yahooSymbol: '^AXJO',
            icon: 'ph-globe',
            category: 'international',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => price.toFixed(2)
        }
    ],

    // Bond ETFs
    bonds: [
        {
            symbol: 'HYG',
            name: 'High Yield Corp',
            yahooSymbol: 'HYG',
            icon: 'ph-bank',
            category: 'bonds',
            loadPhase: LOADING_PHASES.important,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'LQD',
            name: 'Inv Grade Corp',
            yahooSymbol: 'LQD',
            icon: 'ph-bank',
            category: 'bonds',
            loadPhase: LOADING_PHASES.important,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'TLT',
            name: '20Y+ Treasury',
            yahooSymbol: 'TLT',
            icon: 'ph-bank',
            category: 'bonds',
            loadPhase: LOADING_PHASES.important,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'AGG',
            name: 'Total Bond Market',
            yahooSymbol: 'AGG',
            icon: 'ph-bank',
            category: 'bonds',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'SHY',
            name: '1-3Y Treasury',
            yahooSymbol: 'SHY',
            icon: 'ph-bank',
            category: 'bonds',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        }
    ],

    // S&P 500 Sectors
    sectors: [
        {
            symbol: 'XLK',
            name: 'Technology',
            yahooSymbol: 'XLK',
            icon: 'ph-cpu',
            category: 'sectors',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'XLE',
            name: 'Energy',
            yahooSymbol: 'XLE',
            icon: 'ph-lightning',
            category: 'sectors',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'XLF',
            name: 'Financials',
            yahooSymbol: 'XLF',
            icon: 'ph-bank',
            category: 'sectors',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'XLV',
            name: 'Healthcare',
            yahooSymbol: 'XLV',
            icon: 'ph-heartbeat',
            category: 'sectors',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'XLY',
            name: 'Consumer Disc',
            yahooSymbol: 'XLY',
            icon: 'ph-shopping-cart',
            category: 'sectors',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'XLP',
            name: 'Consumer Staples',
            yahooSymbol: 'XLP',
            icon: 'ph-shopping-bag',
            category: 'sectors',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'XLI',
            name: 'Industrials',
            yahooSymbol: 'XLI',
            icon: 'ph-factory',
            category: 'sectors',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'XLB',
            name: 'Materials',
            yahooSymbol: 'XLB',
            icon: 'ph-cube',
            category: 'sectors',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'XLRE',
            name: 'Real Estate',
            yahooSymbol: 'XLRE',
            icon: 'ph-buildings',
            category: 'sectors',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'XLU',
            name: 'Utilities',
            yahooSymbol: 'XLU',
            icon: 'ph-plug',
            category: 'sectors',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        },
        {
            symbol: 'XLC',
            name: 'Communication',
            yahooSymbol: 'XLC',
            icon: 'ph-broadcast',
            category: 'sectors',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        }
    ],

    // Crypto (Bitcoin only)
    crypto: [
        {
            symbol: 'BTC',
            name: 'Bitcoin',
            yahooSymbol: 'BTC-USD',
            icon: 'ph-currency-btc',
            category: 'crypto',
            loadPhase: LOADING_PHASES.secondary,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(price)
        }
    ],

    // Legacy tracked assets (for backwards compatibility)
    legacy: [
        {
            symbol: 'NVDA',
            name: 'NVIDIA',
            yahooSymbol: 'NVDA',
            icon: 'ph-cpu',
            category: 'stock',
            loadPhase: LOADING_PHASES.critical,
            formatPrice: (price) => new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price)
        }
    ]
};

// Flatten all categories into single array
const ASSET_CONFIGS = [
    ...SYMBOL_CATEGORIES.volatility,
    ...SYMBOL_CATEGORIES.treasuries,
    ...SYMBOL_CATEGORIES.currencies,
    ...SYMBOL_CATEGORIES.indicesAdditional,
    ...SYMBOL_CATEGORIES.commoditiesAdditional,
    ...SYMBOL_CATEGORIES.international,
    ...SYMBOL_CATEGORIES.bonds,
    ...SYMBOL_CATEGORIES.sectors,
    ...SYMBOL_CATEGORIES.crypto,
    ...SYMBOL_CATEGORIES.legacy
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
    // Load header indices
    HEADER_INDICES.forEach(asset => {
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

    // Load tracked assets
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
 * Start progressive fetch for all assets in phases
 * Phase 0 (Critical): Load immediately - header indices + key metrics
 * Phase 1 (Important): Load after 2 seconds - volatility, treasuries, currencies, bonds
 * Phase 2 (Secondary): Load after 8 seconds - international, sectors, crypto, etc
 */
function startStaggeredFetch() {
    let delay = 0;

    // Phase 0: Fetch header indices first (critical)
    HEADER_INDICES.forEach((asset, index) => {
        setTimeout(() => {
            fetchAssetData(asset);
        }, delay);
        delay += STAGGER_DELAY;
    });

    // Phase 0: Critical assets (VIX, 10Y, DXY, RUT, NVDA)
    const criticalAssets = ASSET_CONFIGS.filter(asset => asset.loadPhase === LOADING_PHASES.critical);
    criticalAssets.forEach((asset) => {
        setTimeout(() => {
            fetchAssetData(asset);
        }, delay);
        delay += STAGGER_DELAY;
    });

    // Phase 1: Important assets (after 2 second delay)
    const phase1Delay = 2000;
    const importantAssets = ASSET_CONFIGS.filter(asset => asset.loadPhase === LOADING_PHASES.important);
    importantAssets.forEach((asset, index) => {
        setTimeout(() => {
            fetchAssetData(asset);
        }, phase1Delay + (index * STAGGER_DELAY));
    });

    // Phase 2: Secondary assets (after 8 second delay)
    const phase2Delay = 8000;
    const secondaryAssets = ASSET_CONFIGS.filter(asset => asset.loadPhase === LOADING_PHASES.secondary);
    secondaryAssets.forEach((asset, index) => {
        setTimeout(() => {
            fetchAssetData(asset);
        }, phase2Delay + (index * STAGGER_DELAY));
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
 * Get header indices data formatted for display
 */
export function getHeaderIndicesData() {
    return HEADER_INDICES.map(asset => {
        const data = dataCache[asset.symbol] || {};

        return {
            symbol: asset.symbol,
            label: asset.name,
            value: asset.formatPrice(data.currentPrice || 0),
            change: formatChange(data.change || 0),
            changePercent: formatChangePercent(data.changePercent || 0),
            trend: data.trend || 'neutral',
            isLoading: data.isLoading || false,
            error: data.error || null
        };
    });
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

/**
 * Get data for a specific category
 * @param {string} categoryName - Name of the category ('volatility', 'treasuries', etc.)
 * @returns {Array} Array of asset data with current prices and changes
 */
export function getCategoryData(categoryName) {
    const category = SYMBOL_CATEGORIES[categoryName];
    if (!category) return [];

    return category.map(asset => {
        const data = dataCache[asset.symbol] || {
            currentPrice: 0,
            change: 0,
            changePercent: 0,
            trend: 'neutral',
            isLoading: true
        };

        return {
            symbol: asset.symbol,
            name: asset.name,
            icon: asset.icon,
            value: asset.formatPrice(data.currentPrice || 0),
            change: formatChange(data.change || 0),
            changePercent: formatChangePercent(data.changePercent || 0),
            trend: data.trend || 'neutral',
            isLoading: data.isLoading || false,
            error: data.error || null,
            category: asset.category
        };
    });
}

/**
 * Calculate yield spread between two treasury symbols
 * @param {string} symbol1 - First symbol (e.g., '10Y')
 * @param {string} symbol2 - Second symbol (e.g., '3M')
 * @returns {number} Spread in basis points
 */
export function getYieldSpread(symbol1, symbol2) {
    const data1 = dataCache[symbol1];
    const data2 = dataCache[symbol2];

    if (!data1 || !data2) return 0;

    const yield1 = data1.currentPrice || 0;
    const yield2 = data2.currentPrice || 0;

    // Return spread in basis points
    return ((yield1 - yield2) * 100).toFixed(0);
}

/**
 * Get all symbol categories for rendering
 * @returns {object} Object containing all categories
 */
export function getSymbolCategories() {
    return SYMBOL_CATEGORIES;
}
