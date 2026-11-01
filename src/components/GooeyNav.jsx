import { useEffect, useState } from 'react';

export default function GooeyNav({ items, initialActiveIndex = 0, onChange }) {
  const [active, setActive] = useState(initialActiveIndex);
  const [burst, setBurst] = useState(-1);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        let current = 0;
        items.forEach((item, index) => {
          const section = document.getElementById(item.href.slice(1));
          if (section && section.getBoundingClientRect().top <= 180) current = index;
        });
        setActive(current);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('hashchange', update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('hashchange', update);
    };
  }, [items]);
  useEffect(() => {
    if (burst < 0) return;
    const timeout = window.setTimeout(() => setBurst(-1), 700);
    return () => window.clearTimeout(timeout);
  }, [burst]);
  return <nav className="gooey-nav" aria-label="Main navigation">
    {items.map((item, index) => <a
      key={item.label}
      href={item.href}
      className={active === index ? 'active' : ''}
      aria-current={active === index ? 'location' : undefined}
      onClick={() => { setActive(index); setBurst(index); onChange?.(index, item); }}
    >{item.label}{burst === index && <span className="nav-particles" aria-hidden="true">{Array.from({ length: 10 }, (_, n) => <i key={n} style={{ '--angle': `${n * 36}deg`, '--distance': `${18 + (n % 3) * 6}px` }}/>)}</span>}</a>)}
  </nav>;
}
