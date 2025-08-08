// app/page.tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/calendar') // También puede ser /login si querés forzar autenticación
}
