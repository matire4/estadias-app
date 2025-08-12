export type Propietario = { id: number; nombre: string; dni_cuit?: string | null; telefono?: string | null };
export type Departamento = { id: number; nro: string; propietario?: string | null; id_propietario?: number | null };
export type Estado = { id: string; nombre: string };
export type Tipo = { id: string; nombre: string };
