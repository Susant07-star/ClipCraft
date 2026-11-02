import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ClipCraft Studio — Short-Form Creator Studio",
  description:
    "Create and review short-form stories, video prompts, thumbnails, and publishing metadata.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-[#0a0a0f] text-white`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
