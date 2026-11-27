import { useEffect, useState } from 'react';

/** Live clock for the taskbar. Updates once per second. */
export function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return (
    <div
      className="flex flex-col items-end px-3 font-pixel text-spectral-500 leading-none"
      aria-label={`Clock: ${time}, ${date}`}
    >
      <span className="text-lg">{time}</span>
      <span className="text-xs text-bone-500">{date}</span>
    </div>
  );
}
