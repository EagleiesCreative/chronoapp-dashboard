import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Export dashboard data to a proper .xlsx Excel file.
 * Uses file-saver's saveAs() for reliable browser downloads with correct filenames.
 *
 * @param transactions The array of transaction objects
 * @param stats Optional analytics stats object
 * @param filename The desired filename (must end in .xlsx)
 */
export function exportToExcel(
    transactions: any[],
    stats?: any,
    filename: string = 'chrono-analytics.xlsx'
) {
    if ((!transactions || transactions.length === 0) && !stats) {
        console.warn('No data to export.');
        return;
    }

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Analytics Summary ──
    if (stats) {
        const summaryRows = [
            ['ChronoSnap Analytics Report'],
            [],
            ['Metric', 'Value'],
            ['Total Revenue (IDR)', stats.totalRevenue || 0],
            ['Total Transactions', stats.totalTransactions || 0],
            ['Success Rate', `${stats.successRate || 0}%`],
            ['Paid Transactions', stats.paidCount || 0],
            ['Pending Transactions', stats.pendingCount || 0],
            ['Expired/Failed Transactions', stats.expiredCount || 0],
            [],
            ['Generated At', new Date().toLocaleString()],
        ];

        const ws = XLSX.utils.aoa_to_sheet(summaryRows);
        ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Analytics Summary');
    }

    // ── Sheet 2: Transactions ──
    if (transactions && transactions.length > 0) {
        const rows = transactions.map(tx => {
            const d = new Date(tx.created);
            return {
                'Payment ID': tx.external_id || 'N/A',
                'Amount (IDR)': tx.amount || 0,
                'Payment Method': tx.payment_method || 'QRIS',
                'Status': tx.status || '',
                'Processed Date': d.toLocaleString(),
                'Customer': 'Guest User',
            };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
            { wch: 35 },
            { wch: 15 },
            { wch: 18 },
            { wch: 12 },
            { wch: 22 },
            { wch: 15 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    }

    // ── Generate the .xlsx binary and trigger download via file-saver ──
    const wbArrayBuffer = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array',  // returns ArrayBuffer
    });

    const blob = new Blob([wbArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // file-saver's saveAs() reliably sets the filename in all browsers
    saveAs(blob, filename);
}
