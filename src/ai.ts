// ai.ts — อ่านโพยจากรูปด้วย Claude vision (claude-opus-4-8) + structured outputs
// คืนค่าเป็น BetDraft[] ที่ผ่าน validateBetDraft แล้ว ให้ผู้เล่นตรวจก่อนยืนยัน
// ต้องตั้ง ANTHROPIC_API_KEY ใน .env

import Anthropic from "@anthropic-ai/sdk";
import { validateBetDraft, type BetType } from "./scoring";
import type { BetDraft } from "./actions/placeBet";

export type SlipMediaType = "image/png" | "image/jpeg" | "image/webp";

const BET_TYPES: BetType[] = [
  "THREE_TOP",
  "THREE_BOTTOM",
  "THREE_TOTE",
  "TWO_TOP",
  "TWO_BOTTOM",
  "TWO_TOTE",
  "RUN_TOP",
  "RUN_BOTTOM",
];

const SYSTEM = `คุณเป็นผู้ช่วยอ่าน "โพยหวย" จากรูปภาพ (ลายมือหรือพิมพ์) แล้วแยกเป็นรายการทาย
แต่ละบรรทัดในโพยมักมี: เลขที่ทาย + ประเภท + จำนวนเงิน/แต้มที่ลง

แมปประเภทเป็นรหัสดังนี้ (number ต้องเป็นตัวเลขล้วน):
- 3 ตัวบน / "บน" ที่มี 3 หลัก → THREE_TOP (number 3 หลัก)
- 3 ตัวล่าง → THREE_BOTTOM (3 หลัก)
- 3 ตัวโต๊ด / "โต๊ด" 3 หลัก → THREE_TOTE (3 หลัก)
- 2 ตัวบน → TWO_TOP (2 หลัก)
- 2 ตัวล่าง / "ล่าง" ที่มี 2 หลัก → TWO_BOTTOM (2 หลัก)
- 2 ตัวโต๊ด → TWO_TOTE (2 หลัก)
- วิ่งบน → RUN_TOP (1 หลัก)
- วิ่งล่าง → RUN_BOTTOM (1 หลัก)

stakePoints = ตัวเลขจำนวนเงิน/แต้มที่ลงในบรรทัดนั้น (จำนวนเต็มบวก)
ถ้าบรรทัดใดมีทั้งบนและล่างในจำนวนเดียว (เช่น "456 = 10") ให้แยกเป็นสองรายการ
อ่านเฉพาะที่มั่นใจ ถ้าตีความไม่ได้ให้ข้ามบรรทัดนั้นไป

ตอบกลับเป็น JSON ล้วนเท่านั้น (ห้ามมีข้อความอื่นหรือ markdown) รูปแบบ:
{"bets":[{"betType":"<หนึ่งใน ${BET_TYPES.join("|")}>","number":"<ตัวเลข>","stakePoints":<จำนวนเต็ม>}]}`;

export interface SlipParseResult {
  ok: BetDraft[];
  skipped: { item: unknown; reason: string }[];
}

// สร้าง client แบบ lazy เพื่อให้แอปบูตได้แม้ยังไม่ตั้ง ANTHROPIC_API_KEY
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY)
    throw new Error("ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY");
  return (client ??= new Anthropic());
}

export async function parseBetSlipImage(
  base64: string,
  mediaType: SlipMediaType,
): Promise<SlipParseResult> {
  const res = await getClient().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          { type: "text", text: "อ่านโพยจากรูปนี้ แล้วตอบเป็น JSON ตามรูปแบบที่กำหนด" },
        ],
      },
    ],
  });

  const text = res.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  )?.text;
  if (!text) throw new Error("อ่านรูปไม่สำเร็จ");

  // ตัด markdown fence เผื่อโมเดลห่อมา แล้ว parse
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(json) as {
    bets: { betType: BetType; number: string; stakePoints: number }[];
  };

  const ok: BetDraft[] = [];
  const skipped: SlipParseResult["skipped"] = [];
  for (const b of parsed.bets) {
    try {
      validateBetDraft(b.betType, b.number, b.stakePoints, "โพยจากรูป");
      ok.push({
        betType: b.betType,
        number: b.number,
        stakePoints: b.stakePoints,
      });
    } catch (e) {
      skipped.push({ item: b, reason: e instanceof Error ? e.message : "ข้าม" });
    }
  }
  return { ok, skipped };
}
