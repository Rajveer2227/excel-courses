export interface MediaItem {
    id: string;
    title: string;
    fileType: 'pdf' | 'image' | 'video' | 'doc';
    courseIds: string[]; // e.g. ['c-programming'] or ['ALL']
    category: 'Syllabus' | 'Flyer' | 'Brochure' | 'General';
    fileSize: string;
    uploadDate: string;
    isFavorite: boolean;
    previewUrl?: string;
}

export interface ShareLog {
    id: string;
    recipientPhone: string;
    recipientName?: string;
    courseId: string;
    courseTitle: string;
    materials: string[];
    timestamp: string;
    status: 'Delivered' | 'Sent' | 'Failed';
    channel: 'WhatsApp';
    isBulkCampaign?: boolean;
    isBulkRecipient?: boolean;
    campaignName?: string;
    csvFileName?: string;
    totalRecipients?: number;
    deliveredCount?: number;
    failedCount?: number;
}

export interface RecentContact {
    phone: string;
    name?: string;
    lastCourseTitle?: string;
    lastSentDate: string;
}

export const mediaCategories = [
    'All Categories',
    'Syllabus',
    'Flyer',
    'Brochure',
    'General'
] as const;

export const initialMediaItems: MediaItem[] = [
    {
        id: 'media-1',
        title: 'C Programming Complete Syllabus',
        fileType: 'pdf',
        courseIds: ['c-programming'],
        category: 'Syllabus',
        fileSize: '1.4 MB',
        uploadDate: '2026-07-15',
        isFavorite: true,
    },
    {
        id: 'media-2',
        title: 'Full Stack Python Course Overview & Curriculum',
        fileType: 'pdf',
        courseIds: ['full-stack-python'],
        category: 'Syllabus',
        fileSize: '2.8 MB',
        uploadDate: '2026-07-18',
        isFavorite: true,
    },
    {
        id: 'media-3',
        title: 'Excel Computers General Admission Brochure 2026',
        fileType: 'pdf',
        courseIds: ['ALL'],
        category: 'Brochure',
        fileSize: '4.5 MB',
        uploadDate: '2026-07-01',
        isFavorite: true,
    },
    {
        id: 'media-4',
        title: 'Data Analytics & Power BI Course Syllabus',
        fileType: 'pdf',
        courseIds: ['data-analytics-powerbi'],
        category: 'Syllabus',
        fileSize: '2.1 MB',
        uploadDate: '2026-07-10',
        isFavorite: false,
    },
    {
        id: 'media-5',
        title: 'C++ Programming Fast-Track Flyer',
        fileType: 'image',
        courseIds: ['cpp-programming'],
        category: 'Flyer',
        fileSize: '850 KB',
        uploadDate: '2026-07-12',
        isFavorite: false,
    },
    {
        id: 'media-6',
        title: 'Full Stack Web Development (MERN) Syllabus',
        fileType: 'pdf',
        courseIds: ['full-stack-web-development-mern'],
        category: 'Syllabus',
        fileSize: '3.1 MB',
        uploadDate: '2026-07-05',
        isFavorite: false,
    },
    {
        id: 'media-7',
        title: 'AI & Machine Learning Internship Special Flyer',
        fileType: 'image',
        courseIds: ['ai-machine-learning'],
        category: 'Flyer',
        fileSize: '1.1 MB',
        uploadDate: '2026-07-19',
        isFavorite: true,
    },
    {
        id: 'media-8',
        title: 'Tally Prime + GST Accounting Fee Structure & Offer',
        fileType: 'pdf',
        courseIds: ['tally-prime-gst'],
        category: 'Brochure',
        fileSize: '920 KB',
        uploadDate: '2026-07-14',
        isFavorite: false,
    },
    {
        id: 'media-9',
        title: 'Excel Computers Institute Classroom Tour Video',
        fileType: 'video',
        courseIds: ['ALL'],
        category: 'General',
        fileSize: '12.4 MB',
        uploadDate: '2026-06-20',
        isFavorite: false,
    }
];

export const initialShareLogs: ShareLog[] = [
    {
        id: 'log-101',
        recipientPhone: '+91 98230 45678',
        recipientName: 'Rohan Patil',
        courseId: 'full-stack-python',
        courseTitle: 'Full Stack Python',
        materials: ['Full Stack Python Course Overview & Curriculum', 'Excel Computers General Admission Brochure 2026'],
        timestamp: '2026-07-22 01:45 PM',
        status: 'Delivered',
        channel: 'WhatsApp'
    },
    {
        id: 'log-102',
        recipientPhone: '+91 94224 11223',
        recipientName: 'Sneha Deshmukh',
        courseId: 'c-programming',
        courseTitle: 'C Programming',
        materials: ['C Programming Complete Syllabus'],
        timestamp: '2026-07-22 12:10 PM',
        status: 'Delivered',
        channel: 'WhatsApp'
    },
    {
        id: 'log-103',
        recipientPhone: '+91 98900 88776',
        recipientName: 'Amit Shinde',
        courseId: 'data-analytics-powerbi',
        courseTitle: 'Data Analytics & Power BI',
        materials: ['Data Analytics & Power BI Course Syllabus'],
        timestamp: '2026-07-21 04:30 PM',
        status: 'Sent',
        channel: 'WhatsApp'
    },
    {
        id: 'log-104',
        recipientPhone: '+91 91580 33445',
        recipientName: 'Pooja Kulkarni',
        courseId: 'tally-prime-gst',
        courseTitle: 'Tally Prime with GST',
        materials: ['Tally Prime + GST Accounting Fee Structure & Offer'],
        timestamp: '2026-07-21 11:15 AM',
        status: 'Delivered',
        channel: 'WhatsApp'
    }
];

export const initialRecentContacts: RecentContact[] = [
    { phone: '+91 98230 45678', name: 'Rohan Patil', lastCourseTitle: 'Full Stack Python', lastSentDate: 'Today 13:45' },
    { phone: '+91 94224 11223', name: 'Sneha Deshmukh', lastCourseTitle: 'C Programming', lastSentDate: 'Today 12:10' },
    { phone: '+91 98900 88776', name: 'Amit Shinde', lastCourseTitle: 'Data Analytics & Power BI', lastSentDate: 'Yesterday 16:30' },
];
