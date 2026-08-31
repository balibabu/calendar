const listeners = new Set();
const yearEvents = new Map();
const loadedYears = new Set();
const failedYears = new Set();

const keyFor = (year, monthIndex, day) =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const EventStore = {
  registerYear(year, events) {
    const map = new Map();
    for (const [dateKey, dayEvents] of Object.entries(events)) {
      if (Array.isArray(dayEvents)) {
        map.set(dateKey, dayEvents);
      }
    }
    yearEvents.set(year, map);
    loadedYears.add(year);
    failedYears.delete(year);
    for (const listener of listeners) {
      listener(year);
    }
  },

  isYearLoaded(year) {
    return loadedYears.has(year);
  },

  isYearFailed(year) {
    return failedYears.has(year);
  },

  markYearFailed(year) {
    failedYears.add(year);
  },

  getEvents(year, monthIndex, day) {
    const map = yearEvents.get(year);
    return (map && map.get(keyFor(year, monthIndex, day))) || [];
  },

  forEachYear(cb) {
    for (const [year, map] of yearEvents) {
      cb(year, map);
    }
  },

  searchEvents(years, query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const yearSet = new Set(years);
    const matches = [];

    for (const [year, map] of yearEvents) {
      if (!yearSet.has(year)) continue;
      for (const [dateKey, dayEvents] of map) {
        const [, month, day] = dateKey.split('-').map(Number);
        for (const evt of dayEvents) {
          if (evt.title.toLowerCase().includes(q)) {
            matches.push({ year, monthIndex: month - 1, day, evt });
          }
        }
      }
    }

    matches.sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex || a.day - b.day);
    return matches;
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
