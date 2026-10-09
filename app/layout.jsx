import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "RentMitra",
  description: "Manage properties, track rent, get paid.",
  icons: { icon: "/favicon.svg" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RentMitra",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
