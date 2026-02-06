import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const authToken = request.cookies.get("auth-token");
    const isLoginPage = request.nextUrl.pathname === "/login";
    const isAuthApi = request.nextUrl.pathname.startsWith("/api/auth");

    // Allow auth API and login page without authentication
    if (isAuthApi || isLoginPage) {
        return NextResponse.next();
    }

    // Redirect to login if not authenticated
    if (!authToken) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
    ]
};
