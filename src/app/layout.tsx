import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Reviewer | Good experience. Better on paper.",
  description:
    "A thoughtful second pair of eyes for your next opportunity. Compare your resume with a role, strengthen your bullets, and find the missing evidence. Built by Louis.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
