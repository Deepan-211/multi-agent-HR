import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "LocalizeAI | AI-Powered Multilingual Content Localization Engine",
  description:
    "Translate and localize your skill course video transcripts and PDF documents in real-time with state-of-the-art translation models.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg-primary text-text-main flex flex-col antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
