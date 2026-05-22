/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const OrderTimer: React.FC<{ 
  timestamp: number; 
  isCompleted?: boolean; 
  className?: string;
  hideIcon?: boolean;
}> = ({ timestamp, isCompleted = false, className = '', hideIcon = false }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (isCompleted) {
      setElapsed('--:--');
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const difference = Math.max(0, now - timestamp);
      const minutes = Math.floor(difference / 60000);
      const seconds = Math.floor((difference % 60000) / 1000);
      
      const pad = (num: number) => num.toString().padStart(2, '0');
      setElapsed(`${pad(minutes)}:${pad(seconds)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [timestamp, isCompleted]);

  return (
    <div className={`flex items-center gap-1 font-mono ${className}`}>
      {!hideIcon && <Clock className="w-3.5 h-3.5 shrink-0" />}
      <span>{elapsed}</span>
    </div>
  );
};
