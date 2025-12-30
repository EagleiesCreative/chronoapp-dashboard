-- Create reports table for tracking generated monthly reports
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS reports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id text NOT NULL,
    user_id text NOT NULL,
    report_type text NOT NULL DEFAULT 'monthly', -- 'monthly', 'custom'
    report_format text NOT NULL, -- 'excel', 'pdf'
    report_month integer NOT NULL, -- 1-12
    report_year integer NOT NULL,
    start_date timestamptz, -- For custom date range reports
    end_date timestamptz, -- For custom date range reports
    file_url text, -- Cloudflare R2 signed URL
    file_key text, -- R2 object key for storage
    file_size bigint, -- File size in bytes
    transaction_count integer, -- Number of transactions in report
    max_transactions integer DEFAULT 1000, -- Pagination limit
    status text NOT NULL DEFAULT 'generating', -- 'generating', 'completed', 'failed'
    error_message text,
    metadata jsonb, -- Store report summary data (revenue, stats, etc.)
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(organization_id, report_type, report_month, report_year, report_format)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_org ON reports (organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports (user_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports (report_year DESC, report_month DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports (created_at DESC);

-- Comments
COMMENT ON TABLE reports IS 'Stores metadata for generated monthly and custom reports';
COMMENT ON COLUMN reports.file_key IS 'Cloudflare R2 object key (e.g., reports/org123/2024-01-excel-1234567890.xlsx)';
COMMENT ON COLUMN reports.file_url IS 'Signed URL for downloading report (24-hour expiry)';
COMMENT ON COLUMN reports.max_transactions IS 'Maximum number of transactions included in report (pagination limit)';
COMMENT ON COLUMN reports.metadata IS 'JSON object containing report summary: total_revenue, transaction_count, success_rate, etc.';
