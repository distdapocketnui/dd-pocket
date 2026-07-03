import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const { pathname, search } = new URL(request.url);

  // Redirect vercel.app → web.id (kecuali ada ?app=1 sebagai fallback)
  if (hostname.includes("vercel.app") && !search.includes("app=1")) {
    return NextResponse.redirect(
      `https://distda-pocketnui.web.id${pathname}${search}`,
      302 // Temporary redirect — tidak di-cache permanen
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
