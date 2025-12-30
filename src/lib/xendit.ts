
export const XENDIT_API_URL = 'https://api.xendit.co/v2/invoices';

export async function createInvoice(data: {
    external_id: string;
    amount: number;
    payer_email: string;
    description: string;
}) {
    const secretKey = process.env.XENDIT_API_KEY;
    if (!secretKey) {
        throw new Error('XENDIT_API_KEY is not set');
    }

    const response = await fetch(XENDIT_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Xendit API error: ${response.status} ${errorBody}`);
    }

    return response.json();
}

export async function getInvoices(options?: { limit?: number; after_id?: string }) {
    const secretKey = process.env.XENDIT_API_KEY;
    if (!secretKey) {
        throw new Error('XENDIT_API_KEY is not set');
    }

    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.after_id) params.append('after_id', options.after_id);

    const response = await fetch(`${XENDIT_API_URL}?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
        },
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Xendit API error: ${response.status} ${errorBody}`);
    }

    return response.json();
}

export async function getAllInvoices() {
    const secretKey = process.env.XENDIT_API_KEY;
    if (!secretKey) {
        throw new Error('XENDIT_API_KEY is not set');
    }

    const allInvoices: any[] = [];
    let afterId: string | undefined = undefined;
    const limit = 100; // Max allowed by Xendit API
    let pageCount = 0;

    try {
        while (true) {
            pageCount++;
            const params = new URLSearchParams();
            params.append('limit', limit.toString());
            if (afterId) {
                params.append('after_id', afterId);
            }

            console.log(`Fetching page ${pageCount}, after_id: ${afterId || 'none'}`);

            const response = await fetch(`${XENDIT_API_URL}?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
                },
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Xendit API error: ${response.status} ${errorBody}`);
                throw new Error(`Xendit API error: ${response.status} ${errorBody}`);
            }

            const data = await response.json();
            console.log(`Page ${pageCount} response type:`, typeof data, 'isArray:', Array.isArray(data));

            // Xendit returns an array directly for the invoices endpoint
            const invoices = Array.isArray(data) ? data : [];
            console.log(`Page ${pageCount} fetched ${invoices.length} invoices`);

            if (invoices.length === 0) {
                console.log(`No more invoices on page ${pageCount}, breaking loop`);
                break; // No more invoices to fetch
            }

            allInvoices.push(...invoices);
            console.log(`Total invoices accumulated: ${allInvoices.length}`);

            // If we got fewer results than the limit, we've reached the end
            if (invoices.length < limit) {
                console.log(`Page ${pageCount} returned fewer than limit (${invoices.length} < ${limit}), reached end`);
                break;
            }

            // Set after_id to the last invoice's id for the next iteration
            afterId = invoices[invoices.length - 1].id;
            console.log(`Next after_id will be: ${afterId}`);
        }

        console.log(`✓ Fetched ${allInvoices.length} total invoices from Xendit across ${pageCount} pages`);
        return allInvoices;
    } catch (error) {
        console.error('Error in getAllInvoices:', error);
        throw error;
    }
}

/**
 * Fetch a single invoice by its ID from Xendit API
 * Returns the invoice object if found, or null if not found
 */
export async function getInvoiceById(invoiceId: string) {
    const secretKey = process.env.XENDIT_API_KEY;
    if (!secretKey) {
        throw new Error('XENDIT_API_KEY is not set');
    }

    try {
        const response = await fetch(`${XENDIT_API_URL}/${invoiceId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
            },
        });

        if (response.status === 404) {
            // Invoice not found in Xendit
            return null;
        }

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Xendit API error for invoice ${invoiceId}: ${response.status} ${errorBody}`);
            return null;
        }

        return response.json();
    } catch (error) {
        console.error(`Error fetching invoice ${invoiceId} from Xendit:`, error);
        return null;
    }
}

// ========================================
// PAYOUTS/DISBURSEMENTS API
// ========================================

export const XENDIT_PAYOUTS_URL = 'https://api.xendit.co/v2/payouts';

export interface PayoutRequest {
    reference_id: string;
    channel_code: string;
    channel_properties: {
        account_holder_name: string;
        account_number: string;
    };
    amount: number;
    description?: string;
    currency?: string;
    receipt_notification?: {
        email_to?: string[];
    };
}

export interface PayoutResponse {
    id: string;
    reference_id: string;
    channel_code: string;
    status: 'ACCEPTED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REVERSED';
    amount: number;
    currency: string;
    created: string;
    updated: string;
    failure_code?: string;
}

/**
 * Create a payout/disbursement to a bank account
 * Docs: https://developers.xendit.co/api-reference/payouts/create-payout
 */
export async function createPayout(data: PayoutRequest): Promise<PayoutResponse> {
    const secretKey = process.env.XENDIT_API_KEY;
    if (!secretKey) {
        throw new Error('XENDIT_API_KEY is not set');
    }

    const response = await fetch(XENDIT_PAYOUTS_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
            'Idempotency-key': data.reference_id, // Prevent duplicate payouts
        },
        body: JSON.stringify({
            ...data,
            currency: data.currency || 'IDR',
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Xendit Payout API error:', response.status, errorBody);
        throw new Error(`Xendit Payout API error: ${response.status} ${errorBody}`);
    }

    return response.json();
}

/**
 * Get a payout by its ID
 */
export async function getPayoutById(payoutId: string): Promise<PayoutResponse | null> {
    const secretKey = process.env.XENDIT_API_KEY;
    if (!secretKey) {
        throw new Error('XENDIT_API_KEY is not set');
    }

    try {
        const response = await fetch(`${XENDIT_PAYOUTS_URL}/${payoutId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
            },
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Xendit Payout API error: ${response.status} ${errorBody}`);
            return null;
        }

        return response.json();
    } catch (error) {
        console.error(`Error fetching payout ${payoutId}:`, error);
        return null;
    }
}

// Common Indonesian bank channel codes
export const BANK_CHANNEL_CODES = {
    BCA: 'ID_BCA',
    BNI: 'ID_BNI',
    BRI: 'ID_BRI',
    MANDIRI: 'ID_MANDIRI',
    CIMB: 'ID_CIMB',
    PERMATA: 'ID_PERMATA',
    DANAMON: 'ID_DANAMON',
    BSI: 'ID_BSI',
    OCBC: 'ID_OCBC',
    MAYBANK: 'ID_MAYBANK',
} as const;

// E-wallet channel codes
export const EWALLET_CHANNEL_CODES = {
    OVO: 'ID_OVO',
    DANA: 'ID_DANA',
    LINKAJA: 'ID_LINKAJA',
    GOPAY: 'ID_GOPAY',
} as const;

// Bank account number length rules for Indonesian banks
export const BANK_ACCOUNT_LENGTH_RULES: Record<string, { min: number; max: number; name: string }> = {
    BCA: { min: 10, max: 10, name: 'BCA' },
    BNI: { min: 7, max: 11, name: 'BNI' },
    BRI: { min: 13, max: 17, name: 'BRI' },
    MANDIRI: { min: 12, max: 17, name: 'Mandiri' },
    CIMB: { min: 10, max: 14, name: 'CIMB Niaga' },
    PERMATA: { min: 7, max: 16, name: 'Permata' },
    DANAMON: { min: 10, max: 10, name: 'Danamon' },
    BSI: { min: 10, max: 10, name: 'BSI' },
    OVO: { min: 10, max: 12, name: 'OVO' },
    DANA: { min: 10, max: 12, name: 'DANA' },
    GOPAY: { min: 10, max: 12, name: 'GoPay' },
};

// Validate account number format (client-side validation)
export function validateAccountNumber(bankCode: string, accountNumber: string): { valid: boolean; error?: string } {
    const rules = BANK_ACCOUNT_LENGTH_RULES[bankCode];

    if (!rules) {
        return { valid: true }; // Unknown bank, skip validation
    }

    // Check if only digits
    if (!/^\d+$/.test(accountNumber)) {
        return { valid: false, error: 'Account number must contain only digits' };
    }

    const length = accountNumber.length;

    if (length < rules.min) {
        return { valid: false, error: `${rules.name} account number must be at least ${rules.min} digits` };
    }

    if (length > rules.max) {
        return { valid: false, error: `${rules.name} account number must be at most ${rules.max} digits` };
    }

    return { valid: true };
}

// Bank Account Validation API (Xendit Name Validator)
export interface BankValidationRequest {
    bank_code: string;
    account_number: string;
}

export interface BankValidationResponse {
    account_holder_name: string;
    status: 'SUCCESS' | 'INVALID_ACCOUNT_DETAILS' | 'BANK_CODE_NOT_SUPPORTED';
    is_valid: boolean;
}

export async function validateBankAccount(data: BankValidationRequest): Promise<BankValidationResponse | null> {
    const secretKey = process.env.XENDIT_API_KEY;
    if (!secretKey) {
        throw new Error('XENDIT_API_KEY is not set');
    }

    try {
        // Xendit Bank Account Validation endpoint
        const response = await fetch('https://api.xendit.co/bank_account_data_requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
            },
            body: JSON.stringify({
                bank_account_number: data.account_number,
                bank_code: BANK_CHANNEL_CODES[data.bank_code as keyof typeof BANK_CHANNEL_CODES] || data.bank_code,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Xendit Bank Validation error: ${response.status} ${errorBody}`);

            // Parse error to provide meaningful feedback
            try {
                const errorJson = JSON.parse(errorBody);
                if (errorJson.error_code === 'INVALID_ACCOUNT_DETAILS') {
                    return {
                        account_holder_name: '',
                        status: 'INVALID_ACCOUNT_DETAILS',
                        is_valid: false,
                    };
                }
            } catch {
                // Ignore parse error
            }
            return null;
        }

        const result = await response.json();

        return {
            account_holder_name: result.bank_account_holder_name || '',
            status: 'SUCCESS',
            is_valid: true,
        };
    } catch (error) {
        console.error('Error validating bank account:', error);
        return null;
    }
}
