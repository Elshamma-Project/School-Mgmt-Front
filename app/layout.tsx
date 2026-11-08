import type { ReactNode } from "react";
import "./globals.css";

type RootLayoutProps = {
  children: ReactNode;
};

/** Root layout minimal — html/lang sont dans `app/[locale]/layout.tsx`. */
export default function RootLayout({ children }: RootLayoutProps) {
  return children;
}
