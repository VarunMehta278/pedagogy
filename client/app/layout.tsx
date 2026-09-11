import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pedagogy — College Event Management",
    template: "%s · Pedagogy",
  },
  description:
    "Discover campus events, register in seconds, check in with a QR code and collect verifiable certificates — all in one place.",
  keywords: [
    "college events",
    "event management",
    "student portal",
    "campus",
    "certificates",
  ],
  openGraph: {
    title: "Pedagogy — College Event Management",
    description:
      "Discover campus events, register in seconds, check in with a QR code and collect verifiable certificates.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#14131c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    /*
     * suppressHydrationWarning is required here and only here:
     * next-themes writes the theme class onto <html> before React
     * hydrates, so the server and client markup differ by design.
     */
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Keyboard users can jump past the navigation. */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
          >
            Skip to content
          </a>

          {children}

          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
