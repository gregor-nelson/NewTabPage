// github.js - GitHub activity widget with habit grid
import {
    initGitHubService,
    getActivityData,
    recordActivity,
    cleanupGitHubService,
    updateSettings as updateGitHubSettings,
    getConnectionStatus
} from './githubDataService.js';

let updateInterval;

// Widget configuration for registration
export const githubWidget = {
    displayName: 'GitHub',
    defaultEnabled: true,
    containerId: 'github-container',
    init: initGitHub,
    update: updateGitHub,
    cleanup: cleanupGitHub,

    // Layout configuration for drag/drop/resize
    layout: {
        defaultPosition: { x: '10%', y: '200px' },
        defaultSize: { width: '380px', height: '320px' },
        minSize: { width: 320, height: 280 },
        resizable: true,
        draggable: true,
        dragHandle: '.widget-header',
        zIndex: 4
    }
};

export function initGitHub(settings) {
    // Initialize data service with callback
    initGitHubService(handleDataUpdate, {
        githubUsername: settings.githubUsername,
        githubToken: settings.githubToken,
        githubUseAPI: settings.githubUseAPI,
        githubTimeRange: settings.githubTimeRange || 28,
        githubWeeklyGoal: settings.githubWeeklyGoal || 20
    });

    // Initial render
    renderGitHubPanel();

    // Update every minute to refresh "time ago" displays
    updateInterval = setInterval(() => {
        renderGitHubPanel();
    }, 60000);
}

/**
 * Handle data updates from the service
 */
function handleDataUpdate(data) {
    renderGitHubPanel();
}

export function updateGitHub(settings) {
    // Update settings in the data service
    updateGitHubSettings({
        username: settings.githubUsername,
        token: settings.githubToken,
        useAPI: settings.githubUseAPI,
        timeRange: settings.githubTimeRange || 28,
        weeklyGoal: settings.githubWeeklyGoal || 20
    });

    renderGitHubPanel();
}

function cleanupGitHub() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    cleanupGitHubService();
}

function renderGitHubPanel() {
    const container = document.getElementById('github-container');
    if (!container) return;

    const data = getActivityData();
    const status = getConnectionStatus();

    // Calculate progress percentage for weekly goal
    const weekProgress = Math.min(100, (data.weekActivity / data.weeklyGoal) * 100);

    // Generate habit grid based on time range
    const gridHTML = generateHabitGrid(data.rangeData, data.timeRange);

    // Calculate dots for today's activity (max 5 dots)
    const todayDots = Math.min(5, data.todayActivity);
    const dotsHTML = generateActivityDots(todayDots);

    // Generate connection status indicator
    const statusHTML = generateConnectionStatus(status);

    // Generate section label based on time range
    const sectionLabel = getSectionLabel(data.timeRange);

    // Generate streak display with tooltip
    const streakTooltip = generateStreakTooltip(data);

    const panelHTML = `
        <div class="github-panel">
            <div class="github-header-section">
                <div class="github-streak" title="${streakTooltip}">
                    <i class="ph ph-fire github-fire-icon"></i>
                    <div class="github-streak-info">
                        <div class="github-streak-current">
                            <span class="github-streak-number">${data.currentStreak}</span>
                            <span class="github-streak-separator">|</span>
                            <span class="github-streak-best">Best: ${data.bestStreak}</span>
                        </div>
                        <div class="github-streak-label">${data.streakLabel}</div>
                    </div>
                </div>
                <div class="github-header-right">
                    ${statusHTML}
                </div>
            </div>

            <div class="github-habit-grid-section">
                <div class="github-section-label">${sectionLabel}</div>
                <div class="github-habit-grid-wrapper">
                    <div class="github-habit-grid">
                        ${gridHTML}
                    </div>
                </div>
            </div>

            <div class="github-progress-section">
                <div class="github-progress-header">
                    <span class="github-progress-label">This week</span>
                    <span class="github-progress-value">${data.weekActivity}/${data.weeklyGoal}</span>
                </div>
                <div class="github-progress-bar">
                    <div class="github-progress-fill" style="width: ${weekProgress}%"></div>
                </div>
            </div>

            <div class="github-today-section">
                ${dotsHTML}
                <span class="github-today-label">${data.todayActivity === 0 ? 'No activity today yet' :
                    data.todayActivity === 1 ? '1 commit today' : `${data.todayActivity} commits today`}</span>
            </div>
        </div>
    `;

    container.innerHTML = panelHTML;
}

/**
 * Generate habit grid HTML based on time range
 */
function generateHabitGrid(rangeData, timeRange) {
    if (timeRange === 7) {
        return generate7DayGrid(rangeData);
    } else if (timeRange === 28) {
        return generate28DayGrid(rangeData);
    } else if (timeRange === 90) {
        return generate90DayGrid(rangeData);
    } else if (timeRange === 365) {
        return generateYearGrid(rangeData);
    }
    return generate28DayGrid(rangeData); // Default
}

/**
 * Generate 7-day grid (4 rows x 7 columns with centered week)
 */
function generate7DayGrid(data) {
    let html = '';

    // Add empty row for spacing (top padding)
    html += '<div class="github-grid-row">';
    for (let i = 0; i < 7; i++) {
        html += `<div class="github-grid-cell github-grid-empty" style="visibility: hidden;"></div>`;
    }
    html += '</div>';

    // Main data row (centered)
    html += '<div class="github-grid-row">';
    data.forEach((day, index) => {
        const intensityClass = getIntensityClass(day.count, 'daily');
        const todayClass = day.isToday ? 'github-grid-today' : '';
        const tooltipText = formatDailyTooltip(day.date, day.count);

        html += `<div class="github-grid-cell ${intensityClass} ${todayClass}"
                      data-count="${day.count}"
                      title="${tooltipText}">
                 </div>`;
    });
    html += '</div>';

    // Add empty rows for spacing (bottom padding)
    for (let row = 0; row < 2; row++) {
        html += '<div class="github-grid-row">';
        for (let i = 0; i < 7; i++) {
            html += `<div class="github-grid-cell github-grid-empty" style="visibility: hidden;"></div>`;
        }
        html += '</div>';
    }

    // Add date labels
    html += '<div class="github-grid-date-labels">';
    data.forEach(day => {
        const dateNum = new Date(day.date + 'T00:00:00').getDate();
        html += `<div class="github-grid-date-label">${dateNum}</div>`;
    });
    html += '</div>';

    return html;
}

/**
 * Generate 28-day grid (4 rows x 7 columns)
 */
function generate28DayGrid(data) {
    let html = '';

    // Create 4 rows of 7 days each
    for (let row = 0; row < 4; row++) {
        html += '<div class="github-grid-row">';

        for (let col = 0; col < 7; col++) {
            const index = row * 7 + col;
            const day = data[index];

            const intensityClass = day ? getIntensityClass(day.count, 'daily') : 'github-grid-empty';
            const todayClass = day && day.isToday ? 'github-grid-today' : '';
            const activityCount = day ? day.count : 0;
            const tooltipText = day ? formatDailyTooltip(day.date, activityCount) : '';

            html += `<div class="github-grid-cell ${intensityClass} ${todayClass}"
                          data-count="${activityCount}"
                          title="${tooltipText}">
                     </div>`;
        }

        html += '</div>';
    }

    // Add date labels below the grid (showing dates for the bottom row)
    html += '<div class="github-grid-date-labels">';
    for (let col = 0; col < 7; col++) {
        const index = 3 * 7 + col; // Bottom row (row 3)
        const day = data[index];
        const dateNum = day ? new Date(day.date + 'T00:00:00').getDate() : '';
        html += `<div class="github-grid-date-label">${dateNum}</div>`;
    }
    html += '</div>';

    return html;
}

/**
 * Generate 90-day grid (4 rows x 7 columns, 13 weeks centered)
 */
function generate90DayGrid(data) {
    let html = '';
    const rows = 4;
    const cols = 7;
    const totalCells = rows * cols;

    // Calculate padding to center 13 weeks
    const startPadding = Math.floor((totalCells - data.length) / 2);

    let dataIndex = 0;

    // Create 4 rows of 7 cells each
    for (let row = 0; row < rows; row++) {
        html += '<div class="github-grid-row">';

        for (let col = 0; col < cols; col++) {
            const cellIndex = row * cols + col;

            if (cellIndex < startPadding || cellIndex >= startPadding + data.length) {
                // Padding cells (hidden)
                html += `<div class="github-grid-cell github-grid-empty" style="visibility: hidden;"></div>`;
            } else {
                // Data cells
                const week = data[dataIndex++];
                const intensityClass = getIntensityClass(week.count, 'weekly');
                const todayClass = week.isToday ? 'github-grid-today' : '';
                const tooltipText = formatWeeklyTooltip(week.date, week.endDate, week.count);

                html += `<div class="github-grid-cell ${intensityClass} ${todayClass}"
                              data-count="${week.count}"
                              title="${tooltipText}">
                         </div>`;
            }
        }

        html += '</div>';
    }

    // Add week labels (only for bottom row visible cells)
    html += '<div class="github-grid-date-labels">';
    for (let col = 0; col < cols; col++) {
        const cellIndex = (rows - 1) * cols + col; // Bottom row

        if (cellIndex >= startPadding && cellIndex < startPadding + data.length) {
            const weekIndex = cellIndex - startPadding;
            const week = data[weekIndex];
            const weekStart = new Date(week.date + 'T00:00:00');
            const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
            html += `<div class="github-grid-date-label" style="font-size: 0.6rem;">${label}</div>`;
        } else {
            html += `<div class="github-grid-date-label"></div>`;
        }
    }
    html += '</div>';

    return html;
}

/**
 * Generate year grid (4 rows x 7 columns, 12 months centered)
 */
function generateYearGrid(data) {
    let html = '';
    const rows = 4;
    const cols = 7;
    const totalCells = rows * cols;
    const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

    // Calculate padding to center 12 months
    const startPadding = Math.floor((totalCells - data.length) / 2);

    let dataIndex = 0;

    // Create 4 rows of 7 cells each
    for (let row = 0; row < rows; row++) {
        html += '<div class="github-grid-row">';

        for (let col = 0; col < cols; col++) {
            const cellIndex = row * cols + col;

            if (cellIndex < startPadding || cellIndex >= startPadding + data.length) {
                // Padding cells (hidden)
                html += `<div class="github-grid-cell github-grid-empty" style="visibility: hidden;"></div>`;
            } else {
                // Data cells
                const month = data[dataIndex++];
                const intensityClass = getIntensityClass(month.count, 'monthly');
                const todayClass = month.isToday ? 'github-grid-today' : '';
                const tooltipText = formatMonthlyTooltip(month.month, month.year, month.count);

                html += `<div class="github-grid-cell ${intensityClass} ${todayClass}"
                              data-count="${month.count}"
                              title="${tooltipText}">
                         </div>`;
            }
        }

        html += '</div>';
    }

    // Add month labels (only for bottom row visible cells)
    html += '<div class="github-grid-date-labels">';
    for (let col = 0; col < cols; col++) {
        const cellIndex = (rows - 1) * cols + col; // Bottom row

        if (cellIndex >= startPadding && cellIndex < startPadding + data.length) {
            const monthIndex = cellIndex - startPadding;
            const month = data[monthIndex];
            html += `<div class="github-grid-date-label">${monthNames[month.month]}</div>`;
        } else {
            html += `<div class="github-grid-date-label"></div>`;
        }
    }
    html += '</div>';

    return html;
}

/**
 * Generate activity dots for today
 */
function generateActivityDots(count) {
    let html = '<div class="github-activity-dots">';

    for (let i = 0; i < 5; i++) {
        const filledClass = i < count ? 'github-dot-filled' : 'github-dot-empty';
        html += `<div class="github-dot ${filledClass}"></div>`;
    }

    html += '</div>';
    return html;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) {
        return num + 'st';
    }
    if (j === 2 && k !== 12) {
        return num + 'nd';
    }
    if (j === 3 && k !== 13) {
        return num + 'rd';
    }
    return num + 'th';
}

/**
 * Get intensity class based on count and type
 */
function getIntensityClass(count, type) {
    if (count === 0) return 'github-grid-empty';

    if (type === 'daily') {
        if (count >= 10) return 'github-grid-high';
        if (count >= 5) return 'github-grid-medium';
        return 'github-grid-low';
    } else if (type === 'weekly') {
        if (count >= 30) return 'github-grid-high';
        if (count >= 15) return 'github-grid-medium';
        return 'github-grid-low';
    } else if (type === 'monthly') {
        if (count >= 100) return 'github-grid-high';
        if (count >= 50) return 'github-grid-medium';
        return 'github-grid-low';
    }

    return 'github-grid-empty';
}

/**
 * Get section label based on time range
 */
function getSectionLabel(timeRange) {
    if (timeRange === 7) {
        return 'Daily Commits • Last 7 Days';
    } else if (timeRange === 28) {
        return 'Daily Commits • Last 28 Days';
    } else if (timeRange === 90) {
        return 'Weekly Commits • Last 90 Days';
    } else if (timeRange === 365) {
        return 'Monthly Commits • Past Year';
    }
    return 'Daily Commits • Last 28 Days';
}

/**
 * Format daily tooltip
 */
function formatDailyTooltip(dateString, count) {
    const date = new Date(dateString + 'T00:00:00');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const month = monthNames[date.getMonth()];
    const dayWithOrdinal = getOrdinalSuffix(date.getDate());

    const commitText = count === 1 ? 'commit' : 'commits';

    return `${dayWithOrdinal} ${month}: ${count} ${commitText}`;
}

/**
 * Format weekly tooltip
 */
function formatWeeklyTooltip(startDate, endDate, count) {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const startMonth = monthNames[start.getMonth()];
    const endMonth = monthNames[end.getMonth()];
    const startDay = start.getDate();
    const endDay = end.getDate();

    const commitText = count === 1 ? 'commit' : 'commits';

    if (start.getMonth() === end.getMonth()) {
        return `${startMonth} ${startDay}-${endDay}: ${count} ${commitText}`;
    } else {
        return `${startMonth} ${startDay} - ${endMonth} ${endDay}: ${count} ${commitText}`;
    }
}

/**
 * Format monthly tooltip
 */
function formatMonthlyTooltip(month, year, count) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];

    const commitText = count === 1 ? 'commit' : 'commits';

    return `${monthNames[month]} ${year}: ${count} ${commitText}`;
}

/**
 * Generate streak tooltip with all-time records
 */
function generateStreakTooltip(data) {
    const records = data.allTimeRecords;
    return `Current: ${data.currentStreak} ${data.streakLabel}
Best ${data.streakLabel.charAt(0).toUpperCase() + data.streakLabel.slice(1)}: ${data.bestStreak}

All-Time Records:
• Daily: ${records.daily} day${records.daily !== 1 ? 's' : ''}
• Weekly: ${records.weekly} week${records.weekly !== 1 ? 's' : ''}
• Monthly: ${records.monthly} month${records.monthly !== 1 ? 's' : ''}`;
}

/**
 * Generate connection status indicator
 */
function generateConnectionStatus(status) {
    if (!status.lastChecked) {
        // Not yet checked - show local mode indicator
        return `<div class="github-status-indicator" title="Using local tracking">
                    <i class="ph ph-database" style="font-size: 0.875rem; color: #737373;"></i>
                </div>`;
    }

    if (status.connected) {
        // Connected successfully
        return `<div class="github-status-indicator" title="Synced with GitHub">
                    <i class="ph ph-check-circle" style="font-size: 0.875rem; color: #10b981;"></i>
                </div>`;
    } else {
        // Connection error
        const errorMsg = status.error || 'Connection failed';
        return `<div class="github-status-indicator" title="${errorMsg}">
                    <i class="ph ph-warning-circle" style="font-size: 0.875rem; color: #ef4444;"></i>
                </div>`;
    }
}
