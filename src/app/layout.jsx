import "./globals.css";
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: "UtilityHub — Free Image Tools",
  description: "Fast, free, browser-based image tools. No uploads to servers. Your files stay on your device.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
