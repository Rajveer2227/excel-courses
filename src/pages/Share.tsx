import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Users, FolderOpen, History,
    ArrowLeft, Search, CheckCircle2,
    Plus, Trash2, FileText, Image as ImageIcon,
    Video, FileCheck, Check, Upload,
    X, RefreshCw, ChevronDown, ChevronUp, Sparkles, Calendar, Copy, RotateCcw, ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { courses } from '../data/courses';
import { mediaCategories } from '../data/shareData';
import type { MediaItem, ShareLog, RecentContact } from '../data/shareData';
import { shareService } from '../services/shareService';

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

    // Smart Workspace Context Detection
    const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType>(() => {
        const paramCourseId = searchParams.get('courseId');
        return (paramCourseId && courses.some(c => c.id === paramCourseId)) ? 'quick' : 'hub';
    });

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

    // Bulk Share State
    const [bulkInputText, setBulkInputText] = useState('');
    const [bulkSelectedMaterials, setBulkSelectedMaterials] = useState<string[]>([]);
    const [showBulkPreview, setShowBulkPreview] = useState(false);
    const [isCsvCopied, setIsCsvCopied] = useState(false);
    const [uploadedCsvFileName, setUploadedCsvFileName] = useState('');
    const [bulkCampaignName, setBulkCampaignName] = useState('');
    const [bulkMaterialSearch, setBulkMaterialSearch] = useState('');
    const [bulkMaterialCategory, setBulkMaterialCategory] = useState<string>('All Categories');
    const [dispatchDelaySec, setDispatchDelaySec] = useState<number>(1); // 1, 5, or 10 sec anti-ban delay

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

    const handleSendQuickShare = async () => {
        const cleanPhone = quickPhone.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            alert('Please enter a valid 10-digit Indian WhatsApp mobile number.');
            return;
        }
        if (selectedMaterialIds.length === 0) {
            alert('Please select at least one material to share.');
            return;
        }

        // 1. Trigger Full-Screen Sending Animation Modal
        setSendModalState('sending');
        setIsSendingQuick(true);

        const selectedCourses = courses.filter(c => selectedCourseIds.includes(c.id));
        const courseTitlesText = selectedCourses.map(c => c.title).join(', ') || 'General Enquiry';
        const selectedMaterialTitles = mediaItems
            .filter(m => selectedMaterialIds.includes(m.id))
            .map(m => m.title);

        // Realistic API sending animation delay
        await new Promise(r => setTimeout(r, 1600));

        const res = await shareService.recordShareEvent({
            phone: quickPhone,
            name: quickRecipientName || undefined,
            courseId: selectedCourseIds[0] || 'GENERAL',
            courseTitle: courseTitlesText,
            materials: selectedMaterialTitles
        });

        setIsSendingQuick(false);

        if (res.success) {
            // 2. Trigger Success Animation State
            setSendModalState('success');
            setHistoryLogs(shareService.getHistoryLogs());
            setRecentContacts(shareService.getRecentContacts());

            // 3. Display success screen for 1.8 seconds, then close and RESET ALL DETAILS
            await new Promise(r => setTimeout(r, 1800));
            setSendModalState('idle');

            // Complete Reset of Form & Selection State
            setQuickPhone('');
            setQuickRecipientName('');
            setSelectedCourseIds([]);
            setSelectedMaterialIds([]);
            setCourseSearchQuery('');
            setAllMaterialsSearch('');
            courseListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            allMaterialsListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            setSendModalState('idle');
            alert('Failed to dispatch message. Please check connection.');
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
            setCampaignRecipients(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'delivered' } : item));
            setCampaignStats(prev => ({ ...prev, delivered: prev.delivered + 1 }));
        }

        const endTime = Date.now();
        const durationSec = Math.max(0.8, Math.round((endTime - startTime) / 100) / 10);
        setCampaignStats(prev => ({ ...prev, endTime, durationSec }));
        setBulkCampaignState('completed');

        // Log dedicated Bulk Campaign summary with Analytics into History Log
        shareService.addBulkCampaignLog({
            campaignName: bulkCampaignName.trim(),
            materials: selectedMaterialTitles,
            totalRecipients: initialList.length,
            deliveredCount: initialList.length,
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

    const handleDeleteHistoryLog = (id: string) => {
        const updated = shareService.deleteHistoryLog(id);
        setHistoryLogs([...updated]);
    };

    // Media Library Handlers
    const handleSimulatedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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
            alert('Please enter a title for the media item.');
            return;
        }

        setSaveSuccessState('saving');
        await new Promise(res => setTimeout(res, 500));

        await shareService.addMediaItem({
            title: uploadTitle,
            fileType: uploadFileType,
            courseIds: uploadCourseId === 'ALL' ? ['ALL'] : [uploadCourseId],
            category: uploadCategory,
            fileSize: '1.5 MB',
            isFavorite: false
        });

        setMediaItems(shareService.getAllMedia());
        setSaveSuccessState('saved');

        setTimeout(() => {
            setSaveSuccessState('idle');
            setShowUploadModal(false);
            setUploadTitle('');
            setUploadFileName('');
        }, 1400);
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

                                    {/* Optional Name Input */}
                                    <input
                                        type="text"
                                        placeholder="Student / Parent Name (Optional)"
                                        value={quickRecipientName}
                                        onChange={(e) => setQuickRecipientName(e.target.value)}
                                        className="w-full bg-[#0d1117] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-white/30"
                                    />
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
                                    onClick={handleSendQuickShare}
                                    disabled={isSendingQuick || quickPhone.replace(/\D/g, '').length !== 10 || selectedMaterialIds.length === 0}
                                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary-dark hover:to-blue-700 text-white font-extrabold text-sm shadow-xl shadow-primary/30 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
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
                    3. BULK SHARE WORKSPACE
                   ════════════════════════════════════════════════════════════════ */}
                {activeWorkspace === 'bulk' && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="bg-[#161b22] border border-white/20 rounded-3xl p-6 lg:p-8 shadow-2xl max-w-4xl mx-auto space-y-6"
                    >
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">Bulk Mobile Dispatch</h3>
                                <p className="text-xs text-slate-400">Paste numbers or upload a CSV list of prospective students</p>
                            </div>
                            <Users className="w-7 h-7 text-purple-400" />
                        </div>

                        {/* Mandatory Campaign Name Input Field */}
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                    <span>Campaign Name <span className="text-amber-400">*</span></span>
                                </div>
                                <span className={cn(
                                    "text-[11px] font-bold lowercase tracking-normal font-sans px-2.5 py-0.5 rounded-full border",
                                    bulkCampaignName.trim()
                                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                        : "bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse"
                                )}>
                                    {bulkCampaignName.trim() ? '✓ Campaign Named' : '⚠️ Required to start dispatch'}
                                </span>
                            </label>
                            <input
                                type="text"
                                value={bulkCampaignName}
                                onChange={(e) => setBulkCampaignName(e.target.value)}
                                placeholder="e.g. Full Stack Python July 2026 Admission Drive"
                                className="w-full bg-[#0d1117] border border-white/20 focus:border-purple-500/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 font-semibold focus:outline-none transition-all shadow-inner"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-300">
                                    Paste Mobile Numbers or Upload CSV
                                </label>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Uploaded CSV File Name Badge */}
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

                                    {/* Upload CSV Button */}
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

                                    {/* Copy CSV Format Button */}
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

                                    {/* Reset Button */}
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

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                        <span className="text-xl font-black text-emerald-400 block">{parsedBulkContacts.valid.length}</span>
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Valid</span>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center relative group">
                                        <span className="text-xl font-black text-amber-400 block">{parsedBulkContacts.duplicate.length}</span>
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Duplicates</span>
                                        {parsedBulkContacts.duplicate.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleDeduplicateBulkText}
                                                className="mt-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold transition-all shadow-sm inline-flex items-center gap-1"
                                                title="Click to remove duplicate numbers"
                                            >
                                                <Trash2 className="w-3 h-3 text-amber-400" />
                                                <span>Clean</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                                        <span className="text-xl font-black text-red-400 block">{parsedBulkContacts.invalid.length}</span>
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Invalid</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-300">
                                    Select Materials for Campaign
                                </label>

                                {/* Search Bar & Category Filter */}
                                <div className="flex items-center gap-2">
                                    {/* Search Input with Red X */}
                                    <div className="relative flex-1 sm:w-52">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder="Search materials..."
                                            value={bulkMaterialSearch}
                                            onChange={(e) => setBulkMaterialSearch(e.target.value)}
                                            className="w-full bg-white/10 border border-white/20 rounded-xl py-1.5 pl-8 pr-7 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                        />
                                        {bulkMaterialSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setBulkMaterialSearch('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all flex items-center justify-center"
                                                title="Clear search"
                                            >
                                                <X className="w-3.5 h-3.5 text-red-400 stroke-[2.5]" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Category Dropdown */}
                                    <div className="relative shrink-0">
                                        <select
                                            value={bulkMaterialCategory}
                                            onChange={(e) => setBulkMaterialCategory(e.target.value)}
                                            className="appearance-none bg-[#0d1117] border border-white/20 rounded-xl pl-3 pr-8 py-1.5 text-white text-xs font-bold focus:outline-none focus:border-purple-500/60 shadow-xl cursor-pointer hover:border-white/40 transition-colors"
                                        >
                                            {mediaCategories.map(cat => (
                                                <option key={cat} value={cat} className="bg-[#161b22] text-white py-1">{cat}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none stroke-[2.5]" />
                                    </div>
                                </div>
                            </div>

                            {/* Campaign Materials Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                                {filteredBulkMaterials.map((item) => {
                                    const isSelected = bulkSelectedMaterials.includes(item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => {
                                                setBulkSelectedMaterials(prev =>
                                                    prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]
                                                );
                                            }}
                                            className={cn(
                                                "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs font-bold",
                                                isSelected
                                                    ? "bg-purple-600 text-white border-purple-500 shadow-lg"
                                                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                {renderFileTypeIcon(item.fileType)}
                                                <span className="truncate">{item.title}</span>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 shrink-0" />}
                                        </div>
                                    );
                                })}

                                {filteredBulkMaterials.length === 0 && (
                                    <div className="col-span-2 text-center py-6 text-slate-400 text-xs font-medium">
                                        No materials found matching your search.
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                if (!bulkCampaignName.trim()) {
                                    alert('Please enter a Campaign Name before starting dispatch.');
                                    return;
                                }
                                setShowBulkPreview(true);
                            }}
                            disabled={!bulkCampaignName.trim() || parsedBulkContacts.valid.length === 0 || bulkSelectedMaterials.length === 0}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-base shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Preview Campaign ({parsedBulkContacts.valid.length} Recipients)
                        </button>

                        {showBulkPreview && (
                            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                                <div className="bg-[#161b22] border border-white/20 rounded-3xl p-6 max-w-lg w-full space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-white">Campaign Dispatch Preview</h3>
                                        <button onClick={() => setShowBulkPreview(false)} className="text-slate-400 hover:text-white">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="space-y-3 text-xs text-slate-300">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3.5">
                                            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                                                <span className="text-slate-400 font-medium">Valid Contact Count:</span>
                                                <span className="font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg text-xs">
                                                    {parsedBulkContacts.valid.length} Recipients
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-slate-400 font-bold block mb-2 text-[11px] uppercase tracking-wider">
                                                    Selected Campaign Materials ({selectedBulkMaterialObjects.length}):
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

                                            {/* WhatsApp Anti-Ban Dispatch Delay Control */}
                                            <div className="border-t border-white/10 pt-3 space-y-2">
                                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5 text-white">
                                                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                                        <span>WhatsApp Anti-Ban Message Delay:</span>
                                                    </span>
                                                    <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
                                                        Safe Protection Mode
                                                    </span>
                                                </label>

                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { sec: 1, label: '1 Sec', badge: 'Fast Dispatch' },
                                                        { sec: 5, label: '5 Sec', badge: 'Recommended' },
                                                        { sec: 10, label: '10 Sec', badge: 'Max Protection' }
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.sec}
                                                            type="button"
                                                            onClick={() => setDispatchDelaySec(opt.sec)}
                                                            className={cn(
                                                                "p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all text-xs font-bold gap-0.5 cursor-pointer",
                                                                dispatchDelaySec === opt.sec
                                                                    ? "bg-purple-600/30 border-purple-500 text-white shadow-lg shadow-purple-500/20"
                                                                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                                                            )}
                                                        >
                                                            <span className="text-sm font-extrabold">{opt.label}</span>
                                                            <span className={cn(
                                                                "text-[9px] px-1.5 py-0.2 rounded-full font-bold",
                                                                dispatchDelaySec === opt.sec ? "bg-purple-500 text-white" : "bg-white/10 text-slate-400"
                                                            )}>
                                                                {opt.badge}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between pt-1">
                                                    <span>Est. Duration: <strong className="text-purple-300 font-mono text-[11px]">~{Math.round(parsedBulkContacts.valid.length * dispatchDelaySec)}s</strong></span>
                                                    <span className="text-emerald-400 font-semibold">✓ Prevents WhatsApp spam bans</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px]">
                                                <span className="text-slate-400 font-medium">Dispatch Channel:</span>
                                                <span className="font-extrabold text-blue-400 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                    WhatsApp Direct API
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 text-xs font-bold">
                                        <button
                                            onClick={() => setShowBulkPreview(false)}
                                            className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSendBulkShare}
                                            className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
                                        >
                                            <Send className="w-4 h-4" />
                                            <span>Confirm & Dispatch</span>
                                        </button>
                                    </div>
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
            </AnimatePresence>
        </div>
    );
}

export default Share;
