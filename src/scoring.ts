// scoring.ts — เครื่องคิดคะแนนวงหวยกลุ่มเพื่อน (แต้มสนุกล้วน ไม่มีเงินจริง)
//
// ออกแบบเป็น pure function ทั้งหมด: ไม่ยุ่งกับ DB / เวลา / network
// → ทดสอบได้ครบทุกเคสก่อนต่อระบบจริง

// ──────────────────────────────────────────────
// ประเภทการทาย
// ──────────────────────────────────────────────
export type BetType =
  | "THREE_TOP" // 3 ตัวบน  — 3 หลักท้ายของรางวัลที่ 1
  | "THREE_BOTTOM" // 3 ตัวล่าง — ตรงกับเลขท้าย 3 ตัว (ชุดใดชุดหนึ่ง)
  | "THREE_TOTE" // 3 ตัวโต๊ด — สลับหลักได้ ตรงกับ 3 ตัวบน
  | "TWO_TOP" // 2 ตัวบน  — 2 หลักท้ายของรางวัลที่ 1
  | "TWO_BOTTOM" // 2 ตัวล่าง — เลขท้าย 2 ตัว
  | "TWO_TOTE" // 2 ตัวโต๊ด — สลับได้ ตรงกับ 2 ตัวบน
  | "RUN_TOP" // เลขวิ่งบน — เลขโดดอยู่ใน 3 ตัวบน
  | "RUN_BOTTOM"; // เลขวิ่งล่าง — เลขโดดอยู่ใน 2 ตัวล่าง

// จำนวนหลักที่แต่ละประเภทต้องใส่
const DIGITS_REQUIRED: Record<BetType, number> = {
  THREE_TOP: 3,
  THREE_BOTTOM: 3,
  THREE_TOTE: 3,
  TWO_TOP: 2,
  TWO_BOTTOM: 2,
  TWO_TOTE: 2,
  RUN_TOP: 1,
  RUN_BOTTOM: 1,
};

// เรตแต้มเริ่มต้น (บาทละ) — ปรับได้ต่อวงผ่าน Bet.payoutRate
export const DEFAULT_PAYOUT_RATES: Record<BetType, number> = {
  THREE_TOP: 500,
  THREE_BOTTOM: 120,
  THREE_TOTE: 100,
  TWO_TOP: 70,
  TWO_BOTTOM: 70,
  TWO_TOTE: 35,
  RUN_TOP: 3,
  RUN_BOTTOM: 4,
};

// ──────────────────────────────────────────────
// ผลรางวัลทางการ (แอดมินกรอก)
// ──────────────────────────────────────────────
export interface DrawResult {
  first6: string; // รางวัลที่ 1 (6 หลัก)
  last3: [string, string]; // เลขท้าย 3 ตัว (2 ชุด)
  last2: string; // เลขท้าย 2 ตัว
}

// ──────────────────────────────────────────────
// โพยของผู้เล่น
// ──────────────────────────────────────────────
export interface Bet {
  id: string;
  userId: string;
  betType: BetType;
  number: string; // เลขที่ทาย (ความยาวตาม DIGITS_REQUIRED)
  stakePoints: number; // แต้มที่ลง (> 0)
  payoutRate?: number; // snapshot เรต ณ ตอนแทง; ไม่ใส่ = ใช้ default
}

export type SettledStatus = "win" | "lose";

export interface SettledBet extends Bet {
  status: SettledStatus;
  appliedRate: number; // เรตที่ใช้คิดจริง
  wonPoints: number; // แต้มที่ได้ (0 ถ้าแพ้)
}

export interface SettlementSummary {
  bets: SettledBet[];
  totalStaked: number;
  totalWon: number;
  perUser: Record<string, { staked: number; won: number; net: number }>;
}

// ──────────────────────────────────────────────
// helper
// ──────────────────────────────────────────────
const onlyDigits = (s: string) => /^\d+$/.test(s);

const sortDigits = (s: string) => s.split("").sort().join("");

/** ตรวจรูปแบบผลรางวัลก่อนคิด — กันแอดมินกรอกผิด */
export function validateResult(r: DrawResult): void {
  if (!onlyDigits(r.first6) || r.first6.length !== 6)
    throw new Error(`first6 ต้องเป็นตัวเลข 6 หลัก: "${r.first6}"`);
  for (const t of r.last3)
    if (!onlyDigits(t) || t.length !== 3)
      throw new Error(`last3 ต้องเป็นตัวเลข 3 หลัก: "${t}"`);
  if (!onlyDigits(r.last2) || r.last2.length !== 2)
    throw new Error(`last2 ต้องเป็นตัวเลข 2 หลัก: "${r.last2}"`);
}

/**
 * ตรวจ "ร่างโพย" (ใช้ได้ทั้งตอนผู้เล่นกดแทงและตอน settle)
 * โยน Error พร้อมข้อความไทยถ้าไม่ผ่าน
 */
export function validateBetDraft(
  betType: BetType,
  number: string,
  stakePoints: number,
  label = "bet",
): void {
  const need = DIGITS_REQUIRED[betType];
  if (need === undefined) throw new Error(`ไม่รู้จักประเภททาย: ${betType}`);
  if (!onlyDigits(number) || number.length !== need)
    throw new Error(
      `${label}: ประเภท ${betType} ต้องใส่เลข ${need} หลัก แต่ได้ "${number}"`,
    );
  if (!Number.isFinite(stakePoints) || stakePoints <= 0)
    throw new Error(`${label}: stakePoints ต้อง > 0`);
}

/** ตรวจโพยใบเดียว */
function validateBet(bet: Bet): void {
  validateBetDraft(bet.betType, bet.number, bet.stakePoints, `bet ${bet.id}`);
}

// ตัวเลขที่ derive จากผลรางวัล
function derive(r: DrawResult) {
  return {
    top3: r.first6.slice(-3), // 3 ตัวบน
    top2: r.first6.slice(-2), // 2 ตัวบน
    bottom3: r.last3, // 3 ตัวล่าง (2 ชุด)
    bottom2: r.last2, // 2 ตัวล่าง
  };
}

// ──────────────────────────────────────────────
// แกนกลาง: ถูกหรือไม่
// ──────────────────────────────────────────────
export function isWinningBet(bet: Bet, r: DrawResult): boolean {
  const d = derive(r);
  const n = bet.number;

  switch (bet.betType) {
    case "THREE_TOP":
      return n === d.top3;
    case "THREE_BOTTOM":
      return d.bottom3.includes(n);
    case "THREE_TOTE":
      return sortDigits(n) === sortDigits(d.top3);
    case "TWO_TOP":
      return n === d.top2;
    case "TWO_BOTTOM":
      return n === d.bottom2;
    case "TWO_TOTE":
      return sortDigits(n) === sortDigits(d.top2);
    case "RUN_TOP":
      return d.top3.includes(n);
    case "RUN_BOTTOM":
      return d.bottom2.includes(n);
  }
}

/** คิดโพยใบเดียว */
export function settleBet(bet: Bet, r: DrawResult): SettledBet {
  validateBet(bet);
  const appliedRate = bet.payoutRate ?? DEFAULT_PAYOUT_RATES[bet.betType];
  const win = isWinningBet(bet, r);
  return {
    ...bet,
    status: win ? "win" : "lose",
    appliedRate,
    wonPoints: win ? bet.stakePoints * appliedRate : 0,
  };
}

// ──────────────────────────────────────────────
// คิดทั้งงวด (ฟังก์ชันหลัก)
// ──────────────────────────────────────────────
export function settleDraw(r: DrawResult, bets: Bet[]): SettlementSummary {
  validateResult(r);

  const settled = bets.map((b) => settleBet(b, r));

  const perUser: SettlementSummary["perUser"] = {};
  let totalStaked = 0;
  let totalWon = 0;

  for (const b of settled) {
    totalStaked += b.stakePoints;
    totalWon += b.wonPoints;
    const u = (perUser[b.userId] ??= { staked: 0, won: 0, net: 0 });
    u.staked += b.stakePoints;
    u.won += b.wonPoints;
    u.net = u.won - u.staked;
  }

  return { bets: settled, totalStaked, totalWon, perUser };
}
