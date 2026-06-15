"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminCreateDraw } from "@/app/actions";

export function CreateDrawForm({ roomId }: { roomId: string }) {
  const [drawDate, setDrawDate] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setErr(null);
    start(async () => {
      try {
        await adminCreateDraw(roomId, drawDate, closeAt);
        setDrawDate("");
        setCloseAt("");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "เปิดงวดไม่สำเร็จ");
      }
    });
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>เปิดงวดใหม่</h3>
      <div className="field">
        <label>วันที่งวด</label>
        <input
          type="date"
          value={drawDate}
          onChange={(e) => setDrawDate(e.target.value)}
        />
      </div>
      <div className="field">
        <label>เวลาปิดรับ</label>
        <input
          type="datetime-local"
          value={closeAt}
          onChange={(e) => setCloseAt(e.target.value)}
        />
      </div>
      <button
        className="btn-block"
        onClick={submit}
        disabled={pending || !drawDate || !closeAt}
      >
        {pending ? "กำลังเปิด…" : "เปิดงวด"}
      </button>
      {err && <p className="note err">{err}</p>}
    </div>
  );
}
