-- Enable Row Level Security on all sensitive tables
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booths" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "withdrawals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_revenue_shares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;

-- Create policies to DENY ALL access by default for public/anon users
-- The service role (used by the backend API) automatically bypasses these policies.
-- This prevents any direct access from the browser/client side using the anon key.

CREATE POLICY "Deny public access" ON "payments" FOR ALL USING (false);
CREATE POLICY "Deny public access" ON "booths" FOR ALL USING (false);
CREATE POLICY "Deny public access" ON "withdrawals" FOR ALL USING (false);
CREATE POLICY "Deny public access" ON "member_revenue_shares" FOR ALL USING (false);
CREATE POLICY "Deny public access" ON "reports" FOR ALL USING (false);
