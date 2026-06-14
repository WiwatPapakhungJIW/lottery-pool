// auth.ts — Auth.js (NextAuth v5) + LINE Login
// ใช้ JWT session แล้ว sync โปรไฟล์ LINE เข้าตาราง User ของเราเอง
// (env: AUTH_SECRET, AUTH_LINE_ID, AUTH_LINE_SECRET)

import NextAuth from "next-auth";
import Line from "next-auth/providers/line";
import { prisma } from "./db";

type AppRole = "PLAYER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string; // = User.id (cuid) ของเรา ไม่ใช่ของ LINE
      role: AppRole;
      name?: string | null;
      image?: string | null;
      email?: string | null;
    };
  }
}

// ฟิลด์ที่เราแนบเพิ่มลง JWT (เลี่ยง module augmentation ของ next-auth/jwt)
type AppToken = { dbUserId?: string; role?: AppRole; lineUserId?: string };

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Line],
  session: { strategy: "jwt" },
  callbacks: {
    // sync ผู้ใช้ LINE เข้าตาราง User (upsert ด้วย lineUserId)
    async signIn({ profile }) {
      const lineUserId = profile?.sub;
      if (!lineUserId) return false;
      const picture =
        typeof profile.picture === "string" ? profile.picture : null;
      await prisma.user.upsert({
        where: { lineUserId },
        create: {
          lineUserId,
          displayName: profile.name ?? "เพื่อน",
          avatarUrl: picture,
        },
        update: {
          displayName: profile.name ?? undefined,
          avatarUrl: picture ?? undefined,
        },
      });
      return true;
    },
    // ฝัง dbUserId + role ลง token (ดึงครั้งเดียวหลัง sign in)
    async jwt({ token, profile }) {
      const t = token as typeof token & AppToken;
      const lineUserId = (profile?.sub as string | undefined) ?? t.lineUserId;
      if (lineUserId && !t.dbUserId) {
        const u = await prisma.user.findUnique({ where: { lineUserId } });
        if (u) {
          t.dbUserId = u.id;
          t.role = u.role as AppRole;
          t.lineUserId = u.lineUserId;
        }
      }
      return t;
    },
    // เปิดเผยเฉพาะที่ต้องใช้ลง session
    async session({ session, token }) {
      const t = token as AppToken;
      if (t.dbUserId) {
        session.user.id = t.dbUserId;
        session.user.role = t.role ?? "PLAYER";
      }
      return session;
    },
  },
});
