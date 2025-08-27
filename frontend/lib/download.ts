// frontend/lib/download.ts
export async function downloadGet(path: string, filename: string) {
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const url = `${base}${path}`;
  
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Fallo al descargar: ${res.status}`);
    }
  
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
  }
  