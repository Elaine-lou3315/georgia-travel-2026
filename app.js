/* === Travel Plan Page - Georgia Trip 2026 ===
 * 数据加载 + 行程渲染 + 航班倒计时 + Todo + 记账（自包含实现）
 * 设计语言遵循 Travel-Plan-Page 模板。
 */
(function () {
  'use strict';

  /* ---------- 全局工具（模板模块兼容） ---------- */
  var state = { data: null, view: 'travel' };
  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  window.state = state;
  window.$ = $;
  window.$$ = $$;
  window.escapeHtml = escapeHtml;

  /* ---------- 加载数据 ---------- */
  var tripData = null;

  function loadData() {
    return fetch('trip-data.json', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (data) {
        tripData = data;
        state.data = data;
        window.TRAVEL_PLAN_DATA = data;
        document.dispatchEvent(new CustomEvent('travel-data-ready', { detail: data }));
        document.dispatchEvent(new CustomEvent('travel-config:ready'));
        return data;
      });
  }

  /* ---------- 航班倒计时 ---------- */
  var TRIP_START = new Date('2026-09-24T00:00:00+08:00');
  var TRIP_END = new Date('2026-10-04T16:35:00+04:00');

  function formatDuration(ms) {
    if (ms <= 0) return '已出发';
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60);
    if (d > 0) return d + ' 天 ' + h + ' 小时';
    if (h > 0) return h + ' 小时 ' + m + ' 分';
    return m + ' 分钟';
  }

  function updateCountdowns() {
    var now = Date.now();
    var out = document.getElementById('countdown-outbound');
    var ret = document.getElementById('countdown-return');
    if (out) out.textContent = formatDuration(TRIP_START.getTime() - now);
    if (ret) ret.textContent = formatDuration(TRIP_END.getTime() - now);
  }

  /* ---------- 航班轮播点 ---------- */
  function setupFlightCarousel() {
    var carousel = document.getElementById('flight-carousel');
    var dotsWrap = document.getElementById('flight-dots');
    if (!carousel || !dotsWrap) return;
    var cards = $$('.flight-card', carousel);
    cards.forEach(function (card, i) {
      var dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' is-active' : '');
      dot.type = 'button';
      dot.setAttribute('aria-label', '第 ' + (i + 1) + ' 张航班卡片');
      dot.addEventListener('click', function () {
        carousel.scrollTo({ left: cards[i].offsetLeft - 10, behavior: 'smooth' });
      });
      dotsWrap.appendChild(dot);
    });
    var dots = $$('.carousel-dot', dotsWrap);
    var idxLabel = document.getElementById('flight-index');
    carousel.addEventListener('scroll', function () {
      var idx = Math.round(carousel.scrollLeft / (cards[0].offsetWidth + 14));
      if (idx < 0) idx = 0;
      if (idx >= cards.length) idx = cards.length - 1;
      dots.forEach(function (d, j) { d.classList.toggle('is-active', j === idx); });
      if (idxLabel) idxLabel.textContent = (idx + 1) + ' / ' + cards.length;
    }, { passive: true });
  }

  /* ---------- 渲染每日行程 ---------- */
  function renderItinerary() {
    var timeline = document.getElementById('timeline');
    if (!timeline || !tripData) return;
    var days = tripData.days || [];
    var dayCount = document.getElementById('day-count');
    if (dayCount) dayCount.textContent = days.length + ' 天 · ' + (tripData.trip.nightCountAway || days.length - 1) + ' 晚';

    timeline.innerHTML = days.map(function (day) {
      var schedule = (day.schedule || []).map(function (item) {
        var extra = '';
        if (item.description) extra += '<span class="spot-desc">' + escapeHtml(item.description) + '</span>';
        if (item.warning) extra += '<span class="spot-warn">' + escapeHtml(item.warning) + '</span>';
        if (item.hours) extra += '<span class="spot-time">🕐 ' + escapeHtml(item.hours) + '</span>';
        return '<li class="schedule-item"><div class="schedule-time">' + escapeHtml(item.time) + '</div>' +
          '<div class="schedule-text"><strong>' + escapeHtml(item.text) + '</strong>' + extra + '</div></li>';
      }).join('');

      var tips = (day.tips || []).map(function (tip) {
        return '<div class="detail-tip"><span class="tip-icon">💡</span><span>' + escapeHtml(tip) + '</span></div>';
      }).join('');

      var foods = (day.foods || []).map(function (food) {
        return '<div class="food-item"><div class="food-name">' + escapeHtml(food.name) + '</div>' +
          '<div class="food-desc">' + escapeHtml(food.description) + '</div></div>';
      }).join('');
      var foodBlock = foods ? '<div class="detail-food"><h4 class="detail-h4">🍴 美食推荐</h4><div class="food-list">' + foods + '</div></div>' : '';

      var accommodation = day.accommodation
        ? '<div class="costs"><span class="cost-tag">🏨 ' + escapeHtml(day.accommodation) + '</span></div>'
        : '';

      return '<div class="day-card" data-day="' + day.day + '">' +
        '<div class="day-dot"></div>' +
        '<button class="day-toggle" aria-expanded="false">' +
        '<div><div class="day-meta">D' + day.day + ' · ' + escapeHtml(day.date.slice(5).replace('-', '.')) + ' ' + escapeHtml(day.weekday) + '</div>' +
        '<div class="day-title">' + escapeHtml(day.title) + '</div>' +
        '<div class="day-locations">' + escapeHtml(day.summary || day.locations) + '</div></div>' +
        '<div class="day-chevron">+</div></button>' +
        '<div class="day-detail" hidden>' +
        '<div class="detail-section"><h4 class="detail-h4">📍 当日安排</h4><ul class="schedule">' + schedule + '</ul></div>' +
        tips + foodBlock + accommodation +
        '</div></div>';
    }).join('');

    // 绑定展开/收起
    $$('.day-toggle', timeline).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        var detail = btn.nextElementSibling;
        if (detail) detail.hidden = expanded;
      });
    });

    highlightToday();
  }

  function highlightToday() {
    var now = new Date();
    $$('.day-card').forEach(function (card) {
      var meta = $('.day-meta', card);
      if (!meta) return;
      var m = meta.textContent.match(/D(\d+)/);
      if (!m) return;
      var dayNum = parseInt(m[1], 10);
      var dayDate = new Date(2026, 8, 24 + dayNum - 1);
      var sameDay = now.getFullYear() === dayDate.getFullYear() &&
        now.getMonth() === dayDate.getMonth() && now.getDate() === dayDate.getDate();
      if (sameDay) card.classList.add('is-today');
    });
  }

  /* ---------- 渲染通用贴士 ---------- */
  function renderTips() {
    var grid = document.getElementById('tips-grid');
    if (!grid || !tripData) return;
    var tips = tripData.generalTips || [];
    grid.innerHTML = tips.map(function (tip) {
      return '<div class="tip-card"><div class="tip-card__icon">' + escapeHtml(tip.icon) + '</div>' +
        '<div><div class="tip-card__title">' + escapeHtml(tip.title) + '</div>' +
        '<div class="tip-card__text">' + escapeHtml(tip.text) + '</div></div></div>';
    }).join('');
  }

  /* ---------- Todo（localStorage） ---------- */
  var TODO_KEY = 'georgia-trip-todo-v2';

  function loadTodos() {
    try {
      var raw = localStorage.getItem(TODO_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // 首次访问：用数据里的准备清单初始化
    var seed = (tripData && tripData.preTrip && tripData.preTrip.packingItems) || [];
    var todos = seed.map(function (text) { return { text: text, done: false }; });
    saveTodos(todos);
    return todos;
  }

  function saveTodos(todos) {
    try { localStorage.setItem(TODO_KEY, JSON.stringify(todos)); } catch (e) {}
  }

  function renderTodos() {
    var list = document.getElementById('todo-list');
    var progress = document.getElementById('todo-progress');
    if (!list) return;
    var todos = loadTodos();
    list.innerHTML = '';
    var done = 0;
    todos.forEach(function (t, i) {
      if (t.done) done++;
      var item = document.createElement('div');
      item.className = 'todo-item' + (t.done ? ' is-complete' : '');
      var label = document.createElement('label');
      var check = document.createElement('span');
      check.className = 'todo-check';
      check.textContent = '✓';
      var text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = t.text;
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = t.done;
      cb.addEventListener('change', function () {
        todos[i].done = cb.checked;
        saveTodos(todos);
        renderTodos();
      });
      label.appendChild(cb);
      label.appendChild(check);
      label.appendChild(text);
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'todo-delete';
      del.textContent = '删除';
      del.addEventListener('click', function () {
        todos.splice(i, 1);
        saveTodos(todos);
        renderTodos();
      });
      item.appendChild(label);
      item.appendChild(del);
      list.appendChild(item);
    });
    if (!todos.length) {
      var empty = document.createElement('p');
      empty.className = 'todo-empty';
      empty.textContent = '还没有准备事项，添加一条吧 ✈️';
      list.appendChild(empty);
    }
    if (progress) progress.textContent = done + ' / ' + todos.length;
  }

  function setupTodoForm() {
    var form = document.getElementById('todo-form');
    var input = document.getElementById('todo-input');
    if (!form || !input) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = input.value.trim();
      if (!val) return;
      var todos = loadTodos();
      todos.push({ text: val, done: false });
      saveTodos(todos);
      input.value = '';
      renderTodos();
    });
  }

  /* ---------- 记账（Ledger） ---------- */
  var LEDGER_KEY = 'georgia-trip-ledger-v1';
  var CATEGORIES = ['餐饮', '交通', '住宿', '门票', '购物', '其他'];
  var CURRENCIES = ['CNY', 'USD', 'GEL', 'EUR'];

  function defaultLedgerState() {
    return {
      travelers: [
        { id: 't1', name: '我', color: '#287b90' },
        { id: 't2', name: '搭子2', color: '#b65c3a' },
        { id: 't3', name: '搭子3', color: '#516b55' },
        { id: 't4', name: '搭子4', color: '#8b6aa8' }
      ],
      bills: []
    };
  }

  function loadLedger() {
    try {
      var raw = localStorage.getItem(LEDGER_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    var initial = defaultLedgerState();
    saveLedger(initial);
    return initial;
  }

  function saveLedger(ledger) {
    try { localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger)); } catch (e) {}
  }

  function renderLedger() {
    var root = document.getElementById('ledger-root');
    if (!root) return;
    var ledger = loadLedger();
    var travelers = ledger.travelers;
    var bills = ledger.bills;

    var totalByCurrency = {};
    bills.forEach(function (bill) {
      var key = bill.currency || 'CNY';
      totalByCurrency[key] = (totalByCurrency[key] || 0) + (Number(bill.amount) || 0);
    });
    var totalText = Object.keys(totalByCurrency).map(function (key) {
      return key + ' ' + totalByCurrency[key].toFixed(2);
    }).join('　') || '暂无账单';

    var travelerChips = travelers.map(function (t) {
      return '<span class="ledger-avatar" style="--ledger-avatar-color:' + t.color + '" title="' + escapeHtml(t.name) + '">' +
        escapeHtml(t.name.slice(0, 1)) + '</span>';
    }).join('');

    var billRows = bills.slice().reverse().map(function (bill, idx) {
      var payer = travelers.find(function (t) { return t.id === bill.payerId; });
      var payerName = payer ? payer.name : '未知';
      var splitNames = (bill.splitIds || []).map(function (id) {
        var t = travelers.find(function (x) { return x.id === id; });
        return t ? t.name : '';
      }).filter(Boolean).join('、');
      return '<div class="ledger-bill-row">' +
        '<div class="ledger-bill-main"><span class="ledger-bill-cat">' + escapeHtml(bill.category) + '</span>' +
        '<span class="ledger-bill-note">' + escapeHtml(bill.note || bill.category) + '</span></div>' +
        '<div class="ledger-bill-amount">' + escapeHtml(bill.currency || 'CNY') + ' ' + (Number(bill.amount) || 0).toFixed(2) + '</div>' +
        '<div class="ledger-bill-meta">' + escapeHtml(payerName) + (splitNames ? ' · 分摊：' + escapeHtml(splitNames) : '') + '</div>' +
        '<button type="button" class="ledger-bill-delete" data-bill-idx="' + idx + '">删除</button></div>';
    }).join('') || '<p class="ledger-empty">还没有账单，记一笔吧 💰</p>';

    var catOptions = CATEGORIES.map(function (c) {
      return '<label class="ledger-cat-choice"><input type="radio" name="ledger-cat" value="' + c + '"' + (c === '餐饮' ? ' checked' : '') + '>' + c + '</label>';
    }).join('');

    var travelerOptions = travelers.map(function (t) {
      return '<label class="ledger-traveler-choice"><input type="checkbox" value="' + t.id + '" checked>' + escapeHtml(t.name) + '</label>';
    }).join('');

    var payerOptions = travelers.map(function (t) {
      return '<option value="' + t.id + '">' + escapeHtml(t.name) + '</option>';
    }).join('');

    var currencyOptions = CURRENCIES.map(function (c) {
      return '<option value="' + c + '">' + c + '</option>';
    }).join('');

    root.innerHTML =
      '<div class="ledger-app">' +
      '<div class="ledger-page-header"><h1>记账</h1>' +
      '<div class="ledger-header-actions"><button type="button" class="ledger-icon-button" id="ledger-add-traveler">+ 成员</button></div></div>' +
      '<div class="ledger-live" id="ledger-live">' + escapeHtml(totalText) + '</div>' +

      '<div class="ledger-members-strip"><div class="ledger-members-strip-heading"><div><strong>成员</strong><span>' + travelers.length + ' 人</span></div></div>' +
      '<div class="ledger-members-inline">' + travelerChips + '</div></div>' +

      '<div class="ledger-entry-card"><h2>记一笔</h2>' +
      '<form class="ledger-bill-form" id="ledger-bill-form">' +
      '<div class="ledger-amount-block"><div class="ledger-field"><label class="ledger-field-label">金额</label>' +
      '<input class="ledger-amount-input" id="ledger-amount" type="number" step="0.01" min="0" placeholder="0.00" required></div>' +
      '<div class="ledger-field"><label class="ledger-field-label">币种</label>' +
      '<select class="ledger-select" id="ledger-currency">' + currencyOptions + '</select></div></div>' +

      '<fieldset class="ledger-fieldset"><legend>分类</legend><div class="ledger-category-grid">' + catOptions + '</div></fieldset>' +

      '<div class="ledger-field"><label class="ledger-field-label">说明</label>' +
      '<input class="ledger-input" id="ledger-note" type="text" maxlength="60" placeholder="例如：午餐 Khachapuri"></div>' +

      '<div class="ledger-field"><label class="ledger-field-label">付款人</label>' +
      '<select class="ledger-select" id="ledger-payer">' + payerOptions + '</select></div>' +

      '<div class="ledger-field"><label class="ledger-field-label">分摊给</label><div class="ledger-traveler-grid">' + travelerOptions + '</div></div>' +

      '<button type="submit" class="ledger-primary-button">添加账单</button>' +
      '</form></div>' +

      '<div class="ledger-list-section"><div class="ledger-section-heading"><h2>账单</h2><span class="ledger-soft-count">' + bills.length + ' 笔</span></div>' +
      '<div class="ledger-bill-list">' + billRows + '</div></div>' +
      '</div>';

    // 绑定表单
    var form = document.getElementById('ledger-bill-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var amount = Number(document.getElementById('ledger-amount').value);
        if (!amount || amount <= 0) return;
        var currency = document.getElementById('ledger-currency').value;
        var note = document.getElementById('ledger-note').value.trim();
        var category = (document.querySelector('input[name="ledger-cat"]:checked') || {}).value || '其他';
        var payerId = document.getElementById('ledger-payer').value;
        var splitIds = $$('input[type="checkbox"]', form).filter(function (cb) { return cb.checked; }).map(function (cb) { return cb.value; });
        if (!splitIds.length) splitIds = [payerId];
        var bill = {
          id: 'bill-' + Date.now(),
          amount: amount,
          currency: currency,
          note: note,
          category: category,
          payerId: payerId,
          splitIds: splitIds,
          date: new Date().toISOString().slice(0, 10)
        };
        var ledger = loadLedger();
        ledger.bills.push(bill);
        saveLedger(ledger);
        renderLedger();
      });
    }

    // 删除账单
    $$('.ledger-bill-delete', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.dataset.billIdx);
        var ledger = loadLedger();
        // bills 是正序存储，渲染时 reverse 了，所以 idx 对应 reverse 后的位置
        var realIdx = ledger.bills.length - 1 - idx;
        if (realIdx >= 0 && realIdx < ledger.bills.length) {
          ledger.bills.splice(realIdx, 1);
          saveLedger(ledger);
          renderLedger();
        }
      });
    });

    // 添加成员
    var addBtn = document.getElementById('ledger-add-traveler');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        var name = prompt('新成员名字：');
        if (!name || !name.trim()) return;
        var ledger = loadLedger();
        var colors = ['#287b90', '#b65c3a', '#516b55', '#8b6aa8', '#c58b32', '#4f72a2', '#b85f76', '#4e8f86'];
        var used = new Set(ledger.travelers.map(function (t) { return t.color; }));
        var color = colors.find(function (c) { return !used.has(c); }) || '#68798e';
        ledger.travelers.push({ id: 't' + Date.now(), name: name.trim(), color: color });
        saveLedger(ledger);
        renderLedger();
      });
    }
  }

  /* ---------- 视图切换（旅行 / 记账） ---------- */
  function setupNavigation() {
    var travelView = document.querySelector('[data-site-view="travel"]');
    var ledgerView = document.querySelector('[data-site-view="ledger"]');
    var ledgerLink = document.getElementById('ledger-navigation-link');
    var travelMenu = document.getElementById('travel-navigation');

    function showLedger() {
      travelView.hidden = true;
      ledgerView.hidden = false;
      document.body.dataset.activeView = 'ledger';
      if (ledgerLink) ledgerLink.setAttribute('aria-current', 'page');
      renderLedger();
      window.scrollTo({ top: 0 });
    }

    function showTravel() {
      travelView.hidden = false;
      ledgerView.hidden = true;
      document.body.dataset.activeView = 'travel';
      if (ledgerLink) ledgerLink.removeAttribute('aria-current');
      window.scrollTo({ top: 0 });
    }

    if (ledgerLink) {
      ledgerLink.addEventListener('click', function (e) {
        e.preventDefault();
        showLedger();
      });
    }

    // 旅行信息菜单内的链接
    if (travelMenu) {
      $$('a', travelMenu).forEach(function (a) {
        a.addEventListener('click', function () {
          travelMenu.removeAttribute('open');
        });
      });
      // 点击菜单外关闭
      document.addEventListener('click', function (e) {
        if (travelMenu.open && !e.target.closest('#travel-navigation')) {
          travelMenu.removeAttribute('open');
        }
      });
    }

    // 支持 #ledger hash 直达
    if (location.hash === '#ledger') showLedger();
    window.addEventListener('hashchange', function () {
      if (location.hash === '#ledger') showLedger();
      else if (location.hash === '' || location.hash === '#top' || location.hash === '#main') showTravel();
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    loadData()
      .then(function () {
        updateCountdowns();
        setInterval(updateCountdowns, 30000);
        setupFlightCarousel();
        renderItinerary();
        renderTips();
        renderTodos();
        setupTodoForm();
        setupNavigation();
      })
      .catch(function (err) {
        console.error('Failed to load trip data:', err);
        var errorBox = document.getElementById('loading-error');
        if (errorBox) errorBox.hidden = false;
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
