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
    <div className="field">
      <label>{label}</label>
      <input
        value={form[key]}
        maxLength={len}
        inputMode="numeric"
        disabled={settled}
        onChange={(e) =>
          setForm({ ...form, [key]: e.target.value.replace(/\D/g, "") })
        }
      />
    </div>
  );

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>ผลรางวัล</h3>
        {field("first6", "รางวัลที่ 1 (6 หลัก)", 6)}
        {field("last3a", "เลขท้าย 3 ตัว ชุด 1", 3)}
        {field("last3b", "เลขท้าย 3 ตัว ชุด 2", 3)}
        {field("last2", "เลขท้าย 2 ตัว", 2)}

        {!settled && (
          <button
            className="btn-block"
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
      </div>

      <div className="card stack-sm">
        {!settled && (
          <>
            <button
              className="btn-block"
              disabled={pending}
              onClick={() =>
                run(async () => setPreview(await adminPreviewSettlement(drawId)))
              }
            >
              ดูตัวอย่างผลคิดคะแนน
            </button>
            <button
              className="btn-primary btn-block"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  setPreview(await adminCloseAndSettle(drawId));
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
            className="btn-danger btn-block"
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
        {msg && <p className="note ok">{msg}</p>}
        {err && <p className="note err">{err}</p>}
      </div>

      {preview && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>สรุป</h3>
          <div className="row-between">
            <span className="muted">รวมแต้มที่ลง</span>
            <strong>{preview.totalStaked.toLocaleString()}</strong>
          </div>
          <div className="row-between">
            <span className="muted">รวมแต้มที่ถูก</span>
            <strong>{preview.totalWon.toLocaleString()}</strong>
          </div>
          <div className="divider" />
          {Object.entries(preview.perUser).map(([uid, agg]) => (
            <div className="list-row" key={uid}>
              <span style={{ flex: 1, fontSize: 13 }} className="muted">
                {uid.slice(0, 10)}…
              </span>
              <span className={agg.net >= 0 ? "delta-up" : "delta-down"}>
                {agg.net >= 0 ? "+" : ""}
                {agg.net.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
