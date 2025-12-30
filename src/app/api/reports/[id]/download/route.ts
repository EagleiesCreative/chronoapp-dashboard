import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"
import { refreshSignedUrl } from "@/lib/r2-storage"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId, orgId } = await auth()
        if (!userId || !orgId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        const { id: reportId } = await params

        // Fetch report
        const { data: report, error } = await supabase
            .from('reports')
            .select('*')
            .eq('id', reportId)
            .eq('organization_id', orgId)
            .single()

        if (error || !report) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 })
        }

        if (report.status !== 'completed') {
            return NextResponse.json({
                error: "Report is not ready for download",
                status: report.status
            }, { status: 400 })
        }

        // Refresh signed URL if needed (in case it expired)
        let downloadUrl = report.file_url

        if (report.file_key) {
            try {
                downloadUrl = await refreshSignedUrl(report.file_key)

                // Update URL in database
                await supabase
                    .from('reports')
                    .update({ file_url: downloadUrl })
                    .eq('id', reportId)
            } catch (err) {
                console.error("Error refreshing signed URL:", err)
            }
        }

        // Redirect to signed URL
        return NextResponse.redirect(downloadUrl)
    } catch (err: any) {
        console.error("/api/reports/[id]/download GET error", err)
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
    }
}
