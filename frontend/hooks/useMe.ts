// /frontend/hooks/useMe.ts
export { useMe } from '@/app/context/AuthContext';

// Para máxima compatibilidad con imports "default" antiguos:
import { useMe as _useMe } from '@/app/context/AuthContext';
export default _useMe;
