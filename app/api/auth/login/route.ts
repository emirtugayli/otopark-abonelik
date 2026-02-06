import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        const adminUsername = process.env.ADMIN_USERNAME || "admin";
        const adminPassword = process.env.ADMIN_PASSWORD || "admin";

        if (username === adminUsername && password === adminPassword) {
            // Set session cookie
            cookies().set("auth-token", "authenticated", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24 * 7 // 7 days
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { error: "Kullanıcı adı veya şifre hatalı" },
            { status: 401 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: "Giriş işlemi başarısız" },
            { status: 500 }
        );
    }
}
