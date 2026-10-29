// Fill-in version of the IRPG Medical Incident Report (ICS 206 WF style, IRPG pp. 120-121).
// Field labels follow the guide's wording. Entries are saved on this device only.
(function () {
  const KEY = 'irpg-medform';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = st => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  const SEV = [
    ['red', 'RED / PRIORITY 1', 'Life or limb threatening injury or illness. Evacuation need is IMMEDIATE. Ex: Unconscious, difficulty breathing, bleeding severely, 2° – 3° burns more than 4 palm sizes, heat stroke, disoriented.'],
    ['yellow', 'YELLOW / PRIORITY 2', 'Serious injury or illness. Evacuation may be DELAYED if necessary. Ex: Significant trauma, unable to walk, 2° – 3° burns not more than 1-3 palm sizes.'],
    ['green', 'GREEN / PRIORITY 3', 'Minor injury or illness. Non-Emergency transport. Ex: Sprains, strains, minor heat-related illness.']
  ];
  const EVAC = [['evac_air', 'Air Ambulance'], ['evac_short', 'Short-Haul/Hoist'], ['evac_ground', 'Ground Ambulance'], ['evac_other', 'Other']];
  const COMMS = [['cmd', 'COMMAND'], ['a2g', 'AIR-TO-GROUND'], ['tac', 'TACTICAL']];
  const COMM_COLS = [['ch', 'Channel Name/#'], ['rx', 'Receive (RX)'], ['rxt', 'Tone/NAC'], ['tx', 'Transmit (TX)'], ['txt', 'Tone/NAC']];

  const val = (st, k) => esc(st[k] || '');
  const text = (st, k, label, ph) => `<label class="mf-f"><span>${label}</span><input type="text" data-mf="${k}" value="${val(st, k)}" placeholder="${esc(ph || '')}" autocomplete="off"></label>`;
  const area = (st, k, label, ph, rows) => `<label class="mf-f"><span>${label}</span><textarea data-mf="${k}" rows="${rows || 3}" placeholder="${esc(ph || '')}">${val(st, k)}</textarea></label>`;
  const check = (st, k, label) => `<label class="mf-c"><input type="checkbox" data-mf="${k}" ${st[k] ? 'checked' : ''}><span>${label}</span></label>`;

  function html() {
    const st = load();
    return `<div class="mf">
<p class="mf-warn"><b>FOR A NON-EMERGENCY INCIDENT, WORK THROUGH CHAIN OF COMMAND TO REPORT AND TRANSPORT INJURED PERSONNEL AS NECESSARY.</b></p>
<p class="mf-warn"><b>FOR A MEDICAL EMERGENCY: IDENTIFY ON-SCENE INCIDENT COMMANDER BY NAME AND POSITION AND ANNOUNCE "MEDICAL EMERGENCY" TO INITIATE RESPONSE FROM IMT COMMUNICATIONS/DISPATCH.</b></p>
<p>Use the following items to communicate situation to communications/dispatch.</p>

<h3>1. Contact Communications / Dispatch</h3>
<p class="mf-note">Verify correct frequency prior to starting report. Ex: "Communications, Div. Alpha. Stand-by for Emergency Traffic."</p>

<h3>2. Incident Status</h3>
<p class="mf-note">Provide incident summary (including number of patients) and command structure. Ex: "Communications, I have a Red priority patient, unconscious, struck by a falling tree. Requesting air ambulance to Forest Road 1 at (Lat. / Long.). This will be the Trout Meadow Medical, IC is TFLD Jones. EMT Smith is providing medical care."</p>
<fieldset class="mf-g"><legend>Severity of Emergency / Transport Priority</legend>
${SEV.map(([v, t, d]) => `<label class="mf-r mf-${v}"><input type="radio" name="sev" data-mf="sev" value="${v}" ${st.sev === v ? 'checked' : ''}><span><b>${t}</b> ${d}</span></label>`).join('')}
<button type="button" class="mf-link" data-mf-clear-radio="sev">Clear selection</button>
</fieldset>
${area(st, 'nature', 'Nature of Injury or Illness and Mechanism of Injury', 'Brief Summary of Injury or Illness (Ex: Unconscious, Struck by Falling Tree)')}
<fieldset class="mf-g"><legend>Evacuation Request</legend>${EVAC.map(([k, t]) => check(st, k, t)).join('')}</fieldset>
${area(st, 'loc', 'Patient Location', 'Descriptive Location and Lat. / Long. (WGS84)', 2)}
<button type="button" class="mf-btn" data-mf-gps>Add my GPS position (Lat. / Long.)</button> <span id="mf-gps-msg" class="mf-note"></span>
${text(st, 'incident', 'Incident Name', 'Geographic Name + Medical (Ex: Trout Meadow Medical)')}
${text(st, 'ic', 'On-Scene Incident Commander', 'Name of on-scene IC of Incident Within an Incident (Ex: TFLD Jones)')}
${text(st, 'care', 'Patient Care', 'Name of Care Provider (Ex: EMT Smith)')}

<h3>3. Initial Patient Assessment</h3>
<p class="mf-note">Complete this section for each patient as applicable (start with the most severe patient). Patient Assessment: <a href="#/p/patient-assessment">See IRPG page 108</a></p>
${area(st, 'assess', 'Patient assessment (one entry per patient)', '', 4)}
${area(st, 'treat', 'Treatment', '', 3)}

<h3>4. Evacuation Plan</h3>
${text(st, 'evacloc', 'Evacuation Location (if different)', 'Descriptive Location (drop point, intersection, etc.) or Lat. / Long.')}
${text(st, 'eta', 'Patient’s ETA to evacuation location')}
${text(st, 'hspot', 'Helispot / Extraction Site Size and Hazards')}

<h3>5. Additional Resources / Equipment Needs</h3>
${area(st, 'resources', 'Needs', 'Example: Paramedic/EMT, crews, immobilization devices, AED, oxygen, trauma bag, IV/fluid(s), splints, rope rescue, wheeled litter, HAZMAT, extrication', 3)}

<h3>6. Communications</h3>
<p class="mf-note">Identify State Air/Ground EMS Frequencies and Hospital Contacts as applicable.</p>
${COMMS.map(([k, t]) => `<fieldset class="mf-g"><legend>${t}</legend><div class="mf-grid">${COMM_COLS.map(([c, l]) => text(st, k + '_' + c, l)).join('')}</div></fieldset>`).join('')}

<h3>7. Contingency</h3>
<p class="mf-note">Considerations: If primary options fail, what actions can be implemented in conjunction with primary evacuation method? Think ahead.</p>
${area(st, 'contingency', 'Contingency', '', 3)}

<h3>8. Additional Information</h3>
${area(st, 'extra', 'Updates/Changes, etc.', '', 3)}

<div class="mf-remember"><b>REMEMBER:</b><ul><li>Confirm ETAs of resources ordered.</li><li>Act according to your level of training.</li><li>Be Alert. Keep Calm. Think Clearly. Act Decisively.</li></ul></div>

<div class="mf-actions">
<button type="button" class="mf-btn mf-primary" data-mf-copy>Copy report text</button>
<button type="button" class="mf-btn" data-mf-reset>Clear form</button>
<span id="mf-msg" class="mf-note" role="status"></span>
</div>
<p class="mf-note">Entries are saved on this device only. Nothing is sent anywhere.</p>
</div>`;
  }

  function report() {
    const st = load(), L = [];
    const add = (label, v) => { if (v && String(v).trim()) L.push(label + ': ' + String(v).trim()); };
    const sev = SEV.find(s => s[0] === st.sev);
    L.push('MEDICAL INCIDENT REPORT');
    add('Priority', sev && sev[1]);
    add('Nature of Injury/Illness and Mechanism', st.nature);
    add('Evacuation Request', EVAC.filter(([k]) => st[k]).map(e => e[1]).join(', '));
    add('Patient Location', st.loc);
    add('Incident Name', st.incident);
    add('On-Scene Incident Commander', st.ic);
    add('Patient Care', st.care);
    add('Initial Patient Assessment', st.assess);
    add('Treatment', st.treat);
    add('Evacuation Location', st.evacloc);
    add('Patient ETA to Evacuation Location', st.eta);
    add('Helispot/Extraction Site Size and Hazards', st.hspot);
    add('Additional Resources/Equipment Needs', st.resources);
    COMMS.forEach(([k, t]) => {
      const parts = COMM_COLS.map(([c, l]) => st[k + '_' + c] ? l + ' ' + st[k + '_' + c] : '').filter(Boolean);
      if (parts.length) L.push('Comms ' + t + ': ' + parts.join(', '));
    });
    add('Contingency', st.contingency);
    add('Additional Information', st.extra);
    return L.join('\n');
  }

  function flash(msg) {
    const el = document.getElementById('mf-msg');
    if (el) { el.textContent = msg; setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3000); }
  }

  function bind(view) {
    view.addEventListener('input', e => {
      const f = e.target.closest('[data-mf]');
      if (!f || f.type === 'radio') return;
      const st = load();
      if (f.type === 'checkbox') st[f.dataset.mf] = f.checked; else st[f.dataset.mf] = f.value;
      save(st);
    });
    view.addEventListener('change', e => {
      const f = e.target.closest('input[type=radio][data-mf]');
      if (!f) return;
      const st = load(); st[f.dataset.mf] = f.value; save(st);
    });
    view.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('[data-mf-clear-radio]')) {
        const st = load(); delete st.sev; save(st);
        view.querySelectorAll('input[name=sev]').forEach(r => { r.checked = false; });
      } else if (t.closest('[data-mf-reset]')) {
        if (confirm('Clear everything entered in this form?')) { try { localStorage.removeItem(KEY); } catch (err) {} view.querySelector('.mf').outerHTML = html(); }
      } else if (t.closest('[data-mf-copy]')) {
        const txt = report();
        const done = () => flash('Copied.');
        const fallback = () => {
          const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); done(); } catch (err) { flash('Copy not available.'); }
          ta.remove();
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
      } else if (t.closest('[data-mf-gps]')) {
        const msg = document.getElementById('mf-gps-msg');
        if (!navigator.geolocation) { msg.textContent = 'Location not available on this device.'; return; }
        msg.textContent = 'Getting position…';
        navigator.geolocation.getCurrentPosition(p => {
          const ll = p.coords.latitude.toFixed(5) + ', ' + p.coords.longitude.toFixed(5) + ' (WGS84)';
          const box = view.querySelector('[data-mf=loc]');
          box.value = (box.value ? box.value + '\n' : '') + 'Lat./Long.: ' + ll;
          const st = load(); st.loc = box.value; save(st);
          msg.textContent = 'Added.';
        }, () => { msg.textContent = 'Could not get position. Check location permission.'; }, { enableHighAccuracy: true, timeout: 15000 });
      }
    });
  }

  window.MedForm = { html, bind };
})();
