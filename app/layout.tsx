import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";
import "./theme.css";
import "./brand.css";
import "./date-range.css";
import "./simple.css";
import "./terminal.css";
import "./budget-focus.css";
import "./sidebar.css";
import "./debt-focus.css";
import "./debt-playground.css";
import "./app-surface.css";
import "./budget-clarity.css";
import "./command-center.css";
import "./revenue.css";
import "./home-hub.css";
import "./landing.css";
import "./workspace.css";
import { themeBootstrap } from '@/lib/theme';

export const metadata: Metadata = {
  title: "Budget OS — lugnare ekonomi",
  description: "Din privata översikt för budget, transaktioner, skulder och sparande.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.svg?v=balance-1",
    shortcut: "/favicon.svg?v=balance-1",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:themeBootstrap}}/></head>
      <body className="antialiased"><ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" afterSignOutUrl="/">{children}</ClerkProvider></body>
    </html>
  );
}
