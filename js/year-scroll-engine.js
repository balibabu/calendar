class YearVirtualScrollEngine {
  constructor($viewport, $track, dateEngine, eventProvider, onSelectMonth) {
    this.$viewport = $viewport;
    this.$track = $track;
    this.dateEngine = dateEngine;
    this.eventProvider = eventProvider;
    this.onSelectMonth = onSelectMonth;

    this.startYear = dateEngine.startYear;
    this.endYear = dateEngine.endYear;
    this.totalYears = this.endYear - this.startYear + 1;

    this.POOL_SIZE = 6;
    this.YEAR_HEIGHT = 580;
    this.YEAR_MARGIN = 24;

    this.yearPositions = [];
    this.poolNodes = [];
    this.isTicking = false;

    this._calculateLayoutPositions();
    this._createDOMPool();
    this._bindScrollEvent();
    this._bindClickEvent();
  }

  _calculateLayoutPositions() {
    let currentY = 16;
    this.yearPositions = new Array(this.totalYears);

    for (let i = 0; i < this.totalYears; i++) {
      this.yearPositions[i] = {
        top: currentY,
        height: this.YEAR_HEIGHT,
        bottom: currentY + this.YEAR_HEIGHT
      };
      currentY += this.YEAR_HEIGHT + this.YEAR_MARGIN;
    }

    this.$track.css('height', `${currentY}px`);
  }

  _createDOMPool() {
    this.$track.empty();
    this.poolNodes = [];

    for (let i = 0; i < this.POOL_SIZE; i++) {
      const $card = $(`
        <div class="year-card-node absolute left-0 right-0 mx-auto w-full max-w-full bg-black px-4 pt-2 pb-4 h-[580px] overflow-hidden">
          <div class="year-card-header flex items-center justify-start pb-2 border-b border-iosgray-800 mb-3 h-[44px]">
            <span class="year-title font-bold text-2xl text-iosred-500"></span>
          </div>
          <div class="months-grid grid grid-cols-3 gap-x-2 gap-y-3"></div>
        </div>
      `);

      this.$track.append($card);
      this.poolNodes.push({
        $el: $card,
        assignedYearIndex: -1
      });
    }
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

  _bindClickEvent() {
    this.$track.on('click', '.mini-month', e => {
      const monthIndex = $(e.currentTarget).data('month-index');
      if (monthIndex !== undefined) {
        this.onSelectMonth(parseInt(monthIndex, 10));
      }
    });
  }

  render() {
    const scrollTop = this.$viewport.scrollTop();
    let low = 0;
    let high = this.yearPositions.length - 1;
    let topVisibleIndex = 0;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (this.yearPositions[mid].bottom >= scrollTop) {
        topVisibleIndex = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    const startIndex = Math.max(0, topVisibleIndex - 1);
    const endIndex = Math.min(this.yearPositions.length - 1, startIndex + this.POOL_SIZE - 1);

    for (let i = startIndex; i <= endIndex; i++) {
      const node = this.poolNodes[i % this.POOL_SIZE];

      if (node.assignedYearIndex !== i) {
        this._populateYearCard(node.$el, i);
        node.assignedYearIndex = i;
      }

      node.$el.css('transform', `translate3d(0, ${this.yearPositions[i].top}px, 0)`);
    }
  }

  _populateYearCard($card, yearIndex) {
    const year = this.startYear + yearIndex;
    $card.find('.year-title').text(year);

    const $monthsGrid = $card.find('.months-grid');
    $monthsGrid.empty();

    const today = this.dateEngine.adToBs(new Date());

    for (let m = 0; m < 12; m++) {
      const globalMonthIndex = yearIndex * 12 + m;
      const meta = this.dateEngine.monthMeta[globalMonthIndex];
      const monthName = CalendarDataStore.MONTH_NAMES_BS[m];

      let daysHtml = '';
      for (let i = 0; i < meta.startDayOfWeek; i++) {
        daysHtml += '<span class="h-[13px]"></span>';
      }

      for (let day = 1; day <= meta.totalDays; day++) {
        const currentAdDate = new Date(meta.startAdDate.getTime() + (day - 1) * 86400000);
        const { isHoliday } = this.eventProvider.getDayMetaData(currentAdDate);

        const isToday =
          meta.year === today.bsYear &&
          meta.monthIndex === today.bsMonthIndex &&
          day === today.bsDay;

        let cell = '';
        if (isToday) {
          cell = `<span class="w-[13px] h-[13px] mx-auto rounded-full bg-iosred-500 text-white flex items-center justify-center font-bold text-[7px]">${day}</span>`;
        } else if (isHoliday) {
          cell = `<span class="text-iosred-600 font-medium">${day}</span>`;
        } else {
          cell = `<span class="text-white">${day}</span>`;
        }

        daysHtml += cell;
      }

      $monthsGrid.append(`
        <div class="mini-month cursor-pointer flex flex-col p-1 rounded-lg hover:bg-iosgray-800/40 active:scale-95 transition-transform" data-month-index="${globalMonthIndex}">
          <span class="text-[12px] font-semibold text-white mb-1 truncate">${monthName}</span>
          <div class="grid grid-cols-7 text-[7px] font-medium text-iosgray-600 text-center mb-0.5 select-none">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>
          <div class="grid grid-cols-7 text-[7px] text-center gap-y-[2px] leading-[13px] select-none h-[78px] content-start">
            ${daysHtml}
          </div>
        </div>
      `);
    }
  }

  scrollToYear(yearIndex) {
    const position = this.yearPositions[yearIndex];
    if (!position) return;
    this.$viewport[0].scrollTop = position.top;
    this.render();
  }
}
