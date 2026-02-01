import "@fontsource/inter/latin.css";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FDS - Final Destination Services",
  description: "Handling things. Quietly - Campus convenience powered by Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-stone-50/30 via-white to-stone-50/20 font-sans antialiased">
        <div className="relative min-h-screen p-4 sm:p-6 lg:p-8">{children}</div>
      </body>
    </html>
  );
}


