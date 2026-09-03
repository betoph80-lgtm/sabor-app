import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext.tsx';
import { Image, CheckCircle2, RefreshCw, Trash2, AlertTriangle, Calendar } from 'lucide-react';

export default function AdminIdentidadView() {
  const { identity, updateIdentity, selectedDate, deleteSelectedDayData, orders, cashControls, customers } = useApp();
  const [identidadForm, setIdentidadForm] = useState({
    nombre: '',
    nombreCorto: '',
    eslogan: '',
    logoUrl: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingDay, setIsDeletingDay] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const handleConfirmDeleteDay = async () => {
    setIsDeletingDay(true);
    setDeleteError(null);
    try {
      await deleteSelectedDayData(selectedDate);
      setDeleteSuccess(true);
      setShowDeleteModal(false);
      setTimeout(() => setDeleteSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      setDeleteError(err?.message || 'Error al eliminar los datos del día.');
    } finally {
      setIsDeletingDay(false);
    }
  };

  // Calculations for current selected date summary
  const ordersCountToday = (orders || []).filter(o => o.fecha === selectedDate).length;
  const cashOpeningToday = (cashControls || []).find(c => c.fecha === selectedDate);
  const customerTxCountToday = (customers || []).flatMap(c => c.historial || []).filter(t => t.fecha === selectedDate).length;

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Configuration Form Column */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400 block mb-1">Branding Empresarial</span>
            <h3 className="text-xl font-display font-black text-slate-800 dark:text-white tracking-tight leading-none">Identidad Comercial</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium uppercase tracking-tight">Establece el nombre, slogan y emblema de tu negocio.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1">Nombre Comercial</label>
                <input
                  type="text"
                  value={identidadForm.nombre}
                  onChange={(e) => setIdentidadForm({ ...identidadForm, nombre: e.target.value })}
                  placeholder="Ej. Sabor Abanquino"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 outline-none transition-all"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1">Siglas / Nombre Principal</label>
                <input
                  type="text"
                  value={identidadForm.nombreCorto}
                  onChange={(e) => setIdentidadForm({ ...identidadForm, nombreCorto: e.target.value })}
                  placeholder="Ej. SABOR ABANQUINO"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1">Slogan del Establecimiento</label>
              <input
                type="text"
                value={identidadForm.eslogan}
                onChange={(e) => setIdentidadForm({ ...identidadForm, eslogan: e.target.value })}
                placeholder="Ej. Tradición & Sabor de nuestra tierra"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1">URL de Logotipo Oficial</label>
              <div className="relative">
                <input
                  type="url"
                  value={identidadForm.logoUrl}
                  onChange={(e) => setIdentidadForm({ ...identidadForm, logoUrl: e.target.value })}
                  placeholder="Ej. https://images.unsplash.com/... o un enlace directo"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs md:text-sm font-bold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 outline-none transition-all"
                />
                <Image className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 pl-1 italic font-medium leading-none mt-1">Recomendamos imágenes con fondo transparente o formato PNG circular.</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-center transition-all shadow-md items-center justify-center gap-2 flex ${
                  isSaving 
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-98 shadow-brand-100 dark:shadow-none cursor-pointer'
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
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl border border-emerald-100/50 dark:border-emerald-900/50 animate-in fade-in duration-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-wide leading-none">Identidad Comercial guardada con éxito.</p>
              </div>
            )}
          </form>
        </div>

        {/* Corporate Identity Preview Column */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900 dark:bg-slate-850 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-400 block mb-3">Previsualización de Marca</span>
              
              {/* Real Mock Device Header */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 text-slate-800 dark:text-slate-100 border border-slate-800/20 dark:border-slate-800 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center p-1.5 overflow-hidden">
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
                      <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
                        {identidadForm.nombreCorto || 'SABOR ABANQUINO'}
                      </h4>
                      {identidadForm.eslogan && identidadForm.eslogan.trim() !== '' && identidadForm.eslogan.trim() !== '-' && (
                        <span className="text-[7px] text-slate-400 dark:text-slate-500 font-bold block mt-0.5">
                          {identidadForm.eslogan}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded text-[7px] font-black uppercase">
                    {selectedDate}
                  </div>
                </div>

                {/* Receipt Body Visualizer */}
                <div className="space-y-1 font-mono text-[7px] leading-tight text-slate-500 dark:text-slate-400 py-1 border-b border-indigo-50/50 dark:border-slate-800 border-dashed">
                  <div className="flex justify-between"><span>SOPA: DIETA_POLLO</span><span>1 x 11.00</span></div>
                  <div className="flex justify-between"><span>SEGUNDO: MILANEZA</span><span>1 x 9.00</span></div>
                  <div className="flex justify-between font-bold text-slate-700 dark:text-slate-200"><span>TOTAL DE LA CUENTA</span><span>S/ 20.00</span></div>
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

      {/* ⚠️ MANTENIMIENTO & BORRADO DE DATOS DEL DÍA SELECCIONADO */}
      <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-rose-100 dark:border-rose-900/40 shadow-[0_4px_24px_rgba(225,29,72,0.04)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100 dark:border-rose-900/40 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900/50 flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-rose-600 dark:text-rose-400 block mb-0.5">
                Mantenimiento de Base de Datos
              </span>
              <h3 className="text-lg font-display font-black text-slate-800 dark:text-white tracking-tight leading-none">
                Borrar Datos del Día Seleccionado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Elimina de forma permanente los pedidos, el historial de cobranzas y el saldo/apertura de caja del día activo en el sistema.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-4 py-2.5 rounded-2xl flex-shrink-0">
            <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <div className="text-right">
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block leading-none">
                Fecha Seleccionada
              </span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                {selectedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Resumen de Registros a eliminar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 p-3.5 rounded-2xl">
            <span className="text-[9px] font-black uppercase text-rose-500 dark:text-rose-400 block mb-1">Pedidos Registrados</span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">{ordersCountToday}</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block mt-0.5">comprobantes / comandas</span>
          </div>

          <div className="bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 p-3.5 rounded-2xl">
            <span className="text-[9px] font-black uppercase text-rose-500 dark:text-rose-400 block mb-1">Apertura de Caja</span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
              {cashOpeningToday ? `S/ ${cashOpeningToday.montoApertura.toFixed(2)}` : 'Sin Apertura'}
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block mt-0.5">
              {cashOpeningToday ? `Estado: ${cashOpeningToday.estado}` : 'No registrado hoy'}
            </span>
          </div>

          <div className="bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 p-3.5 rounded-2xl">
            <span className="text-[9px] font-black uppercase text-rose-500 dark:text-rose-400 block mb-1">Transacciones Clientes</span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">{customerTxCountToday}</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block mt-0.5">abonos / fiados hoy</span>
          </div>
        </div>

        {deleteSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 animate-in fade-in duration-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <p className="text-xs font-black uppercase tracking-wide">
              ¡Éxito! Todos los datos correspondientes al día {selectedDate} han sido eliminados correctamente.
            </p>
          </div>
        )}

        {deleteError && (
          <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 px-4 py-3 rounded-2xl border border-rose-200 dark:border-rose-900 animate-in fade-in duration-300">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <p className="text-xs font-black tracking-wide">{deleteError}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic">
            ⚠️ Atención: Esta acción borrará permanentemente los datos listados para la fecha <strong className="text-slate-600 dark:text-slate-300 font-bold">{selectedDate}</strong>.
          </p>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={isDeletingDay}
            className="px-5 py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 dark:shadow-none transition-all flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Borrar Datos del Día {selectedDate}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isDeletingDay && setShowDeleteModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-6 md:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Confirmar Purga de Datos</h4>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Fecha: {selectedDate}</p>
              </div>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-4 text-xs text-rose-900 dark:text-rose-200 space-y-2 leading-relaxed">
              <p className="font-bold">
                ¿Estás seguro de que deseas eliminar permanentemente los registros del día <strong>{selectedDate}</strong>?
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] font-medium text-rose-800 dark:text-rose-300">
                <li>Se eliminarán <strong>{ordersCountToday} pedidos</strong> registrados.</li>
                <li>Se reiniciará la <strong>Apertura y Cierre de Caja</strong> del día.</li>
                <li>Se revertirá el <strong>historial y saldos de clientes</strong> abonados/fiados hoy.</li>
                <li>Se liberarán las mesas ocupadas.</li>
              </ul>
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 pt-1">
                Esta acción es irreversible.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingDay}
                className="py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteDay}
                disabled={isDeletingDay}
                className="py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-rose-200 dark:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeletingDay ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Borrando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Sí, Borrar Todo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

