// financial.js - Financial metrics widget
import {
    initDataService,
    getAllAssetData,
    getHeaderIndicesData,
    cleanupService,
    getCategoryData,
    getYieldSpread,
    getAssetData
} from './financialDataService.js';

let statusInterval;

// Widget configuration for registration
export const financialWidget = {
    displayName: 'Financial',
    defaultEnabled: true,
    containerId: 'financial-container',
    init: initFinancial,
    update: updateFinancial,
    cleanup: stopStatusUpdates,

    // Layout configuration for drag/drop/resize
    layout: {
        defaultPosition: { x: '50%', y: '200px' },
        defaultSize: { width: '600px', height: '700px' },
        minSize: { width: 480, height: 600 },
        // No maxSize - can occupy full viewport
        resizable: true,
        draggable: true,
        dragHandle: '.widget-header',
        zIndex: 3
    }
};

export function initFinancial(settings) {
    // Initialize data service with callback for data updates
    initDataService(handleDataUpdate);

    // Initial render
    renderFinancialPanel();
    updateMarketStatus();

    // Update market status every second
    statusInterval = setInterval(updateMarketStatus, 1000);
}

/**
 * Handle data updates from the service
 * Updates individual metric rows without full re-render
 */
function handleDataUpdate(symbol, data) {
    updateMetricRow(symbol, data);
}

export function updateFinancial(settings) {
    // For now, settings don't affect the financial widget
    // In the future, this could handle metric customization
    renderFinancialPanel();
}

function stopStatusUpdates() {
    if (statusInterval) {
        clearInterval(statusInterval);
    }
    // Cleanup data service
    cleanupService();
}

/**
 * Helper: Get scoreboard color class based on percentage change
 */
function getScoreboardColorClass(changePercent) {
    const absChange = Math.abs(changePercent);

    if (changePercent >= 2.0) return 'scoreboard-strong-positive';
    if (changePercent >= 0.5) return 'scoreboard-positive';
    if (changePercent <= -2.0) return 'scoreboard-strong-negative';
    if (changePercent <= -0.5) return 'scoreboard-negative';
    return 'scoreboard-neutral';
}

/**
 * Helper: Get traffic light status class based on criteria
 */
function getTrafficLightStatus(symbol, value, changePercent) {
    // VIX: >20 = danger, 15-20 = warning, <15 = positive (inverse)
    if (symbol === 'VIX') {
        if (value >= 20) return 'traffic-light-danger';
        if (value >= 15) return 'traffic-light-warning';
        return 'traffic-light-positive';
    }

    // Yield spread: negative = danger (inverted curve)
    if (symbol === 'SPREAD') {
        if (value < 0) return 'traffic-light-danger';
        if (value < 50) return 'traffic-light-warning';
        return 'traffic-light-positive';
    }

    // Default: based on change percentage
    if (changePercent >= 1.0) return 'traffic-light-positive';
    if (changePercent <= -1.0) return 'traffic-light-danger';
    if (Math.abs(changePercent) >= 0.3) return 'traffic-light-warning';
    return 'traffic-light-neutral';
}

/**
 * Render Hero Indices - Color-Coded Scoreboard Style
 */
function renderHeroIndicesScoreboard() {
    const spx = getAssetData('SPX');
    const nasdaq = getAssetData('NASDAQ');
    const rut = getAssetData('RUT');

    const createScoreboardBox = (data, name, formatDecimals = 2) => {
        if (!data) {
            return `
                <div class="scoreboard-box scoreboard-neutral">
                    <div class="scoreboard-content">
                        <div class="scoreboard-label">${name}</div>
                        <div class="scoreboard-value">--</div>
                        <div class="scoreboard-change metric-neutral">
                            <i class="ph ph-minus"></i>
                            --
                        </div>
                    </div>
                </div>
            `;
        }

        const colorClass = getScoreboardColorClass(data.changePercent);
        const trendIcon = data.trend === 'up' ? 'ph-caret-up' :
                         data.trend === 'down' ? 'ph-caret-down' :
                         'ph-minus';

        const sign = data.changePercent >= 0 ? '+' : '';
        const changePercent = `${sign}${data.changePercent.toFixed(2)}%`;

        return `
            <div class="scoreboard-box ${colorClass}">
                <div class="scoreboard-content">
                    <div class="scoreboard-label">${name}</div>
                    <div class="scoreboard-value">${data.currentPrice.toFixed(formatDecimals).toLocaleString()}</div>
                    <div class="scoreboard-change">
                        <i class="ph ${trendIcon}"></i>
                        ${changePercent}
                    </div>
                </div>
            </div>
        `;
    };

    return `
        <div class="scoreboard-grid">
            ${createScoreboardBox(spx, 'S&P 500', 2)}
            ${createScoreboardBox(nasdaq, 'Nasdaq', 2)}
            ${createScoreboardBox(rut, 'Russell 2000', 2)}
        </div>
    `;
}

/**
 * Render Market Pulse - Traffic Light Card Style
 */
function renderMarketPulseTrafficLight() {
    const vix = getAssetData('VIX');
    const dxy = getAssetData('DXY');
    const btc = getAssetData('BTC');
    const spread10Y3M = getYieldSpread('10Y', '3M');
    const isInverted = parseInt(spread10Y3M) < 0;

    const createTrafficLightCard = (symbol, data, name, icon, iconCategory, valueFormatter = null) => {
        if (!data && symbol !== 'SPREAD') {
            return `
                <div class="traffic-light-card">
                    <div class="traffic-light-circle traffic-light-neutral">
                        <div class="traffic-light-percentage">--</div>
                    </div>
                    <div class="traffic-light-content">
                        <div class="traffic-light-header">
                            <i class="ph ${icon} traffic-light-icon ${iconCategory}"></i>
                            <div class="traffic-light-name">${name}</div>
                        </div>
                        <div class="traffic-light-value">--</div>
                    </div>
                </div>
            `;
        }

        let value, changePercent, statusClass, displayValue;

        if (symbol === 'SPREAD') {
            value = parseFloat(spread10Y3M);
            changePercent = 0;
            statusClass = getTrafficLightStatus('SPREAD', value, 0);
            displayValue = spread10Y3M !== 0 ? `${spread10Y3M} bps` : '--';
        } else {
            value = data.currentPrice || 0;
            changePercent = data.changePercent || 0;
            statusClass = getTrafficLightStatus(symbol, value, changePercent);
            displayValue = valueFormatter ? valueFormatter(value) : value.toFixed(2);
        }

        const sign = changePercent >= 0 ? '+' : '';
        const percentageText = symbol === 'SPREAD'
            ? (isInverted ? 'INV' : 'NORM')
            : `${sign}${changePercent.toFixed(1)}%`;

        return `
            <div class="traffic-light-card">
                <div class="traffic-light-circle ${statusClass}">
                    <div class="traffic-light-percentage">${percentageText}</div>
                </div>
                <div class="traffic-light-content">
                    <div class="traffic-light-header">
                        <i class="ph ${icon} traffic-light-icon ${iconCategory}"></i>
                        <div class="traffic-light-name">${name}</div>
                    </div>
                    <div class="traffic-light-value">${displayValue}</div>
                </div>
            </div>
        `;
    };

    return `
        <div class="traffic-light-cards">
            ${createTrafficLightCard('VIX', vix, 'VIX', 'ph-chart-line', 'icon-volatility')}
            ${createTrafficLightCard('SPREAD', null, '10Y-3M Spread', 'ph-bank', 'icon-treasury')}
            ${createTrafficLightCard('DXY', dxy, 'US Dollar', 'ph-currency-dollar', 'icon-currency')}
            ${createTrafficLightCard('BTC', btc, 'Bitcoin', 'ph-currency-btc', 'icon-crypto', (val) => `$${(val / 1000).toFixed(1)}k`)}
        </div>
    `;
}

/**
 * Render Volatility section with traffic light cards
 */
function renderVolatilitySection() {
    const data = getCategoryData('volatility');

    const volatilityHTML = data.map(metric => {
        const value = parseFloat(metric.value) || 0;
        const changePercent = parseFloat(metric.changePercent.replace(/[^0-9.-]/g, '')) || 0;
        const statusClass = getTrafficLightStatus(metric.symbol, value, changePercent);

        const sign = changePercent >= 0 ? '+' : '';
        const percentageText = `${sign}${changePercent.toFixed(1)}%`;

        return `
            <div class="traffic-light-card">
                <div class="traffic-light-circle ${statusClass}">
                    <div class="traffic-light-percentage">${percentageText}</div>
                </div>
                <div class="traffic-light-content">
                    <div class="traffic-light-header">
                        <i class="ph ${metric.icon} traffic-light-icon icon-volatility"></i>
                        <div class="traffic-light-name">${metric.name}</div>
                    </div>
                    <div class="traffic-light-value">${metric.value}</div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="market-category">
            <div class="category-label">
                <i class="ph ph-chart-line category-label-icon"></i>
                <span>Volatility Metrics</span>
            </div>
            <div class="traffic-light-cards">
                ${volatilityHTML}
            </div>
        </div>
    `;
}

/**
 * Render Treasury Yields section with compact grid
 */
function renderTreasuriesSection() {
    const data = getCategoryData('treasuries');
    const cardsHTML = data.map(metric => createMarketCard(metric)).join('');

    const spread10Y3M = getYieldSpread('10Y', '3M');
    const isInverted = parseInt(spread10Y3M) < 0;

    return `
        <div class="market-category">
            <div class="category-label">
                <i class="ph ph-bank category-label-icon"></i>
                <span>Treasury Yields</span>
            </div>
            <div class="category-grid">
                ${cardsHTML}
            </div>
            ${isInverted ? `
                <div class="spread-warning">
                    <i class="ph ph-warning"></i>
                    <span>Yield curve inverted (10Y-3M: ${spread10Y3M} bps)</span>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Create market card for horizontal scroll sections with category icon
 */
function createMarketCard(metric) {
    const trendClass = metric.trend === 'up' ? 'metric-positive' :
                       metric.trend === 'down' ? 'metric-negative' :
                       'metric-neutral';

    const trendIcon = metric.trend === 'up' ? 'ph-caret-up' :
                      metric.trend === 'down' ? 'ph-caret-down' :
                      'ph-minus';

    const loadingClass = metric.isLoading ? 'metric-loading' : '';

    // Use the metric's icon if available
    const categoryIcon = metric.icon || 'ph-chart-line';

    return `
        <div class="market-card ${loadingClass}" data-symbol="${metric.symbol}" data-category="${metric.category}">
            <div class="market-card-icon">
                <i class="ph ${categoryIcon}"></i>
            </div>
            <div class="market-card-name">${metric.name}</div>
            <div class="market-card-value">${metric.value}</div>
            <div class="market-card-change ${trendClass}">
                <i class="ph ${trendIcon}"></i>
                ${metric.changePercent}
            </div>
        </div>
    `;
}

/**
 * Create compact market card for two-column grid layout (currencies & commodities)
 */
function createCompactMarketCard(metric) {
    const trendClass = metric.trend === 'up' ? 'metric-positive' :
                       metric.trend === 'down' ? 'metric-negative' :
                       'metric-neutral';

    const trendIcon = metric.trend === 'up' ? 'ph-caret-up' :
                      metric.trend === 'down' ? 'ph-caret-down' :
                      'ph-minus';

    const loadingClass = metric.isLoading ? 'metric-loading' : '';

    // Use the metric's icon if available
    const categoryIcon = metric.icon || 'ph-chart-line';

    return `
        <div class="market-card market-card-compact ${loadingClass}" data-symbol="${metric.symbol}" data-category="${metric.category}">
            <div class="market-card-icon">
                <i class="ph ${categoryIcon}"></i>
            </div>
            <div class="market-card-name">${metric.name}</div>
            <div class="market-card-value">${metric.value}</div>
            <div class="market-card-change ${trendClass}">
                <i class="ph ${trendIcon}"></i>
                ${metric.changePercent}
            </div>
        </div>
    `;
}

/**
 * Render Currencies section with compact two-column grid
 */
function renderCurrenciesSection() {
    const data = getCategoryData('currencies');
    const cardsHTML = data.map(metric => createCompactMarketCard(metric)).join('');

    return `
        <div class="market-category">
            <div class="category-label">
                <i class="ph ph-currency-dollar category-label-icon"></i>
                <span>Currencies</span>
            </div>
            <div class="category-grid-compact">
                ${cardsHTML}
            </div>
        </div>
    `;
}

/**
 * Render Additional Indices section with horizontal scroll
 */
function renderAdditionalIndicesSection() {
    const data = getCategoryData('indicesAdditional');
    const cardsHTML = data.map(metric => createMarketCard(metric)).join('');

    return `
        <div class="market-category">
            <div class="category-label">
                <i class="ph ph-chart-line-up category-label-icon"></i>
                <span>Other Indices</span>
            </div>
            <div class="category-scroll">
                ${cardsHTML}
            </div>
        </div>
    `;
}

/**
 * Render International Markets section with horizontal scroll
 */
function renderInternationalSection() {
    const data = getCategoryData('international');
    const cardsHTML = data.map(metric => createMarketCard(metric)).join('');

    return `
        <div class="market-category">
            <div class="category-label">
                <i class="ph ph-globe category-label-icon"></i>
                <span>International Markets</span>
            </div>
            <div class="category-scroll">
                ${cardsHTML}
            </div>
        </div>
    `;
}

/**
 * Render Commodities section with compact two-column grid
 */
function renderCommoditiesSection() {
    const data = getCategoryData('commoditiesAdditional');
    const cardsHTML = data.map(metric => createCompactMarketCard(metric)).join('');

    return `
        <div class="market-category">
            <div class="category-label">
                <i class="ph ph-coins category-label-icon"></i>
                <span>Commodities</span>
            </div>
            <div class="category-grid-compact">
                ${cardsHTML}
            </div>
        </div>
    `;
}

/**
 * Render Credit/Bond ETFs section with compact grid
 */
function renderBondsSection() {
    const data = getCategoryData('bonds');
    const cardsHTML = data.map(metric => createMarketCard(metric)).join('');

    return `
        <div class="market-category">
            <div class="category-label">
                <i class="ph ph-bank category-label-icon"></i>
                <span>Credit & Bonds</span>
            </div>
            <div class="category-grid">
                ${cardsHTML}
            </div>
        </div>
    `;
}

/**
 * Render Sector Performance section as Scoreboard Grid (sorted by performance)
 */
function renderSectorsSection() {
    const data = getCategoryData('sectors');
    // Sort by performance (best to worst)
    const sorted = data.sort((a, b) => {
        const aChange = parseFloat(a.changePercent.replace(/[^0-9.-]/g, '')) || 0;
        const bChange = parseFloat(b.changePercent.replace(/[^0-9.-]/g, '')) || 0;
        return bChange - aChange;
    });

    const sectorsHTML = sorted.map(metric => {
        const changePercent = parseFloat(metric.changePercent.replace(/[^0-9.-]/g, '')) || 0;
        const colorClass = getScoreboardColorClass(changePercent);
        const trendIcon = metric.trend === 'up' ? 'ph-caret-up' :
                         metric.trend === 'down' ? 'ph-caret-down' :
                         'ph-minus';

        return `
            <div class="scoreboard-box ${colorClass}">
                <div class="scoreboard-content">
                    <div class="scoreboard-label">${metric.name}</div>
                    <div class="scoreboard-value">${metric.value}</div>
                    <div class="scoreboard-change">
                        <i class="ph ${trendIcon}"></i>
                        ${metric.changePercent}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="market-category">
            <div class="category-label">
                <i class="ph ph-chart-bar category-label-icon"></i>
                <span>Sector Performance</span>
            </div>
            <div class="scoreboard-grid">
                ${sectorsHTML}
            </div>
        </div>
    `;
}

/**
 * Render Crypto section (Bitcoin only)
 */
function renderCryptoSection() {
    const data = getCategoryData('crypto');
    const rowsHTML = data.map(metric => createCompactMetricRow(metric)).join('');

    return `
        <div class="financial-section">
            <div class="section-header">
                <i class="ph ph-currency-btc"></i>
                <span>Cryptocurrency</span>
            </div>
            <div class="section-content">
                ${rowsHTML}
            </div>
        </div>
    `;
}

/**
 * Create compact metric row for sections (smaller than main table rows)
 */
function createCompactMetricRow(metric) {
    const trendClass = metric.trend === 'up' ? 'metric-positive' :
                       metric.trend === 'down' ? 'metric-negative' :
                       'metric-neutral';

    const trendIcon = metric.trend === 'up' ? 'ph-caret-up' :
                      metric.trend === 'down' ? 'ph-caret-down' :
                      'ph-minus';

    const loadingClass = metric.isLoading ? 'metric-loading' : '';

    return `
        <div class="compact-metric-row" data-symbol="${metric.symbol}">
            <div class="compact-metric-label">
                <i class="ph ${metric.icon}"></i>
                <span>${metric.name}</span>
            </div>
            <div class="compact-metric-data ${loadingClass}">
                <span class="compact-metric-value">${metric.value}</span>
                <span class="compact-metric-change ${trendClass}">
                    <i class="ph ${trendIcon}"></i>
                    ${metric.changePercent}
                </span>
            </div>
        </div>
    `;
}

function renderFinancialPanel() {
    const container = document.getElementById('financial-container');
    if (!container) return;

    // Get legacy tracked assets for backwards compatibility
    const legacyData = getAllAssetData().filter(asset => asset.category === 'stock');
    const legacyHTML = legacyData.map(metric => createMetricRow(metric)).join('');

    const panelHTML = `
        <div class="financial-panel">
            <div class="financial-header">
                <div class="financial-header-top">
                    <div id="market-status" class="market-status-pill">
                        Market Closed
                    </div>
                    <div id="eastern-time" class="eastern-time">
                        <i class="ph ph-buildings"></i>
                        <span>ET 00:00</span>
                    </div>
                </div>
            </div>

            ${renderHeroIndicesScoreboard()}

            ${renderMarketPulseTrafficLight()}

            <div class="financial-sections-container">
                ${renderTreasuriesSection()}
                ${renderVolatilitySection()}
                ${renderCurrenciesSection()}
                ${renderCommoditiesSection()}
                ${renderBondsSection()}
                ${renderInternationalSection()}
                ${renderSectorsSection()}
                ${renderAdditionalIndicesSection()}
            </div>

            ${legacyHTML ? `
                <div class="financial-section">
                    <div class="section-header">
                        <i class="ph ph-star"></i>
                        <span>Tracked Assets</span>
                    </div>
                    <div class="financial-table" id="financial-table">
                        ${legacyHTML}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    container.innerHTML = panelHTML;
}

function createIndexItem(index) {
    const trendClass = index.trend === 'up' ? 'metric-positive' :
                       index.trend === 'down' ? 'metric-negative' :
                       'metric-neutral';

    const trendIcon = index.trend === 'up' ? 'ph-caret-up' :
                      index.trend === 'down' ? 'ph-caret-down' :
                      'ph-minus';

    const loadingClass = index.isLoading ? 'metric-loading' : '';

    return `
        <div class="financial-index-item ${loadingClass}" data-symbol="${index.symbol}">
            <div class="index-name">${index.label}</div>
            <div class="index-value">${index.value}</div>
            <div class="index-change ${trendClass}">
                <i class="ph ${trendIcon}"></i>
                ${index.changePercent}
            </div>
        </div>
    `;
}

function createMetricRow(metric) {
    const trendClass = metric.trend === 'up' ? 'metric-positive' :
                       metric.trend === 'down' ? 'metric-negative' :
                       'metric-neutral';

    const trendIcon = metric.trend === 'up' ? 'ph-caret-up' :
                      metric.trend === 'down' ? 'ph-caret-down' :
                      'ph-minus';

    // Show loading state if data is loading
    const loadingClass = metric.isLoading ? 'metric-loading' : '';

    // Calculate intensity based on absolute percentage change
    const changeValue = parseFloat(metric.changePercent.replace(/[^0-9.-]/g, '')) || 0;
    const absChange = Math.abs(changeValue);
    const intensity = absChange >= 2.0 ? 'high' : absChange >= 1.0 ? 'medium' : 'low';

    return `
        <div class="financial-row" data-symbol="${metric.symbol}" data-category="${metric.category}" data-intensity="${intensity}">
            <div class="metric-icon-label">
                <i class="ph ${metric.icon} metric-icon"></i>
                <span class="metric-label">${metric.label}</span>
            </div>
            <div class="metric-data ${loadingClass}">
                <span class="metric-value">${metric.value}</span>
                <span class="metric-change ${trendClass}">
                    <i class="ph ${trendIcon}"></i>
                    ${metric.changePercent}
                </span>
            </div>
        </div>
    `;
}

/**
 * Update a single metric row without full re-render
 */
function updateMetricRow(symbol, data) {
    const row = document.querySelector(`.financial-row[data-symbol="${symbol}"]`);
    if (!row) return;

    const metricData = row.querySelector('.metric-data');
    const valueSpan = row.querySelector('.metric-value');
    const changeSpan = row.querySelector('.metric-change');

    if (!metricData || !valueSpan || !changeSpan) return;

    // Get asset config for formatting
    import('./financialDataService.js').then(({ getAssetConfig }) => {
        const assetConfig = getAssetConfig(symbol);
        if (!assetConfig) return;

        // Update value
        valueSpan.textContent = assetConfig.formatPrice(data.currentPrice || 0);

        // Update change
        const sign = data.changePercent >= 0 ? '+' : '';
        const changePercent = `${sign}${(data.changePercent || 0).toFixed(4)}%`;
        changeSpan.textContent = changePercent;

        // Calculate intensity for visual effects
        const absChange = Math.abs(data.changePercent || 0);
        const intensity = absChange >= 2.0 ? 'high' : absChange >= 1.0 ? 'medium' : 'low';
        row.setAttribute('data-intensity', intensity);

        // Update trend class
        changeSpan.className = 'metric-change';
        if (data.trend === 'up') {
            changeSpan.classList.add('metric-positive');
        } else if (data.trend === 'down') {
            changeSpan.classList.add('metric-negative');
        } else {
            changeSpan.classList.add('metric-neutral');
        }

        // Update icon
        const icon = changeSpan.querySelector('i');
        if (icon) {
            icon.className = 'ph';
            if (data.trend === 'up') {
                icon.classList.add('ph-caret-up');
            } else if (data.trend === 'down') {
                icon.classList.add('ph-caret-down');
            } else {
                icon.classList.add('ph-minus');
            }
        }

        // Remove loading class
        metricData.classList.remove('metric-loading');
    });
}

function updateMarketStatus() {
    const marketStatusElement = document.getElementById('market-status');
    const easternTimeElement = document.getElementById('eastern-time');

    const now = new Date();
    const status = getMarketStatus(now);

    // Update market status
    if (marketStatusElement) {
        let statusText = status.label;
        if (status.countdown) {
            statusText += ` • ${status.countdown}`;
        }
        marketStatusElement.textContent = statusText;
        marketStatusElement.className = `market-status-pill market-status-${status.type}`;
    }

    // Update Eastern Time
    if (easternTimeElement) {
        const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const hours = etTime.getHours();
        const minutes = etTime.getMinutes();
        const formattedTime = `${padZero(hours)}:${padZero(minutes)}`;
        const timeSpan = easternTimeElement.querySelector('span');
        if (timeSpan) {
            timeSpan.textContent = `ET ${formattedTime}`;
        }
    }
}

function padZero(num) {
    return num.toString().padStart(2, '0');
}

function getMarketStatus(date) {
    // Convert to ET timezone
    const etTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etTime.getDay();
    const hours = etTime.getHours();
    const minutes = etTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // Market hours in ET (converted to minutes from midnight)
    const preMarketStart = 4 * 60;        // 4:00 AM
    const marketOpen = 9 * 60 + 30;       // 9:30 AM
    const marketClose = 16 * 60;          // 4:00 PM
    const afterHoursEnd = 20 * 60;        // 8:00 PM

    // Weekend handling
    if (day === 0 || day === 6) {
        // Calculate time until Monday 4:00 AM ET
        const countdown = getCountdownToMonday(etTime);
        return {
            label: 'Market Closed',
            type: 'closed',
            countdown: countdown
        };
    }

    // During market hours
    if (totalMinutes >= marketOpen && totalMinutes < marketClose) {
        const countdown = getCountdownToTime(totalMinutes, marketClose);
        return {
            label: 'Market Open',
            type: 'open',
            countdown: `Closes in ${countdown}`
        };
    }
    // Pre-market hours
    else if (totalMinutes >= preMarketStart && totalMinutes < marketOpen) {
        const countdown = getCountdownToTime(totalMinutes, marketOpen);
        return {
            label: 'Pre-Market',
            type: 'premarket',
            countdown: `Opens in ${countdown}`
        };
    }
    // After hours
    else if (totalMinutes >= marketClose && totalMinutes < afterHoursEnd) {
        const countdown = getCountdownToTime(totalMinutes, afterHoursEnd);
        return {
            label: 'After Hours',
            type: 'afterhours',
            countdown: `Closes in ${countdown}`
        };
    }
    // Overnight (after 8 PM or before 4 AM)
    else {
        let countdown;
        if (totalMinutes >= afterHoursEnd) {
            // After 8 PM, show time until next pre-market (tomorrow 4 AM)
            countdown = getCountdownToTime(totalMinutes, 24 * 60 + preMarketStart);
        } else {
            // Before 4 AM, show time until pre-market today
            countdown = getCountdownToTime(totalMinutes, preMarketStart);
        }
        return {
            label: 'Market Closed',
            type: 'closed',
            countdown: `Opens in ${countdown}`
        };
    }
}

function getCountdownToTime(currentMinutes, targetMinutes) {
    const diff = targetMinutes - currentMinutes;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;

    if (hours > 0) {
        return `${hours}h ${mins}m`;
    } else {
        return `${mins}m`;
    }
}

function getCountdownToMonday(etTime) {
    // Calculate days until Monday
    const currentDay = etTime.getDay();
    const daysUntilMonday = currentDay === 0 ? 1 : 7 - currentDay + 1;

    // Create target date (next Monday at 4:00 AM ET)
    const monday = new Date(etTime);
    monday.setDate(monday.getDate() + daysUntilMonday);
    monday.setHours(4, 0, 0, 0);

    // Calculate difference
    const diff = monday - etTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `Opens in ${days}d ${remainingHours}h`;
    } else if (hours > 0) {
        return `Opens in ${hours}h ${mins}m`;
    } else {
        return `Opens in ${mins}m`;
    }
}
