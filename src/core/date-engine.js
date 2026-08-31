import { MITI } from '../data/miti.js';
import { ANCHOR } from '../data/calendar-constants.js';

const DAY_MS = 86400000;

export class DateEngine {
  constructor() {
    this.startYear = 1992;
    this.endYear = 2100;
    this.monthStartOffsets = [];
    this.monthMeta = [];
    this._initializeOffsets();
  }

  _initializeOffsets() {
    const anchorIndex = (ANCHOR.bsYear - this.startYear) * 12 + ANCHOR.bsMonthIndex;
    const totalMonths = (this.endYear - this.startYear + 1) * 12;

    this.monthStartOffsets = new Array(totalMonths);
    this.monthMeta = new Array(totalMonths);
    this.monthStartOffsets[anchorIndex] = -(ANCHOR.bsDay - 1);

    for (let i = anchorIndex; i < totalMonths - 1; i++) {
      const year = this.startYear + Math.floor(i / 12);
      const month = i % 12;
      this.monthStartOffsets[i + 1] = this.monthStartOffsets[i] + (MITI[year] ? MITI[year][month] : 30);
    }

    for (let i = anchorIndex - 1; i >= 0; i--) {
      const year = this.startYear + Math.floor(i / 12);
      const month = i % 12;
      this.monthStartOffsets[i] = this.monthStartOffsets[i + 1] - (MITI[year] ? MITI[year][month] : 30);
    }

    for (let i = 0; i < totalMonths; i++) {
      const year = this.startYear + Math.floor(i / 12);
      const monthIndex = i % 12;
      const totalDays = MITI[year] ? MITI[year][monthIndex] : 30;
      const offset = this.monthStartOffsets[i];

      const startDayOfWeek = ((6 + (offset % 7)) % 7 + 7) % 7;
      const startAdTime = ANCHOR.adTime + offset * DAY_MS;

      this.monthMeta[i] = {
        year,
        monthIndex,
        totalDays,
        startDayOfWeek,
        numRows: Math.ceil((startDayOfWeek + totalDays) / 7),
        startAdTime
      };
    }
  }

  adToBs(adTime) {
    const diffDays = Math.floor((adTime - ANCHOR.adTime) / DAY_MS);

    let low = 0;
    let high = this.monthStartOffsets.length - 1;
    let monthIndex = 0;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (this.monthStartOffsets[mid] <= diffDays) {
        monthIndex = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const meta = this.monthMeta[monthIndex];
    if (!meta) return null;

    return {
      globalMonthIndex: monthIndex,
      bsYear: meta.year,
      bsMonthIndex: meta.monthIndex,
      bsDay: diffDays - this.monthStartOffsets[monthIndex] + 1
    };
  }

  bsToAd(bsYear, bsMonthIndex, bsDay) {
    const globalMonthIndex = (bsYear - this.startYear) * 12 + bsMonthIndex;
    if (globalMonthIndex < 0 || globalMonthIndex >= this.monthStartOffsets.length) return null;
    const offset = this.monthStartOffsets[globalMonthIndex] + (bsDay - 1);
    return ANCHOR.adTime + offset * DAY_MS;
  }
}

export function todayAdTime() {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}
