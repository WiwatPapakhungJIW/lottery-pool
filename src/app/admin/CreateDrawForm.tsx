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
    <div style={{ marginTop: 6 }}>
      <label style={{ fontSize: 13 }}>
        วันที่งวด{" "}
        <input
          type="date"
          value={drawDate}
          onChange={(e) => setDrawDate(e.target.value)}
        />
      </label>{" "}
      <label style={{ fontSize: 13 }}>
        ปิดรับ{" "}
        <input
          type="datetime-local"
          value={closeAt}
          onChange={(e) => setCloseAt(e.target.value)}
        />
      </label>{" "}
      <button onClick={submit} disabled={pending || !drawDate || !closeAt}>
        {pending ? "กำลังเปิด…" : "เปิดงวด"}
      </button>
      {err && <p style={{ color: "crimson", fontSize: 13 }}>{err}</p>}
    </div>
  );
}
