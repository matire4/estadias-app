'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { User, UpsertUserDTO } from '@/types/user';

export function useUsers() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setLoading(true); setErr(null);
      const data = await api.get<User[]>('/users');
      setItems(data);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  const create = useCallback(async (dto: UpsertUserDTO) => { await api.post<User>('/users', dto); await load(); }, [load]);
  const update = useCallback(async (id: number, dto: UpsertUserDTO) => { await api.put<User>(`/users/${id}`, dto); await load(); }, [load]);
  const remove = useCallback(async (id: number) => { await api.del(`/users/${id}`); await load(); }, [load]);

  useEffect(() => { load(); }, [load]);

  return { items, loading, err, reload: load, create, update, remove };
}
