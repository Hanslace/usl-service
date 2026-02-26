import type { Metadata } from "next";
import "./globals.css";

import { Poppins, Space_Grotesk } from "next/font/google";


const poppins = Poppins({
  subsets: ["latin"],          // latin is safest and fastest
  weight: ["400", "500", "600", "700"], // choose the weights you’ll use
  variable: "--font-poppins",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-spaceGrotesk",
  display: "swap",
});


export const metadata: Metadata = {
  title: "Mealio USL — Unified Signup Login",
  description:
    "Unified Signup Login powering Mealio authentication, authorization, sessions, tokens, and service-to-service identity.",
  keywords: [
    "Mealio USL",
    "authentication",
    "authorization",
    "JWT",
    "sessions",
    "microservices security",
  ],
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Mealio USL — Unified Signup Login",
    description:
      "Internal identity and access layer for Mealio microservices.",
    type: "website",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${poppins.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
