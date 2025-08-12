'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '@/hooks/useMe';
import { useUsers } from '@/hooks/useUsers';
import { User, UpsertUserDTO } from '@/types/user';

export default function UsersPage() {
  const { me } = useMe();
  const router = useRouter();

  // Guardia: si no sos programador, te saco a /calendar (o a donde quieras)
  useEffect(() => {
    if (me && me.rol !== 'programador') router.replace('/calendar');
  }, [me, router]);

  const { items, loading, err, create, update, remove } = useUsers();
  const [editing, setEditing] = useState<User | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(dto: UpsertUserDTO) {
    if (editing) await update(editing.id, dto);
    else await create(dto);
    setEditing(null); setMsg('OK'); setTimeout(()=>setMsg(null), 1200);
  }

  if (!me) return <div>Cargando…</div>;
  if (me.rol !== 'programador') return null; // redirigido en el efecto

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <button onClick={()=>setEditing({} as any)} className="px-4 py-2 rounded-xl bg-blue-600 text-white">Nuevo</button>
      </div>
      {msg && <div className="bg-emerald-50 border p-2 rounded text-sm">Operación exitosa</div>}
      {err && <div className="bg-red-50 border p-2 rounded text-sm text-red-700">{err}</div>}
      {loading ? 'Cargando…' : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Rol</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(u=>(
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2">{u.nombre}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2 capitalize">{u.rol}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button onClick={()=>setEditing(u)} className="px-3 py-1 rounded bg-gray-100">Editar</button>
                    <button onClick={()=>remove(u.id)} className="px-3 py-1 rounded bg-red-100">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <UserForm
          initial={editing?.id ? editing : undefined}
          onCancel={()=>setEditing(null)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

function UserForm({ initial, onSubmit, onCancel }:{
  initial?: Partial<User>, onSubmit:(dto:UpsertUserDTO)=>Promise<void>|void, onCancel:()=>void
}) {
  const [nombre, setNombre] = useState(initial?.nombre || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [rol, setRol] = useState<UpsertUserDTO['rol']>((initial?.rol as any) || 'normal');
  const [password, setPassword] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <form
        onSubmit={async e=>{e.preventDefault(); await onSubmit({ nombre, email, rol, ...(password?{password}:{} )});}}
        className="bg-white rounded-2xl w-full max-w-md p-6 space-y-3 shadow-xl"
      >
        <h2 className="text-lg font-semibold">{initial?.id ? 'Editar usuario' : 'Nuevo usuario'}</h2>
        <div>
          <label className="text-sm">Nombre</label>
          <input className="w-full border rounded px-3 py-2" value={nombre} onChange={e=>setNombre(e.target.value)} required/>
        </div>
        <div>
          <label className="text-sm">Email</label>
          <input className="w-full border rounded px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
        </div>
        <div>
          <label className="text-sm">Rol</label>
          <select className="w-full border rounded px-3 py-2" value={rol} onChange={e=>setRol(e.target.value as any)}>
            <option value="normal">normal</option>
            <option value="admin">admin</option>
            <option value="programador">programador</option>
          </select>
        </div>
        <div>
          <label className="text-sm">Contraseña {initial?.id ? '(opcional)' : ''}</label>
          <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-2 rounded bg-gray-100">Cancelar</button>
          <button className="px-3 py-2 rounded bg-green-600 text-white">{initial?.id ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    </div>
  );
}
