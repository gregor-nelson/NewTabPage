// Load interact.js as a script tag to ensure it loads as UMD
const script = document.createElement('script');
script.src = chrome.runtime.getURL('libs/interact.min.js');
script.type = 'text/javascript';

// Wait for script to load
await new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
});

// Export the global interact object
const interact = window.interact;

if (!interact) {
    console.error('interact.js failed to load!');
}

export default interact;
