window.BSEvents = window.BSEvents || {};

const CalendarDataStore = {
  ANCHOR: {
    bsYear: 2056,
    bsMonthIndex: 8,
    bsDay: 17,
    adDate: new Date(Date.UTC(2000, 0, 1))
  },

  MONTH_NAMES_BS: [
    "Baishakh",
    "Jestha",
    "Ashadh",
    "Shrawan",
    "Bhadra",
    "Ashwin",
    "Kartik",
    "Mangsir",
    "Poush",
    "Magh",
    "Falgun",
    "Chaitra"
  ],

  AD_MONTHS: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ],

  AD_DAYS: [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ],

  getMitiData() {
    if (typeof miti !== 'undefined') return miti;
    if (typeof window !== 'undefined' && window.miti) return window.miti;
    return {};
  }
};

class EventProvider {
  getDayMetaData(adDate) {
    const isSaturday = adDate.getUTCDay() === 6;
    return {
      isHoliday: isSaturday
    };
  }

  getEvents(year, monthIndex, day) {
    const m = String(monthIndex + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const key = `${year}-${m}-${d}`;
    return window.BSEvents[key] || [];
  }
}
