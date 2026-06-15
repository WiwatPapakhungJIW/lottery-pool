"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminCreateRoom } from "@/app/actions";

export function CreateRoomForm() {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState(10000);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setErr(null);
    setCreated(null);
    start(async () => {
      try {
        const { inviteCode } = await adminCreateRoom(name, budget);
        setCreated(inviteCode);
        setName("");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "สร้างไม่สำเร็จ");
      }
    });
  }

  return (
    <div>
      <div className="field">
        <label>ชื่อวง</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="เช่น วงเพื่อนซอย 7"
        />
      </div>
      <div className="field">
        <label>งบแต้มต่อคนต่องวด</label>
        <input
          type="number"
          value={budget}
          min={1}
          onChange={(e) => setBudget(Number(e.target.value))}
        />
      </div>
      <button
        className="btn-primary btn-block"
        onClick={submit}
        disabled={pending || !name.trim()}
      >
        {pending ? "กำลังสร้าง…" : "สร้างวง"}
      </button>
      {created && (
        <p className="note ok">
          สร้างแล้ว · โค้ดเชิญ{" "}
          <span style={{ fontWeight: 700, letterSpacing: 1 }}>{created}</span>
        </p>
      )}
      {err && <p className="note err">{err}</p>}
    </div>
  );
}
