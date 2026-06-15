import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "วงหวยเพื่อน",
  description: "เกมทายผลหวยในกลุ่มเพื่อน เล่นเอาสนุก ไม่มีเงินจริง",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>
        <div className="app">{children}</div>
      </body>
    </html>
  );
}
