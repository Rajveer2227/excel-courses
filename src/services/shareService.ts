import type { MediaItem, ShareLog, RecentContact } from '../data/shareData';
import { initialMediaItems, initialShareLogs, initialRecentContacts } from '../data/shareData';
import { CSVParserService, type CSVParseResult } from './csvParserService';
import { PhoneValidationService } from './phoneValidationService';
import { WhatsAppCloudApiService } from './whatsappCloudApiService';
import { AuditLoggerService } from './auditLoggerService';

const MEDIA_STORAGE_KEY = 'excel_share_media_items';
const LOGS_STORAGE_KEY = 'excel_share_history_logs';
const CONTACTS_STORAGE_KEY = 'excel_share_recent_contacts';

class ShareService {
    private mediaItems: MediaItem[];
    private historyLogs: ShareLog[];
    private recentContacts: RecentContact[];

    constructor() {
        this.mediaItems = this.loadFromStorage(MEDIA_STORAGE_KEY, initialMediaItems);
        this.historyLogs = this.loadFromStorage(LOGS_STORAGE_KEY, initialShareLogs);
        this.recentContacts = this.loadFromStorage(CONTACTS_STORAGE_KEY, initialRecentContacts);
    }

    private loadFromStorage<T>(key: string, fallback: T): T {
        if (typeof window === 'undefined') return fallback;
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : fallback;
        } catch (e) {
            console.warn(`Failed to read ${key} from localStorage`, e);
            return fallback;
        }
    }

    private saveToStorage(key: string, value: unknown) {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn(`Failed to save ${key} to localStorage`, e);
        }
    }

    // --- MEDIA ITEMS SERVICE ---
    public getAllMedia(): MediaItem[] {
        return [...this.mediaItems];
    }

    public getFavorites(): MediaItem[] {
        return this.mediaItems.filter(item => item.isFavorite);
    }

    public getSuggestedForCourse(courseId?: string): MediaItem[] {
        if (!courseId) {
            return [];
        }
        return this.mediaItems.filter(item => 
            item.courseIds.includes(courseId)
        );
    }

    public toggleFavorite(id: string): MediaItem[] {
        this.mediaItems = this.mediaItems.map(item => 
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
        );
        this.saveToStorage(MEDIA_STORAGE_KEY, this.mediaItems);
        return this.getAllMedia();
    }

    public addMediaItem(item: Omit<MediaItem, 'id' | 'uploadDate'>): MediaItem {
        const newItem: MediaItem = {
            ...item,
            id: `media-${Date.now()}`,
            uploadDate: new Date().toISOString().split('T')[0],
        };
        this.mediaItems = [newItem, ...this.mediaItems];
        this.saveToStorage(MEDIA_STORAGE_KEY, this.mediaItems);

        // Audit Logging
        AuditLoggerService.logEvent('UPLOAD_MEDIA', {
            id: newItem.id,
            title: newItem.title,
            category: newItem.category,
            fileType: newItem.fileType
        });

        return newItem;
    }

    public deleteMediaItem(id: string): MediaItem[] {
        const itemToDelete = this.mediaItems.find(m => m.id === id);
        this.mediaItems = this.mediaItems.filter(item => item.id !== id);
        this.saveToStorage(MEDIA_STORAGE_KEY, this.mediaItems);

        // Audit Logging
        if (itemToDelete) {
            AuditLoggerService.logEvent('DELETE_MEDIA', {
                id: itemToDelete.id,
                title: itemToDelete.title
            });
        }

        return this.getAllMedia();
    }

    // --- HISTORY LOGS SERVICE ---
    public getHistoryLogs(): ShareLog[] {
        return [...this.historyLogs];
    }

    public getRecentContacts(): RecentContact[] {
        return [...this.recentContacts];
    }

    // --- PRODUCTION CSV PARSER ENGINE BINDING ---
    public parseCSV(csvText: string): CSVParseResult {
        return CSVParserService.parseCSVContent(csvText);
    }

    // --- E.164 PHONE VALIDATION & DEDUPLICATION BINDING ---
    public normalizePhone(rawPhone: string) {
        return PhoneValidationService.normalize(rawPhone);
    }

    // --- WHATSAPP CLOUD API & SHARE RECORDING SERVICE ---
    public async recordShareEvent(payload: {
        phone: string;
        name?: string;
        courseId: string;
        courseTitle: string;
        materials: string[];
    }): Promise<{ success: boolean; log: ShareLog }> {
        const normalized = PhoneValidationService.normalize(payload.phone);
        const e164Phone = normalized.isValid ? normalized.e164 : (payload.phone.startsWith('+') ? payload.phone : `+91 ${payload.phone}`);

        // Dispatch via WhatsApp Cloud API Client Architecture
        const waResponse = await WhatsAppCloudApiService.sendTemplateMessage({
            recipientPhoneE164: e164Phone,
            templateName: 'course_material_share',
            bodyVariables: [payload.name || 'Student', payload.courseTitle]
        });

        const now = new Date();
        const formattedTimestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;

        const newLog: ShareLog = {
            id: waResponse.whatsappMessageId || `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            recipientPhone: e164Phone,
            recipientName: payload.name || 'Enquiry Contact',
            courseId: payload.courseId,
            courseTitle: payload.courseTitle,
            materials: payload.materials,
            timestamp: formattedTimestamp,
            status: waResponse.success ? 'Delivered' : 'Failed',
            channel: 'WhatsApp'
        };

        this.historyLogs = [newLog, ...this.historyLogs];
        this.saveToStorage(LOGS_STORAGE_KEY, this.historyLogs);

        // Update recent contacts
        const existingIdx = this.recentContacts.findIndex(c => c.phone === newLog.recipientPhone);
        const contactEntry: RecentContact = {
            phone: newLog.recipientPhone,
            name: newLog.recipientName,
            lastCourseTitle: payload.courseTitle,
            lastSentDate: 'Just now'
        };

        if (existingIdx >= 0) {
            this.recentContacts[existingIdx] = contactEntry;
        } else {
            this.recentContacts = [contactEntry, ...this.recentContacts.slice(0, 4)];
        }
        this.saveToStorage(CONTACTS_STORAGE_KEY, this.recentContacts);

        // Audit Logging
        AuditLoggerService.logEvent(waResponse.success ? 'DISPATCH_RECIPIENT_SUCCESS' : 'DISPATCH_RECIPIENT_FAILED', {
            logId: newLog.id,
            phone: e164Phone,
            name: payload.name,
            courseTitle: payload.courseTitle,
            materialsCount: payload.materials.length
        });

        return { success: waResponse.success, log: newLog };
    }
}

export const shareService = new ShareService();
