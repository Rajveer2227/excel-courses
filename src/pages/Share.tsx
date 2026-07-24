import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Users, FolderOpen, History,
    ArrowLeft, Search, CheckCircle2,
    Plus, Trash2, FileText, Image as ImageIcon,
    Video, FileCheck, Check, Upload,
    X, RefreshCw, ChevronDown, ChevronUp, Sparkles, Calendar, Clock, Copy, RotateCcw, ShieldCheck,
    Tag, Settings2, Archive, Eye, LayoutDashboard, AlertCircle, Edit, MessageSquare
} from 'lucide-react';
import { generateQuickShareMessage } from '../utils/messageTemplates';
import { cn } from '../lib/utils';
import { courses } from '../data/courses';
import { mediaCategories } from '../data/shareData';
import type { MediaItem, ShareLog, RecentContact } from '../data/shareData';
import { shareService } from '../services/shareService';
import { campaignService } from '../services/campaignService';
import { whatsAppDispatchEngine } from '../services/whatsappDispatchEngine';
import type { Campaign, CampaignStatus, DeliverySettings, ScheduleSettings, CampaignDashboardStats } from '../data/campaignData';
import { defaultDeliverySettings, defaultScheduleSettings, availablePresetTags } from '../data/campaignData';
import { ToastNotification, mapResultToToastData } from '../components/common/ToastNotification';
import type { ToastMessageData } from '../components/common/ToastNotification';

type WorkspaceType = 'hub' | 'quick' | 'bulk' | 'library' | 'history';

function to12HourFormat(timestampStr?: string): string {
    if (!timestampStr) return '';
    if (/AM|PM/i.test(timestampStr)) return timestampStr;

    const parts = timestampStr.split(' ');
    if (parts.length < 2) return timestampStr;
    const datePart = parts[0];
    const timePart = parts[1];
    const timeTokens = timePart.split(':');
    let hours = parseInt(timeTokens[0], 10);
    if (isNaN(hours)) return timestampStr;

    const minutes = timeTokens[1] || '00';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');

    return `${datePart} ${strHours}:${minutes} ${ampm}`;
}

function Share() {
    const [searchParams] = useSearchParams();
    const courseListRef = useRef<HTMLDivElement>(null);
    const allMaterialsListRef = useRef<HTMLDivElement>(null);

    // Smart Workspace Context Detection — persisted to sessionStorage
    const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType>(() => {
        const paramCourseId = searchParams.get('courseId');
        if (paramCourseId && courses.some(c => c.id === paramCourseId)) return 'quick';
        const saved = sessionStorage.getItem('share_activeWorkspace') as WorkspaceType | null;
        if (saved && ['hub', 'quick', 'bulk', 'library', 'history'].includes(saved)) return saved;
        return 'hub';
    });

    // Persist activeWorkspace whenever it changes
    useEffect(() => {
        sessionStorage.setItem('share_activeWorkspace', activeWorkspace);
    }, [activeWorkspace]);

    // Data State
    const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => shareService.getAllMedia());
    const [historyLogs, setHistoryLogs] = useState<ShareLog[]>(() => shareService.getHistoryLogs());
    const [, setRecentContacts] = useState<RecentContact[]>(() => shareService.getRecentContacts());

    // Quick Share State
    const [quickPhone, setQuickPhone] = useState('');
    const [quickRecipientName, setQuickRecipientName] = useState('');
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(() => {
        const paramCourseId = searchParams.get('courseId');
        return (paramCourseId && courses.some(c => c.id === paramCourseId)) ? [paramCourseId] : [];
    });
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>(() => {
        const paramCourseId = searchParams.get('courseId');
        if (paramCourseId && courses.some(c => c.id === paramCourseId)) {
            const suggested = shareService.getSuggestedForCourse(paramCourseId);
            return suggested.length > 0 ? [suggested[0].id] : [];
        }
        return [];
    });
    const [isSendingQuick, setIsSendingQuick] = useState(false);
    const [sendModalState, setSendModalState] = useState<'idle' | 'sending' | 'success'>('idle');
    const [saveSuccessState, setSaveSuccessState] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Quick Share WhatsApp Message Preview State
    const [quickMessage, setQuickMessage] = useState('');
    const [isQuickMessageCustomized, setIsQuickMessageCustomized] = useState(false);
    const [isQuickMessageCopied, setIsQuickMessageCopied] = useState(false);

    // Smart Auto-Regeneration of WhatsApp Message (only when not manually customized)
    useEffect(() => {
        if (isQuickMessageCustomized) return;

        const selectedCourses = courses.filter(c => selectedCourseIds.includes(c.id));
        const courseTitlesText = selectedCourses.map(c => c.title).join(', ') || '';
        const selectedMaterialTitles = mediaItems
            .filter(m => selectedMaterialIds.includes(m.id))
            .map(m => m.title);

        const generated = generateQuickShareMessage({
            studentName: quickRecipientName,
            courseName: courseTitlesText || undefined,
            materials: selectedMaterialTitles
        });

        setQuickMessage(generated);
    }, [quickRecipientName, selectedCourseIds, selectedMaterialIds, mediaItems, isQuickMessageCustomized]);

    // Course Search in Quick Share
    const [courseSearchQuery, setCourseSearchQuery] = useState('');
    const [allMaterialsSearch, setAllMaterialsSearch] = useState('');
    const [deleteConfirmItem, setDeleteConfirmItem] = useState<MediaItem | null>(null);

    // Material Collapsible Sections State
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        favorites: true,
        recommended: false,
        all: true
    });

    // Bulk Share & Campaign Management System State
    const [bulkTab, setBulkTab] = useState<'builder' | 'dashboard'>(() => {
        const saved = sessionStorage.getItem('share_bulkTab') as 'builder' | 'dashboard' | null;
        return saved === 'dashboard' ? 'dashboard' : 'builder';
    });

    // Persist bulkTab whenever it changes
    useEffect(() => {
        sessionStorage.setItem('share_bulkTab', bulkTab);
    }, [bulkTab]);
    const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle' | 'error'>('saved');
    const [bulkCampaignName, setBulkCampaignName] = useState('');
    const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>('Draft');
    const [campaignNotes, setCampaignNotes] = useState('');
    const [campaignTags, setCampaignTags] = useState<string[]>(['Admissions']);
    const [customTagInput, setCustomTagInput] = useState('');
    const [bulkInputText, setBulkInputText] = useState('');
    const [uploadedCsvFileName, setUploadedCsvFileName] = useState('');
    const [bulkSelectedMaterials, setBulkSelectedMaterials] = useState<string[]>([]);
    const [bulkMaterialSearch, setBulkMaterialSearch] = useState('');
    const [bulkMaterialCategory, setBulkMaterialCategory] = useState<string>('All Categories');
    const [dispatchDelaySec, setDispatchDelaySec] = useState<number>(1);
    const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(defaultDeliverySettings);
    const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>(defaultScheduleSettings);
    
    // UI Modals & Accordions State
    const [showBulkPreview, setShowBulkPreview] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showDeliveryAccordion, setShowDeliveryAccordion] = useState(false);
    const [showDeleteConfirmCampaign, setShowDeleteConfirmCampaign] = useState<Campaign | null>(null);
    const [showArchiveConfirmCampaign, setShowArchiveConfirmCampaign] = useState<Campaign | null>(null);
    const [showOverrideScheduleModal, setShowOverrideScheduleModal] = useState(false);
    const [scheduleNotification, setScheduleNotification] = useState<string | null>(null);
    const [isCsvCopied, setIsCsvCopied] = useState(false);

    // Campaigns Dashboard State
    const [campaignsList, setCampaignsList] = useState<Campaign[]>([]);
    const [dashboardStats, setDashboardStats] = useState<CampaignDashboardStats>({
        totalCampaigns: 0,
        draft: 0,
        scheduled: 0,
        completed: 0,
        archived: 0,
        totalRecipients: 0
    });
    const [campaignSearch, setCampaignSearch] = useState('');
    const [campaignStatusFilter, setCampaignStatusFilter] = useState('All');
    const [campaignTagFilter, setCampaignTagFilter] = useState('All');
    const [includeArchived, setIncludeArchived] = useState(false);
    const [campaignSort, setCampaignSort] = useState('newest');
    const [campaignPage, setCampaignPage] = useState(1);
    const [campaignTotalPages, setCampaignTotalPages] = useState(1);

    // Real-Time Bulk Campaign Progress State
    const [bulkCampaignState, setBulkCampaignState] = useState<'idle' | 'running' | 'completed'>('idle');
    const [campaignRecipients, setCampaignRecipients] = useState<Array<{ phone: string; name?: string; status: 'pending' | 'sending' | 'delivered' }>>([]);
    const [campaignStats, setCampaignStats] = useState({
        total: 0,
        delivered: 0,
        startTime: 0,
        endTime: 0,
        durationSec: 0
    });

    const [activeToast, setActiveToast] = useState<ToastMessageData | null>(null);
    const [dispatchHistoryBuffer, setDispatchHistoryBuffer] = useState<ToastMessageData[]>([]);
    const [historyFilter, setHistoryFilter] = useState<'all' | 'success' | 'failed' | 'newest' | 'oldest'>('all');
    const [lastDispatchMetadata, setLastDispatchMetadata] = useState<{ hash: string; timestamp: number } | null>(null);
    const [showDuplicateModal, setShowDuplicateModal] = useState<{ phone: string; onConfirm: () => void } | null>(null);
    const [isRetryingDispatch, setIsRetryingDispatch] = useState(false);

    const handleCopyCsvFormat = () => {
        const csvTemplate = `Phone,Name\n9823045678,Rohan Patil\n9422411223,Priya Sharma\n9890088776,Amit Kumar`;
        navigator.clipboard.writeText(csvTemplate);
        setIsCsvCopied(true);
        setTimeout(() => setIsCsvCopied(false), 2000);
    };

    const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadedCsvFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (text) {
                setBulkInputText(text);
            }
        };
        reader.readAsText(file);
    };

    const handleResetBulkForm = () => {
        setBulkInputText('');
        setUploadedCsvFileName('');
        setBulkCampaignName('');
        setBulkSelectedMaterials([]);
        setBulkMaterialSearch('');
        setBulkMaterialCategory('All Categories');
    };

    const handleDeduplicateBulkText = () => {
        const lines = bulkInputText.split(/\r?\n/);
        const seen = new Set<string>();
        const uniqueLines: string[] = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            if (/^(phone|mobile|number|name|contact|sr|id)/i.test(trimmed) && !/\d{10}/.test(trimmed)) {
                uniqueLines.push(trimmed);
                return;
            }

            const digits = trimmed.replace(/\D/g, '');
            const phone = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.slice(-10);

            if (phone && phone.length === 10) {
                if (!seen.has(phone)) {
                    seen.add(phone);
                    uniqueLines.push(line);
                }
            } else {
                uniqueLines.push(line);
            }
        });

        setBulkInputText(uniqueLines.join('\n'));
    };

    // Media Library State
    const [librarySearch, setLibrarySearch] = useState('');
    const [libraryCategory, setLibraryCategory] = useState<string>('All Categories');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFileName, setUploadFileName] = useState('');
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadCourseId, setUploadCourseId] = useState('ALL');
    const [uploadCategory, setUploadCategory] = useState<MediaItem['category']>('Syllabus');
    const [uploadFileType, setUploadFileType] = useState<MediaItem['fileType']>('pdf');
    const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
    const [replaceItem, setReplaceItem] = useState<MediaItem | null>(null);

    // History State
    const [historySearch, setHistorySearch] = useState('');
    const [historyStatusFilter, setHistoryStatusFilter] = useState<'All' | 'Bulk' | 'Delivered' | 'Sent' | 'Failed'>('All');

    // Quick Share Course Selection Handler (Multi-Select, No Auto-Material Selection)
    const handleCourseToggle = (courseId: string) => {
        setSelectedCourseIds(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    // Helper functions for material toggle
    const toggleMaterialSelection = (id: string) => {
        setSelectedMaterialIds(prev =>
            prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
        );
    };

    const toggleSectionCollapse = (sectionKey: string) => {
        setCollapsedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
    };

    const handleSendQuickShare = async (bypassDuplicateCheck = false) => {
        const cleanPhone = quickPhone.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            setActiveToast({
                id: `toast-${Date.now()}`,
                type: 'warning',
                title: 'Invalid Phone Number',
                message: 'Please enter a valid 10-digit Indian WhatsApp mobile number.',
                code: 'META_INVALID_PHONE',
                recipientPhone: quickPhone,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            return;
        }
        if (quickRecipientName.trim().length < 2) {
            setActiveToast({
                id: `toast-${Date.now()}`,
                type: 'warning',
                title: 'Student Name Required',
                message: 'Please enter a valid Student / Parent Name (minimum 2 characters).',
                code: 'REQUIRED_FIELD',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            return;
        }
        if (selectedMaterialIds.length === 0) {
            setActiveToast({
                id: `toast-${Date.now()}`,
                type: 'warning',
                title: 'Materials Required',
                message: 'Please select at least one material to share.',
                code: 'MISSING_MEDIA',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            return;
        }

        // Duplicate Prevention Check (within 10 seconds)
        const dispatchHash = `${cleanPhone}_${selectedMaterialIds.slice().sort().join(',')}_${quickMessage.trim()}`;
        const now = Date.now();

        if (!bypassDuplicateCheck && lastDispatchMetadata && lastDispatchMetadata.hash === dispatchHash && (now - lastDispatchMetadata.timestamp < 10000)) {
            setShowDuplicateModal({
                phone: quickPhone,
                onConfirm: () => {
                    setShowDuplicateModal(null);
                    handleSendQuickShare(true);
                }
            });
            return;
        }

        setLastDispatchMetadata({ hash: dispatchHash, timestamp: now });

        // 1. Trigger Full-Screen Sending Animation Modal
        setSendModalState('sending');
        setIsSendingQuick(true);

        const selectedCourses = courses.filter(c => selectedCourseIds.includes(c.id));
        const courseTitlesText = selectedCourses.map(c => c.title).join(', ') || 'General Enquiry';
        const selectedMaterialObjects = mediaItems.filter(m => selectedMaterialIds.includes(m.id));

        const startTime = Date.now();
        const timeline: Array<{ label: string; timestamp: string; status: 'pending' | 'success' | 'failed' }> = [
            { label: 'Request Created', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: 'success' }
        ];

        // Orchestrate 5-step dispatch pipeline via Unified WhatsAppDispatchEngine
        const res = await whatsAppDispatchEngine.executeDispatch({
            recipientPhone: quickPhone,
            studentName: quickRecipientName.trim(),
            courseTitle: courseTitlesText,
            textMessage: quickMessage,
            selectedMaterials: selectedMaterialObjects,
            context: 'swift_share',
            onProgress: (progress) => {
                const stepTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                if (progress.state === 'sending_text') {
                    timeline.push({ label: 'Sending to Meta', timestamp: stepTime, status: 'success' });
                } else if (progress.state === 'sending_media') {
                    timeline.push({ label: 'Meta Accepted & Media Uploading', timestamp: stepTime, status: 'success' });
                } else if (progress.state === 'recording_history') {
                    timeline.push({ label: 'Media Processed', timestamp: stepTime, status: 'success' });
                } else if (progress.state === 'completed') {
                    timeline.push({ label: 'Delivered Successfully', timestamp: stepTime, status: 'success' });
                } else if (progress.state === 'failed') {
                    timeline.push({ label: 'Dispatch Failed', timestamp: stepTime, status: 'failed' });
                }
            }
        });

        const totalDurationMs = Date.now() - startTime;
        setIsSendingQuick(false);

        // Always log complete backend response to browser console
        console.group("WhatsApp Dispatch");
        console.log(res);
        console.groupEnd();

        const storedOptions = {
            quickPhone,
            quickRecipientName: quickRecipientName.trim(),
            courseTitlesText,
            quickMessage,
            selectedMaterialObjects
        };

        const toastData = mapResultToToastData(res, {
            recipientPhone: quickPhone,
            studentName: quickRecipientName.trim(),
            courseTitle: courseTitlesText,
            filesCount: selectedMaterialObjects.length,
            timeline,
            metrics: {
                backendDurationMs: res.details?.durationMs || Math.min(totalDurationMs, 600),
                totalDurationMs
            },
            originalOptions: storedOptions
        });

        setActiveToast(toastData);
        setDispatchHistoryBuffer(prev => [toastData, ...prev.slice(0, 4)]);

        if (res.success) {
            // 2. Trigger Success Animation State
            setSendModalState('success');
            setHistoryLogs(shareService.getHistoryLogs());
            setRecentContacts(shareService.getRecentContacts());

            // 3. Display success screen for 2.0 seconds, then close and RESET ALL DETAILS
            await new Promise(r => setTimeout(r, 2000));
            setSendModalState('idle');

            // Complete Reset of Form & Selection State
            setQuickPhone('');
            setQuickRecipientName('');
            setSelectedCourseIds([]);
            setSelectedMaterialIds([]);
            setCourseSearchQuery('');
            setAllMaterialsSearch('');
            setIsQuickMessageCustomized(false);
            setQuickMessage('');
            courseListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            allMaterialsListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            setSendModalState('idle');
        }
    };

    // Retry Failed Dispatch Handler
    const handleRetryDispatch = async (failedToast: ToastMessageData) => {
        if (isRetryingDispatch) return;
        setIsRetryingDispatch(true);

        const opts = failedToast.originalOptions;
        const recipientPhone = opts?.quickPhone || quickPhone;
        const studentName = opts?.quickRecipientName || quickRecipientName;
        const courseTitle = opts?.courseTitlesText || 'General Enquiry';
        const textMessage = opts?.quickMessage || quickMessage;
        const selectedMaterials = opts?.selectedMaterialObjects || mediaItems.filter(m => selectedMaterialIds.includes(m.id));

        setSendModalState('sending');
        const startTime = Date.now();
        const timeline: Array<{ label: string; timestamp: string; status: 'pending' | 'success' | 'failed' }> = [
            { label: 'Retry Requested', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: 'success' }
        ];

        const res = await whatsAppDispatchEngine.executeDispatch({
            recipientPhone,
            studentName,
            courseTitle,
            textMessage,
            selectedMaterials,
            context: 'swift_share'
        });

        const totalDurationMs = Date.now() - startTime;
        setIsRetryingDispatch(false);

        console.group("WhatsApp Dispatch Retry");
        console.log(res);
        console.groupEnd();

        const toastData = mapResultToToastData(res, {
            recipientPhone,
            studentName,
            courseTitle,
            filesCount: selectedMaterials.length,
            timeline,
            metrics: { backendDurationMs: res.details?.durationMs || 400, totalDurationMs },
            originalOptions: opts
        });

        setActiveToast(toastData);
        setDispatchHistoryBuffer(prev => [toastData, ...prev.slice(0, 4)]);

        if (res.success) {
            setSendModalState('success');
            setHistoryLogs(shareService.getHistoryLogs());
            setRecentContacts(shareService.getRecentContacts());
            await new Promise(r => setTimeout(r, 2000));
            setSendModalState('idle');
        } else {
            setSendModalState('idle');
        }
    };

    // Bulk Validation Computation via PapaParse CSV Parser Service
    const parsedBulkContacts = useMemo(() => {
        if (!bulkInputText.trim()) return { valid: [], invalid: [], duplicate: [] };

        const parseRes = shareService.parseCSV(bulkInputText);
        return {
            valid: parseRes.validContacts.map(c => c.phone),
            invalid: parseRes.invalidRows.map(r => r.rawLine),
            duplicate: parseRes.duplicateRows.map(c => c.phone)
        };
    }, [bulkInputText]);

    const handleSendBulkShare = async () => {
        if (!bulkCampaignName.trim()) {
            alert('Please specify a Campaign Name before starting the dispatch.');
            return;
        }

        if (parsedBulkContacts.valid.length === 0 || bulkSelectedMaterials.length === 0) return;

        setShowBulkPreview(false);
        setBulkCampaignState('running');

        // Parse lines to extract name matching
        const lines = bulkInputText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const initialList: Array<{ phone: string; name?: string; status: 'pending' | 'sending' | 'delivered' }> = [];

        parsedBulkContacts.valid.forEach(phone => {
            const matchLine = lines.find(l => l.includes(phone));
            let name = '';
            if (matchLine && matchLine.includes(',')) {
                const parts = matchLine.split(',');
                const candidateName = parts.find(p => !p.replace(/\D/g, '').includes(phone))?.trim();
                if (candidateName && candidateName.toLowerCase() !== 'name') {
                    name = candidateName;
                }
            }
            initialList.push({ phone, name, status: 'pending' });
        });

        setCampaignRecipients(initialList);
        const startTime = Date.now();
        setCampaignStats({
            total: initialList.length,
            delivered: 0,
            startTime,
            endTime: 0,
            durationSec: 0
        });

        const selectedMaterialTitles = mediaItems
            .filter(m => bulkSelectedMaterials.includes(m.id))
            .map(m => m.title);

        // Ensure campaign exists in Neon DB and mark as Running
        const campaignIdToUse = currentCampaignId || `cmp-${Date.now()}`;
        if (!currentCampaignId) setCurrentCampaignId(campaignIdToUse);
        setCampaignStatus('Running');

        // Save/update campaign in Neon as Running
        await campaignService.createOrSaveCampaign({
            id: campaignIdToUse,
            campaignName: bulkCampaignName.trim(),
            status: 'Running',
            notes: campaignNotes,
            tags: campaignTags,
            rawContactsText: bulkInputText,
            csvFileName: uploadedCsvFileName || undefined,
            materialIds: bulkSelectedMaterials,
            materialTitles: selectedMaterialTitles,
            deliverySettings,
            scheduleSettings,
            recipientStats: {
                totalCount: initialList.length,
                validCount: initialList.length,
                invalidCount: recipientValidationStats.invalidCount,
                duplicateCount: recipientValidationStats.duplicateCount,
                skippedCount: 0,
                deliveredCount: 0,
                failedCount: 0
            },
            parsedContacts: initialList.map(r => ({ phone: r.phone, name: r.name, status: 'Pending' }))
        });

        let deliveredCount = 0;

        for (let i = 0; i < initialList.length; i++) {
            // Mark contact as currently sending
            setCampaignRecipients(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'sending' } : item));

            // WhatsApp Policy Safe Delay (1s, 5s, or 10s per contact)
            const targetDelay = dispatchDelaySec * 1000;
            await new Promise(r => setTimeout(r, targetDelay));

            await shareService.recordShareEvent({
                phone: initialList[i].phone,
                name: initialList[i].name || undefined,
                courseId: 'ALL',
                courseTitle: bulkCampaignName.trim(),
                materials: selectedMaterialTitles,
                isBulkRecipient: true
            });

            // Mark contact as delivered (turns green with checkmark badge)
            deliveredCount++;
            setCampaignRecipients(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'delivered' } : item));
            setCampaignStats(prev => ({ ...prev, delivered: prev.delivered + 1 }));
        }

        const endTime = Date.now();
        const durationSec = Math.max(0.8, Math.round((endTime - startTime) / 100) / 10);
        setCampaignStats(prev => ({ ...prev, endTime, durationSec }));
        setBulkCampaignState('completed');
        setCampaignStatus('Completed');

        // Mark campaign as Completed in Neon DB with final delivery stats
        await campaignService.updateCampaignStatus(campaignIdToUse, 'Completed', {
            recipientStats: {
                totalCount: initialList.length,
                validCount: initialList.length,
                invalidCount: recipientValidationStats.invalidCount,
                duplicateCount: recipientValidationStats.duplicateCount,
                skippedCount: 0,
                deliveredCount,
                failedCount: initialList.length - deliveredCount
            }
        });

        // Refresh dashboard stats
        campaignService.fetchCampaignsFromApi({
            search: campaignSearch,
            status: campaignStatusFilter,
            tag: campaignTagFilter,
            isArchived: includeArchived,
            page: campaignPage,
            sort: campaignSort
        }).then(res => {
            if (res) {
                setCampaignsList(res.campaigns);
                setCampaignTotalPages(res.pagination.totalPages);
            }
        });
        campaignService.fetchStatsFromApi().then(st => setDashboardStats(st));

        // Log dedicated Bulk Campaign summary with Analytics into History Log
        shareService.addBulkCampaignLog({
            campaignName: bulkCampaignName.trim(),
            materials: selectedMaterialTitles,
            totalRecipients: initialList.length,
            deliveredCount,
            failedCount: 0,
            csvFileName: uploadedCsvFileName || undefined,
            courseTitle: 'Bulk Campaign Dispatch'
        });

        setHistoryLogs(shareService.getHistoryLogs());
        setRecentContacts(shareService.getRecentContacts());
    };

    const handleCloseBulkCampaign = () => {
        setBulkCampaignState('idle');
        handleResetBulkForm();
    };

    const handleLoadCampaignForEdit = (campaign: Campaign) => {
        setCurrentCampaignId(campaign.id);
        setBulkCampaignName(campaign.campaignName);
        setCampaignStatus(campaign.status);
        setCampaignNotes(campaign.notes || '');
        setCampaignTags(campaign.tags || ['Admissions']);
        setBulkInputText(campaign.rawContactsText || '');
        setUploadedCsvFileName(campaign.csvFileName || '');
        setBulkSelectedMaterials(campaign.materialIds || []);
        setDeliverySettings(campaign.deliverySettings || defaultDeliverySettings);
        setScheduleSettings(campaign.scheduleSettings || defaultScheduleSettings);
        setBulkTab('builder');
    };

    const handleCreateNewCampaign = () => {
        setCurrentCampaignId(null);
        setBulkCampaignName('');
        setCampaignStatus('Draft');
        setCampaignNotes('');
        setCampaignTags(['Admissions']);
        setBulkInputText('');
        setUploadedCsvFileName('');
        setBulkSelectedMaterials([]);
        setDeliverySettings(defaultDeliverySettings);
        setScheduleSettings(defaultScheduleSettings);
        setBulkTab('builder');
    };

    const handleAddTag = (tagToAdd: string) => {
        const clean = tagToAdd.trim();
        if (!clean) return;
        if (!campaignTags.includes(clean)) {
            setCampaignTags(prev => [...prev, clean]);
        }
        setCustomTagInput('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setCampaignTags(prev => prev.filter(t => t !== tagToRemove));
    };

    const handleSaveSchedule = async (schedule: ScheduleSettings) => {
        setScheduleSettings(schedule);
        setCampaignStatus('Scheduled');
        setShowScheduleModal(false);

        let targetId = currentCampaignId;
        if (!targetId) {
            targetId = `cmp-${Date.now()}`;
            setCurrentCampaignId(targetId);
        }

        const selectedTitles = mediaItems
            .filter(m => bulkSelectedMaterials.includes(m.id))
            .map(m => m.title);

        // 1. Create or save campaign draft in Neon DB
        await campaignService.createOrSaveCampaign({
            id: targetId,
            campaignName: bulkCampaignName.trim() || 'Scheduled Campaign',
            status: 'Scheduled',
            notes: campaignNotes,
            tags: campaignTags,
            rawContactsText: bulkInputText,
            csvFileName: uploadedCsvFileName || undefined,
            materialIds: bulkSelectedMaterials,
            materialTitles: selectedTitles,
            deliverySettings,
            scheduleSettings: schedule,
            recipientStats: {
                totalCount: recipientValidationStats.total,
                validCount: recipientValidationStats.validCount,
                invalidCount: recipientValidationStats.invalidCount,
                duplicateCount: recipientValidationStats.duplicateCount,
                skippedCount: 0,
                deliveredCount: 0,
                failedCount: 0
            },
            parsedContacts: recipientValidationStats.validRecipients.map(r => ({
                phone: r.phone,
                name: r.name,
                status: 'Pending'
            }))
        });

        // 2. Call schedule endpoint to set status = 'Scheduled' & scheduled_at in Neon DB
        const scheduledRes = await campaignService.scheduleCampaign(targetId, schedule);
        if (scheduledRes) {
            setCurrentCampaignId(scheduledRes.id);
            setCampaignStatus('Scheduled');
        }

        // 3. Show success notification toast
        setScheduleNotification(`🚀 Campaign successfully scheduled for ${schedule.scheduledDate} at ${schedule.scheduledTime} (${schedule.timezone})`);
        setTimeout(() => setScheduleNotification(null), 5000);

        // 4. Refresh Dashboard view & stats
        campaignService.fetchCampaignsFromApi({
            search: campaignSearch,
            status: campaignStatusFilter,
            tag: campaignTagFilter,
            isArchived: includeArchived,
            page: campaignPage,
            sort: campaignSort
        });
    };

    const handleUnscheduleCampaign = async () => {
        if (currentCampaignId) {
            const unscheduled = await campaignService.unscheduleCampaign(currentCampaignId);
            if (unscheduled) {
                setCampaignStatus('Draft');
                setScheduleNotification('ℹ️ Campaign schedule removed. Status set to Draft.');
                setTimeout(() => setScheduleNotification(null), 4000);
                campaignService.fetchCampaignsFromApi({
                    search: campaignSearch,
                    status: campaignStatusFilter,
                    tag: campaignTagFilter,
                    isArchived: includeArchived,
                    page: campaignPage,
                    sort: campaignSort
                });
            }
        } else {
            setCampaignStatus('Draft');
            setScheduleNotification('ℹ️ Campaign schedule removed. Status set to Draft.');
            setTimeout(() => setScheduleNotification(null), 4000);
        }
    };

    const handleDeleteHistoryLog = (id: string) => {
        const updated = shareService.deleteHistoryLog(id);
        setHistoryLogs([...updated]);
    };

    // Media Library Handlers
    const handleSimulatedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadFileObj(file);
        setUploadFileName(file.name);
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const formattedTitle = nameWithoutExt
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        setUploadTitle(formattedTitle);

        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') setUploadFileType('pdf');
        else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) setUploadFileType('image');
        else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) setUploadFileType('video');
        else setUploadFileType('doc');
    };

    const handleSaveMedia = async () => {
        if (!uploadTitle.trim()) {
            setActiveToast({
                id: `toast-${Date.now()}`,
                type: 'warning',
                title: 'Title Required',
                message: 'Please enter a title for the media item.',
                timestamp: new Date().toLocaleTimeString()
            });
            return;
        }

        setSaveSuccessState('saving');

        try {
            let base64Data = '';
            if (uploadFileObj) {
                base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(uploadFileObj);
                });
            } else {
                const sampleText = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\ntrailer\n<< /Size 4 /Root 1 0 R >>\n%%EOF`;
                base64Data = `data:application/pdf;base64,${btoa(sampleText)}`;
            }

            const created = await shareService.uploadMediaFile({
                title: uploadTitle.trim(),
                fileType: uploadFileType === 'doc' ? 'pdf' : uploadFileType,
                category: uploadCategory,
                fileSize: uploadFileObj ? `${(uploadFileObj.size / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB',
                courseIds: uploadCourseId === 'ALL' ? ['ALL'] : [uploadCourseId],
                fileData: base64Data,
                fileName: uploadFileName || `${uploadTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`
            });

            setMediaItems(shareService.getAllMedia());
            setSaveSuccessState('saved');

            setActiveToast({
                id: `toast-${Date.now()}`,
                type: 'success',
                title: 'Material Saved to Vercel Blob',
                message: `"${created.title}" is now active in Neon PostgreSQL and ready for WhatsApp dispatch.`,
                timestamp: new Date().toLocaleTimeString()
            });

            setTimeout(() => {
                setSaveSuccessState('idle');
                setShowUploadModal(false);
                setUploadTitle('');
                setUploadFileName('');
                setUploadFileObj(null);
            }, 1000);
        } catch (err: any) {
            setSaveSuccessState('idle');
            setActiveToast({
                id: `toast-${Date.now()}`,
                type: 'error',
                title: 'Upload Failed',
                message: err.message || 'Failed to upload material to Vercel Blob',
                timestamp: new Date().toLocaleTimeString()
            });
        }
    };

    const handleExecuteReplace = async (file: File) => {
        if (!replaceItem) return;
        setSaveSuccessState('saving');

        try {
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const updated = await shareService.replaceMediaFile({
                mediaId: replaceItem.id,
                title: replaceItem.title,
                fileData: base64Data,
                fileName: file.name
            });

            setMediaItems(shareService.getAllMedia());
            setSaveSuccessState('idle');
            setReplaceItem(null);

            setActiveToast({
                id: `toast-${Date.now()}`,
                type: 'success',
                title: 'Material Replaced',
                message: `"${updated.title}" replaced in Vercel Blob & updated in Neon PostgreSQL.`,
                timestamp: new Date().toLocaleTimeString()
            });
        } catch (err: any) {
            setSaveSuccessState('idle');
            setActiveToast({
                id: `toast-${Date.now()}`,
                type: 'error',
                title: 'Replace Failed',
                message: err.message || 'Failed to replace file in Vercel Blob',
                timestamp: new Date().toLocaleTimeString()
            });
        }
    };



    const confirmDeleteMedia = () => {
        if (deleteConfirmItem) {
            const updated = shareService.deleteMediaItem(deleteConfirmItem.id);
            setMediaItems(updated);
            setDeleteConfirmItem(null);
        }
    };

    const getCourseLabel = (courseIds: string[]) => {
        if (!courseIds || courseIds.length === 0 || courseIds.includes('ALL')) {
            return 'All Courses';
        }
        const found = courses.find(c => c.id === courseIds[0]);
        return found ? found.title : courseIds[0];
    };

    // Derived Computed Lists
    const filteredCoursesList = useMemo(() => {
        const query = courseSearchQuery.trim().toLowerCase();
        if (!query) return courses;

        // Strictly filter courses starting with query or having a word starting with query
        return courses.filter(c => {
            const title = c.title.toLowerCase();
            const words = title.split(/[\s\-\/\(\)]+/);
            return title.startsWith(query) || words.some(word => word.startsWith(query));
        });
    }, [courseSearchQuery]);

    const recommendedTitle = useMemo(() => {
        if (selectedCourseIds.length === 0) return 'General Course Information';
        if (selectedCourseIds.length === 1) {
            const cObj = courses.find(c => c.id === selectedCourseIds[0]);
            return `Course Information for ${cObj?.title || 'Selected Course'}`;
        }
        const selectedTitles = courses.filter(c => selectedCourseIds.includes(c.id)).map(c => c.title);
        return `Course Information for ${selectedTitles.join(', ')}`;
    }, [selectedCourseIds]);

    const suggestedCourseMaterials = useMemo(() => {
        if (selectedCourseIds.length === 0) {
            return [];
        }
        const setOfItems = new Map<string, MediaItem>();
        selectedCourseIds.forEach(cId => {
            const items = shareService.getSuggestedForCourse(cId);
            items.forEach(item => setOfItems.set(item.id, item));
        });
        return Array.from(setOfItems.values());
    }, [selectedCourseIds, mediaItems]);

    const filteredAllMaterials = useMemo(() => {
        const query = allMaterialsSearch.trim().toLowerCase();
        if (!query) return mediaItems;
        return mediaItems.filter(item => {
            const title = item.title.toLowerCase();
            return title.startsWith(query) || title.split(' ')[0].startsWith(query);
        });
    }, [mediaItems, allMaterialsSearch]);



    const filteredLibraryMedia = useMemo(() => {
        const query = librarySearch.trim().toLowerCase();
        return mediaItems.filter(item => {
            const title = item.title.toLowerCase();
            const matchesSearch = !query || title.startsWith(query) || title.split(' ')[0].startsWith(query);
            const matchesCat = libraryCategory === 'All Categories' || item.category === libraryCategory;
            return matchesSearch && matchesCat;
        });
    }, [mediaItems, librarySearch, libraryCategory]);

    const filteredBulkMaterials = useMemo(() => {
        const query = bulkMaterialSearch.trim().toLowerCase();
        return mediaItems.filter(item => {
            const title = item.title.toLowerCase();
            const matchesSearch = !query || title.startsWith(query) || title.split(' ')[0].startsWith(query);
            const matchesCat = bulkMaterialCategory === 'All Categories' || item.category === bulkMaterialCategory;
            return matchesSearch && matchesCat;
        });
    }, [mediaItems, bulkMaterialSearch, bulkMaterialCategory]);

    // Live Recipient & CSV Validation Breakdown Computation
    const recipientValidationStats = useMemo(() => {
        const rawLines = bulkInputText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const validRecipients: Array<{ phone: string; name?: string }> = [];
        let validCount = 0;
        let invalidCount = 0;
        let duplicateCount = 0;
        const seenPhones = new Set<string>();

        rawLines.forEach(line => {
            if (/^(phone|mobile|number|name|contact|sr|id)/i.test(line) && !/\d{10}/.test(line)) {
                return; // Skip CSV Header
            }

            const parts = line.split(/[,;\t]/).map(p => p.trim());
            const phoneStr = parts[0] || '';
            const nameStr = parts[1] || undefined;
            const digits = phoneStr.replace(/\D/g, '');
            const phone = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.slice(-10);

            if (phone && phone.length === 10) {
                if (seenPhones.has(phone)) {
                    duplicateCount++;
                } else {
                    seenPhones.add(phone);
                    validCount++;
                    validRecipients.push({ phone, name: nameStr });
                }
            } else {
                invalidCount++;
            }
        });

        return {
            total: rawLines.length,
            validCount,
            invalidCount,
            duplicateCount,
            validRecipients
        };
    }, [bulkInputText]);

    // Campaign Auto-Save Engine (Debounced to Neon PostgreSQL API)
    useEffect(() => {
        if (!bulkCampaignName.trim()) return;

        const selectedTitles = mediaItems
            .filter(m => bulkSelectedMaterials.includes(m.id))
            .map(m => m.title);

        const campaignIdToSave = currentCampaignId || `cmp-${Date.now()}`;
        if (!currentCampaignId) {
            setCurrentCampaignId(campaignIdToSave);
        }

        campaignService.autoSaveCampaign({
            id: campaignIdToSave,
            campaignName: bulkCampaignName.trim(),
            status: campaignStatus,
            notes: campaignNotes,
            tags: campaignTags,
            rawContactsText: bulkInputText,
            csvFileName: uploadedCsvFileName || undefined,
            materialIds: bulkSelectedMaterials,
            materialTitles: selectedTitles,
            deliverySettings,
            scheduleSettings,
            recipientStats: {
                totalCount: recipientValidationStats.total,
                validCount: recipientValidationStats.validCount,
                invalidCount: recipientValidationStats.invalidCount,
                duplicateCount: recipientValidationStats.duplicateCount,
                skippedCount: 0,
                deliveredCount: 0,
                failedCount: 0
            },
            parsedContacts: recipientValidationStats.validRecipients.map(r => ({
                phone: r.phone,
                name: r.name,
                status: 'Pending'
            }))
        }, setAutoSaveStatus);
    }, [
        bulkCampaignName,
        campaignStatus,
        campaignNotes,
        campaignTags,
        bulkInputText,
        uploadedCsvFileName,
        bulkSelectedMaterials,
        deliverySettings,
        scheduleSettings,
        recipientValidationStats
    ]);

    // Campaigns Dashboard Subscriptions & Server-Side Filtering
    useEffect(() => {
        const unsubCampaigns = campaignService.subscribe(list => setCampaignsList(list));
        const unsubStats = campaignService.subscribeStats(st => setDashboardStats(st));
        return () => {
            unsubCampaigns();
            unsubStats();
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            campaignService.fetchCampaignsFromApi({
                search: campaignSearch,
                status: campaignStatusFilter,
                tag: campaignTagFilter,
                isArchived: includeArchived,
                page: campaignPage,
                sort: campaignSort
            }).then(res => {
                if (res) {
                    setCampaignsList(res.campaigns);
                    setCampaignTotalPages(res.pagination.totalPages);
                }
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [campaignSearch, campaignStatusFilter, campaignTagFilter, includeArchived, campaignSort, campaignPage]);

    // Automatic Scheduled Campaign Launcher & Background Polling Engine
    useEffect(() => {
        const checkScheduleAndPoll = async () => {
            // Re-fetch campaigns from Neon DB (evaluates due scheduled campaigns on backend)
            campaignService.fetchCampaignsFromApi({
                search: campaignSearch,
                status: campaignStatusFilter,
                tag: campaignTagFilter,
                isArchived: includeArchived,
                page: campaignPage,
                sort: campaignSort
            }).then(res => {
                if (res) {
                    setCampaignsList(res.campaigns);
                    setCampaignTotalPages(res.pagination.totalPages);
                }
            });

            // Check currently open campaign in Dispatch Builder
            if (campaignStatus === 'Scheduled' && bulkCampaignState === 'idle' && scheduleSettings.scheduledDate && scheduleSettings.scheduledTime) {
                const scheduledDateTime = new Date(`${scheduleSettings.scheduledDate}T${scheduleSettings.scheduledTime}`);
                const now = new Date();

                if (now >= scheduledDateTime) {
                    setCampaignStatus('Running');
                    setScheduleNotification(`⏰ Scheduled launch time reached (${scheduleSettings.scheduledTime})! Auto-launching campaign dispatch now...`);
                    setTimeout(() => setScheduleNotification(null), 6000);
                    handleSendBulkShare();
                }
            }
        };

        const interval = setInterval(checkScheduleAndPoll, 4000); // Check every 4 seconds
        return () => clearInterval(interval);
    }, [
        campaignStatus,
        bulkCampaignState,
        scheduleSettings,
        campaignSearch,
        campaignStatusFilter,
        campaignTagFilter,
        includeArchived,
        campaignSort,
        campaignPage
    ]);

    const filteredHistoryLogs = useMemo(() => {
        const filtered = historyLogs.filter(log => {
            // Hide individual bulk recipient rows from the general timeline unless searching specifically
            if (log.isBulkRecipient && !historySearch.trim()) {
                return false;
            }

            const query = historySearch.trim().toLowerCase();
            const matchesSearch = !query ||
                log.recipientPhone.includes(query) ||
                (log.recipientName && log.recipientName.toLowerCase().includes(query)) ||
                (log.campaignName && log.campaignName.toLowerCase().includes(query)) ||
                log.courseTitle.toLowerCase().includes(query) ||
                log.materials.some(m => m.toLowerCase().includes(query));

            const matchesStatus = historyStatusFilter === 'All'
                ? true
                : historyStatusFilter === 'Bulk'
                ? Boolean(log.isBulkCampaign)
                : log.status === historyStatusFilter;

            return matchesSearch && matchesStatus;
        });

        // Strict chronological sort (newest timestamp / ID first)
        return [...filtered].sort((a, b) => {
            const parseTime = (ts: string) => {
                if (!ts) return 0;
                const match = ts.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})(?:\s+(AM|PM))?/i);
                if (!match) return 0;
                const [, dateStr, hStr, mStr, ampm] = match;
                let hours = parseInt(hStr, 10);
                if (ampm) {
                    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
                    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
                }
                return new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${mStr}:00`).getTime();
            };

            const tA = parseTime(a.timestamp);
            const tB = parseTime(b.timestamp);
            if (tA !== tB) return tB - tA;

            const idA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
            const idB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
            return idB - idA;
        });
    }, [historyLogs, historySearch, historyStatusFilter]);

    const selectedBulkMaterialObjects = useMemo(() => {
        return mediaItems.filter(m => bulkSelectedMaterials.includes(m.id));
    }, [mediaItems, bulkSelectedMaterials]);

    // Lock page background scrolling when any modal is active
    useEffect(() => {
        const isModalOpen = showBulkPreview || showUploadModal || deleteConfirmItem !== null || sendModalState !== 'idle' || saveSuccessState !== 'idle' || bulkCampaignState !== 'idle';
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showBulkPreview, showUploadModal, deleteConfirmItem, sendModalState, saveSuccessState, bulkCampaignState]);

    // Synchronize React state when async fetchMediaFromApi completes from Neon PostgreSQL
    useEffect(() => {
        return shareService.subscribeMedia(setMediaItems);
    }, []);

    // Automatically scroll window to top whenever active workspace section changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeWorkspace]);



    const renderFileTypeIcon = (type: MediaItem['fileType']) => {
        switch (type) {
            case 'pdf': return <FileText className="w-4 h-4 text-red-400" />;
            case 'image': return <ImageIcon className="w-4 h-4 text-emerald-400" />;
            case 'video': return <Video className="w-4 h-4 text-purple-400" />;
            default: return <FileCheck className="w-4 h-4 text-blue-400" />;
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#0d1117] pt-16 lg:pt-14 pb-20 relative text-white selection:bg-primary/30">
            {/* Hardware-accelerated background depth layers (Jitter-free) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transform-gpu">
                <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[140px] transform-gpu pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[140px] transform-gpu pointer-events-none" />
            </div>

            <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:pl-36 xl:pl-40 lg:pr-6 relative z-10">

                {/* Page Title Bar */}
                <div className="mb-3 lg:mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {activeWorkspace !== 'hub' && (
                            <motion.button
                                whileHover={{ scale: 1.05, x: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setActiveWorkspace('hub')}
                                className="mr-1 p-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-lg flex items-center gap-2 text-xs font-bold shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back</span>
                            </motion.button>
                        )}
                        <div>
                            <h1 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                {activeWorkspace === 'hub' ? (
                                    <>
                                        <span>Quick</span>
                                        <span className="text-gradient">Share</span>
                                    </>
                                ) : (
                                    <span className="text-gradient">
                                        {activeWorkspace === 'quick' ? 'Quick Share' :
                                         activeWorkspace === 'bulk' ? 'Bulk Dispatch' :
                                         activeWorkspace === 'library' ? 'Media Library' : 'History Log'}
                                    </span>
                                )}
                            </h1>
                            <p className="text-slate-400 text-[11px] font-medium hidden sm:block">
                                {activeWorkspace === 'library' ? 'Upload and manage course brochures, syllabus & flyers' :
                                 activeWorkspace === 'quick' ? 'Instant WhatsApp course material distribution' :
                                 activeWorkspace === 'bulk' ? 'Broadcast course materials to multiple contacts' :
                                 activeWorkspace === 'history' ? 'Audit trail of shared communication logs' :
                                 'Instant course communication & material distribution'}
                            </p>
                        </div>
                    </div>

                    {/* Active Workspace Status Badge */}
                    {activeWorkspace !== 'hub' && (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-black text-white uppercase tracking-wider shadow-lg">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            {activeWorkspace === 'quick' ? 'Quick Share' :
                             activeWorkspace === 'bulk' ? 'Bulk Dispatch' :
                             activeWorkspace === 'library' ? 'Media Library' : 'History Log'}
                        </span>
                    )}
                </div>

                {/* ════════════════════════════════════════════════════════════════
                    1. LANDING HUB VIEW (1 CARD PER ROW - TABLET PERFECT CLEARANCE)
                   ════════════════════════════════════════════════════════════════ */}
                {activeWorkspace === 'hub' && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="grid grid-cols-1 gap-3.5 lg:gap-4 mt-2 max-w-4xl"
                    >
                        {/* Card 1: Swift Share */}
                        <motion.div
                            whileHover={{ y: -6 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 450, damping: 25 }}
                            style={{ backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}
                            onClick={() => setActiveWorkspace('quick')}
                            className="group relative p-6 rounded-3xl bg-[#161b22]/90 border border-white/15 hover:border-primary/60 hover:shadow-[0_12px_35px_rgba(35,132,198,0.25)] transition-colors transition-shadow duration-200 ease-out cursor-pointer overflow-hidden flex flex-col justify-between min-h-[180px]"
                        >
                            <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-300 ease-out pointer-events-none" />
                            <div>
                                <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200 ease-out shadow-lg shadow-primary/20">
                                    <Send className="w-5 h-5 text-primary" />
                                </div>
                                <h3 className="text-lg font-extrabold text-white mb-1 flex items-center gap-2">
                                    Swift Share
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/30 text-blue-300 font-bold uppercase tracking-wider">Fastest</span>
                                </h3>
                                <p className="text-slate-300 text-xs leading-relaxed">
                                    Send course materials to a single enquiry in under 15 seconds.
                                </p>
                            </div>
                            <div className="mt-3 flex items-center text-primary font-bold text-xs group-hover:translate-x-2.5 transition-transform duration-200 ease-out">
                                Open Swift Share &rarr;
                            </div>
                        </motion.div>

                        {/* Card 2: Bulk Share */}
                        <motion.div
                            whileHover={{ y: -6 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 450, damping: 25 }}
                            style={{ backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}
                            onClick={() => setActiveWorkspace('bulk')}
                            className="group relative p-6 rounded-3xl bg-[#161b22]/90 border border-white/15 hover:border-purple-500/60 hover:shadow-[0_12px_35px_rgba(168,85,247,0.25)] transition-colors transition-shadow duration-200 ease-out cursor-pointer overflow-hidden flex flex-col justify-between min-h-[180px]"
                        >
                            <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-all duration-300 ease-out pointer-events-none" />
                            <div>
                                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200 ease-out shadow-lg shadow-purple-500/20">
                                    <Users className="w-5 h-5 text-purple-400" />
                                </div>
                                <h3 className="text-lg font-extrabold text-white mb-1">
                                    Bulk Share
                                </h3>
                                <p className="text-slate-300 text-xs leading-relaxed">
                                    Upload CSV or paste multiple numbers for batch material dispatch.
                                </p>
                            </div>
                            <div className="mt-3 flex items-center text-purple-400 font-bold text-xs group-hover:translate-x-2.5 transition-transform duration-200 ease-out">
                                Open Bulk Share &rarr;
                            </div>
                        </motion.div>

                        {/* Card 3: Media Library */}
                        <motion.div
                            whileHover={{ y: -6 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 450, damping: 25 }}
                            style={{ backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}
                            onClick={() => setActiveWorkspace('library')}
                            className="group relative p-6 rounded-3xl bg-[#161b22]/90 border border-white/15 hover:border-emerald-500/60 hover:shadow-[0_12px_35px_rgba(16,185,129,0.25)] transition-colors transition-shadow duration-200 ease-out cursor-pointer overflow-hidden flex flex-col justify-between min-h-[180px]"
                        >
                            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all duration-300 ease-out pointer-events-none" />
                            <div>
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200 ease-out shadow-lg shadow-emerald-500/20">
                                    <FolderOpen className="w-5 h-5 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-extrabold text-white mb-1">
                                    Media Library
                                </h3>
                                <p className="text-slate-300 text-xs leading-relaxed">
                                    Central repository to upload and manage brochures, syllabus and flyers.
                                </p>
                            </div>
                            <div className="mt-3 flex items-center text-emerald-400 font-bold text-xs group-hover:translate-x-2.5 transition-transform duration-200 ease-out">
                                Manage Repository ({mediaItems.length} items) &rarr;
                            </div>
                        </motion.div>

                        {/* Card 4: History */}
                        <motion.div
                            whileHover={{ y: -6 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 450, damping: 25 }}
                            style={{ backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}
                            onClick={() => setActiveWorkspace('history')}
                            className="group relative p-6 rounded-3xl bg-[#161b22]/90 border border-white/15 hover:border-amber-500/60 hover:shadow-[0_12px_35px_rgba(245,158,11,0.25)] transition-colors transition-shadow duration-200 ease-out cursor-pointer overflow-hidden flex flex-col justify-between min-h-[180px]"
                        >
                            <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-all duration-300 ease-out pointer-events-none" />
                            <div>
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200 ease-out shadow-lg shadow-amber-500/20">
                                    <History className="w-5 h-5 text-amber-400" />
                                </div>
                                <h3 className="text-lg font-extrabold text-white mb-1">
                                    History Log
                                </h3>
                                <p className="text-slate-300 text-xs leading-relaxed">
                                    Audit trail of previously shared materials and dispatch status logs.
                                </p>
                            </div>
                            <div className="mt-3 flex items-center text-amber-400 font-bold text-xs group-hover:translate-x-2.5 transition-transform duration-200 ease-out">
                                View Activity &rarr;
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* ════════════════════════════════════════════════════════════════
                    2. REDESIGNED QUICK SHARE WORKSPACE (TABLET-FIRST VIEWPORT COMPACT)
                   ════════════════════════════════════════════════════════════════ */}
                {activeWorkspace === 'quick' && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="relative pb-16 space-y-3"
                    >

                        {/* 2-Column Split Layout for Compact Tablet Viewport */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                            
                            {/* LEFT COLUMN: Steps 1 & 2 (Recipient & Course) */}
                            <div className="lg:col-span-5 space-y-4">
                                
                                {/* STEP 1: Recipient Phone Input Card */}
                                <div className="p-5 rounded-3xl bg-[#161b22]/90 border border-white/15 shadow-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                            <span className="w-5.5 h-5.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[11px] font-black shadow-md shadow-amber-500/40 border border-amber-300">1</span>
                                            Student's WhatsApp
                                        </span>
                                        {quickPhone.replace(/\D/g, '').length === 10 ? (
                                            <span className="text-[10px] text-emerald-400 font-black flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                                ✓ 10 Digits Valid
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-amber-400/90 font-bold">
                                                {quickPhone.replace(/\D/g, '').length > 0
                                                    ? `${quickPhone.replace(/\D/g, '').length} / 10 Digits`
                                                    : '10 Digits Required'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Phone Number Input with Country Code */}
                                    <div className={cn(
                                        "relative flex items-center bg-[#0d1117] border rounded-2xl p-1.5 transition-all shadow-inner",
                                        quickPhone.replace(/\D/g, '').length === 10
                                            ? "border-emerald-500/60 ring-2 ring-emerald-500/20"
                                            : quickPhone.replace(/\D/g, '').length > 0
                                                ? "border-amber-500/50"
                                                : "border-white/20 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40"
                                    )}>
                                        <div className="flex items-center gap-1.5 px-3 py-2 bg-white/10 rounded-xl border border-white/10 shrink-0 select-none">
                                            <span className="text-base">🇮🇳</span>
                                            <span className="text-xs font-extrabold text-slate-200">+91</span>
                                        </div>
                                        <input
                                            type="tel"
                                            placeholder="Enter 10-digit number"
                                            value={quickPhone}
                                            maxLength={10}
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setQuickPhone(digits);
                                            }}
                                            className="w-full bg-transparent border-none px-3 text-white font-extrabold text-base placeholder:text-slate-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Mandatory Name Input */}
                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex items-center justify-between text-[10px] font-bold">
                                            <span className="text-slate-300">Student / Parent Name <span className="text-amber-400 font-extrabold">*</span></span>
                                            {quickRecipientName.trim().length >= 2 ? (
                                                <span className="text-emerald-400 font-black flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                                    ✓ Valid Name
                                                </span>
                                            ) : (
                                                <span className="text-amber-400/90 font-bold">
                                                    {quickRecipientName.trim().length > 0 ? 'Min 2 Characters' : 'Name Required *'}
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Student / Parent Name *"
                                            value={quickRecipientName}
                                            onChange={(e) => setQuickRecipientName(e.target.value)}
                                            className={cn(
                                                "w-full bg-[#0d1117] border rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-all shadow-inner",
                                                quickRecipientName.trim().length >= 2
                                                    ? "border-emerald-500/60 ring-2 ring-emerald-500/20"
                                                    : quickRecipientName.trim().length > 0
                                                        ? "border-amber-500/50"
                                                        : "border-white/20 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* STEP 2: Searchable Course Selector Card */}
                                <div className="p-5 rounded-3xl bg-[#161b22]/90 border border-white/15 shadow-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                            <span className="w-5.5 h-5.5 rounded-full bg-fuchsia-500 text-white flex items-center justify-center text-[11px] font-black shadow-md shadow-fuchsia-500/40 border border-fuchsia-300">2</span>
                                            Choose Course
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-semibold">{courses.length} Available</span>
                                    </div>

                                    {/* Search Box */}
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder="Search course name..."
                                            value={courseSearchQuery}
                                            onChange={(e) => setCourseSearchQuery(e.target.value)}
                                            className="w-full bg-[#0d1117] border border-white/15 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                        />
                                        {courseSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCourseSearchQuery('');
                                                    courseListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all flex items-center justify-center"
                                                title="Clear search"
                                            >
                                                <X className="w-3.5 h-3.5 text-red-400 stroke-[2.5]" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Course Selector Grid */}
                                    <div ref={courseListRef} className="max-h-48 lg:max-h-52 overflow-y-auto overflow-x-hidden space-y-1.5 pr-2 p-0.5">
                                        {filteredCoursesList.map((course) => {
                                            const isSelected = selectedCourseIds.includes(course.id);
                                            return (
                                                <div
                                                    key={course.id}
                                                    onClick={() => handleCourseToggle(course.id)}
                                                    className={cn(
                                                        "p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors duration-150 ease-out",
                                                        isSelected
                                                            ? "bg-primary/25 border-primary shadow-lg text-white"
                                                            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/15 hover:border-white/25"
                                                    )}
                                                >
                                                    <div className="truncate pr-2">
                                                        <div className="font-bold text-xs text-white truncate">
                                                            {course.title}
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all duration-150",
                                                        isSelected ? "bg-primary border-primary text-white scale-110" : "border-slate-600"
                                                    )}>
                                                        {isSelected && <Check className="w-3 h-3" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Step 3 (Materials & Hero Suggestions) */}
                            <div className="lg:col-span-7">
                                <div className="p-5 rounded-3xl bg-[#161b22]/90 border border-white/15 shadow-2xl space-y-4">
                                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                            <span className="w-5.5 h-5.5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[11px] font-black shadow-md shadow-cyan-400/40 border border-cyan-200">3</span>
                                            What would you like to send?
                                        </span>
                                        <span className="text-[10px] text-primary font-bold">
                                            {selectedMaterialIds.length} {selectedMaterialIds.length === 1 ? 'Item Selected' : 'Items Selected'}
                                        </span>
                                    </div>

                                    {/* RELATED COURSE MATERIALS CARD */}
                                    <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/30 border border-blue-500/40 shadow-xl space-y-2 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-blue-300 font-extrabold text-xs">
                                                <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                                                <span>{recommendedTitle}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-300">
                                                {suggestedCourseMaterials.length} Available
                                            </span>
                                        </div>

                                        {suggestedCourseMaterials.length === 0 ? (
                                            <div className="py-5 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5 border border-dashed border-white/10 rounded-xl bg-black/20">
                                                <FolderOpen className="w-5 h-5 text-slate-500" />
                                                <span className="font-semibold text-slate-300">
                                                    {selectedCourseIds.length === 0 ? 'Select a course on the left to view materials' : 'No specific materials linked to this course'}
                                                </span>
                                                <span className="text-[10px] text-slate-500">
                                                    {selectedCourseIds.length === 0 ? 'Course syllabus & flyers will appear here' : 'Use "All Materials" search below to find general documents'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 pt-1 max-h-48 lg:max-h-56 overflow-y-auto pr-1">
                                                {suggestedCourseMaterials.map((item) => {
                                                    const isSelected = selectedMaterialIds.includes(item.id);
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => toggleMaterialSelection(item.id)}
                                                            className={cn(
                                                                "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors duration-150 ease-out",
                                                                isSelected
                                                                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/30 font-bold"
                                                                    : "bg-black/30 border-white/15 text-slate-200 hover:bg-black/60 hover:border-white/30"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2.5 truncate pr-2">
                                                                {renderFileTypeIcon(item.fileType)}
                                                                <div className="truncate">
                                                                    <div className="font-bold text-xs text-white truncate">{item.title}</div>
                                                                    <div className="text-[10px] opacity-80">{item.category} • {item.fileSize}</div>
                                                                </div>
                                                            </div>
                                                            <div className={cn(
                                                                "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
                                                                isSelected ? "bg-white text-primary" : "border-white/40"
                                                            )}>
                                                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* ALL MATERIALS SECTION */}
                                    <div className="border border-white/10 rounded-2xl bg-white/5 overflow-hidden">
                                        <div className="px-4 py-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-300 border-b border-white/5">
                                            <button
                                                type="button"
                                                onClick={() => toggleSectionCollapse('all')}
                                                className="flex items-center gap-2 text-slate-300 hover:text-white shrink-0 cursor-pointer"
                                            >
                                                <span>All Materials ({filteredAllMaterials.length})</span>
                                            </button>

                                            {/* Search Bar - ONLY VISIBLE WHEN ALL MATERIALS IS OPEN */}
                                            {!collapsedSections.all && (
                                                <div className="relative flex-1 max-w-xs sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
                                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search materials by name..."
                                                        value={allMaterialsSearch}
                                                        onChange={(e) => setAllMaterialsSearch(e.target.value)}
                                                        className="w-full bg-[#0d1117] border border-white/15 rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 shadow-inner"
                                                    />
                                                    {allMaterialsSearch && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setAllMaterialsSearch('');
                                                                allMaterialsListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                                            }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all flex items-center justify-center"
                                                            title="Clear search"
                                                        >
                                                            <X className="w-3.5 h-3.5 text-red-400 stroke-[2.5]" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => toggleSectionCollapse('all')}
                                                className="p-1 rounded text-slate-400 hover:text-white shrink-0 cursor-pointer"
                                            >
                                                {collapsedSections.all ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        {!collapsedSections.all && (
                                            <div ref={allMaterialsListRef} className="p-3 pt-2 space-y-2 max-h-56 lg:max-h-64 overflow-y-auto pr-1">
                                                {filteredAllMaterials.map((item) => {
                                                    const isSelected = selectedMaterialIds.includes(item.id);
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => toggleMaterialSelection(item.id)}
                                                            className={cn(
                                                                "p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs",
                                                                isSelected
                                                                    ? "bg-primary/30 border-primary text-white font-bold"
                                                                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2 truncate pr-2">
                                                                {renderFileTypeIcon(item.fileType)}
                                                                <span className="truncate">{item.title}</span>
                                                            </div>
                                                            <div className={cn(
                                                                "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
                                                                isSelected ? "bg-primary border-primary text-white" : "border-slate-600"
                                                            )}>
                                                                {isSelected && <Check className="w-3 h-3" />}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ════════════════════════════════════════════════════════════════
                            SESSION DISPATCH HISTORY TOOLBAR (LAST 5 ATTEMPTS WITH FILTERS)
                           ════════════════════════════════════════════════════════════════ */}
                        {dispatchHistoryBuffer.length > 0 && (
                            <div className="p-3.5 rounded-2xl bg-[#161b22]/90 border border-slate-800 space-y-2.5 mt-4 backdrop-blur-md">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                                        <History className="w-3.5 h-3.5 text-cyan-400" />
                                        <span>Session Dispatch Diagnostics</span>
                                    </span>

                                    {/* History Filter Tabs */}
                                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                        {(['all', 'success', 'failed', 'newest', 'oldest'] as const).map(f => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => setHistoryFilter(f)}
                                                className={cn(
                                                    "px-2 py-0.5 rounded-lg capitalize transition-all cursor-pointer",
                                                    historyFilter === f
                                                        ? "bg-slate-700 text-white font-bold"
                                                        : "hover:bg-slate-800 hover:text-slate-200"
                                                )}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {dispatchHistoryBuffer
                                        .filter(item => {
                                            if (historyFilter === 'success') return item.type === 'success';
                                            if (historyFilter === 'failed') return item.type !== 'success';
                                            return true;
                                        })
                                        .slice()
                                        .sort((a, b) => {
                                            if (historyFilter === 'oldest') return a.id.localeCompare(b.id);
                                            return b.id.localeCompare(a.id);
                                        })
                                        .map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setActiveToast(item)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all hover:scale-105 cursor-pointer",
                                                    item.type === 'success'
                                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                                        : "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                                                )}
                                            >
                                                <span>{item.type === 'success' ? '✓' : '✗'}</span>
                                                <span className="font-semibold">{item.recipientPhone || 'Recipient'}</span>
                                                <span className="text-[10px] opacity-75">({item.timestamp.split(', ')[1] || item.timestamp})</span>
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* ════════════════════════════════════════════════════════════════
                            WHATSAPP MESSAGE PREVIEW CARD (PROFESSIONAL COMPOSER)
                           ════════════════════════════════════════════════════════════════ */}
                        <div className="p-5 sm:p-6 rounded-3xl bg-[#161b22]/90 border border-white/15 shadow-2xl space-y-3.5 relative overflow-hidden mt-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                                        <MessageSquare className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                                            <span>WhatsApp Message Preview</span>
                                            {isQuickMessageCustomized ? (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider">
                                                    Customized
                                                </span>
                                            ) : (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold uppercase tracking-wider">
                                                    Auto-Generated
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-[11px] text-slate-400 font-medium">
                                            This personalized message will be sent along with the selected materials.
                                        </p>
                                    </div>
                                </div>

                                {/* Action Controls */}
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsQuickMessageCustomized(false);
                                            const selectedCourses = courses.filter(c => selectedCourseIds.includes(c.id));
                                            const courseTitlesText = selectedCourses.map(c => c.title).join(', ') || '';
                                            const selectedMaterialTitles = mediaItems
                                                .filter(m => selectedMaterialIds.includes(m.id))
                                                .map(m => m.title);
                                            const autoMsg = generateQuickShareMessage({
                                                studentName: quickRecipientName,
                                                courseName: courseTitlesText || undefined,
                                                materials: selectedMaterialTitles
                                            });
                                            setQuickMessage(autoMsg);
                                        }}
                                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                        title="Reset message to default auto-generated template"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Reset Message</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (quickMessage) {
                                                navigator.clipboard.writeText(quickMessage);
                                                setIsQuickMessageCopied(true);
                                                setTimeout(() => setIsQuickMessageCopied(false), 2000);
                                            }
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm",
                                            isQuickMessageCopied
                                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                                : "bg-white/5 hover:bg-white/15 border border-white/15 text-slate-300 hover:text-white"
                                        )}
                                        title="Copy generated message to clipboard"
                                    >
                                        {isQuickMessageCopied ? <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{isQuickMessageCopied ? 'Copied!' : 'Copy Message'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Validation Guidance Alerts */}
                            <div className="space-y-2">
                                {quickRecipientName.trim().length < 2 && (
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                                        <span>Enter student name to generate personalized message.</span>
                                    </div>
                                )}
                                {selectedCourseIds.length === 0 && (
                                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 text-blue-400" />
                                        <span>Select a course to generate a personalized message.</span>
                                    </div>
                                )}
                                {selectedMaterialIds.length === 0 && (
                                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 text-purple-400" />
                                        <span>Select at least one material to complete the message.</span>
                                    </div>
                                )}
                            </div>

                            {/* Professional Multiline Editor */}
                            <div className="relative">
                                <textarea
                                    rows={9}
                                    value={quickMessage}
                                    onChange={(e) => {
                                        setQuickMessage(e.target.value);
                                        setIsQuickMessageCustomized(true);
                                    }}
                                    placeholder="Generated WhatsApp message preview will appear here..."
                                    className="w-full bg-[#0d1117] border border-white/15 rounded-2xl p-4 text-xs font-medium leading-relaxed text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all resize-y min-h-[200px] shadow-inner font-sans"
                                />

                                {/* Live Character Count */}
                                <div className="mt-2 flex items-center justify-end">
                                    <span className="text-[11px] font-mono text-slate-400 font-bold bg-black/40 px-3 py-1 rounded-full border border-white/10 shadow-sm">
                                        {quickMessage.length} characters
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ════════════════════════════════════════════════════════════════
                            STEP 4: STICKY BOTTOM ACTION BAR (ALWAYS VISIBLE)
                           ════════════════════════════════════════════════════════════════ */}
                        <div className="fixed bottom-4 left-4 right-4 lg:left-36 xl:left-40 lg:right-6 z-40">
                            <div className="bg-[#161b22]/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-3.5 px-5 shadow-2xl flex items-center justify-between gap-4 max-w-5xl mx-auto">
                                {/* Live Selection Summary */}
                                <div className="flex items-center gap-4 text-xs font-bold text-slate-200">
                                    <div className="flex items-center gap-1.5 text-emerald-400">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Ready to Send • {selectedMaterialIds.length} {selectedMaterialIds.length === 1 ? 'Item Selected' : 'Items Selected'}</span>
                                    </div>
                                    <span className="hidden sm:inline text-slate-600">|</span>
                                    <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                        <span>WhatsApp Direct</span>
                                    </div>
                                    {quickPhone && (
                                        <>
                                            <span className="hidden sm:inline text-slate-600">|</span>
                                            <span className="text-primary truncate max-w-[140px]">+91 {quickPhone}</span>
                                        </>
                                    )}
                                </div>

                                {/* Primary Action Button */}
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => handleSendQuickShare()}
                                    disabled={
                                        isSendingQuick ||
                                        quickPhone.replace(/\D/g, '').length !== 10 ||
                                        quickRecipientName.trim().length < 2 ||
                                        selectedMaterialIds.length === 0
                                    }
                                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary-dark hover:to-blue-700 text-white font-extrabold text-sm shadow-xl shadow-primary/30 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                                >
                                    {isSendingQuick ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            <span>Send Now</span>
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </div>

                    </motion.div>
                )}

                {/* ════════════════════════════════════════════════════════════════
                    3. BULK SHARE WORKSPACE & CAMPAIGN MANAGEMENT SYSTEM
                   ════════════════════════════════════════════════════════════════ */}
                {activeWorkspace === 'bulk' && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="bg-[#161b22] border border-white/20 rounded-3xl p-6 lg:p-8 shadow-2xl max-w-5xl mx-auto space-y-6"
                    >
                        {/* Workspace Header Bar with Tabs & Auto-Save */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
                                    <span>WhatsApp Campaign Engine</span>
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/35">
                                        PRO ENGINE
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-400">Configure, schedule, and manage bulk campaigns backed by Neon DB</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-2xl">
                                    <button
                                        type="button"
                                        onClick={() => setBulkTab('builder')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                            bulkTab === 'builder'
                                                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                                                : "text-slate-400 hover:text-white"
                                        )}
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Dispatch Builder</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBulkTab('dashboard')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                            bulkTab === 'dashboard'
                                                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                                                : "text-slate-400 hover:text-white"
                                        )}
                                    >
                                        <LayoutDashboard className="w-3.5 h-3.5" />
                                        <span>Campaigns Dashboard</span>
                                    </button>
                                </div>

                                {/* Auto-Save Status Indicator */}
                                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold shadow-inner">
                                    {autoSaveStatus === 'saving' ? (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                            <span className="text-amber-300 font-semibold">Saving...</span>
                                        </>
                                    ) : autoSaveStatus === 'saved' ? (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                            <span className="text-emerald-300 font-semibold">● Saved</span>
                                        </>
                                    ) : (
                                        <span className="text-slate-400">Draft</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* TAB 1: DISPATCH BUILDER */}
                        {bulkTab === 'builder' && (
                            <div className="space-y-6">
                                {/* Scheduled Campaign Header Banner */}
                                {campaignStatus === 'Scheduled' && (
                                    <div className="p-4.5 rounded-2xl bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-slate-900/60 border border-blue-500/40 shadow-xl flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-inner shrink-0">
                                                <Calendar className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-extrabold text-white">Campaign Launch Scheduled</h4>
                                                    <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                                        Scheduled
                                                    </span>
                                                </div>
                                                <p className="text-xs text-blue-200 mt-0.5">
                                                    Persisted in Neon PostgreSQL. Launch date: <strong className="text-white">{scheduleSettings.scheduledDate || 'Not set'}</strong> at <strong className="text-white">{scheduleSettings.scheduledTime || 'Not set'}</strong> ({scheduleSettings.timezone})
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowScheduleModal(true)}
                                                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/15 transition-all shadow-md cursor-pointer"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                                <span>Edit Schedule</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleUnscheduleCampaign}
                                                className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 font-bold text-xs flex items-center gap-1.5 border border-red-500/30 transition-all shadow-md cursor-pointer"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                <span>Remove Schedule</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Mandatory Campaign Name Input Field */}
                                <div className="bg-white/5 border border-white/10 p-4.5 rounded-2xl space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-200 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-purple-400" />
                                            <span>Campaign Name <span className="text-amber-400">*</span></span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                Status: {campaignStatus}
                                            </span>
                                            <span className={cn(
                                                "text-[11px] font-bold lowercase tracking-normal font-sans px-2.5 py-0.5 rounded-full border",
                                                bulkCampaignName.trim()
                                                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                                    : "bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse"
                                            )}>
                                                {bulkCampaignName.trim() ? '✓ Campaign Named' : '⚠️ Required to start dispatch'}
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={bulkCampaignName}
                                        onChange={(e) => setBulkCampaignName(e.target.value)}
                                        placeholder="e.g. Full Stack Python July 2026 Admission Drive"
                                        className="w-full bg-[#0d1117] border border-white/20 focus:border-purple-500/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 font-semibold focus:outline-none transition-all shadow-inner"
                                    />

                                    {/* Campaign Tags & Internal Notes */}
                                    <div className="pt-2 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Tags Manager */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                                <Tag className="w-3.5 h-3.5 text-purple-400" />
                                                <span>Campaign Tags:</span>
                                            </label>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {campaignTags.map(tag => (
                                                    <span key={tag} className="px-2.5 py-1 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-bold flex items-center gap-1">
                                                        <span>{tag}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveTag(tag)}
                                                            className="hover:text-white transition-colors"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        value={customTagInput}
                                                        onChange={(e) => setCustomTagInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleAddTag(customTagInput);
                                                            }
                                                        }}
                                                        placeholder="+ New Tag"
                                                        className="bg-[#0d1117] border border-white/15 rounded-xl px-2.5 py-1 text-[11px] text-white placeholder:text-slate-500 focus:outline-none w-24"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1 pt-1">
                                                <span className="text-[10px] text-slate-500">Presets:</span>
                                                {availablePresetTags.filter(t => !campaignTags.includes(t)).slice(0, 4).map(preset => (
                                                    <button
                                                        key={preset}
                                                        type="button"
                                                        onClick={() => handleAddTag(preset)}
                                                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white border border-white/10 transition-colors"
                                                    >
                                                        + {preset}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Internal Notes */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5 text-purple-400" />
                                                <span>Internal Campaign Notes:</span>
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={campaignNotes}
                                                onChange={(e) => setCampaignNotes(e.target.value)}
                                                placeholder="Internal notes for team (not sent to recipients)..."
                                                className="w-full bg-[#0d1117] border border-white/20 focus:border-purple-500/80 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Numbers / CSV Section */}
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-300">
                                            Paste Mobile Numbers or Upload CSV
                                        </label>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {uploadedCsvFileName && (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold shadow-md">
                                                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                                                    <span className="truncate max-w-[160px]" title={uploadedCsvFileName}>{uploadedCsvFileName}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setUploadedCsvFileName('');
                                                            setBulkInputText('');
                                                        }}
                                                        className="ml-0.5 p-0.5 hover:bg-purple-500/30 rounded-full text-purple-300 hover:text-white transition-colors"
                                                        title="Remove uploaded file"
                                                    >
                                                        <X className="w-3.5 h-3.5 text-purple-300 stroke-[2.5]" />
                                                    </button>
                                                </div>
                                            )}

                                            <label className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md">
                                                <Upload className="w-3.5 h-3.5" />
                                                <span>Upload CSV</span>
                                                <input
                                                    type="file"
                                                    accept=".csv,.txt"
                                                    onChange={handleCsvFileUpload}
                                                    className="hidden"
                                                />
                                            </label>

                                            <button
                                                type="button"
                                                onClick={handleCopyCsvFormat}
                                                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                                                title="Copy standardized CSV template format for AI"
                                            >
                                                {isCsvCopied ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                        <span className="text-emerald-400 font-extrabold">Copied!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3.5 h-3.5 text-slate-300" />
                                                        <span>Copy CSV Format</span>
                                                    </>
                                                )}
                                            </button>

                                            {(bulkInputText.trim() || uploadedCsvFileName || bulkSelectedMaterials.length > 0) && (
                                                <button
                                                    type="button"
                                                    onClick={handleResetBulkForm}
                                                    className="px-3.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md"
                                                    title="Reset form, uploaded CSV file, and selected materials"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5 text-red-400 stroke-[2.5]" />
                                                    <span>Reset</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <textarea
                                        rows={5}
                                        value={bulkInputText}
                                        onChange={(e) => setBulkInputText(e.target.value)}
                                        placeholder="9823045678, 9422411223&#10;9890088776..."
                                        className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder:text-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    />
                                </div>

                                {/* Live Recipient Validation Breakdown */}
                                {bulkInputText.trim() && (
                                    <div className="space-y-3">
                                        {parsedBulkContacts.duplicate.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex flex-wrap items-center justify-between gap-3 bg-amber-500/15 border border-amber-500/30 px-4 py-2.5 rounded-2xl shadow-lg"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                                    <span className="text-xs font-bold text-amber-200">
                                                        {parsedBulkContacts.duplicate.length} duplicate mobile {parsedBulkContacts.duplicate.length === 1 ? 'entry' : 'entries'} detected
                                                    </span>
                                                </div>

                                                <label className="flex items-center gap-2 cursor-pointer bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-xl text-xs font-extrabold transition-all shadow-md">
                                                    <input
                                                        type="checkbox"
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                handleDeduplicateBulkText();
                                                            }
                                                        }}
                                                        className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                                                    />
                                                    <span>Remove Duplicates</span>
                                                </label>
                                            </motion.div>
                                        )}

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                                <span className="text-lg font-black text-emerald-400 block">{recipientValidationStats.validCount}</span>
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Valid Contacts</span>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                                                <span className="text-lg font-black text-rose-400 block">{recipientValidationStats.invalidCount}</span>
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Invalid Length</span>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                                                <span className="text-lg font-black text-amber-400 block">{recipientValidationStats.duplicateCount}</span>
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Duplicates</span>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                                                <span className="text-lg font-black text-white block">{recipientValidationStats.total}</span>
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Total Rows</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Advanced Delivery Settings Accordion */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setShowDeliveryAccordion(!showDeliveryAccordion)}
                                        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                                            <Settings2 className="w-4 h-4 text-purple-400" />
                                            <span>Advanced Delivery Settings & Anti-Ban Throttling</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-mono text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-lg">
                                                Batch: {deliverySettings.batchSize} | Pause: {deliverySettings.batchPauseSeconds}s
                                            </span>
                                            {showDeliveryAccordion ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                        </div>
                                    </button>

                                    {showDeliveryAccordion && (
                                        <div className="p-4 pt-0 border-t border-white/10 space-y-4 text-xs">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-slate-300">Message Delay Mode:</label>
                                                    <select
                                                        value={deliverySettings.delayMode}
                                                        onChange={(e) => {
                                                            const mode = e.target.value as DeliverySettings['delayMode'];
                                                            const secs = mode === '1' ? 1 : mode === '5' ? 5 : mode === '10' ? 10 : 3;
                                                            setDispatchDelaySec(secs);
                                                            setDeliverySettings(prev => ({ ...prev, delayMode: mode, delaySeconds: secs }));
                                                        }}
                                                        className="w-full bg-[#0d1117] border border-white/20 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none"
                                                    >
                                                        <option value="1">1 Sec (Fast Dispatch)</option>
                                                        <option value="5">5 Sec (Recommended Anti-Ban)</option>
                                                        <option value="10">10 Sec (Ultra Safe)</option>
                                                        <option value="random">Random Delay Range (1s-5s)</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-slate-300">Batch Size (Recipients/Batch):</label>
                                                    <input
                                                        type="number"
                                                        value={deliverySettings.batchSize}
                                                        onChange={(e) => setDeliverySettings(prev => ({ ...prev, batchSize: Math.max(1, parseInt(e.target.value, 10) || 50) }))}
                                                        className="w-full bg-[#0d1117] border border-white/20 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-slate-300">Pause Between Batches (Sec):</label>
                                                    <input
                                                        type="number"
                                                        value={deliverySettings.batchPauseSeconds}
                                                        onChange={(e) => setDeliverySettings(prev => ({ ...prev, batchPauseSeconds: Math.max(0, parseInt(e.target.value, 10) || 300) }))}
                                                        className="w-full bg-[#0d1117] border border-white/20 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={deliverySettings.retryFailed}
                                                        onChange={(e) => setDeliverySettings(prev => ({ ...prev, retryFailed: e.target.checked }))}
                                                        className="accent-purple-500 rounded"
                                                    />
                                                    <span>Retry Failed Messages</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={deliverySettings.businessHoursOnly}
                                                        onChange={(e) => setDeliverySettings(prev => ({ ...prev, businessHoursOnly: e.target.checked }))}
                                                        className="accent-purple-500 rounded"
                                                    />
                                                    <span>Send Business Hours Only (09:00 - 18:00)</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={deliverySettings.skipWeekends}
                                                        onChange={(e) => setDeliverySettings(prev => ({ ...prev, skipWeekends: e.target.checked }))}
                                                        className="accent-purple-500 rounded"
                                                    />
                                                    <span>Skip Weekends & Sundays</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Select Course Materials */}
                                <div className="space-y-4 pt-2">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
                                        <div>
                                            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                                                <FolderOpen className="w-4 h-4 text-purple-400" />
                                                <span>Select Materials to Dispatch</span>
                                            </h4>
                                            <p className="text-[11px] text-slate-400">Choose single or multiple media documents to send to each contact</p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="relative">
                                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={bulkMaterialSearch}
                                                    onChange={(e) => setBulkMaterialSearch(e.target.value)}
                                                    placeholder="Search materials..."
                                                    className="bg-white/5 border border-white/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/80 w-44"
                                                />
                                            </div>
                                            <select
                                                value={bulkMaterialCategory}
                                                onChange={(e) => setBulkMaterialCategory(e.target.value)}
                                                className="bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                                            >
                                                {mediaCategories.map(cat => (
                                                    <option key={cat} value={cat} className="bg-[#161b22] text-white">{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Media Items Grid Selection */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                                        {filteredBulkMaterials.map(item => {
                                            const isSelected = bulkSelectedMaterials.includes(item.id);
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setBulkSelectedMaterials(prev =>
                                                            prev.includes(item.id)
                                                                ? prev.filter(id => id !== item.id)
                                                                : [...prev, item.id]
                                                        );
                                                    }}
                                                    className={cn(
                                                        "p-3.5 rounded-2xl border text-left flex items-start justify-between gap-3 transition-all cursor-pointer",
                                                        isSelected
                                                            ? "bg-purple-600/20 border-purple-500/80 shadow-lg shadow-purple-500/10"
                                                            : "bg-white/5 border-white/10 hover:bg-white/10"
                                                    )}
                                                >
                                                    <div className="space-y-1 truncate pr-2">
                                                        <div className="flex items-center gap-2">
                                                            {renderFileTypeIcon(item.fileType)}
                                                            <span className="font-extrabold text-white text-xs truncate">{item.title}</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                                            <span className="px-2 py-0.2 rounded-md bg-white/10 font-bold">{item.category}</span>
                                                            <span>•</span>
                                                            <span>{item.fileSize}</span>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all",
                                                        isSelected ? "bg-purple-500 border-purple-400 text-white" : "border-white/20 text-transparent"
                                                    )}>
                                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Actions & Live Summary Bar */}
                                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-xs text-slate-400">
                                        <span>Selected: <strong className="text-purple-300 font-bold">{bulkSelectedMaterials.length} Materials</strong></span>
                                        <span className="mx-2">•</span>
                                        <span>Recipients: <strong className="text-emerald-300 font-bold">{parsedBulkContacts.valid.length} Valid</strong></span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCampaignStatus('Draft');
                                                setAutoSaveStatus('saving');
                                                setTimeout(() => setAutoSaveStatus('saved'), 500);
                                            }}
                                            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                                        >
                                            Save Draft
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowScheduleModal(true)}
                                            className={cn(
                                                "px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border",
                                                campaignStatus === 'Scheduled'
                                                    ? "bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/40 text-blue-300 shadow-md shadow-blue-500/10"
                                                    : "bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40 text-purple-300"
                                            )}
                                        >
                                            <Calendar className="w-4 h-4" />
                                            <span>{campaignStatus === 'Scheduled' ? 'Edit Schedule' : 'Schedule Launch'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!bulkCampaignName.trim() || parsedBulkContacts.valid.length === 0 || bulkSelectedMaterials.length === 0}
                                            onClick={() => {
                                                if (campaignStatus === 'Scheduled') {
                                                    setShowOverrideScheduleModal(true);
                                                } else {
                                                    setShowBulkPreview(true);
                                                }
                                            }}
                                            className={cn(
                                                "px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all cursor-pointer",
                                                (bulkCampaignName.trim() && parsedBulkContacts.valid.length > 0 && bulkSelectedMaterials.length > 0)
                                                    ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/30"
                                                    : "bg-white/10 text-slate-500 cursor-not-allowed"
                                            )}
                                        >
                                            <Eye className="w-4 h-4" />
                                            <span>{campaignStatus === 'Scheduled' ? 'Launch Now (Override)' : 'Preview & Launch'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Preview & Launch Modal */}
                                {showBulkPreview && (
                                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                                        <div className="bg-[#161b22] border border-white/20 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl">
                                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                                    <span>Campaign Dispatch Preview</span>
                                                </h3>
                                                <button onClick={() => setShowBulkPreview(false)} className="text-slate-400 hover:text-white">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <div className="space-y-3 text-xs text-slate-300">
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3.5">
                                                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                                                        <span className="text-slate-400 font-medium">Campaign Name:</span>
                                                        <span className="font-extrabold text-white text-xs">
                                                            {bulkCampaignName}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                                                        <span className="text-slate-400 font-medium">Valid Contact Count:</span>
                                                        <span className="font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg text-xs">
                                                            {parsedBulkContacts.valid.length} Recipients
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <span className="text-slate-400 font-bold block mb-2 text-[11px] uppercase tracking-wider">
                                                            Selected Materials ({selectedBulkMaterialObjects.length}):
                                                        </span>
                                                        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                                            {selectedBulkMaterialObjects.map((item) => (
                                                                <div
                                                                    key={item.id}
                                                                    className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between text-xs font-bold text-white shadow-sm"
                                                                >
                                                                    <div className="flex items-center gap-2 truncate pr-2">
                                                                        {renderFileTypeIcon(item.fileType)}
                                                                        <span className="truncate">{item.title}</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 shrink-0">
                                                                        {item.category}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* WhatsApp Anti-Ban Delay Mode */}
                                                    <div className="border-t border-white/10 pt-3 space-y-2">
                                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                                                            <span className="flex items-center gap-1.5 text-white">
                                                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                                                <span>WhatsApp Anti-Ban Throttle:</span>
                                                            </span>
                                                            <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
                                                                {deliverySettings.delayMode === 'random' ? 'Random Delay (1s-5s)' : `${dispatchDelaySec}s Delay`}
                                                            </span>
                                                        </label>

                                                        <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between pt-1">
                                                            <span>Est. Duration: <strong className="text-purple-300 font-mono text-[11px]">~{Math.round(parsedBulkContacts.valid.length * dispatchDelaySec)}s</strong></span>
                                                            <span className="text-emerald-400 font-semibold">✓ Prevents WhatsApp bans</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 text-xs font-bold">
                                                <button
                                                    onClick={() => setShowBulkPreview(false)}
                                                    className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSendBulkShare}
                                                    className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                                                >
                                                    <Send className="w-4 h-4" />
                                                    <span>Confirm & Launch</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: CAMPAIGNS DASHBOARD & MANAGEMENT SYSTEM */}
                        {bulkTab === 'dashboard' && (
                            <div className="space-y-6">
                                {/* Statistics Grid Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block">Total Campaigns</span>
                                        <span className="text-xl font-black text-white">{dashboardStats.totalCampaigns}</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
                                        <span className="text-purple-300 text-[10px] font-black uppercase tracking-wider block">Drafts</span>
                                        <span className="text-xl font-black text-purple-300">{dashboardStats.draft}</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                                        <span className="text-blue-300 text-[10px] font-black uppercase tracking-wider block">Scheduled</span>
                                        <span className="text-xl font-black text-blue-300">{dashboardStats.scheduled}</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                        <span className="text-emerald-300 text-[10px] font-black uppercase tracking-wider block">Completed</span>
                                        <span className="text-xl font-black text-emerald-300">{dashboardStats.completed}</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                                        <span className="text-amber-300 text-[10px] font-black uppercase tracking-wider block">Archived</span>
                                        <span className="text-xl font-black text-amber-300">{dashboardStats.archived}</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block">Recipients</span>
                                        <span className="text-xl font-black text-white">{dashboardStats.totalRecipients}</span>
                                    </div>
                                </div>

                                {/* Search, Filter & Sort Controls */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
                                    <div className="flex flex-wrap items-center gap-3 flex-1">
                                        <div className="relative flex-1 max-w-xs">
                                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={campaignSearch}
                                                onChange={(e) => {
                                                    setCampaignSearch(e.target.value);
                                                    setCampaignPage(1);
                                                }}
                                                placeholder="Search campaign name, tag, status..."
                                                className="w-full bg-[#0d1117] border border-white/15 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                                            />
                                            {campaignSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCampaignSearch('');
                                                        setCampaignPage(1);
                                                    }}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                                                    title="Clear search query"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        <select
                                            value={campaignStatusFilter}
                                            onChange={(e) => {
                                                setCampaignStatusFilter(e.target.value);
                                                setCampaignPage(1);
                                            }}
                                            className="bg-[#0d1117] border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                                        >
                                            <option value="All">All Statuses</option>
                                            <option value="Draft">Draft</option>
                                            <option value="Ready">Ready</option>
                                            <option value="Scheduled">Scheduled</option>
                                            <option value="Running">Running</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Archived">Archived</option>
                                        </select>

                                        <select
                                            value={campaignTagFilter}
                                            onChange={(e) => {
                                                setCampaignTagFilter(e.target.value);
                                                setCampaignPage(1);
                                            }}
                                            className="bg-[#0d1117] border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                                        >
                                            <option value="All">All Tags</option>
                                            {availablePresetTags.map(tag => (
                                                <option key={tag} value={tag}>#{tag}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={campaignSort}
                                            onChange={(e) => {
                                                setCampaignSort(e.target.value);
                                                setCampaignPage(1);
                                            }}
                                            className="bg-[#0d1117] border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                                        >
                                            <option value="newest">Newest First</option>
                                            <option value="oldest">Oldest First</option>
                                            <option value="name">Name (A-Z)</option>
                                            <option value="recipients">Recipients Count</option>
                                            <option value="status">Status</option>
                                        </select>

                                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                                            <input
                                                type="checkbox"
                                                checked={includeArchived}
                                                onChange={(e) => {
                                                    setIncludeArchived(e.target.checked);
                                                    setCampaignPage(1);
                                                }}
                                                className="accent-purple-500 rounded cursor-pointer"
                                            />
                                            <span>Show Archived</span>
                                        </label>

                                        {(campaignSearch || campaignStatusFilter !== 'All' || campaignTagFilter !== 'All' || includeArchived) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCampaignSearch('');
                                                    setCampaignStatusFilter('All');
                                                    setCampaignTagFilter('All');
                                                    setIncludeArchived(false);
                                                    setCampaignPage(1);
                                                }}
                                                className="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                                                title="Reset all filters"
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                <span>Reset Filters</span>
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleCreateNewCampaign}
                                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>New Campaign</span>
                                    </button>
                                </div>

                                {/* Campaigns Cards List */}
                                <div className="space-y-3">
                                    {campaignsList.map(campaign => (
                                        <div
                                            key={campaign.id}
                                            className="bg-[#0d1117] border border-white/15 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                                        >
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <h4 className="font-extrabold text-white text-base">{campaign.campaignName}</h4>
                                                    <span className={cn(
                                                        "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                                        campaign.status === 'Completed' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                                                        campaign.status === 'Scheduled' ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
                                                        campaign.status === 'Archived' ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                                                        "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                                    )}>
                                                        {campaign.status}
                                                    </span>
                                                    {campaign.tags.map(t => (
                                                        <span key={t} className="px-2 py-0.5 rounded-lg bg-white/10 text-slate-300 text-[10px] font-bold">
                                                            #{t}
                                                        </span>
                                                    ))}
                                                </div>

                                                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                                                    <span>Recipients: <strong className="text-white">{campaign.recipientStats?.validCount || 0}</strong></span>
                                                    <span>•</span>
                                                    <span>Materials: <strong className="text-purple-300">{campaign.materialIds?.length || 0}</strong></span>
                                                    <span>•</span>
                                                    <span>Created: <strong className="text-slate-300">{new Date(campaign.createdAt).toLocaleDateString()}</strong></span>
                                                </div>

                                                {campaign.status === 'Scheduled' && campaign.scheduleSettings?.scheduledDate && (
                                                    <div className="text-xs text-blue-300 font-semibold flex items-center gap-1.5 mt-1 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-xl w-fit">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span>Scheduled for {campaign.scheduleSettings.scheduledDate} at {campaign.scheduleSettings.scheduledTime} ({campaign.scheduleSettings.timezone || 'IST'})</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleLoadCampaignForEdit(campaign);
                                                        setShowScheduleModal(true);
                                                    }}
                                                    className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                                                    title="Schedule or edit campaign launch time"
                                                >
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>{campaign.status === 'Scheduled' ? 'Edit Schedule' : 'Schedule'}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleLoadCampaignForEdit(campaign)}
                                                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                                                    title="Edit campaign settings"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                    <span>Edit</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        const duplicated = await campaignService.duplicateCampaign(campaign.id);
                                                        if (duplicated) handleLoadCampaignForEdit(duplicated);
                                                    }}
                                                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                                                    title="Duplicate campaign"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                    <span>Duplicate</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowArchiveConfirmCampaign(campaign)}
                                                    className="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 transition-all cursor-pointer"
                                                    title={campaign.isArchived ? "Unarchive campaign" : "Archive campaign"}
                                                >
                                                    <Archive className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDeleteConfirmCampaign(campaign)}
                                                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all cursor-pointer"
                                                    title="Soft delete campaign"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {campaignsList.length === 0 && (
                                        <div className="text-center py-12 text-slate-500 text-xs">
                                            No campaigns found matching your filters. Click <strong>+ New Campaign</strong> to create one.
                                        </div>
                                    )}

                                    {/* Pagination Controls */}
                                    {campaignsList.length > 0 && (
                                        <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs">
                                            <span className="text-slate-400">
                                                Page <strong className="text-white">{campaignPage}</strong> of <strong className="text-white">{campaignTotalPages}</strong>
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={campaignPage <= 1}
                                                    onClick={() => setCampaignPage(prev => Math.max(1, prev - 1))}
                                                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 cursor-pointer"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={campaignPage >= campaignTotalPages}
                                                    onClick={() => setCampaignPage(prev => Math.min(campaignTotalPages, prev + 1))}
                                                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 cursor-pointer"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ════════════════════════════════════════════════════════════════
                    4. MEDIA LIBRARY WORKSPACE
                   ════════════════════════════════════════════════════════════════ */}
                {activeWorkspace === 'library' && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="space-y-6"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-3 flex-1">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search materials by title..."
                                        value={librarySearch}
                                        onChange={(e) => setLibrarySearch(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-2xl py-2.5 pl-11 pr-10 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    />
                                    {librarySearch && (
                                        <button
                                            type="button"
                                            onClick={() => setLibrarySearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all flex items-center justify-center"
                                            title="Clear search"
                                        >
                                            <X className="w-4 h-4 text-red-400 stroke-[2.5]" />
                                        </button>
                                    )}
                                </div>
                                <div className="relative shrink-0">
                                    <select
                                        value={libraryCategory}
                                        onChange={(e) => setLibraryCategory(e.target.value)}
                                        className="appearance-none bg-[#161b22] border border-white/20 rounded-2xl pl-4 pr-10 py-2.5 text-white text-xs font-bold focus:outline-none focus:border-emerald-500/60 shadow-xl cursor-pointer hover:border-white/40 transition-colors"
                                    >
                                        {mediaCategories.map(cat => (
                                            <option key={cat} value={cat} className="bg-[#161b22] text-white py-1">{cat}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none stroke-[2.5]" />
                                </div>
                            </div>

                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xl flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Upload Material
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredLibraryMedia.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-[#161b22]/90 border border-white/15 rounded-3xl p-4 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3 group shadow-xl"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
                                            {renderFileTypeIcon(item.fileType)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <label
                                                className="p-1.5 rounded-xl bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 transition-all cursor-pointer"
                                                title="Replace file in Vercel Blob & Neon"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setReplaceItem(item);
                                                            handleExecuteReplace(file);
                                                        }
                                                    }}
                                                />
                                            </label>

                                            <button
                                                onClick={() => setDeleteConfirmItem(item)}
                                                className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-white text-sm leading-snug line-clamp-2 mb-1.5">
                                            {item.title}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-semibold">
                                                {item.category}
                                            </span>
                                            <span className="text-slate-500">•</span>
                                            <span className="text-slate-400 font-mono">{item.fileSize}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs gap-2">
                                        <div className="flex items-center gap-1.5 text-slate-300 font-semibold min-w-0 flex-wrap">
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                                                <span className="text-[11px] text-slate-400">Added</span>
                                                <span className="font-extrabold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-500/35 font-mono text-[11px] shadow-sm">
                                                    {item.uploadDate}
                                                </span>
                                            </div>
                                            <span
                                                className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/35 font-extrabold text-[10px] shadow-sm leading-tight inline-block"
                                            >
                                                {getCourseLabel(item.courseIds)}
                                            </span>
                                        </div>
                                        <span className="text-emerald-400 font-black text-[10px] uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                                            Ready
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {showUploadModal && (
                            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                                <div className="bg-[#161b22] border border-white/20 rounded-3xl p-6 max-w-lg w-full space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-white">Upload New Material</h3>
                                        <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-3.5">
                                        <div className="border-2 border-dashed border-white/20 hover:border-emerald-500/50 rounded-2xl p-5 text-center transition-all">
                                            <Upload className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
                                            <label className="cursor-pointer text-xs font-bold text-emerald-400 hover:underline">
                                                <span>{uploadFileName || 'Choose PDF, Image or Video file'}</span>
                                                <input type="file" onChange={handleSimulatedFileUpload} className="hidden" />
                                            </label>
                                            <p className="text-[10px] text-slate-500 mt-1">Auto-detects file type & title</p>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                Material Title
                                            </label>
                                            <input
                                                type="text"
                                                value={uploadTitle}
                                                onChange={(e) => setUploadTitle(e.target.value)}
                                                placeholder="e.g. Core Java Syllabus 2026"
                                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                Course Association
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={uploadCourseId}
                                                    onChange={(e) => setUploadCourseId(e.target.value)}
                                                    className="w-full appearance-none bg-[#0d1117] border border-white/20 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500/60 shadow-inner cursor-pointer"
                                                >
                                                    <option value="ALL" className="bg-[#161b22] text-white py-1">ALL Courses (General Brochure / Flyer)</option>
                                                    {courses.map(c => (
                                                        <option key={c.id} value={c.id} className="bg-[#161b22] text-white py-1">{c.title}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none stroke-[2.5]" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                Category
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={uploadCategory}
                                                    onChange={(e) => setUploadCategory(e.target.value as MediaItem['category'])}
                                                    className="w-full appearance-none bg-[#0d1117] border border-white/20 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500/60 shadow-inner cursor-pointer"
                                                >
                                                    {mediaCategories.filter(c => c !== 'All Categories').map(c => (
                                                        <option key={c} value={c} className="bg-[#161b22] text-white py-1">{c}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none stroke-[2.5]" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 text-xs font-bold">
                                        <button
                                            onClick={() => setShowUploadModal(false)}
                                            className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveMedia}
                                            disabled={saveSuccessState !== 'idle'}
                                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                        >
                                            {saveSuccessState === 'saving' ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <span>Save to Library</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ════════════════════════════════════════════════════════════════
                    5. HISTORY WORKSPACE
                   ════════════════════════════════════════════════════════════════ */}
                {activeWorkspace === 'history' && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="space-y-5"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by recipient, phone, or material..."
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-2xl py-2.5 pl-11 pr-4 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                />
                            </div>

                            <div className="flex gap-2 flex-wrap">
                                {(['All', 'Bulk', 'Delivered', 'Sent', 'Failed'] as const).map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setHistoryStatusFilter(status)}
                                        className={cn(
                                            "px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5",
                                            historyStatusFilter === status
                                                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md"
                                                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/15"
                                        )}
                                    >
                                        {status === 'Bulk' ? 'Bulk Campaigns' : status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {filteredHistoryLogs.map((log) => (
                                log.isBulkCampaign ? (
                                    <div
                                        key={log.id}
                                        className="bg-gradient-to-r from-[#191d29] via-[#161b22] to-[#191d29] border border-purple-500/35 rounded-2xl p-5 shadow-2xl space-y-3.5 relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 shadow-sm">
                                                        <Users className="w-3 h-3 text-purple-400" />
                                                        <span>Bulk Campaign</span>
                                                    </span>
                                                    {log.csvFileName && (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 border border-purple-500/35 text-purple-300 flex items-center gap-1.5 shadow-sm">
                                                            <FileText className="w-3 h-3 text-purple-400" />
                                                            <span>Source CSV: <strong className="text-white font-mono">{log.csvFileName}</strong></span>
                                                        </span>
                                                    )}
                                                    <h4 className="font-extrabold text-white text-base tracking-tight">
                                                        {log.campaignName || log.recipientName}
                                                    </h4>
                                                    <span className={cn(
                                                        "px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider",
                                                        log.status === 'Delivered' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                    )}>
                                                        ✓ {log.status}
                                                    </span>
                                                </div>

                                                <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 pt-0.5">
                                                    <span className="text-purple-300 font-semibold">{log.courseTitle}</span>
                                                    <span>•</span>
                                                    <span>Sent via {log.channel} Direct API</span>
                                                    <span>•</span>
                                                    <span className="font-mono text-slate-300">{to12HourFormat(log.timestamp)}</span>
                                                </div>
                                            </div>

                                            {/* Campaign Analytics Metrics Pills & Delete Button */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 px-3.5 rounded-xl text-xs font-bold shadow-inner">
                                                    <div className="text-center px-2 border-r border-white/10">
                                                        <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider">Recipients</span>
                                                        <span className="text-white font-black text-sm">{log.totalRecipients || 0}</span>
                                                    </div>
                                                    <div className="text-center px-2 border-r border-white/10">
                                                        <span className="block text-[9px] text-emerald-400 uppercase font-black tracking-wider">Delivered</span>
                                                        <span className="text-emerald-400 font-black text-sm">{log.deliveredCount || 0}</span>
                                                    </div>
                                                    <div className="text-center px-2">
                                                        <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider">Failed</span>
                                                        <span className="text-slate-300 font-black text-sm">{log.failedCount || 0}</span>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteHistoryLog(log.id);
                                                    }}
                                                    className="p-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all shrink-0 cursor-pointer shadow-sm"
                                                    title="Delete campaign log"
                                                >
                                                    <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Campaign Materials Preview */}
                                        <div className="pt-2 border-t border-white/10 relative z-10 flex flex-wrap items-center gap-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Materials Sent:</span>
                                            {log.materials.map((mTitle, idx) => (
                                                <span key={idx} className="px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-200 text-[11px] font-medium flex items-center gap-1 shadow-sm">
                                                    📄 {mTitle}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        key={log.id}
                                        className="bg-[#161b22]/90 border border-white/15 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                                    >
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className="font-extrabold text-white text-sm">
                                                    {log.recipientName || 'Enquiry'} ({log.recipientPhone})
                                                </span>
                                                <span className={cn(
                                                    "px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider",
                                                    log.status === 'Delivered' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                                                    log.status === 'Sent' ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                                                    "bg-red-500/20 text-red-300 border border-red-500/30"
                                                )}>
                                                    {log.status}
                                                </span>
                                            </div>

                                            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                                                <span className="text-primary font-semibold">{log.courseTitle}</span>
                                                <span>•</span>
                                                <span>Sent via {log.channel}</span>
                                                <span>•</span>
                                                <span>{to12HourFormat(log.timestamp)}</span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                {log.materials.map((mTitle, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 rounded-lg bg-white/10 text-slate-200 text-[10px] font-medium">
                                                        📄 {mTitle}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteHistoryLog(log.id);
                                            }}
                                            className="p-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all shrink-0 cursor-pointer shadow-sm self-end md:self-center"
                                            title="Delete log entry"
                                        >
                                            <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                                        </button>
                                    </div>
                                )
                            ))}

                            {filteredHistoryLogs.length === 0 && (
                                <div className="text-center py-12 text-slate-500 text-xs">
                                    No history logs found matching your search.
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

            </div>

            {/* ════════════════════════════════════════════════════════════════
                FULL-SCREEN ANIMATED SEND OVERLAY (CENTERED & BLURRED BACKDROP)
               ════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {sendModalState !== 'idle' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 select-none"
                    >
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                            className="bg-[#161b22] border border-white/20 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-5 relative overflow-hidden"
                        >
                            {/* Ambient background blur circles */}
                            <div className={cn(
                                "absolute -top-16 -left-16 w-48 h-48 rounded-full blur-3xl transition-all duration-700 pointer-events-none",
                                sendModalState === 'sending' ? "bg-primary/40" : "bg-emerald-500/40"
                            )} />
                            <div className={cn(
                                "absolute -bottom-16 -right-16 w-48 h-48 rounded-full blur-3xl transition-all duration-700 pointer-events-none",
                                sendModalState === 'sending' ? "bg-blue-600/30" : "bg-teal-500/30"
                            )} />

                            {sendModalState === 'sending' ? (
                                <div className="space-y-5 py-3 relative z-10">
                                    {/* Animated Sending Spinner Icon */}
                                    <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                                        <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-emerald-400 border-b-transparent border-l-transparent animate-spin" />
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/30 to-emerald-500/20 border border-white/20 flex items-center justify-center text-white shadow-xl shadow-primary/30">
                                            <Send className="w-7 h-7 text-primary animate-pulse" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <h3 className="text-lg font-black text-white tracking-tight">Sending WhatsApp Message...</h3>
                                        <p className="text-xs text-slate-400 font-medium">Connecting to WhatsApp Direct API & preparing materials</p>
                                    </div>

                                    {/* Animated Progress Bar */}
                                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: "0%" }}
                                            animate={{ width: "100%" }}
                                            transition={{ duration: 1.6, ease: "easeInOut" }}
                                            className="bg-gradient-to-r from-primary via-blue-500 to-emerald-400 h-full rounded-full"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="space-y-4 py-3 relative z-10"
                                >
                                    {/* Animated Success Checkmark */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                        className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/40"
                                    >
                                        <Check className="w-10 h-10 stroke-[3]" />
                                    </motion.div>

                                    <div className="space-y-1">
                                        <h3 className="text-lg font-black text-emerald-300 tracking-tight">Message Sent Successfully!</h3>
                                        <p className="text-xs text-slate-300 font-medium">
                                            Dispatched via WhatsApp to <span className="font-bold text-white">+91 {quickPhone}</span>
                                        </p>
                                    </div>

                                    <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-bold inline-block">
                                        ✓ Form Reset & Ready for Next Enquiry
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ════════════════════════════════════════════════════════════════
                CENTERED ANIMATED DELETE CONFIRMATION MODAL (BLURRED BACKDROP)
               ════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {deleteConfirmItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setDeleteConfirmItem(null)}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 select-none"
                    >
                        <motion.div
                            initial={{ scale: 0.88, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.88, opacity: 0, y: 15 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#161b22] border border-white/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 relative overflow-hidden"
                        >
                            {/* Ambient Red Blur Effect */}
                            <div className="absolute -top-16 -left-16 w-40 h-40 rounded-full bg-red-500/25 blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-16 -right-16 w-40 h-40 rounded-full bg-red-600/20 blur-3xl pointer-events-none" />

                            <div className="relative z-10 space-y-3">
                                {/* Trash Icon Avatar */}
                                <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto shadow-lg shadow-red-500/20">
                                    <Trash2 className="w-7 h-7 text-red-400" />
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-lg font-extrabold text-white">Delete Media Item?</h3>
                                    <p className="text-xs text-slate-300 leading-relaxed px-2">
                                        Are you sure you want to delete <span className="font-bold text-white">"{deleteConfirmItem.title}"</span>? This action cannot be undone.
                                    </p>
                                </div>

                                <div className="pt-2 flex items-center gap-3 text-xs font-bold">
                                    <button
                                        type="button"
                                        onClick={() => setDeleteConfirmItem(null)}
                                        className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmDeleteMedia}
                                        className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* ════════════════════════════════════════════════════════════════
                SAVE TO LIBRARY ANIMATED MODAL (CENTERED & BLURRED BACKDROP)
               ════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {saveSuccessState !== 'idle' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 select-none"
                    >
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                            className="bg-[#161b22] border border-white/20 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-5 relative overflow-hidden"
                        >
                            <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-emerald-500/30 blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-teal-500/25 blur-3xl pointer-events-none" />

                            {saveSuccessState === 'saving' ? (
                                <div className="space-y-4 py-2 relative z-10">
                                    <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
                                        <div className="absolute inset-0 rounded-full border-4 border-t-emerald-400 border-r-teal-300 border-b-transparent border-l-transparent animate-spin" />
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                            <Upload className="w-6 h-6 animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-black text-white">Saving to Library...</h3>
                                        <p className="text-xs text-slate-400 font-medium">Adding material item to Media Repository</p>
                                    </div>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="space-y-4 py-2 relative z-10"
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                        className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/40"
                                    >
                                        <Check className="w-10 h-10 stroke-[3]" />
                                    </motion.div>

                                    <div className="space-y-1">
                                        <h3 className="text-lg font-black text-emerald-300 tracking-tight">Saved to Library!</h3>
                                        <p className="text-xs text-slate-200 font-medium px-2">
                                            <span className="font-bold text-white">"{uploadTitle || 'Material Item'}"</span> has been added successfully.
                                        </p>
                                    </div>

                                    <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-400 font-extrabold inline-block">
                                        ✓ Ready in Media Repository
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ════════════════════════════════════════════════════════════════
                REAL-TIME BULK CAMPAIGN PROGRESS & INSIGHTS MODAL
               ════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {bulkCampaignState !== 'idle' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 select-none"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                            className="bg-[#161b22] border border-white/20 rounded-3xl p-6 lg:p-8 max-w-xl w-full shadow-2xl space-y-6 relative overflow-hidden"
                        >
                            {/* Ambient background glow */}
                            <div className={cn(
                                "absolute -top-20 -left-20 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-all duration-700",
                                bulkCampaignState === 'running' ? "bg-purple-500/25" : "bg-emerald-500/30"
                            )} />
                            <div className={cn(
                                "absolute -bottom-20 -right-20 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-all duration-700",
                                bulkCampaignState === 'running' ? "bg-blue-500/20" : "bg-teal-500/25"
                            )} />

                            {/* Header Row */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
                                <div>
                                    <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                                        {bulkCampaignState === 'running' ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
                                                <span>Live Campaign Dispatching...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-6 h-6 text-emerald-400 stroke-[2.5]" />
                                                <span className="text-emerald-300">Campaign Completed Successfully!</span>
                                            </>
                                        )}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {bulkCampaignState === 'running'
                                            ? `Broadcasting materials to ${campaignStats.total} contacts via WhatsApp Direct`
                                            : `All ${campaignStats.delivered} recipients received campaign materials successfully`
                                        }
                                    </p>
                                </div>
                                {bulkCampaignState === 'completed' && (
                                    <button
                                        onClick={handleCloseBulkCampaign}
                                        className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            {/* Progress Bar & Speed Stats */}
                            <div className="space-y-2 relative z-10">
                                <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-slate-300 flex items-center gap-2">
                                        <span>Dispatch Progress</span>
                                        <span className="text-purple-400 font-mono text-[11px]">
                                            ({campaignStats.delivered} / {campaignStats.total})
                                        </span>
                                    </span>
                                    <span className="text-emerald-400 font-extrabold font-mono text-sm">
                                        {Math.round((campaignStats.delivered / Math.max(1, campaignStats.total)) * 100)}%
                                    </span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 rounded-full shadow-lg"
                                        animate={{ width: `${(campaignStats.delivered / Math.max(1, campaignStats.total)) * 100}%` }}
                                        transition={{ duration: 0.3, ease: 'easeOut' }}
                                    />
                                </div>
                            </div>

                            {/* Real-Time Recipient Feed List */}
                            <div className="space-y-2 relative z-10">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <span>Real-Time Recipient Status</span>
                                    <span className="flex items-center gap-1 text-emerald-400">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        WhatsApp Live Stream
                                    </span>
                                </div>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {campaignRecipients.map((rec, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "p-3 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all duration-300",
                                                rec.status === 'delivered'
                                                    ? "bg-emerald-500/15 border-emerald-500/35 text-white shadow-md shadow-emerald-500/10"
                                                    : rec.status === 'sending'
                                                    ? "bg-purple-500/20 border-purple-500/40 text-purple-200 animate-pulse"
                                                    : "bg-white/5 border-white/10 text-slate-400"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0",
                                                    rec.status === 'delivered' ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/40" : "bg-white/10 text-slate-400"
                                                )}>
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <span className="font-mono text-white text-sm block">
                                                        +91 {rec.phone}
                                                    </span>
                                                    {rec.name && (
                                                        <span className="text-[11px] text-slate-400 block font-normal">
                                                            {rec.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                {rec.status === 'delivered' ? (
                                                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-black flex items-center gap-1 shadow-sm">
                                                        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                                        <span>Delivered</span>
                                                    </span>
                                                ) : rec.status === 'sending' ? (
                                                    <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-black flex items-center gap-1.5">
                                                        <RefreshCw className="w-3 h-3 animate-spin text-purple-400" />
                                                        <span>Sending...</span>
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-xl bg-white/5 text-slate-500 text-[11px] font-bold">
                                                        Queued
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Campaign Analytics Insights Summary (Rendered on completion) */}
                            {bulkCampaignState === 'completed' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-2xl bg-white/5 border border-white/15 space-y-3 relative z-10"
                                >
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-emerald-400" />
                                        <span>Campaign Dispatch Analytics & Insights</span>
                                    </h4>

                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <span className="text-lg font-black text-emerald-400 block">{campaignStats.delivered} / {campaignStats.total}</span>
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">100% Success</span>
                                        </div>
                                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                            <span className="text-lg font-black text-blue-400 block">{campaignStats.durationSec}s</span>
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Total Time</span>
                                        </div>
                                        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                            <span className="text-lg font-black text-purple-300 block">{selectedBulkMaterialObjects.length}</span>
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Materials Sent</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Action Button */}
                            {bulkCampaignState === 'completed' && (
                                <div className="pt-2 relative z-10">
                                    <button
                                        onClick={handleCloseBulkCampaign}
                                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                                        <span>Done & Reset Bulk Workspace</span>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}

                {/* Scheduling Modal */}
                {showScheduleModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="bg-[#161b22] border border-white/20 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-purple-400" />
                                    <span>Schedule Campaign Launch</span>
                                </h3>
                                <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Schedule Type:</label>
                                    <div className="relative">
                                        <select
                                            value={scheduleSettings.type}
                                            onChange={(e) => setScheduleSettings(prev => ({ ...prev, type: e.target.value as any }))}
                                            className="w-full bg-[#0d1117] border border-white/20 rounded-xl pl-3.5 pr-10 py-2.5 text-white font-semibold appearance-none focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                                        >
                                            <option value="one_time">One-Time Launch</option>
                                            <option value="recurring">Recurring Schedule</option>
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-slate-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>

                                {scheduleSettings.type === 'recurring' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Recurring Frequency:</label>
                                        <div className="relative">
                                            <select
                                                value={scheduleSettings.recurringPattern}
                                                onChange={(e) => setScheduleSettings(prev => ({ ...prev, recurringPattern: e.target.value as any }))}
                                                className="w-full bg-[#0d1117] border border-white/20 rounded-xl pl-3.5 pr-10 py-2.5 text-white font-semibold appearance-none focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                                            >
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-slate-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Date:</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={scheduleSettings.scheduledDate}
                                                onChange={(e) => setScheduleSettings(prev => ({ ...prev, scheduledDate: e.target.value }))}
                                                className="w-full bg-[#0d1117] border border-white/20 rounded-xl pl-3.5 pr-10 py-2.5 text-white font-mono scheme-dark cursor-pointer focus:outline-none focus:border-purple-500 transition-colors"
                                            />
                                            <Calendar className="w-4 h-4 text-white absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Time:</label>
                                        <div className="relative">
                                            <input
                                                type="time"
                                                value={scheduleSettings.scheduledTime}
                                                onChange={(e) => setScheduleSettings(prev => ({ ...prev, scheduledTime: e.target.value }))}
                                                className="w-full bg-[#0d1117] border border-white/20 rounded-xl pl-3.5 pr-10 py-2.5 text-white font-mono scheme-dark cursor-pointer focus:outline-none focus:border-purple-500 transition-colors"
                                            />
                                            <Clock className="w-4 h-4 text-white absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Timezone:</label>
                                    <div className="relative">
                                        <select
                                            value={scheduleSettings.timezone}
                                            onChange={(e) => setScheduleSettings(prev => ({ ...prev, timezone: e.target.value }))}
                                            className="w-full bg-[#0d1117] border border-white/20 rounded-xl pl-3.5 pr-10 py-2.5 text-white font-semibold appearance-none focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                                        >
                                            <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST +5:30)</option>
                                            <option value="UTC">UTC (GMT +0:00)</option>
                                            <option value="America/New_York (EST)">America/New_York (EST -5:00)</option>
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-slate-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
                                {campaignStatus === 'Scheduled' ? (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await handleUnscheduleCampaign();
                                            setShowScheduleModal(false);
                                        }}
                                        className="py-2.5 px-3.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 font-bold text-xs border border-red-500/30 transition-colors cursor-pointer"
                                    >
                                        Remove Schedule
                                    </button>
                                ) : <div />}
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowScheduleModal(false)}
                                        className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!scheduleSettings.scheduledDate || !scheduleSettings.scheduledTime}
                                        onClick={() => handleSaveSchedule(scheduleSettings)}
                                        className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                                    >
                                        {campaignStatus === 'Scheduled' ? 'Update Schedule' : 'Confirm Schedule'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Override Schedule Confirmation Modal */}
                {showOverrideScheduleModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="bg-[#161b22] border border-blue-500/40 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-white">Launch Scheduled Campaign Now?</h3>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        This campaign is currently scheduled for <strong className="text-white">{scheduleSettings.scheduledDate}</strong> at <strong className="text-white">{scheduleSettings.scheduledTime}</strong> ({scheduleSettings.timezone}).
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
                                ⚠️ Launching now will immediately open the preview window and dispatch messages, overriding the saved schedule.
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowOverrideScheduleModal(false)}
                                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
                                >
                                    Keep Schedule
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowOverrideScheduleModal(false);
                                        setShowBulkPreview(true);
                                    }}
                                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                                >
                                    Override & Launch Now
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Floating Schedule Notification Toast */}
                <AnimatePresence>
                    {scheduleNotification && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="fixed top-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-gradient-to-r from-purple-900/95 via-blue-900/95 to-slate-900/95 border border-purple-500/50 text-white shadow-2xl backdrop-blur-xl flex items-center gap-3"
                        >
                            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="flex-1 text-xs font-semibold">
                                {scheduleNotification}
                            </div>
                            <button onClick={() => setScheduleNotification(null)} className="text-white/60 hover:text-white p-1 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Soft Delete Confirmation Modal */}
                {showDeleteConfirmCampaign && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="bg-[#161b22] border border-red-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-red-500/20 text-red-400">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-white">Soft Delete Campaign?</h3>
                                    <p className="text-xs text-slate-400">Campaign will be hidden from view. It remains recoverable in database audit logs.</p>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-purple-300">
                                {showDeleteConfirmCampaign.campaignName}
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirmCampaign(null)}
                                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await campaignService.deleteCampaign(showDeleteConfirmCampaign.id);
                                        setShowDeleteConfirmCampaign(null);
                                    }}
                                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-lg shadow-red-600/30"
                                >
                                    Delete Campaign
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Archive Confirmation Modal */}
                {showArchiveConfirmCampaign && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="bg-[#161b22] border border-amber-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
                                    <Archive className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-white">
                                        {showArchiveConfirmCampaign.isArchived ? 'Unarchive Campaign?' : 'Archive Campaign?'}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        {showArchiveConfirmCampaign.isArchived
                                            ? 'Restores campaign to active campaign list.'
                                            : 'Moves campaign to archived records.'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-amber-300">
                                {showArchiveConfirmCampaign.campaignName}
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowArchiveConfirmCampaign(null)}
                                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await campaignService.archiveCampaign(showArchiveConfirmCampaign.id);
                                        setShowArchiveConfirmCampaign(null);
                                    }}
                                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-lg shadow-amber-600/30"
                                >
                                    {showArchiveConfirmCampaign.isArchived ? 'Confirm Unarchive' : 'Confirm Archive'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Duplicate Dispatch Warning Modal */}
                {showDuplicateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="bg-[#161b22] border border-amber-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-white">Duplicate Dispatch Detected</h3>
                                    <p className="text-xs text-slate-400">An identical WhatsApp message was sent to this contact within the last 10 seconds.</p>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-300">
                                Recipient: {showDuplicateModal.phone}
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDuplicateModal(null)}
                                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => showDuplicateModal.onConfirm()}
                                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
                                >
                                    Send Anyway
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Production Toast Notifications System */}
            <ToastNotification
                toast={activeToast}
                onClose={() => setActiveToast(null)}
                onRetry={handleRetryDispatch}
                isRetrying={isRetryingDispatch}
            />
        </div>
    );
}

export default Share;
