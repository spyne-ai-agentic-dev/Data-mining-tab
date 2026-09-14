// Same CRM picker as the main console's campaign upload flow
// (upload-mapping-modal.tsx) - operator can override the auto-detected CRM
// rather than being stuck with whatever team-status reports (or nothing,
// if team-status has no CRM at all).
export const CRM_OPTIONS = [
  'VinSolutions',
  'eLeads CRM',
  'AutoRaptor',
  'Tekion',
  'DealerSocket',
  'Dealertrack',
  'DriveCentric',
  'Other / not listed',
];

// Mechanical label -> slug, same normalization team-status's `crm` field
// already uses (confirmed for "vinsolutions" and "tekion"). The stored
// mapping is keyed on this real slug - never hardcode a guessed one.
// "eLeads CRM" drops the trailing "CRM" the same way "VinSolutions"/
// "Tekion"/etc. never had one baked in - the real slug is "eleads", not
// "eleadscrm".
export function slugifyCrmLabel(label) {
  return label
    .replace(/\s*CRM\s*$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Matches team-status's `crm` slug (e.g. "tekion") against a CRM_OPTIONS
// label, so the picker can default to the dealer's actual connected CRM.
// Compares both sides through the same slugify so "eleads" still matches
// the "eLeads CRM" label. Returns null when the slug isn't one of the
// options listed (caller decides the fallback).
export function matchCrmOptionLabel(crm) {
  if (!crm) return null;
  const normalized = slugifyCrmLabel(crm.trim());
  return CRM_OPTIONS.find((label) => slugifyCrmLabel(label) === normalized) ?? null;
}
