"use server";

// Server Actions จริงที่ UI เรียก — ดึง userId/role จาก session เสมอ
// ไม่เคยรับ userId จาก client → กันสวมรอย

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { placeBet, type BetDraft } from "@/actions/placeBet";
import { enterResult } from "@/actions/enterResult";
import {
  closeAndSettle,
  revertSettlement,
  previewSettlement,
} from "@/actions/closeAndSettle";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("กรุณาเข้าสู่ระบบ");
  return session.user;
}

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("ต้องเป็นแอดมินเท่านั้น");
  return user;
}

// ── ผู้เล่น ──
export async function submitBets(drawId: string, items: BetDraft[]) {
  const user = await requireUser();
  const res = await placeBet({ drawId, userId: user.id, items });
  revalidatePath(`/draw/${drawId}`);
  return res;
}

// ── แอดมิน ──
export async function adminEnterResult(input: {
  drawId: string;
  first6: string;
  last3a: string;
  last3b: string;
  last2: string;
}) {
  const admin = await requireAdmin();
  const res = await enterResult({ ...input, adminUserId: admin.id });
  revalidatePath(`/draw/${input.drawId}`);
  return res;
}

export async function adminPreviewSettlement(drawId: string) {
  await requireAdmin();
  return previewSettlement(drawId);
}

export async function adminCloseAndSettle(drawId: string) {
  const admin = await requireAdmin();
  const summary = await closeAndSettle({ drawId, adminUserId: admin.id });
  revalidatePath(`/draw/${drawId}`);
  return summary;
}

export async function adminRevertSettlement(drawId: string) {
  const admin = await requireAdmin();
  const res = await revertSettlement({ drawId, adminUserId: admin.id });
  revalidatePath(`/draw/${drawId}`);
  return res;
}
