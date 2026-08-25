import { BS_EVENTS } from './events.js';

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
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return BS_EVENTS[key] || [];
  }
}

export function searchEvents(years, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches = [];
  for (const key of Object.keys(BS_EVENTS)) {
    const [year, month, day] = key.split('-').map(Number);
    if (!years.includes(year)) continue;
    for (const evt of BS_EVENTS[key]) {
      if (evt.title.toLowerCase().includes(q)) {
        matches.push({ year, monthIndex: month - 1, day, evt });
      }
    }
  }

  matches.sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex || a.day - b.day);
  return matches;
}
