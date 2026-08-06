/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, UserPlus, Lock, ShieldCheck, User as UserIcon } from 'lucide-react';

const LoginView = () => {
  const { login, appUsers, seedDatabase, requestConfirmation, identity } = useApp();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (username && pin.length === 4) {
      setLoading(true);
      const success = await login(username, pin);
      if (!success) {
        setError(true);
        setPin('');
      }
      setLoading(false);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  // Auto submit when 4 digits reached and username exists
  React.useEffect(() => {
    if (pin.length === 4 && username) {
      handleSubmit();
    }
  }, [pin, username]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white rounded-[48px] p-10 shadow-2xl border border-slate-100 space-y-8">
          <div className="text-center space-y-3">
             <div className="w-16 h-16 bg-brand-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-brand-100">
               <Lock className="w-8 h-8 text-white" />
             </div>
             <h1 className="text-2xl font-display font-bold text-slate-800">{identity?.nombre || 'Sabor Abanquino'}</h1>
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Control de Acceso</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Usuario</label>
              <div className="relative">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nombre de usuario"
                  className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 text-center block">PIN de Acceso</label>
              {/* PIN Display */}
              <div className="flex justify-center gap-4">
                {[0, 1, 2, 3].map(i => (
                  <div 
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                      pin.length > i 
                        ? 'bg-brand-600 scale-125' 
                        : error 
                          ? 'bg-rose-400 animate-shake' 
                          : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      if (val === 'C') setPin('');
                      else if (val === 'DEL') handleBackspace();
                      else handleKeyPress(val);
                    }}
                    className={`h-14 rounded-2xl text-base font-black transition-all active:scale-95 ${
                      val === 'C' || val === 'DEL' 
                        ? 'bg-slate-50 text-slate-400 hover:text-slate-600' 
                        : 'bg-white border border-slate-100 text-slate-700 hover:bg-brand-50 hover:border-brand-100 hover:text-brand-600'
                    }`}
                  >
                    {val === 'DEL' ? '←' : val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[9px] text-rose-500 font-bold uppercase text-center tracking-widest"
            >
              Credenciales Incorrectas
            </motion.p>
          )}

          {/* Reset button - Show always if system is not configured or as a fallback */}
          <div className="pt-4 border-t border-slate-50">
            <button 
              type="button"
              onClick={() => requestConfirmation(
                'Inicializar Sistema',
                '¿Desea restablecer los usuarios a los valores por defecto?',
                seedDatabase
              )}
              className="w-full py-4 text-[10px] font-black uppercase text-slate-300 hover:text-brand-600 tracking-widest hover:bg-brand-50 rounded-2xl transition-all"
            >
              Configurar primer acceso
            </button>
          </div>
        </div>

        {identity?.eslogan && identity.eslogan.trim() !== '' && identity.eslogan.trim() !== '-' && (
          <div className="mt-8 text-center">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              {identity.eslogan}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LoginView;
