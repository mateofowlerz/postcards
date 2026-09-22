import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { GoogleAnalytics } from "@/components/google-analytics";
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

const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>{children}</body>
      {googleAnalyticsId ? (
        <GoogleAnalytics measurementId={googleAnalyticsId} />
      ) : null}
    </html>
  );
}
