let inflight = null;

const ensurePermission = () => {
  if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
  if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
  if (!inflight) inflight = Notification.requestPermission().finally(() => { inflight = null; });
  return inflight;
};

const send = (title, body, tag) => {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const notification = new Notification(title, {
    body,
    tag,
    icon: `${import.meta.env.BASE_URL}apple-touch-icon.png`
  });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
};

export const Notify = { ensurePermission, send };
