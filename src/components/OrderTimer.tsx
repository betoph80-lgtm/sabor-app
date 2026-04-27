/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { motion } from 'motion/react';

export const OrderTimer: React.FC<{ 
  timestamp: number; 
  isCompleted?: boolean; 
  className?: string;
  hideIcon?: boolean;
}> = ({ timestamp, isCompleted, className, hideIcon }) => {
  const [elapsed, setElapsed] = useState('');
  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    if (isCompleted) {
      setElapsed('--:--');
      setIsDelayed(false);
      return;
    }

    const interval = setInterval(() => {
      const diff = Date.now() - timestamp;
      setIsDelayed(diff > 900000); // 15 minutes in ms
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      const parts = [];
      if (hours > 0) parts.push(hours.toString().padStart(2, '0'));
      parts.push(minutes.toString().padStart(2, '0'));
      parts.push(seconds.toString().padStart(2, '0'));
      
      setElapsed(parts.join(':'));
    }, 1000);

    return () => clearInterval(interval);
  }, [timestamp, isCompleted]);

  return (
    <motion.div 
      animate={isDelayed ? { scale: [1, 1.02, 1], transition: { repeat: Infinity, duration: 1.5 } } : {}}
      className={`flex items-center gap-1.5 transition-all duration-500 ${className || 'px-3 py-1 rounded-lg backdrop-blur-sm border bg-white/10 border-white/10'} ${
        isDelayed 
          ? '!bg-rose-600 !border-rose-400 !shadow-lg !shadow-rose-200 !text-white !opacity-100' 
          : ''
      }`}
    >
      {!hideIcon && <Timer className={`w-3.5 h-3.5 ${isDelayed ? '!text-white' : 'text-violet-300'}`} />}
      <span className={`font-mono font-bold text-sm tracking-tighter ${
        isDelayed ? '!text-white' : (className?.includes('text-') ? '' : 'text-white')
      }`}>{elapsed}</span>
    </motion.div>
  );
};
