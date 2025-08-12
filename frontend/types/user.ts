export type UserRole = 'normal' | 'admin' | 'programador';
export interface User { id: number; nombre: string; email: string; rol: UserRole }
export interface UpsertUserDTO { nombre: string; email: string; rol: UserRole; password?: string }
