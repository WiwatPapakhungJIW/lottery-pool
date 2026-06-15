"use client";

import { useState, useTransition } from "react";
import { adminSetRoomRates } from "@/app/actions";
import type { BetType } from "@/scoring";

const LABEL: Record<BetType, string> = {
  THREE_TOP: "3 ตัวบน",
  THREE_BOTTOM: "3 ตัวล่าง",
  THREE_TOTE: "3 ตัวโต๊ด",
  TWO_TOP: "2 ตัวบน",
  TWO_BOTTOM: "2 ตัวล่าง",
  TWO_TOTE: "2 ตัวโต๊ด",
  RUN_TOP: "วิ่งบน",
  RUN_BOTTOM: "วิ่งล่าง",
};

export function RatesForm({
  roomId,
  initial,
  order,
}: {
  roomId: string;
  initial: Record<BetType, number>;
  order: BetType[];
}) {
  const [rates, setRates] = useState<Record<BetType, number>>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    setErr(null);
    start(async () => {
      try {
        const entries = order.map((bt) => ({ betType: bt, rate: rates[bt] }));
        await adminSetRoomRates(roomId, entries);
        setMsg("บันทึกอัตราจ่ายแล้ว (มีผลกับโพยใหม่)");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
      }
    });
  }

  return (
    <>
      <div className="card">
        {order.map((bt) => (
          <div className="list-row" key={bt}>
            <span style={{ flex: 1 }}>{LABEL[bt]}</span>
            <span className="faint">บาทละ ×</span>
            <input
              type="number"
              min={1}
              value={rates[bt]}
              onChange={(e) =>
                setRates((r) => ({ ...r, [bt]: Number(e.target.value) }))
              }
              style={{ width: 90 }}
            />
          </div>
        ))}
      </div>

      <button
        className="btn-primary btn-block"
        onClick={save}
        disabled={pending}
      >
        {pending ? "กำลังบันทึก…" : "บันทึกอัตราจ่าย"}
      </button>
      {msg && <p className="note ok">{msg}</p>}
      {err && <p className="note err">{err}</p>}
    </>
  );
}
