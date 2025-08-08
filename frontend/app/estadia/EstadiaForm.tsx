// ✅ app/estadia/EstadiaForm.tsx
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Estadia {
  departamento: string;
  inquilino: string;
  fecha_desde: string;
  fecha_hasta: string;
}

interface Props {
  editingId?: string;
}

export default function EstadiaForm({ editingId }: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState<Estadia>({
    departamento: '',
    inquilino: '',
    fecha_desde: '',
    fecha_hasta: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingId) {
      const fetchEstadia = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/estadias/${editingId}`);
          if (!res.ok) throw new Error('Error al obtener la estadía');
          const data = await res.json();
          setFormData(data);
        } catch (err) {
          setError('No se pudo cargar la estadía');
        }
      };
      fetchEstadia();
    }
  }, [editingId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/estadias${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Error al guardar la estadía');
      router.push('/calendar');
    } catch (err) {
      setError('Hubo un error al guardar la estadía');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-4">{editingId ? 'Editar Estadía' : 'Nueva Estadía'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="departamento"
          value={formData.departamento}
          onChange={handleChange}
          required
          placeholder="Departamento"
          className="w-full p-2 border rounded"
        />
        <input
          name="inquilino"
          value={formData.inquilino}
          onChange={handleChange}
          required
          placeholder="Inquilino"
          className="w-full p-2 border rounded"
        />
        <input
          type="date"
          name="fecha_desde"
          value={formData.fecha_desde}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded"
        />
        <input
          type="date"
          name="fecha_hasta"
          value={formData.fecha_hasta}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded"
        />
        {error && <p className="text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
        </button>
      </form>
    </div>
  );
}
