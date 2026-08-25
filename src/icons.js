/* ============================================================================
 * Inline SVG icon set (Material-Symbols / Lucide style, 1.75 stroke).
 * ic(name) -> stroked icon;  icf(name) -> filled icon.
 * Backend payloads reference icons by these key names (see the `ic` fields in
 * src/mock.js results.opportunities). Add a key here to support a new icon.
 * ==========================================================================*/
window.P = {
  file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
  database:'<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.66 3.58 3 8 3s8-1.34 8-3v-13"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/>',
  cloud_upload:'<path d="M7 18a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 8.6a3.6 3.6 0 0 1 .6 7"/><path d="M12 13v8"/><path d="m8.5 16 3.5-3.5L15.5 16"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  check_circle:'<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-4.5"/>',
  shield:'<path d="M20 12.5c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20 4 17.5 4 12.5V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.5 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15v3M20.5 16.5h-3"/>',
  scan:'<path d="M4 20v-7M9 20v-4M14 20v-9"/><circle cx="17.5" cy="7.5" r="3.2"/><path d="m22 12-2.2-2.2"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".7" fill="currentColor" stroke="none"/>',
  handshake:'<path d="m11 17 2 2a1 1 0 0 0 1.5-1.3"/><path d="m13.5 14.5 2.5 2.5a1 1 0 0 0 1.5-1.3l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1 1 0 1 1-1.4-1.4l3-3a5 5 0 0 1 6.1-.7l.5.3a2 2 0 0 0 1.4.25L21 4"/><path d="M3 4 2 14l6.5 6.5a1 1 0 0 0 1.5-1.3"/>',
  arrow_right:'<path d="M4 12h15"/><path d="m13 6 6 6-6 6"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/>',
  rocket:'<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  refresh:'<path d="M3 12a9 9 0 0 1 9-9 9.7 9.7 0 0 1 6.7 2.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.7 9.7 0 0 1-6.7-2.7L3 16"/><path d="M8 16H3v5"/>',
  lock:'<rect x="4" y="10.5" width="16" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  /* opportunity-row icons (referenced by name from the results payload) */
  phone_off:'<path d="M10.7 13.3a16 16 0 0 0 3.4 2.6l1.3-1.3a2 2 0 0 1 2.1-.45 12.8 12.8 0 0 0 2.8.7 2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.07 19.4 19.4 0 0 1-3.3-2.67m-2.7-3.34a19.8 19.8 0 0 1-3.07-8.63A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.1 9.9"/><line x1="22" y1="2" x2="2" y2="22"/>',
  bolt:'<path d="M13 2 4.5 13H11l-1 9 8.5-11H12z"/>',
  checklist:'<path d="M10 6h10M10 12h10M10 18h10"/><path d="m3.5 5.5 1 1 2-2"/><path d="m3.5 11.5 1 1 2-2"/><path d="m3.5 17.5 1 1 2-2"/>',
  forum:'<path d="M21 12a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  car:'<path d="M5.5 11 7 6.9A2 2 0 0 1 8.9 5.5h6.2A2 2 0 0 1 17 6.9L18.5 11M4 11h16a1 1 0 0 1 1 1v4h-3m-12 0H3v-4a1 1 0 0 1 1-1m3 5h10"/><circle cx="7.5" cy="16" r="1.5"/><circle cx="16.5" cy="16" r="1.5"/>',
  calcheck:'<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 3v3.5M16 3v3.5"/><path d="m9 14.5 2 2 4-4"/>',
  dollar:'<circle cx="12" cy="12" r="9"/><path d="M12 6.5v11M9.6 9.3c0-1 1-1.6 2.4-1.6s2.4.6 2.4 1.6-1 1.5-2.4 1.7-2.4.7-2.4 1.7 1 1.6 2.4 1.6 2.4-.6 2.4-1.6"/>',
  moon:'<path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  key:'<circle cx="7.5" cy="15.5" r="5"/><path d="m21 2-9.1 9.1"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  trending_up:'<path d="m3 17 6-6 4 4 8-8"/><path d="M16 7h5v5"/>',
  repeat:'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  /* lead-upload flow icons */
  close:'<path d="M18 6 6 18M6 6l12 12"/>',
  warning:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><circle cx="12" cy="16.5" r=".7" fill="currentColor" stroke="none"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone:'<path d="M13.8 16.6a1 1 0 0 0 1.2-.3l.4-.5a2 2 0 0 1 1.6-.8h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.5.4a1 1 0 0 0-.3 1.2 14 14 0 0 0 6.4 6.4z"/>',
};
window.ic = (n, cls='ic') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]||''}</svg>`;
window.icf = (n, cls='ic') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">${P[n]||''}</svg>`;
