/* ============================================================================
 * Bundled sample data (Zeigler Hyundai, from the real 3-yr opportunity scan).
 *
 * This is the CONTRACT the backend must satisfy. When DM_CONFIG.useMock is
 * false, the API returns objects of exactly these shapes:
 *   - GET  .../scans/:id/steps    -> DM_MOCK.steps        (array)
 *   - GET  .../scans/:id/results  -> DM_MOCK.results      (object)
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
    ['Matching against 17 opportunity models','17',''],
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
      note:'17 ready plays (+1 locked) · sorted by how fast they pay off',
      groups:[
        { label:'Quick wins · work your recent and active leads', items:[
          { ic:'phone_off', n:'No-show recovery', d:'Missed an appointment in the last 30 days', el:'8', ap:1.4 },
          { ic:'bolt', n:'Never-worked rescue', d:'Fresh leads that got zero touches', el:'19', ap:1.0 },
          { ic:'checklist', n:'Follow-up never finished', d:'Stopped after 1-4 tries, no appointment', el:'71', ap:1.8 },
          { ic:'forum', n:'Email-to-SMS switch', d:'Worked by email only, no reply', el:'23', ap:0.7 },
          { ic:'clock', n:'Long-dormant re-touch', d:'Contacted 5+ times, never closed', el:'158', ap:1.6 },
          { ic:'car', n:'Inventory match', d:'Wanted a car that was out of stock', el:'18', ap:0.9 },
          { ic:'calcheck', n:'Future-intent callback', d:'Told us to reach out later', el:'10', ap:1.0 },
          { ic:'dollar', n:'Financing re-approach', d:'Credit-blocked, recheck at 60-90d', el:'15', ap:0.5 },
          { ic:'refresh', n:'Bought elsewhere, win back', d:'Re-approach around their 12-month mark', el:'30', ap:0.2 },
        ]},
        { label:'Deep database · built up over the first year', items:[
          { ic:'clock', n:'Aged leads · 31-90d', d:'Went cold after the first week', el:'920', ap:5.8 },
          { ic:'clock', n:'Aged leads · 91-180d', d:'3-6 months old, unsold', el:'1,237', ap:2.4 },
          { ic:'moon', n:'Aged leads · 6-12mo', d:'Dormant, still in the file', el:'4,156', ap:1.8 },
          { ic:'moon', n:'Aged leads · 1-2yr', d:'The biggest single pool', el:'9,023', ap:1.2 },
          { ic:'moon', n:'Aged leads · 2-3yr', d:'Over 2 years old, consent checked first', el:'5,816', ap:2.4 },
          { ic:'key', n:'Trade-in on file', d:'A trade vehicle recorded, 2021 or older', el:'3,628', ap:1.5 },
          { ic:'trending_up', n:'Early upgrade · 12-18mo', d:'Past buyers, payment-neutral upgrade', el:'720', ap:0.9 },
          { ic:'repeat', n:'Buy-back · 18-36mo', d:'Past buyers in the trade cycle', el:'1,582', ap:1.2 },
        ]},
      ],
      locked:{ ic:'lock', n:'Lease-end', d:'Needs lease maturity dates (OEM / lender list)', el:'-', ap:'-' },
      footer:{ label:'Total, at steady state (month 12)', eligible:'21,790', eligibleNote:'reachable', appts:'+26 / mo', apptsNote:'386 in yr 1' },
    },

    reconciliation:'A customer can qualify for more than one play, so the rows overlap; <b style="color:var(--text-2)">21,790</b> is the de-duplicated total you can actually reach. Appointments run higher early while we clear your backlog (they peak near <b style="color:var(--text-2)">45 / month</b>), then settle to <b style="color:var(--text-2)">+26 / month</b>, which is <b style="color:var(--text-2)">386 across year one</b>.',

    cta:{ title:'Ready to turn this on?', desc:'Launch your first campaign and Vini starts booking these appointments tonight.',
          secondary:'Download report', primary:'Launch first campaign' },
  },
};
