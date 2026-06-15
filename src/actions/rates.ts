// rates.ts — อัตราจ่าย (เรต) ต่อวง: อ่าน/ตั้งค่า RoomBetRate
// service ฝั่ง server เท่านั้น (เรียกผ่าน app/actions.ts ที่ verify admin)
// แก้เรตมีผลกับ "โพยใหม่" เท่านั้น โพยเก่าใช้ snapshot เดิม (ดู resolvePayoutRate)

import { prisma } from "../db";
import { DEFAULT_PAYOUT_RATES, type BetType } from "../scoring";

export const ALL_BET_TYPES = Object.keys(DEFAULT_PAYOUT_RATES) as BetType[];

/** เรตปัจจุบันของวง = override จาก RoomBetRate ทับ default */
export async function getRoomRates(
  roomId: string,
): Promise<Record<BetType, number>> {
  const rows = await prisma.roomBetRate.findMany({ where: { roomId } });
  const map = { ...DEFAULT_PAYOUT_RATES };
  for (const r of rows) map[r.betType as BetType] = r.rate;
  return map;
}

export async function setRoomRates(
  roomId: string,
  entries: { betType: BetType; rate: number }[],
) {
  for (const e of entries)
    if (!Number.isInteger(e.rate) || e.rate <= 0)
      throw new Error(`เรตของ ${e.betType} ต้องเป็นจำนวนเต็มบวก`);

  await prisma.$transaction(
    entries.map((e) =>
      prisma.roomBetRate.upsert({
        where: { roomId_betType: { roomId, betType: e.betType } },
        create: { roomId, betType: e.betType, rate: e.rate },
        update: { rate: e.rate },
      }),
    ),
  );
  return { count: entries.length };
}
