import { EventStore } from './event-store.js';
import { MONTH_NAMES_BS, AD_MONTHS, AD_DAYS } from '../data/calendar-constants.js';
import { todayAdTime } from './date-engine.js';

const DAY_MS = 86400000;

export class UpcomingEventsEngine {
  constructor(viewport, track, dateEngine, eventProvider) {
    this.viewport = viewport;
    this.track = track;
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

    this.viewport.addEventListener('scroll', () => {
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

      for (let day = 1; day <= meta.totalDays; day++) {
        const events = EventStore.getEvents(meta.year, meta.monthIndex, day);
        if (events.length > 0) {
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
      this.startNote.textContent = 'No events found.';
      this.endNote.classList.add('hidden');
    } else {
      this.trackHeight = cursor - this.ENTRY_MARGIN + 8 + this.NOTE_H;
      this.startNote.textContent = 'No earlier events.';
      this.endNote.classList.remove('hidden');
    }

    this.track.style.height = `${this.trackHeight}px`;
  }

  _createDOMPool() {
    this.track.innerHTML = '';
    this.poolNodes = [];

    this.startNote = document.createElement('div');
    this.startNote.className = 'absolute left-0 right-0 text-iosgray-400 text-sm text-center py-2';

    this.endNote = document.createElement('div');
    this.endNote.className = 'absolute left-0 right-0 text-iosgray-400 text-sm text-center py-2';
    this.endNote.style.top = '0px';

    this.track.appendChild(this.startNote);
    this.track.appendChild(this.endNote);

    for (let i = 0; i < this.POOL_SIZE; i++) {
      const el = document.createElement('div');
      el.className = 'upcoming-entry-node absolute left-0 right-0 flex flex-col gap-1.5';
      this.track.appendChild(el);
      this.poolNodes.push({
        el,
        assignedIndex: -1
      });
    }
  }

  _positionEndNote() {
    this.endNote.style.top = `${this.trackHeight - this.NOTE_H}px`;
  }

  _findTodayIndex() {
    const today = this.dateEngine.adToBs(todayAdTime());
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

  _findTopVisibleIndex(scrollTop) {
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

    return topVisibleIndex;
  }

  render() {
    if (!this.entries || this.entries.length === 0) return;

    const topVisibleIndex = this._findTopVisibleIndex(this.viewport.scrollTop);

    const startIndex = Math.max(0, topVisibleIndex - 1);
    const endIndex = Math.min(this.positions.length - 1, startIndex + this.POOL_SIZE - 1);

    for (let i = startIndex; i <= endIndex; i++) {
      const node = this.poolNodes[i % this.POOL_SIZE];

      if (node.assignedIndex !== i) {
        this._populateEntryNode(node.el, i);
        node.assignedIndex = i;
      }

      node.el.style.transform = `translate3d(0, ${this.positions[i].top}px, 0)`;
    }
  }

  _populateEntryNode(el, index) {
    const entry = this.entries[index];
    const meta = this.dateEngine.monthMeta[entry.gmi];
    const monthName = MONTH_NAMES_BS[meta.monthIndex];
    const adTime = meta.startAdTime + (entry.day - 1) * DAY_MS;
    const adDate = new Date(adTime);
    const dayName = AD_DAYS[adDate.getUTCDay()];
    const adMonth = AD_MONTHS[adDate.getUTCMonth()];

    const today = this.dateEngine.adToBs(todayAdTime());
    const isToday =
      meta.year === today.bsYear &&
      meta.monthIndex === today.bsMonthIndex &&
      entry.day === today.bsDay;

    let rows = '';
    entry.events.forEach((evt) => {
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

    el.innerHTML = `
      <div class="h-[20px] flex items-center gap-2 px-1 overflow-hidden">
        <span class="text-[11px] font-semibold ${isToday ? 'text-iosred-500' : 'text-iosgray-400'} uppercase tracking-wider whitespace-nowrap">${dayName}, ${entry.day} ${monthName} ${meta.year}</span>
        <span class="text-[10px] text-iosgray-400 whitespace-nowrap">${adMonth} ${adDate.getUTCDate()}, ${adDate.getUTCFullYear()}</span>
      </div>
      ${rows}
    `;
  }

  reset() {
    this._buildEntries();
    this._calculateLayoutPositions();

    if (this.entries.length > 0) {
      this._positionEndNote();
      const index = this._findTodayIndex();
      this.viewport.scrollTop = Math.max(0, this.positions[index].top - this.NOTE_H - 8);
    } else {
      this.viewport.scrollTop = 0;
    }

    for (const node of this.poolNodes) {
      node.assignedIndex = -1;
    }

    this.render();
  }

  refresh() {
    if (!this.entries) return;

    const scrollTop = this.viewport.scrollTop;
    let anchorKey = null;
    let anchorOffset = 0;

    if (this.entries.length > 0) {
      const index = this._findTopVisibleIndex(scrollTop);
      anchorKey = `${this.entries[index].gmi}-${this.entries[index].day}`;
      anchorOffset = scrollTop - this.positions[index].top;
    }

    this._buildEntries();
    this._calculateLayoutPositions();
    this._positionEndNote();

    if (anchorKey !== null && this.entries.length > 0) {
      let newIndex = -1;
      for (let i = 0; i < this.entries.length; i++) {
        if (`${this.entries[i].gmi}-${this.entries[i].day}` === anchorKey) {
          newIndex = i;
          break;
        }
      }
      this.viewport.scrollTop = newIndex >= 0 ? Math.max(0, this.positions[newIndex].top + anchorOffset) : scrollTop;
    } else {
      this.viewport.scrollTop = scrollTop;
    }

    for (const node of this.poolNodes) {
      node.assignedIndex = -1;
    }

    this.render();
  }
}
