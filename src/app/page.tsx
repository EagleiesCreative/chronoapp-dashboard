import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-full">
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-[#0b0b0b] m-6">
        <h2 className="text-2xl font-semibold">Welcome to ChronoSnap</h2>
        <p className="mt-2 text-sm text-muted-foreground">This is your backoffice dashboard. Customize it to manage booths, photos, and sessions.</p>

        <SignedOut>
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">Please sign in to access the dashboard features.</p>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-md border p-4">Booths<br/><span className="text-2xl font-bold">3</span></div>
            <div className="rounded-md border p-4">Active Sessions<br/><span className="text-2xl font-bold">1</span></div>
            <div className="rounded-md border p-4">Photos Today<br/><span className="text-2xl font-bold">124</span></div>
          </div>

          <div className="mt-6">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
          </div>
        </SignedIn>
      </div>
    </div>
  )
}
