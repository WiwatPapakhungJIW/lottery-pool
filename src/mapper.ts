// mapper.ts — สะพานเชื่อมแถวจาก Prisma เข้ากับ pure function ใน scoring.ts
// แยกชั้น I/O ออกจากตรรกะคิดคะแนน → engine ยังคง test ได้โดยไม่แตะ DB

import type { Bet as ScoringBet, DrawResult } from "./scoring";
import { DEFAULT_PAYOUT_RATES } from "./scoring";

// รูปแบบแถวจาก Prisma (เขียนเองเพื่อไม่ผูก import @prisma/client ในไฟล์ test)
type ResultRow = {
  first6: string;
  last3a: string;
  last3b: string;
  last2: string;
};

type BetRow = {
  id: string;
  userId: string;
  betType: ScoringBet["betType"];
  number: string;
  stakePoints: number;
  payoutRate: number;
};

/** Result (Prisma) → DrawResult (scoring) */
export function toDrawResult(r: ResultRow): DrawResult {
  return {
    first6: r.first6,
    last3: [r.last3a, r.last3b],
    last2: r.last2,
  };
}

/** Bet (Prisma) → Bet (scoring) */
export function toScoringBet(b: BetRow): ScoringBet {
  return {
    id: b.id,
    userId: b.userId,
    betType: b.betType,
    number: b.number,
    stakePoints: b.stakePoints,
    payoutRate: b.payoutRate,
  };
}

/**
 * หาเรตที่ใช้ตอนผู้เล่นกดแทง: ใช้ค่าที่วงตั้งไว้ (RoomBetRate) ก่อน
 * ถ้าวงไม่ได้ตั้ง → ตกมาที่ DEFAULT_PAYOUT_RATES
 * เรียกตอน "สร้าง Bet" เพื่อ snapshot ลง Bet.payoutRate
 */
export function resolvePayoutRate(
  betType: ScoringBet["betType"],
  roomRates: { betType: ScoringBet["betType"]; rate: number }[],
): number {
  const override = roomRates.find((r) => r.betType === betType);
  return override?.rate ?? DEFAULT_PAYOUT_RATES[betType];
}
