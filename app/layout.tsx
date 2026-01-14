import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tenpesorun",
  description: "Campus snack ordering app (guest checkout) powered by Supabase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900">
        {children}
      </body>
    </html>
  );
}
