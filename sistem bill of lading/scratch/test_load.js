const fs = require('fs');

// Mock browser globals
global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { search: '', origin: 'http://localhost:8000', pathname: '/' }
};
global.document = {
    addEventListener: (event, callback) => {
        if (event === 'DOMContentLoaded') {
            global.DOMContentLoadedCallback = callback;
        }
    },
    getElementById: (id) => {
        // Return dummy elements that support addEventListener
        return {
            addEventListener: () => {},
            classList: { add: () => {}, remove: () => {}, toggle: () => {} },
            style: {},
            dataset: {},
            value: '',
            innerHTML: '',
            appendChild: () => {},
            closest: () => ({ querySelector: () => ({ value: '' }) })
        };
    },
    querySelectorAll: () => {
        return {
            forEach: (cb) => cb({
                addEventListener: () => {},
                classList: { add: () => {}, remove: () => {}, toggle: () => {} },
                getAttribute: () => 'tab-general',
                style: {}
            })
        };
    },
    querySelector: () => {
        return {
            addEventListener: () => {},
            classList: { add: () => {}, remove: () => {}, toggle: () => {} },
            style: {}
        };
    },
    createElement: () => ({
        setAttribute: () => {},
        classList: { add: () => {}, remove: () => {}, toggle: () => {} },
        style: {},
        innerHTML: ''
    })
};
global.sessionStorage = {
    getItem: () => 'Nahel',
    removeItem: () => {}
};
global.localStorage = {
    getItem: () => null,
    setItem: () => {}
};
global.navigator = {
    clipboard: {
        writeText: () => Promise.resolve()
    }
};

// Load app.js
try {
    const code = fs.readFileSync('app.js', 'utf-8');
    eval(code);
    console.log("Evaluation of app.js succeeded.");
    
    // Now trigger DOMContentLoaded
    if (global.DOMContentLoadedCallback) {
        global.DOMContentLoadedCallback().then(() => {
            console.log("DOMContentLoaded callback completed successfully.");
        }).catch(err => {
            console.error("Error in DOMContentLoaded callback:", err);
            process.exit(1);
        });
    } else {
        console.error("DOMContentLoaded callback not registered.");
        process.exit(1);
    }
} catch (err) {
    console.error("Error during app.js evaluation:", err);
    process.exit(1);
}
