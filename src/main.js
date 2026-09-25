import './style.css';
import { DateEngine, todayAdTime } from './core/date-engine.js';
import { MonthScrollEngine } from './core/month-scroll-engine.js';
import { YearScrollEngine } from './core/year-scroll-engine.js';
import { UpcomingEventsEngine } from './core/upcoming-events.js';
import { EventProvider, MONTH_NAMES_BS, AD_MONTHS, AD_DAYS, searchEvents } from './data/calendar-constants.js';
import { EventStore } from './core/event-store.js';
import { EventLoader } from './core/event-loader.js';
import { MITI } from './data/miti.js';

const $ = (id) => document.getElementById(id);

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const dateEngine = new DateEngine();
const eventProvider = new EventProvider();

const monthViewport = $('scroll-viewport');
const monthTrack = $('virtual-track');
const yearViewport = $('year-scroll-viewport');
const yearTrack = $('year-virtual-track');
const weekdayHeader = $('weekday-header');
const headerBack = $('btn-back');
const headerYear = headerBack.querySelector('span');

let currentView = 'month';
let currentVisibleMeta = null;

const showModal = (overlay, modal) => {
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => {
    overlay.classList.remove('opacity-0');
    modal.classList.remove('scale-95');
    modal.classList.add('scale-100');
  });
};

const hideModal = (overlay, modal) => {
  overlay.classList.add('opacity-0');
  modal.classList.remove('scale-100');
  modal.classList.add('scale-95');
  setTimeout(() => overlay.classList.add('hidden'), 200);
};

const holidayBadge = '<span class="text-[11px] font-semibold text-iosred-500 bg-iosred-500/10 px-2 py-0.5 rounded-full shrink-0 border border-iosred-500/20">Holiday</span>';

const eventRowHtml = (title, isPublicHoliday) => `
  <div class="flex items-center justify-between gap-3 bg-white/5 px-3 py-2.5 rounded-xl border border-white/5 select-text">
    <div class="flex items-center gap-2.5 min-w-0">
      <span class="w-1.5 h-1.5 rounded-full ${isPublicHoliday ? 'bg-iosred-500' : 'bg-white/70'} shrink-0"></span>
      <span class="text-sm font-medium text-white break-words min-w-0">${title}</span>
    </div>
    ${isPublicHoliday ? holidayBadge : ''}
  </div>
`;

const escapeHtml = (text) =>
  text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const userEventRowHtml = (title, id) => `
  <div data-user-event-id="${id}" class="flex items-center gap-2.5 bg-white/5 px-3 py-2.5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all select-text">
    <span class="w-1.5 h-1.5 rounded-full bg-iosblue-500 shrink-0"></span>
    <span class="text-sm font-medium text-white break-words min-w-0">${escapeHtml(title)}</span>
  </div>
`;

const addEventRowHtml = `
  <button id="modal-add-trigger" class="flex items-center gap-2.5 bg-white/5 border border-dashed border-white/15 px-3 py-2.5 rounded-xl hover:bg-white/10 hover:border-white/25 active:scale-[0.98] transition-all cursor-pointer w-full">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-iosgray-400 shrink-0"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
    <span class="text-sm font-medium text-iosgray-400">Add event</span>
  </button>
`;

const addEventInputHtml = `
  <div class="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-iosred-500/50 transition-colors">
    <input id="modal-add-input" type="text" autocomplete="off" placeholder="Event name" maxlength="60" class="w-full bg-transparent text-sm text-white placeholder-iosgray-400 outline-none" />
    <button id="modal-add-confirm" class="w-7 h-7 rounded-full bg-iosred-500 hover:bg-iosred-600 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    </button>
  </div>
`;

const overlay = $('event-modal-overlay');
const modal = $('event-modal');
const modalBsDate = $('modal-bs-date');
const modalAdDate = $('modal-ad-date');
const modalEventsList = $('modal-events-list');

let modalContext = null;
let isAddingEvent = false;

const openEventModal = (globalMonthIndex, day) => {
  const meta = dateEngine.monthMeta[globalMonthIndex];
  const monthName = MONTH_NAMES_BS[meta.monthIndex];
  const adTime = meta.startAdTime + (day - 1) * 86400000;
  const adDate = new Date(adTime);

  const dayName = AD_DAYS[adDate.getUTCDay()];
  const adMonth = AD_MONTHS[adDate.getUTCMonth()];

  modalBsDate.textContent = `${day} ${monthName} ${meta.year}`;
  modalAdDate.textContent = `${dayName}, ${adMonth} ${adDate.getUTCDate()}, ${adDate.getUTCFullYear()}`;

  modalContext = { globalMonthIndex, day };
  isAddingEvent = false;
  renderModalEvents();

  showModal(overlay, modal);
};

const renderModalEvents = () => {
  const meta = dateEngine.monthMeta[modalContext.globalMonthIndex];
  const events = eventProvider.getEvents(meta.year, meta.monthIndex, modalContext.day);

  let html = '';
  if (events.length === 0) {
    html += '<div class="text-iosgray-400 text-sm py-2">No events for this day.</div>';
  }
  html += events.filter((evt) => !evt.isUser).map((evt) => eventRowHtml(evt.title, evt.isPublicHoliday)).join('');
  html += events.filter((evt) => evt.isUser).map((evt) => userEventRowHtml(evt.title, evt.id)).join('');
  html += isAddingEvent ? addEventInputHtml : addEventRowHtml;
  modalEventsList.innerHTML = html;

  if (isAddingEvent) {
    const input = $('modal-add-input');
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmAddEvent();
      if (e.key === 'Escape') cancelAddEvent();
    });
    $('modal-add-confirm').addEventListener('click', confirmAddEvent);
  } else {
    $('modal-add-trigger').addEventListener('click', startAddEvent);
  }
};

const startAddEvent = () => {
  isAddingEvent = true;
  renderModalEvents();
};

const cancelAddEvent = () => {
  isAddingEvent = false;
  renderModalEvents();
};

const confirmAddEvent = () => {
  const input = $('modal-add-input');
  const title = input.value.trim();
  if (!title) {
    input.focus();
    return;
  }
  const meta = dateEngine.monthMeta[modalContext.globalMonthIndex];
  EventStore.addUserEvent(meta.year, meta.monthIndex, modalContext.day, title);
  isAddingEvent = false;
  renderModalEvents();
};

const confirmOverlay = $('confirm-modal-overlay');
const confirmModal = $('confirm-modal');
const confirmMessage = $('confirm-message');
let pendingDeleteId = null;

const hideConfirmModal = () => hideModal(confirmOverlay, confirmModal);

$('confirm-accept').addEventListener('click', () => {
  if (!modalContext || !pendingDeleteId) return;
  const meta = dateEngine.monthMeta[modalContext.globalMonthIndex];
  EventStore.removeUserEvent(meta.year, meta.monthIndex, modalContext.day, pendingDeleteId);
  pendingDeleteId = null;
  hideConfirmModal();
  renderModalEvents();
});

$('confirm-cancel').addEventListener('click', hideConfirmModal);
confirmOverlay.addEventListener('click', (e) => {
  if (e.target === confirmOverlay) hideConfirmModal();
});

modalEventsList.addEventListener('click', (e) => {
  const row = e.target.closest('[data-user-event-id]');
  if (!row || !modalContext) return;
  const meta = dateEngine.monthMeta[modalContext.globalMonthIndex];
  const evt = eventProvider.getEvents(meta.year, meta.monthIndex, modalContext.day).find((ev) => ev.id === row.dataset.userEventId);
  if (!evt) return;
  pendingDeleteId = evt.id;
  confirmMessage.textContent = `Delete "${evt.title}"?`;
  showModal(confirmOverlay, confirmModal);
});

const ALERT_DISMISSED_KEY = 'calendar-alert-dismissed';
let alertArmed = false;

const todayAlertDayKey = (nowBs) => `${nowBs.bsYear}-${nowBs.bsMonthIndex}-${nowBs.bsDay}`;

const closeEventModal = () => {
  hideModal(overlay, modal);
  if (alertArmed) {
    alertArmed = false;
    localStorage.setItem(ALERT_DISMISSED_KEY, todayAlertDayKey(dateEngine.adToBs(todayAdTime())));
  }
};

$('modal-close').addEventListener('click', closeEventModal);
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeEventModal();
});

const searchOverlay = $('search-modal-overlay');
const searchModal = $('search-modal');
const searchInput = $('search-input');
const searchResults = $('search-results');

const renderSearchResults = (query) => {
  const currentYear = dateEngine.adToBs(todayAdTime()).bsYear;
  const years = [currentYear, currentYear + 1];

  if (!query.trim()) {
    searchResults.innerHTML = `<div class="text-iosgray-400 text-sm py-2">Search events by name for ${years[0]} and ${years[1]}.</div>`;
    return;
  }

  const matches = searchEvents(years, query);
  if (matches.length === 0) {
    searchResults.innerHTML = '<div class="text-iosgray-400 text-sm py-2">No events found.</div>';
    return;
  }

  searchResults.innerHTML = matches
    .map(({ year, monthIndex, day, evt }) => `
      <div class="flex items-center justify-between gap-3 bg-white/5 px-3 py-2.5 rounded-xl border border-white/5">
        <div class="flex flex-col gap-0.5 min-w-0">
          <span class="text-sm font-medium text-white truncate">${evt.isUser ? escapeHtml(evt.title) : evt.title}</span>
          <span class="text-xs text-iosgray-400">${day} ${MONTH_NAMES_BS[monthIndex]} ${year}</span>
        </div>
        ${evt.isPublicHoliday ? holidayBadge : ''}
      </div>
    `)
    .join('');
};

const openSearchModal = () => {
  renderSearchResults('');
  showModal(searchOverlay, searchModal);
  searchInput.focus();
};

const closeSearchModal = () => {
  hideModal(searchOverlay, searchModal);
  setTimeout(() => (searchInput.value = ''), 200);
};

$('btn-search').addEventListener('click', openSearchModal);
$('search-modal-close').addEventListener('click', closeSearchModal);
searchOverlay.addEventListener('click', (e) => {
  if (e.target === searchOverlay) closeSearchModal();
});
searchInput.addEventListener('input', (e) => renderSearchResults(e.target.value));

const upcomingOverlay = $('upcoming-modal-overlay');
const upcomingModal = $('upcoming-modal');

const upcomingEngine = new UpcomingEventsEngine(
  $('upcoming-scroll-viewport'),
  $('upcoming-virtual-track'),
  dateEngine,
  eventProvider
);

const openUpcomingModal = () => {
  showModal(upcomingOverlay, upcomingModal);
  upcomingEngine.reset();
};

const closeUpcomingModal = () => hideModal(upcomingOverlay, upcomingModal);

$('btn-upcoming').addEventListener('click', openUpcomingModal);
$('upcoming-modal-close').addEventListener('click', closeUpcomingModal);
upcomingOverlay.addEventListener('click', (e) => {
  if (e.target === upcomingOverlay) closeUpcomingModal();
});

const maybeShowTodayAlert = () => {
  const nowBs = dateEngine.adToBs(todayAdTime());
  if (localStorage.getItem(ALERT_DISMISSED_KEY) === todayAlertDayKey(nowBs)) return;
  if (eventProvider.getEvents(nowBs.bsYear, nowBs.bsMonthIndex, nowBs.bsDay).length === 0) return;
  alertArmed = true;
  openEventModal(nowBs.globalMonthIndex, nowBs.bsDay);
};

const convOverlay = $('converter-modal-overlay');
const convModal = $('converter-modal');

const bsYear = $('conv-bs-year');
const bsMonth = $('conv-bs-month');
const bsDay = $('conv-bs-day');
const adYear = $('conv-ad-year');
const adMonth = $('conv-ad-month');
const adDay = $('conv-ad-day');

const fillSelect = (select, start, end, format) => {
  let html = '';
  for (let v = start; v <= end; v++) {
    html += `<option value="${v}">${format(v)}</option>`;
  }
  select.innerHTML = html;
};

fillSelect(bsYear, dateEngine.startYear, dateEngine.endYear, (v) => v);
fillSelect(bsMonth, 0, 11, (v) => MONTH_NAMES_BS[v]);
fillSelect(adYear, 1935, 2044, (v) => v);
fillSelect(adMonth, 0, 11, (v) => AD_MONTHS[v]);

const populateDays = (select, maxDays, selectedVal) => {
  let html = '';
  for (let d = 1; d <= maxDays; d++) {
    html += `<option value="${d}">${d}</option>`;
  }
  select.innerHTML = html;
  const val = Math.min(selectedVal || 1, maxDays);
  select.value = val;
  return val;
};

let isSyncing = false;

const maxBsDays = (year, monthIndex) => {
  const yearData = MITI[year];
  return yearData ? yearData[monthIndex] : 30;
};

const syncBsToAd = () => {
  if (isSyncing) return;
  isSyncing = true;
  const by = parseInt(bsYear.value, 10);
  const bm = parseInt(bsMonth.value, 10);
  let bd = parseInt(bsDay.value, 10) || 1;
  bd = populateDays(bsDay, maxBsDays(by, bm), bd);

  const adTime = dateEngine.bsToAd(by, bm, bd);
  if (adTime !== null) {
    const adDate = new Date(adTime);
    const ay = adDate.getUTCFullYear();
    const am = adDate.getUTCMonth();
    const maxAdDays = new Date(Date.UTC(ay, am + 1, 0)).getUTCDate();

    adYear.value = ay;
    adMonth.value = am;
    populateDays(adDay, maxAdDays, adDate.getUTCDate());
  }
  isSyncing = false;
};

const syncAdToBs = () => {
  if (isSyncing) return;
  isSyncing = true;
  const ay = parseInt(adYear.value, 10);
  const am = parseInt(adMonth.value, 10);
  const maxAdDays = new Date(Date.UTC(ay, am + 1, 0)).getUTCDate();
  const ad = populateDays(adDay, maxAdDays, parseInt(adDay.value, 10) || 1);

  const bs = dateEngine.adToBs(Date.UTC(ay, am, ad));
  if (bs) {
    bsYear.value = bs.bsYear;
    bsMonth.value = bs.bsMonthIndex;
    populateDays(bsDay, maxBsDays(bs.bsYear, bs.bsMonthIndex), bs.bsDay);
  }
  isSyncing = false;
};

[bsYear, bsMonth, bsDay].forEach((el) => el.addEventListener('change', syncBsToAd));
[adYear, adMonth, adDay].forEach((el) => el.addEventListener('change', syncAdToBs));

const openConverterModal = () => {
  const curToday = dateEngine.adToBs(todayAdTime());
  bsYear.value = curToday.bsYear;
  bsMonth.value = curToday.bsMonthIndex;
  populateDays(bsDay, maxBsDays(curToday.bsYear, curToday.bsMonthIndex), curToday.bsDay);
  syncBsToAd();
  showModal(convOverlay, convModal);
};

const closeConverterModal = () => hideModal(convOverlay, convModal);

$('btn-converter').addEventListener('click', openConverterModal);
$('converter-modal-close').addEventListener('click', closeConverterModal);
convOverlay.addEventListener('click', (e) => {
  if (e.target === convOverlay) closeConverterModal();
});

const updateHeader = (meta) => {
  currentVisibleMeta = meta;
  if (currentView === 'month') {
    headerYear.textContent = `${meta.year}`;
    headerBack.classList.remove('opacity-0', 'pointer-events-none');
  }
};

const today = dateEngine.adToBs(todayAdTime());
const monthScrollEngine = new MonthScrollEngine(
  monthViewport,
  monthTrack,
  dateEngine,
  eventProvider,
  updateHeader,
  openEventModal,
  today.globalMonthIndex
);

const switchToMonthView = (globalMonthIndex) => {
  currentView = 'month';
  yearViewport.classList.add('hidden');
  monthViewport.classList.remove('hidden');
  weekdayHeader.classList.remove('hidden');
  headerBack.classList.remove('opacity-0', 'pointer-events-none');
  monthScrollEngine.scrollToMonth(globalMonthIndex);
};

const yearScrollEngine = new YearScrollEngine(
  yearViewport,
  yearTrack,
  dateEngine,
  eventProvider,
  switchToMonthView
);

const switchToYearView = (year) => {
  currentView = 'year';
  weekdayHeader.classList.add('hidden');
  monthViewport.classList.add('hidden');
  yearViewport.classList.remove('hidden');
  headerBack.classList.add('opacity-0', 'pointer-events-none');
  yearScrollEngine.scrollToYear(year - dateEngine.startYear);
};

headerBack.addEventListener('click', () => {
  if (currentView === 'month' && currentVisibleMeta) {
    switchToYearView(currentVisibleMeta.year);
  }
});

$('btn-today').addEventListener('click', () => {
  const curToday = dateEngine.adToBs(todayAdTime());
  if (currentView === 'month') {
    monthScrollEngine.scrollToMonth(curToday.globalMonthIndex);
  } else {
    switchToMonthView(curToday.globalMonthIndex);
  }
});

EventStore.subscribe(() => {
  monthScrollEngine.refresh();
  if (!upcomingOverlay.classList.contains('hidden')) {
    upcomingEngine.refresh();
  }
});

let lastSeenDayKey = `${today.bsYear}-${today.bsMonthIndex}-${today.bsDay}`;

const handleDayRollover = () => {
  const nowBs = dateEngine.adToBs(todayAdTime());
  const nowKey = `${nowBs.bsYear}-${nowBs.bsMonthIndex}-${nowBs.bsDay}`;
  if (nowKey === lastSeenDayKey) {
    return;
  }
  lastSeenDayKey = nowKey;

  monthScrollEngine.refresh();
  yearScrollEngine.refresh();
  if (!upcomingOverlay.classList.contains('hidden')) {
    upcomingEngine.refresh();
  }
};

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) handleDayRollover();
});

window.addEventListener('focus', handleDayRollover);

const scheduleMidnightTimer = () => {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  setTimeout(() => {
    handleDayRollover();
    scheduleMidnightTimer();
  }, nextMidnight - now);
};

scheduleMidnightTimer();

requestAnimationFrame(() => requestAnimationFrame(() => EventLoader.start(today.bsYear).then(maybeShowTodayAlert)));
