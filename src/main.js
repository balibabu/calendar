import './style.css';
import { DateEngine, todayAdTime } from './core/date-engine.js';
import { MonthScrollEngine } from './core/month-scroll-engine.js';
import { YearScrollEngine } from './core/year-scroll-engine.js';
import { UpcomingEventsEngine } from './core/upcoming-events.js';
import { EventProvider, MONTH_NAMES_BS, AD_MONTHS, AD_DAYS, searchEvents } from './data/calendar-constants.js';
import { MITI } from './data/miti.js';

const $ = (id) => document.getElementById(id);

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
  <div class="flex items-center justify-between gap-3 bg-white/5 px-3 py-2.5 rounded-xl border border-white/5">
    <div class="flex items-center gap-2.5 min-w-0">
      <span class="w-1.5 h-1.5 rounded-full ${isPublicHoliday ? 'bg-iosred-500' : 'bg-white/70'} shrink-0"></span>
      <span class="text-sm font-medium text-white truncate">${title}</span>
    </div>
    ${isPublicHoliday ? holidayBadge : ''}
  </div>
`;

const overlay = $('event-modal-overlay');
const modal = $('event-modal');
const modalBsDate = $('modal-bs-date');
const modalAdDate = $('modal-ad-date');
const modalEventsList = $('modal-events-list');

const openEventModal = (globalMonthIndex, day) => {
  const meta = dateEngine.monthMeta[globalMonthIndex];
  const monthName = MONTH_NAMES_BS[meta.monthIndex];
  const adTime = meta.startAdTime + (day - 1) * 86400000;
  const adDate = new Date(adTime);

  const dayName = AD_DAYS[adDate.getUTCDay()];
  const adMonth = AD_MONTHS[adDate.getUTCMonth()];

  modalBsDate.textContent = `${day} ${monthName} ${meta.year}`;
  modalAdDate.textContent = `${dayName}, ${adMonth} ${adDate.getUTCDate()}, ${adDate.getUTCFullYear()}`;

  const events = eventProvider.getEvents(meta.year, meta.monthIndex, day);

  if (events.length === 0) {
    modalEventsList.innerHTML = '<div class="text-iosgray-400 text-sm py-2">No events for this day.</div>';
  } else {
    modalEventsList.innerHTML = events
      .map((evt) => eventRowHtml(evt.title, evt.isPublicHoliday))
      .join('');
  }

  showModal(overlay, modal);
};

$('modal-close').addEventListener('click', () => hideModal(overlay, modal));
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) hideModal(overlay, modal);
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
          <span class="text-sm font-medium text-white truncate">${evt.title}</span>
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
