// financial.js - Financial metrics widget
import {
    initDataService,
    getAllAssetData,
    cleanupService
} from './financialDataService.js';

let statusInterval;

// Widget configuration for registration
export const financialWidget = {
    displayName: 'Financial',
    defaultEnabled: true,
    containerId: 'financial-container',
    init: initFinancial,
    update: updateFinancial,
    cleanup: stopStatusUpdates
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

function renderFinancialPanel() {
    const container = document.getElementById('financial-container');
    if (!container) return;

    // Get current asset data from the service
    const metricsData = getAllAssetData();
    const metricsHTML = metricsData.map(metric => createMetricRow(metric)).join('');

    const panelHTML = `
        <div class="financial-panel">
            <div class="financial-header">
                <div id="market-status" class="market-status-pill">
                    Market Closed
                </div>
                <div id="eastern-time" class="eastern-time">
                    ET 00:00
                </div>
            </div>
            <div class="financial-table" id="financial-table">
                ${metricsHTML}
            </div>
        </div>
    `;

    container.innerHTML = panelHTML;
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

    return `
        <div class="financial-row" data-symbol="${metric.symbol}">
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
        changeSpan.textContent = `${sign}${(data.changePercent || 0).toFixed(4)}%`;

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
        easternTimeElement.textContent = `ET ${formattedTime}`;
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
