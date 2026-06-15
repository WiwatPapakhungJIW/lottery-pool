import Link from "next/link";
import { auth } from "@/auth";
import { JoinForm } from "./JoinForm";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { code } = await searchParams;

  return (
    <main>
      <div className="topbar">
        <div className="brand">
          <Link href="/" style={{ fontSize: 20 }}>
            ‹
          </Link>
          <h1>เข้าร่วมวง</h1>
        </div>
      </div>

      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          ใส่โค้ดเชิญที่เพื่อนส่งให้
        </p>
        <JoinForm initialCode={code ?? ""} />
      </div>
    </main>
  );
}
