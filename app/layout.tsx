import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "resaleanything — buy & sell used stuff near you",
  description: "An original classifieds marketplace for pre-owned goods.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          resaleanything — an original demo marketplace. Not affiliated with any other classifieds site.
        </footer>
      </body>
    </html>
  );
}
