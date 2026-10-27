import type { Metadata } from "next";
import { Nunito, Onest } from "next/font/google";
import { Suspense } from "react";
import { I18nRoot } from "@/components/i18n/root";
import "./globals.css";

// latin-ext: o'zbek lotin harflari (oʻ, gʻ) uchun; cyrillic: rus tili uchun
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["600", "700", "800", "900"],
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["600"],
});

// Sarlavha til-neytral (brend nomi): til cookie'da, metadata statik qoladi.
export const metadata: Metadata = {
  title: "Milliy sertifikat · Matematika (mock)",
  description: "Milliy sertifikat (Matematika) mock imtihoni · Mock exam · Мок-экзамен",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" className={`${nunito.variable} ${onest.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Til cookie'dan o'qiladi (runtime ma'lumot): butun ilova shu chegara ichida oqib keladi */}
        <Suspense fallback={null}>
          <I18nRoot>{children}</I18nRoot>
        </Suspense>
      </body>
    </html>
  );
}
