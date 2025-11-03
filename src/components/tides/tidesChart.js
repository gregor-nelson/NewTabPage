// ============================================
// TIDES CHART - Independent Module
// Handles chart rendering using Chart.js
// Gracefully degrades if Chart.js is unavailable
// ============================================

/**
 * Render tide chart
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array} readings - Array of {time, value} readings
 * @param {Object} options - Chart options
 * @returns {Chart|null} Chart instance or null if Chart.js unavailable
 */
export function renderTideChart(canvas, readings, options = {}) {
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('TidesChart: Chart.js not available, skipping chart render');
        showChartUnavailable(canvas);
        return null;
    }

    const ctx = canvas.getContext('2d');

    // Prepare data
    const chartData = readings.map(r => ({
        x: r.time,
        y: r.value
    }));

    // Determine if we should reduce motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Create chart
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Tide Level',
                data: chartData,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: '#2563eb',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                fill: true,
                tension: 0.4, // Smooth curve
                ...options.datasetOptions
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: prefersReducedMotion ? false : {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'HH:mm'
                        },
                        tooltipFormat: 'MMM dd, HH:mm'
                    },
                    title: {
                        display: false
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        borderDash: [2, 2]
                    },
                    ticks: {
                        color: 'rgba(100, 116, 139, 0.8)',
                        font: {
                            size: 10
                        },
                        maxTicksLimit: 6
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: options.unit || 'm',
                        font: {
                            size: 11,
                            weight: 'bold'
                        },
                        color: 'rgba(100, 116, 139, 0.8)'
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        borderDash: [1, 1]
                    },
                    ticks: {
                        color: 'rgba(100, 116, 139, 0.8)',
                        font: {
                            size: 10
                        },
                        callback: function(value) {
                            return value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            if (context.length === 0) return '';
                            const date = new Date(context[0].parsed.x);
                            return new Intl.DateTimeFormat(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                            }).format(date);
                        },
                        label: function(context) {
                            const value = context.parsed.y;
                            return `${value.toFixed(2)} ${options.unit || 'm'}`;
                        }
                    }
                }
            }
        }
    });

    return chart;
}

/**
 * Render sparkline (minimal chart for compact view)
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array} readings - Array of {time, value} readings
 * @returns {Chart|null} Chart instance or null if Chart.js unavailable
 */
export function renderTideSparkline(canvas, readings) {
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('TidesChart: Chart.js not available, skipping sparkline render');
        showChartUnavailable(canvas);
        return null;
    }

    const ctx = canvas.getContext('2d');

    // Prepare data (use last 20 points for sparkline)
    const recentReadings = readings.slice(-20);
    const chartData = recentReadings.map(r => ({
        x: r.time,
        y: r.value
    }));

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                data: chartData,
                borderColor: '#2563eb',
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // No animation for sparkline
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                x: {
                    type: 'time',
                    display: false
                },
                y: {
                    display: false
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            }
        }
    });

    return chart;
}

/**
 * Show "chart unavailable" message
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
function showChartUnavailable(canvas) {
    const container = canvas.parentElement;
    if (container) {
        container.innerHTML = '<div class="tides-no-chart">Chart unavailable (Chart.js not loaded)</div>';
    }
}

/**
 * Destroy chart safely
 * @param {Chart|null} chart - Chart instance
 */
export function destroyChart(chart) {
    if (chart && typeof chart.destroy === 'function') {
        try {
            chart.destroy();
        } catch (err) {
            console.warn('TidesChart: Error destroying chart', err);
        }
    }
}
