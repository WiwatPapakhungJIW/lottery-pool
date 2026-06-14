import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "วงหวยเพื่อน",
  description: "เกมทายผลหวยในกลุ่มเพื่อน เล่นเอาสนุก ไม่มีเงินจริง",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          maxWidth: 480,
          margin: "0 auto",
          padding: "16px",
        }}
      >
        {children}
      </body>
    </html>
  );
}
