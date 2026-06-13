import React from 'react';
import { useApp } from '../AppContext.tsx';
import { Database, RefreshCw, Server, Cpu, Check } from 'lucide-react';

export default function AdminDatabaseView() {
  const {
    dbConnectedStatus, dbConnectionErrorMessage, recheckDbConnection,
    seedDatabase, requestConfirmation
  } = useApp();

  const SchemaTable = ({ title, description, fields }: { title: string, description: string, fields: { name: string, type: string, desc: string }[] }) => (
    <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-300">
      <div className="mb-4 border-b border-slate-50 pb-3">
        <h4 className="text-xs font-black text-violet-600 uppercase tracking-widest">{title}</h4>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{description}</p>
      </div>
      <div className="space-y-2">
        {fields.map(f => (
          <div key={f.name} className="flex flex-col p-3 bg-slate-50 rounded-2xl border border-slate-150/40">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-black text-slate-700 font-mono tracking-tight">{f.name}</span>
              <span className="text-[8px] font-black uppercase tracking-wider bg-violet-50 text-violet-600 px-2.5 py-0.5 rounded-full border border-violet-100/35">{f.type}</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight font-medium">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Firebase Connection Diagnostic Panel */}
      <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.02)] border border-slate-100/80 text-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-sm transition-all duration-300 ${
              dbConnectedStatus === 'conectado' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-emerald-50' :
              dbConnectedStatus === 'conectando' ? 'bg-amber-50 border-amber-100 text-amber-600 shadow-amber-50' :
              'bg-rose-50 border-rose-100 text-rose-600 shadow-rose-50'
            }`}>
              <Database className={`w-5.5 h-5.5 ${dbConnectedStatus === 'conectando' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider leading-none mb-1">Diagnóstico de Firebase</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Estado de la conexión y configuración de la nube</p>
            </div>
          </div>
          
          <button
            onClick={recheckDbConnection}
            disabled={dbConnectedStatus === 'conectando'}
            className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${
              dbConnectedStatus === 'conectando'
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100'
            }`}
          >
            {dbConnectedStatus === 'conectando' ? 'Verificando...' : 'Probar Conexión'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          <div className="p-4.5 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-3">
            <Server className="w-5 h-5 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Proyecto ID</p>
              <p className="text-xs font-bold text-slate-700 font-mono truncate">agile-extension-262716</p>
            </div>
          </div>
          
          <div className="p-4.5 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-3">
            <Cpu className="w-5 h-5 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Base de Datos Firestore</p>
              <p className="text-violet-600 text-[11px] font-bold font-mono truncate" title="ai-studio-da6577ff_db">
                ai-studio-da6577ff_db
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Database className="w-5 h-5 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Servidor Cloud</p>
                <p className="text-xs font-bold text-slate-700 uppercase">Enterprise Edition</p>
              </div>
            </div>
            <div className="flex gap-1.5 items-center bg-white px-2.5 py-1 rounded-lg border border-slate-150/60 shadow-sm shrink-0">
              <span className={`w-2 h-2 rounded-full ${
                dbConnectedStatus === 'conectado' ? 'bg-emerald-500 animate-pulse' :
                dbConnectedStatus === 'conectando' ? 'bg-amber-500 animate-bounce' :
                'bg-rose-500'
              }`}></span>
              <span className="text-[9px] font-black uppercase text-slate-700">
                {dbConnectedStatus === 'conectado' ? 'Activo' :
                 dbConnectedStatus === 'conectando' ? 'Buscando' :
                 'Caído'}
              </span>
            </div>
          </div>
        </div>

        {dbConnectedStatus === 'error' && (
          <div className="mt-5 p-4 bg-rose-50 rounded-2xl border border-rose-100/60 flex gap-3 text-rose-700 items-start animate-in fade-in">
            <div className="text-[9px] font-black uppercase tracking-widest bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200">Error</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] md:text-xs font-bold font-mono tracking-tight leading-relaxed select-all">
                {dbConnectionErrorMessage || 'No se pudo establecer conexión con Firebase Firestore. Verifique la conexión.'}
              </p>
            </div>
          </div>
        )}
      </div>

       {/* Maintenance Reset card but extremely premium */}
       <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 md:p-8 rounded-[36px] text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 text-white/5 -translate-y-6 md:-translate-y-12 translate-x-6 md:translate-x-12 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
            <div className="space-y-1.5 text-left">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-violet-100 block">Operaciones Técnicas</span>
              <h2 className="text-xl md:text-2xl font-display font-black leading-none">Datos & Estructura</h2>
              <p className="text-violet-100 text-[10px] md:text-xs max-w-2xl font-medium leading-tight">
                Control técnico de tablas. Solo utilizar para reinstalación o restauración de productos base desconfigurados.
              </p>
            </div>
            <button 
              onClick={() => requestConfirmation(
                'Inicializar Tablas', 
                'Esto restaurará las mesas y productos base si están vacíos. ¿Continuar?', 
                seedDatabase
              )}
              className="bg-white text-violet-700 border border-white/90 px-6 py-3.5 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-violet-50 hover:text-violet-850 active:scale-98 transition-all flex items-center justify-center gap-1.5 self-start md:self-auto"
            >
              <Database className="w-3.5 h-3.5" />
              Reiniciar Tablas
            </button>
          </div>
       </div>

       {/* Schema list */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
         <SchemaTable 
           title="Tabla: Productos"
           description="Catálogo maestro de alimentos y bebidas."
           fields={[
             { name: 'id', type: 'string', desc: 'UUID único del producto autogenerado.' },
             { name: 'nombre', type: 'string', desc: 'Nombre del alimento (Ej: Lomo Saltado).' },
             { name: 'precio', type: 'number', desc: 'Monto base sugerido para las comandas.' },
             { name: 'categoria', type: 'enum', desc: 'Restricción: MENÚ, EXTRA, BEBIDA.' },
             { name: 'tipo', type: 'enum', desc: 'Subtipo del menú: SOPA, SEGUNDO.' }
           ]}
         />
         <SchemaTable 
           title="Tabla: Pedidos"
           description="Registro transaccional de ventas realizadas."
           fields={[
             { name: 'id', type: 'string', desc: 'ID correlativo correlacionado.' },
             { name: 'mesaId', type: 'string', desc: 'Referencia a Mesa (ID) o Llevar.' },
             { name: 'cliente', type: 'string', desc: 'Nombre del titular de la cuenta.' },
             { name: 'items', type: 'array', desc: 'Arreglo con platos, cantidades y precios.' },
             { name: 'total', type: 'number', desc: 'Cálculo total a cobrar.' },
             { name: 'estado', type: 'enum', desc: 'Estado: ABIERTO, PAGADO, CREDITO.' },
             { name: 'fecha', type: 'string', desc: 'Identificador de la jornada (DD/MM/YYYY).' }
           ]}
         />
         <SchemaTable 
           title="Tabla: InventarioDiario"
           description="Control de existencias por jornada de trabajo."
           fields={[
             { name: 'productoId', type: 'string', desc: 'Identificador del producto en catálogo.' },
             { name: 'fecha', type: 'string', desc: 'Identificador de sesión (DD/MM/YYYY).' },
             { name: 'stockInicial', type: 'number', desc: 'Abastecimiento programado en la mañana.' },
             { name: 'stockActual', type: 'number', desc: 'Saldo actual actualizado tras ventas.' }
           ]}
         />
         <SchemaTable 
           title="Tabla: Clientes"
           description="Relación de deudores y créditos."
           fields={[
             { name: 'id', type: 'string', desc: 'Identificador único del titular.' },
             { name: 'nombre', type: 'string', desc: 'Razón social o nombre para créditos.' },
             { name: 'deuda', type: 'number', desc: 'Saldo pendiente neto acumulado.' },
             { name: 'historial', type: 'array', desc: 'Timeline de aportes, depósitos y consumos.' }
           ]}
         />
       </div>
    </div>
  );
}
