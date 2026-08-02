// ===================================================
//  ОТМЕНА ИЗМЕНЕНИЙ (UNDO) до 10 шагов
// ===================================================
var undoStack = [];
var undoDebounceTimer = null;
var skipUndo = false;  // флаг для временного отключения записи

function saveUndoState() {
  if (skipUndo) return;

  // Собираем текущее состояние всех отслеживаемых элементов
  var state = {};

  // Числовые/текстовые поля
  var inputIds = [
    'age','height','weight','sbp','hr','creatinine','hb','hct','plt',
    'pesi_rr','pesi_temp','pesi_spo2','emrPaste','ck_total','ck_mb',
    'na_measured','glucose','potassium','magnesium'
  ];
  inputIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) state[id] = el.value;
  });

  // Пол (скрытое поле)
  var sexInput = document.getElementById('sex');
  if (sexInput) state['sex'] = sexInput.value;

  // Общие чекбоксы
  var commonCbIds = ['cb_dm','cb_hf','cb_htn','cb_stroke','cb_vasc','cb_verapamil'];
  commonCbIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) state[id] = el.checked;
  });

  // Чекбоксы шкал и селекты (все элементы с id, которые есть на странице)
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
  // Лимит 11: 10 шагов для отмены + 1 базовое состояние
  if (undoStack.length > 11) {
    undoStack.shift();
  }

  updateUndoButton();
}

function performUndo() {
  // Нельзя отменить, если в стеке только базовое состояние или стек пуст
  if (undoStack.length <= 1) return;

  // ВАЖНО: сразу гасим debounce-таймер.
  // Без этого, если пользователь вводил текст и тут же нажал Ctrl+Z,
  // через 800 мс сработал бы старый таймер и снова добавил отменённое состояние.
  if (undoDebounceTimer) {
    clearTimeout(undoDebounceTimer);
    undoDebounceTimer = null;
  }

  // Удаляем текущее состояние из вершины стека
  undoStack.pop();

  // Теперь вершина стека — это предыдущее состояние, к которому нужно вернуться
  var prevState = undoStack[undoStack.length - 1];

  // Временно отключаем запись в историю при восстановлении (чтобы не было рекурсии)
  skipUndo = true;

  // Восстанавливаем числовые/текстовые поля
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

  // Пол
  var sexInput = document.getElementById('sex');
  if (sexInput && prevState.hasOwnProperty('sex')) {
    sexInput.value = prevState['sex'];
  }
  syncSexFromHidden();  // обновляем визуальный переключатель

  // Общие чекбоксы
  var commonCbIds = ['cb_dm','cb_hf','cb_htn','cb_stroke','cb_vasc','cb_verapamil'];
  commonCbIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el && prevState.hasOwnProperty(id)) {
      el.checked = prevState[id];
    }
  });

  // Чекбоксы шкал и селекты
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

  // Запускаем autofill (внутри он сам не даст записать в историю)
  autofill();
  updateFieldVisibility();
  updateAnalysisPanel();

  // Сначала обновляем кнопку, только потом снимаем блокировку записи
  updateUndoButton();
  skipUndo = false;
}

function updateUndoButton() {
  var btn = document.getElementById('undoBtn');
  if (!btn) return;
  var countSpan = btn.querySelector('.undo-count');
  // Показываем количество шагов, которые можно отменить.
  // Первый элемент стека — это базовое состояние (нельзя отменить),
  // поэтому счётчик = длина стека минус 1.
  var count = undoStack.length - 1;
  if (count < 0) count = 0;
  if (countSpan) countSpan.textContent = count;
  // Кнопка неактивна, если в стеке только базовое состояние (или меньше)
  btn.disabled = (undoStack.length <= 1);
}


// Дебаунс для полей ввода (800 мс)
function scheduleUndo() {
  if (skipUndo) return;
  if (undoDebounceTimer) clearTimeout(undoDebounceTimer);
  undoDebounceTimer = setTimeout(function() {
    saveUndoState();
    undoDebounceTimer = null;
  }, 800);
}

// Горячая клавиша Ctrl+Z
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    // Не перехватываем, если фокус в поле ЭМК (textarea) — там работает родной Undo браузера
    var activeEl = document.activeElement;
    if (activeEl && activeEl.id === 'emrPaste') return;

    e.preventDefault();
    performUndo();
  }
});

// Инициализация обработчиков для отслеживания изменений
function initUndoTracking() {
  // Поля ввода — debounce 800 мс
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

  // Чекбоксы и селекты — мгновенное сохранение при изменении
  var allTrackedIds = [
    'cb_dm','cb_hf','cb_htn','cb_stroke','cb_vasc','cb_verapamil',
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

  // Кнопки пола — сохраняем состояние при клике.
  // setTimeout(..., 0) нужен для того, чтобы дождаться, пока initSexToggle
  // успеет обновить скрытое поле #sex, и только после этого сохранить состояние.
  document.querySelectorAll('.sex-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      setTimeout(function() {
        saveUndoState();
      }, 0);
    });
  });

  // Сохраняем начальное (пустое) состояние как базовое.
  // Оно всегда будет лежать в основании стека и никогда не удаляется при отмене.
  // updateUndoButton сам правильно посчитает счётчик (длина - 1 = 0) и заблокирует кнопку.
  saveUndoState();
}

// Запуск отслеживания при готовности DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUndoTracking);
} else {
  initUndoTracking();
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

// Привязка кнопки
document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', toggleDarkMode);
  }
  initTheme(); // применяем сохранённую тему
});

// Вызов при загрузке (на случай, если DOMContentLoaded уже сработал)
if (document.readyState === 'loading') {
  // ещё не загружен, ждём
} else {
  initTheme(); // DOM уже готов
}

// ===================================================
//  ДЕМОНСТРАЦИОННЫЕ СЦЕНАРИИ
// ===================================================
function resetAllFields() {
  // Сброс всех input-полей
  var inputIds = ['age','height','weight','sbp','hr','creatinine','hb','hct','plt','pesi_rr','pesi_temp','pesi_spo2','ck_total','ck_mb','na_measured','glucose','potassium','magnesium'];
  inputIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  // Сброс пола (скрытое поле и переключатель)
  document.getElementById('sex').value = '';
  syncSexFromHidden();
  
  // Сброс всех чекбоксов общих данных
  var commonCbs = ['cb_dm','cb_hf','cb_htn','cb_stroke','cb_vasc','cb_verapamil'];
  commonCbs.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.checked = false;
  });
  
  // Сброс чекбоксов всех шкал
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
  
  // Очистка поля ЭМК и статуса
  var emrTextarea = document.getElementById('emrPaste');
  if (emrTextarea) emrTextarea.value = '';
  var emrStatus = document.getElementById('emrStatus');
  if (emrStatus) {
    emrStatus.textContent = '⏳ Вставьте текст из ЭМК...';
    emrStatus.style.color = '#888';
  }
  
  // Убираем классы emr-filled
  document.querySelectorAll('.emr-filled').forEach(function(el) { el.classList.remove('emr-filled'); });
  
  // Скрываем результаты
  document.getElementById('results').style.display = 'none';

  // Обновляем боковой блок анализа после программного сброса полей КФК
  updateAnalysisPanel();
}

function fillDemo(scenario) {
  skipUndo = true;
  resetAllFields();
  // Очищаем стек полностью
  undoStack = [];
  
  // Сначала выключаем все шкалы (устанавливаем checked = false)
  var allScales = ['ckdepi','cg','grace','crusade','archbr','caprini','hasbled','cha2ds2','pesi','wells','geneva'];
  allScales.forEach(function(scale) {
    var toggleEl = document.querySelector('#toggle_' + scale + ' input');
    if (toggleEl) {
      toggleEl.checked = false;
      toggleScale(scale, toggleEl);
    }
  });
  
  // Устанавливаем демо-данные и включаем нужные шкалы
  if (scenario === 'acs') {
    // ОКС
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
    
    // Включаем группу ОКС
    toggleGroup('acs');
  } else if (scenario === 'afib') {
    // ФП
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
    
    // Включаем группу ФП
    toggleGroup('afib');
  } else if (scenario === 'pe') {
    // ТЭЛА
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
     // Wells
    document.getElementById('wells_alt_diag').checked = true;
    document.getElementById('wells_prev_dvt').checked = true;
    // Geneva
    document.getElementById('geneva_leg_pain').checked = true;
    // Включаем группу ТЭЛА
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

  // Снимаем блокировку записи, сохраняем демо-состояние как новую базу стека,
  // затем снова блокируем — чтобы дальнейший код внутри fillDemo не писал лишнего
  skipUndo = false;
  saveUndoState();
  skipUndo = true;

  // Синхронизируем визуальное отображение пола
  syncSexFromHidden();
  
  // Обновляем видимость полей и кнопок групп
  updateFieldVisibility();
  updateGroupButtonsUI();
  
  // Запускаем автозаполнение (авто-чекалки шкал)
  autofill();
  updateAnalysisPanel();
  
  skipUndo = false;

  // Прокручиваем к шкалам (или к верху, где видны активные шкалы)
  document.querySelector('.scale-selector').scrollIntoView({ behavior: 'smooth' });
}

// Управление выпадающим меню
function toggleDemoMenu() {
  var dropdown = document.getElementById('demoDropdown');
  if (dropdown.style.display === 'none' || dropdown.style.display === '') {
    dropdown.style.display = 'block';
  } else {
    dropdown.style.display = 'none';
  }
}

// Закрытие меню при клике вне его
document.addEventListener('click', function(e) {
  var dropdown = document.getElementById('demoDropdown');
  var demoToggle = document.getElementById('demoToggle');
  if (!demoToggle || !dropdown) return;
  if (!e.target.closest('#demoToggle') && !e.target.closest('#demoDropdown')) {
    dropdown.style.display = 'none';
  }
});

// Обработчики на пункты меню
document.addEventListener('DOMContentLoaded', function() {
  var items = document.querySelectorAll('#demoDropdown .demo-item');
  items.forEach(function(item) {
    item.addEventListener('click', function() {
      var scenario = this.dataset.demo;
      fillDemo(scenario);
      document.getElementById('demoDropdown').style.display = 'none';
    });
  });

    var demoToggle = document.getElementById('demoToggle');
  if (demoToggle) {
    demoToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleDemoMenu();
    });
  }

  var undoBtn = document.getElementById('undoBtn');
  if (undoBtn) {
    undoBtn.addEventListener('click', performUndo);
  }
});

// Глобальный тултип
let tooltip = document.getElementById('customTooltip');
let tooltipTimeout = null;

function showTooltip(text, x, y) {
  if (!tooltip) return;

  tooltip.innerText = text;
  tooltip.style.display = 'block';
  tooltip.style.opacity = '0';

  var offset = 12;
  var screenPadding = 12;

  // Сначала ставим тултип в обычную позицию
  var left = x + offset;
  var top = y + offset;

  // Даем браузеру посчитать реальные размеры тултипа
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';

  var rect = tooltip.getBoundingClientRect();

  // Если не хватает места справа — сдвигаем влево
  if (left + rect.width > window.innerWidth - screenPadding) {
    left = window.innerWidth - rect.width - screenPadding;
  }

  // Если не хватает места снизу — показываем выше курсора
  if (top + rect.height > window.innerHeight - screenPadding) {
    top = y - rect.height - offset;
  }

  // Защита от ухода за левый и верхний край
  if (left < screenPadding) left = screenPadding;
  if (top < screenPadding) top = screenPadding;

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';

  setTimeout(() => { tooltip.style.opacity = '1'; }, 10);
}

function hideTooltip() {
  if (!tooltip) return;
  tooltip.style.opacity = '0';
  setTimeout(() => { tooltip.style.display = 'none'; }, 150);
}

function setupTooltipTrigger(icon, text) {
  if (!icon) return;
  icon.dataset.tooltip = text;
  icon.removeEventListener('mouseenter', icon._tooltipEnter);
  icon.removeEventListener('mouseleave', icon._tooltipLeave);
  icon.removeEventListener('mousemove', icon._tooltipMove);
  
  icon._tooltipEnter = () => {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => {
      showTooltip(icon.dataset.tooltip, parseInt(icon.dataset.mouseX), parseInt(icon.dataset.mouseY));
    }, 100);
  };
  icon._tooltipLeave = () => {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    hideTooltip();
  };
  icon._tooltipMove = (e) => {
    icon.dataset.mouseX = e.clientX;
    icon.dataset.mouseY = e.clientY;
  };
  
  icon.addEventListener('mouseenter', icon._tooltipEnter);
  icon.addEventListener('mouseleave', icon._tooltipLeave);
  icon.addEventListener('mousemove', icon._tooltipMove);
}

// ===================================================
//  ПОКАЗ ВСПЛЫВАЮЩЕГО УВЕДОМЛЕНИЯ
// ===================================================
function showToast(message, type = 'error') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Автоматическое удаление через 4 секунды
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 4000);
}

// ===================================================
//  УТИЛИТЫ
// ===================================================
function parseNum(id) {
  var v = document.getElementById(id).value.replace(',', '.');
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
  if (el.checked) {
    lbl.classList.add('active');
    var blk = document.getElementById('block_' + name);
    if (blk) blk.classList.remove('hidden');
  } else {
    lbl.classList.remove('active');
    var blk = document.getElementById('block_' + name);
    if (blk) blk.classList.add('hidden');
  }
  updateFieldVisibility();
  updateGroupButtonsUI();
}

function isScaleActive(name) {
  // Check toggle checkbox
  var toggleEl = document.querySelector('#toggle_' + name + ' input');
  return toggleEl ? toggleEl.checked : false;
}

// Склонение слова "балл" для русского языка
function pluralizeBalls(n) {
  var lastTwo = n % 100;
  var lastOne = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'баллов';
  if (lastOne === 1) return 'балл';
  if (lastOne >= 2 && lastOne <= 4) return 'балла';
  return 'баллов';
}

// Анимация подсветки поля при автоматическом заполнении
function flashField(inputElement) {
  if (!inputElement) return;
  
  // Для полей ввода подсвечиваем родительский .input-group
  let container = inputElement.closest('.input-group');
  if (!container) {
    // Для чекбоксов в шкалах подсвечиваем сам .scale-cb-item
    container = inputElement.closest('.scale-cb-item');
  }
  if (!container) return;
  
  container.classList.add('autofill-flash');
  
  const onAnimationEnd = () => {
    container.classList.remove('autofill-flash');
    container.removeEventListener('animationend', onAnimationEnd);
  };
  container.addEventListener('animationend', onAnimationEnd);
}

// ===================================================
//  CKD-EPI 2021
// ===================================================
function calcCKDEPI(age, sex, creatUmol) {
  // creatinine µmol/L → mg/dL
  var crMg = creatUmol / 88.4;
  var eGFR;
  if (sex === 'f') {
    var kappa = 0.7;
    var alpha = crMg <= kappa ? -0.241 : -1.200;
    eGFR = 142 * Math.pow(crMg / kappa, alpha) * Math.pow(0.9938, age) * 1.012;
  } else {
    var kappa = 0.9;
    var alpha = crMg <= kappa ? -0.302 : -1.200;
    eGFR = 142 * Math.pow(crMg / kappa, alpha) * Math.pow(0.9938, age);
  }
  return Math.round(eGFR * 10) / 10;
}

function ckdStage(egfr) {
  if (egfr >= 90) return { stage: 'G1', stageRu: 'C1', label: 'ХБП С1 (норма или ↑)' };
  if (egfr >= 60) return { stage: 'G2', stageRu: 'C2', label: 'ХБП С2 (незначительно снижена)' };
  if (egfr >= 45) return { stage: 'G3a', stageRu: 'C3а', label: 'ХБП С3а (умеренно снижена)' };
  if (egfr >= 30) return { stage: 'G3b', stageRu: 'C3б', label: 'ХБП С3б (существенно снижена)' };
  if (egfr >= 15) return { stage: 'G4', stageRu: 'C4', label: 'ХБП С4 (тяжело снижена)' };
  return { stage: 'G5', stageRu: 'C5', label: 'ХБП С5 (терминальная)' };
}

// ===================================================
//  КОКРОФТ-ГОЛТ (без ППТ)
// ===================================================
function calcCG(age, sex, weight, creatUmol) {
  // Защита от некорректных данных
  if (age === null || age >= 140) return null;
  if (weight === null || weight <= 0) return null;
  if (creatUmol === null || creatUmol <= 0) return null;

  var crMg = creatUmol / 88.4;
  var crcl = ((140 - age) * weight) / (72 * crMg);
  if (sex === 'f') crcl *= 0.85;
  
  // Клиренс не может быть отрицательным (если age >140 уже отсекли)
  if (crcl < 0) return null;
  
  return Math.round(crcl * 10) / 10;
}

// ===================================================
//  Площадь поверхности тела (Мостеллер)
// ===================================================
function calcBSA(heightCm, weightKg) {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  return Math.sqrt((heightCm * weightKg) / 3600);
}

function calcIBW(heightCm, sex) {
  if (!heightCm || heightCm <= 0 || !sex) return null;
  var inches = heightCm / 2.54;
  var base = sex === 'f' ? 45.5 : 50;
  var ibw = base + 2.3 * (inches - 60);
  return Math.round(ibw * 10) / 10;
}

function calcABW04(actualWeight, ibw) {
  if (actualWeight === null || actualWeight <= 0 || ibw === null || ibw <= 0) return null;
  if (actualWeight <= ibw) return Math.round(actualWeight * 10) / 10;
  return Math.round((ibw + 0.4 * (actualWeight - ibw)) * 10) / 10;
}

function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  return Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10;
}

function getWorkingCrClData(age, sex, height, weight, creatUmol) {
  if (age === null || !sex || height === null || height <= 0 || weight === null || weight <= 0 || creatUmol === null || creatUmol <= 0) {
    return null;
  }

  var tbwCrcl = calcCG(age, sex, weight, creatUmol);
  if (tbwCrcl === null) return null;

  var bmi = calcBMI(weight, height);
  var ibw = calcIBW(height, sex);
  var ibwCrcl = ibw !== null ? calcCG(age, sex, ibw, creatUmol) : null;
  var isOverweightForCg = (bmi !== null && bmi >= 25);
  var abw04 = (isOverweightForCg && ibw !== null && weight > ibw) ? calcABW04(weight, ibw) : null;
  var abwCrcl = abw04 !== null ? calcCG(age, sex, abw04, creatUmol) : null;

  var workingCrcl = tbwCrcl;
  var workingMethodLabel = 'TBW';

  if (bmi !== null && ibwCrcl !== null) {
    if (bmi < 18.5) {
      workingCrcl = tbwCrcl;
      workingMethodLabel = 'TBW';
    } else if (bmi < 25) {
      workingCrcl = ibwCrcl;
      workingMethodLabel = 'IBW';
    } else if (bmi < 30) {
      if (abwCrcl !== null) {
        workingCrcl = abwCrcl;
        workingMethodLabel = 'ABW 0.4';
      } else {
        workingCrcl = ibwCrcl;
        workingMethodLabel = 'IBW';
      }
    } else {
      if (abwCrcl !== null) {
        workingCrcl = abwCrcl;
        workingMethodLabel = 'ABW 0.4';
      } else {
        workingCrcl = ibwCrcl;
        workingMethodLabel = 'IBW';
      }
    }
  }

  return {
    bmi: bmi,
    tbwCrcl: tbwCrcl,
    ibw: ibw,
    ibwCrcl: ibwCrcl,
    abw04: abw04,
    abwCrcl: abwCrcl,
    workingCrcl: workingCrcl,
    workingMethodLabel: workingMethodLabel,
    isOverweightForCg: isOverweightForCg
  };
}

function getCockcroftWeightTooltipText() {
  return 'TBW — фактический вес.\n' +
    'IBW — идеальный вес (формула Devine).\n' +
    'ABW 0.4 — скорректированный вес: IBW + 40% разницы между фактическим и идеальным весом.\n' +
    'IBW–TBW — функциональный диапазон КлКр: от расчёта по идеальному до расчёта по фактическому весу.\n\n' +
    'При избытке массы тела расчёт по фактическому весу может завышать КлКр, потому что вклад жировой ткани в продукцию креатинина минимален.\n\n' +
    'Основано на:\n' +
    'Winter M.A., et al. Pharmacotherapy, 2012. DOI: 10.1002/j.1875-9114.2012.01098.x\n' +
    'Brown D.L., et al. Ann Pharmacother, 2013. DOI: 10.1345/aph.1S176';
}

function getDoacPlanByCrCl(crcl, age, actualWeight, creatUmol, verapamil, hasBledScore) {
  var result = {};

  // Дабигатран
  var dabiNote = '';
  if (crcl < 30) {
    result.dabigatran = { key: 'contra', text: 'противопоказан', note: '' };
  } else if (crcl < 50) {
    result.dabigatran = { key: '110', text: '110 мг 2 р/д', note: 'КлКр 30–49 мл/мин' };
  } else {
    var dabiReasons = [];
    if (age >= 80) dabiReasons.push('возраст ≥80 лет');
    if (verapamil) dabiReasons.push('приём верапамила');
    if (hasBledScore >= 3) dabiReasons.push('HAS-BLED ≥3');

    if (dabiReasons.length > 0) {
      dabiNote = dabiReasons.join('; ');
      result.dabigatran = { key: '110', text: '110 мг 2 р/д', note: dabiNote };
    } else {
      result.dabigatran = { key: '150', text: '150 мг 2 р/д', note: '' };
    }
  }

  // Ривароксабан
  if (crcl < 15) {
    result.rivaroxaban = { key: 'contra', text: 'противопоказан', note: '' };
  } else if (crcl < 50) {
    result.rivaroxaban = { key: '15', text: '15 мг 1 р/д', note: '' };
  } else {
    result.rivaroxaban = { key: '20', text: '20 мг 1 р/д', note: '' };
  }

  // Апиксабан
  var apixCriteriaCount = 0;
  var apixReasons = [];
  if (age >= 80) { apixCriteriaCount++; apixReasons.push('возраст ≥80 лет'); }
  if (actualWeight !== null && actualWeight <= 60) { apixCriteriaCount++; apixReasons.push('вес ≤60 кг'); }
  if (creatUmol !== null && creatUmol >= 133) { apixCriteriaCount++; apixReasons.push('креатинин ≥133 мкмоль/л'); }

  if (crcl < 15) {
    result.apixaban = { key: 'contra', text: 'противопоказан', note: '' };
  } else if (crcl < 30) {
    result.apixaban = { key: '2.5', text: '2,5 мг 2 р/д', note: 'КлКр 15–29 мл/мин' };
  } else if (apixCriteriaCount >= 2) {
    result.apixaban = { key: '2.5', text: '2,5 мг 2 р/д', note: apixReasons.join('; ') };
  } else {
    result.apixaban = { key: '5', text: '5 мг 2 р/д', note: '' };
  }

  return result;
}

function buildSingleCgHint(plan) {
  var dabigatranText = 'Дабигатран: ' + plan.dabigatran.text;
  if (plan.dabigatran.note) dabigatranText += ' (' + plan.dabigatran.note + ')';

  var rivaroxabanText = 'Ривароксабан: ' + plan.rivaroxaban.text;
  if (plan.rivaroxaban.note) rivaroxabanText += ' (' + plan.rivaroxaban.note + ')';

  var apixabanText = 'Апиксабан: ' + plan.apixaban.text;
  if (plan.apixaban.note) apixabanText += ' (' + plan.apixaban.note + ')';

  return dabigatranText + '; ' + rivaroxabanText + '; ' + apixabanText + '.';
}

function buildCgComparisonHint(plansByMethod, workingMethodLabel, workingCrcl) {
  var methodOrder = ['IBW', 'ABW 0.4', 'TBW'];
  var anyDifference = false;

  function buildDrugLine(drugKey, drugLabel) {
    var available = [];
    methodOrder.forEach(function(method) {
      if (plansByMethod[method] && plansByMethod[method][drugKey]) {
        available.push({
          method: method,
          key: plansByMethod[method][drugKey].key,
          text: plansByMethod[method][drugKey].text
        });
      }
    });

    if (available.length === 0) return '';
    if (available.length === 1) {
      return '✅ <strong>' + drugLabel + ':</strong> ' + available[0].text + '.';
    }

    var firstKey = available[0].key;
    var allSame = available.every(function(item) { return item.key === firstKey; });

    if (allSame) {
      return '✅ <strong>' + drugLabel + ':</strong> ' + available[0].text + ' — выбор веса не меняет дозу.';
    }

    anyDifference = true;
    var parts = available.map(function(item) {
      return item.method + ' — ' + item.text;
    });

    return '⚠️ <strong>' + drugLabel + ':</strong> ' + parts.join(' • ') + '.';
  }

  var html =
    '<div style="margin-bottom:6px;">' +
      'Рабочая оценка для дозирования: <strong>' + workingMethodLabel + ' = ' + workingCrcl.toFixed(1) + ' мл/мин</strong>.' +
    '</div>' +
    '<div style="font-size:12px;line-height:1.55;">' +
      '<div style="margin-bottom:4px;">' + buildDrugLine('dabigatran', 'Дабигатран') + '</div>' +
      '<div style="margin-bottom:4px;">' + buildDrugLine('rivaroxaban', 'Ривароксабан') + '</div>' +
      '<div>' + buildDrugLine('apixaban', 'Апиксабан') + '</div>' +
    '</div>';

  if (anyDifference) {
    html +=
      '<div style="margin-top:6px;">' +
        '⚠️ Доза зависит от выбора веса. Используйте рабочий КлКр как ориентир и принимайте решение с учётом клиники и риска кровотечения.' +
      '</div>';
  } else {
    html +=
      '<div style="margin-top:6px;">' +
        '✅ Выбор веса не меняет дозирование ПОАК.' +
      '</div>';
  }

  return html;
}

// ===================================================
//  GRACE (points-based, validated GRACE 1.0 nomogram)
// ===================================================
function calcGRACE(age, hr, sbp, creatUmol, killip, arrest, stDeviation, enzymes) {
  var score = 0;

  // Age
  if (age < 30) score += 0;
  else if (age <= 39) score += 8;
  else if (age <= 49) score += 25;
  else if (age <= 59) score += 41;
  else if (age <= 69) score += 58;
  else if (age <= 79) score += 75;
  else if (age <= 89) score += 91;
  else score += 100;

  // HR
  if (hr < 50) score += 0;
  else if (hr <= 69) score += 3;
  else if (hr <= 89) score += 9;
  else if (hr <= 109) score += 15;
  else if (hr <= 149) score += 24;
  else if (hr <= 199) score += 38;
  else score += 46;

  // SBP
  if (sbp < 80) score += 58;
  else if (sbp <= 99) score += 53;
  else if (sbp <= 119) score += 43;
  else if (sbp <= 139) score += 34;
  else if (sbp <= 159) score += 24;
  else if (sbp <= 199) score += 10;
  else score += 0;

  // Creatinine mg/dL
  var crMg = creatUmol / 88.4;
  if (crMg < 0.4) score += 1;
  else if (crMg < 0.8) score += 4;
  else if (crMg < 1.2) score += 7;
  else if (crMg < 1.6) score += 10;
  else if (crMg < 2.0) score += 13;
  else if (crMg < 4.0) score += 21;
  else score += 28;

  // Killip
  var killipPts = [0, 0, 20, 39, 59];
  score += killipPts[parseInt(killip)] || 0;

  if (arrest) score += 39;
  if (stDeviation) score += 28;
  if (enzymes) score += 14;

  return score;
}

function graceInHospital(score) {
  // Approximate %
  if (score <= 60) return '<1%';
  if (score <= 80) return '~1%';
  if (score <= 100) return '~2%';
  if (score <= 120) return '~3%';
  if (score <= 140) return '~4%';
  if (score <= 160) return '~7%';
  if (score <= 180) return '~12%';
  return '>12%';
}

function grace6mo(score) {
  // Post-discharge 6-month mortality
  if (score <= 60) return '<2%';
  if (score <= 88) return '~3%';
  if (score <= 118) return '~8%';
  if (score <= 140) return '~15%';
  return '>15%';
}

function grace1yr(score) {
  if (score <= 60) return '<3%';
  if (score <= 88) return '~5%';
  if (score <= 118) return '~10%';
  if (score <= 140) return '~20%';
  return '>20%';
}

function graceRisk(score) {
  // In-hospital risk
  if (score < 109) return 'low';
  if (score <= 140) return 'moderate';
  return 'high';
}

function graceRiskLabel(score) {
  if (score < 109) return 'Низкий риск';
  if (score <= 140) return 'Умеренный риск';
  return 'Высокий риск';
}

// ===================================================
//  GRACE 2.0: 6‑месячная смертность (формула из R‑пакета RiskScorescvd)
// ===================================================
function calcGRACE2_6month(age, hr, sbp, creatUmol, killip, arrest, stDeviation, enzymes) {
  // Конвертация креатинина в мг/дл
  var crMg = creatUmol / 88.4;
  
  // Линейный предиктор (xb)
  var xb = -7.7035
           + (0.0531 * age)
           + (0.0087 * hr)
           - (0.0168 * sbp)
           + (0.1823 * crMg)
           + (0.6931 * killip)
           + (1.4586 * (arrest ? 1 : 0))
           + (0.4700 * (stDeviation ? 1 : 0))
           + (0.8755 * (enzymes ? 1 : 0));
  
  // Логистическое преобразование в вероятность
  var risk = Math.exp(xb) / (1 + Math.exp(xb)) * 100;
  
  // Округление до одного знака после запятой
  return Math.round(risk * 10) / 10;
}


// ===================================================
//  CRUSADE
// ===================================================
function calcCRUSADE(hct, cgCrcl, hr, isFemale, hasHF, hasPriorVasc, hasDM, sbp) {
  var score = 0;

  // Hematocrit
  if (hct < 31) score += 9;
  else if (hct < 34) score += 7;
  else if (hct < 37) score += 3;
  else if (hct < 40) score += 2;
  else score += 0;

  // CrCl (Cockcroft-Gault)
  if (cgCrcl <= 15) score += 39;
  else if (cgCrcl <= 30) score += 35;
  else if (cgCrcl <= 60) score += 28;
  else if (cgCrcl <= 90) score += 17;
  else if (cgCrcl <= 120) score += 7;
  else score += 0;

  // HR
  if (hr <= 70) score += 0;
  else if (hr <= 80) score += 1;
  else if (hr <= 90) score += 3;
  else if (hr <= 100) score += 6;
  else if (hr <= 110) score += 8;
  else if (hr <= 120) score += 10;
  else score += 11;

  // Sex
  if (isFemale) score += 8;

  // HF
  if (hasHF) score += 7;

  // Prior vascular
  if (hasPriorVasc) score += 6;

  // DM
  if (hasDM) score += 6;

  // SBP
  if (sbp <= 90) score += 10;
  else if (sbp <= 100) score += 8;
  else if (sbp <= 120) score += 5;
  else if (sbp <= 180) score += 1;
  else if (sbp <= 200) score += 3;
  else score += 5;

  return score;
}

function crusadeRisk(score) {
  if (score <= 20) return { risk: 'low', label: 'Очень низкий риск', pct: '~3,1%' };
  if (score <= 30) return { risk: 'low', label: 'Низкий риск', pct: '~5,5%' };
  if (score <= 40) return { risk: 'moderate', label: 'Умеренный риск', pct: '~8,6%' };
  if (score <= 50) return { risk: 'high', label: 'Высокий риск', pct: '~11,9%' };
  return { risk: 'veryhigh', label: 'Очень высокий риск', pct: '~19,5%' };
}

// ===================================================
//  ARC-HBR
// ===================================================
function calcARCHBR() {
  var major = 0, minor = 0;
  var majorIds = ['arc_oac','arc_ckd_major','arc_hb_major','arc_bleed6m','arc_plt',
    'arc_diathesis','arc_cirrhosis','arc_cancer','arc_ich_spont','arc_ich_trauma',
    'arc_avm','arc_stroke_severe','arc_surgery30d','arc_surgery_dapt'];
  var minorIds = ['arc_age75','arc_ckd_minor','arc_hb_minor','arc_bleed12m','arc_nsaid','arc_stroke_any'];

  majorIds.forEach(function(id) { if (cb(id)) major++; });
  minorIds.forEach(function(id) { if (cb(id)) minor++; });

  var isHBR = major >= 1 || minor >= 2;
  return { major: major, minor: minor, isHBR: isHBR };
}

// ===================================================
//  HAS-BLED
// ===================================================
function calcHASBLED() {
  var score = 0;
  var fields = ['hb_htn','hb_renal','hb_liver','hb_stroke','hb_bleed','hb_inr','hb_age','hb_drugs','hb_alcohol'];
  fields.forEach(function(id) { if (cb(id)) score++; });
  return score;
}

function hasbledRisk(score) {
  if (score <= 1) return { risk: 'low', label: 'Низкий риск кровотечения' };
  if (score <= 2) return { risk: 'moderate', label: 'Умеренный риск кровотечения' };
  return { risk: 'high', label: 'Высокий риск кровотечения' };
}

// ===================================================
//  CHA2DS2-VASc
// ===================================================
function calcCHA2DS2VASc(age, sex) {
  var score = 0;
  if (cb('cha_hf')) score += 1;
  if (cb('cha_htn')) score += 1;
  if (age >= 75) score += 2;
  else if (age >= 65) score += 1;
  if (cb('cha_dm')) score += 1;
  if (cb('cha_stroke')) score += 2;
  if (cb('cha_vasc')) score += 1;
  if (sex === 'f') score += 1;
  return score;
}

function chaRisk(score, sex) {
  if (sex === 'f') {
    if (score <= 1) return { risk: 'low', label: 'Низкий риск' };
    if (score <= 2) return { risk: 'moderate', label: 'Умеренный риск' };
    return { risk: 'high', label: 'Высокий риск' };
  } else {
    if (score === 0) return { risk: 'low', label: 'Низкий риск' };
    if (score === 1) return { risk: 'moderate', label: 'Умеренный риск' };
    return { risk: 'high', label: 'Высокий риск' };
  }
}

// ===================================================
//  CAPRINI
// ===================================================
function calcCaprini() {
  var score = 0;

  // 1 point
  var p1 = ['cap_minor_surgery','cap_varicose','cap_ibd','cap_swollen_legs',
    'cap_acs','cap_sepsis','cap_lung_disease','cap_bedrest',
    'cap_pregnancy','cap_miscarriage','cap_oc', 'cap_copd'];
  // auto
  var p1auto = ['cap_age41','cap_obesity','cap_chf'];

  p1.concat(p1auto).forEach(function(id) { if (cb(id)) score += 1; });

  // 2 points
  var p2 = ['cap_arthroscopy','cap_cancer','cap_laparoscopy','cap_bedrest72',
    'cap_cast','cap_cvc','cap_open_surgery'];
  var p2auto = ['cap_age61'];
  p2.concat(p2auto).forEach(function(id) { if (cb(id)) score += 2; });

  // 3 points
  var p3 = ['cap_dvt_hx','cap_fam_dvt','cap_factor_v','cap_prothrombin',
    'cap_lupus','cap_anticardiolipin','cap_heparin_hit','cap_other_thrombophilia',
      'cap_hyperhomocys'];
  var p3auto = ['cap_age75'];
  p3.concat(p3auto).forEach(function(id) { if (cb(id)) score += 3; });

  // 5 points
  var p5 = ['cap_elective_hip','cap_hip_fx','cap_spinal_trauma','cap_stroke_5','cap_multiple_trauma'];
  p5.forEach(function(id) { if (cb(id)) score += 5; });

  return score;
}

function capriniRisk(score) {
  if (score === 0) return { risk: 'low', label: 'Очень низкий риск', pct: '<0,5%', rec: 'Ранняя мобилизация' };
  if (score <= 2) return { risk: 'low', label: 'Низкий риск', pct: '~1,5%', rec: 'Механическая профилактика' };
  if (score <= 4) return { risk: 'moderate', label: 'Умеренный риск', pct: '~3%', rec: 'НМГ в низких дозах или механическая профилактика' };
  if (score <= 9) return { risk: 'high', label: 'Высокий риск', pct: '~6%', rec: 'НМГ в профилактических дозах' };
  return { risk: 'veryhigh', label: 'Очень высокий риск', pct: '>10%', rec: 'НМГ + механическая профилактика, рассмотреть продлённую профилактику' };
}

// ===================================================
//  PESI (полная) и sPESI (упрощённая)
// ===================================================
function calcPESI() {
  var score = 0;
  var age = parseNum('age');
  var sex = document.getElementById('sex').value;
  var rr = parseNum('pesi_rr');
  var temp = parseNum('pesi_temp');
  var hr = parseNum('hr');
  var sbp = parseNum('sbp');
  var spo2 = parseNum('pesi_spo2');
  var alteredMental = cb('pesi_altered_mental');
  var cancer = cb('pesi_cancer');
  var hf = cb('cb_hf');
  var copd = cb('pesi_copd');

  if (age !== null) {
    score += age;  // 1 балл за каждый год
  }
  if (sex === 'm') score += 10;
  if (cancer) score += 30;
  if (hf) score += 10;
  if (copd) score += 10;
  if (hr !== null && hr >= 110) score += 20;
  if (sbp !== null && sbp < 100) score += 30;
  if (rr !== null && rr >= 30) score += 20;
  if (temp !== null && temp < 36) score += 20;
  if (alteredMental) score += 60;
  if (spo2 !== null && spo2 < 90) score += 20;

  var classRisk = '';
  var mortality = '';
  if (score <= 65)   { classRisk = 'I (очень низкий)'; mortality = '0–1.6%'; }
  else if (score <= 85)  { classRisk = 'II (низкий)'; mortality = '1.7–3.5%'; }
  else if (score <= 105) { classRisk = 'III (умеренный)'; mortality = '3.2–7.1%'; }
  else if (score <= 125) { classRisk = 'IV (высокий)'; mortality = '4.0–11.4%'; }
  else                 { classRisk = 'V (очень высокий)'; mortality = '10.0–24.5%'; }

  return { score: score, class: classRisk, mortality: mortality };
}

function calcSPESI() {
  var age = parseNum('age');
  var cancer = cb('pesi_cancer');
  var hf = cb('cb_hf');
  var copd = cb('pesi_copd');
  var hr = parseNum('hr');
  var sbp = parseNum('sbp');
  var spo2 = parseNum('pesi_spo2');

  var points = 0;
  if (age !== null && age > 80) points++;
  if (cancer) points++;
  if (hf || copd) points++;
  if (hr !== null && hr >= 110) points++;
  if (sbp !== null && sbp < 100) points++;
  if (spo2 !== null && spo2 < 90) points++;

  var risk = (points === 0) ? 'Низкий (0 баллов)' : 'Высокий (≥1 балла)';
  var mortality30d = (points === 0) ? '~1.1%' : '~8.9%';
  return { points: points, risk: risk, mortality: mortality30d };
}

// ===================================================
//  WELLS для ТЭЛА (классическая)
// ===================================================
function calcWells() {
  var score = 0;
  if (cb('wells_dvt_signs'))  score += 3.0;
  if (cb('wells_alt_diag'))   score += 3.0;
  if (cb('wells_hr'))         score += 1.5;
  if (cb('wells_immob'))      score += 1.5;
  if (cb('wells_prev_dvt'))   score += 1.5;
  if (cb('wells_hemoptysis')) score += 1.0;
  if (cb('wells_cancer'))     score += 1.0;
  return score;
}

function wellsRisk3(score) {
  if (score <= 1)  return { risk: 'low',      label: 'Низкая клиническая вероятность',    pct: '~3–8%' };
  if (score <= 6)  return { risk: 'moderate',  label: 'Умеренная клиническая вероятность',  pct: '~25–30%' };
  return             { risk: 'high',     label: 'Высокая клиническая вероятность',   pct: '~60–80%' };
}

function wellsRisk2(score) {
  if (score <= 4) return { label: 'ТЭЛА маловероятна', likely: false };
  return            { label: 'ТЭЛА вероятна',       likely: true };
}

// Форматирование дробных баллов Wells (1.5 → "1,5")
function formatWellsScore(score) {
  if (score % 1 === 0) return score.toString();
  return score.toFixed(1).replace('.', ',');
}

// Склонение "балл" для дробных чисел
function pluralizeBallsWells(score) {
  // Для дробных (x.5) всегда "балла"
  if (score % 1 !== 0) return 'балла';
  return pluralizeBalls(score);
}

// ===================================================
//  REVISED GENEVA (пересмотренная Женевская шкала)
// ===================================================
function calcGeneva() {
  var score = 0;
  if (cb('geneva_age'))       score += 1;
  if (cb('geneva_prev_dvt'))  score += 3;
  if (cb('geneva_surgery'))   score += 2;
  if (cb('geneva_cancer'))    score += 2;
  if (cb('geneva_leg_pain'))  score += 3;
  if (cb('geneva_hemoptysis'))score += 2;

  // ЧСС: взаимоисключающие критерии
  if (cb('geneva_hr95'))      score += 5;
  else if (cb('geneva_hr75')) score += 3;

  if (cb('geneva_dvt_signs')) score += 4;
  return score;
}

function genevaRisk3(score) {
  if (score <= 3)  return { risk: 'low',      label: 'Низкая клиническая вероятность',    pct: '~8%' };
  if (score <= 10) return { risk: 'moderate',  label: 'Умеренная клиническая вероятность',  pct: '~29%' };
  return             { risk: 'high',     label: 'Высокая клиническая вероятность',   pct: '~74%' };
}

function genevaRisk2(score) {
  if (score <= 5) return { label: 'ТЭЛА маловероятна', likely: false };
  return            { label: 'ТЭЛА вероятна',       likely: true };
}

// ===================================================
//  ДИНАМИЧЕСКОЕ СКРЫТИЕ ПОЛЕЙ ВВОДА
// ===================================================
function updateFieldVisibility() {
  // Определяем активные шкалы
  var active = {
    ckdepi: isScaleActive('ckdepi'),
    cg: isScaleActive('cg'),
    grace: isScaleActive('grace'),
    crusade: isScaleActive('crusade'),
    archbr: isScaleActive('archbr'),
    hasbled: isScaleActive('hasbled'),
    cha2ds2: isScaleActive('cha2ds2'),
    caprini: isScaleActive('caprini'),
    pesi: isScaleActive('pesi'),
    wells: isScaleActive('wells'),
    geneva: isScaleActive('geneva')
  };

  // Функция-хелпер для управления видимостью
  function setVisible(className, condition) {
    var elements = document.querySelectorAll('.' + className);
    elements.forEach(function(el) {
      el.style.display = condition ? '' : 'none';
    });
  }

  // Логика видимости для каждого поля
  var needAge = true; // возраст нужен практически всем шкалам
  var needSex = active.ckdepi || active.cg || active.crusade || active.archbr || active.cha2ds2 || active.pesi;
  var needHeight = active.cg || active.caprini || active.crusade;
  var needWeight = active.cg || active.caprini || active.crusade;
  var needSBP = active.grace || active.crusade || active.hasbled || active.pesi;
  var needHR = active.grace || active.crusade || active.pesi || active.wells || active.geneva;
  var needCreat = active.ckdepi || active.cg || active.grace || active.archbr || active.hasbled || active.crusade;
  var needHB = active.archbr;
  var needHCT = active.crusade;
  var needPLT = active.archbr;

  // Чекбоксы
  var needDM = active.crusade || active.cha2ds2;
  var needHF = active.crusade || active.cha2ds2 || active.caprini || active.pesi;
  var needHTN = active.cha2ds2;
  var needStroke = active.hasbled || active.cha2ds2;
  var needVasc = active.crusade || active.cha2ds2;
  var needVerapamil = active.cg; // влияет на подсказку по дабигатрану

  // Применяем видимость
  setVisible('field-age', needAge);
  setVisible('field-sex', needSex);
  setVisible('field-height', needHeight);
  setVisible('field-weight', needWeight);
  setVisible('field-sbp', needSBP);
  setVisible('field-hr', needHR);
  setVisible('field-creat', needCreat);
  setVisible('field-hb', needHB);
  setVisible('field-hct', needHCT);
  setVisible('field-plt', needPLT);
  
  setVisible('field-dm', needDM);
  setVisible('field-hf', needHF);
  setVisible('field-htn', needHTN);
  setVisible('field-stroke', needStroke);
  setVisible('field-vasc', needVasc);
  setVisible('field-verapamil', needVerapamil);

  // Управление разделителем (если все чекбоксы скрыты, скрываем и разделитель)
  var anyCheckboxVisible = needDM || needHF || needHTN || needStroke || needVasc || needVerapamil;
  var divider = document.querySelector('.divider');
  if (divider) divider.style.display = anyCheckboxVisible ? '' : 'none';
}

// ===================================================
//  AUTOFILL
// ===================================================
function autofill() {
  var age = parseNum('age');
  var sex = document.getElementById('sex').value;
  var sbp = parseNum('sbp');
  var hb = parseNum('hb');
  var plt = parseNum('plt');
  var weight = parseNum('weight');
  var height = parseNum('height');
  var creat = parseNum('creatinine');
  var hr = parseNum('hr');

  // Блокируем запись в историю на время авто‑заполнения
  var prevSkipUndo = skipUndo;
  skipUndo = true;

  // CKD-EPI for autofill
  var egfr = null;
  if (age && creat && sex) {
    egfr = calcCKDEPI(age, sex, creat);
  }

  // ARC-HBR auto
  if (age !== null) {
    var isAge75 = age >= 75;
    var arcAge75 = document.getElementById('arc_age75');
    arcAge75.checked = isAge75;
    if (isAge75) flashField(arcAge75);
    document.getElementById('arc_age75_row').classList.toggle('auto-cb', isAge75);
  }

  if (egfr !== null) {
    var majorCkd = document.getElementById('arc_ckd_major');
    var minorCkd = document.getElementById('arc_ckd_minor');
    majorCkd.checked = egfr < 30;
    minorCkd.checked = egfr >= 30 && egfr < 60;
    if (egfr < 30) flashField(majorCkd);
    if (egfr >= 30 && egfr < 60) flashField(minorCkd);
  }

  if (hb !== null) {
    var hbMajor = document.getElementById('arc_hb_major');
    var hbMinor = document.getElementById('arc_hb_minor');
    hbMajor.checked = hb < 110;
    var isHbMinor = sex === 'm' ? (hb >= 110 && hb < 130) : (hb >= 110 && hb < 120);
    hbMinor.checked = isHbMinor;
    if (hb < 110) flashField(hbMajor);
    if (isHbMinor) flashField(hbMinor);
  }

  if (plt !== null) {
    var arcPlt = document.getElementById('arc_plt');
    arcPlt.checked = plt < 100;
    if (plt < 100) flashField(arcPlt);
  }

  // HAS-BLED auto
  if (sbp !== null) {
    var hbHtn = document.getElementById('hb_htn');
    hbHtn.checked = sbp > 160;
    if (sbp > 160) flashField(hbHtn);
  }

  if (age !== null) {
    var hbAge = document.getElementById('hb_age');
    hbAge.checked = age > 65;
    if (age > 65) flashField(hbAge);
  }

  // HAS-BLED stroke auto
  setCb('hb_stroke', cb('cb_stroke'));
  if (cb('cb_stroke')) {
      flashField(document.getElementById('hb_stroke'));
  }

  // CHA2DS2-VASc auto
  setCb('cha_hf', cb('cb_hf'));
  if (cb('cb_hf')) flashField(document.getElementById('cha_hf'));
  setCb('cha_htn', cb('cb_htn'));
  if (cb('cb_htn')) flashField(document.getElementById('cha_htn'));
  setCb('cha_dm', cb('cb_dm'));
  if (cb('cb_dm')) flashField(document.getElementById('cha_dm'));
  setCb('cha_stroke', cb('cb_stroke'));
  if (cb('cb_stroke')) flashField(document.getElementById('cha_stroke'));
  setCb('cha_vasc', cb('cb_vasc'));
  if (cb('cb_vasc')) flashField(document.getElementById('cha_vasc'));

  if (age !== null) {
    var cha75 = document.getElementById('cha_age75');
    var cha65 = document.getElementById('cha_age65');
    cha75.checked = age >= 75;
    cha65.checked = age >= 65 && age < 75;
    if (age >= 75) flashField(cha75);
    if (age >= 65 && age < 75) flashField(cha65);
  }

  if (sex) {
    var chaFemale = document.getElementById('cha_female');
    chaFemale.checked = sex === 'f';
    if (sex === 'f') flashField(chaFemale);
  }

  // CRUSADE auto
  setCb('crusade_hf', cb('cb_hf'));
  setCb('crusade_vasc', cb('cb_vasc'));
  setCb('crusade_dm', cb('cb_dm'));

  if (sex === 'f') {
    var crusadeFemale = document.getElementById('crusade_female');
    crusadeFemale.checked = true;
    flashField(crusadeFemale);
    document.getElementById('crusade_auto_sex_row').style.display = '';
  } else {
    document.getElementById('crusade_female').checked = false;
    document.getElementById('crusade_auto_sex_row').style.display = 'none';
  }

  // Caprini auto
  if (age !== null) {
    var cap41 = document.getElementById('cap_age41');
    var cap61 = document.getElementById('cap_age61');
    var cap75 = document.getElementById('cap_age75');
    cap41.checked = age >= 41 && age <= 60;
    cap61.checked = age >= 61 && age <= 74;
    cap75.checked = age >= 75;
    if (age >= 41 && age <= 60) flashField(cap41);
    if (age >= 61 && age <= 74) flashField(cap61);
    if (age >= 75) flashField(cap75);
  }

  if (weight !== null && height !== null && height > 0) {
    var bmi = weight / Math.pow(height / 100, 2);
    var capObesity = document.getElementById('cap_obesity');
    capObesity.checked = bmi > 25;
    if (bmi > 25) flashField(capObesity);
  }

  setCb('cap_chf', cb('cb_hf'));
  if (cb('cb_hf')) flashField(document.getElementById('cap_chf'));

  // Связь GRACE (повышение маркёров) → Caprini (ОИМ) — только визуальная подсказка
  var capAcsWarningIcon = document.getElementById('cap_acs_warning');
  if (capAcsWarningIcon) {
      if (isScaleActive('grace') && cb('grace_enzymes')) {
          var warningText = 'В GRACE отмечено повышение кардиоспецифических маркёров. Уточните диагноз ОИМ и при необходимости отметьте критерий.';
          capAcsWarningIcon.style.display = 'inline';
          setupTooltipTrigger(capAcsWarningIcon, warningText);
      } else {
          capAcsWarningIcon.style.display = 'none';
      }
  }

  // ===================================================
  //  АВТОМАТИЗАЦИЯ HAS-BLED КРИТЕРИЯ B (анемия/тромбоцитопения)
  // ===================================================
  var hbValue = hb;
  var pltValue = plt;
  var sexValue = sex;
  
  var isAnemiaAuto = false;
  var isAnemiaWarn = false;
  var isPltAuto = false;
  var isPltWarn = false;
  
  if (hbValue !== null) {
      var hbThreshold = 100;
      var hbWarnLow = 100;
      var hbWarnHigh = (sexValue === 'm') ? 129 : 119;
      if (hbValue < hbThreshold) {
          isAnemiaAuto = true;
      } else if (hbValue >= hbWarnLow && hbValue <= hbWarnHigh) {
          isAnemiaWarn = true;
      }
  }
  
  if (pltValue !== null) {
      if (pltValue < 50) {
          isPltAuto = true;
      } else if (pltValue >= 50 && pltValue < 100) {
          isPltWarn = true;
      }
  }
  
  var bothWarn = (isAnemiaWarn && isPltWarn);
  var autoCheck = isAnemiaAuto || isPltAuto || bothWarn;
  var showWarning = (isAnemiaWarn || isPltWarn) && !autoCheck;
  
  var hbBleedCheckbox = document.getElementById('hb_bleed');
  var warningIcon = document.getElementById('hb_bleed_warning');
  var labelContainer = document.getElementById('hb_bleed_label');
  
  if (hbBleedCheckbox) {
      // Определяем, был ли чекбокс ранее в автоматическом состоянии
      var wasAuto = labelContainer && labelContainer.classList.contains('auto-cb');
      
      if (autoCheck) {
          // Включаем автоматически
          hbBleedCheckbox.checked = true;
          flashField(hbBleedCheckbox);
          if (labelContainer) {
              labelContainer.classList.add('auto-cb');
              if (!labelContainer.querySelector('.auto-tag')) {
                  var autoSpan = document.createElement('span');
                  autoSpan.className = 'auto-tag';
                  autoSpan.textContent = 'авто';
                  var ptsSpan = labelContainer.querySelector('.pts');
                  if (ptsSpan) {
                      labelContainer.insertBefore(autoSpan, ptsSpan);
                  } else {
                      labelContainer.appendChild(autoSpan);
                  }
              }
          }
          if (warningIcon) warningIcon.style.display = 'none';
      } else {
          // Убираем автоматическое состояние, если оно было
          if (wasAuto) {
              hbBleedCheckbox.checked = false;   // ← снимаем галочку, только если она была авто
          }
          if (labelContainer) {
              labelContainer.classList.remove('auto-cb');
              var autoTag = labelContainer.querySelector('.auto-tag');
              if (autoTag) autoTag.remove();
          }
          
          // Управление иконкой предупреждения
          if (showWarning) {
              var warningText = '';
              if (isAnemiaWarn) warningText += 'Умеренная анемия (Hb ' + hbValue + ' г/л). ';
              if (isPltWarn) warningText += 'Умеренная тромбоцитопения (Plt ' + pltValue + '×10⁹/л). ';
              warningText += 'Рассмотрите необходимость отметки критерия B.';
              
              if (warningIcon) {
                  warningIcon.style.display = 'inline';
                  setupTooltipTrigger(warningIcon, warningText);
              }
          } else {
              if (warningIcon) warningIcon.style.display = 'none';
          }
      }
  }

  // ===================================================
  //  АВТОМАТИЗАЦИЯ HAS-BLED КРИТЕРИЯ A (почки)
  // ===================================================
  var hbRenalCheckbox = document.getElementById('hb_renal');
  var renalWarningIcon = document.getElementById('hb_renal_warning');
  var renalLabel = document.getElementById('hb_renal_label');

  if (hbRenalCheckbox) {
      // Условие для автоматической отметки: креатинин ≥200 мкмоль/л
      var isRenalAuto = (creat !== null && creat >= 200);
      // Условие для предупреждения: рСКФ <60, но креатинин <200
      var isRenalWarn = (egfr !== null && egfr < 60) && !isRenalAuto;
    
      var wasAuto = renalLabel && renalLabel.classList.contains('auto-cb');
    
      if (isRenalAuto) {
          hbRenalCheckbox.checked = true;
          flashField(hbRenalCheckbox);
          if (renalLabel) {
              renalLabel.classList.add('auto-cb');
              if (!renalLabel.querySelector('.auto-tag')) {
                  var autoSpan = document.createElement('span');
                  autoSpan.className = 'auto-tag';
                  autoSpan.textContent = 'авто';
                  var ptsSpan = renalLabel.querySelector('.pts');
                  if (ptsSpan) {
                      renalLabel.insertBefore(autoSpan, ptsSpan);
                  } else {
                      renalLabel.appendChild(autoSpan);
                  }
              }
          }
          if (renalWarningIcon) renalWarningIcon.style.display = 'none';
      } else {
          // Снимаем авто-отметку, если она была
          if (wasAuto) {
              hbRenalCheckbox.checked = false;
          }
          if (renalLabel) {
              renalLabel.classList.remove('auto-cb');
              var autoTag = renalLabel.querySelector('.auto-tag');
              if (autoTag) autoTag.remove();
          }
        
          // Показываем предупреждение, если нужно
          if (isRenalWarn) {
              var warningText = 'Снижение СКФ <60 мл/мин/1,73 м². Оригинальный критерий HAS-BLED — креатинин ≥200 мкмоль/л. Для добавления балла используйте ручную отметку.';
              if (renalWarningIcon) {
                  renalWarningIcon.style.display = 'inline';
                  setupTooltipTrigger(renalWarningIcon, warningText);
              }
          } else {
              if (renalWarningIcon) renalWarningIcon.style.display = 'none';
          }
      }
  }

  // ===================================================
  //  WELLS: авто-заполнение ЧСС >100
  // ===================================================
  if (hr !== null) {
    var wellsHr = document.getElementById('wells_hr');
    if (wellsHr) {
      wellsHr.checked = hr > 100;
      if (hr > 100) flashField(wellsHr);
    }
  }

  // ===================================================
  //  GENEVA: авто-заполнение возраст >65 и ЧСС
  // ===================================================
  if (age !== null) {
    var genevaAge = document.getElementById('geneva_age');
    if (genevaAge) {
      genevaAge.checked = age > 65;
      if (age > 65) flashField(genevaAge);
    }
  }

  if (hr !== null) {
    var genevaHr75 = document.getElementById('geneva_hr75');
    var genevaHr95 = document.getElementById('geneva_hr95');
    if (genevaHr75 && genevaHr95) {
      // Взаимоисключающие: только один может быть отмечен
      if (hr >= 95) {
        genevaHr95.checked = true;
        genevaHr75.checked = false;
        flashField(genevaHr95);
      } else if (hr >= 75) {
        genevaHr75.checked = true;
        genevaHr95.checked = false;
        flashField(genevaHr75);
      } else {
        genevaHr75.checked = false;
        genevaHr95.checked = false;
      }
    }
  }

  // Авто-заполнение для PESI/sPESI: ХСН
  var hfCheck = document.getElementById('pesi_hf');
  if (hfCheck) {
    hfCheck.checked = cb('cb_hf');
    if (cb('cb_hf')) flashField(hfCheck);
  }

  syncSexFromHidden();
  skipUndo = prevSkipUndo;
}

// ===================================================
//  РАСШИРЕННЫЙ СПИСОК ПОКАЗАТЕЛЕЙ ДЛЯ OCR-ПАРСЕРА
// ===================================================
const OCR_INDICATORS = [
  // креатинин
  { keys: ['креатинин', 'cr', 'creatinine', 'креатинин (мкмоль/л)', 'креатинин мкмоль/л'], field: 'creatinine', unitExpected: 'мкмоль/л' },
  // гемоглобин
  { keys: ['гемоглобин', 'hb', 'hemoglobin', 'гемоглобин (г/л)', 'гемоглобин г/л'], field: 'hb', unitExpected: 'г/л' },
  // гематокрит
  { keys: ['гематокрит', 'ht', 'hematocrit', 'гематокрит (%)'], field: 'hct', unitExpected: '%' },
  // тромбоциты
  { keys: ['тромбоциты', 'plt', 'platelets', 'тромбоциты (×10⁹/л)', 'тромбоциты ×10⁹/л'], field: 'plt', unitExpected: '×10⁹/л' },
  // АД систолическое
  { keys: ['ад', 'артериальное давление', 'ад (мм рт.ст.)', 'систолическое ад'], field: 'sbp', unitExpected: 'мм рт.ст.' },
  // ЧСС
  { keys: ['чсс', 'пульс', 'hr', 'частота сердечных сокращений', 'чсс (уд/мин)'], field: 'hr', unitExpected: 'уд/мин' },
  // вес
  { keys: ['вес', 'масса', 'вес (кг)', 'масса (кг)'], field: 'weight', unitExpected: 'кг' },
  // рост
  { keys: ['рост', 'height', 'рост (см)'], field: 'height', unitExpected: 'см' },
  // температура
  { keys: ['температура', 'т°', 'температура (°c)', 't°'], field: 'pesi_temp', unitExpected: '°C' },
  // ЧДД
  { keys: ['чд', 'чдд', 'частота дыханий', 'чдд (в мин)'], field: 'pesi_rr', unitExpected: 'в мин' },
  // сатурация
  { keys: ['сатурация', 'spo2', 'spo₂', 'сатурация (%)'], field: 'pesi_spo2', unitExpected: '%' },
  // натрий
  { keys: ['натрий', 'na', 'sodium', 'натрий (ммоль/л)'], field: 'na_measured', unitExpected: 'ммоль/л' },
  // глюкоза
  { keys: ['глюкоза', 'glucose', 'глюкоза (ммоль/л)'], field: 'glucose', unitExpected: 'ммоль/л' },
  // калий
  { keys: ['калий', 'k', 'potassium', 'калий (ммоль/л)', 'k+'], field: 'potassium', unitExpected: 'ммоль/л' },
  // магний
  { keys: ['магний', 'mg', 'magnesium', 'магний (ммоль/л)', 'mg2+'], field: 'magnesium', unitExpected: 'ммоль/л' },
  // КФК общая
  { keys: ['кфк', 'креатинфосфокиназа', 'креатинкиназа', 'ck', 'ck-nac', 'кфк общая'], field: 'ck_total', unitExpected: 'Ед/л' },
  // КФК-МВ
  { keys: ['кфк-мв', 'кфк мв', 'ck-mb', 'kk-mb', 'кк-мв', 'kk', 'mb'], field: 'ck_mb', unitExpected: 'Ед/л' }
];

function parseEMRText(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/);
  const results = [];

  // === ЭТАП 1: табулированный формат ===
  let usedTsv = false;
  for (const line of lines) {
    if (!line.trim()) continue;
    if (!/\t/.test(line)) continue;  // пропускаем строки без табуляции
    usedTsv = true;
    const parts = line.split('\t');
    if (parts.length < 2) continue;

    const rawName = (parts[0] || '').trim();
    let valueCell = '';
    let numMatch = null;

    // Счётчик для проверки только первых осмысленных ячеек после названия
    let checkedCount = 0; 
    for (let i = 1; i < parts.length; i++) {
      let cellText = (parts[i] || '').trim();
      if (!cellText) continue; // Пропускаем абсолютно пустые ячейки (лишние табуляции)
      
      checkedCount++;
      // Ищем число только в первой или второй непустой ячейке после названия
      // Обычно результат в 1-й, но если там только стрелка, смотрим 2-ю.
      let cleanCell = cellText.replace(/[▲▼]/g, '').replace(/\s+/g, ' ').trim();
      let match = cleanCell.match(/^(\d+[.,]\d+|\d+)/); // Ищем число именно в НАЧАЛЕ ячейки
      
      if (match) {
        valueCell = cleanCell;
        numMatch = match;
        break; 
      }
      
      // Если проверили 2 непустые ячейки и числа не нашли, значит дальше уже референсы или мусор
      if (checkedCount >= 2) break; 
    }
    
    if (!numMatch) continue;
    const numValue = parseFloat(numMatch[0].replace(',', '.'));
    if (isNaN(numValue)) continue;

    let unit = '';
    if (parts.length >= 3) {
      unit = (parts[2] || '').trim().toLowerCase();
    } else if (parts.length === 2) {
      // Пытаемся извлечь единицу из второй колонки (например, "140/90" – без единиц)
      const afterNum = valueCell.replace(numMatch[0], '').trim();
      if (afterNum) unit = afterNum.toLowerCase();
    }

    const indicator = findIndicator(rawName);
    if (!indicator) continue;

    let finalValue = numValue;
    if (indicator.field === 'hb' && (unit.includes('г/дл') || unit.includes('g/dl'))) finalValue = numValue * 10;
    if (indicator.field === 'creatinine' && (unit.includes('мг/дл') || unit.includes('mg/dl'))) finalValue = numValue * 88.4;
    if (indicator.field === 'hct' && numValue < 1) finalValue = numValue * 100;
    if (indicator.field === 'sbp' && valueCell.includes('/')) finalValue = parseFloat(valueCell.split('/')[0].replace(/▲/g, '').trim());

    results.push({
      fieldId: indicator.field,
      value: finalValue,
      displayValue: (indicator.field === 'sbp' || indicator.field === 'hr' || indicator.field === 'age') ? Math.round(finalValue) : finalValue,
      label: indicator.keys[0],
      rawName: rawName,
      extra: null
    });
  }

  // === ЭТАП 2: свободный текст (без табуляции) ===
  if (!usedTsv) {
    const cleanText = text.replace(/[▲▼]/g, ' ');
    for (const ind of OCR_INDICATORS) {
      for (const key of ind.keys) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedKey + '\\s*[^\\d]*?(\\d+[.,]\\d+|\\d+)', 'i');
        const match = cleanText.match(regex);
        if (match) {
          let valStr = match[1].replace(',', '.');
          let numValue = parseFloat(valStr);
          if (!isNaN(numValue)) {
            // Простейшая конвертация единиц (при необходимости доработать)
            if (ind.field === 'hb' && /г\/дл|g\/dl/i.test(cleanText.substring(match.index))) numValue *= 10;
            if (ind.field === 'creatinine' && /мг\/дл|mg\/dl/i.test(cleanText.substring(match.index))) numValue *= 88.4;
            results.push({
              fieldId: ind.field,
              value: numValue,
              displayValue: (ind.field === 'sbp' || ind.field === 'hr' || ind.field === 'age') ? Math.round(numValue) : numValue,
              label: key,
              rawName: key,
              extra: null
            });
            break; // нашли – переходим к следующему индикатору
          }
        }
      }
    }
  }

  return results;
}

// Вспомогательная функция: поиск индикатора по названию (для табулированного формата)
function findIndicator(rawName) {
  const words = rawName.toLowerCase().split(/[\s\-]+/).map(w => w.replace(/[^a-zа-я0-9]/g, ''));
  for (const ind of OCR_INDICATORS) {
    for (const key of ind.keys) {
      const cleanKey = key.toLowerCase().replace(/[^a-zа-я0-9]/g, '');
      if (words.some(word => word === cleanKey)) {
        return ind;
      }
    }
  }
  return null;
}

function applyParsedData(parsedItems) {
  const applied = [];
  const skipped = [];
  
  for (const item of parsedItems) {
    const input = document.getElementById(item.fieldId);
    if (!input) continue;
    
    if (input.value && input.value.trim() !== '') {
      skipped.push(item.label);
      continue;
    }
    
    let valueToSet = item.displayValue;
    if (item.fieldId === 'sbp' || item.fieldId === 'hr' || item.fieldId === 'age') {
      valueToSet = Math.round(item.displayValue);
    } else {
      valueToSet = item.displayValue;
    }
    
    input.value = valueToSet;
    flashField(input);
    const parentGroup = input.closest('.input-group');
    if (parentGroup) {
      parentGroup.classList.add('emr-filled');
      input.addEventListener('input', function removeMarker() {
        parentGroup.classList.remove('emr-filled');
        input.removeEventListener('input', removeMarker);
      }, { once: true });
    }
    
    // ---- Специальная обработка для ЧСС: если это среднее из диапазона, ставим иконку ⚠️ ----
    if (item.fieldId === 'hr' && item.extra && item.extra.isRangeAvg) {
      // Ищем или создаём иконку внутри .input-group
      let warningSpan = parentGroup.querySelector('.hr-range-warning');
      if (!warningSpan) {
        warningSpan = document.createElement('span');
        warningSpan.className = 'warning-icon hr-range-warning';
        warningSpan.style.marginLeft = '8px';
        warningSpan.style.cursor = 'help';
        warningSpan.innerHTML = '⚠️';
        // вставляем после поля ввода (или в конец .input-group)
        parentGroup.appendChild(warningSpan);
        
        const tooltipText = `ЧСС вычислена как средняя из диапазона (${item.extra.originalRange} → ${valueToSet}). Проверьте и при необходимости исправьте вручную.`;
        setupTooltipTrigger(warningSpan, tooltipText);
        
        // При ручном изменении поля удаляем иконку
        const removeWarning = function() {
          if (warningSpan && warningSpan.parentNode) warningSpan.parentNode.removeChild(warningSpan);
          input.removeEventListener('input', removeWarning);
        };
        input.addEventListener('input', removeWarning);
      }
    }
    
    applied.push(item.label);
  }
  
  updateAnalysisPanel();
  
  return { applied, skipped };
}

function handleEmrPaste() {
  const textarea = document.getElementById('emrPaste');
  const statusEl = document.getElementById('emrStatus');
  const text = textarea.value;
  
  if (!text || text.length < 5) {
    statusEl.textContent = '⏳ Вставьте текст из ЭМК...';
    statusEl.style.color = '#888';
    return;
  }
  
  saveUndoState();

  const parsed = parseEMRText(text);
  
  if (parsed.length === 0) {
    statusEl.textContent = '❌ Данные не распознаны. Проверьте формат или заполните вручную.';
    statusEl.style.color = '#c0392b';
    return;
  }
  
  const { applied, skipped } = applyParsedData(parsed);
  const totalParsed = parsed.length;
  const ignoredCount = totalParsed - applied.length - skipped.length;
  
  let statusMsg = '';
  if (applied.length > 0) {
    statusMsg = `✅ Заполнено: ${applied.join(', ')}. `;
    statusEl.style.color = '#27ae60';
  }
  if (skipped.length > 0) {
    statusMsg += `⚠️ Пропущено (уже заполнены): ${skipped.join(', ')}. `;
    statusEl.style.color = '#e67e22';
  }
  if (ignoredCount > 0) {
    statusMsg += `ℹ️ Проигнорировано показателей: ${ignoredCount}.`;
  }
  
  if (applied.length === 0 && skipped.length === 0) {
    statusMsg = '❌ Данные не распознаны. Проверьте формат или заполните вручную.';
    statusEl.style.color = '#c0392b';
  }
  
  statusEl.textContent = statusMsg;
  autofill();
  
  updateAnalysisPanel();
}

// Инициализация обработчиков
(function initEmrPaste() {
  const textarea = document.getElementById('emrPaste');
  const clearBtn = document.getElementById('clearEmrBtn');
  const statusEl = document.getElementById('emrStatus');
  
  if (textarea) {
    textarea.addEventListener('input', function() {
      clearTimeout(window._emrDebounce);
      window._emrDebounce = setTimeout(() => handleEmrPaste(), 400);
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      if (textarea) {
        textarea.value = '';
        statusEl.textContent = '⏳ Вставьте текст из ЭМК...';
        statusEl.style.color = '#888';
      }
    });
  }
})();

// ===================================================
//  MAIN CALCULATE
// ===================================================
function calculate() {
  autofill();

  var errors = [];

  var age = parseNum('age');
  var sex = document.getElementById('sex').value;
  var height = parseNum('height');
  var weight = parseNum('weight');
  var sbp = parseNum('sbp');
  var hr = parseNum('hr');
  var creat = parseNum('creatinine');
  var hb = parseNum('hb');
  var hct = parseNum('hct');
  var plt = parseNum('plt');

  if (!age) errors.push('Введите возраст');
  // Проверка пола, если активны шкалы, требующие его
  var sexRequiredScales = ['ckdepi', 'cg', 'crusade', 'cha2ds2', 'pesi'];
  var needSex = sexRequiredScales.some(function(scale) { return isScaleActive(scale); });
  if (needSex && (!sex || sex === '')) {
      errors.push('Выберите пол');
  }
  // Креатинин обязателен только для шкал, которые его используют
  if (!creat && (isScaleActive('ckdepi') || isScaleActive('cg') || isScaleActive('grace') || isScaleActive('crusade') || isScaleActive('archbr') || isScaleActive('hasbled'))) {
      errors.push('Введите креатинин');
  }  if (isScaleActive('cg')) {
        if (!weight) errors.push('Введите вес (для шкалы Кокрофт-Голт)');
        if (!height) errors.push('Введите рост (для шкалы Кокрофт-Голт)');
  }
  // Проверки для CRUSADE
  if (isScaleActive('crusade')) {
      if (hct === null) {
          errors.push('Введите гематокрит (для шкалы CRUSADE)');
      }
      if (!weight || !creat) {
          errors.push('Введите вес и креатинин (для расчёта КлКр в CRUSADE)');
      }
  }

  var resultsHTML = '';
  var copyLines = [];
  var egfr = null, cgCrcl = null;

  // Если активна CRUSADE, но Кокрофт-Голт выключен, всё равно считаем cgCrcl
  if (isScaleActive('crusade') && !isScaleActive('cg') && age && weight && creat) {
      cgCrcl = calcCG(age, sex, weight, creat);
  }

  // --- CKD-EPI ---
  if (isScaleActive('ckdepi') && age && creat) {
      egfr = calcCKDEPI(age, sex, creat);
      var stg = ckdStage(egfr);
      var ckdRisk = egfr >= 60 ? 'low' : egfr >= 30 ? 'moderate' : 'high';
      resultsHTML += makeResultCard(
        'CKD-EPI 2021',
        egfr.toFixed(1) + ' мл/мин/1,73 м²',
        stg.stageRu,
        ckdRisk,
        'Для выбора дозы ПОАК используйте клиренс креатинина (Кокрофт‑Голт).'
      );
      copyLines.push('CKD-EPI: ' + egfr.toFixed(1) + ' мл/мин/1,73 м² — ' + stg.stageRu);
  }

  // --- Кокрофт-Голт ---
  if (isScaleActive('cg') && age && weight && creat) {
      // ВАЖНО:
      // cgCrcl сохраняем как расчёт по фактическому весу,
      // чтобы не менять логику других шкал (например, CRUSADE) без отдельного согласования.
      var cgCrclTbw = calcCG(age, sex, weight, creat);
      cgCrcl = cgCrclTbw;

      if (cgCrclTbw === null) {
          errors.push('Некорректные данные для Кокрофт-Голт (проверьте возраст <140, вес >0, креатинин >0)');
      } else {
          var bmi = calcBMI(weight, height);
          var isOverweightForCg = (bmi !== null && bmi >= 25);
          var ibw = calcIBW(height, sex);
          var cgCrclIbw = ibw !== null ? calcCG(age, sex, ibw, creat) : null;
          var abw04 = (isOverweightForCg && ibw !== null && weight > ibw) ? calcABW04(weight, ibw) : null;
          var cgCrclAbw = abw04 !== null ? calcCG(age, sex, abw04, creat) : null;

          var workingCrcl = cgCrclTbw;
          var workingMethodLabel = 'TBW';
          var workingMethodRu = 'фактический вес';
          var categoryText = 'Дефицит массы тела';
          var methodNote = 'Рабочий КлКр рассчитан по фактическому весу (Winter, 2012).';
          var methodBlockStyle = 'margin-top:8px;padding:8px 10px;background:#f0fff4;border-left:3px solid #27ae60;border-radius:0 6px 6px 0;font-size:12px;line-height:1.5;';
          var brownLower = null;
          var brownUpper = null;

          if (bmi !== null && cgCrclIbw !== null) {
              if (bmi < 18.5) {
                  workingCrcl = cgCrclTbw;
                  workingMethodLabel = 'TBW';
                  workingMethodRu = 'фактический вес';
                  categoryText = 'Дефицит массы тела';
                  methodNote = 'Рабочий КлКр рассчитан по фактическому весу (Winter, 2012).';
                  methodBlockStyle = 'margin-top:8px;padding:8px 10px;background:#f0fff4;border-left:3px solid #27ae60;border-radius:0 6px 6px 0;font-size:12px;line-height:1.5;';
              } else if (bmi < 25) {
                  workingCrcl = cgCrclIbw;
                  workingMethodLabel = 'IBW';
                  workingMethodRu = 'идеальный вес';
                  categoryText = 'Нормальная масса тела';
                  methodNote = 'Рабочий КлКр рассчитан по идеальному весу (Winter, 2012).';
                  methodBlockStyle = 'margin-top:8px;padding:8px 10px;background:#f0fff4;border-left:3px solid #27ae60;border-radius:0 6px 6px 0;font-size:12px;line-height:1.5;';
              } else if (bmi < 30) {
                  if (cgCrclAbw !== null) {
                      workingCrcl = cgCrclAbw;
                      workingMethodLabel = 'ABW 0.4';
                      workingMethodRu = 'скорректированный вес';
                  } else {
                      workingCrcl = cgCrclIbw;
                      workingMethodLabel = 'IBW';
                      workingMethodRu = 'идеальный вес';
                  }
                  categoryText = 'Избыточная масса тела';
                  methodNote = 'КлКр по фактическому весу может быть завышен. ABW 0.4 — наименее смещённая оценка по Winter (2012).';
                  methodBlockStyle = 'margin-top:8px;padding:8px 10px;background:#fffaf0;border-left:3px solid #e67e22;border-radius:0 6px 6px 0;font-size:12px;line-height:1.5;';
              } else {
                  if (cgCrclAbw !== null) {
                      workingCrcl = cgCrclAbw;
                      workingMethodLabel = 'ABW 0.4';
                      workingMethodRu = 'скорректированный вес';
                  } else {
                      workingCrcl = cgCrclIbw;
                      workingMethodLabel = 'IBW';
                      workingMethodRu = 'идеальный вес';
                  }
                  categoryText = 'Ожирение';
                  methodNote = 'КлКр по фактическому весу может значительно завышать функцию почек. ABW 0.4 — наименее смещённая оценка по Winter (2012), но остаётся приблизительной.';
                  methodBlockStyle = 'margin-top:8px;padding:8px 10px;background:#fdf2f1;border-left:3px solid #c0392b;border-radius:0 6px 6px 0;font-size:12px;line-height:1.5;';
              }
          }

          if (isOverweightForCg && ibw !== null && cgCrclIbw !== null && cgCrclTbw !== null && weight > ibw) {
              brownLower = Math.min(cgCrclIbw, cgCrclTbw);
              brownUpper = Math.max(cgCrclIbw, cgCrclTbw);
          }

          var cgRisk = workingCrcl >= 50 ? 'low' : workingCrcl >= 30 ? 'moderate' : 'high';
          var cgInterp = workingCrcl >= 50 ? 'Норма / незначительное снижение' : workingCrcl >= 30 ? 'Умеренное снижение' : 'Тяжёлое снижение';

          var cgTooltipId = 'cg_weight_tooltip_' + Date.now();
          var cgTooltipText = getCockcroftWeightTooltipText();

          var detailsParts = [];
          if (bmi !== null) {
              detailsParts.push('ИМТ: ' + bmi.toFixed(1) + ' кг/м²');
          }
          detailsParts.push('Рабочий КлКр (' + workingMethodLabel + ', ' + workingMethodRu + '): ' + workingCrcl.toFixed(1) + ' мл/мин');
          detailsParts.push('КлКр (TBW, фактический вес ' + weight.toFixed(1) + ' кг): ' + cgCrclTbw.toFixed(1) + ' мл/мин');
          if (ibw !== null && cgCrclIbw !== null) {
              detailsParts.push('КлКр (IBW, идеальный вес ' + ibw.toFixed(1) + ' кг): ' + cgCrclIbw.toFixed(1) + ' мл/мин');
          }
          if (isOverweightForCg && abw04 !== null && cgCrclAbw !== null) {
              detailsParts.push('КлКр (ABW 0.4, скорректированный вес ' + abw04.toFixed(1) + ' кг): ' + cgCrclAbw.toFixed(1) + ' мл/мин');
          }
          if (brownLower !== null && brownUpper !== null) {
              detailsParts.push('Функциональный диапазон IBW–TBW: ' + brownLower.toFixed(1) + '–' + brownUpper.toFixed(1) + ' мл/мин');
          }

          var detailsText = detailsParts.join('<br>') +
              '<div style="' + methodBlockStyle + '">' +
                  '<strong>' + categoryText + '</strong> ' +
                  '<span class="info-icon" id="' + cgTooltipId + '" style="cursor:help;font-size:18px;opacity:0.6;vertical-align:middle;">ⓘ</span><br>' +
                  methodNote +
              '</div>';

          var hasBledScoreForCg = calcHASBLED();
          var verapamil = cb('cb_verapamil');

          var workingPlan = getDoacPlanByCrCl(workingCrcl, age, weight, creat, verapamil, hasBledScoreForCg);
          var hintText = '';

          if (bmi !== null && bmi >= 25 && cgCrclIbw !== null) {
              var plansByMethod = {
                  'IBW': getDoacPlanByCrCl(cgCrclIbw, age, weight, creat, verapamil, hasBledScoreForCg),
                  'TBW': getDoacPlanByCrCl(cgCrclTbw, age, weight, creat, verapamil, hasBledScoreForCg)
              };
              if (cgCrclAbw !== null) {
                  plansByMethod['ABW 0.4'] = getDoacPlanByCrCl(cgCrclAbw, age, weight, creat, verapamil, hasBledScoreForCg);
              }
              hintText = buildCgComparisonHint(plansByMethod, workingMethodLabel, workingCrcl);
          } else {
              hintText = buildSingleCgHint(workingPlan);
          }

          resultsHTML += makeResultCard(
            'Кокрофт-Голт',
            workingCrcl.toFixed(1) + ' мл/мин',
            cgInterp,
            cgRisk,
            detailsText,
            hintText,
            'card-span-2'
          );

          setTimeout(function() {
              var icon = document.getElementById(cgTooltipId);
              if (icon) setupTooltipTrigger(icon, cgTooltipText);
          }, 50);

          var copyStr = 'КлКр по Кокрофту-Голту: ';
          if (cgCrclTbw !== null) {
              copyStr += cgCrclTbw.toFixed(1).replace('.', ',') + ' мл/мин (по фактической массе тела (TBW))';
          }
          if (cgCrclIbw !== null) {
              copyStr += ', ' + cgCrclIbw.toFixed(1).replace('.', ',') + ' мл/мин (по идеальной массе тела (IBW))';
          }
          if (isOverweightForCg && cgCrclAbw !== null) {
              copyStr += ', ' + cgCrclAbw.toFixed(1).replace('.', ',') + ' мл/мин (по скорректированной массе тела (ABW 0.4))';
          }
          
          if (isOverweightForCg && brownLower !== null && brownUpper !== null) {
              copyStr += '; диапазон IBW–TBW: ' + brownLower.toFixed(1).replace('.', ',') + '–' + brownUpper.toFixed(1).replace('.', ',') + ' мл/мин';
          }
          
          if (bmi !== null) {
              copyStr += '. ИМТ: ' + bmi.toFixed(1).replace('.', ',') + ' кг/м²';
          }

          // Проверяем, есть ли расхождения в дозах ПОАК для пациентов с избыточным весом
          if (isOverweightForCg && typeof plansByMethod !== 'undefined') {
              var diff = false;
              ['dabigatran', 'rivaroxaban', 'apixaban'].forEach(function(drug) {
                  var vals = [];
                  if (plansByMethod['IBW'] && plansByMethod['IBW'][drug]) vals.push(plansByMethod['IBW'][drug].key);
                  if (plansByMethod['TBW'] && plansByMethod['TBW'][drug]) vals.push(plansByMethod['TBW'][drug].key);
                  if (plansByMethod['ABW 0.4'] && plansByMethod['ABW 0.4'][drug]) vals.push(plansByMethod['ABW 0.4'][drug].key);
                  
                  for (var i = 1; i < vals.length; i++) {
                      if (vals[i] !== vals[0]) diff = true;
                  }
              });
              
              if (diff) {
                  copyStr += '. Дозирование ПОАК зависит от выбора массы тела, требуется клиническая оценка.';
              } else {
                  copyStr += '. Дозирование ПОАК не зависит от выбора массы тела.';
              }
          }

          copyLines.push(copyStr);
      }
  }

  // --- GRACE ---
  if (isScaleActive('grace') && age && hr && sbp && creat) {
    var killip = parseInt(document.getElementById('grace_killip').value); // числовое значение 1-4
    var arrest = cb('grace_arrest');
    var stDev = cb('grace_st');
    var enzymes = cb('grace_enzymes');
    
    // 1. Баллы GRACE 1.0 и категория риска по РКО
    var gScore = calcGRACE(age, hr, sbp, creat, killip, arrest, stDev, enzymes);
    var gRisk = graceRisk(gScore);
    var gLabel = graceRiskLabel(gScore);
    
    // 2. 6-месячная смертность по GRACE 2.0
    var grace2_6m = calcGRACE2_6month(age, hr, sbp, creat, killip, arrest, stDev, enzymes);
    
    // Формируем строку с категорией риска по РКО
    var rkoRiskText = '';
    if (gScore <= 108) rkoRiskText = 'низкий (≤108 баллов)';
    else if (gScore <= 140) rkoRiskText = 'умеренный (109–140 баллов)';
    else rkoRiskText = 'высокий (≥141 балл)';
    
    // Детали для карточки
    var graceDetails = 
      '<div style="margin-bottom:6px;font-size:13px;">' +
      '<span style="font-weight:600;">Риск смерти в стационаре (РКО):</span> ' + rkoRiskText +
      '</div>' +
      '<div style="margin-bottom:6px;font-size:13px;">' +
      '<span style="font-weight:600;">6‑месячная смертность (GRACE 2.0):</span> ' + grace2_6m.toFixed(1) + '%' +
      '</div>' +
      '<div style="margin-top:8px;font-size:12px;color:#1a5276;">' +
      'ИИ калькулятор <a href="https://www.grace-3.com/" target="_blank" style="color:#2980b9;font-weight:600;text-decoration:none;">GRACE 3.0</a>' +
      '</div>';
    
    // Тактическая рекомендация
    var graceHint = gRisk === 'low'
      ? 'Низкий риск. Возможна консервативная стратегия или отсроченная коронарография.'
      : gRisk === 'moderate'
      ? 'Умеренный риск. Ранняя инвазивная стратегия в течение 24–72 ч.'
      : 'Высокий риск. Срочная инвазивная стратегия в течение 24 ч.';
    
    resultsHTML += makeResultCard(
      'GRACE',
      gScore + ' ' + pluralizeBalls(gScore) + ' (GRACE 1.0)',
      gLabel,
      gRisk,
      graceDetails,
      graceHint
    );
    var rkoCategoryText = '';
    if (gScore <= 108) rkoCategoryText = 'низкого';
    else if (gScore <= 140) rkoCategoryText = 'умеренного';
    else rkoCategoryText = 'высокого';
    
    var rkoThresholds = {
      'низкого':   '≤108 баллов',
      'умеренного':'109–140 баллов',
      'высокого':  '≥141 балла'
    };
    var thresholdText = rkoThresholds[rkoCategoryText] || '';
    copyLines.push('GRACE 1.0: ' + gScore + ' ' + pluralizeBalls(gScore) + ' — ' + rkoCategoryText + ' риск по РКО (' + thresholdText + '). Риск 6-месячной летальности по GRACE 2.0: ' + grace2_6m.toFixed(1) + '%.');
  }

  // --- CRUSADE ---
  if (isScaleActive('crusade') && hct !== null && sbp && hr && cgCrcl !== null) {
    var isFemale = sex === 'f';
    var crusScore = calcCRUSADE(hct, cgCrcl, hr, isFemale,
      cb('cb_hf'), cb('cb_vasc'), cb('cb_dm'), sbp);
    var crusR = crusadeRisk(crusScore);
    
    // Тактическая рекомендация для жёлтого блока
    var crusHint = '';
    if (crusR.risk === 'low') {
      crusHint = 'Низкий геморрагический риск. Стандартная антитромботическая терапия.';
    } else if (crusR.risk === 'moderate') {
      crusHint = 'Умеренный геморрагический риск. Учитывайте при выборе антикоагулянта и дозы.';
    } else {
      crusHint = 'Высокий геморрагический риск. Рассмотрите снижение дозы или отказ от агрессивной антикоагуляции.';
    }
    
    resultsHTML += makeResultCard(
      'CRUSADE',
      crusScore + ' ' + pluralizeBalls(crusScore),
      'Риск внутрибольничного большого кровотечения: ' + crusR.pct,  // зелёная строка
      crusR.risk,
      '',                                  // без дополнительных деталей
      crusHint                             // жёлтая подсказка
    );
    copyLines.push('CRUSADE: ' + crusScore + ' ' + pluralizeBalls(crusScore) + ' — ' + crusR.label + ' (риск кровотечения ' + crusR.pct + ')');
  }

  // --- ARC-HBR ---
  if (isScaleActive('archbr')) {
    var arc = calcARCHBR();
    var arcRisk = arc.isHBR ? 'high' : 'low';
    var arcLabel = arc.isHBR ? 'Высокий риск кровотечения' : 'Нет высокого риска кровотечения';
    resultsHTML += makeResultCard(
      'ARC-HBR',
      arc.isHBR ? '✅ HBR' : '❌ Не HBR',
      arcLabel,
      arcRisk,
      '<div class="arc-summary">' +
        '<div class="arc-num"><div class="n">' + arc.major + '</div><div class="lbl">Больших</div></div>' +
        '<div class="arc-num"><div class="n">' + arc.minor + '</div><div class="lbl">Малых</div></div>' +
        '<div style="font-size:12px;color:#666;align-self:center;">Критерий HBR:<br>≥1 большого ИЛИ ≥2 малых</div>' +
      '</div>',
      arc.isHBR
        ? 'Рассмотреть сокращение ДАТТ (1–3 мес. при плановом ЧКВ, 3–6 мес. при ОКС) или деэскалацию. Обязательно назначение ИПП.'
        : 'Показана стандартная ДАТТ (6 мес. при плановом ЧКВ, 12 мес. при ОКС).'
    );
    var arcCopyLine = 'ARC-HBR: ' + arcLabel +
      ' (большие критерии: ' + arc.major + ', малые критерии: ' + arc.minor + ')';
    copyLines.push(arcCopyLine);
  }

  // --- Caprini ---
  if (isScaleActive('caprini')) {
    var capScore = calcCaprini();
    var capR = capriniRisk(capScore);
    resultsHTML += makeResultCard(
      'Caprini 2010',
      capScore + ' ' + pluralizeBalls(capScore),
      capR.label + ' | Риск ВТЭО ' + capR.pct,
      capR.risk,
      'Риск ВТЭО: ' + capR.pct,
      capR.rec
    );
    copyLines.push('Caprini: ' + capScore + ' ' + pluralizeBalls(capScore) + ' — ' + capR.label + ' (риск ВТЭО ' + capR.pct + ')');
  }

  // --- HAS-BLED ---
  if (isScaleActive('hasbled')) {
    var hbScore = calcHASBLED();
    var hbR = hasbledRisk(hbScore);
    
    // Формируем динамическую подсказку только при высоком риске и наличии модифицируемых факторов
    var hbHint = '';
    if (hbScore >= 3) {
        var modFactors = [];
        if (cb('hb_htn')) modFactors.push('АД >160 мм рт.ст.');
        if (cb('hb_inr')) modFactors.push('лабильное МНО');
        if (cb('hb_drugs')) modFactors.push('приём НПВП/антиагрегантов');
        if (cb('hb_alcohol')) modFactors.push('злоупотребление алкоголем');
        
        if (modFactors.length > 0) {
            hbHint = 'Устранить модифицируемые факторы: ' + modFactors.join('; ') + '.';
        }
    }
    
    resultsHTML += makeResultCard(
      'HAS-BLED',
      hbScore + ' ' + pluralizeBalls(hbScore),
      hbR.label,
      hbR.risk,
      'Счёт ' + hbScore + ' из 9',
      hbHint   // ← если строка пустая, блок result-hint не отобразится
    );
    copyLines.push('HAS-BLED: ' + hbScore + ' ' + pluralizeBalls(hbScore) + ' — ' + hbR.label);
  }

  // --- CHA2DS2-VASc ---
  if (isScaleActive('cha2ds2') && age) {
    var chaScore = calcCHA2DS2VASc(age, sex);
    var chaR = chaRisk(chaScore, sex);
    resultsHTML += makeResultCard(
      'CHA₂DS₂-VASc',
      chaScore + ' ' + pluralizeBalls(chaScore),
      chaR.label,
      chaR.risk,
      'Счёт ' + chaScore,
      sex === 'm'
        ? (chaScore === 0 ? 'Антикоагуляция не показана.'
          : chaScore === 1 ? 'Антикоагуляция может рассматриваться индивидуально.'
          : 'Антикоагуляция показана (ПОАК предпочтительнее варфарина).')
        : (chaScore <= 1 ? 'Антикоагуляция не показана (пол как единственный фактор).'
          : chaScore === 2 ? 'Антикоагуляция может рассматриваться.'
          : 'Антикоагуляция показана.')
    );
    copyLines.push('CHA₂DS₂-VASc: ' + chaScore + ' ' + pluralizeBalls(chaScore) + ' — ' + chaR.label);
  }

  // --- PESI / sPESI ---
  if (isScaleActive('pesi')) {
    var pesi = calcPESI();
    var spesi = calcSPESI();

    resultsHTML += makeResultCard(
      'PESI (ТЭЛА)',
      pesi.score + ' баллов (класс ' + pesi.class + ')',
      '30‑дневная летальность: ' + pesi.mortality,
      pesi.score <= 85 ? 'low' : (pesi.score <= 125 ? 'moderate' : 'high'),
      'Полный PESI',
      ''
    );

    var spesiRiskClass = (spesi.points === 0) ? 'low' : (spesi.points === 1 ? 'moderate' : 'high');
    resultsHTML += makeResultCard(
      'sPESI (упрощённый)',
      spesi.points + ' балл(ов)',
      spesi.risk + ' | 30‑дневная летальность ' + spesi.mortality,
      spesiRiskClass,
      'Упрощённая шкала',
      (spesi.points === 0) ? 'Возможно амбулаторное лечение' : 'Показана госпитализация'
    );

    copyLines.push('PESI: ' + pesi.score + ' баллов, класс ' + pesi.class + ', летальность ' + pesi.mortality);
    copyLines.push('sPESI: ' + spesi.points + ' баллов — ' + spesi.risk);
  }
  
  // --- Wells (ТЭЛА) ---
  if (isScaleActive('wells')) {
    var wellsScore = calcWells();
    var wR3 = wellsRisk3(wellsScore);
    var wR2 = wellsRisk2(wellsScore);
    var wellsScoreFormatted = formatWellsScore(wellsScore);

    var wellsDetails =
      '<div style="margin-bottom:4px;font-size:13px;">' +
        '<span style="font-weight:600;">Трёхуровневая оценка:</span> ' +
        wR3.label + ' (' + wR3.pct + ')' +
      '</div>' +
      '<div style="font-size:13px;">' +
        '<span style="font-weight:600;">Двухуровневая оценка:</span> ' +
        wR2.label + (wellsScore <= 4 ? ' (≤4 баллов)' : ' (>4 баллов)') +
      '</div>';

    // Подсказка по алгоритму: если хотя бы одна модель тревожная → КТ-АПГ
    var wellsIsAlarm = (wR3.risk === 'high' || wR2.likely);
    var wellsHint = '';

    if (wellsIsAlarm) {
      wellsHint = 'Показана КТ-ангиопульмонография без предварительного определения D-димера.';
    } else {
      // Низкая или умеренная + маловероятна → D-димер
      var wellsAge = parseNum('age');
      if (wellsAge !== null && wellsAge > 50) {
        var wellsDdimerThreshold = wellsAge * 10;
        wellsHint = 'Определить D-димер (предпочтительно высокочувствительным методом). ' +
          'Возрастной порог: ' + wellsDdimerThreshold + ' мкг/л. ' +
          'При отрицательном результате ТЭЛА может быть исключена. ' +
          'При положительном — показана КТ-ангиопульмонография.';
      } else {
        wellsHint = 'Определить D-димер (предпочтительно высокочувствительным методом). ' +
          'При отрицательном результате ТЭЛА может быть исключена. ' +
          'При положительном — показана КТ-ангиопульмонография.';
      }
    }

    resultsHTML += makeResultCard(
      'Wells — вероятность ТЭЛА',
      wellsScoreFormatted + ' ' + pluralizeBallsWells(wellsScore),
      wR3.label,
      wR3.risk,
      wellsDetails,
      wellsHint
    );

    var wellsCopyR2 = wR2.likely ? 'ТЭЛА вероятна' : 'ТЭЛА маловероятна';
    copyLines.push('Wells: ' + wellsScoreFormatted + ' ' + pluralizeBallsWells(wellsScore) +
      ' — ' + wR3.label.toLowerCase() + '. По двухуровневой модели — ' + wellsCopyR2.toLowerCase() + '.');
  }

  // --- Revised Geneva (ТЭЛА) ---
  if (isScaleActive('geneva')) {
    var genevaScore = calcGeneva();
    var gR3 = genevaRisk3(genevaScore);
    var gR2 = genevaRisk2(genevaScore);

    var genevaDetails =
      '<div style="margin-bottom:4px;font-size:13px;">' +
        '<span style="font-weight:600;">Трёхуровневая оценка:</span> ' +
        gR3.label + ' (' + gR3.pct + ')' +
      '</div>' +
      '<div style="font-size:13px;">' +
        '<span style="font-weight:600;">Двухуровневая оценка:</span> ' +
        gR2.label + (genevaScore <= 5 ? ' (0–5 баллов)' : ' (≥6 баллов)') +
      '</div>';

    // Подсказка по алгоритму: если хотя бы одна модель тревожная → КТ-АПГ
    var genevaIsAlarm = (gR3.risk === 'high' || gR2.likely);
    var genevaHint = '';

    if (genevaIsAlarm) {
      genevaHint = 'Показана КТ-ангиопульмонография без предварительного определения D-димера.';
    } else {
      // Низкая или умеренная + маловероятна → D-димер
      var genevaAge = parseNum('age');
      if (genevaAge !== null && genevaAge > 50) {
        var genevaDdimerThreshold = genevaAge * 10;
        genevaHint = 'Определить D-димер (предпочтительно высокочувствительным методом). ' +
          'Возрастной порог: ' + genevaDdimerThreshold + ' мкг/л. ' +
          'При отрицательном результате ТЭЛА может быть исключена. ' +
          'При положительном — показана КТ-ангиопульмонография.';
      } else {
        genevaHint = 'Определить D-димер (предпочтительно высокочувствительным методом). ' +
          'При отрицательном результате ТЭЛА может быть исключена. ' +
          'При положительном — показана КТ-ангиопульмонография.';
      }
    }

    resultsHTML += makeResultCard(
      'Revised Geneva — вероятность ТЭЛА',
      genevaScore + ' ' + pluralizeBalls(genevaScore),
      gR3.label,
      gR3.risk,
      genevaDetails,
      genevaHint
    );

    var genevaCopyR2 = gR2.likely ? 'ТЭЛА вероятна' : 'ТЭЛА маловероятна';
    copyLines.push('Revised Geneva: ' + genevaScore + ' ' + pluralizeBalls(genevaScore) +
      ' — ' + gR3.label.toLowerCase() + '. По двухуровневой модели — ' + genevaCopyR2.toLowerCase() + '.');
  }

  if (errors.length > 0) {
    showToast(errors.join(', '), 'error');
    return;
  }

  // Render
  document.getElementById('resultsGrid').innerHTML = resultsHTML;
  document.getElementById('copyText').textContent = copyLines.join('\n');
  document.getElementById('results').style.display = 'block';
  document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

// ===================================================
//  RENDER RESULT CARD
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
//  COPY
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
    // Fallback
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

// ===================================================
//  INIT — sync common checkboxes on change
// ===================================================
['cb_hf','cb_htn','cb_dm','cb_stroke','cb_vasc','grace_enzymes'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', function() {
      autofill();
      updateAnalysisPanel();
    });
  }
});

['age','sex','sbp','hb','plt','weight','height','creatinine'].forEach(function(id) {
  document.getElementById(id).addEventListener('input', function() {
    autofill();
    updateAnalysisPanel();
  });
});

// Init on load
var ckTotalOnStart = document.getElementById('ck_total');
var ckMbOnStart = document.getElementById('ck_mb');
var naMeasuredOnStart = document.getElementById('na_measured');
var glucoseOnStart = document.getElementById('glucose');
var potassiumOnStart = document.getElementById('potassium');
var magnesiumOnStart = document.getElementById('magnesium');

if (ckTotalOnStart) ckTotalOnStart.value = '';
if (ckMbOnStart) ckMbOnStart.value = '';
if (naMeasuredOnStart) naMeasuredOnStart.value = '';
if (glucoseOnStart) glucoseOnStart.value = '';
if (potassiumOnStart) potassiumOnStart.value = '';
if (magnesiumOnStart) magnesiumOnStart.value = '';

autofill();
updateFieldVisibility();
updateGroupButtonsUI();
initSexToggle();
syncSexFromHidden();
updateAnalysisPanel();

  // ===================================================
  //  УПРАВЛЕНИЕ ВИДИМОСТЬЮ КНОПОК "ВВЕРХ" / "ВНИЗ"
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

  // Вызываем при загрузке, при скролле и при изменении размеров окна
  window.addEventListener('load', updateNavButtons);
  window.addEventListener('scroll', updateNavButtons);
  window.addEventListener('resize', updateNavButtons);

  // ===================================================
  //  ГРУППОВОЕ ПЕРЕКЛЮЧЕНИЕ ШКАЛ
  // ===================================================
  function toggleGroup(groupName) {
    // Определяем, какие шкалы входят в группу
    var scales = [];
    if (groupName === 'acs') {
      scales = ['grace', 'crusade', 'archbr', 'caprini'];
    } else if (groupName === 'afib') {
      scales = ['hasbled', 'cha2ds2'];
    } else if (groupName === 'pe') {
      scales = ['pesi', 'wells', 'geneva'];
    } else {
      return; // неизвестная группа
    }

    // Проверяем, все ли шкалы группы в данный момент включены
    var allActive = scales.every(function(scale) {
      return isScaleActive(scale);
    });

    // Для каждой шкалы группы: если allActive === true → выключаем, иначе включаем
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

  // Назначение обработчиков на кнопки групп
  document.querySelectorAll('.group-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var group = this.dataset.group;
      toggleGroup(group);
    });
  });

  // ===================================================
  //  ОБНОВЛЕНИЕ АКТИВНОСТИ КНОПОК ГРУПП
  // ===================================================
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
        autofill(); // обновляем всё, что зависит от пола
      });
    });

    setActive(''); // по умолчанию не выбран
  }
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkDisclaimer);
} else {
  checkDisclaimer();
}

// Функция для копирования назначения калия
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
// Глобальная функция для пересчёта конструктора калия
// ===================================================
window.calcKInfusion = function() {
    var deficitEl = document.getElementById('k_hidden_deficit');
    var resEl = document.getElementById('k_calc_result');
    if (!deficitEl || !resEl) return;

    var deficit = parseFloat(deficitEl.value);
    if (isNaN(deficit) || deficit <= 0) {
        resEl.innerHTML = '';
        return;
    }

    var potassiumEl = document.getElementById('potassium');
    var magnesiumEl = document.getElementById('magnesium');

    var kValueRaw = potassiumEl ? potassiumEl.value.trim().replace(',', '.') : '';
    var mgValueRaw = magnesiumEl ? magnesiumEl.value.trim().replace(',', '.') : '';

    var kValueNum = parseFloat(kValueRaw);
    var mgValueNum = parseFloat(mgValueRaw);

    // Выбранный препарат KCl
    var drugEls = document.getElementsByName('k_drug');
    var drugMmol = 0.54;
    var drugName = '4';
    for (var i = 0; i < drugEls.length; i++) {
        if (drugEls[i].checked) {
            drugMmol = parseFloat(drugEls[i].getAttribute('data-mmol'));
            drugName = drugEls[i].value;
            break;
        }
    }

    // Выбранный объём растворителя
    var volEl = document.getElementById('k_vol');
    if (!volEl) return;
    var volMl = parseFloat(volEl.value);
    if (isNaN(volMl) || volMl <= 0) return;
    var volL = volMl / 1000;

    // Выбранный доступ
    var accEls = document.getElementsByName('k_acc');
    var isCvk = false;
    for (var j = 0; j < accEls.length; j++) {
        if (accEls[j].checked && accEls[j].value === 'cvk') {
            isCvk = true;
            break;
        }
    }
    var accessText = isCvk ? 'ЦВК' : 'ПВК';

    // Ограничения безопасности для калия
    var maxConc = isCvk ? 120 : 40; // ммоль/л
    var maxRate = isCvk ? 20 : 10;  // ммоль/ч

    // Максимум ммоль калия для выбранного объёма
    var maxMmolForVol = maxConc * volL;

    // Реально вводимый калий
    var mmolToInfuse = Math.min(deficit, maxMmolForVol);
    mmolToInfuse = Math.floor(mmolToInfuse * 10) / 10;
    if (mmolToInfuse <= 0) {
        resEl.innerHTML = '';
        return;
    }

    // Объём концентрата KCl
    var requiredMlNum = mmolToInfuse / drugMmol;
    var requiredMl = requiredMlNum.toFixed(1).replace('.', ',');

    // ===== Магний =====
    var addMgCheckbox = document.getElementById('k_add_mg');
    var addMg = !!(addMgCheckbox && addMgCheckbox.checked);
    var mgMlNum = 0;
    var mgLabelText = '';
    var mgWarningText = '';

    if (addMg && !isNaN(mgValueNum)) {
        if (mgValueNum < 0.5) {
            mgMlNum = 10;
        } else if (mgValueNum < 0.7) {
            mgMlNum = 5;
        }

        if (mgMlNum > 0) {
            mgLabelText = '<div class="k-builder__result-line">Дополнительно: <strong>' + mgMlNum + ' мл</strong> (MgSO₄ 25%)</div>';
        }

        // Оценка функции почек только если магний реально добавлен
        var age = parseNum('age');
        var sexEl = document.getElementById('sex');
        var sex = sexEl ? sexEl.value : '';
        var height = parseNum('height');
        var weight = parseNum('weight');
        var creat = parseNum('creatinine');

        var crclData = getWorkingCrClData(age, sex, height, weight, creat);

        if (!crclData || crclData.workingCrcl === null) {
            mgWarningText = 'Функция почек не оценена. При тяжёлой ХБП риск гипермагниемии. Осторожно при AV-блокадах.';
        } else if (crclData.workingCrcl < 30) {
            mgWarningText = 'Внимание: рабочий КлКр ' + crclData.workingCrcl.toFixed(1).replace('.', ',') + ' мл/мин. Повышен риск гипермагниемии. Требуется осторожность, контроль Mg²⁺ и клинический мониторинг.';
        }
    }

    // Время по пределу скорости, затем округляем ВВЕРХ до 15 минут
    var minTimeMinutes = (mmolToInfuse / maxRate) * 60;
    var roundedTimeMinutes = Math.ceil(minTimeMinutes / 15) * 15;
    if (roundedTimeMinutes < 15) roundedTimeMinutes = 15;

    function formatTime(totalMinutes) {
        var hrs = Math.floor(totalMinutes / 60);
        var mins = totalMinutes % 60;

        if (hrs > 0 && mins > 0) return hrs + ' ч ' + mins + ' мин';
        if (hrs > 0) return hrs + ' ч';
        return mins + ' мин';
    }

    var timeStr = formatTime(roundedTimeMinutes);

    // Скорость в мл/ч считаем по полному объёму смеси
    var finalVolumeMl = volMl + requiredMlNum + mgMlNum;
    var rateMlPerHour = Math.round(finalVolumeMl / (roundedTimeMinutes / 60));

    // Остаток дефицита — только ориентировочный
    var remainderNum = Math.max(0, deficit - mmolToInfuse);
    var remainderStr = remainderNum.toFixed(1).replace('.', ',');

    // Процент покрытия дефицита
    var coveredPercentRaw = (mmolToInfuse / deficit) * 100;
    var coveredPercent = Math.round(coveredPercentRaw);
    if (coveredPercent > 100) coveredPercent = 100;

    // Текст для копирования
    var kValueForText = kValueRaw ? kValueRaw.replace('.', ',') : '';
    var mgValueForText = mgValueRaw ? mgValueRaw.replace('.', ',') : '';

    var copyText = '';
    if (addMg && mgMlNum > 0) {
        copyText = 'Учитывая результаты анализов крови (калий ' + kValueForText + ' ммоль/л, магний ' + mgValueForText + ' ммоль/л), назначена инфузия: KCl ' + drugName + '% — ' + requiredMl + ' мл + MgSO₄ 25% — ' + mgMlNum + ' мл + NaCl 0,9% — ' + volMl + ' мл. В/в ч/з ' + accessText + ', не быстрее чем за ' + timeStr + '.';
    } else {
        copyText = 'Учитывая результаты анализов крови (калий ' + kValueForText + ' ммоль/л), назначена инфузия калия: KCl ' + drugName + '% — ' + requiredMl + ' мл + NaCl 0,9% — ' + volMl + ' мл. В/в ч/з ' + accessText + ', не быстрее чем за ' + timeStr + '.';
    }

    // Основная строка про остаток
    var remainderHtml = '';
    if (remainderNum <= 0.05) {
        remainderHtml = 'Расчётный внеклеточный дефицит может быть восполнен.';
    } else {
        remainderHtml = 'Ориентировочный остаток внеклеточного дефицита: <strong>' + remainderStr + '</strong> ммоль.';
    }

    // Предупреждения
    var infusionWarnings = [];

    if (coveredPercentRaw < 20) {
        if (isCvk) {
            infusionWarnings.push('При выбранных условиях восполняется лишь ' + coveredPercent + '% дефицита. Рассмотрите увеличение объёма растворителя или проведение последовательных инфузий.');
        } else {
            infusionWarnings.push('При выбранных условиях восполняется лишь ' + coveredPercent + '% дефицита. Рассмотрите увеличение объёма растворителя или использование ЦВК.');
        }
    }

    if (!isCvk && !isNaN(kValueNum) && kValueNum < 2.5) {
        infusionWarnings.push('При данном уровне гипокалиемии предпочтительно рассмотреть ЦВК.');
    }

    if (!isCvk && requiredMlNum > 40) {
        infusionWarnings.push('Требуется большой объём концентрата калия (>40 мл). Рассмотрите разделение на несколько последовательных инфузий.');
    }

    if (isCvk && requiredMlNum > 60) {
        infusionWarnings.push('Требуется большой объём концентрата калия (>60 мл). Рассмотрите разделение на несколько последовательных инфузий.');
    }

    if (mgWarningText) {
        infusionWarnings.push(mgWarningText);
    }

    var warningsHtml = '';
    if (infusionWarnings.length > 0) {
        warningsHtml = '<div class="k-note-box k-note-box--warning">';
        infusionWarnings.forEach(function(w) {
            warningsHtml += '<div style="margin-bottom:4px;">' + w + '</div>';
        });
        warningsHtml += '</div>';
    }

    // Отрисовка результата
    var resHtml =
      '<div class="k-builder__result">' +
        '<div class="k-builder__result-line">Добавить: <strong>' + requiredMl + ' мл</strong> (KCl ' + drugName + '%)</div>' +
        mgLabelText +
        '<div class="k-builder__result-line">В раствор: <strong>' + volMl + ' мл</strong> (NaCl 0,9%)</div>' +
        '<div class="k-builder__result-time">Капать <strong>НЕ БЫСТРЕЕ</strong>, чем за <strong>' + timeStr + '</strong></div>' +
        '<div class="k-builder__meta">' +
          'Восполняется: <strong>' + mmolToInfuse.toFixed(1).replace('.', ',') + '</strong> ммоль K⁺.<br>' +
          'Ориентировочная скорость: <strong>~' + rateMlPerHour + '</strong> мл/ч.<br>' +
          remainderHtml + '<br>' +
          'Контроль K⁺ через 2–4 ч после окончания инфузии.' +
        '</div>' +
        warningsHtml +
        '<button onclick="window.copyKInfusion(this)" data-text="' + copyText + '" class="k-builder__copy-btn">📋 Копировать назначение</button>' +
      '</div>';

    resEl.innerHTML = resHtml;
};

// ===================================================
//  АНАЛИЗ: Калий — дефицит, инфузия, гиперкалиемия
// ===================================================
function renderPotassiumModule() {
  var k = parseNum('potassium');
  if (k === null) return null;

  if (k <= 0) {
    return makeResultCard('Калий', 'Ошибка данных',
      'Значение должно быть больше 0', 'moderate',
      'Проверьте корректность введённого значения калия.', '');
  }

  var mg = parseNum('magnesium');
  var weight = parseNum('weight');
  var plt = parseNum('plt');
  var hasDM = cb('cb_dm');

  // ===== НОРМА =====
  if (k >= 3.5 && k <= 5.0) {
    return makeResultCard('Калий', k.toFixed(1) + ' ммоль/л',
      'Калий в пределах нормы', 'low',
      'Коррекция обычно не требуется.', '');
  }

  // ===== ГИПОКАЛИЕМИЯ =====
  if (k < 3.5) {
    var hypoGrade = '';
    var hypoRisk = 'moderate';
    if (k >= 3.0) {
      hypoGrade = 'Лёгкая гипокалиемия';
      hypoRisk = 'moderate';
    } else if (k >= 2.5) {
      hypoGrade = 'Умеренная гипокалиемия';
      hypoRisk = 'high';
    } else if (k >= 2.0) {
      hypoGrade = 'Тяжёлая гипокалиемия';
      hypoRisk = 'veryhigh';
    } else {
      hypoGrade = 'Критическая гипокалиемия';
      hypoRisk = 'veryhigh';
    }

    var empiricalDeficit = '';
    if (k >= 3.0) empiricalDeficit = '~200 ммоль';
    else if (k >= 2.5) empiricalDeficit = '200–400 ммоль';
    else if (k >= 2.0) empiricalDeficit = '400–600 ммоль';
    else empiricalDeficit = '600–800+ ммоль';

    var formulaDeficit = null;
    if (weight !== null && weight > 0) {
      formulaDeficit = (4.0 - k) * weight * 0.4;
      formulaDeficit = Math.round(formulaDeficit);
    }

    var ivBlock = '';
    if (formulaDeficit !== null && formulaDeficit > 0) {
      var magnesiumOptionBlock = '';

      if (mg !== null && mg < 0.7) {
        var mgDisplay = mg.toFixed(2).replace('.', ',');
        magnesiumOptionBlock =
          '<div class="k-builder__section">' +
            '<span class="k-builder__label">Сопутствующая коррекция:</span>' +
            '<div class="k-builder__options">' +
              '<label class="k-builder__option"><input type="checkbox" id="k_add_mg" onchange="window.calcKInfusion()"> <span>Добавить MgSO₄ 25% (Mg ' + mgDisplay + ' ммоль/л)</span></label>' +
            '</div>' +
          '</div>';
      }

      ivBlock =
        '<div class="k-builder">' +
          '<div class="k-builder__title">💡 Расчёт инфузии</div>' +
          '<div class="k-builder__deficit"><span class="k-inline-help" title="Отражает только дефицит в плазме крови. Внутриклеточный (общий) дефицит восполняется несколько суток.">Внеклеточный</span> дефицит: <strong>~' + formulaDeficit + ' ммоль</strong></div>' +

          '<input type="hidden" id="k_hidden_deficit" value="' + formulaDeficit + '">' +

          '<div class="k-builder__section">' +
            '<span class="k-builder__label">Препарат KCl:</span>' +
            '<div class="k-builder__options">' +
              '<label class="k-builder__option"><input type="radio" name="k_drug" value="4" data-mmol="0.54" checked onchange="window.calcKInfusion()"> <span>4%</span></label>' +
              '<label class="k-builder__option"><input type="radio" name="k_drug" value="7.5" data-mmol="1.0" onchange="window.calcKInfusion()"> <span>7.5%</span></label>' +
              '<label class="k-builder__option"><input type="radio" name="k_drug" value="10" data-mmol="1.34" onchange="window.calcKInfusion()"> <span>10%</span></label>' +
            '</div>' +
          '</div>' +

          '<div class="k-builder__section">' +
            '<span class="k-builder__label">Растворитель (NaCl 0,9%):</span>' +
            '<select id="k_vol" onchange="window.calcKInfusion()" class="k-builder__select">' +
              '<option value="100">100 мл</option>' +
              '<option value="200">200 мл</option>' +
              '<option value="250" selected>250 мл</option>' +
              '<option value="400">400 мл</option>' +
              '<option value="500">500 мл</option>' +
              '<option value="1000">1000 мл</option>' +
            '</select>' +
          '</div>' +

          '<div class="k-builder__section">' +
            '<span class="k-builder__label">Доступ:</span>' +
            '<div class="k-builder__options">' +
              '<label class="k-builder__option"><input type="radio" name="k_acc" value="pvk" checked onchange="window.calcKInfusion()"> <span>ПВК</span></label>' +
              '<label class="k-builder__option"><input type="radio" name="k_acc" value="cvk" onchange="window.calcKInfusion()"> <span>ЦВК</span></label>' +
            '</div>' +
          '</div>' +

          magnesiumOptionBlock +

          '<div id="k_calc_result"></div>' +
        '</div>';
    } else {
      ivBlock =
        '<div class="k-note-box k-note-box--primary">' +
          '<div class="k-note-box__title">💉 В/в коррекция</div>' +
          '<div><em>Введите вес пациента для генерации расчётов.</em></div>' +
        '</div>';
    }

    var totalBlock =
      '<div class="k-note-box k-note-box--secondary">' +
        '<div class="k-note-box__title">💊 Общий дефицит</div>' +
        '<div>Ориентировочно: <strong>' + empiricalDeficit + '</strong></div>' +
        '<div>После стабилизации K⁺ ≥ 3,5 — переход на пероральный приём (40–60 ммоль/сут).</div>' +
      '</div>';

    var warnings = [];
    if (k < 3.5 && mg === null) {
      warnings.push('🔍 Проверьте магний. Гипомагниемия — частая причина рефрактерной гипокалиемии.');
    } else if (k < 3.5 && mg !== null && mg < 0.7) {
      warnings.push('⚠️ Гипомагниемия (Mg ' + mg.toFixed(2) + ' ммоль/л). Сначала скорректируйте магний!');
    }
    if (k < 2.5) warnings.push('⚠️ Риск аритмий. Показан мониторинг ЭКГ. Контроль K⁺ через 2–4 ч.');
    if (hasDM) warnings.push('💉 При инсулинотерапии (особенно ДКА) потребность в калии резко возрастает.');

    var warningsHtml = '';
    if (warnings.length > 0) {
      warningsHtml = '<div class="k-note-box k-note-box--warning">';
      warnings.forEach(function(w) { warningsHtml += '<div style="margin-bottom:4px;">' + w + '</div>'; });
      warningsHtml += '</div>';
    }

    var tooltipId = 'k_hypo_tooltip_' + Date.now();
    var tooltipText =
      'ЭКСТРЕННАЯ В/В КОРРЕКЦИЯ\n' +
      'Формула (внеклеточный дефицит): (4,0 − K⁺) × вес × 0,4\n\n' +
      'БЕЗОПАСНОСТЬ (СОВРЕМЕННЫЕ СТАНДАРТЫ)\n' +
      'Периферическая вена (ПВК):\n' +
      '• Макс. концентрация: 40 ммоль/л\n' +
      '• Макс. скорость: 10 ммоль/ч\n' +
      'Центральная вена (ЦВК):\n' +
      '• Макс. концентрация: 120 ммоль/л\n' +
      '• Макс. скорость: 20 ммоль/ч\n\n' +
      'ОФИЦИАЛЬНАЯ ИНСТРУКЦИЯ (РФ)\n' +
      'Инструкция допускает разведение 10 мл 4% KCl в 100 мл NaCl (54 ммоль/л).\n' +
      'Однако по современным гайдам это значительно повышает риск химического флебита. Наш калькулятор использует строгий предел 40 ммоль/л для защиты вены.';

    var valueWithIcon = k.toFixed(1) + ' ммоль/л ' +
      '<span class="info-icon" id="' + tooltipId + '" style="cursor:help;font-size:20px;opacity:0.6;vertical-align:middle;">ⓘ</span>';

    var html = makeResultCard('Калий — коррекция', valueWithIcon, hypoGrade, hypoRisk, ivBlock + totalBlock + warningsHtml, '');

    // Запускаем расчёт конструктора калия через 50мс (когда HTML уже появится на странице)
    setTimeout(function() {
      if (typeof window.calcKInfusion === 'function') window.calcKInfusion();
      var icon = document.getElementById(tooltipId);
      if (icon) setupTooltipTrigger(icon, tooltipText);
    }, 50);

    return html;
  }

  // ===== ГИПЕРКАЛИЕМИЯ =====
  if (k > 5.0) {
    var hyperGrade = '';
    var hyperRisk = 'moderate';
    var hyperDetails = '';
    var hyperWarnings = [];

    hyperWarnings.push('🔬 Исключите ложную гиперкалиемию (гемолиз, жгут).');
    if (plt !== null && plt > 400) {
      hyperWarnings.push('🔬 Тромбоцитоз (' + plt + '×10⁹/л). Возможна псевдогиперкалиемия. Проверьте K⁺ в плазме.');
    }

    if (k <= 5.4) {
      hyperGrade = 'Лёгкая гиперкалиемия';
      hyperRisk = 'moderate';
      hyperDetails =
        '<div class="k-note-box k-note-box--plain">' +
          '<div>• Повторный контроль K⁺ для подтверждения</div>' +
          '<div>• Пересмотреть приём: <strong>АМКР, иАПФ, БРА, НПВП</strong></div>' +
          '<div>• Ограничить калий в диете</div>' +
        '</div>';
    } else if (k <= 6.0) {
      hyperGrade = 'Умеренная гиперкалиемия';
      hyperRisk = 'high';
      hyperDetails =
        '<div class="k-note-box k-note-box--plain">' +
          '<div>• <strong>Оценить ЭКГ</strong> (поиск высоких остроконечных Т)</div>' +
          '<div>• Временная отмена калийсберегающих препаратов</div>' +
          '<div>• Оценить функцию почек, рассмотреть петлевые диуретики</div>' +
        '</div>';
    } else if (k <= 6.4) {
      hyperGrade = 'Тяжёлая гиперкалиемия';
      hyperRisk = 'veryhigh';
      hyperDetails =
        '<div class="k-note-box k-note-box--plain">' +
          '<div>• <strong>Мониторинг ЭКГ обязателен</strong></div>' +
          '<div>• При изменениях на ЭКГ ➔ <strong>Кальция глюконат 10% 10-20 мл в/в</strong> (стабилизация миокарда)</div>' +
          '<div>• Инсулин 10 ЕД + глюкоза 40% 50 мл (сдвиг в клетки)</div>' +
          '<div>• Сальбутамол небулайзер 10-20 мг</div>' +
        '</div>';
    } else {
      hyperGrade = 'Жизнеугрожающая гиперкалиемия ⚠️';
      hyperRisk = 'veryhigh';
      hyperDetails =
        '<div class="k-urgent-box">' +
          '<div class="k-urgent-box__title">НЕОТЛОЖНЫЕ МЕРЫ:</div>' +
          '<div class="k-urgent-box__item">1. <strong>Стабилизация миокарда:</strong><br><em>СТРОГО при наличии изменений ЭКГ / кардиотоксичности!</em><br>Кальция глюконат 10% 10–20 мл в/в.</div>' +
          '<div class="k-urgent-box__item">2. <strong>Сдвиг калия в клетки:</strong><br>Инсулин 10 ЕД + глюкоза 40% 50 мл в/в.</div>' +
          '<div class="k-urgent-box__item">3. <strong>Удаление калия:</strong><br>Петлевые диуретики / экстренный гемодиализ.</div>' +
        '</div>';
    }

    var warningsHtml = '';
    if (hyperWarnings.length > 0) {
      warningsHtml = '<div class="k-note-box k-note-box--warning">';
      hyperWarnings.forEach(function(w) { warningsHtml += '<div style="margin-bottom:4px;">' + w + '</div>'; });
      warningsHtml += '</div>';
    }

    var tooltipId = 'k_hyper_tooltip_' + Date.now();
    var tooltipText =
      'Классификация гиперкалиемии:\n' +
      'Лёгкая: 5,1–5,4 ммоль/л\n' +
      'Умеренная: 5,5–6,0 ммоль/л\n' +
      'Тяжёлая: 6,1–6,4 ммоль/л\n' +
      'Жизнеугрожающая: ≥6,5 ммоль/л\n\n' +
      'Препараты, повышающие K⁺:\n' +
      'АМКР, иАПФ, БРА, НПВП, гепарин.';

    var valueWithIcon = k.toFixed(1) + ' ммоль/л ' +
      '<span class="info-icon" id="' + tooltipId + '" style="cursor:help;font-size:20px;opacity:0.6;vertical-align:middle;">ⓘ</span>';

    var html = makeResultCard('Калий — оценка', valueWithIcon, hyperGrade, hyperRisk, hyperDetails + warningsHtml, '');

    setTimeout(function() {
      var icon = document.getElementById(tooltipId);
      if (icon) setupTooltipTrigger(icon, tooltipText);
    }, 50);

    return html;
  }

  return null;
}

// ===================================================
//  АНАЛИЗ: Коррекция натрия при гипергликемии
// ===================================================
function renderSodiumCorrectionModule() {
  var na = parseNum('na_measured');
  var glu = parseNum('glucose');

  if (na === null || glu === null) return null;

  if (na <= 0 || glu <= 0) {
    return makeResultCard('Натрий', 'Ошибка данных',
      'Проверьте корректность введённых значений','moderate',
      'Значения должны быть больше 0.','');
  }

  var measuredNa = na;
  var glucose = glu;

  // Формулы коррекции
  var katz = measuredNa + 1.6 * ((glucose - 5.55) / 5.55);
  var hillier = measuredNa + 2.4 * ((glucose - 5.55) / 5.55);

  // Определяем истинный натрий (используем Хиллиера для стратификации риска)
  var trueNa;
  if (glucose <= 5.55) {
    trueNa = measuredNa;
  } else {
    trueNa = hillier;
  }

  // Классификация истинного натрия (строгие границы для дробных чисел)
  var interp, risk, detailsExtra;

  if (trueNa < 120) {
    risk = 'veryhigh';
    interp = '⚠️ Критическая гипонатриемия';
  } else if (trueNa < 125) {
    risk = 'veryhigh';
    interp = 'Тяжелая гипонатриемия';
  } else if (trueNa < 130) {
    risk = 'high';
    interp = 'Умеренная гипонатриемия';
  } else if (trueNa < 135) {
    risk = 'moderate';
    interp = 'Лёгкая гипонатриемия';
  } else if (trueNa <= 145) {
    risk = 'low';
    interp = 'Натрий в норме';
  } else if (trueNa <= 150) {
    risk = 'moderate';
    interp = 'Лёгкая гипернатриемия';
  } else if (trueNa <= 155) {
    risk = 'high';
    interp = 'Умеренная гипернатриемия';
  } else {
    risk = 'veryhigh';
    interp = '⚠️ Тяжелая гипернатриемия';
  }

  // Дополнительная логика для случая повышенной глюкозы
  if (glucose > 5.55) {

    // Сценарий 1: Псевдогипонатриемия (на бумаге низкий, а по факту - НОРМА)
    if (measuredNa < 135 && trueNa >= 135 && trueNa <= 145) {
      interp = 'Псевдогипонатриемия';
      detailsExtra = 
        '<div style="margin-bottom:6px;">Снижение натрия на бумаге обусловлено сдвигом воды из-за гипергликемии. Истинный уровень натрия находится в пределах нормы.</div>' +
        '<div style="padding:6px 8px;background:#fffbf0;border-left:3px solid #e67e22;border-radius:0 4px 4px 0;font-size:11.5px;">❗️ <strong>Важно:</strong> введение гипертонического натрия в этой ситуации противопоказано.</div>';
    } 
    // Сценарий 2: Маскированная гипернатриемия (на бумаге норма или низкий, а по факту - ВЫСОКИЙ)
    else if (measuredNa <= 145 && trueNa > 145) {
      detailsExtra = '<div style="margin-bottom:6px;">Истинный уровень натрия выше измеренного. Гипергликемия маскирует гипернатриемию (вероятна дегидратация).</div>';
    }
    // Сценарий 3: Истинная гипонатриемия (остался низким)
    else if (trueNa < 135) {
      detailsExtra = '<div style="margin-bottom:6px;">Даже с поправкой на гипергликемию у пациента сохраняется истинный дефицит натрия.</div>';
    }
    // Остальные случаи (был высокий, остался высоким)
    else {
      detailsExtra = '<div style="margin-bottom:6px;">Скорректированный с учётом гипергликемии истинный уровень натрия.</div>';
    }

    var tooltipId = 'na_correction_tooltip_' + Date.now();

    var valueWithIcon = hillier.toFixed(1) + ' / ' + katz.toFixed(1) + ' ммоль/л ' +
      '<span class="info-icon" id="' + tooltipId + '" style="cursor:help;font-size:20px;opacity:0.6;vertical-align:middle;">ⓘ</span>';

    var html = makeResultCard(
      'Скорректированный натрий',
      valueWithIcon,
      interp,
      risk,
      detailsExtra,
      ''
    );

    var tooltipText =
      'Измеренный Na: ' + measuredNa.toFixed(1) + ' ммоль/л\n' +
      'Глюкоза: ' + glucose.toFixed(1) + ' ммоль/л\n\n' +
      'Хиллиер (коэф. 2,4): ' + hillier.toFixed(1) + ' ммоль/л\n' +
      'Кац (коэф. 1,6): ' + katz.toFixed(1) + ' ммоль/л\n\n' +
      'Формула Хиллиера считается более точной при выраженной гипергликемии (>22 ммоль/л).';

    setTimeout(function() {
      var icon = document.getElementById(tooltipId);
      if (icon) setupTooltipTrigger(icon, tooltipText);
    }, 50);

    return html;

  } else {

    // Сценарий: глюкоза не повышена (норма или гипогликемия)
    if (glucose < 3.3) {
      detailsExtra = '<div style="margin-bottom:6px;">Гипогликемия. Коррекция натрия не требуется, измеренный показатель является истинным.</div>';
    } else {
      detailsExtra = '<div style="margin-bottom:6px;">Глюкоза в норме. Измеренный натрий является истинным.</div>';
    }

    return makeResultCard(
      'Натрий',
      measuredNa.toFixed(1) + ' ммоль/л',
      interp,
      risk,
      detailsExtra,
      ''
    );
  }
}

// ===================================================
//  АНАЛИЗ: Индекс КФК-МВ
// ===================================================
function renderCKMBIndexModule() {
  var ckTotal = parseNum('ck_total');
  var ckMb = parseNum('ck_mb');
  
  if (ckTotal === null || ckMb === null) return null;
  
  if (ckTotal <= 0 || ckMb < 0) {
    return makeResultCard('Индекс КФК-МВ','Ошибка данных',
      'Проверьте корректность значений','moderate',
      'КФК общая должна быть больше 0.','');
  }
  
  // Проверка на опечатку ВАЖНЕЕ скрытия блока.
  // Если КФК-МВ больше общей КФК — это 100% ошибка ввода, предупреждаем врача.
  if (ckMb > ckTotal) {
    return makeResultCard('Индекс КФК-МВ','Ошибка данных',
      'КФК-МВ не может превышать общую КФК','moderate',
      'Проверьте значения.','');
  }

  // Верхняя граница лабораторной нормы общей КФК
  var CK_TOTAL_UPPER_LIMIT = 171;

  // Если общая КФК в норме (и нет опечаток), индекс не считаем и блок не показываем
  if (ckTotal <= CK_TOTAL_UPPER_LIMIT) return null;

  var ri = (ckMb / ckTotal) * 100;
  var riFormatted = ri.toFixed(1).replace('.', ',');
  var risk = 'moderate';
  var interp = 'Пограничный результат';
  var detailsExtra = 'Требуется дополнительная клиническая оценка.';
  if (ri < 3.0) {
    risk = 'low';
    interp = 'Кардиальный источник маловероятен';
    detailsExtra = 'Повышение КФК-МВ, скорее всего, связано с внесердечным источником.';
  } else if (ri > 5.0) {
    risk = 'neutral';
    interp = 'Кардиальный источник более вероятен';
    detailsExtra = 'Соотношение типично для кардиального происхождения ферментов.';
  }
  var details = 'КФК-МВ ' + ckMb.toFixed(1) + ' / КФК ' + ckTotal.toFixed(1) +
    ' × 100 = ' + riFormatted + '%<br>' + detailsExtra;
  var hint = 'Индекс не входит в современные диагностические критерии ИМ. ' +
    'Интерпретировать с учётом клиники, ЭКГ и тропонина.';
  return makeResultCard('Индекс КФК-МВ', riFormatted + '%', interp, risk, details, hint);
}

function updateAnalysisPanel() {
  var panel = document.getElementById('analysisPanel');
  var modulesContainer = document.getElementById('analysisModules');
  if (!panel || !modulesContainer) return;
  var modules = [];
  var ckmbModule = renderCKMBIndexModule();
  if (ckmbModule) modules.push(ckmbModule);

  var naModule = renderSodiumCorrectionModule();
  if (naModule) modules.push(naModule);

  var kModule = renderPotassiumModule();
  if (kModule) modules.push(kModule);

  if (modules.length === 0) {
    modulesContainer.innerHTML = '';
    panel.style.display = 'none';
    return;
  }
  modulesContainer.innerHTML = modules.join('');
  panel.style.display = 'block';
}

// Обновляем анализ при вводе КФК
document.addEventListener('DOMContentLoaded', function() {
  var ckTotal = document.getElementById('ck_total');
  var ckMb = document.getElementById('ck_mb');
  if (ckTotal) ckTotal.addEventListener('input', updateAnalysisPanel);
  if (ckMb) ckMb.addEventListener('input', updateAnalysisPanel);

  var naMeasured = document.getElementById('na_measured');
  var glucoseInput = document.getElementById('glucose');
  if (naMeasured) naMeasured.addEventListener('input', updateAnalysisPanel);
  if (glucoseInput) glucoseInput.addEventListener('input', updateAnalysisPanel);

  var potassiumInput = document.getElementById('potassium');
  var magnesiumInput = document.getElementById('magnesium');
  if (potassiumInput) potassiumInput.addEventListener('input', updateAnalysisPanel);
  if (magnesiumInput) magnesiumInput.addEventListener('input', updateAnalysisPanel);
});
