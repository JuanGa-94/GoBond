
import React, { useState, useEffect, useMemo } from 'react';

interface CountdownTimerProps {
  departureTime: string;
  targetDate?: Date;
  onFinish?: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ departureTime, targetDate, onFinish }) => {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const [hours, minutes] = departureTime.split(':').map(Number);

      const target = targetDate ? new Date(targetDate) : new Date();
      target.setHours(hours, minutes, 0, 0);

      if (!targetDate && target.getTime() < now.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const diff = target.getTime() - now.getTime();
      setTimeLeftMs(diff);

      if (diff <= 0 && onFinish) {
        onFinish();
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [departureTime, onFinish]);

  const formatted = useMemo(() => {
    if (timeLeftMs <= 0) return { h: '00', m: '00', s: '00' };
    const h = Math.floor(timeLeftMs / (1000 * 60 * 60)).toString().padStart(2, '0');
    const m = Math.floor((timeLeftMs / (1000 * 60)) % 60).toString().padStart(2, '0');
    const s = Math.floor((timeLeftMs / 1000) % 60).toString().padStart(2, '0');
    return { h, m, s };
  }, [timeLeftMs]);

  const status = useMemo(() => {
    const mins = timeLeftMs / (1000 * 60);
    if (mins > 30) return 'safe';
    if (mins > 10) return 'warning';
    return 'danger';
  }, [timeLeftMs]);

  const colorClass = useMemo(() => {
    if (status === 'safe') return 'text-primary';
    if (status === 'warning') return 'text-orange-500';
    return 'text-red-500 animate-pulse';
  }, [status]);

  const bgClass = useMemo(() => {
    if (status === 'safe') return 'bg-primary-muted border-primary/10';
    if (status === 'warning') return 'bg-orange-500/5 dark:bg-orange-500/10 border-orange-500/10';
    return 'bg-red-500/5 dark:bg-red-500/10 border-red-500/20';
  }, [status]);

  return (
    <div className="space-y-4">
      <div className={`flex flex-col items-center justify-center py-10 rounded-[2.5rem] border transition-all duration-500 ${bgClass}`}>
        <div className={`flex gap-4 md:gap-8 items-baseline ${colorClass}`}>
          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-7xl font-black tracking-tighter tabular-nums">{formatted.h}</div>
            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-2">Hrs</span>
          </div>
          <div className="text-4xl md:text-6xl font-black opacity-20">:</div>
          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-7xl font-black tracking-tighter tabular-nums">{formatted.m}</div>
            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-2">Min</span>
          </div>
          <div className="text-4xl md:text-6xl font-black opacity-20">:</div>
          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-7xl font-black tracking-tighter tabular-nums">{formatted.s}</div>
            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-2">Seg</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
