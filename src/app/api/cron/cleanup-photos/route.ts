import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { r2Storage } from "@/lib/r2-storage";

export async function GET(request: Request) {
  // 1. Verify Vercel Cron Authentication
  // Read more: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("Unauthorized cron invocation attempt.");
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("Starting photos cleanup job...");

  try {
    // Calculate timestamp 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    // 2. Fetch sessions older than 30 days that have not been media-deleted yet
    // and have photos_urls or final_image_url
    const { data: sessions, error } = await supabase
      .from("sessions")
      .select("id, photos_urls, final_image_url, video_url")
      .lt("created_at", thirtyDaysAgoIso)
      .is("media_deleted_at", null)
      .limit(50); // Limit batch to avoid Vercel 30s timeout

    if (error) {
      console.error("Failed to fetch sessions for cleanup:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      console.log("No sessions found for cleanup.");
      return NextResponse.json({ message: "No sessions to clean up" });
    }

    console.log(`Found ${sessions.length} sessions to clean up.`);

    const processedSessionIds: string[] = [];

    // 3. Process each session independently
    for (const session of sessions) {
      const urlsToDelete: string[] = [];

      if (session.photos_urls && Array.isArray(session.photos_urls)) {
        urlsToDelete.push(...session.photos_urls);
      }
      if (session.final_image_url) {
        urlsToDelete.push(session.final_image_url);
      }
      if (session.video_url) {
        urlsToDelete.push(session.video_url);
      }

      // Filter out any null/empty strings
      const validUrls = urlsToDelete.filter(Boolean);

      try {
        // Delete all files in parallel via R2
        if (validUrls.length > 0) {
          await Promise.allSettled(
            validUrls.map((url) => r2Storage.deleteFile(url))
          );
        }

        // 4. Update the session record in Supabase
        const { error: updateError } = await supabase
          .from("sessions")
          .update({
            photos_urls: [],
            final_image_url: null,
            video_url: null,
            media_deleted_at: new Date().toISOString(),
          })
          .eq("id", session.id);

        if (updateError) {
            console.error(`Failed to update session ${session.id} after cleanup:`, updateError);
        } else {
            processedSessionIds.push(session.id);
        }
      } catch (err) {
        console.error(`Error processing cleanup for session ${session.id}:`, err);
        // Continue with the next session
      }
    }

    return NextResponse.json({
      message: `Cleanup job completed.`,
      sessionsProcessed: processedSessionIds.length,
      processedIds: processedSessionIds
    });

  } catch (error: any) {
    console.error("Critical error in cleanup job:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
