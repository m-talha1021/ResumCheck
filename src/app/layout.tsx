import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumCheck | Free ATS Resume Checker & Analyzer",
  description:
    "Check and analyze your resume with our ATS Resume Checker. Get an ATS score, identify missing keywords, improve resume formatting, and make your CV more ATS-friendly.",
  robots: "index, follow",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
