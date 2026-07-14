import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agora de Acuario",
  description: "Canal privado con Venice AI, Firebase Storage y Vercel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
