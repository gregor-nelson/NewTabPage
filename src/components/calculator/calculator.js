// calculator.js - Main calculator widget with tabs

import { evaluate, formatNumber } from './calculatorCore.js';
import { addToHistory, getHistory, clearHistory, getLastResult } from './calculatorHistory.js';
import { generatePLGrid, generatePriceRange, generateTimePeriods, calculateSummaryMetrics, getPLColor } from './optionsGrid.js';
import { getStrategyList, isSimpleStrategy } from './optionsStrategies.js';

// Widget state
let currentTab = 'calc'; // 'calc' or 'options'
let optionsPosition = {
    strike: 150,
    premium: 2.50,
    type: 'call',
    quantity: 10,
    currentPrice: 155,
    daysToExpiration: 42,
    volatility: 46.5,
    strategy: 'long-call'
};

// Widget configuration for registration
export const calculatorWidget = {
    displayName: 'Calculator',
    defaultEnabled: true,
    containerId: 'calculator-container',
    init: initCalculator,
    update: updateCalculator,
    cleanup: () => {},

    layout: {
        defaultPosition: { x: '5%', y: '800px' },
        defaultSize: { width: '360px', height: '320px' },
        minSize: { width: 300, height: 260 },
        resizable: true,
        draggable: true,
        dragHandle: '.widget-header',
        zIndex: 6
    }
};

export function initCalculator(settings) {
    renderCalculator();
}

export function updateCalculator(settings) {
    renderCalculator();
}

function renderCalculator() {
    const container = document.getElementById('calculator-container');
    if (!container) return;

    const widgetHTML = `
        <div class="calc-panel">
            <div class="calc-tabs">
                <button class="calc-tab ${currentTab === 'calc' ? 'active' : ''}" data-tab="calc">
                    Calculator
                </button>
                <button class="calc-tab ${currentTab === 'options' ? 'active' : ''}" data-tab="options">
                    Options
                </button>
            </div>
            ${currentTab === 'calc' ? renderBasicCalculator() : renderOptionsCalculator()}
        </div>
    `;

    container.innerHTML = widgetHTML;

    // Add event listeners
    attachEventListeners();
}

function renderBasicCalculator() {
    const history = getHistory(4);

    const historyHTML = history.map(entry => `
        <div class="calc-history-card">
            <div class="calc-card-header">
                <i class="ph ph-function calc-icon"></i>
                <span class="calc-expression">${escapeHtml(entry.expression)}</span>
            </div>
            <div class="calc-card-data">
                <span class="calc-result">${formatNumber(entry.result)}</span>
                <button class="calc-copy-btn" data-value="${entry.result}" title="Copy result">
                    <i class="ph ph-copy"></i>
                </button>
            </div>
        </div>
    `).join('');

    return `
        <div class="calc-basic">
            <div class="calc-history-grid">
                ${historyHTML || '<div class="calc-empty"><i class="ph ph-calculator"></i><span>Start calculating...</span></div>'}
            </div>
            <div class="calc-input-section">
                <div class="calc-input-card">
                    <i class="ph ph-equals calc-input-icon"></i>
                    <input
                        type="text"
                        class="calc-input"
                        id="calc-input"
                        placeholder="Enter expression..."
                        autocomplete="off"
                        spellcheck="false"
                    />
                    <button class="calc-clear-btn" id="calc-clear-btn" title="Clear history">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderOptionsCalculator() {
    const priceRangePercent = 12;
    const priceSteps = 10;
    const timeSteps = 5;

    const metrics = calculateSummaryMetrics(optionsPosition);
    const grid = generatePLGrid(optionsPosition, priceRangePercent, priceSteps, timeSteps);
    const prices = generatePriceRange(optionsPosition.currentPrice, priceRangePercent, priceSteps);
    const periods = generateTimePeriods(optionsPosition.daysToExpiration, timeSteps);

    // Find max absolute P/L for color scaling
    const maxPL = Math.max(...grid.flat().map(Math.abs));

    const strategyList = getStrategyList();

    return `
        <div class="calc-options">
            <!-- Clean Input Grid -->
            <div class="options-inputs-grid">
                <div class="options-input-card">
                    <div class="options-card-header">
                        <i class="ph ph-chart-line-up options-icon"></i>
                        <span class="options-label">Strategy</span>
                    </div>
                    <select id="options-strategy" class="options-select">
                        ${strategyList.map(s => `
                            <option value="${s.id}" ${s.id === optionsPosition.strategy ? 'selected' : ''}>
                                ${s.name}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="options-input-card">
                    <div class="options-card-header">
                        <i class="ph ph-target options-icon"></i>
                        <span class="options-label">Strike</span>
                    </div>
                    <input type="number" id="options-strike" class="options-input-value"
                           value="${optionsPosition.strike}" step="1" min="0">
                </div>

                <div class="options-input-card">
                    <div class="options-card-header">
                        <i class="ph ph-coin options-icon"></i>
                        <span class="options-label">Premium</span>
                    </div>
                    <input type="number" id="options-premium" class="options-input-value"
                           value="${optionsPosition.premium}" step="0.01" min="0">
                </div>

                <div class="options-input-card">
                    <div class="options-card-header">
                        <i class="ph ph-currency-dollar options-icon"></i>
                        <span class="options-label">Current</span>
                    </div>
                    <input type="number" id="options-current" class="options-input-value"
                           value="${optionsPosition.currentPrice}" step="0.01" min="0">
                </div>

                <div class="options-input-card">
                    <div class="options-card-header">
                        <i class="ph ph-calendar options-icon"></i>
                        <span class="options-label">Days</span>
                    </div>
                    <input type="number" id="options-days" class="options-input-value"
                           value="${optionsPosition.daysToExpiration}" min="0" max="730">
                </div>

                <div class="options-input-card">
                    <div class="options-card-header">
                        <i class="ph ph-swap options-icon"></i>
                        <span class="options-label">Type</span>
                    </div>
                    <div class="options-toggle-group">
                        <button class="options-toggle ${optionsPosition.type === 'call' ? 'active' : ''}" data-type="call">Call</button>
                        <button class="options-toggle ${optionsPosition.type === 'put' ? 'active' : ''}" data-type="put">Put</button>
                    </div>
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="options-summary-grid">
                <div class="options-summary-card">
                    <div class="options-card-header">
                        <i class="ph ph-minus-circle options-icon-neutral"></i>
                        <span class="options-label">Net Debit</span>
                    </div>
                    <span class="options-value">${formatCurrency(metrics.netDebit)}</span>
                </div>

                <div class="options-summary-card">
                    <div class="options-card-header">
                        <i class="ph ph-arrow-down options-icon-negative"></i>
                        <span class="options-label">Max Loss</span>
                    </div>
                    <span class="options-value metric-negative">${formatCurrency(metrics.maxLoss)}</span>
                </div>

                <div class="options-summary-card">
                    <div class="options-card-header">
                        <i class="ph ph-arrow-up options-icon-positive"></i>
                        <span class="options-label">Max Profit</span>
                    </div>
                    <span class="options-value metric-positive">
                        ${metrics.maxProfit === Infinity ? 'Unlimited' : formatCurrency(metrics.maxProfit)}
                    </span>
                </div>

                <div class="options-summary-card">
                    <div class="options-card-header">
                        <i class="ph ph-equals options-icon-neutral"></i>
                        <span class="options-label">Breakeven</span>
                    </div>
                    <span class="options-value">${formatCurrency(metrics.breakeven)}</span>
                </div>
            </div>

            <!-- P/L Grid -->
            <div class="options-grid-section">
                <div class="options-grid-label">
                    <i class="ph ph-table"></i>
                    <span>P&L Heatmap</span>
                </div>
                <div class="options-grid-wrapper">
                    <table class="options-grid">
                        <thead>
                            <tr>
                                <th class="options-grid-corner">Price</th>
                                ${periods.map(p => `<th class="options-grid-header">${p.label}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${grid.map((row, i) => `
                                <tr>
                                    <td class="options-grid-price ${prices[i] === optionsPosition.strike ? 'strike-price' : ''}
                                        ${Math.abs(prices[i] - optionsPosition.currentPrice) < 1 ? 'current-price' : ''}">
                                        $${prices[i].toFixed(0)}
                                    </td>
                                    ${row.map(pl => `
                                        <td class="options-grid-cell" style="background-color: ${getPLColor(pl, maxPL)}">
                                            ${formatPL(pl)}
                                        </td>
                                    `).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function attachEventListeners() {
    // Tab switching
    const tabButtons = document.querySelectorAll('.calc-tab');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentTab = btn.dataset.tab;
            renderCalculator();
        });
    });

    if (currentTab === 'calc') {
        attachCalculatorListeners();
    } else {
        attachOptionsListeners();
    }
}

function attachCalculatorListeners() {
    const input = document.getElementById('calc-input');
    const clearBtn = document.getElementById('calc-clear-btn');

    if (input) {
        input.focus();

        // Enter to calculate
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleCalculation(input.value);
                input.value = '';
            } else if (e.key === 'l' && e.ctrlKey) {
                e.preventDefault();
                clearHistory();
                renderCalculator();
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearHistory();
            renderCalculator();
        });
    }

    // Copy buttons
    const copyButtons = document.querySelectorAll('.calc-copy-btn');
    copyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            copyToClipboard(btn.dataset.value);
            showCopyFeedback(btn);
        });
    });
}

function attachOptionsListeners() {
    // Type toggle
    const toggleButtons = document.querySelectorAll('.options-toggle');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            optionsPosition.type = btn.dataset.type;
            renderCalculator();
        });
    });

    // Input fields
    const inputs = {
        'options-premium': 'premium',
        'options-strike': 'strike',
        'options-current': 'currentPrice',
        'options-quantity': 'quantity',
        'options-days': 'daysToExpiration',
        'options-iv': 'volatility'
    };

    Object.keys(inputs).forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => {
                optionsPosition[inputs[id]] = parseFloat(input.value) || 0;
                renderCalculator();
            });
        }
    });

    // Strategy select
    const strategySelect = document.getElementById('options-strategy');
    if (strategySelect) {
        strategySelect.addEventListener('change', () => {
            optionsPosition.strategy = strategySelect.value;
            renderCalculator();
        });
    }
}

function handleCalculation(expression) {
    if (!expression.trim()) return;

    try {
        const lastResult = getLastResult();
        const result = evaluate(expression, lastResult);
        addToHistory(expression, result);
        renderCalculator();
    } catch (error) {
        console.error('Calculation error:', error);
        // Could show error message in UI
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatCurrency(value) {
    if (!isFinite(value)) return '$0';
    return '$' + Math.abs(value).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function formatPL(value) {
    if (value > 0) {
        return '+' + value.toLocaleString('en-US');
    } else if (value < 0) {
        return value.toLocaleString('en-US');
    } else {
        return '0';
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
        console.error('Failed to copy:', err);
    });
}

function showCopyFeedback(button) {
    const icon = button.querySelector('i');
    if (icon) {
        icon.className = 'ph ph-check';
        setTimeout(() => {
            icon.className = 'ph ph-copy';
        }, 1000);
    }
}
