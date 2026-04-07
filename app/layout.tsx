// app/layout.tsx
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "Mr.Minutes",
  description: "Transform meeting transcripts into structured knowledge",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={figtree.className}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#0a1404",
                color: "#d5f5dc",
                border: "1px solid #26a269",
                borderRadius: "10px",
                fontSize: "14px",
              },
              success: { iconTheme: { primary: "#26a269", secondary: "#fff" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
