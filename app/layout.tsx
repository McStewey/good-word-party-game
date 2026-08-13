import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Good Word — A Christian Party Game",
  description: "A hilarious, wholesome multiplayer party game for the whole family, youth groups, and small groups.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
