// Cron endpoint — Vercel เรียกตามตารางใน vercel.json
// ป้องกันด้วย CRON_SECRET (Vercel แนบ Authorization: Bearer <CRON_SECRET> ให้อัตโนมัติ)
import type { NextRequest } from "next/server";
import { closeDueDraws } from "@/actions/closeDueDraws";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await closeDueDraws();
  return Response.json({ ok: true, ...result });
}
