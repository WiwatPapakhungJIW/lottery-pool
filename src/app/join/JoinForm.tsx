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
        const { roomId } = await joinRoomAction(code);
        router.push(`/room/${roomId}/leaderboard`);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "เข้าร่วมไม่สำเร็จ");
      }
    });
  }

  return (
    <div>
      <div className="field">
        <label>โค้ดเชิญ</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="เช่น DEMOAB12"
          style={{ textTransform: "uppercase", letterSpacing: 2 }}
        />
      </div>
      <button
        className="btn-primary btn-block"
        onClick={submit}
        disabled={pending || !code.trim()}
      >
        {pending ? "กำลังเข้าร่วม…" : "เข้าร่วมวง"}
      </button>
      {err && <p className="note err">{err}</p>}
    </div>
  );
}
