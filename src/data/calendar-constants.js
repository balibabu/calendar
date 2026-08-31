import { EventStore } from '../core/event-store.js';

export const ANCHOR = {
  bsYear: 2056,
  bsMonthIndex: 8,
  bsDay: 17,
  adTime: Date.UTC(2000, 0, 1)
};

export const MONTH_NAMES_BS = [
  'Baishakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra'
];

export const AD_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const AD_DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export class EventProvider {
  getDayMetaData(adTime) {
    const dayOfWeek = Math.floor(adTime / 86400000 + 4) % 7;
    return { isHoliday: dayOfWeek === 6 };
  }

  getEvents(year, monthIndex, day) {
    return EventStore.getEvents(year, monthIndex, day);
  }
}

export function searchEvents(years, query) {
  return EventStore.searchEvents(years, query);
}
