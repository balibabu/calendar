class VirtualScrollEngine {
  constructor($viewport, $track, dateEngine, eventProvider, onHeaderUpdate, onDaySelect, initialMonthIndex) {
    this.$viewport = $viewport;
    this.$track = $track;
    this.dateEngine = dateEngine;
    this.eventProvider = eventProvider;
    this.onHeaderUpdate = onHeaderUpdate;
    this.onDaySelect = onDaySelect;

    this.POOL_SIZE = 6;
    this.MONTH_HEADER_HEIGHT = 44;
    this.MONTH_HEADER_PADDING_Y = 16;
    this.CELL_HEIGHT = 44;
    this.MONTH_MARGIN_TOP = 20;

    this.monthPositions = [];
    this.poolNodes = [];
    this.isTicking = false;

    this._calculateLayoutPositions();
    this._createDOMPool();
    this._bindDayClick();

    if (initialMonthIndex !== undefined) {
      this.$viewport[0].scrollTop = this.monthPositions[initialMonthIndex]?.top || 0;
    }

    this._bindScrollEvent();
    this.render();
  }

  _calculateLayoutPositions() {
    let currentY = this.MONTH_MARGIN_TOP;
    const { monthMeta } = this.dateEngine;
    this.monthPositions = new Array(monthMeta.length);

    for (let i = 0; i < monthMeta.length; i++) {
      const gridHeight = monthMeta[i].numRows * this.CELL_HEIGHT;
      const height = this.MONTH_HEADER_HEIGHT + this.MONTH_HEADER_PADDING_Y * 2 + gridHeight;

      this.monthPositions[i] = {
        top: currentY,
        height,
        bottom: currentY + height
      };

      currentY += height + this.MONTH_MARGIN_TOP;
    }

    this.$track.css('height', `${currentY}px`);
  }

  _createDOMPool() {
    this.$track.empty();
    this.poolNodes = [];

    for (let i = 0; i < this.POOL_SIZE; i++) {
      const $card = $(`
        <div class="month-card-node absolute left-0 right-0 mx-auto w-full max-w-full bg-black overflow-hidden px-4">
          <div class="month-card-header flex items-center justify-start py-4 h-[44px]">
            <span class="bs-title font-medium text-[28px] text-white"></span>
          </div>
          <div class="days-grid grid grid-cols-7 gap-0"></div>
        </div>
      `);

      this.$track.append($card);
      this.poolNodes.push({
        $el: $card,
        assignedGlobalIndex: -1
      });
    }
  }

  _bindDayClick() {
    this.$track.on('click', '.day-cell', (e) => {
      const $target = $(e.currentTarget);
      const monthIndex = parseInt($target.data('month-index'), 10);
      const day = parseInt($target.data('day'), 10);
      if (!isNaN(monthIndex) && !isNaN(day) && this.onDaySelect) {
        this.onDaySelect(monthIndex, day);
      }
    });
  }

  _bindScrollEvent() {
    this.$viewport.on('scroll', () => {
      if (this.isTicking) return;
      this.isTicking = true;
      requestAnimationFrame(() => {
        this.render();
        this.isTicking = false;
      });
    });
  }

  render() {
    const scrollTop = this.$viewport.scrollTop();
    let low = 0;
    let high = this.monthPositions.length - 1;
    let topVisibleIndex = 0;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (this.monthPositions[mid].bottom >= scrollTop) {
        topVisibleIndex = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    const startIndex = Math.max(0, topVisibleIndex - 1);
    const endIndex = Math.min(this.monthPositions.length - 1, startIndex + this.POOL_SIZE - 1);

    this.onHeaderUpdate(this.dateEngine.monthMeta[topVisibleIndex]);

    for (let i = startIndex; i <= endIndex; i++) {
      const node = this.poolNodes[i % this.POOL_SIZE];

      if (node.assignedGlobalIndex !== i) {
        this._populateMonthCard(node.$el, i);
        node.assignedGlobalIndex = i;
      }

      node.$el.css('transform', `translate3d(0, ${this.monthPositions[i].top}px, 0)`);
    }
  }

  _populateMonthCard($card, globalMonthIndex) {
    const meta = this.dateEngine.monthMeta[globalMonthIndex];
    const monthName = CalendarDataStore.MONTH_NAMES_BS[meta.monthIndex];

    $card.find('.bs-title').text(monthName);

    const $grid = $card.find('.days-grid');
    $grid.empty();

    for (let i = 0; i < meta.startDayOfWeek; i++) {
      $grid.append('<div class="h-11"></div>');
    }

    const today = this.dateEngine.adToBs(new Date());

    for (let day = 1; day <= meta.totalDays; day++) {
      const currentAdDate = new Date(meta.startAdDate.getTime() + (day - 1) * 86400000);
      const { isHoliday } = this.eventProvider.getDayMetaData(currentAdDate);
      const events = this.eventProvider.getEvents(meta.year, meta.monthIndex, day);
      const hasEvents = events.some(evt => evt.isPublicHoliday);

      const isToday =
        meta.year === today.bsYear &&
        meta.monthIndex === today.bsMonthIndex &&
        day === today.bsDay;

      let numberClass = 'text-white';
      if (isToday) {
        numberClass = 'text-white font-medium';
      } else if (isHoliday) {
        numberClass = 'text-iosred-600 font-medium';
      }

      const circle = isToday
        ? '<div class="absolute inset-0 m-auto aspect-square h-[30px] rounded-full bg-iosred-500 z-0"></div>'
        : '';

      const eventDot = hasEvents
        ? `<div class="absolute bottom-1 w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-iosred-500'}"></div>`
        : '';

      $grid.append(`
        <div class="day-cell relative h-11 flex flex-col items-center justify-center select-none cursor-pointer rounded-full active:bg-iosgray-800/40" data-month-index="${globalMonthIndex}" data-day="${day}">
          ${circle}
          <span class="text-[17px] z-10 leading-none ${numberClass}">${day}</span>
          ${eventDot}
        </div>
      `);
    }
  }

  scrollToMonth(globalMonthIndex) {
    const position = this.monthPositions[globalMonthIndex];
    if (!position) return;
    this.$viewport[0].scrollTop = position.top;
    this.render();
  }
}
