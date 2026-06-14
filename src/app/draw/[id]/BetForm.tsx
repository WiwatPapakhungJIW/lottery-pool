"use client";

import { useState, useTransition } from "react";
import { submitBets, parseSlip } from "@/app/actions";
import { DEFAULT_PAYOUT_RATES, type BetType } from "@/scoring";
import type { BetDraft } from "@/actions/placeBet";
import type { SlipMediaType } from "@/ai";

const BET_TYPES: { value: BetType; label: string }[] = [
  { value: "THREE_TOP", label: "3 ตัวบน" },
  { value: "THREE_BOTTOM", label: "3 ตัวล่าง" },
  { value: "THREE_TOTE", label: "3 ตัวโต๊ด" },
  { value: "TWO_TOP", label: "2 ตัวบน" },
  { value: "TWO_BOTTOM", label: "2 ตัวล่าง" },
  { value: "TWO_TOTE", label: "2 ตัวโต๊ด" },
  { value: "RUN_TOP", label: "วิ่งบน" },
  { value: "RUN_BOTTOM", label: "วิ่งล่าง" },
];

type SavedBet = BetDraft & { id: string };

export function BetForm({
  drawId,
  remaining,
  disabled,
  myBets,
}: {
  drawId: string;
  remaining: number;
  disabled: boolean;
  myBets: SavedBet[];
}) {
  const [betType, setBetType] = useState<BetType>("TWO_BOTTOM");
  const [number, setNumber] = useState("");
  const [stake, setStake] = useState(10);
  const [cart, setCart] = useState<BetDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [reading, setReading] = useState(false);
  const [slipNote, setSlipNote] = useState<string | null>(null);

  const rate = DEFAULT_PAYOUT_RATES[betType];
  const cartTotal = cart.reduce((s, b) => s + b.stakePoints, 0);

  function addToCart() {
    setError(null);
    if (!/^\d+$/.test(number)) return setError("ใส่เป็นตัวเลขเท่านั้น");
    if (stake <= 0) return setError("แต้มต้องมากกว่า 0");
    if (cartTotal + stake > remaining) return setError("เกินงบที่เหลือ");
    setCart((c) => [...c, { betType, number, stakePoints: stake }]);
    setNumber("");
  }

  async function readSlip(file: File) {
    setError(null);
    setSlipNote(null);
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("รองรับเฉพาะรูป PNG / JPEG / WEBP");
      return;
    }
    setReading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
        r.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1] ?? "";
      const { ok, skipped } = await parseSlip(base64, file.type as SlipMediaType);
      // กรองไม่ให้เกินงบที่เหลือ
      let running = cartTotal;
      const added: BetDraft[] = [];
      for (const b of ok) {
        if (running + b.stakePoints > remaining) break;
        running += b.stakePoints;
        added.push(b);
      }
      setCart((c) => [...c, ...added]);
      setSlipNote(
        `อ่านได้ ${ok.length} รายการ เพิ่มเข้าโพย ${added.length}` +
          (skipped.length ? ` · ข้าม ${skipped.length}` : "") +
          (added.length < ok.length ? " (บางรายการเกินงบ)" : ""),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "อ่านรูปไม่สำเร็จ");
    } finally {
      setReading(false);
    }
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        await submitBets(drawId, cart);
        setCart([]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      }
    });
  }

  if (disabled) {
    return (
      <section>
        <p>งวดนี้ปิดรับแล้ว ดูโพยที่ส่งไปแล้วด้านล่าง</p>
        <SavedList bets={myBets} />
      </section>
    );
  }

  return (
    <section>
      <h2>ลงโพย</h2>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 14 }}>
          📷 อ่านจากรูปโพย{" "}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={reading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void readSlip(f);
              e.target.value = "";
            }}
          />
        </label>
        {reading && <span> กำลังอ่าน…</span>}
        {slipNote && (
          <p style={{ fontSize: 13, color: "#555" }}>{slipNote}</p>
        )}
      </div>

      <select
        value={betType}
        onChange={(e) => setBetType(e.target.value as BetType)}
      >
        {BET_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <input
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="เลขที่ทาย"
        inputMode="numeric"
      />
      <input
        type="number"
        value={stake}
        onChange={(e) => setStake(Number(e.target.value))}
        min={1}
      />
      <p>ถ้าถูกได้ {(stake * rate).toLocaleString()} แต้ม (×{rate})</p>
      <button onClick={addToCart}>เพิ่มลงโพย</button>

      {cart.length > 0 && (
        <div>
          <h3>รอยืนยัน ({cart.length})</h3>
          <ul>
            {cart.map((b, i) => (
              <li key={i}>
                {b.number} · {b.betType} · {b.stakePoints} แต้ม
              </li>
            ))}
          </ul>
          <button onClick={confirm} disabled={pending}>
            {pending ? "กำลังส่ง…" : `ยืนยันโพยทั้งหมด (${cartTotal} แต้ม)`}
          </button>
        </div>
      )}

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <h3>โพยของฉัน</h3>
      <SavedList bets={myBets} />
    </section>
  );
}

function SavedList({ bets }: { bets: SavedBet[] }) {
  if (bets.length === 0) return <p>ยังไม่มีโพย</p>;
  return (
    <ul>
      {bets.map((b) => (
        <li key={b.id}>
          {b.number} · {b.betType} · {b.stakePoints} แต้ม
        </li>
      ))}
    </ul>
  );
}
