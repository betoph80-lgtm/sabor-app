import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext.tsx';
import { Image, CheckCircle2, RefreshCw } from 'lucide-react';

export default function AdminIdentidadView() {
  const { identity, updateIdentity } = useApp();
  const [identidadForm, setIdentidadForm] = useState({
    nombre: '',
    nombreCorto: '',
    eslogan: '',
    logoUrl: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (identity) {
      setIdentidadForm({
        nombre: identity.nombre || '',
        nombreCorto: identity.nombreCorto || '',
        eslogan: identity.eslogan || '',
        logoUrl: identity.logoUrl || ''
      });
    }
  }, [identity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateIdentity(identidadForm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3005);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Configuration Form Column */}
      <div className="lg:col-span-7 bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-violet-600 block mb-1">Branding Empresarial</span>
          <h3 className="text-xl font-display font-black text-slate-800 tracking-tight leading-none">Identidad Comercial</h3>
          <p className="text-xs text-slate-400 mt-1.5 font-medium uppercase tracking-tight">Establece el nombre, slogan y emblema de tu negocio.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Nombre Comercial</label>
              <input
                type="text"
                value={identidadForm.nombre}
                onChange={(e) => setIdentidadForm({ ...identidadForm, nombre: e.target.value })}
                placeholder="Ej. Sabor Abanquino"
                required
                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:border-violet-500 outline-none transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Siglas / Nombre Principal</label>
              <input
                type="text"
                value={identidadForm.nombreCorto}
                onChange={(e) => setIdentidadForm({ ...identidadForm, nombreCorto: e.target.value })}
                placeholder="Ej. SABOR ABANQUINO"
                required
                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Slogan del Establecimiento</label>
            <input
              type="text"
              value={identidadForm.eslogan}
              onChange={(e) => setIdentidadForm({ ...identidadForm, eslogan: e.target.value })}
              placeholder="Ej. Tradición & Sabor de nuestra tierra"
              className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:border-violet-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">URL de Logotipo Oficial</label>
            <div className="relative">
              <input
                type="url"
                value={identidadForm.logoUrl}
                onChange={(e) => setIdentidadForm({ ...identidadForm, logoUrl: e.target.value })}
                placeholder="Ej. https://images.unsplash.com/... o un enlace directo"
                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl pl-10 pr-4 py-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:border-violet-500 outline-none transition-all"
              />
              <Image className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
            <p className="text-[9px] text-slate-400 pl-1 italic font-medium leading-none mt-1">Recomendamos imágenes con fondo transparente o formato PNG circular.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-center transition-all shadow-md items-center justify-center gap-2 flex ${
                isSaving 
                  ? 'bg-slate-150 text-slate-400 cursor-not-allowed'
                  : 'bg-violet-600 text-white hover:bg-violet-700 active:scale-98 shadow-violet-100'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Guardando...
                </>
              ) : 'Guardar Identidad'}
            </button>
          </div>
          
          {saveSuccess && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-4 py-3 rounded-xl border border-emerald-100/50 animate-in fade-in duration-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-wide leading-none">Identidad Comercial guardada con éxito.</p>
            </div>
          )}
        </form>
      </div>

      {/* Corporate Identity Preview Column */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex-1 flex flex-col justify-between">
          <div>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-violet-400 block mb-3">Previsualización de Marca</span>
            
            {/* Real Mock Device Header */}
            <div className="bg-white rounded-2xl p-4 text-slate-800 border border-slate-800/20 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center p-1.5 overflow-hidden">
                    <img
                      src={identidadForm.logoUrl?.trim() ? identidadForm.logoUrl : 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/database.svg'}
                      alt="Preview Logo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/database.svg';
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-tight leading-none">
                      {identidadForm.nombreCorto || 'SABOR ABANQUINO'}
                    </h4>
                    {identidadForm.eslogan && identidadForm.eslogan.trim() !== '' && identidadForm.eslogan.trim() !== '-' && (
                      <span className="text-[7px] text-slate-400 font-bold block mt-0.5">
                        {identidadForm.eslogan}
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[7px] font-black uppercase">
                  13/6/2026
                </div>
              </div>

              {/* Receipt Body Visualizer */}
              <div className="space-y-1 font-mono text-[7px] leading-tight text-slate-500 py-1 border-b border-indigo-50/50 border-dashed">
                <div className="flex justify-between"><span>SOPA: DIETA_POLLO</span><span>1 x 11.00</span></div>
                <div className="flex justify-between"><span>SEGUNDO: MILANEZA</span><span>1 x 9.00</span></div>
                <div className="flex justify-between font-bold text-slate-700"><span>TOTAL DE LA CUENTA</span><span>S/ 20.00</span></div>
              </div>
              <div className="text-center">
                <span className="text-[6.5px] font-black text-indigo-400 capitalize block tracking-wide">
                  ¡Gracias por su preferencia!
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-200">Uso de Marca</h4>
            <p className="text-[10px] text-slate-400 leading-normal font-medium">
              Estos valores actualizan instantáneamente todos los puntos visibles en la suite del restaurante: desde los tickets de caja, el encabezado del menú móvil hasta los informes ejecutivos empresariales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
