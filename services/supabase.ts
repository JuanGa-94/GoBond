
import { createClient } from '@supabase/supabase-js';
import { Route, Schedule, User, UserRole, Ad, DonationMethod, NewsItem, Company, PaymentMethod, AvailableRoute } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Helper: map a profiles row to our User type
function mapProfile(row: any): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? undefined,
    role: row.role === 'ADMIN' ? UserRole.ADMIN : UserRole.USER,
    avatar_url: row.avatar_url ?? undefined,
  };
}

class SupabaseService {

  // ─── AUTH ──────────────────────────────────────────────

  async loginWithEmail(email: string, password: string): Promise<User> {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    const profile = await this.fetchProfile(data.user.id);
    return profile;
  }

  async registerWithEmail(email: string, password: string, name: string): Promise<User> {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('No se pudo crear el usuario');

    // The trigger creates the profile row automatically; update name
    // Small delay to let the trigger fire
    await new Promise(resolve => setTimeout(resolve, 500));

    await supabaseClient
      .from('profiles')
      .update({ name, avatar_url: `https://picsum.photos/seed/${encodeURIComponent(email)}/100/100` })
      .eq('id', data.user.id);

    return this.fetchProfile(data.user.id);
  }

  async logout(): Promise<void> {
    await supabaseClient.auth.signOut();
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;
    return this.fetchProfile(user.id);
  }

  async updateProfile(userId: string, data: { name?: string; email?: string }): Promise<User | null> {
    const { error } = await supabaseClient.from('profiles').update(data).eq('id', userId);
    if (error) throw new Error(error.message);
    return this.fetchProfile(userId);
  }

  async updatePassword(_userId: string, newPassword: string): Promise<void> {
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }

  private async fetchProfile(userId: string): Promise<User> {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) throw new Error('Perfil no encontrado');
    return mapProfile(data);
  }

  // ─── READS ─────────────────────────────────────────────

  async getRoutes(): Promise<Route[]> {
    const { data, error } = await supabaseClient.from('routes').select('*').order('created_at');
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => ({
      ...r,
      payment_methods: r.payment_methods ?? [],
    })) as Route[];
  }

  async getSchedules(): Promise<Schedule[]> {
    const { data, error } = await supabaseClient.from('schedules').select('*').order('departure_time');
    if (error) throw new Error(error.message);
    return (data ?? []).map(s => ({
      ...s,
      operating_days: s.operating_days ?? [],
    })) as Schedule[];
  }

  async getAds(): Promise<Ad[]> {
    const { data, error } = await supabaseClient.from('ads').select('*').order('created_at');
    if (error) throw new Error(error.message);
    return (data ?? []) as Ad[];
  }

  async getNews(): Promise<NewsItem[]> {
    const { data, error } = await supabaseClient.from('news_items').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as NewsItem[];
  }

  async getDonationMethods(): Promise<DonationMethod[]> {
    const { data, error } = await supabaseClient.from('donation_methods').select('*').order('created_at');
    if (error) throw new Error(error.message);
    return (data ?? []) as DonationMethod[];
  }

  async getCompanies(): Promise<Company[]> {
    const { data, error } = await supabaseClient.from('companies').select('*').order('name');
    if (error) throw new Error(error.message);
    return (data ?? []) as Company[];
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const { data, error } = await supabaseClient.from('payment_methods').select('*').order('name');
    if (error) throw new Error(error.message);
    return (data ?? []) as PaymentMethod[];
  }

  async getAvailableRoutes(): Promise<AvailableRoute[]> {
    const { data, error } = await supabaseClient.from('available_routes').select('*').order('name');
    if (error) throw new Error(error.message);
    return (data ?? []) as AvailableRoute[];
  }

  // ─── ACTIVE SELECTIONS ────────────────────────────────

  async getActiveSelection(userId: string) {
    const { data, error } = await supabaseClient
      .from('active_selections')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async validateAndSetSelection(userId: string, routeId: string, scheduleId: string, targetDate: Date) {
    // 1. Fetch schedule
    const { data: schedule, error: sErr } = await supabaseClient
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();
    if (sErr || !schedule) throw new Error('Horario no encontrado');

    // 2. Fetch app settings for timer config
    const { data: settings } = await supabaseClient
      .from('app_settings')
      .select('value')
      .eq('key', 'timer_config')
      .single();

    const timerConfig = settings?.value ?? { buffer_minutes: 5, allow_expired: false };

    // 3. Validate time
    const now = new Date();
    const [hours, minutes] = schedule.departure_time.split(':').map(Number);
    const target = new Date(targetDate);
    target.setHours(hours, minutes, 0, 0);

    const diffInMinutes = (target.getTime() - now.getTime()) / (1000 * 60);
    const buffer = timerConfig.buffer_minutes ?? 5;

    if (diffInMinutes < -buffer && !timerConfig.allow_expired) {
      throw new Error(`El bus ya ha salido de la terminal (margen de ${buffer} min excedido). Selecciona un horario futuro.`);
    }

    // 4. Upsert selection (UNIQUE on user_id)
    // Delete first, then insert (avoids upsert complexities with non-PK unique)
    await supabaseClient.from('active_selections').delete().eq('user_id', userId);

    const { data, error } = await supabaseClient
      .from('active_selections')
      .insert({
        user_id: userId,
        route_id: routeId,
        schedule_id: scheduleId,
        target_date: targetDate.toISOString().split('T')[0]
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return data;
  }

  async clearSelection(userId: string): Promise<void> {
    await supabaseClient.from('active_selections').delete().eq('user_id', userId);
  }

  // ─── ROUTES CRUD ───────────────────────────────────────

  async addRoute(route: Omit<Route, 'id'>): Promise<Route> {
    const { data, error } = await supabaseClient.from('routes').insert(route).select().single();
    if (error) throw new Error(error.message);
    return data as Route;
  }

  async deleteRoute(id: string): Promise<void> {
    const { error } = await supabaseClient.from('routes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async updateRoute(id: string, updates: Partial<Route>): Promise<void> {
    const { error } = await supabaseClient.from('routes').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── SCHEDULES CRUD ────────────────────────────────────

  async addSchedule(schedule: Omit<Schedule, 'id'>): Promise<Schedule> {
    const { data, error } = await supabaseClient.from('schedules').insert(schedule).select().single();
    if (error) throw new Error(error.message);
    return data as Schedule;
  }

  async updateSchedule(id: string, updates: Partial<Schedule>): Promise<void> {
    const { error } = await supabaseClient.from('schedules').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deleteSchedule(id: string): Promise<void> {
    const { error } = await supabaseClient.from('schedules').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── NEWS CRUD ─────────────────────────────────────────

  async addNews(message: string): Promise<NewsItem> {
    const { data, error } = await supabaseClient
      .from('news_items')
      .insert({ message })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as NewsItem;
  }

  async updateNews(id: string, message: string): Promise<void> {
    const { error } = await supabaseClient.from('news_items').update({ message }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deleteNews(id: string): Promise<void> {
    const { error } = await supabaseClient.from('news_items').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── ADS CRUD ──────────────────────────────────────────

  async addAd(ad: Omit<Ad, 'id'>): Promise<Ad> {
    const { data, error } = await supabaseClient.from('ads').insert(ad).select().single();
    if (error) throw new Error(error.message);
    return data as Ad;
  }

  async updateAd(id: string, updates: Partial<Ad>): Promise<void> {
    const { error } = await supabaseClient.from('ads').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deleteAd(id: string): Promise<void> {
    const { error } = await supabaseClient.from('ads').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── DONATION METHODS CRUD ────────────────────────────

  async addDonationMethod(method: Omit<DonationMethod, 'id'>): Promise<DonationMethod> {
    const { data, error } = await supabaseClient.from('donation_methods').insert(method).select().single();
    if (error) throw new Error(error.message);
    return data as DonationMethod;
  }

  async updateDonationMethod(id: string, updates: Partial<DonationMethod>): Promise<void> {
    const { error } = await supabaseClient.from('donation_methods').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deleteDonationMethod(id: string): Promise<void> {
    const { error } = await supabaseClient.from('donation_methods').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── PAYMENT METHODS CRUD ─────────────────────────────

  async addPaymentMethod(name: string): Promise<PaymentMethod> {
    const { data, error } = await supabaseClient.from('payment_methods').insert({ name }).select().single();
    if (error) throw new Error(error.message);
    return data as PaymentMethod;
  }

  async updatePaymentMethod(id: string, name: string): Promise<void> {
    const { error } = await supabaseClient.from('payment_methods').update({ name }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deletePaymentMethod(id: string): Promise<void> {
    const { error } = await supabaseClient.from('payment_methods').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── COMPANIES CRUD ───────────────────────────────────

  async addCompany(name: string, image_url?: string): Promise<Company> {
    const { data, error } = await supabaseClient.from('companies').insert({ name, image_url }).select().single();
    if (error) throw new Error(error.message);
    return data as Company;
  }

  async updateCompany(id: string, name: string): Promise<void> {
    const { error } = await supabaseClient.from('companies').update({ name }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deleteCompany(id: string): Promise<void> {
    const { error } = await supabaseClient.from('companies').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── AVAILABLE ROUTES CRUD ────────────────────────────

  async addAvailableRoute(name: string): Promise<AvailableRoute> {
    const { data, error } = await supabaseClient.from('available_routes').insert({ name }).select().single();
    if (error) throw new Error(error.message);
    return data as AvailableRoute;
  }

  async updateAvailableRoute(id: string, name: string): Promise<void> {
    const { error } = await supabaseClient.from('available_routes').update({ name }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deleteAvailableRoute(id: string): Promise<void> {
    const { error } = await supabaseClient.from('available_routes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}

export const supabase = new SupabaseService();
