'use client';
import MovimientoForm from '../../MovimientoForm';

export default function EditMovimientoPage({ params }: { params: { id: string } }) {
  const idNum = Number(params.id);
  return <MovimientoForm editingId={Number.isFinite(idNum) ? idNum : undefined} />;
}
