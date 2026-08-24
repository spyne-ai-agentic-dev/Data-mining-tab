/* ============================================================================
 * Data Mining — runtime config
 *
 * Flip `useMock` to false and set `apiBaseUrl` to wire this page to the backend.
 * When useMock is true (default) the page runs entirely on the bundled sample
 * data in src/mock.js — no network calls — so it can be demoed offline.
 *
 * The three endpoints the backend must implement are documented in src/api.js.
 * ==========================================================================*/
window.DM_CONFIG = {
  useMock: true,                 // true = bundled sample data; false = call the backend
  apiBaseUrl: '/api/data-mining',// e.g. 'https://console.spyne.ai/api/data-mining'
  // Tunables for the analyzing animation (ms). Purely cosmetic.
  analyze: { startDelay: 560, stepMin: 640, stepDone: 820 },
};
