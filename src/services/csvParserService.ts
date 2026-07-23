/**
 * Production CSV Parsing Service using PapaParse
 * Handles UTF-8 BOM, quoted fields, Windows/Mac line endings, and E.164 normalization
 */

import Papa from 'papaparse';
import { PhoneValidationService } from './phoneValidationService';

export interface ParsedContactRecord {
    phone: string;
    e164Phone: string;
    name?: string;
    rawLine: string;
}

export interface CSVParseResult {
    validContacts: ParsedContactRecord[];
    invalidRows: Array<{ rawLine: string; reason: string }>;
    duplicateRows: ParsedContactRecord[];
    totalRowsProcessed: number;
}

export class CSVParserService {
    /**
     * Parses raw CSV string content with PapaParse
     */
    public static parseCSVContent(csvText: string): CSVParseResult {
        const cleanedText = csvText.replace(/^\uFEFF/, ''); // Strip UTF-8 BOM
        
        const parseResult = Papa.parse<string[]>(cleanedText, {
            skipEmptyLines: 'greedy'
        });

        const validContacts: ParsedContactRecord[] = [];
        const invalidRows: Array<{ rawLine: string; reason: string }> = [];
        const duplicateRows: ParsedContactRecord[] = [];
        const seenPhones = new Set<string>();

        let totalRowsProcessed = 0;

        if (parseResult.data && Array.isArray(parseResult.data)) {
            parseResult.data.forEach((row: string[]) => {
                totalRowsProcessed++;

                let phoneCandidate = '';
                let nameCandidate = '';
                const rawLine = Array.isArray(row) ? row.join(',') : String(row);

                if (Array.isArray(row)) {
                    // Skip header row if matches standard titles
                    if (/^(phone|mobile|number|name|contact|sr|id)/i.test(row[0] || '') && !/\d{10}/.test(row[0] || '')) {
                        return;
                    }

                    // Extract phone from row elements containing 10+ digits
                    for (const col of row) {
                        const str = (col || '').trim();
                        if (!phoneCandidate && /\d{10}/.test(str.replace(/\D/g, ''))) {
                            phoneCandidate = str;
                        } else if (!nameCandidate && str && !/\d{10}/.test(str.replace(/\D/g, ''))) {
                            nameCandidate = str;
                        }
                    }
                }

                if (!phoneCandidate) {
                    invalidRows.push({ rawLine, reason: 'No phone number found in row' });
                    return;
                }

                const phoneRes = PhoneValidationService.normalize(phoneCandidate);

                if (!phoneRes.isValid) {
                    invalidRows.push({ rawLine, reason: phoneRes.errorReason || 'Invalid phone format' });
                    return;
                }

                const contactRecord: ParsedContactRecord = {
                    phone: phoneRes.national,
                    e164Phone: phoneRes.e164,
                    name: nameCandidate.trim() || undefined,
                    rawLine
                };

                if (seenPhones.has(phoneRes.e164)) {
                    duplicateRows.push(contactRecord);
                } else {
                    seenPhones.add(phoneRes.e164);
                    validContacts.push(contactRecord);
                }
            });
        }

        return {
            validContacts,
            invalidRows,
            duplicateRows,
            totalRowsProcessed
        };
    }
}
