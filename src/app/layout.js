import "./globals.css";

export const metadata = {
  title: "Examen de Nivelación | SET",
  description: "Prototipo inicial del examen de nivelación",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
