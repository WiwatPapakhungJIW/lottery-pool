import Link from "next/link";
import { auth } from "@/auth";
import { JoinForm } from "./JoinForm";

// เข้าร่วมวงด้วยโค้ดเชิญ — รองรับ /join?code=DEMOAB12 (ลิงก์เชิญ)
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null; // middleware กันอยู่แล้ว

  const { code } = await searchParams;

  return (
    <main>
      <h1>เข้าร่วมวง</h1>
      <p>ใส่โค้ดเชิญที่เพื่อนส่งให้</p>
      <JoinForm initialCode={code ?? ""} />
      <p>
        <Link href="/">← กลับหน้าแรก</Link>
      </p>
    </main>
  );
}
