import React, { useState } from 'react';
import { useApp } from '../AppContext.tsx';
import { Role, AppUser } from '../types.ts';
import { Users, Plus, Edit3, Trash2, Shield, UserCheck, Key } from 'lucide-react';

export default function AdminUsuariosView() {
  const {
    appUsers, addAppUser, updateAppUser, deleteAppUser
  } = useApp();

  const [newUser, setNewUser] = useState({ nombre: '', usuario: '', role: 'MESERO' as Role, pin: '' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<any>(null);

  const startEditUser = (user: AppUser) => {
    setEditingUserId(user.id);
    setEditUserForm({ ...user });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.nombre.trim() && newUser.usuario.trim() && newUser.pin.length === 4) {
      addAppUser(newUser);
      setNewUser({ nombre: '', usuario: '', role: 'MESERO' as Role, pin: '' });
    }
  };

  const handleUpdateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUserId && editUserForm) {
      updateAppUser(editingUserId, editUserForm);
      setEditingUserId(null);
      setEditUserForm(null);
    }
  };

  // Profile icon colors based on Role
  const getRoleTheme = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return { text: 'text-violet-700', bg: 'bg-violet-100 border-violet-200', gradient: 'from-violet-500 to-indigo-500' };
      case 'CAJA':
        return { text: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', gradient: 'from-emerald-500 to-teal-500' };
      case 'COCINA':
        return { text: 'text-amber-700', bg: 'bg-amber-100 border-amber-200', gradient: 'from-amber-500 to-orange-500' };
      default:
        return { text: 'text-sky-700', bg: 'bg-sky-100 border-sky-200', gradient: 'from-sky-500 to-blue-500' };
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* User Editor Form Column */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.01)] border border-slate-100 h-fit space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-violet-600 block mb-1">Permisos de Acceso</span>
            <h3 className="text-xl font-display font-black text-slate-800 tracking-tight leading-none">
              {editingUserId ? 'Editar Token' : 'Alta de Personal'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1.5 leading-tight">Registra nuevos operadores con credenciales y PIN de autenticación.</p>
          </div>

          <form onSubmit={editingUserId ? handleUpdateUserSubmit : handleCreateUser} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Nombre Completo</label>
              <input 
                type="text" 
                value={editingUserId ? editUserForm.nombre : newUser.nombre}
                onChange={(e) => editingUserId 
                  ? setEditUserForm({...editUserForm, nombre: e.target.value})
                  : setNewUser({...newUser, nombre: e.target.value})
                }
                placeholder="Ej. Juan Pérez"
                required
                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:border-violet-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">ID / Nombre de Usuario login</label>
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
                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:border-violet-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Rol en el Establecimiento</label>
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
                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:border-violet-500 outline-none transition-all"
              >
                <option value="MESERO">MESERO (Salón)</option>
                <option value="COCINA">COCINA (Preparaciones)</option>
                <option value="CAJA">CAJA (Pagos & Cuadres)</option>
                <option value="ADMIN">ADMINISTRADOR (Gestión)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Código PIN Secreto (4 dígitos)</label>
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
                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:border-violet-500 outline-none tracking-widest text-center transition-all"
              />
            </div>

            <div className="flex gap-2 pt-2">
              {editingUserId && (
                <button 
                  type="button"
                  onClick={() => {
                    setEditingUserId(null);
                    setEditUserForm(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-250 text-slate-500 rounded-xl py-3.5 font-black uppercase text-[9px] tracking-wider transition-all"
                >
                  Cancelar
                </button>
              )}
              <button 
                type="submit" 
                className="flex-[2] bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-3.5 font-black uppercase text-[9px] tracking-wider shadow-md shadow-violet-100 active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                {editingUserId ? 'Guardar Cambios' : 'Crear Ficha'}
              </button>
            </div>
          </form>
        </div>

        {/* Users List Column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-600" />
              <h3 className="text-base font-display font-black text-slate-800 uppercase tracking-wider">Planilla de Trabajadores Activos</h3>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-3 py-1 bg-violet-50 text-violet-700 border border-violet-100/40 rounded-full">
              {appUsers.length} Empleados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appUsers.map(user => {
              const theme = getRoleTheme(user.role);
              // Initials for avatar
              const initials = user.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

              return (
                <div 
                  key={user.id} 
                  className="bg-white rounded-[24px] p-5 border border-slate-150/50 shadow-[0_4px_14px_rgba(0,0,0,0.015)] hover:shadow-md transition-all duration-300 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Visual Avatar */}
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 font-display font-black text-xs ${theme.bg} ${theme.text} shadow-sm transition-all duration-300 group-hover:scale-105`}>
                      {initials}
                    </div>
                    
                    <div className="min-w-0 text-left">
                      <h4 className="text-[12.5px] font-black text-slate-800 truncate leading-tight">
                        {user.nombre}
                      </h4>
                      <div className="flex gap-1.5 items-center mt-1">
                        <span className={`text-[7.5px] font-black px-2 py-0.5 rounded-full uppercase border tracking-wider ${theme.bg} ${theme.text}`}>
                          {user.role}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 font-mono">
                          @{user.usuario}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 pl-2">
                    <button 
                      onClick={() => startEditUser(user)}
                      className="p-2 hover:bg-slate-50 text-slate-400 hover:text-violet-600 rounded-xl transition-all"
                      title="Editar privilegios"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteAppUser(user.id)}
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
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

      </div>

    </div>
  );
}
