import { NextResponse } from "next/server";

export async function GET() {
    throw new Error("Sentry Test Error: This is a deliberate error to verify Sentry integration.");

    return NextResponse.json({ message: "Should not be reached" });
}
