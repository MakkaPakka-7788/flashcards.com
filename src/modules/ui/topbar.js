import { h, svg, setText, setClass, fmtInt, fmtMoney, fmtPct, fmtDate, fmtClock, fmtSigned, clamp01 } from './dom.js';
import { icon, ICONS } from './icons.js';
import { periodOf } from './tooltip.js';
import { saveCity, hasSavedCity, deleteSavedCity } from '../../core/SaveSystem.js';

const TIERS = [[0, 'Founding'], [120, 'Tiny Village'], [1000, 'Large Village'], [4000, 'Tiny Town'], [11000, 'Busy Town'], [24000, 'Great Town'], [50000, 'Big City'], [100000, 'Grand City'], [150000, 'Metropolis'], [250000, 'Megalopolis']];

export function milestoneName(eco) {
  if (eco.milestone && eco.milestone.name) return eco.milestone.name;
  let t = TIERS[0][1];
  for (const [min, name] of TIERS) if ((eco.population || 0) >= min) t = name;
  return t;
}

export function dayPhase(hour) {
  if (hour < 5) return 'Night';
  if (hour < 7) return 'Dawn';
  if (hour < 11.5) return 'Morning';
  if (hour < 13.5) return 'Noon';
  if (hour < 17.5) return 'Afternoon';
  if (hour < 19.5) return 'Evening';
  if (hour < 21) return 'Dusk';
  return 'Night';
}

const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

export function createTopBar(hud) {
  const { world, events, tooltip } = hud;
  const eco = world.economy;
  const per = () => periodOf(world);
  const perAdj = () => ({ week: 'Weekly', month: 'Monthly', day: 'Daily', year: 'Yearly' })[per()] || 'Monthly';

  const cityName = h('div.fc-brand-city', {
    contenteditable: 'true',
    spellcheck: 'false',
    role: 'textbox',
    'aria-label': 'City name'
  }, eco.cityName || 'New Fable');

  cityName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      cityName.blur();
    }

    if (e.key === 'Escape') {
      cityName.textContent = eco.cityName;
      cityName.blur();
    }

    e.stopPropagation();
  });

  cityName.addEventListener('blur', () => {
    const v = cityName.textContent.trim().slice(0, 32) || eco.cityName;
    cityName.textContent = v;

    if (v !== eco.cityName) {
      eco.cityName = v;
      events.emit('city:renamed', v);
    }
  });

  const tierEl = h('b', milestoneName(eco));
  const msFill = h('i');

  const brandSub = h(
    'div.fc-brand-sub',
    h('span.fc-ms-badge', svg(icon('trophy')), tierEl),
    h('div.fc-ms-progress', msFill)
  );

  tooltip.attach(brandSub, () => {
    const ms = eco.milestone || {};
    const rows = [
      {
        k: 'Population',
        v: fmtInt(eco.population || 0)
      }
    ];

    if (ms.next) {
      rows.push({
        k: 'Next milestone',
        v: `${ms.next} · ${fmtInt(ms.nextPopulation || 0)}`
      });
    }

    return {
      icon: 'trophy',
      color: '#ffd66b',
      title: milestoneName(eco),
      desc: ms.next
        ? 'Milestones unlock services and pay a cash reward.'
        : 'Highest milestone reached.',
      rows,
      progress: ms.next ? ms.progress || 0 : 1
    };
  });

  const left = h(
    'div.fc-panel.fc-top-left',
    h(
      'div.fc-brand',
      h('div.fc-crest', { html: ICONS.crest }),
      h('div.fc-brand-text', cityName, brandSub)
    )
  );

  tooltip.attach(cityName, {
    icon: 'pin',
    title: 'City name',
    desc: 'Click to rename your city. Enter confirms, Esc cancels.'
  });

  const dateDay = h('div.fc-date-day');
  const dateSub = h('div.fc-date-sub');

  const dateEl = h(
    'div.fc-date',
    svg(icon('calendar')),
    h('div.fc-date-text', dateDay, dateSub)
  );

  const dialSvg = sv('svg', {
    viewBox: '0 0 44 44',
    class: 'fc-dial-svg'
  });

  const defs = sv('defs', {});

  defs.innerHTML = `<linearGradient id="fc-dayGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff9d5c"/><stop offset="0.5" stop-color="#cfefff"/><stop offset="1" stop-color="#ff9d5c"/></linearGradient>
    <radialGradient id="fc-sunGlow"><stop offset="0" stop-color="#ffe9a8"/><stop offset="0.55" stop-color="#ffd66b"/><stop offset="1" stop-color="#ff9d5c"/></radialGradient>`;

  dialSvg.appendChild(defs);

  dialSvg.appendChild(
    sv('circle', {
      class: 'ring-night',
      cx: 22,
      cy: 22,
      r: 10.5
    })
  );

  dialSvg.appendChild(
    sv('path', {
      class: 'arc-day',
      d: 'M11.5 22 A10.5 10.5 0 0 1 32.5 22'
    })
  );

  const markerG = sv('g', {
    class: 'marker'
  });

  const sunG = sv('g', {
    class: 'sun',
    transform: 'translate(22 6.5)'
  });

  sunG.appendChild(
    sv('circle', {
      class: 'sun-glow',
      cx: 0,
      cy: 0,
      r: 4.8
    })
  );

  sunG.appendChild(
    sv('circle', {
      class: 'sun-disc',
      cx: 0,
      cy: 0,
      r: 3
    })
  );

  const moonG = sv('g', {
    class: 'moon',
    transform: 'translate(22 6.5)'
  });

  moonG.appendChild(
    sv('circle', {
      class: 'moon-glow',
      cx: 0,
      cy: 0,
      r: 4.4
    })
  );

  moonG.appendChild(
    sv('path', {
      class: 'moon-disc',
      d: 'M1.3 -3a3.3 3.3 0 1 0 1.7 5.5a2.7 2.7 0 0 1 -1.7 -5.5z'
    })
  );

  markerG.append(sunG, moonG);
  dialSvg.appendChild(markerG);

  const dialWrap = h('div.fc-dial');
  dialWrap.appendChild(dialSvg);

  const hh = h('span.hh', '00');
  const mm = h('span.mm', '00');

  const clockDigits = h(
    'div.fc-clock-digits',
    hh,
    h('span.colon', ':'),
    mm
  );

  const clockPhase = h(
    'div.fc-clock-phase',
    'Afternoon'
  );

  const clockEl = h(
    'div.fc-clock',
    dialWrap,
    h('div.fc-clock-text', clockDigits, clockPhase)
  );

  tooltip.attach(clockEl, () => ({
    icon: 'clock',
    title: `${fmtClock(world.time.hour)} · ${dayPhase(world.time.hour)}`,
    desc: `One in-game hour passes every ${world.time.secondsPerHour} s at 1×. Drag the time-of-day slider in Settings to stage a screenshot.`,
    rows: [
      {
        k: 'Night factor',
        v: `${Math.round((world.env.nightFactor || 0) * 100)} %`
      }
    ],
    progress: (((world.time.hour % 24) + 24) % 24) / 24
  }));

  const speedBtns = [];
  const speedLabels = [];

  const speedDefs = [
    [0, 'pause', 'Pause', 'Space'],
    [1, 'play', 'Normal speed', '1'],
    [2, 'fast2', 'Fast', '2'],
    [3, 'fast3', 'Fastest', '3']
  ];

  const multipliers = () =>
    (world.simulation &&
      world.simulation.api &&
      world.simulation.api.speedMultipliers) ||
    [0, 1, 2, 4];

  const speedEl = h(
    'div.fc-speed',
    {
      role: 'group',
      'aria-label': 'Simulation speed'
    }
  );

  for (const [s, ic, label, key] of speedDefs) {
    const lab = h(
      'span.fc-speed-label',
      s === 0 ? 'Pause' : `${multipliers()[s]}×`
    );

    const b = h(
      'button',
      {
        class: ic === 'pause' ? 'pause' : '',
        'aria-label': label,
        onClick: () => hud.setSpeed(s)
      },
      svg(icon(ic)),
      lab
    );

    tooltip.attach(b, () => ({
      icon: ic,
      title: s === 0
        ? label
        : `${label} · ${multipliers()[s]}×`,
      key: s === 0 ? key : `Shift+${key}`,
      desc: s === 0
        ? 'Freeze the simulation. Building still works while paused.'
        : `Run the city at ${multipliers()[s]}× speed.`
    }));

    speedBtns.push(b);
    speedLabels.push(lab);
    speedEl.appendChild(b);
  }

  function refreshSpeedLabels() {
    const m = multipliers();

    for (let s = 1; s < speedLabels.length; s++) {
      setText(speedLabels[s], `${m[s]}×`);
    }
  }

  const center = h(
    'div.fc-panel.fc-time',
    dateEl,
    h('div.fc-divider'),
    clockEl,
    h('div.fc-divider'),
    speedEl
  );

  const moneyV = h(
    'div.fc-stat-value',
    fmtMoney(eco.money)
  );

  const moneySubIcon = svg(icon('income'));
  const moneySubText = h('span');

  const moneySub = h(
    'div.fc-stat-sub',
    moneySubIcon,
    moneySubText
  );

  const moneyEl = h(
    'div.fc-stat.money',
    h('div.fc-stat-icon', svg(icon('coin'))),
    h('div.fc-stat-body', moneyV, moneySub)
  );

  tooltip.attach(moneyEl, () => {
    const net =
      (eco.income || 0) -
      (eco.expenses || 0);

    const tax = eco.taxRate || {};

    return {
      icon: 'coin',
      color: '#ffd66b',
      title: 'Treasury',
      desc: `${perAdj()} budget. Taxes and service fees come in, service upkeep and road maintenance go out.`,
      rows: [
        {
          k: 'Income',
          v: `${fmtMoney(eco.income || 0)} / ${per()}`,
          cls: 'free'
        },
        {
          k: 'Expenses',
          v: `${fmtMoney(-(eco.expenses || 0))} / ${per()}`,
          cls: 'upkeep'
        },
        {
          k: 'Net',
          v: `${fmtMoney(net, { sign: true })} / ${per()}`,
          cls: net >= 0 ? 'free' : 'upkeep'
        },
        {
          k: 'Tax rate',
          v: `${Math.round((tax.residential || 0) * 100)} % res · ${Math.round((tax.commercial || 0) * 100)} % com · ${Math.round((tax.industrial || 0) * 100)} % ind`
        }
      ]
    };
  });

  const popV = h(
    'div.fc-stat-value',
    fmtInt(eco.population)
  );

  const popSubIcon = svg(icon('income'));
  const popSubText = h('span');

  const popSub = h(
    'div.fc-stat-sub',
    popSubIcon,
    popSubText
  );

  const popEl = h(
    'div.fc-stat.pop',
    h('div.fc-stat-icon', svg(icon('people'))),
    h('div.fc-stat-body', popV, popSub)
  );

  tooltip.attach(popEl, () => {
    const unemployed = Math.max(
      0,
      (eco.workers || 0) - (eco.jobs || 0)
    );

    return {
      icon: 'people',
      color: '#8fe0ff',
      title: 'Population',
      desc: `${milestoneName(eco)} — ${fmtInt(eco.households || 0)} households.`,
      rows: [
        {
          k: 'Workers',
          v: fmtInt(eco.workers || 0)
        },
        {
          k: 'Jobs',
          v: fmtInt(eco.jobs || 0)
        },
        {
          k: 'Unemployed',
          v: fmtInt(unemployed),
          cls: unemployed > (eco.workers || 0) * 0.1
            ? 'upkeep'
            : ''
        }
      ]
    };
  });

  const happyV = h(
    'div.fc-stat-value',
    fmtPct(eco.happiness)
  );

  const meterFill = h('i');

  const happyIcon = h(
    'div.fc-stat-icon',
    svg(icon('happiness'))
  );

  const happyEl = h(
    'div.fc-stat.happy',
    happyIcon,
    h(
      'div.fc-stat-body',
      happyV,
      h('div.fc-meter', meterFill)
    )
  );

  tooltip.attach(happyEl, () => ({
    icon: 'happiness',
    color: '#6fe08c',
    title: 'Happiness',
    desc: 'Average citizen well-being. Services, parks, low taxes and short commutes raise it; pollution, crime and unemployment lower it.',
    rows: [
      {
        k: 'City average',
        v: fmtPct(eco.happiness),
        cls: eco.happiness > 0.65
          ? 'free'
          : eco.happiness > 0.4
            ? ''
            : 'upkeep'
      }
    ],
    progress: eco.happiness
  }));

  const bellBadge = h('span.fc-badge');

  const bellBtn = h(
    'button.fc-ibtn.fc-bell',
    {
      'aria-label': 'Notifications',
      onClick: () => hud.toasts.centre.toggle()
    },
    svg(icon('bell')),
    bellBadge
  );

  tooltip.attach(bellBtn, () => ({
    icon: 'bell',
    title: 'Notifications',
    key: 'N',
    desc: hud.toasts.unread
      ? `${hud.toasts.unread} unread. Milestones, budget reports and warnings collect here.`
      : 'Milestones, budget reports and warnings collect here.'
  }));

  hud.toasts.onChange(({ unread }) => {
    setText(
      bellBadge,
      unread > 9 ? '9+' : String(unread)
    );

    setClass(
      bellBtn,
      'has-unread',
      unread > 0
    );
  });

  const saveBtn = h(
    'button.fc-ibtn',
    {
      'aria-label': 'Save City',
      onClick: () => {
        try {
          saveCity(world);
          hud.toasts.show('City saved');
        } catch (err) {
          console.error('[save] failed', err);
          hud.toasts.show('Could not save city');
        }
      }
    },
    '💾'
  );

  tooltip.attach(saveBtn, {
    icon: 'save',
    title: 'Save City',
    desc: 'Save your current city to this browser.'
  });

  const loadBtn = h(
    'button.fc-ibtn',
    {
      'aria-label': 'Load City',
      onClick: () => {
        if (!hasSavedCity()) {
          hud.toasts.show('No saved city');
          return;
        }

        location.reload();
      }
    },
    '📂'
  );

  tooltip.attach(loadBtn, {
    icon: 'folder',
    title: 'Load City',
    desc: 'Reload your saved city.'
  });

  const resetBtn = h(
    'button.fc-ibtn',
    {
      'aria-label': 'New City',
      onClick: () => {
        if (!confirm('Start a new city? Your saved city will be deleted.')) {
          return;
        }

        deleteSavedCity();
        location.reload();
      }
    },
    '🗑'
  );

  tooltip.attach(resetBtn, {
    icon: 'trash',
    title: 'New City',
    desc: 'Delete your saved city and start again.'
  });

  const settingsBtn = h(
    'button.fc-ibtn',
    {
      'aria-label': 'Settings',
      onClick: () => hud.settings.toggle()
    },
    svg(icon('settings'))
  );

  tooltip.attach(settingsBtn, {
    icon: 'settings',
    title: 'Settings',
    key: 'O',
    desc: 'Graphics quality, weather, time of day and interface options.'
  });

  const keysBtn = h(
    'button.fc-ibtn',
    {
      'aria-label': 'Keyboard shortcuts',
      onClick: () => hud.shortcuts.toggle()
    },
    svg(icon('keyboard'))
  );

  tooltip.attach(keysBtn, {
    icon: 'keyboard',
    title: 'Keyboard shortcuts',
    key: '?',
    desc: 'Everything you can do without touching the mouse.'
  });

  const right = h(
    'div.fc-panel.fc-top-right',
    moneyEl,
    h('div.fc-divider'),
    popEl,
    h('div.fc-divider'),
    happyEl,
    h('div.fc-divider'),
    saveBtn,
    loadBtn,
    resetBtn,
    bellBtn,
    settingsBtn,
    keysBtn
  );

  const el = h(
    'div.fc-top',
    left,
    center,
    right
  );

  hud.root.appendChild(el);

  let lastMoney = eco.money;
  let popHistory = [];
  let lastPopSample = 0;
  let lastDateKey = '';
  let lastHappyIcon = '';

  const bump = (v) => {
    v.classList.remove('bump');
    void v.offsetWidth;
    v.classList.add('bump');
  };

  function refreshStats() {
    if (
      document.activeElement !== cityName &&
      eco.cityName &&
      cityName.textContent !== eco.cityName
    ) {
      cityName.textContent = eco.cityName;
    }

    const money = eco.money || 0;

    setText(moneyV, fmtMoney(money));
    setClass(moneyV, 'is-neg', money < 0);

    if (Math.abs(money - lastMoney) > 0.5) {
      bump(moneyV);
      lastMoney = money;
    }

    const net =
      (eco.income || 0) -
      (eco.expenses || 0);

    setText(
      moneySubText,
      `${fmtMoney(net, { sign: true })} / ${per()}`
    );

    setClass(moneySub, 'is-pos', net > 0);
    setClass(moneySub, 'is-neg', net < 0);

    const netIcon =
      net < 0 ? 'expense' : 'income';

    if (moneySubIcon.dataset.ic !== netIcon) {
      moneySubIcon.dataset.ic = netIcon;
      moneySubIcon.innerHTML = icon(netIcon);
    }

    const pop = eco.population || 0;

    setText(popV, fmtInt(pop));
    setText(tierEl, milestoneName(eco));

    const ms = eco.milestone;

    msFill.style.width =
      `${Math.round((ms && ms.next ? ms.progress || 0 : 1) * 100)}%`;

    const now = performance.now();

    const lastPop =
      popHistory.length
        ? popHistory[popHistory.length - 1][1]
        : pop;

    if (
      Math.abs(pop - lastPop) >
      Math.max(50, lastPop * 0.2)
    ) {
      popHistory = [];
    }

    if (
      !popHistory.length ||
      now - lastPopSample > 2000
    ) {
      popHistory.push([now, pop]);
      lastPopSample = now;

      while (
        popHistory.length > 1 &&
        now - popHistory[0][0] > 30000
      ) {
        popHistory.shift();
      }
    }

    const delta =
      popHistory.length
        ? pop - popHistory[0][1]
        : 0;

    if (delta !== 0) {
      setText(
        popSubText,
        `${fmtSigned(delta)} citizens`
      );

      const ic =
        delta > 0 ? 'income' : 'expense';

      if (popSubIcon.dataset.ic !== ic) {
        popSubIcon.dataset.ic = ic;
        popSubIcon.innerHTML = icon(ic);
      }

      popSubIcon.style.display = '';
    } else {
      setText(
        popSubText,
        `${fmtInt(eco.jobs || 0)} jobs`
      );

      popSubIcon.style.display = 'none';
    }

    setClass(popSub, 'is-pos', delta > 0);
    setClass(popSub, 'is-neg', delta < 0);

    const hp = clamp01(
      eco.happiness || 0
    );

    setText(happyV, fmtPct(hp));

    meterFill.style.width =
      `${Math.round(hp * 100)}%`;

    meterFill.style.setProperty(
      '--m',
      hp >= 0.65
        ? '#6fe08c'
        : hp >= 0.4
          ? '#ffc247'
          : '#ff6b6b'
    );

    setClass(
      happyEl,
      'is-low',
      hp < 0.55 && hp >= 0.35
    );

    setClass(
      happyEl,
      'is-bad',
      hp < 0.35
    );

    const hIcon =
      hp < 0.35
        ? 'sad'
        : 'happiness';

    if (hIcon !== lastHappyIcon) {
      lastHappyIcon = hIcon;
      happyIcon.innerHTML =
        `<span class="fc-icon">${icon(hIcon)}</span>`;
    }
  }

  let lastDeg = NaN;

  function refreshTime() {
    const t = world.time;

    const hour =
      ((t.hour % 24) + 24) % 24;

    const c = fmtClock(hour);

    setText(hh, c.slice(0, 2));
    setText(mm, c.slice(3, 5));

    const paused =
      t.paused || t.speed === 0;

    setText(
      clockPhase,
      paused
        ? 'Paused'
        : dayPhase(hour)
    );

    setClass(
      clockEl,
      'is-running',
      !paused
    );

    setClass(
      clockEl,
      'is-paused',
      paused
    );

    const deg =
      Math.round(
        ((hour / 24) * 360 + 180) * 10
      ) / 10;

    if (deg !== lastDeg) {
      lastDeg = deg;

      markerG.setAttribute(
        'transform',
        `rotate(${deg} 22 22)`
      );

      sunG.setAttribute(
        'transform',
        `translate(22 6.5) rotate(${-deg})`
      );

      moonG.setAttribute(
        'transform',
        `translate(22 6.5) rotate(${-deg})`
      );
    }

    const night =
      (
        world.env.nightFactor ??
        (hour < 6 || hour > 19.5 ? 1 : 0)
      ) > 0.5;

    setClass(
      dialWrap,
      'is-night',
      night
    );

    const key =
      `${t.day}-${t.month}-${t.year}`;

    if (key !== lastDateKey) {
      lastDateKey = key;

      const d = fmtDate(t);

      setText(
        dateDay,
        `${t.day} ${d.month.slice(0, 3)} ${t.year}`
      );

      setText(
        dateSub,
        d.weekday
      );
    }

    for (
      let i = 0;
      i < speedBtns.length;
      i++
    ) {
      setClass(
        speedBtns[i],
        'is-on',
        (paused ? 0 : t.speed) === i
      );
    }

    setClass(
      speedEl,
      'is-paused',
      paused
    );
  }

  refreshStats();
  refreshSpeedLabels();
  refreshTime();

  return {
    el,
    refreshStats,
    refreshTime,
    refreshSpeedLabels,
    cityName,
    settingsBtn,
    keysBtn,
    bellBtn,
    speedEl,
    speedBtns,
    saveBtn,
    loadBtn,
    resetBtn
  };
}
