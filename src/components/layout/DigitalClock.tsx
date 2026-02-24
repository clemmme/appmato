import { useState, useEffect } from 'react';

export function DigitalClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  return (
    <div className="flex items-center justify-center gap-1 font-mono text-sm">
      <span className="text-foreground font-semibold">{hours}</span>
      <span className="text-primary animate-pulse">:</span>
      <span className="text-foreground font-semibold">{minutes}</span>
      <span className="text-muted-foreground text-xs">:{seconds}</span>
    </div>
  );
}
