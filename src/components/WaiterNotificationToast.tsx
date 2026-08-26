/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../AppContext.tsx';
import { Bell, Check, X, Volume2, Sparkles, ChefHat } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const WaiterNotificationToast: React.FC = () => {
  const { notifications, dismissNotification, currentUser, setActiveView } = useApp();

  // Filter notifications relevant to current user (or show all if admin)
  const visibleNotifications = React.useMemo(() => {
    return notifications.filter(n => {
      if (currentUser?.role === 'ADMIN') return true;
      if (n.meseroId && currentUser?.id) return n.meseroId === currentUser.id;
      return true;
    });
  }, [notifications, currentUser]);

  if (visibleNotifications.length === 0) return null;

  return (
    <div 
      id="waiter-notifications-container"
      className="fixed top-20 right-3 sm:right-6 z-[100] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none"
    >
      <AnimatePresence>
        {visibleNotifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto bg-slate-950 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-emerald-500/40 shadow-emerald-950/40 flex items-start gap-3 backdrop-blur-md relative overflow-hidden"
          >
            {/* Animated Glow Border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-brand-400 to-emerald-500 animate-pulse" />

            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5 shadow-inner">
              <ChefHat className="w-5 h-5 animate-bounce" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                    {notif.mesaNombre}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                    <Volume2 className="w-3 h-3" /> ¡Plato Listo!
                  </span>
                </div>
                <button
                  id={`btn-dismiss-toast-${notif.id}`}
                  type="button"
                  onClick={() => dismissNotification(notif.id)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cerrar notificación"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-sm font-display font-black text-white leading-snug mt-1 truncate">
                {notif.platoNombre}
              </p>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                <span className="text-[9px] font-medium text-slate-400">
                  Mesero: <strong className="text-slate-200">{notif.meseroNombre}</strong>
                </span>

                <button
                  id={`btn-entendido-toast-${notif.id}`}
                  type="button"
                  onClick={() => {
                    dismissNotification(notif.id);
                    if (currentUser?.role === 'MESERO' || currentUser?.role === 'ADMIN') {
                      setActiveView('MESERO');
                    }
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  <Check className="w-3 h-3" />
                  <span>Entendido</span>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
