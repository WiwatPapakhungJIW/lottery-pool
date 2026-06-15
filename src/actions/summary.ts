// summary.ts — สรุปผลแยกรายคน (read-only) ใช้ในหน้าแอดมิน + หน้าสรุปรายคน

import { prisma } from "../db";

export interface PlayerRow {
  userId: string;
  name: string;
  staked: number;
  won: number;
  net: number;
}

/** สรุปทุกคนในงวดเดียว (พร้อมชื่อจริง) เรียงตามสุทธิมาก→น้อย */
export async function drawSummary(drawId: string): Promise<PlayerRow[]> {
  const bets = await prisma.bet.findMany({
    where: { drawId },
    include: { user: true },
  });
  const map = new Map<string, PlayerRow>();
  for (const b of bets) {
    const row =
      map.get(b.userId) ??
      { userId: b.userId, name: b.user.displayName, staked: 0, won: 0, net: 0 };
    row.staked += b.stakePoints;
    row.won += b.wonPoints;
    row.net = row.won - row.staked;
    map.set(b.userId, row);
  }
  return [...map.values()].sort((a, b) => b.net - a.net);
}

export interface DrawBreakdown {
  drawId: string;
  drawDate: Date;
  status: string;
  staked: number;
  won: number;
  net: number;
}

/** สรุปของลูกค้าคนเดียว แยกตามงวดในวง (เฉพาะงวดที่คนนี้มีโพย) */
export async function roomPlayerSummary(
  roomId: string,
  userId: string,
): Promise<DrawBreakdown[]> {
  const draws = await prisma.draw.findMany({
    where: { roomId },
    orderBy: { drawDate: "desc" },
    include: { bets: { where: { userId } } },
  });
  return draws
    .filter((d) => d.bets.length > 0)
    .map((d) => {
      const staked = d.bets.reduce((s, b) => s + b.stakePoints, 0);
      const won = d.bets.reduce((s, b) => s + b.wonPoints, 0);
      return {
        drawId: d.id,
        drawDate: d.drawDate,
        status: d.status,
        staked,
        won,
        net: won - staked,
      };
    });
}
