const STORAGE_KEY = 'calendar-user-events';

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

const writeAll = (all) => localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

export const UserEvents = {
  allYears() {
    return Object.keys(readAll()).map(Number);
  },

  yearData(year) {
    return readAll()[year] || {};
  },

  add(year, dateKey, title) {
    const all = readAll();
    const yearData = all[year] || {};
    const list = yearData[dateKey] || [];
    list.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title, isPublicHoliday: false, isUser: true });
    yearData[dateKey] = list;
    all[year] = yearData;
    writeAll(all);
  },

  remove(year, dateKey, id) {
    const all = readAll();
    const yearData = all[year];
    if (!yearData || !Array.isArray(yearData[dateKey])) return;
    yearData[dateKey] = yearData[dateKey].filter((evt) => evt.id !== id);
    if (yearData[dateKey].length === 0) delete yearData[dateKey];
    if (Object.keys(yearData).length === 0) delete all[year];
    writeAll(all);
  }
};
