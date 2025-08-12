'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Propietario } from '@/types/catalogos';

export function usePropietarios() {
  const [items, setItems] = useState<Propietario[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setLoading(true); setErr(null);
      const data = await api.get<Propietario[]>('/propietarios');
      setItems(data);
    } catch (e:any) { setErr(e.message); } finally { setLoading(false); }
  }, []);

  const create = useCallback(async (dto: Partial<Propietario>) => {
    await api.post<Propietario>('/propietarios', dto);
    await load();
  }, [load]);

  useEffect(()=>{ load(); }, [load]);

  return { items, loading, err, reload: load, create };
}
