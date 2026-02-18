import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import UserMenu from "@/components/auth/UserMenu";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Layers } from "lucide-react";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://scheduler.subconscious.dev"),
  title: "Agent Scheduler | Subconscious",
  description: "Schedule and run Subconscious AI agents on autopilot",
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  openGraph: {
    title: "Agent Scheduler | Subconscious",
    description: "Schedule and run Subconscious AI agents on autopilot",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" translate="no">
        <head>
          <meta name="google" content="notranslate" />
        </head>
        <body className={`${manrope.variable} ${jetbrainsMono.variable} font-[family-name:var(--font-manrope)] antialiased`}>
          <ConvexClientProvider>
            <nav className="sticky top-0 z-40 border-b border-edge/60 bg-ink/90 backdrop-blur-xl">
              <div className="flex h-14 items-center justify-between px-8">
                <Link href="/dashboard" className="flex items-center gap-3">
                  <Image src="/Subconscious_Logo.png" alt="Subconscious" width={140} height={26} priority style={{ objectFit: "contain" }} />
                  <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">Scheduler</span>
                </Link>
                <div className="flex items-center gap-2">
                  <a href="https://docs.subconscious.dev" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-subtle transition-colors hover:bg-surface hover:text-cream">
                    <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Docs
                  </a>
                  <a href="https://github.com/subconscious-systems/subconscious-python" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-subtle transition-colors hover:bg-surface hover:text-cream">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 448 512" fill="currentColor"><path d="M439.8 200.5c-7.7-30.9-22.3-54.2-53.4-54.2h-40.1v47.4c0 36.8-31.2 67.8-66.8 67.8H172.7c-29.2 0-53.4 25-53.4 54.3v101.8c0 29 25.2 46 53.4 54.3 33.8 9.9 66.3 11.7 106.8 0 26.9-7.8 53.4-23.5 53.4-54.3v-40.7H226.2v-13.6h160.2c31.1 0 42.6-21.7 53.4-54.2 11.2-33.5 10.7-65.7 0-108.6zM286.2 404c11.1 0 20.1 9.2 20.1 20.5 0 11.4-9 20.7-20.1 20.7-11 0-20.1-9.2-20.1-20.7-.1-11.3 9-20.5 20.1-20.5zM167.8 248.1h106.8c29.7 0 53.4-25.7 53.4-54.3V91.9c0-29-23.6-50.7-53.4-55.6-35.8-5.9-74.7-5.6-106.8.1-45.2 8-53.4 24.7-53.4 55.6v40.7h106.9v13.6h-147c-31.1 0-58.3 18.7-66.8 54.2-9.8 40.7-10.2 66.1 0 108.6 7.6 31.6 25.7 54.2 56.8 54.2H101v-48.8c0-35.3 30.5-66.4 66.8-66.4zm-6.7-142.6c-11.1 0-20.1-9.2-20.1-20.5 0-11.4 9-20.7 20.1-20.7 11 0 20.1 9.2 20.1 20.7 0 11.3-9 20.5-20.1 20.5z"/></svg>
                    Python
                  </a>
                  <a href="https://github.com/subconscious-systems/subconscious-node" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-subtle transition-colors hover:bg-surface hover:text-cream">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/></svg>
                    Node.js
                  </a>
                  <a href="https://www.subconscious.dev/platform" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-sm font-medium text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand/90">
                    <Layers className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Platform
                  </a>
                  <div className="mx-3 h-5 w-px bg-edge/60" />
                  <UserMenu />
                </div>
              </div>
            </nav>
            {children}
            <Analytics />
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
