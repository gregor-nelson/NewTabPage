// quicklinks.js - Quick links widget with hardcoded favorite sites

// Hardcoded links with Phosphor icons
const links = [
    {
        label: 'YouTube',
        url: 'https://youtube.com',
        icon: 'ph-youtube-logo',
        color: '#ef4444'
    },
    {
        label: 'Gmail',
        url: 'https://mail.google.com',
        icon: 'ph-envelope-simple',
        color: '#ef4444'
    },
    {
        label: 'Spotify',
        url: 'https://open.spotify.com',
        icon: 'ph-spotify-logo',
        color: '#22c55e'
    },
    {
        label: 'Vite',
        url: 'http://localhost:5173',
        icon: 'ph-lightning',
        color: '#8b5cf6'
    },
    {
        label: 'Outlook',
        url: 'https://outlook.com',
        icon: 'ph-envelope-open',
        color: '#3b82f6'
    },
    {
        label: 'GitHub',
        url: 'https://github.com', // User will update this to their repo
        icon: 'ph-github-logo',
        color: '#a3a3a3'
    }
];

// Widget configuration for registration
export const quickLinksWidget = {
    displayName: 'Quick Links',
    defaultEnabled: true,
    containerId: 'quicklinks-container',
    init: initQuickLinks,
    update: updateQuickLinks,
    cleanup: () => {}, // No cleanup needed

    // Layout configuration for drag/drop/resize
    layout: {
        defaultPosition: { x: '5%', y: '580px' },
        defaultSize: { width: '90%', height: '140px' },
        minSize: { width: 400, height: 120 },
        resizable: { width: true, height: false },  // Width only
        draggable: true,
        dragHandle: '.widget-header',
        zIndex: 5
    }
};

export function initQuickLinks(settings) {
    renderQuickLinks();
}

export function updateQuickLinks(settings) {
    renderQuickLinks();
}

function renderQuickLinks() {
    const container = document.getElementById('quicklinks-container');
    if (!container) return;

    const linksHTML = links.map(link => createLinkCard(link)).join('');

    // Widget HTML structure (no duplicate header)
    const panelHTML = `
        <div class="quicklinks-wrapper">
            <div class="quicklinks-scroll">
                ${linksHTML}
            </div>
        </div>
    `;

    // Find existing wrapper or insert after header
    const widgetHeader = container.querySelector('.widget-header');
    const existingWrapper = container.querySelector('.quicklinks-wrapper');

    if (existingWrapper) {
        existingWrapper.outerHTML = panelHTML;
    } else if (widgetHeader) {
        widgetHeader.insertAdjacentHTML('afterend', panelHTML);
    } else {
        container.innerHTML = panelHTML;
    }

    // Add click handlers to all link cards
    const linkCards = container.querySelectorAll('.quicklink-card');
    linkCards.forEach((card, index) => {
        card.addEventListener('click', () => {
            window.location.href = links[index].url;
        });
    });
}

function createLinkCard(link) {
    return `
        <div class="quicklink-card" data-url="${link.url}">
            <div class="quicklink-icon">
                <i class="ph ${link.icon}"></i>
            </div>
            <div class="quicklink-label">${link.label}</div>
        </div>
    `;
}
