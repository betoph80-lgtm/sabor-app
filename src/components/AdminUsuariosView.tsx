import React, { useState } from 'react';
import { useApp } from '../AppContext.tsx';
import { Role, AppUser } from '../types.ts';
import { Users, Plus, Edit3, Trash2, X } from 'lucide-react';

export default function AdminUsuariosView() {
  const {
    appUsers, addAppUser, updateAppUser, deleteAppUser
  } = useApp();

  const [newUser, setNewUser] = useState({ nombre: '', usuario: '', role: 'MESERO' as Role, pin: '' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openCreateModal = () => {
    setEditingUserId(null);
    setEditUserForm(null);
    setNewUser({ nombre: '', usuario: '', role: 'MESERO' as Role, pin: '' });
    setIsModalOpen(true);
  };

  const startEditUser = (user: AppUser) => {
    setEditingUserId(user.id);
    setEditUserForm({ ...user });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUserId(null);
    setEditUserForm(null);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.nombre.trim() && newUser.usuario.trim() && newUser.pin.length === 4) {
      addAppUser(newUser);
      closeModal();
    }
  };

  const handleUpdateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUserId && editUserForm) {
      updateAppUser(editingUserId, editUserForm);
      closeModal();
    }
  };

  // Profile icon colors based on Role
  const getRoleTheme = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return { text: 'text-brand-700 dark:text-brand-300 font-extrabold', bg: 'bg-brand-100 dark:bg-brand-950/80 border-brand-200 dark:border-brand-800', gradient: 'from-brand-500 to-indigo-500' };
      case 'CAJA':
        return { text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800', gradient: 'from-emerald-500 to-teal-500' };
      case 'COCINA':
        return { text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800', gradient: 'from-amber-500 to-orange-500' };
      default:
        return { text: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-100 dark:bg-sky-950/80 border-sky-200 dark:border-sky-800', gradient: 'from-sky-500 to-blue-500' };
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.015)] border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400 block mb-1">
            Permisos de Acceso
          </span>
          <h3 className="text-xl font-display font-black text-slate-800 dark:text-white tracking-tight leading-none">
            Planilla de Personal ({appUsers.length})
          </h3>
        </div>

        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto px-5 py-3 bg-brand-600 hover:bg-brand-700 active:scale-98 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-brand-200 dark:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nuevo Personal
        </button>
      </div>

      {/* Staff Roster Grid */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[32px] p-5 md:p-6 border border-slate-200/40 dark:border-slate-800 min-h-[300px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {appUsers.map(user => {
            const theme = getRoleTheme(user.role);
            const initials = user.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            return (
              <div 
                key={user.id} 
                className="bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all duration-300 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 font-display font-black text-xs ${theme.bg} ${theme.text} shadow-xs group-hover:scale-105 transition-all`}>
                    {initials}
                  </div>
                  
                  <div className="min-w-0 text-left">
                    <h4 className="text-[13px] font-black text-slate-800 dark:text-slate-100 truncate leading-tight">
                      {user.nombre}
                    </h4>
                    <div className="flex gap-1.5 items-center mt-1">
                      <span className={`text-[7.5px] font-black px-2 py-0.5 rounded-full uppercase border tracking-wider ${theme.bg} ${theme.text}`}>
                        {user.role}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 font-mono">
                        @{user.usuario}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 pl-2">
                  <button 
                    onClick={() => startEditUser(user)}
                    className="p-2 hover:bg-brand-50 dark:hover:bg-brand-950/60 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl transition-all cursor-pointer"
                    title="Editar privilegios"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteAppUser(user.id)}
                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-all cursor-pointer"
                    title="Eliminar usuario"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FLOATING MODAL FORM FOR NEW / EDIT USER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-6 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400 block mb-1">
                Permisos de Acceso
              </span>
              <h3 className="text-xl font-display font-black text-slate-800 dark:text-white tracking-tight leading-none">
                {editingUserId ? 'Editar Personal' : 'Alta de Personal'}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1.5 leading-tight">
                Registra o modifica las credenciales y PIN de autenticación.
              </p>
            </div>

            <form onSubmit={editingUserId ? handleUpdateUserSubmit : handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={editingUserId ? editUserForm.nombre : newUser.nombre}
                  onChange={(e) => editingUserId 
                    ? setEditUserForm({...editUserForm, nombre: e.target.value})
                    : setNewUser({...newUser, nombre: e.target.value})
                  }
                  placeholder="Ej. Juan Pérez"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1">ID / Nombre de Usuario login</label>
                <input 
                  type="text" 
                  value={editingUserId ? editUserForm.usuario : newUser.usuario}
                  onChange={(e) => {
                    const sanitized = e.target.value.toLowerCase().replace(/\s/g, '');
                    if (editingUserId) {
                      setEditUserForm({...editUserForm, usuario: sanitized});
                    } else {
                      setNewUser({...newUser, usuario: sanitized});
                    }
                  }}
                  placeholder="Ej. juan.p"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1">Rol en el Establecimiento</label>
                <select 
                  value={editingUserId ? editUserForm.role : newUser.role}
                  onChange={(e) => {
                    const val = e.target.value as Role;
                    if (editingUserId) {
                      setEditUserForm({...editUserForm, role: val});
                    } else {
                      setNewUser({...newUser, role: val});
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 outline-none transition-all"
                >
                  <option value="MESERO">MESERO (Salón)</option>
                  <option value="COCINA">COCINA (Preparaciones)</option>
                  <option value="CAJA">CAJA (Pagos & Cuadres)</option>
                  <option value="ADMIN">ADMINISTRADOR (Gestión)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1">Código PIN Secreto (4 dígitos)</label>
                <input 
                  type="password" 
                  maxLength={4}
                  value={editingUserId ? editUserForm.pin : newUser.pin}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    if (editingUserId) {
                      setEditUserForm({...editUserForm, pin: digits});
                    } else {
                      setNewUser({...newUser, pin: digits});
                    }
                  }}
                  placeholder="****"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 outline-none tracking-widest text-center transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl py-3.5 font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3.5 font-black uppercase text-[10px] tracking-widest shadow-md shadow-brand-200 dark:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {editingUserId ? 'Guardar Cambios' : 'Crear Ficha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
