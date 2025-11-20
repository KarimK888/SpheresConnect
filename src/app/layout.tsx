import type { Metadata } from "next";
import { Space_Grotesk, PT_Sans } from "next/font/google";
import "../styles/globals.css";
import { SessionProvider } from "../context/session";
import { ThemeProvider } from "../context/theme";
import { I18nProvider } from "../context/i18n";
import { AppShell } from "../components/layout/AppShell";
import { NotificationsProvider } from "../context/notifications";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

const bodyFont = PT_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "700"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "SpheraConnect",
  description:
    "Hybrid ecosystem for artists and buyers to connect, collaborate, and transact."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} bg-background text-muted-foreground antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <SessionProvider>
            <I18nProvider>
              <NotificationsProvider>
                <AppShell>{children}</AppShell>
              </NotificationsProvider>
            </I18nProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
