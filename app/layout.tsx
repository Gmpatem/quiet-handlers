import type { Metadata } from "next";
import "./globals.css";
import AuthHeal from "@/components/AuthHeal";

export const metadata: Metadata = {
  title: "tenpesorun",
  description: "Campus snack ordering app (guest checkout) powered by Supabase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white text-slate-900 antialiased">
        <AuthHeal />
        {children}
      </body>
    </html>
  );
}
