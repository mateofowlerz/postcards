import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Postcards — Split Rock",
  description: "A vintage postcard from Split Rock, Lake Harmony, Pennsylvania.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
