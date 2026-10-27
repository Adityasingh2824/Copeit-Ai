import { useEffect, useState } from 'react';

export default function GooeyNav({ items, initialActiveIndex = 0, onChange }) {
  const [active, setActive] = useState(initialActiveIndex);
  const [burst, setBurst] = useState(-1);
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
      aria-current={active === index ? 'page' : undefined}
      onClick={() => { setActive(index); setBurst(index); onChange?.(index, item); }}
    >{item.label}{burst === index && <span className="nav-particles" aria-hidden="true">{Array.from({ length: 10 }, (_, n) => <i key={n} style={{ '--angle': `${n * 36}deg`, '--distance': `${18 + (n % 3) * 6}px` }}/>)}</span>}</a>)}
  </nav>;
}
