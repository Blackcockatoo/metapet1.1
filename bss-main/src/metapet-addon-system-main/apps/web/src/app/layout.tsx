import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import { APP_NAME } from "@bluesnake-studios/config";

import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display"
});

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Official BlueSnake Studios scaffold for Meta-Pet add-ons."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
