import type { Metadata } from "next";
import { JetBrains_Mono, Outfit, Yanone_Kaffeesatz } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const yanoneKaffeesatz = Yanone_Kaffeesatz({
  variable: "--font-yanone-kaffeesatz",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Board Game House",
  description: "Multiplayer Monopoly — play online with friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrainsMono.variable} ${yanoneKaffeesatz.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
