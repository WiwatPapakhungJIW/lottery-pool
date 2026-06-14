"use client";

import { useState, useTransition } from "react";
import {
  adminEnterResult,
  adminPreviewSettlement,
  adminCloseAndSettle,
  adminRevertSettlement,
} from "@/app/actions";
import type { SettlementSummary } from "@/scoring";

type ResultDraft = {
  first6: string;
  last3a: string;
  last3b: string;
  last2: string;
};
type Status = "OPEN" | "CLOSED" | "SETTLED";

export function AdminPanel({
  drawId,
  status,
  result,
}: {
  drawId: string;
  status: Status;
  result: ResultDraft | null;
}) {
  const [form, setForm] = useState<ResultDraft>(
    result ?? { first6: "", last3a: "", last3b: "", last2: "" },
  );
  const [preview, setPreview] = useState<SettlementSummary | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const settled = status === "SETTLED";

  function run(fn: () => Promise<void>) {
    setErr(null);
    setMsg(null);
    start(async () => {
      try {
        await fn();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      }
    });
  }

  const field = (key: keyof ResultDraft, label: string, len: number) => (
    <label style={{ display: "block", marginBottom: 8 }}>
      {label}{" "}
      <input
        value={form[key]}
        maxLength={len}
        inputMode="numeric"
        disabled={settled}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );

  return (
    <section>
      <h2>ผลรางวัล</h2>
      {field("first6", "รางวัลที่ 1 (6 หลัก)", 6)}
      {field("last3a", "เลขท้าย 3 ตัว ชุด 1", 3)}
      {field("last3b", "เลขท้าย 3 ตัว ชุด 2", 3)}
      {field("last2", "เลขท้าย 2 ตัว", 2)}

      {!settled && (
        <button
          disabled={pending}
          onClick={() =>
            run(async () => {
              await adminEnterResult({ drawId, ...form });
              setMsg("บันทึกผลแล้ว");
            })
          }
        >
          บันทึกผล
        </button>
      )}

      <hr />

      {!settled && (
        <>
          <button
            disabled={pending}
            onClick={() =>
              run(async () => {
                const s = await adminPreviewSettlement(drawId);
                setPreview(s);
              })
            }
          >
            ดูตัวอย่างผลคิดคะแนน
          </button>{" "}
          <button
            disabled={pending}
            onClick={() =>
              run(async () => {
                const s = await adminCloseAndSettle(drawId);
                setPreview(s);
                setMsg("เคลียร์งวดเรียบร้อย แต้มอัปเดตแล้ว");
              })
            }
          >
            เคลียร์งวด (คิดคะแนนจริง)
          </button>
        </>
      )}

      {settled && (
        <button
          disabled={pending}
          onClick={() =>
            run(async () => {
              await adminRevertSettlement(drawId);
              setPreview(null);
              setMsg("ยกเลิกการเคลียร์แล้ว งวดกลับเป็น CLOSED");
            })
          }
        >
          ยกเลิกการเคลียร์งวด
        </button>
      )}

      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {preview && (
        <div>
          <h3>สรุป</h3>
          <p>
            รวมแต้มที่ลง {preview.totalStaked.toLocaleString()} · รวมแต้มที่ถูก{" "}
            {preview.totalWon.toLocaleString()}
          </p>
          <ul>
            {Object.entries(preview.perUser).map(([uid, agg]) => (
              <li key={uid}>
                {uid}: ลง {agg.staked.toLocaleString()} · ได้{" "}
                {agg.won.toLocaleString()} · สุทธิ {agg.net.toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
