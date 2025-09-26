import "monday-ui-style/dist/index.min.css";
import "~/styles/globals.css";

import { Inter } from "next/font/google";

import { cn } from "~/lib/utils";
import { AppSidebar } from "./_components/app-sidebar";
import { SiteHeader } from "./_components/site-header";
import { SidebarInset } from "./_components/ui/sidebar";
import { Toaster } from "./_components/ui/toaster";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "FDOT Inventory",
  description: "FDOT Inventory",
  icons: [{ rel: "icon", url: "/favicon.jpeg" }],
};

// const geistSans = Geist({
//   subsets: ["latin"],
//   variable: "--font-geist-sans",
// });
// const geistMono = Geist_Mono({
//   subsets: ["latin"],
//   variable: "--font-geist-mono",
// });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`font-sans ${inter.variable} flex min-h-screen flex-1 flex-col bg-slate-50`}
      >
        <Providers>
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader />
            <div className="flex flex-1 flex-col">
              <div className="@container/main container flex flex-1 flex-col gap-2 py-4">
                {children}
              </div>
            </div>
          </SidebarInset>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
