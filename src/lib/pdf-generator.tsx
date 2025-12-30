import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { ReportData } from './excel-generator';

// Define styles for the PDF
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 40,
        fontFamily: 'Helvetica',
    },
    // Cover page
    coverTitle: {
        fontSize: 28,
        textAlign: 'center',
        marginTop: 200,
        color: '#1F2937',
        fontWeight: 'bold',
    },
    coverSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        color: '#6B7280',
    },
    coverPeriod: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 30,
        color: '#374151',
    },
    coverFooter: {
        fontSize: 10,
        textAlign: 'center',
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        color: '#9CA3AF',
    },
    // Section styles
    sectionTitle: {
        fontSize: 18,
        marginBottom: 15,
        color: '#1F2937',
        fontWeight: 'bold',
        borderBottomWidth: 2,
        borderBottomColor: '#3B82F6',
        paddingBottom: 5,
    },
    // Metric box
    metricRow: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    metricBox: {
        flex: 1,
        padding: 15,
        backgroundColor: '#F3F4F6',
        marginRight: 10,
        borderRadius: 4,
    },
    metricLabel: {
        fontSize: 10,
        color: '#6B7280',
        marginBottom: 5,
    },
    metricValue: {
        fontSize: 16,
        color: '#1F2937',
        fontWeight: 'bold',
    },
    // Table styles
    table: {
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#3B82F6',
        padding: 8,
    },
    tableHeaderCell: {
        flex: 1,
        fontSize: 9,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        padding: 6,
    },
    tableCell: {
        flex: 1,
        fontSize: 8,
        color: '#374151',
    },
    // Stats
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    statLabel: {
        fontSize: 10,
        color: '#6B7280',
    },
    statValue: {
        fontSize: 10,
        color: '#1F2937',
        fontWeight: 'bold',
    },
    // Warning box
    warningBox: {
        backgroundColor: '#FEF3C7',
        border: '1px solid #F59E0B',
        padding: 10,
        marginTop: 15,
        borderRadius: 4,
    },
    warningText: {
        fontSize: 9,
        color: '#92400E',
    },
    // Page number
    pageNumber: {
        position: 'absolute',
        fontSize: 8,
        bottom: 20,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: '#9CA3AF',
    },
});

// Helper function
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

// PDF Document Component
const ReportDocument: React.FC<{ data: ReportData }> = ({ data }) => {
    const periodStart = new Date(data.summary.periodStart).toLocaleDateString('id-ID');
    const periodEnd = new Date(data.summary.periodEnd).toLocaleDateString('id-ID');

    return (
        <Document>
        {/* Cover Page */ }
        < Page size = "A4" style = { styles.page } >
            <Text style={ styles.coverTitle }> Monthly Business Report </Text>
                < Text style = { styles.coverSubtitle } > { data.organizationName } </Text>
                    < Text style = { styles.coverPeriod } > { periodStart } - { periodEnd } </Text>
                        < Text style = { styles.coverFooter } > ChronoSnap Business Analytics </Text>
                            </Page>

    {/* Executive Summary */ }
    <Page size="A4" style = { styles.page } >
        <Text style={ styles.sectionTitle }> Executive Summary </Text>

            < View style = { styles.metricRow } >
                <View style={ styles.metricBox }>
                    <Text style={ styles.metricLabel }> Total Revenue </Text>
                        < Text style = { styles.metricValue } > { formatCurrency(data.summary.totalRevenue) } </Text>
                            </View>
                            < View style = { styles.metricBox } >
                                <Text style={ styles.metricLabel }> Total Transactions </Text>
                                    < Text style = { styles.metricValue } > { data.summary.totalTransactions } </Text>
                                        </View>
                                        </View>

                                        < View style = { styles.metricRow } >
                                            <View style={ styles.metricBox }>
                                                <Text style={ styles.metricLabel }> Paid Transactions </Text>
                                                    < Text style = { styles.metricValue } > { data.summary.paidTransactions } </Text>
                                                        </View>
                                                        < View style = {{ ...styles.metricBox, marginRight: 0 }
}>
    <Text style={ styles.metricLabel }> Success Rate </Text>
        < Text style = { styles.metricValue } > { data.summary.successRate.toFixed(1) } % </Text>
            </View>
            </View>

{
    data.totalTransactionsInPeriod > data.maxTransactions && (
        <View style={ styles.warningBox }>
            <Text style={ styles.warningText }>
                            ⚠️ This report shows { data.maxTransactions } of { data.totalTransactionsInPeriod } total transactions.
                        </Text>
        </View>
                )
}

<Text style={ { ...styles.sectionTitle, marginTop: 30 } }> Analytics </Text>

    < View style = { styles.statRow } >
        <Text style={ styles.statLabel }> Mean Transaction </Text>
            < Text style = { styles.statValue } > { formatCurrency(data.analytics.mean) } </Text>
                </View>
                < View style = { styles.statRow } >
                    <Text style={ styles.statLabel }> Median Transaction </Text>
                        < Text style = { styles.statValue } > { formatCurrency(data.analytics.median) } </Text>
                            </View>
                            < View style = { styles.statRow } >
                                <Text style={ styles.statLabel }> Standard Deviation </Text>
                                    < Text style = { styles.statValue } > { formatCurrency(data.analytics.stdDev) } </Text>
                                        </View>
                                        < View style = { styles.statRow } >
                                            <Text style={ styles.statLabel }> Q1(25th percentile) </Text>
                                                < Text style = { styles.statValue } > { formatCurrency(data.analytics.quartiles.q1) } </Text>
                                                    </View>
                                                    < View style = { styles.statRow } >
                                                        <Text style={ styles.statLabel }> Q3(75th percentile) </Text>
                                                            < Text style = { styles.statValue } > { formatCurrency(data.analytics.quartiles.q3) } </Text>
                                                                </View>

                                                                < Text render = {({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} style = { styles.pageNumber } fixed />
                                                                    </Page>

{/* Transaction History */ }
<Page size="A4" style = { styles.page } >
    <Text style={ styles.sectionTitle }> Transaction History </Text>

        < View style = { styles.table } >
            <View style={ styles.tableHeader }>
                <Text style={ styles.tableHeaderCell }> Date / Time </Text>
                    < Text style = { styles.tableHeaderCell } > ID </Text>
                        < Text style = { styles.tableHeaderCell } > Amount </Text>
                            < Text style = { styles.tableHeaderCell } > Status </Text>
                                </View>

{
    data.transactions.slice(0, 30).map((tx, index) => (
        <View key= { index } style = { styles.tableRow } >
        <Text style={ styles.tableCell } >
        { new Date(tx.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) }
        </Text>
    < Text style = { styles.tableCell } > { tx.id.substring(0, 8) } </Text>
    < Text style = { styles.tableCell } > { formatCurrency(tx.amount)
} </Text>
    < Text style = { styles.tableCell } > { tx.status } </Text>
        </View>
                    ))}
</View>

{
    data.transactions.length > 30 && (
        <Text style={ { fontSize: 9, color: '#6B7280', marginTop: 10 } }>
                        ... and { data.transactions.length - 30 } more transactions
        </Text>
                )
}

<Text render={ ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}` } style = { styles.pageNumber } fixed />
    </Page>
    </Document>
    );
};

export async function generatePDFReport(data: ReportData): Promise<Buffer> {
    try {
        const buffer = await renderToBuffer(<ReportDocument data={ data } />);
        return Buffer.from(buffer);
    } catch (error) {
        console.error('Error generating PDF with react-pdf:', error);
        throw error;
    }
}

export default {
    generatePDFReport,
};
