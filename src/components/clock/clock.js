// clock.js - Clock component
let clockInterval;
let settings = {
    timeFormat: '24h',
    showSeconds: true
};

// Widget configuration for registration
export const clockWidget = {
    displayName: 'Clock',
    defaultEnabled: true,
    containerId: 'clock-container',
    init: initClock,
    update: updateClockSettings,
    cleanup: stopClock,

    // Layout configuration for drag/drop/resize
    layout: {
        defaultPosition: { x: '10%', y: '5%' },
        defaultSize: { width: '80%', height: '150px' },
        minSize: { width: 300, height: 100 },
        // No maxSize - can occupy full viewport
        resizable: { width: true, height: false },  // Width only
        draggable: true,
        dragHandle: null,  // No specific drag handle - drag from anywhere with Ctrl
        zIndex: 1
    }
};

export function initClock(userSettings) {
    settings = {
        timeFormat: userSettings.timeFormat || '24h',
        showSeconds: userSettings.showSeconds !== undefined ? userSettings.showSeconds : true
    };
    updateClock();

    // Update every second
    clockInterval = setInterval(updateClock, 1000);
}

export function updateClockSettings(newSettings) {
    settings = {
        timeFormat: newSettings.timeFormat || settings.timeFormat,
        showSeconds: newSettings.showSeconds !== undefined ? newSettings.showSeconds : settings.showSeconds
    };
    updateClock();
}

function updateClock() {
    const now = new Date();
    const clockElement = document.getElementById('clock');
    const dateLineElement = document.getElementById('date-line');

    if (clockElement) {
        clockElement.textContent = formatTime(now);
    }

    if (dateLineElement) {
        dateLineElement.textContent = formatDateLine(now);
    }
}

function formatTime(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();
    
    if (settings.timeFormat === '12h') {
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        
        if (settings.showSeconds) {
            return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)} ${ampm}`;
        } else {
            return `${padZero(hours)}:${padZero(minutes)} ${ampm}`;
        }
    } else {
        // 24-hour format
        if (settings.showSeconds) {
            return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
        } else {
            return `${padZero(hours)}:${padZero(minutes)}`;
        }
    }
}

function formatDateLine(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    const weekNumber = getWeekNumber(date);
    
    return `${dayName}, ${day} ${monthName}, ${year}, week ${weekNumber}`;
}

function getWeekNumber(date) {
    // ISO 8601 week number calculation
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function padZero(num) {
    return num.toString().padStart(2, '0');
}

export function stopClock() {
    if (clockInterval) {
        clearInterval(clockInterval);
    }
}
