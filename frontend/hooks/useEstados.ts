'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Estado } from '@/types/catalogos';

export function useEstados() {
  const [items, setItems] = useState<Estado[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setLoading(true); setErr(null);
      const data = await api.get<Estado[]>('/estados');
      setItems(data);
    } catch (e:any) { setErr(e.message); } finally { setLoading(false); }
  }, []);

  const create = useCallback(async (dto: Estado) => {
    await api.post<Estado>('/estados', dto);
    await load();
  }, [load]);

  useEffect(()=>{ load(); }, [load]);

  return { items, loading, err, reload: load, create };
}
