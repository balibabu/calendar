class UpcomingEventsEngine {
  constructor($viewport, $track, dateEngine, eventProvider) {
    this.$viewport = $viewport;
    this.$track = $track;
    this.dateEngine = dateEngine;
    this.eventProvider = eventProvider;

    this.POOL_SIZE = 12;
    this.HEADER_H = 20;
    this.ROW_H = 44;
    this.ENTRY_GAP = 6;
    this.ENTRY_MARGIN = 10;
    this.NOTE_H = 36;

    this.entries = null;
    this.positions = [];
    this.trackHeight = 0;
    this.poolNodes = [];
    this.isTicking = false;

    this._createDOMPool();

    this.$viewport.on('scroll', () => {
      if (this.isTicking) return;
      this.isTicking = true;
      requestAnimationFrame(() => {
        this.render();
        this.isTicking = false;
      });
    });
  }

  _buildEntries() {
    const entries = [];
    const { monthMeta } = this.dateEngine;

    for (let gmi = 0; gmi < monthMeta.length; gmi++) {
      const meta = monthMeta[gmi];
      const prefix = `${meta.year}-${String(meta.monthIndex + 1).padStart(2, '0')}-`;

      for (let day = 1; day <= meta.totalDays; day++) {
        const events = window.BSEvents[prefix + String(day).padStart(2, '0')];
        if (events && events.length > 0) {
          entries.push({ gmi, day, events });
        }
      }
    }

    this.entries = entries;
  }

  _calculateLayoutPositions() {
    let cursor = this.NOTE_H + 8;
    this.positions = new Array(this.entries.length);

    for (let i = 0; i < this.entries.length; i++) {
      const rows = this.entries[i].events.length;
      const height = this.HEADER_H + rows * (this.ROW_H + this.ENTRY_GAP);

      this.positions[i] = {
        top: cursor,
        height,
        bottom: cursor + height
      };

      cursor += height + this.ENTRY_MARGIN;
    }

    if (this.entries.length === 0) {
      this.trackHeight = this.NOTE_H + 8;
      this.$startNote.text('No events found.');
      this.$endNote.addClass('hidden');
    } else {
      this.trackHeight = cursor - this.ENTRY_MARGIN + 8 + this.NOTE_H;
      this.$startNote.text('No earlier events.');
      this.$endNote.removeClass('hidden');
    }

    this.$track.css('height', `${this.trackHeight}px`);
  }

  _createDOMPool() {
    this.$track.empty();
    this.poolNodes = [];

    this.$startNote = $('<div class="absolute left-0 right-0 text-iosgray-400 text-sm text-center py-2"></div>');
    this.$endNote = $('<div class="absolute left-0 right-0 text-iosgray-400 text-sm text-center py-2"></div>');
    this.$track.append(this.$startNote, this.$endNote);

    for (let i = 0; i < this.POOL_SIZE; i++) {
      const $el = $('<div class="upcoming-entry-node absolute left-0 right-0 flex flex-col gap-1.5"></div>');
      this.$track.append($el);
      this.poolNodes.push({
        $el,
        assignedIndex: -1
      });
    }
  }

  _findTodayIndex() {
    const today = this.dateEngine.adToBs(new Date());
    const todayGmi = today.globalMonthIndex;

    let low = 0;
    let high = this.entries.length - 1;
    let result = this.entries.length - 1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      const entry = this.entries[mid];
      if (entry.gmi > todayGmi || (entry.gmi === todayGmi && entry.day >= today.bsDay)) {
        result = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return Math.max(0, result);
  }

  render() {
    if (!this.entries || this.entries.length === 0) return;

    const scrollTop = this.$viewport.scrollTop();
    let low = 0;
    let high = this.positions.length - 1;
    let topVisibleIndex = 0;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (this.positions[mid].bottom >= scrollTop) {
        topVisibleIndex = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    const startIndex = Math.max(0, topVisibleIndex - 1);
    const endIndex = Math.min(this.positions.length - 1, startIndex + this.POOL_SIZE - 1);

    for (let i = startIndex; i <= endIndex; i++) {
      const node = this.poolNodes[i % this.POOL_SIZE];

      if (node.assignedIndex !== i) {
        this._populateEntryNode(node.$el, i);
        node.assignedIndex = i;
      }

      node.$el.css('transform', `translate3d(0, ${this.positions[i].top}px, 0)`);
    }
  }

  _populateEntryNode($el, index) {
    const entry = this.entries[index];
    const meta = this.dateEngine.monthMeta[entry.gmi];
    const monthName = CalendarDataStore.MONTH_NAMES_BS[meta.monthIndex];
    const adDate = new Date(meta.startAdDate.getTime() + (entry.day - 1) * 86400000);
    const dayName = CalendarDataStore.AD_DAYS[adDate.getUTCDay()];
    const adMonth = CalendarDataStore.AD_MONTHS[adDate.getUTCMonth()];

    const today = this.dateEngine.adToBs(new Date());
    const isToday =
      meta.year === today.bsYear &&
      meta.monthIndex === today.bsMonthIndex &&
      entry.day === today.bsDay;

    let rows = '';
    entry.events.forEach(evt => {
      const badge = evt.isPublicHoliday
        ? '<span class="text-[11px] font-semibold text-iosred-500 bg-iosred-500/10 px-2 py-0.5 rounded-full shrink-0 border border-iosred-500/20">Holiday</span>'
        : '';

      rows += `
        <div class="h-[44px] flex items-center justify-between gap-3 bg-white/5 px-3 rounded-xl border border-white/5">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-1.5 h-1.5 rounded-full ${evt.isPublicHoliday ? 'bg-iosred-500' : 'bg-white/70'} shrink-0"></span>
            <span class="text-sm font-medium text-white truncate">${evt.title}</span>
          </div>
          ${badge}
        </div>
      `;
    });

    $el.html(`
      <div class="h-[20px] flex items-center gap-2 px-1 overflow-hidden">
        <span class="text-[11px] font-semibold ${isToday ? 'text-iosred-500' : 'text-iosgray-400'} uppercase tracking-wider whitespace-nowrap">${dayName}, ${entry.day} ${monthName} ${meta.year}</span>
        <span class="text-[10px] text-iosgray-400 whitespace-nowrap">${adMonth} ${adDate.getUTCDate()}, ${adDate.getUTCFullYear()}</span>
      </div>
      ${rows}
    `);
  }

  reset() {
    if (!this.entries) {
      this._buildEntries();
      this._calculateLayoutPositions();
    }

    if (this.entries.length > 0) {
      const index = this._findTodayIndex();
      this.$viewport[0].scrollTop = Math.max(0, this.positions[index].top - this.NOTE_H - 8);
    } else {
      this.$viewport[0].scrollTop = 0;
    }

    this.render();
  }
}
