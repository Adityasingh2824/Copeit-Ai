export default function PixelCard({ children, className = '' }) {
  return <div className={`pixel-card ${className}`} onMouseMove={event => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--pixel-x', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--pixel-y', `${event.clientY - rect.top}px`);
  }}><div className="pixel-wash" aria-hidden="true" />{children}</div>;
}
