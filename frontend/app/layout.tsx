// app/layout.tsx
export const metadata = {
    title: 'Gestión de Estadías',
    description: 'Aplicación para administrar estadías, movimientos y usuarios.',
  };
  
  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <html lang="es">
        <body className="bg-gray-100 text-gray-900">
          {children}
        </body>
      </html>
    );
  }
  