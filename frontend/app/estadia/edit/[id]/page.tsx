// app/estadia/edit/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import EstadiaForm from "../../EstadiaForm";

export default function EditEstadiaPage() {
  const { id } = useParams();
  return <EstadiaForm editingId={id as string} />;
}
