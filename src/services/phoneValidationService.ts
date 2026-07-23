/**
 * Production E.164 Phone Normalization & Validation Service
 * Standardizes Indian mobile numbers and enforces E.164 compliance (+91XXXXXXXXXX)
 */

export interface PhoneValidationResult {
    raw: string;
    e164: string;
    national: string;
    isValid: boolean;
    errorReason?: string;
}

export class PhoneValidationService {
    /**
     * Normalizes a raw phone number input to strict E.164 format (+91XXXXXXXXXX)
     */
    public static normalize(rawInput: string): PhoneValidationResult {
        const trimmed = (rawInput || '').trim();
        if (!trimmed) {
            return {
                raw: rawInput,
                e164: '',
                national: '',
                isValid: false,
                errorReason: 'Empty input'
            };
        }

        // Strip non-digit characters
        const digits = trimmed.replace(/\D/g, '');

        let nationalNumber = '';

        if (digits.length === 10) {
            nationalNumber = digits;
        } else if (digits.length === 12 && digits.startsWith('91')) {
            nationalNumber = digits.slice(2);
        } else if (digits.length === 11 && digits.startsWith('0')) {
            nationalNumber = digits.slice(1);
        } else {
            return {
                raw: rawInput,
                e164: '',
                national: digits,
                isValid: false,
                errorReason: digits.length < 10 
                    ? `Invalid length (${digits.length} digits, minimum 10 required)` 
                    : `Invalid length (${digits.length} digits, maximum 10 national digits allowed)`
            };
        }

        // Validate Indian mobile starting digit rule (6, 7, 8, 9)
        const isValidIndianMobile = /^[6-9]\d{9}$/.test(nationalNumber);

        if (!isValidIndianMobile) {
            return {
                raw: rawInput,
                e164: '',
                national: nationalNumber,
                isValid: false,
                errorReason: `Invalid starting digit (Indian mobile numbers must start with 6, 7, 8, or 9)`
            };
        }

        return {
            raw: rawInput,
            e164: `+91${nationalNumber}`,
            national: nationalNumber,
            isValid: true
        };
    }

    /**
     * Deduplicates array of phone entries after normalization
     */
    public static normalizeAndDeduplicate(inputs: string[]): {
        valid: PhoneValidationResult[];
        invalid: PhoneValidationResult[];
        duplicates: PhoneValidationResult[];
    } {
        const valid: PhoneValidationResult[] = [];
        const invalid: PhoneValidationResult[] = [];
        const duplicates: PhoneValidationResult[] = [];
        const seen = new Set<string>();

        inputs.forEach(input => {
            const res = PhoneValidationService.normalize(input);
            if (!res.isValid) {
                invalid.push(res);
            } else if (seen.has(res.e164)) {
                duplicates.push(res);
            } else {
                seen.add(res.e164);
                valid.push(res);
            }
        });

        return { valid, invalid, duplicates };
    }
}
