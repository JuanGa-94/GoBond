
import posthog from 'posthog-js';

const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY || '';
const POSTHOG_PROJECT_ID = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_ID || '';
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
const API_BASE = POSTHOG_HOST.includes('us') ? 'https://us.posthog.com' : 'https://eu.posthog.com';

class AnalyticsService {
    async trackEvent(eventType: string, payload: any = {}, userId: string | null = null) {
        try {
            if (userId) {
                posthog.identify(userId);
            }

            posthog.capture(eventType, {
                ...payload,
                $set: userId ? { userId } : undefined
            });
        } catch (err) {
            console.error('Analytics error:', err);
        }
    }

    async getStats() {
        if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
            console.warn('PostHog API Key or Project ID missing, using mock data.');
            return this.getMockStats();
        }

        try {
            const [funnelData, destinations, companies, users] = await Promise.all([
                this.queryFunnels(),
                this.queryBreakdown('search', 'destination'),
                this.queryBreakdown('frequency_click', 'company'),
                this.queryTrends('session_start')
            ]);

            return {
                average_usage: { avg_minutes: 0 }, // Placeholder for actual usage calc
                retention: [{ users: users.reduce((acc: number, cur: any) => acc + cur.count, 0) }],
                funnel: funnelData,
                top_destinations: destinations.slice(0, 5),
                top_companies: companies.slice(0, 5),
                ghost_frequencies: [] // Complex to calculate via API alone without multiple passes
            };
        } catch (err) {
            console.error('Error fetching PostHog stats:', err);
            return this.getMockStats(); // Fallback to mock if API fails
        }
    }

    private async posthogFetch(query: any) {
        const response = await fetch(`${API_BASE}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${POSTHOG_API_KEY}`
            },
            body: JSON.stringify({ query })
        });
        if (!response.ok) throw new Error(`PostHog API Error: ${response.statusText}`);
        return await response.json();
    }

    private async queryFunnels() {
        const query = {
            kind: "FunnelsQuery",
            series: [
                { kind: "EventsNode", event: "session_start" },
                { kind: "EventsNode", event: "search" },
                { kind: "EventsNode", event: "frequency_click" },
                { kind: "EventsNode", event: "countdown_activated" }
            ],
            dateRange: { date_from: "-30d" }
        };
        const res = await this.posthogFetch(query);
        const steps = ["session_start", "search", "frequency_click", "countdown_activated"];
        return (res.results || []).map((stepObj: any, i: number) => ({
            step: steps[i],
            count: stepObj.count || 0
        }));
    }

    private async queryBreakdown(event: string, property: string) {
        const query = {
            kind: "DataTableNode",
            source: {
                kind: "HogQLQuery",
                query: `SELECT properties.${property}, count() FROM events WHERE event = '${event}' GROUP BY properties.${property} ORDER BY count() DESC LIMIT 5`
            }
        };
        const res = await this.posthogFetch(query);
        return (res.results || []).map((row: any) => ({
            name: row[0] || 'Desconocido',
            value: row[1] || 0,
            id: row[0] || 'unknown'
        }));
    }

    private async queryTrends(event: string) {
        const query = {
            kind: "TrendsQuery",
            series: [{ kind: "EventsNode", event: event }],
            dateRange: { date_from: "-7d" },
            interval: "day"
        };
        const res = await this.posthogFetch(query);
        return (res.results?.[0]?.data || []).map((val: number, i: number) => ({
            day: i,
            count: val
        }));
    }

    private getMockStats() {
        return {
            average_usage: { avg_minutes: 12 },
            retention: [{ users: 0 }],
            funnel: [
                { step: 'session_start', count: 0 },
                { step: 'search', count: 0 },
                { step: 'frequency_click', count: 0 },
                { step: 'countdown_activated', count: 0 }
            ],
            top_destinations: [],
            top_companies: [],
            ghost_frequencies: []
        };
    }
}

export const analytics = new AnalyticsService();
