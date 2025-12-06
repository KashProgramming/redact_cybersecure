import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cyber secure",
  description: "Cyber secure application",
};

import { AnalyzeProvider } from "@/contexts/AnalyzeContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { MonitorProvider } from "@/contexts/MonitorContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
       <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AnalyzeProvider>
          <DashboardProvider>
                <AnalyticsProvider>
                  <MonitorProvider>
          <Navbar />
          {children}
          </MonitorProvider>
                </AnalyticsProvider>
              </DashboardProvider>
        </AnalyzeProvider>

      </body>
    </html>
  );
}
