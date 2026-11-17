"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Bell, Bike, Check, CheckCircle2, ChevronDown, CircleDollarSign, Clock3, CreditCard, Database, Eye, History, LayoutDashboard, LogOut, Menu, MessageCircle, Pencil, Plus, Search, Settings, ShieldCheck, UserRound, Users, Wallet, X } from "lucide-react";
import Dashboard from "./dashboard";
import AdminViews from "./admin-views";
import { Empty, Field, HelmetText, Modal, Status } from "./ui";
import Brand from "./brand";
import LoginScreen from "./login-screen";
import { addDays, dayKey, elapsed, money, shortDate, shortTime } from "@/lib/dates";
import { api, post, type AppUser, type DashboardData, type ParkingItem } from "@/lib/types";

type ModalType = "entry" | "detail" | "checkout" | "success" | "password" | null;
type Quote = { hours: number; amount: number; quotedAt: string; helmet: string };

const titles: Record<string, [string, string]> = {
  dashboard: ["Panel general", "Un resumen de lo que pasa en tu parqueadero."],
  inside: ["Motos dentro", "Consulta y administra las motos que están en el parqueadero."],
  history: ["Historial de movimientos", "Consulta todas las entradas y salidas registradas."],
  closure: ["Cierre de caja", "Revisa y cierra las cuentas de tu día."],
  month: ["Reporte mensual", "Conoce los resultados de tu parqueadero."],
  users: ["Cuidadores", "Administra las personas de tu equipo."],
  rates: ["Tarifa", "Configura el valor de la hora de parqueo."],
  settings: ["Configuración", "Personaliza los datos de tu parqueadero."],
  backup: ["Respaldos", "Mantén segura la información de tu parqueadero."],
};

function prettyDate(now: string) {
  const value = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(now));
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function Workspace({ now, initialUser, initialParkName }: { now: string; initialUser: AppUser | null; initialParkName: string }) {
  const emptyDashboard = useMemo<DashboardData>(() => {
    const date = dayKey(new Date(now));
    return { date, total: 0, cash: 0, transfer: 0, attended: 0, inside: 0, previousTotal: 0, previousAttended: 0,
      recent: [], active: [], closed: false, chart: Array.from({ length: 7 }, (_, i) => ({ day: addDays(date, i - 6), entries: 0, exits: 0 })) };
  }, [now]);
  const [user, setUser] = useState<AppUser | null>(initialUser);
  const [parkName, setParkName] = useState(initialParkName);
  const lastNameChange = useRef(0);
  const [view, setView] = useState(initialUser?.role === "admin" ? "dashboard" : "inside");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [active, setActive] = useState<ParkingItem[]>([]);
  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<ParkingItem | null>(null);
  const [receipt, setReceipt] = useState<ParkingItem | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [plate, setPlate] = useState("");
  const [helmet, setHelmet] = useState("sin_especificar");
  const [entryComment, setEntryComment] = useState("");
  const [comment, setComment] = useState("");
  const [payment, setPayment] = useState("");
  const [finalComment, setFinalComment] = useState("");
  const [search, setSearch] = useState("");
  const [serverNow, setServerNow] = useState(now);
  const clockRef = useRef({ server: new Date(now).getTime(), monotonic: 0 });

  const refresh = useCallback(async (person: AppUser | null) => {
    if (!person) return;
    try {
      const startedAt = performance.now();
      const [parking, report] = await Promise.all([
        api<{ records: ParkingItem[]; now: string; parkName: string }>("/api/parking"),
        person.role === "admin" ? api<DashboardData>("/api/admin?view=dashboard") : Promise.resolve(null),
      ]);
      setActive(parking.records);
      if (startedAt >= lastNameChange.current) setParkName(parking.parkName);
      clockRef.current = { server: new Date(parking.now).getTime(), monotonic: performance.now() };
      setServerNow(parking.now);
      if (report) setDashboard(report);
    } catch (e) {
      if (e instanceof Error && e.message.includes("iniciar sesión")) {
        setUser(null); setDashboard(null); setActive([]); setModal(null); setView("dashboard");
        setNotice("Tu sesión terminó. Inicia sesión de nuevo.");
      }
    }
  }, []);

  useEffect(() => { clockRef.current.monotonic = performance.now(); }, []);
  useEffect(() => { document.title = `${parkName} | Gestión de parqueadero`; }, [parkName]);

  useEffect(() => { if (initialUser) void refresh(initialUser); }, [initialUser, refresh]);

  useEffect(() => {
    const timer = setInterval(() => {
      setServerNow(new Date(clockRef.current.server + performance.now() - clockRef.current.monotonic).toISOString());
      if (user) void refresh(user);
    }, 30_000);
    return () => clearInterval(timer);
  }, [user, refresh]);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(""), 4000); return () => clearTimeout(timer); } }, [notice]);
  useEffect(() => {
    if (!user) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === "motopark-logout") { setUser(null); setDashboard(null); setActive([]); setModal(null); setNotice("Sesión cerrada en otra pestaña."); }
      if (event.key === "motopark-park-name" && event.newValue) { lastNameChange.current = performance.now(); setParkName(event.newValue); }
    };
    const checkSession = () => { if (document.visibilityState === "visible") void refresh(user); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", checkSession);
    document.addEventListener("visibilitychange", checkSession);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("focus", checkSession); document.removeEventListener("visibilitychange", checkSession); };
  }, [user, refresh]);
  const updateParkName = (name: string) => {
    lastNameChange.current = performance.now(); setParkName(name);
    try { localStorage.setItem("motopark-park-name", name); } catch { /* el nombre ya está guardado */ }
  };
  const navigate = (next: string) => {
    setMenuOpen(false); setProfileOpen(false);
    if (!user) return;
    if (user.role !== "admin" && !["inside"].includes(next)) return;
    setView(next); setSearch(""); void refresh(user);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openEntry = () => {
    if (!user) return;
    setPlate(""); setHelmet("sin_especificar"); setEntryComment(""); setError(""); setModal("entry");
  };
  const openRecord = (record: ParkingItem) => {
    if (!user) return;
    setSelected(record); setComment(""); setError(""); setModal("detail");
  };
  const closeModal = () => { if (!busy) { setModal(null); setError(""); } };
  const run = async (task: () => Promise<void>) => {
    setError(""); setBusy(true);
    try { await task(); } catch (e) {
      const text = e instanceof Error ? e.message : "Ocurrió un error.";
      if (text.includes("Debes iniciar sesión")) { setUser(null); setDashboard(null); setActive([]); setModal(null); setNotice("Tu sesión terminó. Inicia sesión de nuevo."); }
      else setError(text);
    } finally { setBusy(false); }
  };
  const login = (e: React.FormEvent) => { e.preventDefault(); void run(async () => {
    const result = await post<{ user: AppUser }>("/api/auth", { action: "login", username: loginName, password: loginPassword });
    setUser(result.user); setView(result.user.role === "admin" ? "dashboard" : "inside"); setModal(null); setLoginPassword(""); setNotice(`¡Bienvenido${result.user.name.endsWith("a") ? "a" : ""}, ${result.user.name}!`); await refresh(result.user);
  }); };
  const logout = async () => {
    try {
      await post("/api/auth", { action: "logout" });
      setUser(null); setDashboard(null); setActive([]); setSelected(null); setReceipt(null); setModal(null); setError(""); setLoginPassword(""); setView("dashboard"); setProfileOpen(false); setNotice("Sesión cerrada correctamente.");
      try { localStorage.setItem("motopark-logout", String(Date.now())); } catch { /* el cierre del servidor ya se completó */ }
    } catch { setNotice("No fue posible cerrar sesión. Inténtalo de nuevo."); }
  };
  const submitEntry = (e: React.FormEvent) => { e.preventDefault(); void run(async () => {
    const result = await post<{ record: ParkingItem }>("/api/parking", { action: "entry", plate, helmet, comment: entryComment });
    setModal(null); setNotice(`Entrada de ${result.record.plate} registrada correctamente.`); setView("inside"); await refresh(user);
  }); };
  const addComment = (e: React.FormEvent) => { e.preventDefault(); if (!selected) return; void run(async () => {
    await post("/api/parking", { action: "comment", id: selected.id, text: comment });
    const result = await api<{ records: ParkingItem[] }>("/api/parking");
    setActive(result.records); setSelected(result.records.find((r) => r.id === selected.id) || selected); setComment(""); setNotice("Comentario agregado.");
  }); };
  const beginCheckout = () => { if (!selected) return; void run(async () => {
    const result = await post<Quote>("/api/parking", { action: "quote", id: selected.id });
    setQuote(result); setPayment(""); setFinalComment(""); setModal("checkout");
  }); };
  const completeCheckout = (e: React.FormEvent) => { e.preventDefault(); if (!selected || !quote) return; void run(async () => {
    try {
      const result = await post<{ record: ParkingItem }>("/api/parking", { action: "checkout", id: selected.id, paymentMethod: payment, comment: finalComment, quotedAmount: quote.amount, quotedHours: quote.hours });
      setReceipt(result.record); setModal("success"); await refresh(user);
    } catch (e) {
      if (e instanceof Error && e.message.includes("El valor cambió")) {
        const updatedQuote = await post<Quote>("/api/parking", { action: "quote", id: selected.id });
        setQuote(updatedQuote);
      }
      throw e;
    }
  }); };
  const changePassword = (e: React.FormEvent) => { e.preventDefault(); void run(async () => {
    await post("/api/auth", { action: "password", currentPassword: oldPassword, newPassword });
    setModal(null); setOldPassword(""); setNewPassword(""); setNotice("Contraseña actualizada correctamente.");
  }); };

  if (!user) return <LoginScreen parkName={parkName} username={loginName} password={loginPassword} onUsername={setLoginName} onPassword={setLoginPassword} onSubmit={login} busy={busy} error={error} notice={notice} />;

  const isAdmin = user.role === "admin";
  const showData = dashboard || emptyDashboard;
  const filtered = active.filter((r) => r.plate.includes(search.toUpperCase().replace(/[\s-]/g, "")));
  const initials = user.name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase();
  const adminMain = [ { id: "dashboard", label: "Panel general", icon: LayoutDashboard }, { id: "inside", label: "Motos dentro", icon: Bike }, { id: "history", label: "Historial", icon: History } ];
  const adminManage = [ { id: "closure", label: "Cierre de caja", icon: Wallet }, { id: "month", label: "Reporte mensual", icon: BarChart3 }, { id: "users", label: "Cuidadores", icon: Users }, { id: "rates", label: "Tarifa", icon: CircleDollarSign } ];

  return <div className="app-shell">
    {menuOpen && <div className="mobile-scrim" onClick={() => setMenuOpen(false)} />}
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand-row"><Brand name={parkName} />{isAdmin && <button className="brand-edit" onClick={() => navigate("settings")} aria-label="Cambiar nombre del parqueadero" title="Cambiar nombre del parqueadero"><Pencil size={14} /></button>}</div><button className="mobile-close icon-plain" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
      <div className="nav-section"><p>PRINCIPAL</p><nav>{(isAdmin ? adminMain : [{ id: "inside", label: "Motos dentro", icon: Bike }]).map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? "active" : ""}`} onClick={() => navigate(id)}><Icon size={18} strokeWidth={1.7} /><span>{label}</span>{id === "inside" && <em>{active.length}</em>}</button>)}{!isAdmin && <button className="nav-item" onClick={openEntry}><Plus size={18} /><span>Registrar entrada</span></button>}</nav></div>
      {isAdmin && <><div className="nav-section manage-section"><p>ADMINISTRACIÓN</p><nav>{adminManage.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? "active" : ""}`} onClick={() => navigate(id)}><Icon size={18} strokeWidth={1.7} /><span>{label}</span></button>)}</nav></div><div className="nav-section tools-section"><p>SISTEMA</p><nav><button className={`nav-item ${view === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}><Settings size={18} strokeWidth={1.7} /><span>Configuración</span></button><button className={`nav-item ${view === "backup" ? "active" : ""}`} onClick={() => navigate("backup")}><Database size={18} strokeWidth={1.7} /><span>Respaldos</span></button></nav></div></>}
      <div className="sidebar-promo"><div className="promo-icon"><ShieldCheck size={17} /></div><div className="promo-orb one" /><div className="promo-orb two" /><h3>Todo bajo<br />control.</h3><p>Tu parqueadero, organizado y en buenas manos.</p><button onClick={() => navigate(user.role === "admin" ? "backup" : "inside")}>Conocer más <ArrowRight size={15} /></button></div>
      <div className="sidebar-caption"><span title={parkName}>{parkName.toUpperCase()}</span><span>© 2026</span></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-title"><button className="mobile-menu icon-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><Menu size={20} /></button><div><div className="title-line"><h1>{titles[view]?.[0] || "Panel general"}</h1></div><p>{view === "dashboard" ? prettyDate(serverNow) : titles[view]?.[1]}</p></div></div><div className="top-actions"><button className="primary-button header-entry" onClick={openEntry}><Plus size={16} /> Registrar entrada</button><button className="icon-button header-search" aria-label="Buscar placa" onClick={() => navigate("inside")}><Search size={19} /></button><button className="icon-button header-bell" aria-label="Notificaciones" onClick={() => setNotice("Estás al día. No tienes notificaciones nuevas.")}><Bell size={18} /><i /></button><div className="profile-wrap"><button className="profile-button" onClick={() => setProfileOpen(!profileOpen)}><span className="avatar">{initials}</span><span className="profile-copy"><strong>{user.name}</strong><small>{user.role === "admin" ? "Administrador" : "Cuidador"}</small></span><ChevronDown size={14} className="profile-chevron" /></button>{profileOpen && <div className="profile-menu"><div><strong>{user?.name}</strong><small>@{user?.username}</small></div><button onClick={() => { setProfileOpen(false); setError(""); setModal("password"); }}>Cambiar contraseña</button><button onClick={() => void logout()}><LogOut size={15} /> Cerrar sesión</button></div>}</div></div></header>
      <div className="content-area">
        {view === "dashboard" && isAdmin && <Dashboard data={showData} now={serverNow} onNavigate={navigate} onEntry={openEntry} onOpen={openRecord} />}
        {view === "inside" && user && <><div className="page-headline"><div><div className="section-eyebrow"><span className="live-dot" /> EN TIEMPO REAL</div><h2>Motos en el parqueadero</h2><p>Encuentra una moto por su placa o registra una nueva entrada.</p></div><button className="primary-button" onClick={openEntry}><Plus size={18} /> Registrar entrada</button></div><article className="card list-card"><div className="list-toolbar"><div><h3>Motos dentro <span className="count-badge">{active.length}</span></h3><p>Listado de vehículos actualmente en el parqueadero</p></div><div className="search-input"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por placa..." aria-label="Buscar por placa" /></div></div>{filtered.length ? <div className="table-scroll"><table><thead><tr><th>PLACA</th><th>ENTRADA</th><th>TIEMPO TRANSCURRIDO</th><th>CASCO</th><th>REGISTRADO POR</th><th>ESTADO</th><th /></tr></thead><tbody>{filtered.map((r) => <tr className="clickable-row" key={r.id} onClick={() => openRecord(r)}><td><span className="plate-table"><span className="plate-icon"><Bike size={16} /></span><b>{r.plate}</b></span></td><td><span className="cell-stack"><b>{shortTime(r.enteredAt)}</b><small>{shortDate(r.enteredAt)}</small></span></td><td><span className="time-chip"><Clock3 size={14} /> {elapsed(r.enteredAt, serverNow)}</span></td><td><HelmetText value={r.helmet} /></td><td>{r.entryUser}</td><td><Status status="dentro" /></td><td><ArrowRight className="row-arrow" size={16} /></td></tr>)}</tbody></table></div> : <Empty search={!!search} title={search ? "No encontramos esa placa" : "No hay motos dentro"} text={search ? "Intenta con otra placa o parte de ella." : "Cuando registres una entrada aparecerá aquí."} />}</article><div className="helper-strip"><span><ShieldCheck size={18} /></span><div><b>Todo en orden</b><p>La hora de entrada se registra automáticamente para cada moto.</p></div></div></>}
        {user?.role === "admin" && !["dashboard", "inside"].includes(view) && <AdminViews key={view} view={view} now={serverNow} parkName={parkName} onParkNameChange={updateParkName} onOpenRecord={openRecord} onNotice={setNotice} />}
      </div>
    </main>
    {notice && <div className="toast"><CheckCircle2 size={18} /> {notice}</div>}
    {modal === "password" && <Modal title="Cambiar contraseña" subtitle="Mantén segura tu cuenta." onClose={closeModal}><form className="modal-form" onSubmit={changePassword}><Field label="Contraseña actual"><input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required /></Field><Field label="Nueva contraseña" hint="Debe tener al menos 8 caracteres."><input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></Field>{error && <div className="form-error">{error}</div>}<button className="primary-button full" disabled={busy}>Guardar contraseña</button></form></Modal>}
    {modal === "entry" && <Modal title="Registrar entrada" subtitle="Una nueva moto está por entrar al parqueadero." onClose={closeModal}><form onSubmit={submitEntry} className="modal-form"><Field label="Placa de la moto *" hint="Tres letras, dos números y una letra o número. Ejemplo: ABC12D."><input autoFocus className="plate-input" placeholder="ABC12D" maxLength={6} value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} required /></Field><div className="field"><span>¿Dejó casco? <small className="optional">Opcional</small></span><div className="segmented">{[["sin_especificar", "Sin especificar"], ["si", "Sí"], ["no", "No"]].map(([value, label]) => <button type="button" key={value} className={helmet === value ? "selected" : ""} onClick={() => setHelmet(value)}>{label}</button>)}</div></div><Field label="Comentario" hint="Opcional. Agrega alguna novedad sobre la moto."><textarea rows={3} maxLength={1000} value={entryComment} onChange={(e) => setEntryComment(e.target.value)} placeholder="Escribe un comentario..." /></Field><div className="info-box"><Clock3 size={17} /><span>La hora de entrada se registrará automáticamente.</span></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>Cancelar</button><button className="primary-button" disabled={busy}><Plus size={17} /> {busy ? "Guardando..." : "Registrar entrada"}</button></div></form></Modal>}
    {modal === "detail" && selected && <Modal title="Detalle de la moto" subtitle="Información del movimiento y novedades." onClose={closeModal} wide><div className="detail-plate-row"><div><small>PLACA</small><strong>{selected.plate}</strong></div><Status status={selected.status} /></div><div className="detail-grid"><div><span>Hora de entrada</span><b>{shortTime(selected.enteredAt)}</b><small>{shortDate(selected.enteredAt)}</small></div><div><span>{selected.status === "dentro" ? "Tiempo transcurrido" : "Hora de salida"}</span><b>{selected.status === "dentro" ? elapsed(selected.enteredAt, serverNow) : shortTime(selected.exitedAt)}</b><small>{selected.status === "dentro" ? "Hasta este momento" : shortDate(selected.exitedAt)}</small></div><div><span>¿Dejó casco?</span><b><HelmetText value={selected.helmet} /></b><small>Información de entrega</small></div><div><span>Registrado por</span><b>{selected.entryUser}</b><small>{selected.exitUser ? `Salida: ${selected.exitUser}` : "Cuidador de entrada"}</small></div></div>{selected.status === "pagado" && <div className="paid-summary"><CheckCircle2 size={20} /><div><strong>{money(selected.amount)} · {selected.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"}</strong><small>{selected.billableHours} {selected.billableHours === 1 ? "hora cobrada" : "horas cobradas"}</small></div></div>}<div className="comments-heading"><h3>Comentarios <span>{selected.comments.length}</span></h3><p>Las novedades quedan guardadas con fecha y autor.</p></div><div className="comments-list">{selected.comments.length ? selected.comments.map((c) => <div className="comment-item" key={c.id}><span className="comment-avatar"><MessageCircle size={15} /></span><div><p>{c.text}</p><small>{c.author} · {shortDate(c.createdAt)} · {shortTime(c.createdAt)}</small></div></div>) : <p className="no-comments">Aún no hay comentarios para esta moto.</p>}</div>{selected.status === "dentro" && <form className="comment-form" onSubmit={addComment}><input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="Agregar un comentario..." required /><button className="secondary-button" disabled={busy}>Agregar</button></form>}{error && <div className="form-error">{error}</div>}<div className="modal-actions detail-actions"><button className="secondary-button" onClick={closeModal}>Cerrar</button>{selected.status === "dentro" && <button className="primary-button" disabled={busy} onClick={beginCheckout}>Finalizar y cobrar <ArrowRight size={17} /></button>}</div></Modal>}
    {modal === "checkout" && selected && quote && <Modal title="Finalizar y cobrar" subtitle={`Salida de la moto ${selected.plate}`} onClose={closeModal}><form className="modal-form" onSubmit={completeCheckout}><button type="button" className="back-link" onClick={() => { setError(""); setModal("detail"); }}><ArrowLeft size={15} /> Volver al detalle</button>{selected.helmet === "si" && <div className="helmet-alert"><AlertTriangle size={20} /><span><b>Esta moto dejó casco.</b><br />Recuerda entregarlo antes de finalizar.</span></div>}<div className="charge-box"><span>VALOR A COBRAR</span><strong>{money(quote.amount)}</strong><p>{quote.hours} {quote.hours === 1 ? "hora cobrada" : "horas cobradas"} · Tiempo: {elapsed(selected.enteredAt, quote.quotedAt)}</p></div><div className="field"><span>Método de pago *</span><div className="payment-options"><button type="button" className={payment === "efectivo" ? "selected" : ""} onClick={() => setPayment("efectivo")}><Wallet size={20} /> Efectivo {payment === "efectivo" && <Check size={16} />}</button><button type="button" className={payment === "transferencia" ? "selected" : ""} onClick={() => setPayment("transferencia")}><CreditCard size={20} /> Transferencia {payment === "transferencia" && <Check size={16} />}</button></div></div><Field label="Comentario final" hint="Opcional"><textarea rows={2} value={finalComment} maxLength={1000} onChange={(e) => setFinalComment(e.target.value)} placeholder="Agregar una novedad..." /></Field><p className="fine-print">El valor final se calcula al confirmar, con la hora del servidor y la tarifa vigente.</p>{error && <div className="form-error">{error}</div>}<button className="primary-button full" disabled={busy || !payment}>{busy ? "Confirmando..." : "Confirmar pago y salida"} <ArrowRight size={17} /></button></form></Modal>}
    {modal === "success" && receipt && <Modal title="Pago registrado" subtitle="La salida se completó correctamente." onClose={closeModal}><div className="success-content"><span className="success-icon"><Check size={30} /></span><p>La moto <b>{receipt.plate}</b> ha salido del parqueadero.</p><strong>{money(receipt.amount)}</strong><small>{receipt.billableHours} {receipt.billableHours === 1 ? "hora cobrada" : "horas cobradas"} · {receipt.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"}</small>{receipt.helmet === "si" && <div className="helmet-alert"><AlertTriangle size={19} /> Recuerda entregar el casco.</div>}<button className="primary-button full" onClick={closeModal}>Listo</button></div></Modal>}
  </div>;
}
