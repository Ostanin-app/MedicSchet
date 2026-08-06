// ===================================================
//  ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ===================================================
var undoStack = [];
var undoDebounceTimer = null;
var skipUndo = false;

var tooltip = document.getElementById('customTooltip');
var tooltipTimeout = null;

// ===================================================
//  ОТМЕНА ИЗМЕНЕНИЙ (UNDO) до 10 шагов
// ===================================================
function saveUndoState() {
  if (skipUndo) return;

  var state = {};

  var inputIds = [
    'age','height','weight','sbp','hr','creatinine','hb','hct','plt',
    'pesi_rr','pesi_temp','pesi_spo2','emrPaste','ck_total','ck_mb',
    'na_measured','glucose','potassium','magnesium'
  ];
  inputIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) state[id] = el.value;
  });

  var sexInput = document.getElementById('sex');
  if (sexInput) state['sex'] = sexInput.value;

  var commonCbIds = ['cb_dm','cb_hf','cb_htn','cb_stroke','cb_embolism','cb_vte','cb_vasc','cb_verapamil'];
  commonCbIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) state[id] = el.checked;
  });

  var allScaleCbIds = [
    'grace_killip',
    'grace_arrest','grace_st','grace_enzymes',
    'crusade_female','crusade_hf','crusade_vasc','crusade_dm',
    'arc_oac','arc_ckd_major','arc_hb_major','arc_bleed6m','arc_plt',
    'arc_diathesis','arc_cirrhosis','arc_cancer','arc_ich_spont',
    'arc_ich_trauma','arc_avm','arc_stroke_severe','arc_surgery30d',
    'arc_surgery_dapt','arc_age75','arc_ckd_minor','arc_hb_minor',
    'arc_bleed12m','arc_nsaid','arc_stroke_any',
    'hb_htn','hb_renal','hb_liver','hb_stroke','hb_bleed','hb_inr',
    'hb_age','hb_drugs','hb_alcohol',
    'cha_hf','cha_htn','cha_age75','cha_dm','cha_stroke','cha_vasc',
    'cha_age65','cha_female',
    'cap_age41','cap_obesity','cap_chf','cap_age61','cap_age75',
    'cap_minor_surgery','cap_varicose','cap_ibd','cap_swollen_legs',
    'cap_acs','cap_sepsis','cap_lung_disease','cap_bedrest',
    'cap_pregnancy','cap_miscarriage','cap_oc','cap_copd',
    'cap_arthroscopy','cap_cancer','cap_laparoscopy','cap_bedrest72',
    'cap_cast','cap_cvc','cap_open_surgery',
    'cap_dvt_hx','cap_fam_dvt','cap_factor_v','cap_prothrombin',
    'cap_lupus','cap_anticardiolipin','cap_heparin_hit',
    'cap_other_thrombophilia','cap_hyperhomocys',
    'cap_elective_hip','cap_hip_fx','cap_spinal_trauma','cap_stroke_5','cap_multiple_trauma',
    'pesi_cancer','pesi_hf','pesi_copd','pesi_altered_mental',
    'wells_dvt_signs','wells_alt_diag','wells_hr','wells_immob',
    'wells_prev_dvt','wells_hemoptysis','wells_cancer',
    'geneva_age','geneva_prev_dvt','geneva_surgery','geneva_cancer',
    'geneva_leg_pain','geneva_hemoptysis','geneva_hr75','geneva_hr95',
    'geneva_dvt_signs'
  ];

  allScaleCbIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      if (el.type === 'checkbox') {
        state[id] = el.checked;
      } else if (el.tagName === 'SELECT') {
        state[id] = el.value;
      }
    }
  });

  undoStack.push(state);
  if (undoStack.length > 11) {
    undoStack.shift();
  }

  updateUndoButton();
}

function performUndo() {
  if (undoStack.length <= 1) return;

  if (undoDebounceTimer) {
    clearTimeout(undoDebounceTimer);
    undoDebounceTimer = null;
  }

  undoStack.pop();

  var prevState = undoStack[undoStack.length - 1];

  skipUndo = true;

  var inputIds = [
    'age','height','weight','sbp','hr','creatinine','hb','hct','plt',
    'pesi_rr','pesi_temp','pesi_spo2','emrPaste','ck_total','ck_mb',
    'na_measured','glucose','potassium','magnesium'
  ];
  inputIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el && prevState.hasOwnProperty(id)) {
      el.value = prevState[id];
    }
  });

  var sexInput = document.getElementById('sex');
  if (sexInput && prevState.hasOwnProperty('sex')) {
    sexInput.value = prevState['sex'];
  }
  syncSexFromHidden();

  var commonCbIds = ['cb_dm','cb_hf','cb_htn','cb_stroke','cb_embolism','cb_vte','cb_vasc','cb_verapamil'];
  commonCbIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el && prevState.hasOwnProperty(id)) {
      el.checked = prevState[id];
    }
  });

  var allScaleCbIds = [
    'grace_killip',
    'grace_arrest','grace_st','grace_enzymes',
    'crusade_female','crusade_hf','crusade_vasc','crusade_dm',
    'arc_oac','arc_ckd_major','arc_hb_major','arc_bleed6m','arc_plt',
    'arc_diathesis','arc_cirrhosis','arc_cancer','arc_ich_spont',
    'arc_ich_trauma','arc_avm','arc_stroke_severe','arc_surgery30d',
    'arc_surgery_dapt','arc_age75','arc_ckd_minor','arc_hb_minor',
    'arc_bleed12m','arc_nsaid','arc_stroke_any',
    'hb_htn','hb_renal','hb_liver','hb_stroke','hb_bleed','hb_inr',
    'hb_age','hb_drugs','hb_alcohol',
    'cha_hf','cha_htn','cha_age75','cha_dm','cha_stroke','cha_vasc',
    'cha_age65','cha_female',
    'cap_age41','cap_obesity','cap_chf','cap_age61','cap_age75',
    'cap_minor_surgery','cap_varicose','cap_ibd','cap_swollen_legs',
    'cap_acs','cap_sepsis','cap_lung_disease','cap_bedrest',
    'cap_pregnancy','cap_miscarriage','cap_oc','cap_copd',
    'cap_arthroscopy','cap_cancer','cap_laparoscopy','cap_bedrest72',
    'cap_cast','cap_cvc','cap_open_surgery',
    'cap_dvt_hx','cap_fam_dvt','cap_factor_v','cap_prothrombin',
    'cap_lupus','cap_anticardiolipin','cap_heparin_hit',
    'cap_other_thrombophilia','cap_hyperhomocys',
    'cap_elective_hip','cap_hip_fx','cap_spinal_trauma','cap_stroke_5','cap_multiple_trauma',
    'pesi_cancer','pesi_hf','pesi_copd','pesi_altered_mental',
    'wells_dvt_signs','wells_alt_diag','wells_hr','wells_immob',
    'wells_prev_dvt','wells_hemoptysis','wells_cancer',
    'geneva_age','geneva_prev_dvt','geneva_surgery','geneva_cancer',
    'geneva_leg_pain','geneva_hemoptysis','geneva_hr75','geneva_hr95',
    'geneva_dvt_signs'
  ];

  allScaleCbIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el && prevState.hasOwnProperty(id)) {
      if (el.type === 'checkbox') {
        el.checked = prevState[id];
      } else if (el.tagName === 'SELECT') {
        el.value = prevState[id];
      }
    }
  });

  autofill();
  updateFieldVisibility();
  updateAnalysisPanel();

  updateUndoButton();
  skipUndo = false;
}

function updateUndoButton() {
  var btn = document.getElementById('undoBtn');
  if (!btn) return;
  var countSpan = btn.querySelector('.undo-count');
  var count = undoStack.length - 1;
  if (count < 0) count = 0;
  if (countSpan) countSpan.textContent = count;
  btn.disabled = (undoStack.length <= 1);
}

function scheduleUndo() {
  if (skipUndo) return;
  if (undoDebounceTimer) clearTimeout(undoDebounceTimer);
  undoDebounceTimer = setTimeout(function() {
    saveUndoState();
    undoDebounceTimer = null;
  }, 800);
}

// Полный сброс Undo к чистому базовому состоянию:
// очищает стек, гасит отложенный таймер и сохраняет ровно 1 базовое состояние.
function resetUndoBaseState() {
  if (undoDebounceTimer) {
    clearTimeout(undoDebounceTimer);
    undoDebounceTimer = null;
  }
  skipUndo = false;
  undoStack = [];
  saveUndoState();
}

document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    var activeEl = document.activeElement;
    if (activeEl && activeEl.id === 'emrPaste') return;
    e.preventDefault();
    performUndo();
  }
});

function initUndoTracking() {
  var inputFields = [
    'age','height','weight','sbp','hr','creatinine','hb','hct','plt',
    'pesi_rr','pesi_temp','pesi_spo2','emrPaste','ck_total','ck_mb',
    'na_measured','glucose','potassium','magnesium'
  ];
  inputFields.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', function() {
        scheduleUndo();
      });
    }
  });

  var allTrackedIds = [
    'cb_dm','cb_hf','cb_htn','cb_stroke','cb_embolism','cb_vte','cb_vasc','cb_verapamil',
    'grace_killip',
    'grace_arrest','grace_st','grace_enzymes',
    'crusade_female','crusade_hf','crusade_vasc','crusade_dm',
    'arc_oac','arc_ckd_major','arc_hb_major','arc_bleed6m','arc_plt',
    'arc_diathesis','arc_cirrhosis','arc_cancer','arc_ich_spont',
    'arc_ich_trauma','arc_avm','arc_stroke_severe','arc_surgery30d',
    'arc_surgery_dapt','arc_age75','arc_ckd_minor','arc_hb_minor',
    'arc_bleed12m','arc_nsaid','arc_stroke_any',
    'hb_htn','hb_renal','hb_liver','hb_stroke','hb_bleed','hb_inr',
    'hb_age','hb_drugs','hb_alcohol',
    'cha_hf','cha_htn','cha_age75','cha_dm','cha_stroke','cha_vasc',
    'cha_age65','cha_female',
    'cap_age41','cap_obesity','cap_chf','cap_age61','cap_age75',
    'cap_minor_surgery','cap_varicose','cap_ibd','cap_swollen_legs',
    'cap_acs','cap_sepsis','cap_lung_disease','cap_bedrest',
    'cap_pregnancy','cap_miscarriage','cap_oc','cap_copd',
    'cap_arthroscopy','cap_cancer','cap_laparoscopy','cap_bedrest72',
    'cap_cast','cap_cvc','cap_open_surgery',
    'cap_dvt_hx','cap_fam_dvt','cap_factor_v','cap_prothrombin',
    'cap_lupus','cap_anticardiolipin','cap_heparin_hit',
    'cap_other_thrombophilia','cap_hyperhomocys',
    'cap_elective_hip','cap_hip_fx','cap_spinal_trauma','cap_stroke_5','cap_multiple_trauma',
    'pesi_cancer','pesi_hf','pesi_copd','pesi_altered_mental',
    'wells_dvt_signs','wells_alt_diag','wells_hr','wells_immob',
    'wells_prev_dvt','wells_hemoptysis','wells_cancer',
    'geneva_age','geneva_prev_dvt','geneva_surgery','geneva_cancer',
    'geneva_leg_pain','geneva_hemoptysis','geneva_hr75','geneva_hr95',
    'geneva_dvt_signs'
  ];

  allTrackedIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', function() {
        saveUndoState();
      });
    }
  });

  document.querySelectorAll('.sex-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      setTimeout(function() {
        saveUndoState();
      }, 0);
    });
  });

  saveUndoState();
}

// ===================================================
//  ТЁМНАЯ ТЕМА
// ===================================================
function initTheme() {
  var isDark = localStorage.getItem('darkMode') === 'true';
  var toggleBtn = document.getElementById('themeToggle');
  if (isDark) {
    document.body.classList.add('dark-theme');
    if (toggleBtn) toggleBtn.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-theme');
    if (toggleBtn) toggleBtn.textContent = '🌓';
  }
}

function toggleDarkMode() {
  var isDark = document.body.classList.contains('dark-theme');
  var toggleBtn = document.getElementById('themeToggle');
  if (isDark) {
    document.body.classList.remove('dark-theme');
    localStorage.setItem('darkMode', 'false');
    if (toggleBtn) toggleBtn.textContent = '🌓';
  } else {
    document.body.classList.add('dark-theme');
    localStorage.setItem('darkMode', 'true');
    if (toggleBtn) toggleBtn.textContent = '☀️';
  }
}

// ===================================================
//  ДЕМОНСТРАЦИОННЫЕ СЦЕНАРИИ
// ===================================================
function resetAllFields() {
  var inputIds = ['age','height','weight','sbp','hr','creatinine','hb','hct','plt',
    'pesi_rr','pesi_temp','pesi_spo2','ck_total','ck_mb','na_measured','glucose','potassium','magnesium'];
  inputIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.getElementById('sex').value = '';
  syncSexFromHidden();

  var commonCbs = ['cb_dm','cb_hf','cb_htn','cb_stroke','cb_embolism','cb_vte','cb_vasc','cb_verapamil'];
  commonCbs.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.checked = false;
  });

  var scaleCbs = [
    'grace_arrest','grace_st','grace_enzymes',
    'crusade_female','crusade_hf','crusade_vasc','crusade_dm',
    'arc_oac','arc_ckd_major','arc_hb_major','arc_bleed6m','arc_plt','arc_diathesis','arc_cirrhosis',
    'arc_cancer','arc_ich_spont','arc_ich_trauma','arc_avm','arc_stroke_severe','arc_surgery30d',
    'arc_surgery_dapt','arc_age75','arc_ckd_minor','arc_hb_minor','arc_bleed12m','arc_nsaid','arc_stroke_any',
    'hb_htn','hb_renal','hb_liver','hb_stroke','hb_bleed','hb_inr','hb_age','hb_drugs','hb_alcohol',
    'cha_hf','cha_htn','cha_age75','cha_dm','cha_stroke','cha_vasc','cha_age65','cha_female',
    'cap_age41','cap_obesity','cap_chf','cap_age61','cap_age75',
    'cap_minor_surgery','cap_varicose','cap_ibd','cap_swollen_legs','cap_acs','cap_sepsis',
    'cap_lung_disease','cap_bedrest','cap_pregnancy','cap_miscarriage','cap_oc','cap_copd',
    'cap_arthroscopy','cap_cancer','cap_laparoscopy','cap_bedrest72','cap_cast','cap_cvc','cap_open_surgery',
    'cap_dvt_hx','cap_fam_dvt','cap_factor_v','cap_prothrombin','cap_lupus','cap_anticardiolipin',
    'cap_heparin_hit','cap_other_thrombophilia','cap_hyperhomocys',
    'cap_elective_hip','cap_hip_fx','cap_spinal_trauma','cap_stroke_5','cap_multiple_trauma',
    'pesi_cancer','pesi_hf','pesi_copd','pesi_altered_mental',
    'wells_dvt_signs','wells_alt_diag','wells_hr','wells_immob',
    'wells_prev_dvt','wells_hemoptysis','wells_cancer',
    'geneva_age','geneva_prev_dvt','geneva_surgery','geneva_cancer',
    'geneva_leg_pain','geneva_hemoptysis','geneva_hr75','geneva_hr95',
    'geneva_dvt_signs'
  ];
  scaleCbs.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.checked = false;
  });

  var emrTextarea = document.getElementById('emrPaste');
  if (emrTextarea) emrTextarea.value = '';
  var emrStatus = document.getElementById('emrStatus');
  if (emrStatus) {
    emrStatus.textContent = '⏳ Вставьте текст из ЭМК...';
    emrStatus.style.color = 'var(--muted)';
  }

  document.querySelectorAll('.emr-filled').forEach(function(el) {
    el.classList.remove('emr-filled');
  });

  document.getElementById('results').style.display = 'none';

  updateAnalysisPanel();
}

function fillDemo(scenario) {
  skipUndo = true;
  resetAllFields();
  undoStack = [];

  var allScales = ['ckdepi','cg','grace','crusade','archbr','caprini','hasbled','cha2ds2','pesi','wells','geneva'];
  allScales.forEach(function(scale) {
    var toggleEl = document.querySelector('#toggle_' + scale + ' input');
    if (toggleEl) {
      toggleEl.checked = false;
      toggleScale(scale, toggleEl);
    }
  });

  if (scenario === 'acs') {
    document.getElementById('age').value = 72;
    document.getElementById('sex').value = 'm';
    document.getElementById('height').value = 175;
    document.getElementById('weight').value = 85;
    document.getElementById('sbp').value = 105;
    document.getElementById('hr').value = 95;
    document.getElementById('creatinine').value = 130;
    document.getElementById('hb').value = 125;
    document.getElementById('hct').value = 38;
    document.getElementById('plt').value = 210;
    document.getElementById('cb_dm').checked = true;
    document.getElementById('cb_htn').checked = true;
    document.getElementById('grace_killip').value = 2;
    document.getElementById('grace_st').checked = true;
    document.getElementById('grace_enzymes').checked = true;
    document.getElementById('ck_total').value = 850;
    document.getElementById('ck_mb').value = 68;
    toggleGroup('acs');
  } else if (scenario === 'afib') {
    document.getElementById('age').value = 78;
    document.getElementById('sex').value = 'f';
    document.getElementById('height').value = 160;
    document.getElementById('weight').value = 62;
    document.getElementById('sbp').value = 165;
    document.getElementById('hr').value = 88;
    document.getElementById('creatinine').value = 95;
    document.getElementById('hb').value = 118;
    document.getElementById('hct').value = 36;
    document.getElementById('plt').value = 180;
    document.getElementById('cb_htn').checked = true;
    document.getElementById('cb_dm').checked = true;
    document.getElementById('cb_stroke').checked = true;
    document.getElementById('cb_vasc').checked = true;
    toggleGroup('afib');
  } else if (scenario === 'pe') {
    document.getElementById('age').value = 68;
    document.getElementById('sex').value = 'm';
    document.getElementById('height').value = 182;
    document.getElementById('weight').value = 92;
    document.getElementById('sbp').value = 100;
    document.getElementById('hr').value = 112;
    document.getElementById('pesi_rr').value = 26;
    document.getElementById('pesi_temp').value = '36.7';
    document.getElementById('pesi_spo2').value = 88;
    document.getElementById('hb').value = 140;
    document.getElementById('plt').value = 250;
    document.getElementById('cb_hf').checked = true;
    document.getElementById('pesi_cancer').checked = true;
    document.getElementById('pesi_altered_mental').checked = true;
    document.getElementById('wells_alt_diag').checked = true;
    document.getElementById('wells_prev_dvt').checked = true;
    document.getElementById('geneva_leg_pain').checked = true;
    toggleGroup('pe');
  }

  ['ckdepi', 'cg'].forEach(function(scale) {
    var toggleEl = document.querySelector('#toggle_' + scale + ' input');
    if (toggleEl) {
      if (!toggleEl.checked) {
        toggleEl.checked = true;
        toggleScale(scale, toggleEl);
      }
    }
  });

  skipUndo = false;
  saveUndoState();
  skipUndo = true;

  syncSexFromHidden();
  updateFieldVisibility();
  updateGroupButtonsUI();
  autofill();
  updateAnalysisPanel();
  syncCustomSelects();
  saveAppState();

  skipUndo = false;

  document.querySelector('.scale-selector').scrollIntoView({ behavior: 'smooth' });
}

function toggleDemoMenu() {
  var dropdown = document.getElementById('demoDropdown');
  if (dropdown.style.display === 'none' || dropdown.style.display === '') {
    dropdown.style.display = 'block';
  } else {
    dropdown.style.display = 'none';
  }
}

document.addEventListener('click', function(e) {
  var dropdown = document.getElementById('demoDropdown');
  var demoToggle = document.getElementById('demoToggle');
  if (!demoToggle || !dropdown) return;
  if (!e.target.closest('#demoToggle') && !e.target.closest('#demoDropdown')) {
    dropdown.style.display = 'none';
  }
});

// ===================================================
//  ГЛОБАЛЬНЫЙ ТУЛТИП
// ===================================================
function showTooltip(text, x, y) {
  if (!tooltip) return;

  tooltip.innerText = text;
  tooltip.style.display = 'block';
  tooltip.style.opacity = '0';

  var offset = 12;
  var screenPadding = 12;
  var left = x + offset;
  var top = y + offset;

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';

  var rect = tooltip.getBoundingClientRect();

  if (left + rect.width > window.innerWidth - screenPadding) {
    left = window.innerWidth - rect.width - screenPadding;
  }
  if (top + rect.height > window.innerHeight - screenPadding) {
    top = y - rect.height - offset;
  }
  if (left < screenPadding) left = screenPadding;
  if (top < screenPadding) top = screenPadding;

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';

  setTimeout(function() { tooltip.style.opacity = '1'; }, 10);
}

function hideTooltip() {
  if (!tooltip) return;
  tooltip.style.opacity = '0';
  setTimeout(function() { tooltip.style.display = 'none'; }, 150);
}

function setupTooltipTrigger(icon, text) {
  if (!icon) return;
  icon.dataset.tooltip = text;
  icon.removeEventListener('mouseenter', icon._tooltipEnter);
  icon.removeEventListener('mouseleave', icon._tooltipLeave);
  icon.removeEventListener('mousemove', icon._tooltipMove);

  icon._tooltipEnter = function() {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(function() {
      showTooltip(icon.dataset.tooltip, parseInt(icon.dataset.mouseX), parseInt(icon.dataset.mouseY));
    }, 100);
  };
  icon._tooltipLeave = function() {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    hideTooltip();
  };
  icon._tooltipMove = function(e) {
    icon.dataset.mouseX = e.clientX;
    icon.dataset.mouseY = e.clientY;
  };

  icon.addEventListener('mouseenter', icon._tooltipEnter);
  icon.addEventListener('mouseleave', icon._tooltipLeave);
  icon.addEventListener('mousemove', icon._tooltipMove);
}

// ===================================================
//  TOAST-УВЕДОМЛЕНИЯ
// ===================================================
function showToast(message, type) {
  type = type || 'error';
  var container = document.getElementById('toastContainer');
  if (!container) return;

  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(function() {
    toast.classList.add('fade-out');
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 4000);
}

// ===================================================
//  УТИЛИТЫ
// ===================================================
function parseNum(id) {
  var el = document.getElementById(id);
  if (!el) return null;
  var v = el.value.replace(',', '.');
  var n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function cb(id) {
  var el = document.getElementById(id);
  return el ? el.checked : false;
}

function setCb(id, val) {
  var el = document.getElementById(id);
  if (el) el.checked = val;
}

function toggleScale(name, el) {
  var lbl = document.getElementById('toggle_' + name);
  var blk = document.getElementById('block_' + name);
  if (el.checked) {
    if (lbl) lbl.classList.add('active');
    if (blk) blk.classList.remove('hidden');
  } else {
    if (lbl) lbl.classList.remove('active');
    if (blk) blk.classList.add('hidden');
  }
  updateFieldVisibility();
  updateGroupButtonsUI();
}

function isScaleActive(name) {
  var toggleEl = document.querySelector('#toggle_' + name + ' input');
  return toggleEl ? toggleEl.checked : false;
}

function pluralizeBalls(n) {
  var lastTwo = n % 100;
  var lastOne = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'баллов';
  if (lastOne === 1) return 'балл';
  if (lastOne >= 2 && lastOne <= 4) return 'балла';
  return 'баллов';
}

function pluralizeBallsWells(score) {
  if (score % 1 !== 0) return 'балла';
  return pluralizeBalls(score);
}

function formatWellsScore(score) {
  if (score % 1 === 0) return score.toString();
  return score.toFixed(1).replace('.', ',');
}

function flashField(inputElement) {
  if (!inputElement) return;
  var container = inputElement.closest('.input-group');
  if (!container) {
    container = inputElement.closest('.scale-cb-item');
  }
  if (!container) return;

  container.classList.add('autofill-flash');

  var onAnimationEnd = function() {
    container.classList.remove('autofill-flash');
    container.removeEventListener('animationend', onAnimationEnd);
  };
  container.addEventListener('animationend', onAnimationEnd);
}

// ===================================================
//  ПЕРЕКЛЮЧАТЕЛЬ ПОЛА
// ===================================================
function syncSexFromHidden() {
  var sexInput = document.getElementById('sex');
  if (!sexInput) return;
  var currentVal = sexInput.value;
  var btns = document.querySelectorAll('.sex-btn');
  btns.forEach(function(btn) {
    if (btn.dataset.sex === currentVal) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function initSexToggle() {
  var btns = document.querySelectorAll('.sex-btn');
  var sexInput = document.getElementById('sex');

  function setActive(value) {
    btns.forEach(function(btn) {
      if (btn.dataset.sex === value) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    if (sexInput) sexInput.value = value || '';
  }

  btns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var currentVal = sexInput ? sexInput.value : '';
      var clickedVal = this.dataset.sex;
      if (currentVal === clickedVal) {
        setActive('');
      } else {
        setActive(clickedVal);
      }
      autofill();
      if (typeof updateAnalysisPanel === 'function') updateAnalysisPanel();
    });
  });

  setActive('');
}

// ===================================================
//  ГРУППЫ ШКАЛ
// ===================================================
function toggleGroup(groupName) {
  var scales = [];
  if (groupName === 'acs') {
    scales = ['grace', 'crusade', 'archbr', 'caprini'];
  } else if (groupName === 'afib') {
    scales = ['hasbled', 'cha2ds2'];
  } else if (groupName === 'pe') {
    scales = ['pesi', 'wells', 'geneva'];
  } else {
    return;
  }

  var allActive = scales.every(function(scale) {
    return isScaleActive(scale);
  });

  scales.forEach(function(scale) {
    var toggleEl = document.querySelector('#toggle_' + scale + ' input');
    if (!toggleEl) return;
    var newState = !allActive;
    if (toggleEl.checked !== newState) {
      toggleEl.checked = newState;
      toggleScale(scale, toggleEl);
    }
  });
  updateGroupButtonsUI();
}

function updateGroupButtonsUI() {
  var groups = {
    acs: ['grace', 'crusade', 'archbr', 'caprini'],
    afib: ['hasbled', 'cha2ds2'],
    pe: ['pesi', 'wells', 'geneva']
  };

  for (var groupName in groups) {
    var scales = groups[groupName];
    var allActive = scales.every(function(scale) {
      return isScaleActive(scale);
    });
    var btn = document.querySelector('.group-btn[data-group="' + groupName + '"]');
    if (btn) {
      if (allActive) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  }
}

// ===================================================
//  НАВИГАЦИОННЫЕ КНОПКИ
// ===================================================
function updateNavButtons() {
  var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  var windowHeight = window.innerHeight;
  var documentHeight = document.documentElement.scrollHeight;
  var scrollBottom = scrollTop + windowHeight;

  var isAtTop = scrollTop < 50;
  var isAtBottom = scrollBottom >= documentHeight - 50;

  var btnUp = document.querySelector('.scroll-top-btn');
  var btnDown = document.querySelector('.scroll-down-btn');

  if (!btnUp || !btnDown) return;

  if (isAtTop) {
    btnUp.style.display = 'none';
    btnDown.style.display = 'flex';
  } else if (isAtBottom) {
    btnUp.style.display = 'flex';
    btnDown.style.display = 'none';
  } else {
    btnUp.style.display = 'flex';
    btnDown.style.display = 'flex';
  }
}

// ===================================================
//  ДИСКЛЕЙМЕР
// ===================================================
function acceptDisclaimer() {
  localStorage.setItem('disclaimerAccepted', 'true');
  var overlay = document.getElementById('disclaimerOverlay');
  overlay.classList.remove('visible');
  setTimeout(function() { overlay.style.display = 'none'; }, 300);
}

function checkDisclaimer() {
  var accepted = localStorage.getItem('disclaimerAccepted');
  if (!accepted) {
    var overlay = document.getElementById('disclaimerOverlay');
    overlay.style.display = 'flex';
    setTimeout(function() { overlay.classList.add('visible'); }, 50);
  }
}

// ===================================================
//  ОТРИСОВКА КАРТОЧКИ РЕЗУЛЬТАТА
// ===================================================
function makeResultCard(title, value, interp, risk, details, hint, extraClass) {
  var cls = extraClass ? ' ' + extraClass : '';
  return '<div class="result-card risk-' + risk + cls + '">' +
    '<div class="result-card-header">' + title + '</div>' +
    '<div class="result-card-body">' +
      '<div class="result-value">' + value + '</div>' +
      '<div class="result-interp">' + interp + '</div>' +
      (details ? '<div class="result-details">' + details + '</div>' : '') +
      (hint ? '<div class="result-hint">' + hint + '</div>' : '') +
    '</div>' +
  '</div>';
}

// ===================================================
//  КОПИРОВАНИЕ В БУФЕР ОБМЕНА
// ===================================================
function copyToClipboard() {
  var text = document.getElementById('copyText').textContent;
  navigator.clipboard.writeText(text).then(function() {
    var btn = document.getElementById('copyBtn');
    btn.textContent = '✅ Скопировано!';
    btn.classList.add('copied');
    setTimeout(function() {
      btn.textContent = '📋 Копировать в буфер обмена';
      btn.classList.remove('copied');
    }, 2500);
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    var btn = document.getElementById('copyBtn');
    btn.textContent = '✅ Скопировано!';
    setTimeout(function() { btn.textContent = '📋 Копировать в буфер обмена'; }, 2500);
  });
}

window.copyKInfusion = function(btn) {
  var text = btn.getAttribute('data-text');

  function showCopiedState() {
    btn.innerHTML = '✅ Скопировано!';
    btn.classList.add('copied');
    setTimeout(function() {
      btn.innerHTML = '📋 Копировать назначение';
      btn.classList.remove('copied');
    }, 2000);
  }

  navigator.clipboard.writeText(text).then(function() {
    showCopiedState();
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showCopiedState();
  });
};

// ===================================================
//  КАСТОМНЫЕ РАСКРЫВАЮЩИЕСЯ СПИСКИ
//  Системные <select> в тёмной теме рисуют белую рамку и белое
//  выделение. Оборачиваем нативный select в свой виджет: нативный
//  элемент остаётся в DOM скрытым (с ним работают все скрипты —
//  читают .value и слушают события), а виджет только меняет его
//  значение и шлёт события input/change.
// ===================================================
function initCustomSelect(selectEl) {
  if (!selectEl || selectEl.dataset.customSelect === '1') return;
  selectEl.dataset.customSelect = '1';

  var wrapper = document.createElement('div');
  wrapper.className = 'custom-select';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'custom-select__btn';
  btn.innerHTML = '<span class="custom-select__value"></span><span class="custom-select__arrow">▾</span>';

  var list = document.createElement('div');
  list.className = 'custom-select__list';

  function buildList() {
    list.innerHTML = '';
    for (var i = 0; i < selectEl.options.length; i++) {
      (function(opt, idx) {
        var item = document.createElement('div');
        item.className = 'custom-select__item';
        item.textContent = opt.text;
        item.dataset.index = idx;
        item.addEventListener('click', function() {
          selectEl.value = opt.value;
          selectEl.dispatchEvent(new Event('input', { bubbles: true }));
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          syncLabel();
          closeList();
        });
        list.appendChild(item);
      })(selectEl.options[i], i);
    }
  }

  function syncLabel() {
    var idx = selectEl.selectedIndex;
    btn.querySelector('.custom-select__value').textContent =
      selectEl.options[idx] ? selectEl.options[idx].text : '';
    var items = list.querySelectorAll('.custom-select__item');
    for (var j = 0; j < items.length; j++) {
      items[j].classList.toggle('active', items[j].dataset.index == idx);
    }
  }

  function openList() {
    list.style.display = 'block';
    btn.classList.add('open');
    document.addEventListener('click', outsideClose);
  }

  function closeList() {
    list.style.display = 'none';
    btn.classList.remove('open');
    document.removeEventListener('click', outsideClose);
  }

  function outsideClose(e) {
    if (!wrapper.contains(e.target)) closeList();
  }

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (list.style.display === 'block') closeList(); else openList();
  });

  // Если значение изменили программно (например, демо-сценарий)
  selectEl.addEventListener('change', syncLabel);

  buildList();
  syncLabel();

  // Нативный select прячем визуально, но оставляем в DOM
  selectEl.style.position = 'absolute';
  selectEl.style.opacity = '0';
  selectEl.style.pointerEvents = 'none';
  selectEl.style.width = '1px';
  selectEl.style.height = '1px';

  wrapper.appendChild(btn);
  wrapper.appendChild(list);
  selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);
}

// Синхронизация подписей всех виджетов с их нативными select
// (нужно после программных изменений значений, например, демо)
function syncCustomSelects() {
  document.querySelectorAll('select[data-custom-select="1"]').forEach(function(s) {
    var w = s.parentNode.querySelector('.custom-select');
    if (!w) return;
    var idx = s.selectedIndex;
    var valueEl = w.querySelector('.custom-select__value');
    if (valueEl) valueEl.textContent = s.options[idx] ? s.options[idx].text : '';
    w.querySelectorAll('.custom-select__item').forEach(function(it) {
      it.classList.toggle('active', it.dataset.index == idx);
    });
  });
}

// ===================================================
//  АВТОСОХРАНЕНИЕ ДАННЫХ (localStorage)
//  Значения полей, галочки, радио, списки и поле ЭМК
//  переживают обновление страницы. Ключ версионируется:
//  при изменении формата старые сохранения игнорируются.
// ===================================================
var APP_STATE_KEY = 'medicschet_state';
var APP_STATE_VERSION = 1;
var stateSaveTimer = null;

function collectAppState() {
  var fields = {};
  var els = document.querySelectorAll(
    'input[type="text"], input[type="number"], input[type="checkbox"], ' +
    'input[type="radio"]:checked, select, textarea'
  );
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (!el.id) continue;
    if (el.type === 'checkbox' || el.type === 'radio') {
      fields[el.id] = el.checked;
    } else {
      fields[el.id] = el.value;
    }
  }
  return { version: APP_STATE_VERSION, fields: fields };
}

function saveAppState() {
  try {
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(collectAppState()));
  } catch (e) {
    // Хранилище недоступно или переполнено — молча пропускаем
  }
}

function scheduleStateSave() {
  if (stateSaveTimer) clearTimeout(stateSaveTimer);
  stateSaveTimer = setTimeout(function() {
    stateSaveTimer = null;
    saveAppState();
  }, 400);
}

// Восстановление сохранённого состояния при загрузке страницы.
// Битые/устаревшие сохранения молча игнорируются.
function restoreAppState() {
  var raw = null;
  try {
    raw = localStorage.getItem(APP_STATE_KEY);
  } catch (e) { return; }
  if (!raw) return;

  var data = null;
  try {
    data = JSON.parse(raw);
  } catch (e) { return; }
  if (!data || data.version !== APP_STATE_VERSION || !data.fields) return;

  var fields = data.fields;
  Object.keys(fields).forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var v = fields[id];
    if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = !!v;
    } else {
      el.value = String(v);
    }
  });

  // Применяем видимость блоков шкал и их подсветку по восстановленным чекбоксам
  var scales = ['ckdepi','cg','grace','crusade','archbr','caprini','hasbled','cha2ds2','pesi','wells','geneva'];
  scales.forEach(function(name) {
    var toggleEl = document.querySelector('#toggle_' + name + ' input');
    if (toggleEl) toggleScale(name, toggleEl);
  });
}

// Полный сброс: очищает сохранение, все поля, галочки, списки,
// возвращает все шкалы «включены», прячет результаты и чистит историю отмен.
function resetAllData() {
  try { localStorage.removeItem(APP_STATE_KEY); } catch (e) {}

  resetAllFields();

  // Списки
  var killip = document.getElementById('grace_killip');
  if (killip) killip.value = '1';

  // Переключатели шкал — все включены
  var scales = ['ckdepi','cg','grace','crusade','archbr','caprini','hasbled','cha2ds2','pesi','wells','geneva'];
  scales.forEach(function(name) {
    var toggleEl = document.querySelector('#toggle_' + name + ' input');
    if (toggleEl) {
      toggleEl.checked = true;
      toggleScale(name, toggleEl);
    }
  });

  syncCustomSelects();
  updateFieldVisibility();
  updateGroupButtonsUI();
  updateAnalysisPanel();
  resetUndoBaseState();

  // После сброса — плавно наверх, чтобы было видно начало страницы
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Досохранить при обновлении/закрытии страницы (последний ввод не теряется)
window.addEventListener('pagehide', saveAppState);

// ===================================================
//  КАРТОЧКИ-ЧЕКБОКСЫ: блокировка авто-карточек
//  Клик по авто-карточке (жёлтой, классы .auto-cb /
//  .cb-item.auto-filled) игнорируется — значение приходит
//  из общих данных/анализов. Ручные карточки переключаются
//  штатной label-активацией скрытого чекбокса.
//  Значки-подсказки (⚠️) работают по наведению и не
//  затрагиваются; на всякий случай их клики пропускаем.
// ===================================================
document.addEventListener('click', function(e) {
  var target = e.target;
  if (!target || !target.closest) return;
  if (target.closest('.warning-icon')) return;
  var label = target.closest('label.auto-cb, label.cb-item.auto-filled');
  if (label) e.preventDefault();
});