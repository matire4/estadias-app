'use client';
import EstadiaForm from '../../EstadiaForm';
import { useEffect } from 'react';

export default function EditEstadiaPage({ params }: { params: { id: string } }) {
  const idNum = Number(params.id);
  useEffect(() => {
    console.log('[EDIT route] params.id =', params.id, '→ idNum =', idNum);
  }, [params.id, idNum]);
  return <EstadiaForm editingId={Number.isFinite(idNum) ? idNum : undefined} />;
}
