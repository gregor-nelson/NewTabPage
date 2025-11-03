// ============================================
// BACKGROUND SERVICE WORKER
// Handles API requests that require CORS bypass
// ============================================

console.log('Background service worker loaded');

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle tide-related API requests
    if (request.type && request.type.startsWith('TIDES_')) {
        handleTidesRequest(request, sendResponse);
        return true; // Keep the message channel open for async response
    }

    // Add other widget API handlers here if needed
    return false;
});

/**
 * Handle tides API requests
 */
async function handleTidesRequest(request, sendResponse) {
    console.log('Background: Handling tides request', request.type);

    try {
        switch (request.type) {
            case 'TIDES_FETCH_STATION':
                await fetchStationData(request.url, sendResponse);
                break;

            case 'TIDES_FETCH_MEASURES':
                await fetchMeasuresData(request.url, sendResponse);
                break;

            case 'TIDES_FETCH_READINGS':
                await fetchReadingsData(request.url, sendResponse);
                break;

            case 'TIDES_FETCH_UKHO':
                await fetchUKHOData(request.url, sendResponse);
                break;

            default:
                sendResponse({ success: false, error: 'Unknown request type' });
        }
    } catch (error) {
        console.error('Background: Error handling tides request', error);
        sendResponse({
            success: false,
            error: error.message || 'Unknown error'
        });
    }
}

/**
 * Fetch station data from EA API
 */
async function fetchStationData(url, sendResponse) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        sendResponse({ success: true, data });
    } catch (error) {
        console.error('Background: Error fetching station data', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

/**
 * Fetch measures data from EA API
 */
async function fetchMeasuresData(url, sendResponse) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        sendResponse({ success: true, data });
    } catch (error) {
        console.error('Background: Error fetching measures data', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

/**
 * Fetch readings data from EA API
 */
async function fetchReadingsData(url, sendResponse) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        sendResponse({ success: true, data });
    } catch (error) {
        console.error('Background: Error fetching readings data', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

/**
 * Fetch UKHO predictions (optional)
 */
async function fetchUKHOData(url, sendResponse) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        sendResponse({ success: true, data });
    } catch (error) {
        console.error('Background: Error fetching UKHO data', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// Listen for extension install/update events
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed/updated', details.reason);
});
