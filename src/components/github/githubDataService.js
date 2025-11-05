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
let connectionStatus = {
    connected: false,
    error: null,
    lastChecked: null
};
let settings = {
    username: '',
    token: '',
    useAPI: false,
    timeRange: 28,
    weeklyGoal: 20
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
    if (userSettings.githubToken !== undefined) {
        settings.token = userSettings.githubToken;
    }
    if (userSettings.githubUseAPI !== undefined) {
        settings.useAPI = userSettings.githubUseAPI;
    }
    if (userSettings.githubTimeRange !== undefined) {
        settings.timeRange = userSettings.githubTimeRange;
    }
    if (userSettings.githubWeeklyGoal) {
        settings.weeklyGoal = userSettings.githubWeeklyGoal;
    }

    // Load cached data
    loadLocalData();

    // If API mode is enabled and we have credentials, fetch from GitHub
    if (settings.useAPI && settings.username) {
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
        currentDailyStreak: 0,
        longestDailyStreak: 0,
        longestWeeklyStreak: 0,
        longestMonthlyStreak: 0,
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
        connectionStatus.error = 'No username configured';
        return;
    }

    try {
        // Use GraphQL API if token is available, otherwise fall back to REST
        if (settings.token) {
            await fetchContributionCalendar();
        } else {
            await fetchPublicEvents();
        }

        connectionStatus.connected = true;
        connectionStatus.error = null;
        connectionStatus.lastChecked = new Date().toISOString();
        lastFetchTime = Date.now();

        // Notify update
        if (onDataUpdateCallback) {
            onDataUpdateCallback(getActivityData());
        }
    } catch (error) {
        console.error('Error fetching GitHub activity:', error);
        connectionStatus.connected = false;
        connectionStatus.error = error.message;
        connectionStatus.lastChecked = new Date().toISOString();
    }
}

/**
 * Fetch public events (unauthenticated or token-based)
 */
async function fetchPublicEvents() {
    const headers = {
        'Accept': 'application/vnd.github.v3+json'
    };

    // Add authorization if token is available
    if (settings.token) {
        headers['Authorization'] = `token ${settings.token}`;
    }

    const response = await fetch(
        `${GITHUB_API_BASE}/users/${settings.username}/events?per_page=100`,
        { headers }
    );

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Invalid or expired token');
        } else if (response.status === 404) {
            throw new Error('User not found');
        } else {
            throw new Error(`GitHub API error: ${response.status}`);
        }
    }

    const events = await response.json();
    processGitHubEvents(events);
}

/**
 * Fetch contribution calendar via GraphQL (requires token)
 */
async function fetchContributionCalendar() {
    const query = `
        query($userName:String!) {
            user(login: $userName) {
                contributionsCollection {
                    contributionCalendar {
                        totalContributions
                        weeks {
                            contributionDays {
                                contributionCount
                                date
                            }
                        }
                    }
                }
            }
        }
    `;

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `bearer ${settings.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: query,
            variables: {
                userName: settings.username
            }
        })
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Invalid or expired token');
        } else {
            throw new Error(`GitHub GraphQL error: ${response.status}`);
        }
    }

    const result = await response.json();

    if (result.errors) {
        throw new Error(result.errors[0].message);
    }

    processContributionCalendar(result.data.user.contributionsCollection.contributionCalendar);
}

/**
 * Process GraphQL contribution calendar data
 */
function processContributionCalendar(calendar) {
    if (!activityCache) {
        activityCache = initializeEmptyData();
    }

    // Flatten weeks into days
    calendar.weeks.forEach(week => {
        week.contributionDays.forEach(day => {
            if (day.contributionCount > 0) {
                // Keep the higher count (in case we have local data)
                const existing = activityCache.days[day.date] || 0;
                activityCache.days[day.date] = Math.max(existing, day.contributionCount);
            }
        });
    });

    // Recalculate streaks
    calculateStreaks();

    activityCache.lastUpdated = new Date().toISOString();
    saveLocalData();
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
 * Calculate current and longest streaks (daily)
 */
function calculateStreaks() {
    if (!activityCache || !activityCache.days) {
        return;
    }

    // Calculate daily streaks
    const dailyStreaks = calculateDailyStreak();
    activityCache.currentDailyStreak = dailyStreaks.current;
    activityCache.longestDailyStreak = Math.max(dailyStreaks.longest, activityCache.longestDailyStreak || 0);

    // Calculate weekly streaks (for all-time records)
    const weeklyStreaks = calculateWeeklyStreak();
    activityCache.longestWeeklyStreak = Math.max(weeklyStreaks.longest, activityCache.longestWeeklyStreak || 0);

    // Calculate monthly streaks (for all-time records)
    const monthlyStreaks = calculateMonthlyStreak();
    activityCache.longestMonthlyStreak = Math.max(monthlyStreaks.longest, activityCache.longestMonthlyStreak || 0);
}

/**
 * Calculate daily streaks
 */
function calculateDailyStreak() {
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

    return { current: currentStreak, longest: longestStreak };
}

/**
 * Calculate weekly streaks
 */
function calculateWeeklyStreak() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Check backwards by weeks from current week
    let foundCurrentWeek = false;

    for (let weekOffset = 0; weekOffset < 52; weekOffset++) {
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() - (weekOffset * 7));

        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);

        // Check if this week has any activity
        let hasWeekActivity = false;
        for (let d = 0; d < 7; d++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + d);
            const dateKey = formatDateKey(date);
            if (activityCache.days[dateKey] > 0) {
                hasWeekActivity = true;
                break;
            }
        }

        if (hasWeekActivity) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);

            if (!foundCurrentWeek) {
                currentStreak = tempStreak;
                foundCurrentWeek = true;
            }
        } else {
            if (foundCurrentWeek) {
                // Streak is broken, stop counting current
                break;
            }
            tempStreak = 0;
        }
    }

    return { current: currentStreak, longest: longestStreak };
}

/**
 * Calculate monthly streaks
 */
function calculateMonthlyStreak() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Check backwards by months from current month
    let foundCurrentMonth = false;

    for (let monthOffset = 0; monthOffset < 24; monthOffset++) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

        // Check if this month has any activity
        let hasMonthActivity = false;
        const currentDate = new Date(monthStart);
        while (currentDate <= monthEnd) {
            const dateKey = formatDateKey(currentDate);
            if (activityCache.days[dateKey] > 0) {
                hasMonthActivity = true;
                break;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        if (hasMonthActivity) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);

            if (!foundCurrentMonth) {
                currentStreak = tempStreak;
                foundCurrentMonth = true;
            }
        } else {
            if (foundCurrentMonth) {
                // Streak is broken, stop counting current
                break;
            }
            tempStreak = 0;
        }
    }

    return { current: currentStreak, longest: longestStreak };
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
    const timeRange = settings.timeRange || 28;

    // Get time range data based on setting
    let rangeData;
    if (timeRange === 7) {
        rangeData = getDailyData(7);
    } else if (timeRange === 28) {
        rangeData = getDailyData(28);
    } else if (timeRange === 90) {
        rangeData = getWeeklyData(13); // 13 weeks = ~90 days
    } else if (timeRange === 365) {
        rangeData = getMonthlyData(12); // 12 months
    } else {
        rangeData = getDailyData(28); // Default fallback
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

    // Get contextual streak data based on time range
    let currentStreak, bestStreak, streakLabel;

    if (timeRange === 7 || timeRange === 28) {
        // Daily streaks for 7 and 28 day views
        const dailyStreaks = calculateDailyStreak();
        currentStreak = dailyStreaks.current;
        bestStreak = activityCache.longestDailyStreak || 0;
        streakLabel = currentStreak === 1 ? 'day' : 'days';
    } else if (timeRange === 90) {
        // Weekly streaks for 90 day view
        const weeklyStreaks = calculateWeeklyStreak();
        currentStreak = weeklyStreaks.current;
        bestStreak = activityCache.longestWeeklyStreak || 0;
        streakLabel = currentStreak === 1 ? 'week' : 'weeks';
    } else if (timeRange === 365) {
        // Monthly streaks for year view
        const monthlyStreaks = calculateMonthlyStreak();
        currentStreak = monthlyStreaks.current;
        bestStreak = activityCache.longestMonthlyStreak || 0;
        streakLabel = currentStreak === 1 ? 'month' : 'months';
    } else {
        // Default to daily
        const dailyStreaks = calculateDailyStreak();
        currentStreak = dailyStreaks.current;
        bestStreak = activityCache.longestDailyStreak || 0;
        streakLabel = 'days';
    }

    return {
        currentStreak: currentStreak,
        bestStreak: bestStreak,
        streakLabel: streakLabel,
        allTimeRecords: {
            daily: activityCache.longestDailyStreak || 0,
            weekly: activityCache.longestWeeklyStreak || 0,
            monthly: activityCache.longestMonthlyStreak || 0
        },
        timeRange: timeRange,
        rangeData: rangeData,
        weekActivity: weekActivity,
        weeklyGoal: settings.weeklyGoal,
        todayActivity: todayActivity,
        username: settings.username
    };
}

/**
 * Get daily activity data for specified number of days
 */
function getDailyData(days) {
    const today = new Date();
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = formatDateKey(date);

        result.push({
            date: dateKey,
            count: activityCache.days[dateKey] || 0,
            isToday: i === 0,
            type: 'daily'
        });
    }

    return result;
}

/**
 * Get weekly aggregated data for specified number of weeks
 */
function getWeeklyData(weeks) {
    const today = new Date();
    const result = [];

    for (let i = weeks - 1; i >= 0; i--) {
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));

        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);

        let weekTotal = 0;
        let isCurrentWeek = i === 0;

        // Sum up 7 days
        for (let d = 0; d < 7; d++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + d);
            const dateKey = formatDateKey(date);
            weekTotal += activityCache.days[dateKey] || 0;
        }

        result.push({
            date: formatDateKey(weekStart),
            endDate: formatDateKey(weekEnd),
            count: weekTotal,
            isToday: isCurrentWeek,
            type: 'weekly'
        });
    }

    return result;
}

/**
 * Get monthly aggregated data for specified number of months
 */
function getMonthlyData(months) {
    const today = new Date();
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

        let monthTotal = 0;
        let isCurrentMonth = i === 0;

        // Sum up all days in the month
        const currentDate = new Date(monthStart);
        while (currentDate <= monthEnd) {
            const dateKey = formatDateKey(currentDate);
            monthTotal += activityCache.days[dateKey] || 0;
            currentDate.setDate(currentDate.getDate() + 1);
        }

        result.push({
            date: formatDateKey(monthStart),
            month: monthDate.getMonth(),
            year: monthDate.getFullYear(),
            count: monthTotal,
            isToday: isCurrentMonth,
            type: 'monthly'
        });
    }

    return result;
}

/**
 * Update settings
 */
export function updateSettings(newSettings) {
    const oldUsername = settings.username;
    const oldToken = settings.token;
    const oldUseAPI = settings.useAPI;

    settings = { ...settings, ...newSettings };
    saveSettings();

    // If username, token, or API mode changed, refetch
    const shouldRefetch =
        (newSettings.username && newSettings.username !== oldUsername) ||
        (newSettings.token !== undefined && newSettings.token !== oldToken) ||
        (newSettings.useAPI !== undefined && newSettings.useAPI !== oldUseAPI);

    if (shouldRefetch && settings.useAPI && settings.username) {
        // Reset cache to force fresh fetch
        lastFetchTime = null;
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

/**
 * Get connection status
 */
export function getConnectionStatus() {
    return { ...connectionStatus };
}
