import type { MediaItem, ShareLog, RecentContact } from '../data/shareData';
import { initialShareLogs, initialRecentContacts } from '../data/shareData';
import { CSVParserService, type CSVParseResult } from './csvParserService';
import { PhoneValidationService } from './phoneValidationService';
import { WhatsAppCloudApiService } from './whatsappCloudApiService';
import { AuditLoggerService } from './auditLoggerService';

const MEDIA_CACHE_KEY = 'excel_share_media_cache';
const LOGS_STORAGE_KEY = 'excel_share_history_logs';
const CONTACTS_STORAGE_KEY = 'excel_share_recent_contacts';

class ShareService {
    private mediaItems: MediaItem[];
    private historyLogs: ShareLog[];
    private recentContacts: RecentContact[];

    private mediaListeners: Set<(items: MediaItem[]) => void> = new Set();

    constructor() {
        this.mediaItems = this.loadFromStorage(MEDIA_CACHE_KEY, []);
        this.historyLogs = this.loadFromStorage(LOGS_STORAGE_KEY, initialShareLogs);
        this.recentContacts = this.loadFromStorage(CONTACTS_STORAGE_KEY, initialRecentContacts);
        
        // Initial fetch & background revalidation from Neon PostgreSQL REST API
        this.fetchMediaFromApi();
    }

    public subscribeMedia(listener: (items: MediaItem[]) => void): () => void {
        this.mediaListeners.add(listener);
        return () => {
            this.mediaListeners.delete(listener);
        };
    }

    private notifyMediaListeners() {
        this.saveToStorage(MEDIA_CACHE_KEY, this.mediaItems);
        this.mediaListeners.forEach(listener => listener([...this.mediaItems]));
    }

    private async fetchMediaFromApi() {
        try {
            const res = await fetch('/api/media');
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.mediaItems)) {
                    if (json.mediaItems.length === 0) {
                        // Seed database if empty
                        await fetch('/api/media?action=seed', { method: 'POST' });
                        const reFetch = await fetch('/api/media');
                        const seededJson = await reFetch.json();
                        if (seededJson.success && Array.isArray(seededJson.mediaItems)) {
                            this.mediaItems = seededJson.mediaItems;
                            this.notifyMediaListeners();
                            return;
                        }
                    }
                    this.mediaItems = json.mediaItems;
                    this.notifyMediaListeners();
                }
            }
        } catch (e) {
            console.warn('Failed to fetch media from Neon API', e);
        }
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

    // --- MEDIA ITEMS SERVICE (VERCEL BLOB + NEON POSTGRESQL BACKED) ---
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
            item.courseIds.includes(courseId) || item.courseIds.includes('ALL')
        );
    }

    public toggleFavorite(id: string): MediaItem[] {
        const target = this.mediaItems.find(item => item.id === id);
        const newStatus = target ? !target.isFavorite : true;

        // Optimistic UI Update
        this.mediaItems = this.mediaItems.map(item => 
            item.id === id ? { ...item, isFavorite: newStatus } : item
        );
        this.notifyMediaListeners();

        return this.getAllMedia();
    }

    public async uploadMediaFile(params: {
        title: string;
        fileType: 'pdf' | 'image' | 'video';
        category: 'Syllabus' | 'Flyer' | 'Brochure' | 'General';
        fileSize?: string;
        courseIds?: string[];
        fileData: string;
        fileName: string;
    }): Promise<MediaItem> {
        const res = await fetch('/api/media?action=upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
            throw new Error(json.error || 'Failed to upload media file to Vercel Blob');
        }

        const createdItem: MediaItem = json.mediaItem;
        this.mediaItems = [createdItem, ...this.mediaItems.filter(m => m.id !== createdItem.id)];
        this.notifyMediaListeners();

        AuditLoggerService.logEvent('UPLOAD_MEDIA', {
            id: createdItem.id,
            title: createdItem.title,
            category: createdItem.category,
            fileType: createdItem.fileType,
            blobUrl: createdItem.previewUrl
        });

        return createdItem;
    }

    public async replaceMediaFile(params: {
        mediaId: string;
        title?: string;
        fileData: string;
        fileName: string;
    }): Promise<MediaItem> {
        const res = await fetch('/api/media?action=replace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
            throw new Error(json.error || 'Failed to replace media file');
        }

        const updatedItem: MediaItem = json.mediaItem;
        this.mediaItems = this.mediaItems.map(m => m.id === params.mediaId ? { ...m, ...updatedItem } : m);
        this.notifyMediaListeners();

        AuditLoggerService.logEvent('REPLACE_MEDIA', {
            id: params.mediaId,
            newBlobUrl: updatedItem.previewUrl
        });

        return updatedItem;
    }

    public async addMediaItem(item: Omit<MediaItem, 'id' | 'uploadDate'>): Promise<MediaItem> {
        const newItem: MediaItem = {
            ...item,
            id: `media-${Date.now()}`,
            uploadDate: new Date().toISOString().split('T')[0],
        };

        // Optimistic UI Update
        this.mediaItems = [newItem, ...this.mediaItems];
        this.notifyMediaListeners();

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

        // Optimistic UI Update
        this.mediaItems = this.mediaItems.filter(item => item.id !== id);
        this.notifyMediaListeners();

        // Async dispatch to Neon & Vercel Blob REST API
        fetch('/api/media?action=delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaId: id })
        }).catch(err => {
            console.error('Failed to delete media item from Vercel Blob & Neon DB', err);
        });

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
        isBulkRecipient?: boolean;
    }): Promise<{ success: boolean; log: ShareLog }> {
        const normalized = PhoneValidationService.normalize(payload.phone);
        const e164Phone = normalized.isValid ? normalized.e164 : (payload.phone.startsWith('+') ? payload.phone : `+91 ${payload.phone}`);

        // Dispatch via WhatsApp Cloud API Client Architecture
        const waResponse = await WhatsAppCloudApiService.sendTemplateMessage({
            recipientPhoneE164: e164Phone,
            templateName: 'course_material_share',
            bodyVariables: [payload.name || 'Student', payload.courseTitle]
        });

        const formattedTimestamp = this.formatTimestamp12Hour();

        const newLog: ShareLog = {
            id: waResponse.whatsappMessageId || `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            recipientPhone: e164Phone,
            recipientName: payload.name || 'Enquiry Contact',
            courseId: payload.courseId,
            courseTitle: payload.courseTitle,
            materials: payload.materials,
            timestamp: formattedTimestamp,
            status: waResponse.success ? 'Delivered' : 'Failed',
            channel: 'WhatsApp',
            isBulkRecipient: payload.isBulkRecipient
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

    private formatTimestamp12Hour(now = new Date()): string {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const strHours = String(hours).padStart(2, '0');

        return `${year}-${month}-${day} ${strHours}:${minutes} ${ampm}`;
    }

    public addBulkCampaignLog(payload: {
        campaignName: string;
        materials: string[];
        totalRecipients: number;
        deliveredCount: number;
        failedCount: number;
        csvFileName?: string;
        courseTitle?: string;
    }): ShareLog {
        const formattedTimestamp = this.formatTimestamp12Hour();

        const campaignLog: ShareLog = {
            id: `campaign-${Date.now()}`,
            recipientPhone: `${payload.totalRecipients} Recipients`,
            recipientName: payload.campaignName,
            courseId: 'bulk',
            courseTitle: payload.courseTitle || 'Bulk Dispatch Campaign',
            materials: payload.materials,
            timestamp: formattedTimestamp,
            status: payload.failedCount === 0 ? 'Delivered' : payload.deliveredCount > 0 ? 'Sent' : 'Failed',
            channel: 'WhatsApp',
            isBulkCampaign: true,
            campaignName: payload.campaignName,
            csvFileName: payload.csvFileName,
            totalRecipients: payload.totalRecipients,
            deliveredCount: payload.deliveredCount,
            failedCount: payload.failedCount
        };

        this.historyLogs = [campaignLog, ...this.historyLogs];
        this.saveToStorage(LOGS_STORAGE_KEY, this.historyLogs);

        AuditLoggerService.logEvent('BULK_CAMPAIGN_LOGGED', {
            campaignId: campaignLog.id,
            campaignName: payload.campaignName,
            totalRecipients: payload.totalRecipients,
            deliveredCount: payload.deliveredCount
        });

        return campaignLog;
    }

    public deleteHistoryLog(id: string): ShareLog[] {
        this.historyLogs = this.historyLogs.filter(log => log.id !== id);
        this.saveToStorage(LOGS_STORAGE_KEY, this.historyLogs);
        return this.historyLogs;
    }
}

export const shareService = new ShareService();
