import type { Metadata } from "next";
import "./globals.css";
import { Workspace } from "@/components/Workspace";
export const metadata: Metadata = {
  title: "VayuGuard AI · Clean-air intelligence",
  description:
    "A local air-quality briefing and practical household plans for cleaner urban living.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Workspace>{children}</Workspace>
      </body>
    </html>
  );
}
