$(document).ready(() => {
  lucide.createIcons();

  const dateEngine = new DateEngine();
  const eventProvider = new EventProvider();

  const $monthViewport = $('#scroll-viewport');
  const $monthTrack = $('#virtual-track');
  const $yearViewport = $('#year-scroll-viewport');
  const $yearTrack = $('#year-virtual-track');
  const $weekdayHeader = $('#weekday-header');
  const $headerBack = $('#btn-back');
  const $headerYear = $('#btn-back span');

  const $overlay = $('#event-modal-overlay');
  const $modal = $('#event-modal');
  const $modalBsDate = $('#modal-bs-date');
  const $modalAdDate = $('#modal-ad-date');
  const $modalEventsList = $('#modal-events-list');
  const $modalClose = $('#modal-close');

  let currentView = 'month';
  let currentVisibleMeta = null;

  const openModal = (globalMonthIndex, day) => {
    const meta = dateEngine.monthMeta[globalMonthIndex];
    const monthName = CalendarDataStore.MONTH_NAMES_BS[meta.monthIndex];
    const adDate = new Date(meta.startAdDate.getTime() + (day - 1) * 86400000);

    const dayName = CalendarDataStore.AD_DAYS[adDate.getUTCDay()];
    const adMonth = CalendarDataStore.AD_MONTHS[adDate.getUTCMonth()];
    const adDay = adDate.getUTCDate();
    const adYear = adDate.getUTCFullYear();

    $modalBsDate.text(`${day} ${monthName} ${meta.year}`);
    $modalAdDate.text(`${dayName}, ${adMonth} ${adDay}, ${adYear}`);

    const events = eventProvider.getEvents(meta.year, meta.monthIndex, day);
    $modalEventsList.empty();

    if (events.length === 0) {
      $modalEventsList.append(`
        <div class="text-iosgray-400 text-sm py-2">
          No events for this day.
        </div>
      `);
    } else {
      events.forEach(evt => {
        const badge = evt.isPublicHoliday
          ? '<span class="text-[11px] font-semibold text-iosred-500 bg-iosred-500/10 px-2 py-0.5 rounded-full shrink-0 border border-iosred-500/20">Holiday</span>'
          : '';

        $modalEventsList.append(`
          <div class="flex items-center justify-between gap-3 bg-white/5 px-3 py-2.5 rounded-xl border border-white/5">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-1.5 h-1.5 rounded-full ${evt.isPublicHoliday ? 'bg-iosred-500' : 'bg-white/70'} shrink-0"></span>
              <span class="text-sm font-medium text-white truncate">${evt.title}</span>
            </div>
            ${badge}
          </div>
        `);
      });
    }

    $overlay.removeClass('hidden');
    requestAnimationFrame(() => {
      $overlay.removeClass('opacity-0');
      $modal.removeClass('scale-95').addClass('scale-100');
    });
  };

  const closeModal = () => {
    $overlay.addClass('opacity-0');
    $modal.removeClass('scale-100').addClass('scale-95');
    setTimeout(() => {
      $overlay.addClass('hidden');
    }, 200);
  };

  $modalClose.on('click', closeModal);
  $overlay.on('click', (e) => {
    if (e.target === $overlay[0]) closeModal();
  });

  const $searchOverlay = $('#search-modal-overlay');
  const $searchModal = $('#search-modal');
  const $searchInput = $('#search-input');
  const $searchResults = $('#search-results');
  const $searchClose = $('#search-modal-close');

  const openSearchModal = () => {
    renderSearchResults('');
    $searchOverlay.removeClass('hidden');
    requestAnimationFrame(() => {
      $searchOverlay.removeClass('opacity-0');
      $searchModal.removeClass('scale-95').addClass('scale-100');
      $searchInput.trigger('focus');
    });
  };

  const closeSearchModal = () => {
    $searchOverlay.addClass('opacity-0');
    $searchModal.removeClass('scale-100').addClass('scale-95');
    setTimeout(() => {
      $searchOverlay.addClass('hidden');
      $searchInput.val('');
    }, 200);
  };

  const renderSearchResults = query => {
    const currentYear = dateEngine.adToBs(new Date()).bsYear;
    const years = [currentYear, currentYear + 1];
    const q = query.trim().toLowerCase();

    $searchResults.empty();

    const matches = [];
    if (q) {
      Object.keys(window.BSEvents).forEach(key => {
        const [year, month, day] = key.split('-').map(Number);
        if (!years.includes(year)) return;
        window.BSEvents[key].forEach(evt => {
          if (evt.title.toLowerCase().includes(q)) {
            matches.push({ year, monthIndex: month - 1, day, evt });
          }
        });
      });
      matches.sort((a, b) =>
        a.year - b.year || a.monthIndex - b.monthIndex || a.day - b.day
      );
    }

    if (!q) {
      $searchResults.append(`
        <div class="text-iosgray-400 text-sm py-2">
          Search events by name for ${years[0]} and ${years[1]}.
        </div>
      `);
    } else if (matches.length === 0) {
      $searchResults.append(`
        <div class="text-iosgray-400 text-sm py-2">
          No events found.
        </div>
      `);
    } else {
      matches.forEach(({ year, monthIndex, day, evt }) => {
        const monthName = CalendarDataStore.MONTH_NAMES_BS[monthIndex];
        const badge = evt.isPublicHoliday
          ? '<span class="text-[11px] font-semibold text-iosred-500 bg-iosred-500/10 px-2 py-0.5 rounded-full shrink-0 border border-iosred-500/20">Holiday</span>'
          : '';

        $searchResults.append(`
          <div class="flex items-center justify-between gap-3 bg-white/5 px-3 py-2.5 rounded-xl border border-white/5">
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-sm font-medium text-white truncate">${evt.title}</span>
              <span class="text-xs text-iosgray-400">${day} ${monthName} ${year}</span>
            </div>
            ${badge}
          </div>
        `);
      });
    }
  };

  $('#btn-search').on('click', openSearchModal);
  $searchClose.on('click', closeSearchModal);
  $searchOverlay.on('click', (e) => {
    if (e.target === $searchOverlay[0]) closeSearchModal();
  });
  $searchInput.on('input', e => {
    renderSearchResults(e.target.value);
  });

  const $convOverlay = $('#converter-modal-overlay');
  const $convModal = $('#converter-modal');
  const $convClose = $('#converter-modal-close');
  const $btnConverter = $('#btn-converter');

  const $upcomingOverlay = $('#upcoming-modal-overlay');
  const $upcomingModal = $('#upcoming-modal');
  const $upcomingClose = $('#upcoming-modal-close');
  const $btnUpcoming = $('#btn-upcoming');

  const upcomingEngine = new UpcomingEventsEngine(
    $('#upcoming-scroll-viewport'),
    $('#upcoming-virtual-track'),
    dateEngine,
    eventProvider
  );

  const openUpcomingModal = () => {
    $upcomingOverlay.removeClass('hidden');
    requestAnimationFrame(() => {
      $upcomingOverlay.removeClass('opacity-0');
      $upcomingModal.removeClass('scale-95').addClass('scale-100');
      upcomingEngine.reset();
    });
  };

  const closeUpcomingModal = () => {
    $upcomingOverlay.addClass('opacity-0');
    $upcomingModal.removeClass('scale-100').addClass('scale-95');
    setTimeout(() => {
      $upcomingOverlay.addClass('hidden');
    }, 200);
  };

  $btnUpcoming.on('click', openUpcomingModal);
  $upcomingClose.on('click', closeUpcomingModal);
  $upcomingOverlay.on('click', (e) => {
    if (e.target === $upcomingOverlay[0]) closeUpcomingModal();
  });

  const $bsYear = $('#conv-bs-year');
  const $bsMonth = $('#conv-bs-month');
  const $bsDay = $('#conv-bs-day');

  const $adYear = $('#conv-ad-year');
  const $adMonth = $('#conv-ad-month');
  const $adDay = $('#conv-ad-day');

  for (let y = dateEngine.startYear; y <= dateEngine.endYear; y++) {
    $bsYear.append(`<option value="${y}">${y}</option>`);
  }
  CalendarDataStore.MONTH_NAMES_BS.forEach((m, idx) => {
    $bsMonth.append(`<option value="${idx}">${m}</option>`);
  });

  for (let y = 1935; y <= 2044; y++) {
    $adYear.append(`<option value="${y}">${y}</option>`);
  }
  CalendarDataStore.AD_MONTHS.forEach((m, idx) => {
    $adMonth.append(`<option value="${idx}">${m}</option>`);
  });

  const populateDays = ($select, maxDays, selectedVal) => {
    $select.empty();
    for (let d = 1; d <= maxDays; d++) {
      $select.append(`<option value="${d}">${d}</option>`);
    }
    const val = Math.min(selectedVal || 1, maxDays);
    $select.val(val);
    return val;
  };

  let isSyncing = false;

  const syncBsToAd = () => {
    if (isSyncing) return;
    isSyncing = true;
    const by = parseInt($bsYear.val(), 10);
    const bm = parseInt($bsMonth.val(), 10);
    const maxBsDays = dateEngine.miti[by] ? dateEngine.miti[by][bm] : 30;
    let bd = parseInt($bsDay.val(), 10) || 1;
    bd = populateDays($bsDay, maxBsDays, bd);

    const adDate = dateEngine.bsToAd(by, bm, bd);
    if (adDate) {
      const ay = adDate.getUTCFullYear();
      const am = adDate.getUTCMonth();
      const ad = adDate.getUTCDate();
      const maxAdDays = new Date(Date.UTC(ay, am + 1, 0)).getUTCDate();

      $adYear.val(ay);
      $adMonth.val(am);
      populateDays($adDay, maxAdDays, ad);
    }
    isSyncing = false;
  };

  const syncAdToBs = () => {
    if (isSyncing) return;
    isSyncing = true;
    const ay = parseInt($adYear.val(), 10);
    const am = parseInt($adMonth.val(), 10);
    const maxAdDays = new Date(Date.UTC(ay, am + 1, 0)).getUTCDate();
    let ad = parseInt($adDay.val(), 10) || 1;
    ad = populateDays($adDay, maxAdDays, ad);

    const bs = dateEngine.adToBs(new Date(Date.UTC(ay, am, ad)));
    if (bs) {
      const maxBsDays = dateEngine.miti[bs.bsYear] ? dateEngine.miti[bs.bsYear][bs.bsMonthIndex] : 30;
      $bsYear.val(bs.bsYear);
      $bsMonth.val(bs.bsMonthIndex);
      populateDays($bsDay, maxBsDays, bs.bsDay);
    }
    isSyncing = false;
  };

  $bsYear.on('change', syncBsToAd);
  $bsMonth.on('change', syncBsToAd);
  $bsDay.on('change', syncBsToAd);

  $adYear.on('change', syncAdToBs);
  $adMonth.on('change', syncAdToBs);
  $adDay.on('change', syncAdToBs);

  const openConverterModal = () => {
    const curToday = dateEngine.adToBs(new Date());
    $bsYear.val(curToday.bsYear);
    $bsMonth.val(curToday.bsMonthIndex);
    populateDays($bsDay, dateEngine.miti[curToday.bsYear] ? dateEngine.miti[curToday.bsYear][curToday.bsMonthIndex] : 30, curToday.bsDay);
    syncBsToAd();

    $convOverlay.removeClass('hidden');
    requestAnimationFrame(() => {
      $convOverlay.removeClass('opacity-0');
      $convModal.removeClass('scale-95').addClass('scale-100');
    });
  };

  const closeConverterModal = () => {
    $convOverlay.addClass('opacity-0');
    $convModal.removeClass('scale-100').addClass('scale-95');
    setTimeout(() => {
      $convOverlay.addClass('hidden');
    }, 200);
  };

  $btnConverter.on('click', openConverterModal);
  $convClose.on('click', closeConverterModal);
  $convOverlay.on('click', (e) => {
    if (e.target === $convOverlay[0]) closeConverterModal();
  });

  const updateHeader = meta => {
    currentVisibleMeta = meta;
    if (currentView === 'month') {
      $headerYear.html(`${meta.year}`);
      $headerBack.removeClass('opacity-0 pointer-events-none');
    }
  };

  const today = dateEngine.adToBs(new Date());

  const monthScrollEngine = new VirtualScrollEngine(
    $monthViewport,
    $monthTrack,
    dateEngine,
    eventProvider,
    updateHeader,
    openModal,
    today.globalMonthIndex
  );

  const switchToMonthView = globalMonthIndex => {
    currentView = 'month';
    $yearViewport.addClass('hidden');
    $monthViewport.removeClass('hidden');
    $weekdayHeader.removeClass('hidden');
    $headerBack.removeClass('opacity-0 pointer-events-none');
    monthScrollEngine.scrollToMonth(globalMonthIndex);
  };

  const switchToYearView = year => {
    currentView = 'year';
    $weekdayHeader.addClass('hidden');
    $monthViewport.addClass('hidden');
    $yearViewport.removeClass('hidden');
    $headerBack.addClass('opacity-0 pointer-events-none');
    const yearIndex = year - dateEngine.startYear;
    yearScrollEngine.scrollToYear(yearIndex);
  };

  const yearScrollEngine = new YearVirtualScrollEngine(
    $yearViewport,
    $yearTrack,
    dateEngine,
    eventProvider,
    globalMonthIndex => {
      switchToMonthView(globalMonthIndex);
    }
  );

  $headerBack.on('click', () => {
    if (currentView === 'month' && currentVisibleMeta) {
      switchToYearView(currentVisibleMeta.year);
    }
  });

  $('#btn-today').on('click', () => {
    const curToday = dateEngine.adToBs(new Date());
    if (currentView === 'month') {
      monthScrollEngine.scrollToMonth(curToday.globalMonthIndex);
    } else {
      switchToMonthView(curToday.globalMonthIndex);
    }
  });
});
