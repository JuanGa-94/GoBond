
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './services/supabase';
import { User, Route, Schedule, Announcement, UserRole, Company, PaymentMethod, Ad, DonationMethod, NewsItem } from './types';
import Layout from './components/Layout';
import CountdownTimer from './components/CountdownTimer';
import { analytics } from './services/analytics';
import { AnalyticsDashboard } from './components/Admin/AnalyticsDashboard';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const FULL_DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface ExtendedSchedule extends Schedule {
  route: Route;
}

const GobondIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 514 514"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path fill-rule="evenodd" clip-rule="evenodd" d="M193.872 39C193.872 39 192.947 69.2451 221.633 69.2451C250.318 69.2449 250.318 39 250.318 39H296.647C324.225 39.0002 346.596 61.3294 346.647 88.9072L346.674 103.389H317.205C313.063 103.389 309.705 106.747 309.705 110.889C309.705 115.031 313.063 118.389 317.205 118.389H346.666L346.555 157.636L347.352 388.689V425C347.352 452.614 324.966 475 297.352 475H149C121.386 475 99 452.614 99 425V118.389H132.135C136.277 118.389 139.635 115.031 139.635 110.889C139.635 106.747 136.277 103.389 132.135 103.389H99.0693L99.2061 88.5381C99.4595 61.1052 121.77 39 149.204 39H193.872ZM191.801 425.487C188.435 425.487 185.482 427.729 184.577 430.971C183.672 434.213 185.038 437.66 187.917 439.403L219.535 458.542C221.903 459.976 224.869 459.988 227.249 458.574L259.469 439.436C262.372 437.711 263.765 434.258 262.871 431.001C261.977 427.744 259.016 425.487 255.639 425.487H191.801ZM194.134 103.389C189.992 103.389 186.634 106.747 186.634 110.889C186.634 115.031 189.992 118.389 194.134 118.389H255.206C259.348 118.389 262.706 115.031 262.706 110.889C262.706 106.747 259.348 103.389 255.206 103.389H194.134Z" fill="var(--primary)" />
    <path d="M284.062 141.698C341.991 141.698 391.134 179.531 408.394 231.969C412.68 244.991 415 258.914 415 273.382C415 287.85 412.68 301.773 408.394 314.795C391.134 367.233 341.991 405.066 284.062 405.066C226.477 405.066 177.574 367.68 160.042 315.726C155.558 302.437 153.126 288.195 153.126 273.382C153.126 258.569 155.558 244.327 160.042 231.038C177.574 179.084 226.477 141.698 284.062 141.698Z" fill="var(--secondary)" />
    <path d="M311.898 234.428C314.825 231.498 319.574 231.494 322.505 234.421C325.435 237.348 325.438 242.097 322.512 245.028L294.513 273.065L352.011 334.012C354.853 337.025 354.714 341.771 351.701 344.614C348.688 347.456 343.942 347.318 341.1 344.305L278.607 278.063L273.611 272.768L278.756 267.617L311.898 234.428Z" fill="var(--primary)" />

  </svg>
);


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [donationMethods, setDonationMethods] = useState<DonationMethod[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [activeSelection, setActiveSelection] = useState<{ route: Route, schedule: Schedule, targetDate: Date } | null>(null);
  const [searchQuery, setSearchQuery] = useState({ origin: '', destination: '' });

  // Auth view state
  const [authView, setAuthView] = useState<'landing' | 'login' | 'register'>('landing');
  const [authForm, setAuthForm] = useState({ email: '', password: '', confirmPassword: '', name: '' });
  const [authError, setAuthError] = useState<string | null>(null);

  // View states
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [addingScheduleToRouteId, setAddingScheduleToRouteId] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  const [selectedDayIndex, setSelectedDayIndex] = useState<string>(new Date().getDay().toString());

  // --- Profile States ---
  const [profileForm, setProfileForm] = useState({ name: '', email: '', newPassword: '', confirmNewPassword: '' });

  // --- Admin Route Form ---
  const [routeForm, setRouteForm] = useState<Omit<Route, 'id'>>({
    origin: '', destination: '', company: '', route_name: '', line: '', show_line: true, price: 0, payment_methods: [], is_special: false, special_reason: ''
  });
  const [createReturnRoute, setCreateReturnRoute] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  // Modal for details
  const [pendingSchedule, setPendingSchedule] = useState<ExtendedSchedule | null>(null);

  // Admin View state
  const [adminView, setAdminView] = useState<'management' | 'analytics'>('management');

  // Currency Formatter
  const formatCurrency = useCallback((amount: number) => {
    const parts = amount.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `$ ${parts.join(',')}`;
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') { root.classList.add('dark'); root.classList.remove('light'); }
    else { root.classList.add('light'); root.classList.remove('dark'); }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Restore auth session on mount
  useEffect(() => {
    supabase.getCurrentUser().then(u => {
      if (u) setUser(u);
    }).catch(() => { });

    // Track session start
    analytics.trackEvent('session_start');

    return () => {
      // Track session end (best effort)
      analytics.trackEvent('session_end');
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [r, s, c, p, a, d, n] = await Promise.all([
        supabase.getRoutes(),
        supabase.getSchedules(),
        supabase.getCompanies(),
        supabase.getPaymentMethods(),
        supabase.getAds(),
        supabase.getDonationMethods(),
        supabase.getNews()
      ]);
      setRoutes(r);
      setSchedules(s);
      setCompanies(c);
      setPaymentMethods(p);
      setAds(a);
      setDonationMethods(d);
      setNews(n);

      if (user) {
        const selection = await supabase.getActiveSelection(user.id);
        if (selection) {
          const route = r.find(x => x.id === selection.route_id);
          const schedule = s.find(x => x.id === selection.schedule_id);
          if (route && schedule) {
            const targetDate = selection.target_date ? new Date(selection.target_date + 'T00:00:00') : new Date();
            setActiveSelection({ route, schedule, targetDate });
          }
        }
        setProfileForm({ name: user.name || '', email: user.email, newPassword: '', confirmNewPassword: '' });
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const searchDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      days.push({
        label: i === 0 ? 'Hoy' : DAY_NAMES[d.getDay()],
        index: d.getDay().toString(),
        full: FULL_DAY_NAMES[d.getDay()],
        date: d
      });
    }
    days.push({ label: 'Feriado', index: 'H', full: 'Días Feriados' });
    return days;
  }, []);

  const uniqueOrigins = useMemo(() => Array.from(new Set(routes.map(r => r.origin))).sort(), [routes]);

  const availableDestinations = useMemo(() => {
    if (!searchQuery.origin) return [];
    return Array.from(new Set(routes.filter(r => r.origin === searchQuery.origin).map(r => r.destination))).sort();
  }, [routes, searchQuery.origin]);

  const filteredSchedules = useMemo(() => {
    const results: ExtendedSchedule[] = [];
    schedules.forEach(s => {
      const route = routes.find(r => r.id === s.route_id);
      if (route) {
        const matchOrigin = searchQuery.origin ? route.origin === searchQuery.origin : true;
        const matchDest = searchQuery.destination ? route.destination === searchQuery.destination : true;
        const matchDay = s.operating_days.includes(selectedDayIndex);
        if (matchOrigin && matchDest && matchDay) {
          results.push({ ...s, route });
        }
      }
    });
    return results.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
  }, [routes, schedules, searchQuery, selectedDayIndex]);

  const activeAds = useMemo(() => {
    const now = new Date();
    return ads.filter(ad => ad.active && new Date(ad.start_date) <= now && new Date(ad.end_date) >= now);
  }, [ads]);



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const loggedUser = await supabase.loginWithEmail(authForm.email, authForm.password);
      setUser(loggedUser);
      analytics.trackEvent('login', { method: 'email' }, loggedUser.id);
      setActiveTab('home');
      loadData();
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authForm.name || !authForm.email || !authForm.password) {
      setAuthError("Completa todos los campos");
      return;
    }
    if (authForm.password !== authForm.confirmPassword) {
      setAuthError("Las contraseñas no coinciden");
      return;
    }
    try {
      const loggedUser = await supabase.registerWithEmail(authForm.email, authForm.password, authForm.name);
      setUser(loggedUser);
      analytics.trackEvent('register', { method: 'email' }, loggedUser.id);
      setActiveTab('home');
      loadData();
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = async () => {
    if (user) analytics.trackEvent('logout', {}, user.id);
    await supabase.logout();
    setUser(null);
    setActiveSelection(null);
    setSelectedAd(null);
    setActiveTab('home');
    setAuthView('landing');
    setAuthForm({ email: '', password: '', confirmPassword: '', name: '' });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await supabase.updateProfile(user.id, { name: profileForm.name, email: profileForm.email });
    if (profileForm.newPassword) {
      if (profileForm.newPassword !== profileForm.confirmNewPassword) {
        alert("Las contraseñas no coinciden");
        return;
      }
      await supabase.updatePassword(user.id, profileForm.newPassword);
    }
    alert("Perfil actualizado");
    loadData();
  };

  const handleConfirmSelection = async () => {
    if (!user || !pendingSchedule) return;
    try {
      const selectedDay = searchDays.find(d => d.index === selectedDayIndex);
      const targetDate = selectedDay?.date || new Date();

      await supabase.validateAndSetSelection(user.id, pendingSchedule.route.id, pendingSchedule.id, targetDate);
      analytics.trackEvent('countdown_activated', {
        route_id: pendingSchedule.route.id,
        schedule_id: pendingSchedule.id,
        company_id: pendingSchedule.route.company,
        origin: pendingSchedule.route.origin,
        destination: pendingSchedule.route.destination
      }, user.id);

      setActiveSelection({ route: pendingSchedule.route, schedule: pendingSchedule, targetDate });
      setPendingSchedule(null);
      setActiveTab('home');
    } catch (err: any) {
      // Mostrar error de validación (ej: bus ya salió)
      alert(err.message);
    }
  };

  const handleCancelSelection = async () => {
    if (!user) return;
    analytics.trackEvent('countdown_cancelled', {
      route_id: activeSelection?.route.id,
      schedule_id: activeSelection?.schedule.id
    }, user.id);
    await supabase.clearSelection(user.id);
    setActiveSelection(null);
  };

  const handleBoardedBus = async () => {
    if (!user) return;
    await supabase.clearSelection(user.id);
    setActiveSelection(null);
    alert('¡Buen viaje!');
  };

  // --- CRUD Admin Handlers ---
  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRouteId) {
        await supabase.updateRoute(editingRouteId, routeForm);
        alert("Ruta actualizada");
      } else {
        await supabase.addRoute(routeForm);
        if (createReturnRoute) {
          await supabase.addRoute({
            ...routeForm,
            origin: routeForm.destination,
            destination: routeForm.origin,
            route_name: routeForm.route_name // Removed (Retorno) suffix as requested
          });
        }
        alert("Ruta creada");
      }
      setRouteForm({ origin: '', destination: '', company: '', route_name: '', line: '', show_line: true, price: 0, payment_methods: [], is_special: false, special_reason: '' });
      setCreateReturnRoute(false);
      setEditingRouteId(null);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleEditRoute = (r: Route) => {
    setEditingRouteId(r.id);
    setRouteForm({
      origin: r.origin,
      destination: r.destination,
      company: r.company,
      route_name: r.route_name,
      line: r.line,
      show_line: r.show_line,
      price: r.price,
      payment_methods: r.payment_methods || [],
      is_special: r.is_special,
      special_reason: r.special_reason
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditRoute = () => {
    setEditingRouteId(null);
    setRouteForm({ origin: '', destination: '', company: '', route_name: '', line: '', show_line: true, price: 0, payment_methods: [], is_special: false, special_reason: '' });
    setCreateReturnRoute(false);
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingScheduleToRouteId || !editingSchedule) return;
    try {
      // Important: Omit id when creating a new schedule to allow database to generate it
      const { id, ...scheduleData } = editingSchedule;
      await supabase.addSchedule({ ...scheduleData, route_id: addingScheduleToRouteId });
      setAddingScheduleToRouteId(null);
      setEditingSchedule(null);
      loadData();
      alert("Frecuencia añadida");
    } catch (err: any) {
      alert(`Error al añadir frecuencia: ${err.message}`);
    }
  };

  const handleDeleteScheduleAdmin = async (id: string) => {
    if (confirm('¿Eliminar frecuencia?')) {
      await supabase.deleteSchedule(id);
      loadData();
    }
  };

  const handleAddNewsAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const msg = fd.get('message') as string;
    if (msg) {
      await supabase.addNews(msg);
      loadData();
      e.currentTarget.reset();
    }
  };

  const handleEditNews = async (n: NewsItem) => {
    const msg = prompt('Nuevo mensaje de novedad:', n.message);
    if (msg) {
      await supabase.updateNews(n.id, msg);
      loadData();
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (confirm('¿Eliminar esta novedad?')) {
      await supabase.deleteNews(id);
      loadData();
    }
  };

  const handleAddAdAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await supabase.addAd({
      title: fd.get('title') as string,
      description: fd.get('description') as string,
      image_url: fd.get('image_url') as string,
      external_url: fd.get('external_url') as string,
      start_date: new Date().toISOString(),
      end_date: '2030-01-01',
      active: true
    });
    loadData();
    e.currentTarget.reset();
  };

  const handleEditAd = async (ad: Ad) => {
    const newTitle = prompt('Nuevo título:', ad.title);
    if (newTitle) {
      await supabase.updateAd(ad.id, { title: newTitle });
      loadData();
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (confirm('¿Eliminar este anuncio?')) {
      await supabase.deleteAd(id);
      loadData();
    }
  };

  const handleAddDonationMethodAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await supabase.addDonationMethod({
      name: fd.get('name') as string,
      url: fd.get('url') as string,
      icon: fd.get('icon') as string,
      description: fd.get('description') as string
    });
    loadData();
    e.currentTarget.reset();
  };

  const handleEditDonationMethod = async (dm: DonationMethod) => {
    const newName = prompt('Nombre del método:', dm.name);
    const newUrl = prompt('URL del método:', dm.url);
    if (newName && newUrl) {
      await supabase.updateDonationMethod(dm.id, { name: newName, url: newUrl });
      loadData();
    }
  };

  const handleDeleteDonationMethod = async (id: string) => {
    if (confirm('¿Eliminar este método de colaboración?')) {
      await supabase.deleteDonationMethod(id);
      loadData();
    }
  };

  const handleAddPaymentMethodAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    if (name) {
      await supabase.addPaymentMethod(name);
      loadData();
      e.currentTarget.reset();
    }
  };

  const handleEditPaymentMethod = async (pm: PaymentMethod) => {
    const newName = prompt('Nuevo nombre para el método de pago:', pm.name);
    if (newName) {
      await supabase.updatePaymentMethod(pm.id, newName);
      loadData();
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (confirm('¿Eliminar este método de pago?')) {
      await supabase.deletePaymentMethod(id);
      loadData();
    }
  };

  const handleAddCompanyAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const image_url = fd.get('image_url') as string;
    if (name) {
      await supabase.addCompany(name, image_url);
      loadData();
      e.currentTarget.reset();
    }
  };

  const handleEditCompany = async (c: Company) => {
    const newName = prompt('Nuevo nombre para la empresa:', c.name);
    if (newName) {
      await supabase.updateCompany(c.id, newName);
      loadData();
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (confirm('¿Eliminar esta empresa?')) {
      await supabase.deleteCompany(id);
      loadData();
    }
  };

  const handlePresetDays = (type: 'lv' | 'fs' | 'fer' | 'all') => {
    if (!editingSchedule) return;
    let days: string[] = [];
    if (type === 'lv') days = ['1', '2', '3', '4', '5'];
    if (type === 'fs') days = ['0', '6'];
    if (type === 'fer') days = ['H'];
    if (type === 'all') days = ['0', '1', '2', '3', '4', '5', '6', 'H'];
    setEditingSchedule({ ...editingSchedule, operating_days: days });
  };

  if (selectedAd && user) {
    return (
      <Layout user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
          <button onClick={() => setSelectedAd(null)} className="flex items-center gap-2 text-primary font-bold hover:translate-x-[-4px] transition-all">
            <span className="material-symbols-rounded">arrow_back</span> Regresar
          </button>
          <div className="bg-surface rounded-[3rem] overflow-hidden shadow-2xl border border-border-subtle transition-colors">
            <img src={selectedAd.image_url} className="w-full h-[400px] object-cover" alt={selectedAd.title} />
            <div className="p-10 space-y-6">
              <h1 className="text-4xl font-bold">{selectedAd.title}</h1>
              <p className="text-text/70 font-medium text-lg leading-relaxed">{selectedAd.description}</p>
              <div className="pt-6">
                <a href={selectedAd.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-10 py-5 bg-primary text-background font-bold rounded-2xl shadow-xl hover:scale-105 transition-all">
                  VISITAR SITIO <span className="material-symbols-rounded">open_in_new</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background transition-colors">
        <div className="w-full max-w-md bg-surface rounded-[2.5rem] shadow-2xl p-10 border border-border-subtle animate-slide-up transition-colors">
          <div className="flex flex-col items-center mb-10">
            <div className="p-4 rounded-2xl">
              <GobondIcon className="w-24 h-24" />
            </div>
            <h1 className="text-6xl font-bold tracking-tight mb-2 normal-case">
              <span className="text-[var(--primary)]">Go</span>
              <span className="text-[var(--secondary)]">Bond</span>
              <span className="text-[var(--primary)]">!</span>

            </h1>
            <p className="text-text/60 font-medium">¡Los horarios que necesitás, en un solo lugar!</p>
          </div>

          {authError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm font-bold rounded-r-xl">
              {authError}
            </div>
          )}

          {authView === 'landing' ? (
            <div className="space-y-4">
              <button onClick={() => setAuthView('login')} className="w-full py-4 bg-primary text-background font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg">Iniciar Sesión</button>
              <button onClick={() => setAuthView('register')} className="w-full py-4 border-2 border-primary text-primary font-black rounded-2xl hover:bg-primary/5 transition-all">Registrarse</button>
            </div>
          ) : authView === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <input type="email" required value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} className="w-full p-4 rounded-xl bg-surface-variant border-none outline-none focus:ring-2 focus:ring-primary text-text/60 font-medium" placeholder="Correo electrónico" />
                <input type="password" required value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} className="w-full p-4 rounded-xl bg-surface-variant border-none outline-none focus:ring-2 focus:ring-primary text-text/60 font-medium" placeholder="Contraseña" />
              </div>
              <button type="submit" className="w-full py-4 bg-primary text-background font-bold rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all">ACCEDER</button>
              <button type="button" onClick={() => setAuthView('landing')} className="w-full py-2 text-text/40 font-bold text-sm hover:text-text transition-colors">Regresar</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <input type="text" required value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} className="w-full p-4 rounded-xl bg-surface-variant border-none outline-none focus:ring-2 focus:ring-primary text-surface font-medium" placeholder="Nombre completo" />
                <input type="email" required value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} className="w-full p-4 rounded-xl bg-surface-variant border-none outline-none focus:ring-2 focus:ring-primary text-surface font-medium" placeholder="Email" />
                <input type="password" required value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} className="w-full p-4 rounded-xl bg-surface-variant border-none outline-none focus:ring-2 focus:ring-primary text-surface font-medium" placeholder="Contraseña" />
                <input type="password" required value={authForm.confirmPassword} onChange={e => setAuthForm({ ...authForm, confirmPassword: e.target.value })} className="w-full p-4 rounded-xl bg-surface-variant border-none outline-none focus:ring-2 focus:ring-primary text-surface font-medium" placeholder="Confirmar contraseña" />
              </div>
              <button type="submit" className="w-full py-4 bg-primary text-background font-bold rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all">REGISTRARSE</button>
              <button type="button" onClick={() => setAuthView('landing')} className="w-full py-2 text-text/40 font-bold text-sm hover:text-text transition-colors">Regresar</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>

      {/* Modal Selection Detail */}
      {pendingSchedule && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-text/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-surface rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden transition-colors">
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-primary tracking-widest">{pendingSchedule.route.company}</p>
                  <h3 className="text-2xl font-bold">{pendingSchedule.route.route_name}</h3>
                </div>
                <button onClick={() => setPendingSchedule(null)} className="size-10 rounded-full bg-surface-variant flex items-center justify-center text-text/40 hover:text-text/60 transition-all"><span className="material-symbols-rounded">close</span></button>
              </div>

              {/* Company Image */}
              {(() => {
                const company = companies.find(c => c.name === pendingSchedule.route.company);
                return company?.image_url ? (
                  <div className="aspect-[29/9] w-full rounded-2xl overflow-hidden border border-border-subtle bg-surface-variant/30">
                    <img src={company.image_url} className="w-full h-full object-cover" alt={company.name} />
                  </div>
                ) : null;
              })()}

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-background p-6 rounded-2xl border border-border-subtle">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest">Salida</p>
                  <p className="text-2xl font-bold text-primary">{pendingSchedule.departure_time}</p>
                </div>
                <span className="material-symbols-rounded text-primary/30">east</span>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest">Arribo</p>
                  <p className="text-2xl font-bold text-primary/60">{pendingSchedule.arrival_time}</p>
                </div>
              </div>

              <div className="flex justify-between items-center bg-background p-4 rounded-xl">
                <div>
                  <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest">Precio</p>
                  <p className="text-xl font-bold">{formatCurrency(pendingSchedule.route.price)}</p>
                </div>
                {pendingSchedule.route.payment_methods?.length > 0 && (
                  <div className="text-right space-y-2">
                    <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest">Pagos aceptados</p>
                    <div className="flex flex-wrap justify-end gap-1">
                      {pendingSchedule.route.payment_methods.map(pm => (
                        <span key={pm} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full  tracking-tighter border border-primary/20">
                          {pm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setPendingSchedule(null)} className="flex-1 py-4 font-bold text-text/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl transition-all">Cancelar</button>
                <button onClick={handleConfirmSelection} className="flex-[2] py-4 bg-primary text-background font-bold rounded-2xl hover:bg-primary/90 hover:scale-[1.06] transition-all shadow-lg flex items-center justify-center gap-2">
                  <span className="material-symbols-rounded">check_circle</span> CONFIRMAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HOME TAB */}
      {activeTab === 'home' && (
        <div className="space-y-12 animate-fade-in pb-20">

          <section className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Hola, {user.name || 'Viajero'} !! 😊</h1>
            <p className="text-slate-500 text-lg font-medium">Servicios interurbanos en un solo lugar</p>
          </section>

          {activeSelection && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Ruta activa
              </div>
              <div className="bg-surface rounded-[2.5rem] shadow-xl border border-border-subtle p-8 transition-colors">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-bold">{activeSelection.route.origin} → {activeSelection.route.destination}</h3>
                    <p className="text-text/50 font-medium">{activeSelection.route.company} • {activeSelection.route.route_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest">Salida</p>
                    <p className="text-3xl font-bold text-primary tabular-nums">{activeSelection.schedule.departure_time}</p>
                  </div>
                </div>
                <CountdownTimer departureTime={activeSelection.schedule.departure_time} targetDate={activeSelection.targetDate} />
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button onClick={handleCancelSelection} className="py-4 bg-surface-variant text-text/60 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold rounded-2xl transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-rounded">cancel</span> CANCELAR
                  </button>
                  <button onClick={handleBoardedBus} className="py-4 bg-primary text-background font-bold rounded-2xl hover:bg-primary/90 hover:scale-[1.04] transition-all flex items-center justify-center gap-2 shadow-lg">
                    <span class="material-symbols-rounded">check_circle_unread</span> YA ESTOY EN EL BUS
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Search transitioning to Search Tab */}
          <div className="bg-surface rounded-[2.5rem] p-8 shadow-2xl border border-border-subtle transition-colors">
            <div className="flex items-center gap-4 mb-6">
              <span className="material-symbols-rounded text-primary text-3xl">explore</span>
              <h3 className="text-xl font-bold">Buscador rápido</h3>
            </div>
            <button onClick={() => setActiveTab('search')} className="w-full bg-primary text-background font-bold py-5 rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-xl hover:scale-[1.06]">
              <span className="material-symbols-rounded">search</span> BUSCAR MI PRÓXIMO BUS
            </button>
          </div>

          {/* Novedades Section */}
          {news.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-black px-2">Avisos del servicio</h3>
              <div className="flex flex-col gap-3">
                {news.map(n => (
                  <div key={n.id} className="p-4 bg-alert-yellow/30 dark:bg-yellow-900/10 border-l-4 border-yellow-500 rounded-r-2xl">
                    <p className="text-sm font-semibold text-text/80">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            <h3 className="text-xl font-bold px-2">Promociones destacadas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeAds.map(ad => (
                <div key={ad.id} onClick={() => setSelectedAd(ad)} className="group bg-surface rounded-[2.5rem] overflow-hidden border border-border-subtle shadow-lg hover:shadow-2xl transition-all cursor-pointer">
                  <div className="relative h-48">
                    <img src={ad.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={ad.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-4 left-6">
                      <p className="text-white font-bold text-lg">{ad.title}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEARCH TAB - Refined Logic: Origin -> Dest -> Results */}
      {activeTab === 'search' && (
        <div className="space-y-8 animate-fade-in pb-20">
          <div className="flex justify-between items-end">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Buscador de Horarios</h2>
              <p className="text-slate-500 font-medium">Selecciona tu trayecto para ver las frecuencias disponibles.</p>
            </div>
            {(searchQuery.origin || searchQuery.destination) && (
              <button
                onClick={() => setSearchQuery({ origin: '', destination: '' })}
                className="flex items-center gap-1 text-xs font-black text-primary hover:text-primary/70 transition-colors mb-2"
              >
                <span className="material-symbols-rounded text-sm">restart_alt</span>
                REINICIAR
              </button>
            )}
          </div>

          <div className="bg-surface rounded-[2.5rem] p-8 shadow-2xl border border-border-subtle transition-colors">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-end gap-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-text/40 uppercase tracking-wider px-1">Partida</label>
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-primary z-10 pointer-events-none">location_on</span>
                  <select className="w-full pl-12 pr-10 py-5 rounded-2xl bg-background focus:ring-2 focus:ring-primary outline-none text-text appearance-none cursor-pointer font-bold transition-colors" value={searchQuery.origin} onChange={(e) => {
                    const newOrigin = e.target.value;
                    setSearchQuery({ origin: newOrigin, destination: '' });
                    if (newOrigin) analytics.trackEvent('search_origin', { origin: newOrigin }, user?.id);
                  }}>
                    <option value="">Selecciona origen</option>
                    {uniqueOrigins.map(origin => (<option key={origin} value={origin}>{origin}</option>))}
                  </select>
                </div>
              </div>
              <div className="flex justify-center pb-2 text-text/20">
                <span className="material-symbols-rounded rotate-90 md:rotate-0">east</span>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-text/40 uppercase tracking-wider px-1">Destino</label>
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-primary z-10 pointer-events-none">flag</span>
                  <select disabled={!searchQuery.origin} className="w-full pl-12 pr-10 py-5 rounded-2xl focus:ring-2 focus:ring-primary outline-none appearance-none font-bold bg-background text-text disabled:opacity-50 transition-colors" value={searchQuery.destination} onChange={(e) => {
                    const newDest = e.target.value;
                    setSearchQuery({ ...searchQuery, destination: newDest });
                    if (newDest) analytics.trackEvent('search', { origin: searchQuery.origin, destination: newDest }, user?.id);
                  }}>
                    <option value="">Selecciona destino</option>
                    {availableDestinations.map(dest => (<option key={dest} value={dest}>{dest}</option>))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Results appear only if origin and destination are selected */}
          {searchQuery.origin && searchQuery.destination && (
            <div className="space-y-8 animate-slide-up">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                {searchDays.map(d => (
                  <button key={d.index} onClick={() => setSelectedDayIndex(d.index)} className={`shrink-0 px-8 py-4 rounded-full text-xs font-black border transition-all ${selectedDayIndex === d.index ? 'bg-primary border-primary text-background shadow-lg' : 'bg-surface border-border-subtle text-text/50'}`}>{d.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4">
                {filteredSchedules.map(item => (
                  <div key={item.id} onClick={() => {
                    setPendingSchedule(item);
                    analytics.trackEvent('frequency_click', {
                      route_id: item.route.id,
                      schedule_id: item.id,
                      origin: item.route.origin,
                      destination: item.route.destination
                    }, user?.id);
                  }} className="bg-surface p-8 rounded-[2rem] border border-border-subtle flex items-center justify-between group hover:shadow-2xl transition-all cursor-pointer">
                    <div className="flex items-center gap-8">
                      <div className="text-5xl font-bold text-primary tabular-nums">{item.departure_time}</div>
                      <div>
                        <p className="text-xl font-bold">{item.route.route_name}</p>
                        <p className="text-[10px] text-text/40 font-bold uppercase">{item.route.company}</p>
                      </div>
                    </div>
                    <span className="material-symbols-rounded text-4xl text-text/10 group-hover:text-primary transition-all">chevron_right</span>
                  </div>
                ))}
                {filteredSchedules.length === 0 && (
                  <div className="py-20 text-center space-y-4">
                    <span className="material-symbols-rounded text-6xl text-slate-200">event_busy</span>
                    <p className="text-slate-400 font-bold">Sin frecuencias disponibles para hoy.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADMIN TAB */}
      {activeTab === 'admin' && user.role === UserRole.ADMIN && (
        <div className="space-y-12 animate-fade-in pb-24">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-3xl font-black dark:text-white">Panel de Gestión</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-surface rounded-[2.5rem] p-10 shadow-xl border border-border-subtle space-y-8 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-rounded text-primary text-3xl">notifications</span>
                  <h3 className="text-xl font-black dark:text-white">Novedades</h3>
                </div>
                <span className="px-3 py-1 bg-primary/10 text-primary text-[12px] font-black rounded-full uppercase">{news.length}</span>
              </div>
              <form onSubmit={handleAddNewsAdmin} className="space-y-4">
                <textarea name="message" required className="w-full p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="Mensaje para los usuarios..."></textarea>
                <button type="submit" className="w-full py-4 bg-primary text-background font-black rounded-xl hover:scale-105 transition-all">AÑADIR AVISO</button>
              </form>
              <div className="space-y-3">
                {news.map(n => (
                  <div key={n.id} className="p-4 bg-background rounded-2xl flex items-center justify-between group transition-colors">
                    <p className="text-sm font-medium dark:text-slate-200 line-clamp-1 flex-1 pr-4">{n.message}</p>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => handleEditNews(n)} className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-rounded">edit</span></button>
                      <button onClick={() => handleDeleteNews(n.id)} className="text-slate-400 hover:text-red-500 transition-colors"><span className="material-symbols-rounded">delete</span></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface rounded-[2.5rem] p-10 shadow-xl border border-border-subtle space-y-8 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-rounded text-primary text-3xl">campaign</span>
                  <h3 className="text-xl font-black">Publicidad</h3>
                </div>
                <span className="px-3 py-1 bg-primary/10 text-primary text-[12px] font-black rounded-full uppercase">{ads.length}</span>
              </div>
              <form onSubmit={handleAddAdAdmin} className="space-y-4">
                <input name="title" required className="w-full p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="Título anuncio" />
                <input name="description" required className="w-full p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="Descripción breve" />
                <input name="image_url" required className="w-full p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="URL de la imagen" />
                <button type="submit" className="w-full py-4 bg-primary text-background font-black rounded-xl hover:scale-105 transition-all">NUEVO ANUNCIO</button>
              </form>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ads.map(ad => (
                  <div key={ad.id} className="p-3 bg-background rounded-2xl flex items-center justify-between group transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={ad.image_url} className="size-8 rounded-lg object-cover" />
                      <p className="text-xs font-bold text-text/80 truncate">{ad.title}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditAd(ad)} className="text-text/40 hover:text-primary transition-colors"><span className="material-symbols-rounded text-sm">edit</span></button>
                      <button onClick={() => handleDeleteAd(ad.id)} className="text-text/40 hover:text-red-500 transition-colors"><span className="material-symbols-rounded text-sm">delete</span></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rutas y Frecuencias Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-surface rounded-[2.5rem] border border-border-subtle p-10 shadow-xl space-y-8 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-rounded text-primary text-3xl">{editingRouteId ? 'edit_road' : 'add_road'}</span>
                  <h3 className="text-xl font-black">{editingRouteId ? 'Editar Ruta' : 'Ruta'}</h3>
                </div>
                {editingRouteId && (
                  <button onClick={cancelEditRoute} className="text-sm font-black text-text/40 hover:text-primary transition-colors flex items-center gap-1">
                    <span className="material-symbols-rounded text-sm">cancel</span> CANCELAR
                  </button>
                )}
              </div>
              <form onSubmit={handleAddRoute} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <input required value={routeForm.origin} onChange={e => setRouteForm({ ...routeForm, origin: e.target.value })} className="p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="Origen" />
                  <input required value={routeForm.destination} onChange={e => setRouteForm({ ...routeForm, destination: e.target.value })} className="p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="Destino" />
                </div>
                <select required value={routeForm.company} onChange={e => setRouteForm({ ...routeForm, company: e.target.value })} className="w-full p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary cursor-pointer">
                  <option value="">Seleccionar Empresa</option>
                  {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <input required value={routeForm.route_name} onChange={e => setRouteForm({ ...routeForm, route_name: e.target.value })} className="w-full p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="Ruta..." />
                <input type="number" step="0.01" required value={routeForm.price} onChange={e => setRouteForm({ ...routeForm, price: Number(e.target.value) })} className="w-full p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="Precio" />

                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase text-text/40 tracking-widest px-1">Métodos de Pago</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {paymentMethods.map(pm => (
                      <label key={pm.id} className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-background hover:bg-primary/5 transition-colors group">
                        <input
                          type="checkbox"
                          checked={routeForm.payment_methods.includes(pm.name)}
                          onChange={e => {
                            const next = e.target.checked
                              ? [...routeForm.payment_methods, pm.name]
                              : routeForm.payment_methods.filter(m => m !== pm.name);
                            setRouteForm({ ...routeForm, payment_methods: next });
                          }}
                          className="size-4 rounded border-border-subtle text-primary"
                        />
                        <span className="text-xs font-bold text-text/80 group-hover:text-primary transition-colors">{pm.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {!editingRouteId && (
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl bg-background transition-colors">
                    <input type="checkbox" checked={createReturnRoute} onChange={e => setCreateReturnRoute(e.target.checked)} className="size-5 rounded border-border-subtle text-primary" />
                    <span className="font-bold text-sm text-text/80">Generar automáticamente ruta inversa</span>
                  </label>
                )}
                <button type="submit" className="w-full py-4 bg-primary text-background font-black rounded-2xl shadow-lg hover:scale-[1.01] transition-all">
                  {editingRouteId ? 'GUARDAR CAMBIOS' : 'INCORPORAR RUTA'}
                </button>
              </form>
            </div>

            <div className="bg-surface rounded-[2.5rem] border border-border-subtle p-10 shadow-xl space-y-6 transition-colors overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-rounded text-primary text-3xl">inventory</span>
                  <h3 className="text-xl font-black">Rutas cargadas</h3>
                </div>
                <span className="px-3 py-1 bg-primary/10 text-primary text-[12px] font-black rounded-full uppercase">{routes.length} Rutas</span>
              </div>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                {routes.map(r => (
                  <div key={r.id} className="p-6 rounded-[2rem] bg-background border border-border-subtle space-y-4 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-lg">{r.origin} → {r.destination}</p>
                        <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest">{r.company} • {r.route_name}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setAddingScheduleToRouteId(r.id); setEditingSchedule({ id: '', route_id: r.id, departure_time: '08:00', arrival_time: '09:00', operating_days: ['1', '2', '3', '4', '5'] }); }} className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-background transition-all shadow-sm">
                          <span className="material-symbols-rounded">add</span>
                        </button>
                        <button onClick={() => handleEditRoute(r)} className="size-10 rounded-full bg-accent/10 text-accent flex items-center justify-center hover:bg-accent hover:text-background transition-all shadow-sm">
                          <span className="material-symbols-rounded">edit</span>
                        </button>
                        <button onClick={() => { if (confirm('¿Eliminar ruta y horarios?')) supabase.deleteRoute(r.id).then(loadData); }} className="size-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm">
                          <span className="material-symbols-rounded">delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {schedules.filter(s => s.route_id === r.id).sort((a, b) => a.departure_time.localeCompare(b.departure_time)).map(s => (
                        <div key={s.id} className="px-4 py-2 bg-surface rounded-xl flex items-center gap-3 shadow-sm border border-border-subtle">
                          <span className="text-sm font-black text-primary tabular-nums">{s.departure_time}</span>
                          <button onClick={() => handleDeleteScheduleAdmin(s.id)} className="text-text/20 hover:text-red-500 transition-colors">
                            <span className="material-symbols-rounded text-[16px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Colaboración, Pagos & Empresas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
            {/* Sección de Colaboraciones */}
            <div className="bg-surface rounded-[2.5rem] p-8 shadow-xl border border-border-subtle transition-colors">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                <span className="material-symbols-rounded text-primary">volunteer_activism</span> Colaboración
              </h3>
              <form onSubmit={handleAddDonationMethodAdmin} className="space-y-4 mb-6">
                <input name="name" required className="w-full p-3 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="Nombre (ej. PayPal)" />
                <input name="url" required className="w-full p-3 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="URL" />
                <button type="submit" className="w-full py-3 bg-primary text-background font-black rounded-xl hover:scale-[1.02] transition-all">AÑADIR</button>
              </form>
              <div className="space-y-2">
                {donationMethods.map(dm => (
                  <div key={dm.id} className="flex items-center justify-between p-3 bg-background rounded-xl group transition-colors">
                    <span className="text-sm font-bold truncate max-w-[120px]">{dm.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditDonationMethod(dm)} className="text-text/40 hover:text-primary transition-colors"><span className="material-symbols-rounded text-sm">edit</span></button>
                      <button onClick={() => handleDeleteDonationMethod(dm.id)} className="text-text/40 hover:text-red-500 transition-colors"><span className="material-symbols-rounded text-sm">delete</span></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sección de Métodos de Pago */}
            <div className="bg-surface rounded-[2.5rem] p-8 shadow-xl border border-border-subtle transition-colors">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                <span className="material-symbols-rounded text-primary">payments</span> Pagos
              </h3>
              <form onSubmit={handleAddPaymentMethodAdmin} className="space-y-4 mb-6">
                <input name="name" required className="w-full p-3 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="Nombre" />
                <button type="submit" className="w-full py-3 bg-primary text-background font-black rounded-xl hover:scale-[1.02] transition-all">AÑADIR</button>
              </form>
              <div className="space-y-2">
                {paymentMethods.map(pm => (
                  <div key={pm.id} className="flex items-center justify-between p-3 bg-background rounded-xl group transition-colors">
                    <span className="text-sm font-bold">{pm.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditPaymentMethod(pm)} className="text-text/40 hover:text-primary transition-colors"><span className="material-symbols-rounded text-sm">edit</span></button>
                      <button onClick={() => handleDeletePaymentMethod(pm.id)} className="text-text/40 hover:text-red-500 transition-colors"><span className="material-symbols-rounded text-sm">delete</span></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sección de Empresas */}
            <div className="bg-surface rounded-[2.5rem] p-8 shadow-xl border border-border-subtle transition-colors">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                <span className="material-symbols-rounded text-primary">business</span> Empresas
              </h3>
              <form onSubmit={handleAddCompanyAdmin} className="space-y-4 mb-6">
                <input name="name" required className="w-full p-3 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="Nombre Empresa" />
                <input name="image_url" className="w-full p-3 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="URL Imagen (4:3)" />
                <button type="submit" className="w-full py-3 bg-primary text-background font-black rounded-xl hover:scale-[1.02] transition-all">REGISTRAR</button>
              </form>
              <div className="space-y-2">
                {companies.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-background rounded-xl group transition-colors">
                    <span className="text-sm font-bold">{c.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditCompany(c)} className="text-text/40 hover:text-primary transition-colors"><span className="material-symbols-rounded text-sm">edit</span></button>
                      <button onClick={() => handleDeleteCompany(c.id)} className="text-text/40 hover:text-red-500 transition-colors"><span className="material-symbols-rounded text-sm">delete</span></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* METRICAS TAB */}
      {activeTab === 'metrics' && user.role === UserRole.ADMIN && (
        <div className="space-y-12 animate-fade-in pb-24">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-3xl font-black dark:text-white">Métricas de Uso</h2>
          </div>
          <AnalyticsDashboard />
        </div>
      )}

      {/* PERFIL TAB */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto space-y-12 animate-fade-in pb-20">
          <div className="flex flex-col items-center gap-6 p-10 bg-surface rounded-[3rem] border border-border-subtle shadow-2xl transition-colors">
            <div className="relative">
              <img src={user.avatar_url} className="size-32 rounded-full border-4 border-primary/20 shadow-xl" alt="Avatar" />
              <div className="absolute bottom-0 right-0 size-8 bg-primary rounded-full border-4 border-surface flex items-center justify-center text-background cursor-pointer hover:scale-110 transition-transform"><span className="material-symbols-rounded text-[14px]">edit</span></div>
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-black">{user.name || 'Viajero'}</h2>
              <p className="text-text/40 font-bold">{user.email}</p>
              <span className="mt-2 inline-block px-4 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest">{user.role}</span>
            </div>
          </div>

          <div className="bg-surface rounded-[3rem] border border-border-subtle p-10 shadow-xl transition-colors">
            <h3 className="text-2xl font-black mb-8">Ajustes de Cuenta</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="Nombre" />
                <input type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} className="w-full p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="Email" />
              </div>
              <div className="pt-8 border-t border-border-subtle space-y-6 transition-colors">
                <h4 className="text-sm font-black text-text/40 uppercase tracking-widest">Seguridad</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input type="password" value={profileForm.newPassword} onChange={e => setProfileForm({ ...profileForm, newPassword: e.target.value })} className="w-full p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="Nueva contraseña" />
                  <input type="password" value={profileForm.confirmNewPassword} onChange={e => setProfileForm({ ...profileForm, confirmNewPassword: e.target.value })} className="w-full p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" placeholder="Confirmar nueva" />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-primary text-background font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-all">ACTUALIZAR PERFIL</button>
            </form>
          </div>
        </div>
      )}

      {/* TABS TIPS (COLABORACION) */}
      {activeTab === 'tips' && (
        <div className="space-y-12 animate-fade-in pb-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black dark:text-white">Colaboración</h2>
            <p className="text-slate-500 text-lg font-medium mt-2">Apoya el mantenimiento de TwBond.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-10 bg-surface rounded-[3rem] shadow-xl border border-border-subtle flex flex-col items-center text-center transition-colors">
              <span className="material-symbols-rounded text-7xl text-primary mb-6">volunteer_activism</span>
              <h3 className="text-2xl font-black dark:text-white">Tu aporte importa</h3>
              <p className="text-slate-500 mt-4 leading-relaxed">GoBond! es un proyecto independiente mantenido por la comunidad.</p>
            </div>
            <div className="space-y-4">
              {donationMethods.map(dm => (
                <a key={dm.id} href={dm.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-6 p-6 bg-surface rounded-3xl border border-border-subtle hover:shadow-xl transition-all group transition-colors">
                  <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-background transition-all">
                    <span className="material-symbols-rounded text-3xl">{dm.icon || 'payments'}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black dark:text-white text-lg">{dm.name}</h4>
                    <p className="text-sm text-slate-500 line-clamp-1">{dm.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {(addingScheduleToRouteId || editingSchedule?.id) && editingSchedule && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-text/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-surface rounded-[2.5rem] shadow-2xl p-8 space-y-8 transition-colors">
            <h3 className="text-2xl font-black">{addingScheduleToRouteId ? 'Nueva Frecuencia' : 'Editar Frecuencia'}</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Hora Salida</label>
                <input type="time" value={editingSchedule.departure_time} onChange={e => setEditingSchedule({ ...editingSchedule, departure_time: e.target.value })} className="w-full p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Hora Llegada</label>
                <input type="time" value={editingSchedule.arrival_time} onChange={e => setEditingSchedule({ ...editingSchedule, arrival_time: e.target.value })} className="w-full p-4 rounded-xl bg-background text-text border-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-text/40 tracking-widest px-1">Días de Operación</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => handlePresetDays('lv')} className="px-3 py-2 bg-background rounded-lg text-[10px] font-black text-text/60 hover:bg-primary/20 transition-colors">LUN-VIE</button>
                <button type="button" onClick={() => handlePresetDays('fs')} className="px-3 py-2 bg-background rounded-lg text-[10px] font-black text-text/60 hover:bg-primary/20 transition-colors">SÁB-DOM</button>
                <button type="button" onClick={() => handlePresetDays('all')} className="px-3 py-2 bg-background rounded-lg text-[10px] font-black text-text/60 hover:bg-primary/20 transition-colors">DIARIO</button>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-2">
                {['1', '2', '3', '4', '5', '6', '0', 'H'].map(day => (
                  <button key={day} type="button" onClick={() => {
                    const current = editingSchedule.operating_days;
                    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
                    setEditingSchedule({ ...editingSchedule, operating_days: next });
                  }} className={`py-2 rounded-xl text-[10px] font-black transition-all ${editingSchedule.operating_days.includes(day) ? 'bg-primary text-background shadow-md' : 'bg-background text-text/40'}`}>
                    {day === 'H' ? 'FER' : DAY_NAMES[parseInt(day)]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={() => { setAddingScheduleToRouteId(null); setEditingSchedule(null); }} className="flex-1 py-4 font-bold text-text/40 hover:bg-surface-variant rounded-2xl transition-all">Cerrar</button>
              <button onClick={handleAddSchedule} className="flex-[2] py-4 bg-primary text-background font-bold rounded-2xl shadow-xl hover:scale-105 transition-all">GUARDAR FRECUENCIA</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
