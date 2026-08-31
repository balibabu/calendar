import { EventStore } from './event-store.js';

const MAX_CONSECUTIVE_MISSES = 3;
const MIN_YEAR = 1992;
const MAX_YEAR = 2100;

const buildUrl = (year) => {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}events/events_${year}.json`.replace(/([^:]\/)\/+/g, '$1');
};

const fetchYear = async (year) => {
  try {
    const response = await fetch(buildUrl(year));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    EventStore.registerYear(year, data);
    return true;
  } catch {
    EventStore.markYearFailed(year);
    return false;
  }
};

export const EventLoader = {
  start(pivotYear) {
    if (this._started) return Promise.resolve();
    this._started = true;

    return (async () => {
      await fetchYear(pivotYear);

      let up = pivotYear + 1;
      let down = pivotYear - 1;
      let missUp = 0;
      let missDown = 0;

      while (missUp < MAX_CONSECUTIVE_MISSES || missDown < MAX_CONSECUTIVE_MISSES) {
        const targets = [];

        if (missUp < MAX_CONSECUTIVE_MISSES && up <= MAX_YEAR) {
          targets.push(up);
          up++;
        }

        if (missDown < MAX_CONSECUTIVE_MISSES && down >= MIN_YEAR) {
          targets.push(down);
          down--;
        }

        if (targets.length === 0) break;

        for (const year of targets) {
          const success = await fetchYear(year);
          if (year > pivotYear) {
            missUp = success ? 0 : missUp + 1;
          } else {
            missDown = success ? 0 : missDown + 1;
          }
        }
      }
    })();
  }
};
