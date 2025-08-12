'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Departamento } from '@/types/catalogos';

export function useDepartamentos() {
  const [items, setItems] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setLoading(true); setErr(null);
      const data = await api.get<Departamento[]>('/departamentos');
      setItems(data);
    } catch (e:any) { setErr(e.message); } finally { setLoading(false); }
  }, []);

  const create = useCallback(async (dto: { nro: string; id_propietario?: number | null }) => {
    await api.post<Departamento>('/departamentos', dto);
    await load();
  }, [load]);

  useEffect(()=>{ load(); }, [load]);

  return { items, loading, err, reload: load, create };
}
