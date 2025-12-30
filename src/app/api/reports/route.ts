import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"
import { generateExcelReport } from "@/lib/excel-generator"
import { generatePDFReport } from "@/lib/pdf-generator"
import { uploadReport } from "@/lib/r2-storage"
import type { ReportData } from "@/lib/excel-generator"

// GET - List all reports for the organization
export async function GET(req: NextRequest) {
    try {
        const { userId, orgId } = await auth()
        if (!userId || !orgId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const year = searchParams.get('year')
        const format = searchParams.get('format')

        let query = supabase
            .from('reports')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })

        if (year) {
            query = query.eq('report_year', parseInt(year))
        }

        if (format) {
            query = query.eq('report_format', format)
        }

        const { data: reports, error } = await query

        if (error) {
            console.error("Error fetching reports:", error)
            return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
        }

        return NextResponse.json({ reports })
    } catch (err: any) {
        console.error("/api/reports GET error", err)
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
    }
}

// POST - Generate a new report
export async function POST(req: NextRequest) {
    try {
        const { userId, orgId } = await auth()
        if (!userId || !orgId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        const body = await req.json()
        const { month, year, format, startDate, endDate, maxTransactions = 1000 } = body

        if (!month || !year || !format) {
            return NextResponse.json({
                error: "Missing required fields: month, year, format"
            }, { status: 400 })
        }

        if (!['excel', 'pdf'].includes(format)) {
            return NextResponse.json({ error: "Invalid format. Must be 'excel' or 'pdf'" }, { status: 400 })
        }

        // Check for existing report and delete it (regenerate)
        const { data: existingReport } = await supabase
            .from('reports')
            .select('id, file_key')
            .eq('organization_id', orgId)
            .eq('report_type', startDate && endDate ? 'custom' : 'monthly')
            .eq('report_month', month)
            .eq('report_year', year)
            .eq('report_format', format)
            .single()

        if (existingReport) {
            // Delete old report record (file will be orphaned but R2 can clean up)
            await supabase
                .from('reports')
                .delete()
                .eq('id', existingReport.id)
        }

        // Create report record with 'generating' status
        const { data: report, error: insertError } = await supabase
            .from('reports')
            .insert({
                organization_id: orgId,
                user_id: userId,
                report_type: startDate && endDate ? 'custom' : 'monthly',
                report_format: format,
                report_month: month,
                report_year: year,
                start_date: startDate,
                end_date: endDate,
                max_transactions: maxTransactions,
                status: 'generating',
            })
            .select()
            .single()

        if (insertError) {
            console.error("Error creating report record:", insertError)
            return NextResponse.json({
                error: "Failed to create report",
                details: insertError.message
            }, { status: 500 })
        }

        // Generate report asynchronously (in production, use a queue)
        generateReportAsync(report.id, orgId, userId, month, year, format, maxTransactions, startDate, endDate)
            .catch(err => console.error("Background report generation error:", err))

        return NextResponse.json({
            success: true,
            reportId: report.id,
            status: 'generating',
            message: 'Report generation started. This may take a few moments.'
        })
    } catch (err: any) {
        console.error("/api/reports POST error", err)
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
    }
}

// Background report generation
async function generateReportAsync(
    reportId: string,
    orgId: string,
    userId: string,
    month: number,
    year: number,
    format: 'excel' | 'pdf',
    maxTransactions: number,
    startDate?: string,
    endDate?: string
) {
    try {
        // Fetch organization name
        const { data: orgData } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', orgId)
            .single()

        const organizationName = orgData?.name || 'Organization'

        // Calculate date range
        const periodStart = startDate || new Date(year, month - 1, 1).toISOString()
        const periodEnd = endDate || new Date(year, month, 0, 23, 59, 59).toISOString()

        // Fetch payments data - only PAID/SETTLED transactions (exclude PENDING)
        // 1. Fetch booths for this org
        const { data: booths, error: boothsError } = await supabase
            .from('booths')
            .select('id')
            .eq('organization_id', orgId)

        if (boothsError) throw boothsError

        const boothIds = booths.map(b => b.id)

        // If no booths, return empty logic (short circuit)
        let payments: any[] = []
        if (boothIds.length > 0) {
            // 2. Fetch payments for these booths - only PAID/SETTLED
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .in('booth_id', boothIds)
                .in('status', ['PAID', 'SETTLED', 'paid', 'settled']) // Only include completed payments
                .gte('created_at', periodStart)
                .lte('created_at', periodEnd)
                .order('created_at', { ascending: false })
                .limit(maxTransactions)

            if (error) throw error
            payments = data || []
        }

        // No error thrown if no booths, just empty payments list
        const paymentsError = null

        if (paymentsError) throw paymentsError

        const allPayments = payments || []
        // All fetched payments are already paid/settled
        const paidPayments = allPayments

        // Calculate analytics
        const paidAmounts = paidPayments.map(p => p.amount)
        const mean = paidAmounts.length > 0 ? paidAmounts.reduce((a, b) => a + b, 0) / paidAmounts.length : 0
        const sorted = [...paidAmounts].sort((a, b) => a - b)
        const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0
        const variance = paidAmounts.length > 0
            ? paidAmounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / paidAmounts.length
            : 0
        const stdDev = Math.sqrt(variance)

        const q1 = sorted[Math.floor(sorted.length * 0.25)] || 0
        const q2 = sorted[Math.floor(sorted.length * 0.5)] || 0
        const q3 = sorted[Math.floor(sorted.length * 0.75)] || 0

        // Hourly distribution
        const hourlyDist: Record<number, { count: number; total: number }> = {}
        for (let i = 0; i < 24; i++) hourlyDist[i] = { count: 0, total: 0 }

        paidPayments.forEach(p => {
            const hour = new Date(p.created_at).getHours()
            hourlyDist[hour].count++
            hourlyDist[hour].total += p.amount
        })

        const hourlyDistribution = Object.entries(hourlyDist).map(([hour, data]) => ({
            hour: parseInt(hour),
            label: `${hour.padStart(2, '0')}:00`,
            transactions: data.count,
            revenue: data.total
        }))

        // Daily revenue
        const dailyRev: Record<string, number[]> = {}
        paidPayments.forEach(p => {
            const date = new Date(p.created_at).toISOString().split('T')[0]
            if (!dailyRev[date]) dailyRev[date] = []
            dailyRev[date].push(p.amount)
        })

        const dailyRevenue = Object.entries(dailyRev).map(([date, amounts]) => ({
            date,
            total: amounts.reduce((s, v) => s + v, 0),
            count: amounts.length
        })).sort((a, b) => a.date.localeCompare(b.date))

        // Performance (simplified - compare with previous period)
        const totalRevenue = paidAmounts.reduce((s, v) => s + v, 0)

        const reportData: ReportData = {
            summary: {
                totalRevenue,
                totalTransactions: allPayments.length,
                paidTransactions: paidPayments.length,
                successRate: allPayments.length > 0 ? (paidPayments.length / allPayments.length) * 100 : 0,
                periodStart,
                periodEnd,
            },
            analytics: {
                mean: Math.round(mean),
                median: Math.round(median),
                stdDev: Math.round(stdDev),
                quartiles: { q1: Math.round(q1), q2: Math.round(q2), q3: Math.round(q3) },
            },
            transactions: allPayments.slice(0, maxTransactions),
            hourlyDistribution,
            dailyRevenue,
            performance: {
                revenueGrowth: 0, // Simplified
                transactionGrowth: 0,
            },
            organizationName,
            maxTransactions,
            totalTransactionsInPeriod: allPayments.length,
        }

        // Generate report file
        let fileBuffer: Buffer
        if (format === 'excel') {
            fileBuffer = await generateExcelReport(reportData)
        } else {
            fileBuffer = await generatePDFReport(reportData)
        }

        // Upload to R2
        const { key, url, size } = await uploadReport({
            organizationId: orgId,
            year,
            month,
            format,
            fileBuffer,
        })

        // Update report record
        await supabase
            .from('reports')
            .update({
                status: 'completed',
                file_key: key,
                file_url: url,
                file_size: size,
                transaction_count: allPayments.length,
                metadata: {
                    totalRevenue,
                    totalTransactions: allPayments.length,
                    successRate: reportData.summary.successRate,
                },
                updated_at: new Date().toISOString(),
            })
            .eq('id', reportId)

        console.log(`Report ${reportId} generated successfully`)
    } catch (error) {
        console.error(`Error generating report ${reportId}:`, error)

        // Update report with error status
        await supabase
            .from('reports')
            .update({
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error',
                updated_at: new Date().toISOString(),
            })
            .eq('id', reportId)
    }
}
