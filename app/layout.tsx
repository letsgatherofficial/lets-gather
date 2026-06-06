import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leader Firewall",
  description: "Guest-first triage, scheduling, and delegate load balancing for high-demand leaders."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
