import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "RELIC — find the connections between excavation reports",
  description: "Semantic similarity and clustering across archaeological excavation reports.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=DM+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
