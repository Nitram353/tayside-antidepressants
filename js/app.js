/* Interactive heatmaps, lightbox and navigation for the poster companion site.
   All values are taken from the draft manuscript (Figures 4, 5, 7 and 8 and the Results text). */
(function () {
  'use strict';

  var SETTINGS = {
    acute: { label: 'General acute admissions', noun: 'general acute admission rate', unit: 'general acute admissions' },
    ed:    { label: 'Emergency department attendances', noun: 'emergency department attendance rate', unit: 'emergency department attendances' },
    psych: { label: 'Psychiatric admissions', noun: 'psychiatric admission rate', unit: 'psychiatric admissions' }
  };
  var ORDER = ['acute', 'ed', 'psych'];

  var DATA = {
    age: {
      title: 'Rate ratios by age group',
      sub: 'Adults prescribed antidepressants in NHS Tayside vs the Scottish population of the same age, mean of 2019–2023',
      cols: ['16–24', '25–34', '35–44', '45–54', '55–64', '65–74', '≥75'],
      colLong: ['16–24', '25–34', '35–44', '45–54', '55–64', '65–74', '75 and over'],
      rr: {
        acute: [1.80, 1.69, 2.57, 1.13, 0.99, 1.08, 0.92],
        ed:    [6.25, 5.14, 6.31, 2.83, 2.01, 1.57, 0.90],
        psych: [5.42, 3.73, 3.49, 2.92, 2.37, 3.03, 2.24]
      },
      /* Absolute mean monthly rates per 1,000 where the manuscript text states them exactly. */
      abs: {
        acute: { 0: 12.31, 6: 41.86 },
        ed:    { 6: 25.00 },
        psych: { 0: 1.75 }
      },
      defaultCell: { setting: 'ed', i: 0 }
    },
    sex: {
      title: 'Rate ratios by sex',
      sub: 'Adults prescribed antidepressants in NHS Tayside vs the Scottish population of the same sex, mean of 2019–2023',
      cols: ['Male', 'Female'],
      colLong: ['Male', 'Female'],
      rr: {
        acute: [1.27, 1.07],
        ed:    [2.53, 2.09],
        psych: [3.88, 2.77]
      },
      abs: {
        acute: { 0: 22.7, 1: 19.84 },
        ed:    { 0: 23.40, 1: 19.86 },
        psych: { 0: 1.51, 1: 0.93 }
      },
      defaultCell: { setting: 'psych', i: 0 }
    }
  };

  var RR_MAX = 6.4; /* top of the colour scale, just above the largest observed ratio (6.31) */

  var state = { mode: 'age', setting: 'all', sel: null };

  var heatmapEl = document.getElementById('heatmap');
  var explainEl = document.getElementById('explain');
  var titleEl = document.getElementById('hm-title');
  var subEl = document.getElementById('hm-sub');

  /* ---------- colour ---------- */
  function mix(a, b, t) { return [0, 1, 2].map(function (k) { return Math.round(a[k] + (b[k] - a[k]) * t); }); }
  function rgb(c) { return 'rgb(' + c.join(',') + ')'; }
  var STOP0 = [255, 241, 235], STOP1 = [245, 154, 123], STOP2 = [194, 65, 12];
  function cellStyle(rr) {
    if (rr < 1) return { bg: '#d6e2f3', fg: '#0f1d4d' };
    var t = Math.max(0, Math.min(1, (rr - 1) / (RR_MAX - 1)));
    var c = t < 0.5 ? mix(STOP0, STOP1, t * 2) : mix(STOP1, STOP2, (t - 0.5) * 2);
    return { bg: rgb(c), fg: t > 0.7 ? '#ffffff' : '#0f1d4d' };
  }

  /* ---------- wording ---------- */
  var WORDS = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven' };
  function timesWord(n) { return n === 2 ? 'twice' : (WORDS[n] || n) + ' times'; }
  function plainWords(rr) {
    if (rr < 1) return Math.round((1 - rr) * 100) + '% lower than the Scottish rate';
    if (rr < 2) return Math.round((rr - 1) * 100) + '% higher than the Scottish rate';
    var n = Math.floor(rr), f = rr - n;
    if (f <= 0.15) return 'about ' + timesWord(n) + ' the Scottish rate';
    if (f < 0.4) return 'more than ' + timesWord(n) + ' the Scottish rate';
    if (f <= 0.6) return 'about ' + (WORDS[n] || n) + ' and a half times the Scottish rate';
    if (f < 0.85) return 'nearly ' + timesWord(n + 1) + ' the Scottish rate';
    return 'about ' + timesWord(n + 1) + ' the Scottish rate';
  }
  function who(mode, i) {
    if (mode === 'age') return 'Adults aged ' + DATA.age.colLong[i] + ' prescribed antidepressants in Tayside';
    return (i === 0 ? 'Men' : 'Women') + ' prescribed antidepressants in Tayside';
  }
  function comparator(mode, i) {
    if (mode === 'age') return 'the Scottish population of the same age';
    return (i === 0 ? 'men' : 'women') + ' in the Scottish population';
  }
  function groupNoun(mode, i) {
    if (mode === 'age') return 'this age group';
    return i === 0 ? 'men' : 'women';
  }
  function article(word) { return /^[aeiou]/i.test(word) ? 'an' : 'a'; }
  function sentence(mode, setting, i) {
    var rr = DATA[mode].rr[setting][i];
    var s = SETTINGS[setting];
    if (rr >= 0.85 && rr <= 1.1) {
      return who(mode, i) + ' had ' + article(s.noun) + ' ' + s.noun + ' close to the Scottish rate for ' + groupNoun(mode, i) + ': ' + rr.toFixed(2) + ' times that rate.';
    }
    if (rr > 1.1) {
      return who(mode, i) + ' had ' + rr.toFixed(2) + ' times the ' + s.noun + ' of ' + comparator(mode, i) + '.';
    }
    return who(mode, i) + ' had ' + article(s.noun) + ' ' + s.noun + ' below the Scottish rate for ' + groupNoun(mode, i) + ': ' + rr.toFixed(2) + ' times that rate.';
  }
  function absLine(mode, setting, i) {
    var v = DATA[mode].abs[setting] ? DATA[mode].abs[setting][i] : undefined;
    if (v === undefined) return '';
    var g = mode === 'age' ? 'adults aged ' + DATA.age.colLong[i] : (i === 0 ? 'men' : 'women');
    return '<p class="ex-abs"><strong>Absolute rate:</strong> ' + v.toFixed(2) + ' ' + SETTINGS[setting].unit + ' per 1,000 ' + g + ' prescribed antidepressants, per month (mean of 2019–2023).</p>';
  }

  /* ---------- render ---------- */
  function render() {
    var d = DATA[state.mode];
    titleEl.textContent = d.title;
    subEl.textContent = d.sub;
    heatmapEl.style.setProperty('--cols', d.cols.length);
    heatmapEl.classList.toggle('has-setting', state.setting !== 'all');
    heatmapEl.classList.toggle('cols-2', d.cols.length === 2);

    var html = '<div class="hm-corner" aria-hidden="true"></div>';
    d.cols.forEach(function (c) { html += '<div class="hm-col" aria-hidden="true">' + c + '</div>'; });
    ORDER.forEach(function (key) {
      var on = state.setting === 'all' || state.setting === key;
      html += '<div class="' + (on ? 'hm-row-on' : 'hm-row-dim') + '">';
      html += '<div class="hm-label">' + SETTINGS[key].label + '</div>';
      d.rr[key].forEach(function (rr, i) {
        var st = cellStyle(rr);
        var selected = state.sel && state.sel.setting === key && state.sel.i === i;
        html += '<button type="button" class="hm-cell' + (selected ? ' is-selected' : '') + '"' +
          ' data-setting="' + key + '" data-i="' + i + '"' +
          ' style="background:' + st.bg + ';color:' + st.fg + '"' +
          ' aria-pressed="' + (selected ? 'true' : 'false') + '"' +
          ' aria-label="' + SETTINGS[key].label + ', ' + d.colLong[i] + ': rate ratio ' + rr.toFixed(2) + '">' +
          rr.toFixed(2) + '</button>';
      });
      html += '</div>';
    });
    heatmapEl.innerHTML = html;
    renderExplain();
  }

  function renderExplain() {
    if (!state.sel) { explainEl.innerHTML = ''; return; }
    var mode = state.mode, setting = state.sel.setting, i = state.sel.i;
    var d = DATA[mode];
    var rr = d.rr[setting][i];
    var tag = SETTINGS[setting].label + ' · ' + (mode === 'age' ? 'Ages ' + d.colLong[i] : d.colLong[i]);
    explainEl.innerHTML =
      '<span class="ex-tag">' + tag + '</span>' +
      '<div class="ex-top"><span class="ex-rr">' + rr.toFixed(2) + '<small>× the Scottish rate</small></span></div>' +
      '<p class="ex-sentence">' + sentence(mode, setting, i) + '</p>' +
      '<p class="ex-plain">In plain terms: ' + plainWords(rr) + '.</p>' +
      absLine(mode, setting, i) +
      '<p class="ex-note">Rates count hospital contacts per 1,000 people per month, not individuals. The comparison does not show that antidepressants caused the difference: see <a href="#interpretation">Interpretation &amp; limitations</a>.</p>';
  }

  /* ---------- events ---------- */
  heatmapEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.hm-cell');
    if (!btn) return;
    var setting = btn.getAttribute('data-setting');
    var i = parseInt(btn.getAttribute('data-i'), 10);
    state.sel = { setting: setting, i: i };
    if (state.setting !== 'all' && state.setting !== setting) setSetting(setting, true);
    render();
    var selected = heatmapEl.querySelector('.hm-cell.is-selected');
    if (selected) selected.focus({ preventScroll: true });
  });

  function setSetting(key, silent) {
    state.setting = key;
    document.querySelectorAll('.chip').forEach(function (c) {
      var on = c.getAttribute('data-setting') === key;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (!silent) {
      if (key !== 'all' && (!state.sel || state.sel.setting !== key)) {
        /* jump to the largest ratio in the chosen row so the explanation is never stale */
        var row = DATA[state.mode].rr[key];
        var best = 0;
        row.forEach(function (v, i) { if (v > row[best]) best = i; });
        state.sel = { setting: key, i: best };
      }
      render();
    }
  }

  document.querySelectorAll('.chip').forEach(function (c) {
    c.addEventListener('click', function () { setSetting(c.getAttribute('data-setting'), false); });
  });

  document.querySelectorAll('.segmented [role="tab"]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var mode = tab.getAttribute('data-mode');
      if (mode === state.mode) return;
      state.mode = mode;
      document.querySelectorAll('.segmented [role="tab"]').forEach(function (t) {
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      var def = DATA[mode].defaultCell;
      if (state.setting !== 'all') {
        var row = DATA[mode].rr[state.setting];
        var best = 0;
        row.forEach(function (v, i) { if (v > row[best]) best = i; });
        state.sel = { setting: state.setting, i: best };
      } else {
        state.sel = { setting: def.setting, i: def.i };
      }
      render();
    });
  });

  state.sel = { setting: DATA.age.defaultCell.setting, i: DATA.age.defaultCell.i };
  render();

  /* ---------- lightbox ---------- */
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lb-img');
  if (lb && typeof lb.showModal === 'function') {
    document.querySelectorAll('.fig-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        lbImg.src = b.getAttribute('data-src');
        lbImg.alt = b.getAttribute('data-alt') || '';
        lb.showModal();
      });
    });
    document.getElementById('lb-close').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('close', function () { lbImg.src = ''; });
  }

  /* ---------- nav highlighting ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    var current = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) current = en.target.id; });
      if (!current) return;
      links.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + current;
        a.classList.toggle('is-active', on);
        if (on && a.scrollIntoView) {
          try { a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); } catch (err) { /* ignore */ }
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    sections.forEach(function (s) { io.observe(s); });
  }
})();
