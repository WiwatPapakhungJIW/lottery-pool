// ai.ts — อ่านโพยจากรูปด้วย Google Gemini (free tier) ผ่าน REST (ไม่ต้องลง SDK)
// คืนค่าเป็น BetDraft[] ที่ผ่าน validateBetDraft แล้ว ให้ผู้เล่นตรวจก่อนยืนยัน
// ต้องตั้ง GEMINI_API_KEY ใน .env (ขอฟรีที่ https://aistudio.google.com/apikey)

import { validateBetDraft, type BetType } from "./scoring";
import type { BetDraft } from "./actions/placeBet";

export type SlipMediaType = "image/png" | "image/jpeg" | "image/webp";

// เปลี่ยนรุ่นได้ผ่าน env (เช่น gemini-2.5-flash, gemini-2.0-flash-lite ที่โควตาฟรีต่างกัน)
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

แมปประเภทเป็นรหัส (number ต้องเป็นตัวเลขล้วน):
- 3 ตัวบน / "บน" 3 หลัก → THREE_TOP (3 หลัก)
- 3 ตัวล่าง → THREE_BOTTOM (3 หลัก)
- 3 ตัวโต๊ด / "โต๊ด" 3 หลัก → THREE_TOTE (3 หลัก)
- 2 ตัวบน → TWO_TOP (2 หลัก)
- 2 ตัวล่าง / "ล่าง" 2 หลัก → TWO_BOTTOM (2 หลัก)
- 2 ตัวโต๊ด → TWO_TOTE (2 หลัก)
- วิ่งบน → RUN_TOP (1 หลัก)
- วิ่งล่าง → RUN_BOTTOM (1 หลัก)

stakePoints = ตัวเลขจำนวนเงิน/แต้มที่ลงในบรรทัดนั้น (จำนวนเต็มบวก)
ถ้าบรรทัดใดมีทั้งบนและล่างในจำนวนเดียว ให้แยกเป็นสองรายการ
อ่านเฉพาะที่มั่นใจ ถ้าตีความไม่ได้ให้ข้ามไป

สำคัญมาก — อ่านตัวเลขทีละหลักอย่างระมัดระวัง เพราะเป็นเลขหวยต้องเป๊ะ
เลขลายมือที่มักสับสน ให้พิจารณารูปทรงจริงให้ดี: 0↔6, 4↔0, 4↔9, 5↔6, 3↔9, 1↔7
ดูหัว/หาง/ห่วงของตัวเลขประกอบ แล้วตรวจทานอีกรอบก่อนตอบ`;

// Gemini ใช้ OpenAPI schema (type เป็นตัวพิมพ์ใหญ่)
const SCHEMA = {
  type: "OBJECT",
  properties: {
    bets: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          betType: { type: "STRING", enum: BET_TYPES },
          number: { type: "STRING" },
          stakePoints: { type: "INTEGER" },
        },
        required: ["betType", "number", "stakePoints"],
      },
    },
  },
  required: ["bets"],
};

export interface SlipParseResult {
  ok: BetDraft[];
  skipped: { item: unknown; reason: string }[];
}

export async function parseBetSlipImage(
  base64: string,
  mediaType: SlipMediaType,
): Promise<SlipParseResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("ยังไม่ได้ตั้งค่า GEMINI_API_KEY");

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: mediaType, data: base64 } },
          { text: "อ่านโพยจากรูปนี้ แล้วตอบเป็น JSON ตาม schema" },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      // ให้ flash ใช้ reasoning ช่วยอ่านลายมือ (ความแม่นเลขดีขึ้น)
      thinkingConfig: { thinkingBudget: 4096 },
    },
  });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

  // retry เมื่อโดน 429 (เกินลิมิต) หรือ 503/500 (โมเดลโหลดชั่วคราว) — รอ 3s, 6s, 10s
  const RETRYABLE = [429, 500, 503];
  let res: Response | null = null;
  for (const wait of [0, 3000, 6000, 10000]) {
    if (wait) await sleep(wait);
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    if (!RETRYABLE.includes(res.status)) break;
  }

  if (!res || !res.ok) {
    const t = res ? await res.text() : "";
    if (res?.status === 429)
      throw new Error(
        "เกินโควตา Gemini (429) — รุ่นนี้โควตาหมด ลองสลับ GEMINI_MODEL เป็นรุ่นอื่น (เช่น gemini-2.5-flash-lite) หรือรอโควตารีเซ็ต",
      );
    if (res?.status === 503)
      throw new Error("Gemini โหลดชั่วคราว (503) — ลองกดอ่านใหม่อีกครั้ง");
    throw new Error(`Gemini error ${res?.status}: ${t.slice(0, 160)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("อ่านรูปไม่สำเร็จ");

  const parsed = JSON.parse(text) as {
    bets: { betType: BetType; number: string; stakePoints: number }[];
  };

  const ok: BetDraft[] = [];
  const skipped: SlipParseResult["skipped"] = [];
  for (const b of parsed.bets ?? []) {
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
