import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Postcards — Split Rock",
  description: "A vintage postcard from Split Rock, Lake Harmony, Pennsylvania.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
