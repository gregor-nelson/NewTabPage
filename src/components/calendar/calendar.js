// calendar.js - Calendar component
let currentDate = new Date();
let settings = {
    weekStartsOn: 'monday',
    showWeekNumbers: true
};

// Widget configuration for registration
export const calendarWidget = {
    displayName: 'Calendar',
    defaultEnabled: true,
    containerId: 'calendar-container',
    init: initCalendar,
    update: updateCalendarSettings,
    cleanup: () => {}, // No cleanup needed for calendar

    // Layout configuration for drag/drop/resize
    layout: {
        defaultPosition: { x: '5%', y: '200px' },
        defaultSize: { width: '400px', height: '350px' },
        minSize: { width: 300, height: 280 },
        // No maxSize - can occupy full viewport
        resizable: true,
        draggable: true,
        dragHandle: '.widget-header',
        zIndex: 2
    }
};

export function initCalendar(userSettings) {
    settings = {
        weekStartsOn: userSettings.weekStartsOn || 'monday',
        showWeekNumbers: userSettings.showWeekNumbers !== undefined ? userSettings.showWeekNumbers : true
    };
    renderCalendar();
}

export function updateCalendarSettings(newSettings) {
    settings = {
        weekStartsOn: newSettings.weekStartsOn || settings.weekStartsOn,
        showWeekNumbers: newSettings.showWeekNumbers !== undefined ? newSettings.showWeekNumbers : settings.showWeekNumbers
    };
    renderCalendar();
}

function renderCalendar() {
    const container = document.getElementById('calendar-container');
    if (!container) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Calculate day of year info for current date
    const today = new Date();
    const dayOfYear = getDayOfYear(today);
    const daysInYear = isLeapYear(today.getFullYear()) ? 366 : 365;
    const daysRemaining = daysInYear - dayOfYear;

    // Calendar structure
    const calendarHTML = `
        <div class="calendar-wrapper">
            <!-- Month Header with Navigation -->
            <div class="calendar-header">
                <button id="prev-month"
                        class="calendar-nav-btn"
                        aria-label="Previous month">
                    <i class="ph ph-caret-left"></i>
                </button>
                <div class="calendar-title-wrapper">
                    <h3 class="calendar-month-title">
                        ${getMonthName(month)} ${year}
                    </h3>
                    <p class="calendar-day-counter">
                        Day ${dayOfYear} of ${daysInYear} • ${daysRemaining} days remaining
                    </p>
                </div>
                <button id="next-month"
                        class="calendar-nav-btn"
                        aria-label="Next month">
                    <i class="ph ph-caret-right"></i>
                </button>
            </div>
            
            <!-- Calendar Grid -->
            <table class="calendar-table">
                <thead>
                    <tr>
                        ${settings.showWeekNumbers ? '<th class="calendar-week-col"></th>' : ''}
                        ${getDayHeaders()}
                    </tr>
                </thead>
                <tbody>
                    ${getCalendarRows(year, month)}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = calendarHTML;
    
    // Add event listeners for navigation
    document.getElementById('prev-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('next-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
}

function getDayHeaders() {
    const days = settings.weekStartsOn === 'monday' 
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return days.map(day => `<th class="calendar-day-header">${day}</th>`).join('');
}

function getCalendarRows(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Adjust for week start preference
    let startDay = settings.weekStartsOn === 'monday' 
        ? (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1)
        : startingDayOfWeek;
    
    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
    const currentDay = today.getDate();
    
    let rows = '';
    let day = 1;
    
    // Calculate number of weeks to display
    const totalCells = startDay + daysInMonth;
    const numWeeks = Math.ceil(totalCells / 7);
    
    for (let week = 0; week < numWeeks; week++) {
        rows += '<tr>';
        
        // Week number column
        if (settings.showWeekNumbers && day <= daysInMonth) {
            const weekDate = new Date(year, month, day);
            const weekNum = getWeekNumber(weekDate);
            rows += `<td class="calendar-week-number">${weekNum}</td>`;
        } else if (settings.showWeekNumbers) {
            rows += '<td></td>';
        }
        
        // Day cells
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            const cellIndex = week * 7 + dayOfWeek;

            if (cellIndex < startDay || day > daysInMonth) {
                // Empty cells before first day or after last day
                rows += '<td></td>';
            } else {
                const isToday = isCurrentMonth && day === currentDay;

                // Check if this day is a weekend
                // dayOfWeek 5 and 6 represent Saturday and Sunday when week starts on Monday
                // dayOfWeek 0 and 6 represent Saturday and Sunday when week starts on Sunday
                const isWeekend = settings.weekStartsOn === 'monday'
                    ? (dayOfWeek === 5 || dayOfWeek === 6)
                    : (dayOfWeek === 0 || dayOfWeek === 6);

                const classes = [];
                if (isToday) classes.push('calendar-today');
                if (isWeekend) classes.push('calendar-weekend');

                const cellClass = classes.join(' ');

                rows += `<td class="${cellClass}">${day}</td>`;
                day++;
            }
        }
        
        rows += '</tr>';
    }
    
    return rows;
}

function getMonthName(monthIndex) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthIndex];
}

function getWeekNumber(date) {
    // ISO 8601 week number calculation
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function goToToday() {
    currentDate = new Date();
    renderCalendar();
}
