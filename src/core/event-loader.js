import { EventStore } from './event-store.js';

const buildUrl = (fileName) => {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}events/${fileName}`.replace(/([^:]\/)\/+/g, '$1');
};

const yearOf = (fileName) => {
  const match = fileName.match(/(\d{4})/);
  return match ? Number(match[1]) : null;
};

const loadFile = async (fileName) => {
  const year = yearOf(fileName);
  if (!year) {
    console.warn(`[EventLoader] skipping "${fileName}": no year in filename`);
    return;
  }

  try {
    const response = await fetch(buildUrl(fileName));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    EventStore.registerYear(year, data);
  } catch (err) {
    console.warn(`[EventLoader] failed to load "${fileName}":`, err.message);
    EventStore.markYearFailed(year);
  }
};

export const EventLoader = {
  start(pivotYear) {
    if (this._started) return Promise.resolve();
    this._started = true;

    return (async () => {
      let files;
      try {
        const response = await fetch(buildUrl('manifest.json'));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const manifest = await response.json();
        files = manifest.files || [];
      } catch (err) {
        console.warn('[EventLoader] failed to load manifest.json:', err.message);
        return;
      }

      await loadFile(files.find((f) => yearOf(f) === pivotYear));
      await Promise.all(files.filter((f) => yearOf(f) !== pivotYear).map(loadFile));
    })();
  }
};
