import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Invictus Venice",
  description: "Chat privado con texto e imagenes usando Venice AI.",
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
