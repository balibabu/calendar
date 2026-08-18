clone the repo 
```
git clone https://github.com/S4NKALP/nepali-calendar-api.git
```
run python server and replace the url below with correct ones

run that in console and viola !!! you got your events for a year

```
(async function extractBSEvents(year = 2083) {
  console.log(`Fetching calendar events for BS ${year}...`);

  // Map Nepali numerals to English digits
  const nepaliDigits = { '०':'0', '१':'1', '२':'2', '३':'3', '४':'4', '५':'5', '६':'6', '७':'7', '८':'8', '९':'9' };
  const toEnglishNum = (str) => String(str).replace(/[०-९]/g, (d) => nepaliDigits[d]);

  const events = {};

  for (let month = 1; month <= 12; month++) {
    // Using jsDelivr CDN to guarantee open CORS headers
    const url = `http://localhost:8000/data/${year}/${month}.json`;

    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Could not load data for month ${month}`);
        continue;
      }
      
      const data = await response.json();
      const monthStr = String(month).padStart(2, '0');

      if (data && Array.isArray(data.days)) {
        for (const day of data.days) {
          // Skip padding days or days without events/festivals
          if (!day.n || !day.f || !day.f.trim()) continue;

          const dayNum = parseInt(toEnglishNum(day.n), 10);
          if (isNaN(dayNum)) continue;

          const dayStr = String(dayNum).padStart(2, '0');
          const dateKey = `${year}-${monthStr}-${dayStr}`;

          events[dateKey] = [
            {
              title: day.f.trim(),
              isPublicHoliday: Boolean(day.h)
            }
          ];
        }
      }
    } catch (err) {
      console.error(`Failed loading month ${month}:`, err);
    }
  }

  const outputCode = `window.BSEvents = Object.assign(window.BSEvents || {}, ${JSON.stringify(events, null, 2)});\n`;

  console.log(outputCode);

  if (typeof copy === 'function') {
    copy(outputCode);
    console.log(`%c✓ Successfully copied events-${year}.js to your clipboard!`, 'color: #00ff00; font-size: 14px; font-weight: bold;');
  } else {
    console.log(`%c✓ Done! Copy the output above.`, 'color: #00ff00; font-weight: bold;');
  }

  return events;
})(2083);
```
