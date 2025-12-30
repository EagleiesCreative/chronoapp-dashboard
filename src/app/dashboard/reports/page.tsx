"use client"

import { useState, useEffect } from "react"
import { useOrganization } from "@clerk/nextjs"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
    IconFileAnalytics,
    IconLoader,
    IconDownload,
    IconFileSpreadsheet,
    IconFileTypePdf,
    IconClock,
    IconCheck,
    IconAlertCircle,
    IconRefresh
} from "@tabler/icons-react"

interface Report {
    id: string
    report_type: string
    report_format: string
    report_month: number
    report_year: number
    file_size: number
    transaction_count: number
    status: string
    created_at: string
    metadata: any
}

const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
]

export default function ReportsPage() {
    const { organization } = useOrganization()
    const [reports, setReports] = useState<Report[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)

    // Form state
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [selectedFormat, setSelectedFormat] = useState<'excel' | 'pdf'>('excel')
    const [maxTransactions, setMaxTransactions] = useState(1000)

    // Filter state
    const [filterYear, setFilterYear] = useState<string>('all')
    const [filterFormat, setFilterFormat] = useState<string>('all')

    useEffect(() => {
        fetchReports()
    }, [filterYear, filterFormat])

    // Auto-refresh every 5 seconds if there are generating reports
    useEffect(() => {
        const hasGenerating = reports.some(r => r.status === 'generating')

        if (!hasGenerating) return

        const interval = setInterval(() => {
            fetchReports()
        }, 5000)

        return () => clearInterval(interval)
    }, [reports])

    const fetchReports = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filterYear !== 'all') params.append('year', filterYear)
            if (filterFormat !== 'all') params.append('format', filterFormat)

            const res = await fetch(`/api/reports?${params}`)
            const data = await res.json()

            if (data.reports) {
                setReports(data.reports)
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error)
            toast.error('Failed to load reports')
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateReport = async () => {
        setGenerating(true)
        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    month: selectedMonth,
                    year: selectedYear,
                    format: selectedFormat,
                    maxTransactions,
                })
            })

            const result = await res.json()

            if (!res.ok) {
                console.error('API Error:', result)
                throw new Error(result.error || result.details || 'Failed to generate report')
            }

            toast.success('Report generation started! This may take a few moments.')
            fetchReports()
        } catch (error: any) {
            console.error('Generate error:', error)
            toast.error(error.message || 'Failed to generate report')
        } finally {
            setGenerating(false)
        }
    }

    const handleDownload = (reportId: string) => {
        window.open(`/api/reports/${reportId}/download`, '_blank')
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><IconCheck className="h-3 w-3 mr-1" />Completed</Badge>
            case 'generating':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><IconLoader className="h-3 w-3 mr-1 animate-spin" />Generating</Badge>
            case 'failed':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><IconAlertCircle className="h-3 w-3 mr-1" />Failed</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6" suppressHydrationWarning>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
                    <p className="text-sm text-muted-foreground">
                        Generate and download monthly business reports
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
                    <IconRefresh className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Generate New Report */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <IconFileAnalytics className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Generate New Report</CardTitle>
                            <CardDescription>Create a comprehensive monthly business report</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Month */}
                        <div className="space-y-2">
                            <Label>Month</Label>
                            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS.map(month => (
                                        <SelectItem key={month.value} value={month.value.toString()}>
                                            {month.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Year */}
                        <div className="space-y-2">
                            <Label>Year</Label>
                            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(year => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Format */}
                        <div className="space-y-2">
                            <Label>Format</Label>
                            <Select value={selectedFormat} onValueChange={(v: 'excel' | 'pdf') => setSelectedFormat(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="excel">
                                        <div className="flex items-center gap-2">
                                            <IconFileSpreadsheet className="h-4 w-4 text-green-600" />
                                            Excel (.xlsx)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="pdf">
                                        <div className="flex items-center gap-2">
                                            <IconFileTypePdf className="h-4 w-4 text-red-600" />
                                            PDF (.pdf)
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Max Transactions */}
                        <div className="space-y-2">
                            <Label>Max Transactions</Label>
                            <Select value={maxTransactions.toString()} onValueChange={(v) => setMaxTransactions(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="100">100</SelectItem>
                                    <SelectItem value="500">500</SelectItem>
                                    <SelectItem value="1000">1000</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Button onClick={handleGenerateReport} disabled={generating} className="w-full md:w-auto">
                        {generating ? (
                            <>
                                <IconLoader className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <IconFileAnalytics className="h-4 w-4 mr-2" />
                                Generate Report
                            </>
                        )}
                    </Button>

                    <p className="text-xs text-muted-foreground">
                        💡 Reports include analytics, transaction history, charts, and performance metrics.
                        Large reports may take 30-60 seconds to generate.
                    </p>
                </CardContent>
            </Card>

            {/* Reports List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Available Reports</CardTitle>
                            <CardDescription>Download previously generated reports</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Select value={filterYear} onValueChange={setFilterYear}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    {years.map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filterFormat} onValueChange={setFilterFormat}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Formats</SelectItem>
                                    <SelectItem value="excel">Excel</SelectItem>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <IconLoader className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <IconFileAnalytics className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No reports generated yet</p>
                            <p className="text-sm">Generate your first report above</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map(report => (
                                <div key={report.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        {report.report_format === 'excel' ? (
                                            <IconFileSpreadsheet className="h-8 w-8 text-green-600" />
                                        ) : (
                                            <IconFileTypePdf className="h-8 w-8 text-red-600" />
                                        )}
                                        <div>
                                            <p className="font-medium">
                                                {MONTHS.find(m => m.value === report.report_month)?.label} {report.report_year}
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span>{report.transaction_count} transactions</span>
                                                <span>•</span>
                                                <span>{formatFileSize(report.file_size)}</span>
                                                <span>•</span>
                                                <span><IconClock className="h-3 w-3 inline mr-1" />{new Date(report.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(report.status)}
                                        {report.status === 'completed' && (
                                            <Button size="sm" onClick={() => handleDownload(report.id)}>
                                                <IconDownload className="h-4 w-4 mr-2" />
                                                Download
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
