import { auth, signIn, signOut } from "@/auth";

// หน้าแรก — ยังไม่ล็อกอินโชว์ปุ่ม LINE, ล็อกอินแล้วโชว์โปรไฟล์
export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main>
        <h1>วงหวยเพื่อน</h1>
        <p>เกมทายผลหวยในกลุ่มเพื่อน เล่นเอาสนุก ไม่มีเงินจริง</p>
        <form
          action={async () => {
            "use server";
            await signIn("line");
          }}
        >
          <button type="submit">เข้าสู่ระบบด้วย LINE</button>
        </form>
      </main>
    );
  }

  return (
    <main>
      <h1>สวัสดี {session.user.name ?? "เพื่อน"}</h1>
      <p>บทบาท: {session.user.role}</p>
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <button type="submit">ออกจากระบบ</button>
      </form>
    </main>
  );
}
