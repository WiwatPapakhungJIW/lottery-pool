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
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ชื่อวง เช่น วงเพื่อนซอย 7"
      />{" "}
      <input
        type="number"
        value={budget}
        min={1}
        onChange={(e) => setBudget(Number(e.target.value))}
        style={{ width: 110 }}
        title="งบแต้มต่อคนต่องวด"
      />{" "}
      <button onClick={submit} disabled={pending || !name.trim()}>
        {pending ? "กำลังสร้าง…" : "สร้างวง"}
      </button>
      {created && (
        <p style={{ color: "green" }}>
          สร้างแล้ว · โค้ดเชิญ <b>{created}</b>
        </p>
      )}
      {err && <p style={{ color: "crimson" }}>{err}</p>}
    </div>
  );
}
