"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinRoomAction } from "@/app/actions";

export function JoinForm({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setErr(null);
    start(async () => {
      try {
        const { roomId, roomName } = await joinRoomAction(code);
        router.push(`/room/${roomId}/leaderboard`);
        router.refresh();
        void roomName;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "เข้าร่วมไม่สำเร็จ");
      }
    });
  }

  return (
    <section>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="โค้ดเชิญ เช่น DEMOAB12"
        style={{ textTransform: "uppercase" }}
      />{" "}
      <button onClick={submit} disabled={pending || !code.trim()}>
        {pending ? "กำลังเข้าร่วม…" : "เข้าร่วมวง"}
      </button>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
    </section>
  );
}
