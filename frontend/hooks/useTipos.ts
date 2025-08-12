'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Tipo } from '@/types/catalogos';

export function useTipos() {
  const [items, setItems] = useState<Tipo[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setLoading(true); setErr(null);
      const data = await api.get<Tipo[]>('/tipos');
      setItems(data);
    } catch (e:any) { setErr(e.message); } finally { setLoading(false); }
  }, []);

  const create = useCallback(async (dto: Tipo) => {
    await api.post<Tipo>('/tipos', dto);
    await load();
  }, [load]);

  useEffect(()=>{ load(); }, [load]);

  return { items, loading, err, reload: load, create };
}
