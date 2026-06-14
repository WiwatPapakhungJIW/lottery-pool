"use server";

// Server Actions จริงที่ UI เรียก — ดึง userId/role จาก session เสมอ
// ไม่เคยรับ userId จาก client → กันสวมรอย

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { placeBet, type BetDraft } from "@/actions/placeBet";
import { joinRoom } from "@/actions/joinRoom";
import { createRoom } from "@/actions/createRoom";
import { createDraw } from "@/actions/createDraw";
import { parseBetSlipImage, type SlipMediaType } from "@/ai";
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
export async function joinRoomAction(inviteCode: string) {
  const user = await requireUser();
  const res = await joinRoom(user.id, inviteCode);
  revalidatePath("/");
  return res;
}

export async function submitBets(drawId: string, items: BetDraft[]) {
  const user = await requireUser();
  const res = await placeBet({ drawId, userId: user.id, items });
  revalidatePath(`/draw/${drawId}`);
  return res;
}

// อ่านโพยจากรูป (Claude vision) → คืน BetDraft[] ให้ผู้เล่นตรวจก่อนยืนยัน
export async function parseSlip(base64: string, mediaType: SlipMediaType) {
  await requireUser();
  return parseBetSlipImage(base64, mediaType);
}

// ── แอดมิน ──
export async function adminCreateRoom(name: string, pointBudgetPerDraw: number) {
  const admin = await requireAdmin();
  const room = await createRoom(admin.id, name, pointBudgetPerDraw);
  revalidatePath("/admin");
  revalidatePath("/");
  return { id: room.id, inviteCode: room.inviteCode };
}

export async function adminCreateDraw(
  roomId: string,
  drawDate: string,
  closeAt: string,
) {
  await requireAdmin();
  const draw = await createDraw(roomId, drawDate, closeAt);
  revalidatePath("/admin");
  revalidatePath("/");
  return { id: draw.id };
}

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
