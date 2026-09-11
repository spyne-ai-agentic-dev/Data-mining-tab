// Which file this is - picked before the upload is used for anything. These
// six `type` values (crmExport, customer, crmLead, leadList, commLog, sold)
// are confirmed real backend values (CSV_ANALYZE_CHANGES.md's per-file
// `type` on mapping/analyze), not guessed slugs - never add one without
// confirming it against the backend first.
export const FILE_TYPE_OPTIONS = [
  { label: 'Lead list', value: 'leadList' },
  { label: 'CRM lead export', value: 'crmLead' },
  { label: 'CRM export', value: 'crmExport' },
  { label: 'Customer records', value: 'customer' },
  { label: 'Communication log', value: 'commLog' },
  { label: 'Sold records', value: 'sold' },
];
