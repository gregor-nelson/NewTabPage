// githubDataService.js - GitHub API integration and local tracking

// Constants
const GITHUB_API_BASE = 'https://api.github.com';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache
const LOCAL_STORAGE_KEY = 'github_activity_data';
const SETTINGS_KEY = 'github_settings';

// State
let activityCache = null;
let lastFetchTime = null;
let onDataUpdateCallback = null;
let settings = {
    username: '',
    weeklyGoal: 20,
    useLocalTracking: true // Track locally by default
};

/**
 * Initialize the GitHub data service
 * @param {Function} onDataUpdate - Callback when data updates
 * @param {Object} userSettings - User settings for GitHub
 */
export function initGitHubService(onDataUpdate, userSettings = {}) {
    onDataUpdateCallback = onDataUpdate;

    // Load settings
    loadSettings();

    // Merge with user settings
    if (userSettings.githubUsername) {
        settings.username = userSettings.githubUsername;
    }
    if (userSettings.githubWeeklyGoal) {
        settings.weeklyGoal = userSettings.githubWeeklyGoal;
    }

    // Load cached data
    loadLocalData();

    // If username is set, fetch from GitHub
    if (settings.username) {
        fetchGitHubActivity();
    }

    // Initial callback with current data
    if (onDataUpdateCallback) {
        onDataUpdateCallback(getActivityData());
    }
}

/**
 * Load settings from storage
 */
function loadSettings() {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            settings = { ...settings, ...parsed };
        }
    } catch (error) {
        console.error('Error loading GitHub settings:', error);
    }
}

/**
 * Save settings to storage
 */
function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving GitHub settings:', error);
    }
}

/**
 * Load local activity data from storage
 */
function loadLocalData() {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            activityCache = JSON.parse(stored);
        } else {
            // Initialize with empty data structure
            activityCache = initializeEmptyData();
            saveLocalData();
        }
    } catch (error) {
        console.error('Error loading local data:', error);
        activityCache = initializeEmptyData();
    }
}

/**
 * Save local activity data to storage
 */
function saveLocalData() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activityCache));
    } catch (error) {
        console.error('Error saving local data:', error);
    }
}

/**
 * Initialize empty data structure
 */
function initializeEmptyData() {
    return {
        days: {}, // { 'YYYY-MM-DD': count }
        currentStreak: 0,
        longestStreak: 0,
        lastUpdated: new Date().toISOString()
    };
}

/**
 * Fetch activity from GitHub API
 */
async function fetchGitHubActivity() {
    // Check cache validity
    if (lastFetchTime && Date.now() - lastFetchTime < CACHE_DURATION) {
        return;
    }

    if (!settings.username) {
        return;
    }

    try {
        // Fetch recent events (up to 90 days of public activity)
        const response = await fetch(
            `${GITHUB_API_BASE}/users/${settings.username}/events/public?per_page=100`,
            {
                headers: {
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!response.ok) {
            console.error('GitHub API error:', response.status);
            return;
        }

        const events = await response.json();

        // Process events into daily activity counts
        processGitHubEvents(events);

        lastFetchTime = Date.now();

        // Notify update
        if (onDataUpdateCallback) {
            onDataUpdateCallback(getActivityData());
        }
    } catch (error) {
        console.error('Error fetching GitHub activity:', error);
    }
}

/**
 * Process GitHub events into daily activity
 */
function processGitHubEvents(events) {
    const dailyActivity = {};

    events.forEach(event => {
        const date = new Date(event.created_at);
        const dateKey = formatDateKey(date);

        // Count certain event types as activity
        const activityTypes = [
            'PushEvent',
            'PullRequestEvent',
            'IssuesEvent',
            'PullRequestReviewEvent',
            'CreateEvent'
        ];

        if (activityTypes.includes(event.type)) {
            dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;
        }
    });

    // Merge with existing local data (keep the higher count)
    if (!activityCache) {
        activityCache = initializeEmptyData();
    }

    Object.keys(dailyActivity).forEach(dateKey => {
        const existing = activityCache.days[dateKey] || 0;
        activityCache.days[dateKey] = Math.max(existing, dailyActivity[dateKey]);
    });

    // Recalculate streaks
    calculateStreaks();

    activityCache.lastUpdated = new Date().toISOString();
    saveLocalData();
}

/**
 * Record local activity (for manual tracking)
 */
export function recordActivity(date = new Date(), count = 1) {
    if (!activityCache) {
        activityCache = initializeEmptyData();
    }

    const dateKey = formatDateKey(date);
    activityCache.days[dateKey] = (activityCache.days[dateKey] || 0) + count;

    calculateStreaks();
    activityCache.lastUpdated = new Date().toISOString();
    saveLocalData();

    if (onDataUpdateCallback) {
        onDataUpdateCallback(getActivityData());
    }
}

/**
 * Calculate current and longest streaks
 */
function calculateStreaks() {
    if (!activityCache || !activityCache.days) {
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Check backwards from today
    let checkDate = new Date(today);
    let foundToday = false;

    for (let i = 0; i < 365; i++) {
        const dateKey = formatDateKey(checkDate);
        const hasActivity = activityCache.days[dateKey] > 0;

        if (hasActivity) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);

            if (!foundToday) {
                currentStreak = tempStreak;
                foundToday = true;
            }
        } else {
            if (foundToday) {
                // Streak is broken, stop counting current
                break;
            }
            tempStreak = 0;
        }

        // Move to previous day
        checkDate.setDate(checkDate.getDate() - 1);
    }

    activityCache.currentStreak = currentStreak;
    activityCache.longestStreak = Math.max(longestStreak, activityCache.longestStreak || 0);
}

/**
 * Get activity data for display
 */
export function getActivityData() {
    if (!activityCache) {
        activityCache = initializeEmptyData();
    }

    const today = new Date();
    const todayKey = formatDateKey(today);

    // Get last 28 days of activity
    const last28Days = [];
    for (let i = 27; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = formatDateKey(date);

        last28Days.push({
            date: dateKey,
            count: activityCache.days[dateKey] || 0,
            isToday: i === 0
        });
    }

    // Calculate this week's activity (last 7 days)
    let weekActivity = 0;
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = formatDateKey(date);
        weekActivity += activityCache.days[dateKey] || 0;
    }

    // Get today's activity
    const todayActivity = activityCache.days[todayKey] || 0;

    return {
        currentStreak: activityCache.currentStreak || 0,
        longestStreak: activityCache.longestStreak || 0,
        last28Days: last28Days,
        weekActivity: weekActivity,
        weeklyGoal: settings.weeklyGoal,
        todayActivity: todayActivity,
        username: settings.username
    };
}

/**
 * Update settings
 */
export function updateSettings(newSettings) {
    const oldUsername = settings.username;

    settings = { ...settings, ...newSettings };
    saveSettings();

    // If username changed, refetch
    if (newSettings.username && newSettings.username !== oldUsername) {
        fetchGitHubActivity();
    }
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Cleanup service
 */
export function cleanupGitHubService() {
    onDataUpdateCallback = null;
}

/**
 * Get current settings
 */
export function getSettings() {
    return { ...settings };
}
