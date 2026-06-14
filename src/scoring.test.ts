import { describe, it, expect } from "vitest";
import {
  settleDraw,
  settleBet,
  isWinningBet,
  validateResult,
  DEFAULT_PAYOUT_RATES,
  type Bet,
  type BetType,
  type DrawResult,
} from "./scoring";

// ผลรางวัลตัวอย่างที่ใช้ร่วมกัน
// รางวัลที่ 1 = 837456  → 3 ตัวบน = 456, 2 ตัวบน = 56
// เลขท้าย 3 ตัว = 123, 789
// เลขท้าย 2 ตัว = 90
const R: DrawResult = {
  first6: "837456",
  last3: ["123", "789"],
  last2: "90",
};

// helper สร้างโพยสั้น ๆ
let seq = 0;
const bet = (
  betType: BetType,
  number: string,
  stakePoints = 10,
  userId = "u1",
  payoutRate?: number,
): Bet => ({
  id: `b${++seq}`,
  userId,
  betType,
  number,
  stakePoints,
  payoutRate,
});

describe("isWinningBet — แต่ละประเภท ถูก/ผิด", () => {
  it("3 ตัวบน", () => {
    expect(isWinningBet(bet("THREE_TOP", "456"), R)).toBe(true);
    expect(isWinningBet(bet("THREE_TOP", "457"), R)).toBe(false);
    // ต้องไม่เผลอไปแมตช์ 3 ตัวล่าง
    expect(isWinningBet(bet("THREE_TOP", "123"), R)).toBe(false);
  });

  it("3 ตัวล่าง — ถูกได้ทั้งสองชุด", () => {
    expect(isWinningBet(bet("THREE_BOTTOM", "123"), R)).toBe(true);
    expect(isWinningBet(bet("THREE_BOTTOM", "789"), R)).toBe(true);
    expect(isWinningBet(bet("THREE_BOTTOM", "456"), R)).toBe(false);
  });

  it("3 ตัวโต๊ด — สลับหลักได้", () => {
    expect(isWinningBet(bet("THREE_TOTE", "456"), R)).toBe(true); // ตรง
    expect(isWinningBet(bet("THREE_TOTE", "654"), R)).toBe(true); // สลับ
    expect(isWinningBet(bet("THREE_TOTE", "546"), R)).toBe(true);
    expect(isWinningBet(bet("THREE_TOTE", "455"), R)).toBe(false);
  });

  it("2 ตัวบน", () => {
    expect(isWinningBet(bet("TWO_TOP", "56"), R)).toBe(true);
    expect(isWinningBet(bet("TWO_TOP", "65"), R)).toBe(false); // โต๊ดไม่นับในบน
    expect(isWinningBet(bet("TWO_TOP", "90"), R)).toBe(false); // นี่คือล่าง
  });

  it("2 ตัวล่าง", () => {
    expect(isWinningBet(bet("TWO_BOTTOM", "90"), R)).toBe(true);
    expect(isWinningBet(bet("TWO_BOTTOM", "56"), R)).toBe(false);
  });

  it("2 ตัวโต๊ด — สลับได้", () => {
    expect(isWinningBet(bet("TWO_TOTE", "56"), R)).toBe(true);
    expect(isWinningBet(bet("TWO_TOTE", "65"), R)).toBe(true);
    expect(isWinningBet(bet("TWO_TOTE", "57"), R)).toBe(false);
  });

  it("เลขวิ่งบน — เลขโดดอยู่ใน 3 ตัวบน (456)", () => {
    for (const d of ["4", "5", "6"])
      expect(isWinningBet(bet("RUN_TOP", d), R)).toBe(true);
    for (const d of ["0", "7", "9"])
      expect(isWinningBet(bet("RUN_TOP", d), R)).toBe(false);
  });

  it("เลขวิ่งล่าง — เลขโดดอยู่ใน 2 ตัวล่าง (90)", () => {
    expect(isWinningBet(bet("RUN_BOTTOM", "9"), R)).toBe(true);
    expect(isWinningBet(bet("RUN_BOTTOM", "0"), R)).toBe(true);
    expect(isWinningBet(bet("RUN_BOTTOM", "5"), R)).toBe(false);
  });
});

describe("เคสเลขซ้ำ", () => {
  // รางวัลที่ 1 = 811222 → 3 ตัวบน = 222, 2 ตัวบน = 22
  const RR: DrawResult = { first6: "811222", last3: ["887", "000"], last2: "11" };

  it("โต๊ด 3 ตัวที่มีเลขซ้ำ", () => {
    expect(isWinningBet(bet("THREE_TOTE", "222"), RR)).toBe(true);
    expect(isWinningBet(bet("THREE_TOTE", "227"), RR)).toBe(false);
  });

  it("โต๊ดของ 887 (มีเลขซ้ำ) เทียบกับ 3 ตัวบน 222 → ไม่ถูก", () => {
    expect(isWinningBet(bet("THREE_TOTE", "878"), RR)).toBe(false);
  });

  it("วิ่งบนเลขซ้ำ ยังนับเป็นถูกครั้งเดียว (binary)", () => {
    expect(isWinningBet(bet("RUN_TOP", "2"), RR)).toBe(true);
  });

  it("2 ตัวล่างเป็นเลขเบิ้ล", () => {
    expect(isWinningBet(bet("TWO_BOTTOM", "11"), RR)).toBe(true);
    expect(isWinningBet(bet("RUN_BOTTOM", "1"), RR)).toBe(true);
  });
});

describe("settleBet — คิดแต้ม", () => {
  it("ถูก → wonPoints = stake × rate (ใช้ default)", () => {
    const s = settleBet(bet("THREE_TOP", "456", 10), R);
    expect(s.status).toBe("win");
    expect(s.appliedRate).toBe(DEFAULT_PAYOUT_RATES.THREE_TOP);
    expect(s.wonPoints).toBe(10 * 500);
  });

  it("แพ้ → wonPoints = 0", () => {
    const s = settleBet(bet("THREE_TOP", "999", 10), R);
    expect(s.status).toBe("lose");
    expect(s.wonPoints).toBe(0);
  });

  it("ใช้ payoutRate ที่ snapshot ไว้ (ไม่ใช้ default)", () => {
    const s = settleBet(bet("TWO_TOP", "56", 10, "u1", 95), R);
    expect(s.appliedRate).toBe(95);
    expect(s.wonPoints).toBe(10 * 95);
  });
});

describe("settleDraw — สรุปทั้งงวด + ต่อผู้เล่น", () => {
  it("รวมยอด staked/won และ net ต่อคนถูกต้อง", () => {
    const bets: Bet[] = [
      bet("THREE_TOP", "456", 10, "alice"), // ถูก: +5000
      bet("TWO_BOTTOM", "90", 20, "alice"), // ถูก: +1400
      bet("RUN_TOP", "7", 5, "alice"), // แพ้
      bet("TWO_TOP", "00", 10, "bob"), // แพ้
      bet("RUN_BOTTOM", "9", 10, "bob"), // ถูก: +40
    ];
    const sum = settleDraw(R, bets);

    expect(sum.totalStaked).toBe(10 + 20 + 5 + 10 + 10);
    expect(sum.totalWon).toBe(5000 + 1400 + 40);

    expect(sum.perUser.alice).toEqual({
      staked: 35,
      won: 6400,
      net: 6365,
    });
    expect(sum.perUser.bob).toEqual({
      staked: 20,
      won: 40,
      net: 20,
    });
  });

  it("งวดที่ไม่มีโพย → สรุปเป็นศูนย์", () => {
    const sum = settleDraw(R, []);
    expect(sum.totalStaked).toBe(0);
    expect(sum.totalWon).toBe(0);
    expect(sum.perUser).toEqual({});
  });
});

describe("validation — กันข้อมูลผิด", () => {
  it("ผลรางวัลผิดรูปแบบ", () => {
    expect(() => validateResult({ ...R, first6: "12345" })).toThrow();
    expect(() => validateResult({ ...R, last2: "9x" })).toThrow();
    expect(() =>
      validateResult({ ...R, last3: ["12", "789"] }),
    ).toThrow();
  });

  it("โพยจำนวนหลักไม่ตรงประเภท", () => {
    expect(() => settleBet(bet("THREE_TOP", "45"), R)).toThrow();
    expect(() => settleBet(bet("RUN_TOP", "45"), R)).toThrow();
  });

  it("โพยมีตัวอักษรปนหรือ stake ไม่ถูก", () => {
    expect(() => settleBet(bet("TWO_TOP", "5a"), R)).toThrow();
    expect(() => settleBet(bet("TWO_TOP", "56", 0), R)).toThrow();
    expect(() => settleBet(bet("TWO_TOP", "56", -5), R)).toThrow();
  });
});
