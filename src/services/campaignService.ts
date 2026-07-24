import type { Campaign, CampaignDashboardStats } from '../data/campaignData';

class CampaignService {
  private campaigns: Campaign[] = [];
  private stats: CampaignDashboardStats = {
    totalCampaigns: 0,
    draft: 0,
    scheduled: 0,
    completed: 0,
    archived: 0,
    totalRecipients: 0
  };

  private listeners: Set<(campaigns: Campaign[]) => void> = new Set();
  private statsListeners: Set<(stats: CampaignDashboardStats) => void> = new Set();
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.fetchCampaignsFromApi();
    this.fetchStatsFromApi();
  }

  public subscribe(listener: (campaigns: Campaign[]) => void): () => void {
    this.listeners.add(listener);
    // Notify immediately with current in-memory cache
    listener([...this.campaigns]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeStats(listener: (stats: CampaignDashboardStats) => void): () => void {
    this.statsListeners.add(listener);
    listener({ ...this.stats });
    return () => {
      this.statsListeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.campaigns]));
  }

  private notifyStatsListeners() {
    this.statsListeners.forEach(listener => listener({ ...this.stats }));
  }

  public getCampaigns(): Campaign[] {
    return [...this.campaigns];
  }

  public getStats(): CampaignDashboardStats {
    return { ...this.stats };
  }

  public async fetchCampaignsFromApi(options?: {
    search?: string;
    status?: string;
    tag?: string;
    isArchived?: boolean;
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<{ campaigns: Campaign[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
      const params = new URLSearchParams();
      if (options?.search) params.set('search', options.search);
      if (options?.status && options.status !== 'All') params.set('status', options.status);
      if (options?.tag && options.tag !== 'All') params.set('tag', options.tag);
      if (options?.isArchived !== undefined) params.set('isArchived', String(options.isArchived));
      if (options?.page) params.set('page', String(options.page));
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.sort) params.set('sort', options.sort);

      const res = await fetch(`/api/campaigns?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          this.campaigns = json.data;
          this.notifyListeners();
          return {
            campaigns: json.data,
            pagination: json.pagination || { page: 1, limit: 10, total: json.data.length, totalPages: 1 }
          };
        }
      }
    } catch (e) {
      console.warn('Failed to fetch campaigns from API:', e);
    }
    return {
      campaigns: [...this.campaigns],
      pagination: { page: 1, limit: 10, total: this.campaigns.length, totalPages: 1 }
    };
  }

  public async fetchStatsFromApi(): Promise<CampaignDashboardStats> {
    try {
      const res = await fetch('/api/campaigns/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          this.stats = json.data;
          this.notifyStatsListeners();
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch campaign stats from API:', e);
    }
    return { ...this.stats };
  }

  public async getCampaignById(id: string): Promise<Campaign | null> {
    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch campaign ${id} from API:`, e);
    }

    return this.campaigns.find(c => c.id === id) || null;
  }

  public async createOrSaveCampaign(campaignData: Partial<Campaign>): Promise<Campaign | null> {
    try {
      const isUpdate = Boolean(campaignData.id);
      const url = isUpdate ? `/api/campaigns/${encodeURIComponent(campaignData.id!)}` : '/api/campaigns';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const saved: Campaign = json.data;
          if (isUpdate) {
            this.campaigns = this.campaigns.map(c => c.id === saved.id ? saved : c);
          } else {
            this.campaigns = [saved, ...this.campaigns];
          }
          this.notifyListeners();
          this.fetchStatsFromApi();
          return saved;
        }
      }
    } catch (e) {
      console.warn('Failed to save campaign via API:', e);
    }
    return null;
  }

  public autoSaveCampaign(
    campaignData: Partial<Campaign> & { id: string },
    onStatusChange?: (status: 'saving' | 'saved' | 'error') => void
  ) {
    if (onStatusChange) onStatusChange('saving');

    if (this.autoSaveTimers.has(campaignData.id)) {
      clearTimeout(this.autoSaveTimers.get(campaignData.id)!);
    }

    const timer = setTimeout(async () => {
      const result = await this.createOrSaveCampaign(campaignData);
      if (onStatusChange) {
        onStatusChange(result ? 'saved' : 'error');
      }
      this.autoSaveTimers.delete(campaignData.id);
    }, 800); // 800ms debounce

    this.autoSaveTimers.set(campaignData.id, timer);
  }

  public async duplicateCampaign(id: string): Promise<Campaign | null> {
    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}/duplicate`, {
        method: 'POST'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const duplicated: Campaign = json.data;
          this.campaigns = [duplicated, ...this.campaigns];
          this.notifyListeners();
          this.fetchStatsFromApi();
          return duplicated;
        }
      }
    } catch (e) {
      console.warn(`Failed to duplicate campaign ${id}:`, e);
    }
    return null;
  }

  public async archiveCampaign(id: string, isArchived?: boolean): Promise<Campaign | null> {
    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const updated: Campaign = json.data;
          this.campaigns = this.campaigns.map(c => c.id === updated.id ? updated : c);
          this.notifyListeners();
          this.fetchStatsFromApi();
          return updated;
        }
      }
    } catch (e) {
      console.warn(`Failed to archive campaign ${id}:`, e);
    }
    return null;
  }

  public async deleteCampaign(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.campaigns = this.campaigns.filter(c => c.id !== id);
          this.notifyListeners();
          this.fetchStatsFromApi();
          return true;
        }
      }
    } catch (e) {
      console.warn(`Failed to soft-delete campaign ${id}:`, e);
    }
    return false;
  }

  public async scheduleCampaign(id: string, scheduleSettings: any): Promise<Campaign | null> {
    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleSettings)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const updated: Campaign = json.data;
          this.campaigns = this.campaigns.map(c => c.id === updated.id ? updated : c);
          this.notifyListeners();
          this.fetchStatsFromApi();
          return updated;
        }
      }
    } catch (e) {
      console.warn(`Failed to schedule campaign ${id}:`, e);
    }
    return null;
  }

  public async unscheduleCampaign(id: string): Promise<Campaign | null> {
    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}/schedule`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const updated: Campaign = json.data;
          this.campaigns = this.campaigns.map(c => c.id === updated.id ? updated : c);
          this.notifyListeners();
          this.fetchStatsFromApi();
          return updated;
        }
      }
    } catch (e) {
      console.warn(`Failed to unschedule campaign ${id}:`, e);
    }
    return null;
  }

  public async updateCampaignStatus(id: string, status: string, extraData?: Partial<Campaign>): Promise<Campaign | null> {
    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extraData })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const updated: Campaign = json.data;
          this.campaigns = this.campaigns.map(c => c.id === updated.id ? updated : c);
          this.notifyListeners();
          this.fetchStatsFromApi();
          return updated;
        }
      }
    } catch (e) {
      console.warn(`Failed to update campaign status ${id}:`, e);
    }
    return null;
  }
}

export const campaignService = new CampaignService();

