import "./globals.css";

export const metadata = {
  title: "UtilityHub — Free Image Tools",
  description: "Fast, free, browser-based image tools. No uploads to servers. Your files stay on your device.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
