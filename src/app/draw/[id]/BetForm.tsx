"use client";

import { useState, useTransition } from "react";
import { submitBets, parseSlip } from "@/app/actions";
import { DEFAULT_PAYOUT_RATES, type BetType } from "@/scoring";
import type { BetDraft } from "@/actions/placeBet";
import type { SlipMediaType } from "@/ai";

const BET_TYPES: { value: BetType; label: string; digits: number }[] = [
  { value: "THREE_TOP", label: "3 ตัวบน", digits: 3 },
  { value: "THREE_BOTTOM", label: "3 ตัวล่าง", digits: 3 },
  { value: "THREE_TOTE", label: "3 ตัวโต๊ด", digits: 3 },
  { value: "TWO_TOP", label: "2 ตัวบน", digits: 2 },
  { value: "TWO_BOTTOM", label: "2 ตัวล่าง", digits: 2 },
  { value: "TWO_TOTE", label: "2 ตัวโต๊ด", digits: 2 },
  { value: "RUN_TOP", label: "วิ่งบน", digits: 1 },
  { value: "RUN_BOTTOM", label: "วิ่งล่าง", digits: 1 },
];

const LABEL = Object.fromEntries(BET_TYPES.map((t) => [t.value, t.label]));

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
  const need = BET_TYPES.find((t) => t.value === betType)?.digits ?? 2;

  function addToCart() {
    setError(null);
    if (!/^\d+$/.test(number)) return setError("ใส่เป็นตัวเลขเท่านั้น");
    if (number.length !== need)
      return setError(`ประเภทนี้ต้องใส่เลข ${need} หลัก`);
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

  function updateCart(i: number, patch: Partial<BetDraft>) {
    setCart((c) => c.map((b, j) => (j === i ? { ...b, ...patch } : b)));
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
      <div className="card">
        <p className="muted">งวดนี้ปิดรับแล้ว — ดูโพยที่ส่งไปแล้วด้านล่าง</p>
        <SavedList bets={myBets} />
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>📷 อ่านจากรูปโพย</h3>
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
        {reading && <p className="note">กำลังอ่าน…</p>}
        {slipNote && <p className="note ok">{slipNote}</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>ประเภทการทาย</h3>
        <div className="chips">
          {BET_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={"chip" + (betType === t.value ? " active" : "")}
              onClick={() => setBetType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label>เลขที่ทาย ({need} หลัก)</label>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
            placeholder={"0".repeat(need)}
            inputMode="numeric"
            maxLength={need}
          />
        </div>

        <div className="field">
          <label>แต้มที่ลง</label>
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            min={1}
          />
        </div>

        <div className="payout">
          <span>ถ้าถูก ได้</span>
          <span>
            {(stake * rate).toLocaleString()} แต้ม{" "}
            <span style={{ fontWeight: 400, fontSize: 12 }}>(×{rate})</span>
          </span>
        </div>

        <button className="btn-block" onClick={addToCart}>
          + เพิ่มลงโพย
        </button>
      </div>

      {cart.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>รอยืนยัน ({cart.length})</h3>
          <p className="faint" style={{ marginTop: 0 }}>
            แก้เลข/แต้มได้ถ้าระบบอ่านเพี้ยน
          </p>
          {cart.map((b, i) => (
            <div className="list-row" key={i}>
              <select
                value={b.betType}
                onChange={(e) =>
                  updateCart(i, { betType: e.target.value as BetType })
                }
                style={{ width: 110 }}
              >
                {BET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input
                value={b.number}
                inputMode="numeric"
                onChange={(e) =>
                  updateCart(i, { number: e.target.value.replace(/\D/g, "") })
                }
                style={{ width: 72, textAlign: "center", fontWeight: 600 }}
              />
              <input
                type="number"
                value={b.stakePoints}
                min={1}
                onChange={(e) =>
                  updateCart(i, { stakePoints: Number(e.target.value) })
                }
                style={{ width: 64 }}
              />
              <button
                className="btn-sm btn-danger"
                onClick={() => setCart((c) => c.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="btn-primary btn-block"
            style={{ marginTop: 12 }}
            onClick={confirm}
            disabled={pending}
          >
            {pending ? "กำลังส่ง…" : `ยืนยันโพยทั้งหมด (${cartTotal} แต้ม)`}
          </button>
        </div>
      )}

      {error && <p className="note err">{error}</p>}

      <h2>โพยของฉัน</h2>
      <div className="card">
        <SavedList bets={myBets} />
      </div>
    </>
  );
}

function SavedList({ bets }: { bets: SavedBet[] }) {
  if (bets.length === 0) return <div className="empty">ยังไม่มีโพย</div>;
  return (
    <>
      {bets.map((b) => (
        <div className="list-row" key={b.id}>
          <div style={{ flex: 1 }}>
            <strong>{b.number}</strong>{" "}
            <span className="faint">· {LABEL[b.betType]}</span>
          </div>
          <span className="muted">{b.stakePoints} แต้ม</span>
        </div>
      ))}
    </>
  );
}
