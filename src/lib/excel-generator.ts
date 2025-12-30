import ExcelJS from 'exceljs';

export interface ReportData {
    summary: {
        totalRevenue: number;
        totalTransactions: number;
        paidTransactions: number;
        successRate: number;
        periodStart: string;
        periodEnd: string;
    };
    analytics: {
        mean: number;
        median: number;
        stdDev: number;
        quartiles: { q1: number; q2: number; q3: number };
    };
    transactions: Array<{
        id: string;
        created_at: string;
        amount: number;
        status: string;
        booth_id?: string;
    }>;
    hourlyDistribution: Array<{
        hour: number;
        label: string;
        transactions: number;
        revenue: number;
    }>;
    dailyRevenue: Array<{
        date: string;
        total: number;
        count: number;
    }>;
    performance: {
        revenueGrowth: number;
        transactionGrowth: number;
    };
    organizationName: string;
    maxTransactions: number;
    totalTransactionsInPeriod: number;
}

export async function generateExcelReport(data: ReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = 'ChronoSnap';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Sheet 1: Executive Summary
    await createExecutiveSummarySheet(workbook, data);

    // Sheet 2: Revenue Analytics
    await createRevenueAnalyticsSheet(workbook, data);

    // Sheet 3: Transaction Distribution
    await createDistributionSheet(workbook, data);

    // Sheet 4: Transaction History
    await createTransactionHistorySheet(workbook, data);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

async function createExecutiveSummarySheet(workbook: ExcelJS.Workbook, data: ReportData) {
    const sheet = workbook.addWorksheet('Executive Summary', {
        views: [{ showGridLines: false }]
    });

    // Title
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${data.organizationName} - Monthly Business Report`;
    titleCell.font = { size: 18, bold: true, color: { argb: 'FF1F2937' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Period
    sheet.mergeCells('A2:F2');
    const periodCell = sheet.getCell('A2');
    periodCell.value = `Period: ${new Date(data.summary.periodStart).toLocaleDateString()} - ${new Date(data.summary.periodEnd).toLocaleDateString()}`;
    periodCell.font = { size: 12, color: { argb: 'FF6B7280' } };
    periodCell.alignment = { horizontal: 'center' };

    sheet.addRow([]); // Spacer

    // Key Metrics Cards
    const metrics = [
        { label: 'Total Revenue', value: formatCurrency(data.summary.totalRevenue), color: 'FF3B82F6' },
        { label: 'Total Transactions', value: data.summary.totalTransactions.toString(), color: 'FF10B981' },
        { label: 'Success Rate', value: `${data.summary.successRate.toFixed(1)}%`, color: 'FF8B5CF6' },
    ];

    let currentRow = 4;
    metrics.forEach((metric, idx) => {
        const col = idx * 2 + 1;

        // Metric label
        const labelCell = sheet.getCell(currentRow, col);
        labelCell.value = metric.label;
        labelCell.font = { size: 10, color: { argb: 'FF6B7280' }, bold: true };
        labelCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3F4F6' }
        };
        labelCell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };

        // Metric value
        const valueCell = sheet.getCell(currentRow + 1, col);
        valueCell.value = metric.value;
        valueCell.font = { size: 16, bold: true, color: { argb: metric.color } };
        valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
        valueCell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };

        sheet.getColumn(col).width = 20;
        sheet.getRow(currentRow + 1).height = 25;
    });

    currentRow += 3;

    // Performance Indicators
    sheet.getCell(currentRow, 1).value = 'Performance vs Previous Period';
    sheet.getCell(currentRow, 1).font = { size: 12, bold: true };
    currentRow++;

    sheet.getCell(currentRow, 1).value = 'Revenue Growth:';
    sheet.getCell(currentRow, 2).value = `${data.performance.revenueGrowth >= 0 ? '+' : ''}${data.performance.revenueGrowth.toFixed(1)}%`;
    sheet.getCell(currentRow, 2).font = {
        bold: true,
        color: { argb: data.performance.revenueGrowth >= 0 ? 'FF10B981' : 'FFEF4444' }
    };

    currentRow++;
    sheet.getCell(currentRow, 1).value = 'Transaction Growth:';
    sheet.getCell(currentRow, 2).value = `${data.performance.transactionGrowth >= 0 ? '+' : ''}${data.performance.transactionGrowth.toFixed(1)}%`;
    sheet.getCell(currentRow, 2).font = {
        bold: true,
        color: { argb: data.performance.transactionGrowth >= 0 ? 'FF10B981' : 'FFEF4444' }
    };

    // Pagination info if applicable
    if (data.totalTransactionsInPeriod > data.maxTransactions) {
        currentRow += 2;
        sheet.mergeCells(`A${currentRow}:F${currentRow}`);
        const noteCell = sheet.getCell(currentRow, 1);
        noteCell.value = `⚠️ This report shows ${data.maxTransactions} of ${data.totalTransactionsInPeriod} total transactions in this period. Generate a custom date range report to view specific transactions.`;
        noteCell.font = { size: 10, italic: true, color: { argb: 'FFF59E0B' } };
        noteCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFBEB' }
        };
        noteCell.border = {
            top: { style: 'thin', color: { argb: 'FFF59E0B' } },
            bottom: { style: 'thin', color: { argb: 'FFF59E0B' } },
            left: { style: 'thin', color: { argb: 'FFF59E0B' } },
            right: { style: 'thin', color: { argb: 'FFF59E0B' } },
        };
        noteCell.alignment = { wrapText: true, vertical: 'middle' };
        sheet.getRow(currentRow).height = 30;
    }
}

async function createRevenueAnalyticsSheet(workbook: ExcelJS.Workbook, data: ReportData) {
    const sheet = workbook.addWorksheet('Revenue Analytics');

    // Title
    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = 'Revenue Analytics';
    sheet.getCell('A1').font = { size: 14, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    // Statistical Measures
    sheet.getCell('A3').value = 'Statistical Measures';
    sheet.getCell('A3').font = { bold: true };

    const stats = [
        ['Mean Transaction', formatCurrency(data.analytics.mean)],
        ['Median Transaction', formatCurrency(data.analytics.median)],
        ['Standard Deviation', formatCurrency(data.analytics.stdDev)],
        ['Q1 (25th percentile)', formatCurrency(data.analytics.quartiles.q1)],
        ['Q2 (50th percentile)', formatCurrency(data.analytics.quartiles.q2)],
        ['Q3 (75th percentile)', formatCurrency(data.analytics.quartiles.q3)],
    ];

    let row = 4;
    stats.forEach(([label, value]) => {
        sheet.getCell(row, 1).value = label;
        sheet.getCell(row, 2).value = value;
        sheet.getCell(row, 2).font = { bold: true };
        row++;
    });

    // Daily Revenue Chart Data
    row += 2;
    sheet.getCell(row, 1).value = 'Daily Revenue Trend';
    sheet.getCell(row, 1).font = { bold: true };
    row++;

    sheet.getCell(row, 1).value = 'Date';
    sheet.getCell(row, 2).value = 'Revenue';
    sheet.getCell(row, 3).value = 'Transactions';
    sheet.getRow(row).font = { bold: true };
    row++;

    data.dailyRevenue.forEach(day => {
        sheet.getCell(row, 1).value = new Date(day.date).toLocaleDateString();
        sheet.getCell(row, 2).value = day.total;
        sheet.getCell(row, 2).numFmt = '"Rp"#,##0';
        sheet.getCell(row, 3).value = day.count;
        row++;
    });

    // Column widths
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 20;
    sheet.getColumn(3).width = 15;
}

async function createDistributionSheet(workbook: ExcelJS.Workbook, data: ReportData) {
    const sheet = workbook.addWorksheet('Transaction Distribution');

    // Title
    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = 'Hourly Transaction Distribution';
    sheet.getCell('A1').font = { size: 14, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    // Headers
    sheet.getCell('A3').value = 'Hour';
    sheet.getCell('B3').value = 'Transactions';
    sheet.getCell('C3').value = 'Revenue';
    sheet.getRow(3).font = { bold: true };

    let row = 4;
    data.hourlyDistribution.forEach(hour => {
        sheet.getCell(row, 1).value = hour.label;
        sheet.getCell(row, 2).value = hour.transactions;
        sheet.getCell(row, 3).value = hour.revenue;
        sheet.getCell(row, 3).numFmt = '"Rp"#,##0';
        row++;
    });

    // Column widths
    sheet.getColumn(1).width = 12;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 20;
}

async function createTransactionHistorySheet(workbook: ExcelJS.Workbook, data: ReportData) {
    const sheet = workbook.addWorksheet('Transaction History');

    // Title with pagination info
    sheet.mergeCells('A1:E1');
    const title = data.totalTransactionsInPeriod > data.maxTransactions
        ? `Transaction History (Showing ${data.transactions.length} of ${data.totalTransactionsInPeriod} total)`
        : `Transaction History (${data.transactions.length} transactions)`;
    sheet.getCell('A1').value = title;
    sheet.getCell('A1').font = { size: 14, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    // Headers
    const headers = ['Date/Time', 'Transaction ID', 'Amount', 'Status', 'Booth ID'];
    headers.forEach((header, idx) => {
        const cell = sheet.getCell(3, idx + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF3B82F6' }
        };
        cell.alignment = { horizontal: 'center' };
    });

    // Data rows
    let row = 4;
    data.transactions.forEach(tx => {
        sheet.getCell(row, 1).value = new Date(tx.created_at).toLocaleString();
        sheet.getCell(row, 2).value = tx.id.substring(0, 8);
        sheet.getCell(row, 3).value = tx.amount;
        sheet.getCell(row, 3).numFmt = '"Rp"#,##0';
        sheet.getCell(row, 4).value = tx.status;
        sheet.getCell(row, 5).value = tx.booth_id || 'N/A';

        // Conditional formatting for status
        const statusCell = sheet.getCell(row, 4);
        if (tx.status === 'PAID' || tx.status === 'SETTLED') {
            statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD1FAE5' }
            };
            statusCell.font = { color: { argb: 'FF065F46' } };
        } else if (tx.status === 'PENDING') {
            statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFEF3C7' }
            };
            statusCell.font = { color: { argb: 'FF92400E' } };
        } else {
            statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFECACA' }
            };
            statusCell.font = { color: { argb: 'FF991B1B' } };
        }

        row++;
    });

    // Column widths
    sheet.getColumn(1).width = 20;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 15;
    sheet.getColumn(4).width = 12;
    sheet.getColumn(5).width = 15;

    // Auto-filter
    sheet.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: row - 1, column: 5 }
    };
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export default {
    generateExcelReport,
};
