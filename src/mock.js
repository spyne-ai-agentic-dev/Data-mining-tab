/* ============================================================================
 * Bundled sample data (Zeigler Hyundai, from the real 3-yr opportunity scan).
 *
 * No longer consumed anywhere — api.js always calls the real backend now.
 * Kept as a live reference for the shapes the legacy scan endpoints (see
 * src/api.js header) and the lead-uploads endpoints (leadUpload below) both
 * return, and in case a mock mode gets reintroduced later:
 *   - GET  .../scans/:id/steps    -> DM_MOCK.steps        (array)
 *   - GET  .../scans/:id/results  -> DM_MOCK.results      (object)
 *   - leadUpload.* mirrors the master-fields/analyze/confirm/status shapes
 *     from LEAD_UPLOAD_API.md.
 * `uploadConfig` is frontend product copy for the pre-scan screen.
 *
 * All strings may contain inline <b>/<s> markup where noted; numbers are kept
 * as display strings so the backend controls formatting/rounding.
 * ==========================================================================*/
window.DM_MOCK = {

  /* -------- pre-scan upload screen (frontend copy) -------- */
  uploadConfig: {
    eyebrow: 'Free business health check · normally $99',
    title: 'See the appointments already hiding in your data',
    blurb: 'We do not send anything to your customers. This is a read-only look at what your outbound AI agent could recover from leads you have already paid for.',
    steps: ['Upload your CSVs', 'We analyze 3 years of history', 'See your opportunities + the math'],
    zones: [
      { id:'lead', icon:'file', title:'Lead export · all leads (3 years)', req:'Required · one row per lead',
        columns:['Name','Cell Phone','Status','Date In','Date Closed','Trade Veh','Trade Year','Wanted Vehicle','Source'],
        doneLabel:'all-leads-zeigler.csv · 29,874 rows' },
      { id:'activity', icon:'database', title:'Activity / touch history', req:'Required · calls, texts, notes',
        columns:['Total Touches','Touch 1-7 (type + date)','Status','Notes'],
        doneLabel:'customer-touches.csv · 8,373 activities' },
    ],
    trust: 'Read-only · encrypted · about 30 seconds',
    sampleLabel: 'Use Zeigler sample data',
  },

  /* -------- analyzing steps: [label, value, valueClass('ok'|''), detail] -------- */
  steps: [
    ['Reading your uploaded files','2 files','','Lead export + activity / touch history'],
    ['Checking your file has the right columns','38 / 38 found','ok','Name · Cell Phone · Status · Date In · Date Closed · Trade Veh · Source'],
    ['Checking the data looks clean','99.4% valid','ok','Valid phone numbers, parseable dates, empty rows skipped'],
    ['De-duplicating customer records','29,874 unique','','Merged repeat entries for the same person'],
    ['Reading leads · last 3 years','29,874','',''],
    ['Parsing activity & touch history','8,373','','Calls, texts, notes and appointment events'],
    ['Checking consent & do-not-contact','Cleared','ok','Opted-out and DNC numbers are excluded'],
    ['Filtering to reachable & unsold','21,790','','The pool your outbound agent can actually work'],
    ['Matching against 16 opportunity models','16',''],
    ['Scoring & pricing expected appointments','done',''],
  ],

  /* -------- results payload -------- */
  results: {
    dealer: { name:'Zeigler Hyundai', context:"Here is what our AI found in Zeigler Hyundai's 3 years of lead history." },

    headline: {
      free:{ was:'$99', now:'FREE' },
      eyebrow:'Your business health report',
      big:'$160,000', bigUnit:'more gross profit / year',
      sub:'From customers already sitting in your CRM, that nobody is working today. Your AI outbound agent turns them into <b>386 extra appointments</b> and <b>~64 extra cars sold</b> in year one.',
      metrics:[
        { v:'386', k:'extra appointments / yr' },
        { v:'~64', k:'extra cars sold / yr' },
        { v:'21,790', k:'customers we can work', accent:true },
        { v:'0', k:'worked on autopilot today' },
      ],
      commit:'We commit to what we control: <b>at least +10% more appointments (12 / month)</b> from month one. The rest scales as we work your backlog.',
    },

    profile: [
      { v:'120', k:'Cars sold / month', d:'2026 run rate' },
      { v:'829', k:'New leads / month', d:'3-yr average' },
      { v:'29,874', k:'Leads on file · 3 yrs', d:null },
      { v:'21,790', k:'Reachable & unsold', d:'the pool we mine' },
      { v:'116', k:'Booked appts / mo today', d:'your baseline' },
      { v:'3,632', k:'Past customers', d:'buy-back base' },
    ],
    sources: [
      { n:'Internet', v:19799, c:'#4600F2' },
      { n:'Showroom', v:4023, c:'#0891B2' },
      { n:'Phone', v:3505, c:'#7C4DFF' },
      { n:'Campaign', v:2547, c:'#94A3B8' },
    ],

    math: {
      funnel:[
        { v:'21,790', k:'reachable customers in your CRM', sub:'unworked today' },
        { v:'386', k:'appointments booked / year', sub:'by your AI agent', cls:'brand' },
        { v:'~64', k:'turn into a car sold', sub:'after show + close' },
        { v:'$160K', k:'more gross profit / year', sub:'at $2,500 / car', cls:'money' },
      ],
      // inline markup rendered as-is
      equation:'<b class="num">386</b> appointments <span class="op">×</span> <b>55%</b> show up <span class="op">×</span> <b>30%</b> buy <span class="op">=</span> <b class="num">~64 cars</b> <span class="op">×</span> <b>$2,500</b> gross <span class="op">=</span> <span class="res num">$160,000</span>',
    },

    ramp: {
      title:'Appointments the engine adds each month',
      legend:[ { label:'Extra appointments', color:'#4600F2' }, { label:'+10% commitment', warn:true } ],
      values:[12.3,15.2,24.8,35.9,44.8,44.8,43.7,41.0,41.0,30.1,26.1,26.1],
      baseline:12, baselineLabel:'+12',
      captions:['Starts at our +12 commitment','Peaks while we clear the backlog','Settles at +26 / mo'],
      note:'Extra appointments per month, on top of your current 116',
    },
    payoff: {
      title:'The payoff',
      rows:[
        { k:'Your baseline', v:'116 / mo' },
        { k:'We commit', v:'+12 / mo' },
        { k:'Year-1 appointments', v:'386' },
        { k:'Extra cars sold', v:'~64' },
        { k:'Extra gross profit', v:'$160K', money:true },
        { k:'vs our commitment', v:'2.7×' },
      ],
      foot:'Every <b>$1,000</b> of Vini returns <b>$2,600 to $3,000</b> in appointment value. That is why it pays for itself.',
    },

    opportunities: {
      note:'16 ready plays · sorted by how fast they pay off',
      groups:[
        { label:'Open / unsold leads', items:[
          { ic:'phone_off', n:'No-Show Recovery', d:'Set an appointment but did not show or close', el:'8', ap:1.4 },
          { ic:'car', n:'New Inventory in Stock', d:'Wanted a vehicle that is now on the lot', el:'18', ap:0.9 },
          { ic:'dollar', n:'Inventory Price Drop', d:'Watching a vehicle whose price just dropped', el:'24', ap:0.7 },
          { ic:'clock', n:'Aged Lead 14-30d', d:'Cooled off in the last 2 to 4 weeks', el:'199', ap:1.0 },
          { ic:'clock', n:'Aged Lead 31-90d', d:'Went cold after the first month', el:'920', ap:5.8 },
          { ic:'clock', n:'Aged Lead 90-180d', d:'Three to six months since last activity', el:'1,237', ap:2.4 },
          { ic:'moon', n:'Aged Lead 180+ d', d:'Older than six months, still reachable', el:'18,995', ap:5.4 },
          { ic:'sparkle', n:'OEM Promotions', d:'Eligible for a current manufacturer offer', el:'2,150', ap:1.1 },
          { ic:'repeat', n:'Custom / Win-back Offers', d:'Bought elsewhere or lost, worth a targeted offer', el:'640', ap:0.6 },
          { ic:'check_circle', n:'Visited-user CSAT', d:'Came into the showroom, never bought', el:'1,240', ap:0.4 },
          { ic:'forum', n:'Spoken-with-BDC CSAT', d:'Talked to the BDC, then went quiet', el:'1,560', ap:0.4 },
        ]},
        { label:'Sold / owned leads', items:[
          { ic:'calcheck', n:'Lease Expiry', d:'Lease maturing in the next few months', el:'42', ap:0.6 },
          { ic:'trending_up', n:'Early Upgrade', d:'Past buyers, 12 to 18 months in, payment-neutral', el:'720', ap:0.9 },
          { ic:'key', n:'Equity Mining', d:'Positive equity or a trade on file, 18 to 48 months in', el:'5,210', ap:2.7 },
          { ic:'checklist', n:'NPS Collection (recent sold)', d:'Sold in the last 45 days, ask for a score', el:'184', ap:0.2 },
          { ic:'handshake', n:'Sold-user CSAT', d:'Recent owners, satisfaction and retention', el:'874', ap:0.3 },
        ]},
      ],
      locked:null,
      footer:{ label:'Total, at steady state (month 12)', eligible:'21,790', eligibleNote:'reachable', appts:'+26 / mo', apptsNote:'386 in yr 1' },
    },

    reconciliation:'A customer can qualify for more than one play, so the rows overlap; <b style="color:var(--text-2)">21,790</b> is the de-duplicated total you can actually reach. Appointments run higher early while we clear your backlog (they peak near <b style="color:var(--text-2)">45 / month</b>), then settle to <b style="color:var(--text-2)">+26 / month</b>, which is <b style="color:var(--text-2)">386 across year one</b>.',

    cta:{ title:'Ready to turn this on?', desc:'Launch your first campaign and Vini starts booking these appointments tonight.',
          secondary:'Download report', primary:'Launch first campaign' },
  },

  /* -------- lead-uploads flow (LEAD_UPLOAD_API.md) --------
   * Column names below match the Zeigler sample's own lead export (see
   * uploadConfig.zones[0].columns above) so the mock mapping table reads
   * as the same dealer's file, not a disconnected fixture. */
  leadUpload: {
    // GET /lead-uploads/master-fields
    masterFields: {
      count: 16,
      fields: [
        { key:'consent_call', label:'Call consent', type:'CONSENT', required:false, critical:true,
          description:'Whether the customer may be called. Unmapped means consent.call is not written; existing consent on the customer is left unchanged.' },
        { key:'consent_sms', label:'SMS consent', type:'CONSENT', required:false, critical:true,
          description:'Whether the customer may be texted. Unmapped means SMS steps skipped, calls unaffected.' },
        { key:'consent_email', label:'Email consent', type:'CONSENT', required:false, critical:true,
          description:'Whether the customer may be emailed. Unmapped means email steps skipped.' },
        { key:'external_crm_lead_id', label:'CRM lead ID', type:'STRING', required:false, critical:false,
          description:"The CRM's own lead id. Doubles as the upsert key, so a wrong binding here merges unrelated customers." },
        { key:'name', label:'Customer name', type:'STRING', required:false, critical:false,
          description:'Full customer name. First/last split columns both bind here; the ingest joins them.' },
        { key:'phone', label:'Phone', type:'PHONE', required:false, critical:false,
          description:'Primary contact number. Normalised to 1+10 digits; rows with an unparseable value fail.' },
        { key:'email', label:'Email', type:'EMAIL', required:false, critical:false,
          description:'Customer email address.' },
        { key:'lead_created_at', label:'Lead created at', type:'DATETIME', required:false, critical:false,
          description:'When the lead was created. Every aged / never-contacted window derives from it.' },
        { key:'lead_status', label:'Lead status', type:'STRING', required:false, critical:false,
          description:'Drives the kill list - BAD / SOLD / LOST cancel any scheduled touches on commit.' },
        { key:'lead_source', label:'Lead source', type:'STRING', required:false, critical:false,
          description:'Marketing origin of the lead, e.g. Internet, Showroom, Phone.' },
        { key:'vehicle_interest', label:'Vehicle of interest', type:'STRING', required:false, critical:false,
          description:'What the agent leads the call with - the vehicle the customer enquired about.' },
        { key:'trade_vehicle', label:'Trade-in vehicle', type:'STRING', required:false, critical:false,
          description:'The vehicle the customer is trading in.' },
        { key:'year', label:'Year', type:'STRING', required:false, critical:false,
          description:'Model year of the vehicle of interest.' },
        { key:'last_activity_at', label:'Last activity at', type:'DATETIME', required:false, critical:false,
          description:'Most recent recorded touch on the lead.' },
        { key:'sold_at', label:'Sold / delivered at', type:'DATETIME', required:false, critical:false,
          description:'When the vehicle was sold or delivered - the clock the ownership cycle runs on.' },
        { key:'salesperson', label:'Salesperson', type:'STRING', required:false, critical:false,
          description:'Assigned rep. Used for write-back attribution.' },
      ],
    },

    // POST /lead-uploads/mapping/analyze - single BASE file, matches §3a
    analyze: {
      mappingKey: 'mock-mapping-key-zeigler',
      expiresInSeconds: 10800,
      files: [{
        fileKey: 'all-leads-zeigler',
        fileName: 'all-leads-zeigler.xlsx',
        role: 'BASE',
        columns: [
          { header:'Name', dataType:'STRING', sampleValues:['J*** D***','A*** K***'], mappedField:'name', matchKind:'EXACT', confidence:1, needsConfirmation:false },
          { header:'Cell Phone', dataType:'PHONE', sampleValues:['##########'], mappedField:'phone', matchKind:'EXACT', confidence:1, needsConfirmation:false },
          { header:'Status', dataType:'STRING', sampleValues:['Open','Sold'], mappedField:'lead_status', matchKind:'EXACT', confidence:1, needsConfirmation:false },
          { header:'Date In', dataType:'DATETIME', sampleValues:['2026-01-14'], mappedField:'lead_created_at', matchKind:'EXACT', confidence:1, needsConfirmation:false },
          { header:'Date Closed', dataType:'DATETIME', sampleValues:['2026-02-02'], mappedField:'sold_at', matchKind:'SUBSTRING', confidence:1, needsConfirmation:false },
          { header:'Trade Veh', dataType:'STRING', sampleValues:['Accord'], mappedField:'trade_vehicle', matchKind:'EXACT', confidence:1, needsConfirmation:false },
          { header:'Trade Year', dataType:'STRING', sampleValues:['2019'], mappedField:'year', matchKind:'LLM', confidence:0.81, needsConfirmation:false },
          { header:'Wanted Vehicle', dataType:'STRING', sampleValues:['Tucson'], mappedField:'vehicle_interest', matchKind:'EXACT', confidence:1, needsConfirmation:false },
          { header:'Source', dataType:'STRING', sampleValues:['Internet','Showroom'], mappedField:'lead_source', matchKind:'EXACT', confidence:1, needsConfirmation:false },
          { header:'OK to Call', dataType:'CONSENT', sampleValues:['Yes','No'], mappedField:null, matchKind:'NONE', confidence:0, needsConfirmation:false },
        ],
      }],
      valid: true,
      blocking: [],
      missingRequired: [],
      needsConfirmation: [],
      warnings: [ { code:'CONSENT_UNMAPPED', message:'Call consent is not mapped. Consent will not be written - existing customer consent is left unchanged.' } ],
    },

    // POST /lead-uploads -> 202
    confirm: { flowId: 'mock-flow-zeigler', state: 'queued', warnings: [] },

    // GET /lead-uploads/{flowId}/status - each poll call advances one step,
    // holding on the last (terminal) entry once reached.
    statusSequence: [
      { state:'processing', phase:'INGESTING', processed:6000, total:29874 },
      { state:'processing', phase:'INGESTING', processed:16000, total:29874 },
      { state:'processing', phase:'RECONCILING', processed:26000, total:29874 },
      { state:'completed_with_failures', phase:'DONE',
        result:{ rows:29874, newLeads:412, updated:29222, cancelled:187, eligible:21790, opportunities:[] },
        failures:[ { reason:'INVALID_PHONE', rows:196 }, { reason:'MISSING_REQUIRED_FIELD', rows:44 } ] },
    ],
  },
};
