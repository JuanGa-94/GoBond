
import { supabaseClient } from './supabase';

const SESSION_KEY = 'gobond_analytics_session';

class AnalyticsService {
    private sessionId: string;

    constructor() {
        this.sessionId = this.getOrCreateSessionId();
    }

    private getOrCreateSessionId(): string {
        let sid = localStorage.getItem(SESSION_KEY);
        if (!sid) {
            sid = crypto.randomUUID();
            localStorage.setItem(SESSION_KEY, sid);
        }
        return sid;
    }

    async trackEvent(eventType: string, payload: any = {}, userId: string | null = null) {
        try {
            // Call the Edge Function
            const { data, error } = await supabaseClient.functions.invoke('track-event', {
                body: {
                    event_type: eventType,
                    session_id: this.sessionId,
                    user_id: userId,
                    payload
                }
            });

            if (error) {
                // Fallback to direct insertion if Edge Function fails or CORS issue
                console.warn('Edge Function track-event failed, falling back to direct insert:', error);
                await supabaseClient.from('analytics_events').insert({
                    event_type: eventType,
                    session_id: this.sessionId,
                    user_id: userId,
                    payload
                });
            }
        } catch (err) {
            console.error('Analytics error:', err);
        }
    }

    async getStats() {
        const { data, error } = await supabaseClient.functions.invoke('get-analytics-stats');
        if (error) throw error;
        return data;
    }
}

export const analytics = new AnalyticsService();
