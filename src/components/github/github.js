// github.js - GitHub activity widget with habit grid
import {
    initGitHubService,
    getActivityData,
    recordActivity,
    cleanupGitHubService,
    updateSettings as updateGitHubSettings
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

    // Calculate progress percentage for weekly goal
    const weekProgress = Math.min(100, (data.weekActivity / data.weeklyGoal) * 100);

    // Generate habit grid (4 rows x 7 cols = 28 days)
    const gridHTML = generateHabitGrid(data.last28Days);

    // Calculate dots for today's activity (max 5 dots)
    const todayDots = Math.min(5, data.todayActivity);
    const dotsHTML = generateActivityDots(todayDots);

    const panelHTML = `
        <div class="github-panel">
            <div class="github-header-section">
                <div class="github-streak">
                    <i class="ph ph-fire github-fire-icon"></i>
                    <span class="github-streak-number">${data.currentStreak}</span>
                </div>
                <div class="github-header-right">
                    <i class="ph ph-gear github-settings-icon" id="github-mini-settings"></i>
                </div>
            </div>

            <div class="github-habit-grid-section">
                <div class="github-section-label">Daily Commits • Last 28 Days</div>
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

    // Add click handler for mini settings
    const miniSettingsBtn = document.getElementById('github-mini-settings');
    if (miniSettingsBtn) {
        miniSettingsBtn.addEventListener('click', () => {
            // Open main settings modal
            const settingsBtn = document.getElementById('settings-btn');
            if (settingsBtn) {
                settingsBtn.click();
            }
        });
    }
}

/**
 * Generate habit grid HTML (4 rows x 7 cols)
 */
function generateHabitGrid(last28Days) {
    let html = '';

    // Create 4 rows of 7 days each
    for (let row = 0; row < 4; row++) {
        html += '<div class="github-grid-row">';

        for (let col = 0; col < 7; col++) {
            const index = row * 7 + col;
            const day = last28Days[index];

            // Determine intensity class based on activity count
            let intensityClass = 'github-grid-empty';
            if (day && day.count > 0) {
                if (day.count >= 10) {
                    intensityClass = 'github-grid-high';
                } else if (day.count >= 5) {
                    intensityClass = 'github-grid-medium';
                } else {
                    intensityClass = 'github-grid-low';
                }
            }

            const todayClass = day && day.isToday ? 'github-grid-today' : '';
            const activityCount = day ? day.count : 0;

            // Format tooltip with day of week
            const tooltipText = day ? formatTooltip(day.date, activityCount) : '';

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
        const day = last28Days[index];
        const dateNum = day ? new Date(day.date + 'T00:00:00').getDate() : '';
        html += `<div class="github-grid-date-label">${dateNum}</div>`;
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
 * Format tooltip with day of week and readable date
 */
function formatTooltip(dateString, count) {
    const date = new Date(dateString + 'T00:00:00');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const month = monthNames[date.getMonth()];
    const dayWithOrdinal = getOrdinalSuffix(date.getDate());

    const commitText = count === 1 ? 'commit' : 'commits';

    return `${dayWithOrdinal} ${month}: ${count} ${commitText}`;
}
