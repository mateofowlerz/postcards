import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { SITE_URL, socialMetadata } from '@/lib/social-metadata';
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...socialMetadata(),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
