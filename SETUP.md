# คู่มือติดตั้งและรันจริง — วงหวยเพื่อน

เกมทายผลหวยในกลุ่มเพื่อน เล่นเอาสนุก **ไม่มีเงินจริง**

ใช้เวลาประมาณ 20–30 นาที สิ่งที่ต้องมี: บัญชี GitHub, Neon (ฟรี), LINE, Vercel (ฟรี)

---

## 1. เตรียมเครื่อง

```bash
node -v            # ต้อง >= 18
npm install        # ติดตั้ง dependencies
```

---

## 2. ฐานข้อมูล Postgres (Neon — ฟรี)

1. สมัคร/เข้า https://neon.tech → **New Project**
2. เลือก region ใกล้ไทย (เช่น Singapore) → Create
3. หน้า **Connection string** → copy แบบ **Pooled connection** (ลงท้าย `?sslmode=require`)
4. เก็บไว้ใส่ `DATABASE_URL` ในขั้นที่ 4

> ใช้ Supabase แทนได้ — copy connection string จาก Project settings → Database

---

## 3. LINE Login channel

1. เข้า https://developers.line.biz/console/
2. สร้าง **Provider** (ถ้ายังไม่มี) เช่นชื่อ "วงหวยเพื่อน"
3. ในโปรไวเดอร์ → **Create a new channel** → เลือก **LINE Login**
4. กรอกข้อมูล channel:
   - App types: เลือก **Web app**
5. แท็บ **Basic settings** → จดค่า:
   - **Channel ID** → ใส่ `AUTH_LINE_ID`
   - **Channel secret** → ใส่ `AUTH_LINE_SECRET`
6. แท็บ **LINE Login** → **Callback URL** ใส่ทั้งสองบรรทัด:
   ```
   http://localhost:3000/api/auth/callback/line
   https://<your-domain>.vercel.app/api/auth/callback/line
   ```
   (โดเมน Vercel ค่อยกลับมาเติมหลัง deploy ในขั้นที่ 7)
7. แท็บ **OpenID Connect** → เปิด **OpenID Connect** ให้ on (จำเป็นต่อการดึงโปรไฟล์)

---

## 4. ตั้งค่า environment

```bash
cp .env.example .env
```

แก้ไฟล์ `.env`:

```bash
DATABASE_URL="postgresql://...neon.tech/...?sslmode=require"   # จากขั้น 2
AUTH_LINE_ID="2007xxxxxx"                                       # จากขั้น 3
AUTH_LINE_SECRET="xxxxxxxxxxxxxxxx"                             # จากขั้น 3
AUTH_SECRET="วางผลจากคำสั่งล่าง"
CRON_SECRET="วางผลจากคำสั่งล่าง"
```

สร้างค่า secret แบบสุ่ม:

```bash
openssl rand -base64 32   # รัน 2 ครั้ง เอาไปใส่ AUTH_SECRET และ CRON_SECRET
```

---

## 5. สร้างตารางในฐานข้อมูล

```bash
npm run db:push        # สร้างทุกตารางตาม prisma/schema.prisma
```

ตรวจดูได้ด้วย `npm run db:studio` (เปิด Prisma Studio บนเบราว์เซอร์)

---

## 6. รันทดสอบ local

```bash
npm run dev            # http://localhost:3000
```

ขั้นตอนทดสอบ:

1. เปิด http://localhost:3000 → กด **เข้าสู่ระบบด้วย LINE** → อนุญาต
   (การ login ครั้งแรกจะสร้างแถวใน `User` ให้อัตโนมัติ)
2. กลับมาที่เทอร์มินัล ตั้งตัวเองเป็นแอดมิน + สร้างวง + เปิดงวด:
   ```bash
   npm run setup:demo
   ```
   สคริปต์จะพิมพ์ลิงก์ `หน้าเล่น` และ `หน้าแอดมิน` ออกมา
3. เปิด `หน้าเล่น` → ลงโพย → ยืนยัน
4. เปิด `หน้าแอดมิน` → กรอกผลรางวัล → **ดูตัวอย่างผลคิดคะแนน** → **เคลียร์งวด**
5. ตรวจแต้มสะสมใน Prisma Studio (ตาราง `Membership.totalPoints`)

> เชิญเพื่อนเข้าวง: ใช้ `inviteCode` ที่สคริปต์พิมพ์ออกมา (UI หน้าเข้าร่วมวงเป็นงานต่อยอด — ตอนนี้เพิ่มสมาชิกผ่าน Studio หรือเขียนหน้า join ได้)

---

## 7. Deploy ขึ้น Vercel

1. push โค้ดขึ้น GitHub
2. https://vercel.com → **Add New Project** → import repo นี้
3. **Environment Variables** ใส่ครบ 5 ตัวเหมือนใน `.env`
   - `DATABASE_URL`, `AUTH_LINE_ID`, `AUTH_LINE_SECRET`, `AUTH_SECRET`, `CRON_SECRET`
4. กด **Deploy**
5. ได้โดเมน `https://<ชื่อ>.vercel.app` แล้ว → กลับไปขั้นที่ 3.6 เติม Callback URL ของโดเมนนี้
6. Cron `/api/cron/close-draws` จะรันอัตโนมัติตาม `vercel.json`
   - แพลน **Hobby**: cron ได้วันละครั้ง (พอใช้ เพราะการกันแทงหลังหมดเวลาบังคับที่โค้ดอยู่แล้ว)
   - ต้องการทุก 5 นาที ใช้แพลน **Pro**

---

## เช็กสุขภาพระบบ

```bash
npm run typecheck      # ตรวจชนิดข้อมูลทั้งโปรเจกต์
npm test               # เทสต์เครื่องคิดคะแนน (ควรผ่าน 20/20)
```

## ปัญหาที่พบบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| login แล้วเด้ง error 400 | Callback URL ใน LINE ไม่ตรงกับโดเมนจริง (ต้องมี `/api/auth/callback/line`) |
| `setup:demo` บอกไม่พบผู้ใช้ | ยังไม่ได้ login ผ่าน LINE สักครั้ง |
| ลงโพยไม่ได้ "เลยเวลาปิดรับ" | `closeAt` ของงวดเลยแล้ว — เปิดงวดใหม่ |
| แต้มไม่อัปเดตหลังเคลียร์ | ยังไม่กรอกผล หรือกดเคลียร์งวดไปแล้ว (ดูสถานะ `SETTLED`) |
