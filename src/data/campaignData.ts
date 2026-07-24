export type CampaignStatus =
  | 'Draft'
  | 'Ready'
  | 'Scheduled'
  | 'Running'
  | 'Paused'
  | 'Completed'
  | 'Cancelled'
  | 'Failed'
  | 'Archived';

export interface DeliverySettings {
  delayMode: '1' | '5' | '10' | 'random';
  delaySeconds: number;
  randomDelayMin: number;
  randomDelayMax: number;
  batchSize: number;
  batchPauseSeconds: number;
  retryFailed: boolean;
  maxRetries: number;
  stopAfterErrors: number;
  businessHoursOnly: boolean;
  businessStart: string;
  businessEnd: string;
  skipWeekends: boolean;
  skipPublicHolidays: boolean;
  timezone: string;
}

export interface ScheduleSettings {
  type: 'one_time' | 'recurring';
  recurringPattern: 'none' | 'daily' | 'weekly' | 'monthly';
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  scheduledAt?: string;
}

export interface RecipientStats {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  skippedCount: number;
  deliveredCount: number;
  failedCount: number;
}

export interface CampaignRecipient {
  id?: string;
  phone: string;
  name?: string;
  status: 'valid' | 'invalid' | 'duplicate' | 'Pending' | 'Queued' | 'Sending' | 'Sent' | 'Delivered' | 'Read' | 'Failed' | 'Skipped' | 'Cancelled';
  failureReason?: string;
  attemptCount?: number;
}

export interface Campaign {
  id: string;
  campaignName: string;
  status: CampaignStatus;
  notes?: string;
  tags: string[];
  isArchived: boolean;
  isDeleted: boolean;
  rawContactsText: string;
  csvFileName?: string;
  parsedContacts: CampaignRecipient[];
  materialIds: string[];
  materialTitles: string[];
  createdBy: string;
  deliverySettings: DeliverySettings;
  scheduleSettings: ScheduleSettings;
  recipientStats: RecipientStats;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  completedAt?: string;
}

export interface CampaignDashboardStats {
  totalCampaigns: number;
  draft: number;
  scheduled: number;
  completed: number;
  archived: number;
  totalRecipients: number;
}

export const defaultDeliverySettings: DeliverySettings = {
  delayMode: '1',
  delaySeconds: 1,
  randomDelayMin: 1,
  randomDelayMax: 5,
  batchSize: 50,
  batchPauseSeconds: 300,
  retryFailed: true,
  maxRetries: 3,
  stopAfterErrors: 5,
  businessHoursOnly: false,
  businessStart: '09:00',
  businessEnd: '18:00',
  skipWeekends: false,
  skipPublicHolidays: false,
  timezone: 'Asia/Kolkata (IST)'
};

export const defaultScheduleSettings: ScheduleSettings = {
  type: 'one_time',
  recurringPattern: 'none',
  scheduledDate: '',
  scheduledTime: '',
  timezone: 'Asia/Kolkata (IST)'
};

export const availablePresetTags = [
  'Admissions',
  'Python',
  'July Batch',
  'Promotion',
  'Festival Offer',
  'High Priority',
  'Webinar Enquiries',
  'Follow-Up'
];
