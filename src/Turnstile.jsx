import { useEffect, useRef, useState } from 'react';

const SCRIPT_ID = 'cloudflare-turnstile-script';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.turnstile), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function Turnstile({ onToken, resetKey }) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const target = useRef(null);
  const widgetId = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!siteKey || !target.current) return undefined;
    let active = true;
    onToken(null);
    loadTurnstile().then(turnstile => {
      if (!active || !turnstile || widgetId.current !== null) return;
      widgetId.current = turnstile.render(target.current, {
        sitekey: siteKey,
        theme: 'light',
        callback: token => { if (active) { setError(''); onToken(token); } },
        'expired-callback': () => { if (active) onToken(null); },
        'error-callback': () => { if (active) { onToken(null); setError('Bot protection could not load. Refresh and try again.'); } },
      });
    }).catch(() => { if (active) setError('Bot protection could not load. Refresh and try again.'); });
    return () => {
      active = false;
      if (window.turnstile && widgetId.current !== null) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey, onToken]);

  useEffect(() => {
    if (window.turnstile && widgetId.current !== null) window.turnstile.reset(widgetId.current);
    onToken(null);
  }, [resetKey]);

  if (!siteKey) return <div className="form-message error" role="alert">Bot protection is not configured for this deployment.</div>;
  return <div className="captcha-wrap"><div ref={target}/>{error && <p className="captcha-error" role="alert">{error}</p>}</div>;
}
