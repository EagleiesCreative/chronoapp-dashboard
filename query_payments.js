const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ztihgaxyczbcgmgqetyr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0aWhnYXh5Y3piY2dtZ3FldHlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODY4ODMxNywiZXhwIjoyMDc0MjY0MzE3fQ.IuPZTB8FLOQ8kBBfScZNPntVd-zG4DUVBi0bqGij-ac';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: payments, error } = await supabase
        .from('payments')
        .select('id, xendit_invoice_id, amount, status')
        .order('created_at', { ascending: false });
    
    if (error) console.error(error);
    else {
        console.log("Found " + payments.length + " payments");
        console.log(payments);
        
        let unique = new Map();
        for (const p of payments) {
            unique.set(p.xendit_invoice_id || p.id, p);
        }
        console.log("Unique keys count: " + unique.size);
    }
}
main();
