// ป้องกันหน้าเล่น/แอดมิน — ต้องล็อกอินก่อน
import { auth } from "@/auth";

export default auth((req) => {
  if (!req.auth) {
    const url = new URL("/", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/draw/:path*", "/admin/:path*"],
};
