"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, Bike, ChevronDown, CircleDollarSign, Clock3, CreditCard, Ellipsis, HandCoins, MessageCircle, Plus, ReceiptText, ShieldCheck, Wallet, WalletCards } from "lucide-react";
import { elapsed, money, shortTime } from "@/lib/dates";
import type { DashboardData, ParkingItem } from "@/lib/types";
import { Empty, Status } from "./ui";

type Props = { data: DashboardData; now: string; onNavigate: (view: string) => void; onEntry: () => void; onOpen: (record: ParkingItem) => void; };

function change(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="delta neutral">Hoy</span>;
  return <span className={`delta ${value < 0 ? "negative" : ""}`}>{value < 0 ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}{Math.abs(value).toLocaleString("es-CO")}%</span>;
}
function weekday(day: string) {
  const result = new Intl.DateTimeFormat("es-CO", { weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`)).replace(".", "");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export default function Dashboard({ data, now, onNavigate, onEntry, onOpen }: Props) {
  const avg = data.attended ? Math.round(data.total / data.attended) : 0;
  const cashPercent = data.total ? Math.round(data.cash / data.total * 100) : 0;
  const transferPercent = data.total ? 100 - cashPercent : 0;
  const maxChart = Math.max(10, Math.ceil(Math.max(...data.chart.flatMap((item) => [item.entries, item.exits]), 1) / 10) * 10);
  return <>
    <div className="dashboard-intro"><div><div className="section-eyebrow"><span className="live-dot" /> {data.closed ? "CAJA CERRADA" : "RESUMEN EN TIEMPO REAL"}</div><h2>Un vistazo a tu parqueadero</h2><p>Todo lo que necesitas saber sobre la actividad de hoy.</p></div><button className="intro-link" onClick={() => onNavigate("history")}>Ver movimientos <ArrowRight size={16} /></button></div>
    <div className="dashboard-grid">
      <div className="dashboard-main">
        <div className="metrics-grid">
          <article className="metric-card metric-featured">
            <div className="metric-top"><span className="metric-icon light"><WalletCards size={20} strokeWidth={1.7} /></span><Delta value={change(data.total, data.previousTotal)} /></div>
            <p className="metric-label">Recaudado hoy</p><div className="metric-bottom"><strong>{money(data.total)}</strong><span>Ingresos del<br />día de hoy</span></div>
            <div className="metric-pattern" />
          </article>
          <article className="metric-card">
            <div className="metric-top"><span className="metric-icon mint"><ReceiptText size={20} strokeWidth={1.7} /></span><Delta value={change(data.attended, data.previousAttended)} /></div>
            <p className="metric-label">Motos atendidas</p><div className="metric-bottom"><strong>{data.attended}</strong><span>Salidas registradas<br />el día de hoy</span></div>
          </article>
          <article className="metric-card">
            <div className="metric-top"><span className="metric-icon sand"><Bike size={21} strokeWidth={1.7} /></span><span className="mini-live"><i /> En vivo</span></div>
            <p className="metric-label">Motos dentro</p><div className="metric-bottom"><strong>{data.inside}</strong><span>En el parqueadero<br />ahora mismo</span></div>
          </article>
          <article className="metric-card">
            <div className="metric-top"><span className="metric-icon lavender"><CircleDollarSign size={21} strokeWidth={1.7} /></span><span className="delta neutral">Hoy</span></div>
            <p className="metric-label">Promedio por moto</p><div className="metric-bottom"><strong>{money(avg)}</strong><span>Valor promedio<br />por salida</span></div>
          </article>
        </div>
        <article className="card chart-card">
          <div className="card-heading"><div><h3>Flujo de motos</h3><p>Entradas y salidas de tu parqueadero</p></div><span className="select-look">Últimos 7 días <ChevronDown size={14} /></span></div>
          <div className="chart-legend"><span><i className="legend-dot green" /> Entradas</span><span><i className="legend-dot deep" /> Salidas</span></div>
          <div className="bar-chart" aria-label="Gráfico de entradas y salidas de los últimos siete días">
            <div className="chart-y">{[4, 3, 2, 1, 0].map((v) => <span key={v}>{Math.round(maxChart * v / 4)}</span>)}</div>
            <div className="chart-plot"><div className="gridlines"><i /><i /><i /><i /><i /></div><div className="bar-groups">{data.chart.map((item) => <div className="bar-group" key={item.day}>
              <div className="bars"><div title={`${item.entries} entradas`} className="bar bar-entry" style={{ height: `${item.entries / maxChart * 100}%` }} /><div title={`${item.exits} salidas`} className="bar bar-exit" style={{ height: `${item.exits / maxChart * 100}%` }} /></div>
              <span>{weekday(item.day)}</span>
            </div>)}</div></div>
          </div>
          <div className="chart-footer"><span><span className="small-sparkle">✳</span> La actividad de tu parqueadero, día a día</span><button onClick={() => onNavigate("history")}>Ver detalle <ArrowRight size={14} /></button></div>
        </article>
      </div>
      <div className="dashboard-aside">
        <article className="card distribution-card">
          <div className="card-heading"><div><h3>Distribución de pagos</h3><p>Ingresos por método de pago</p></div><span className="select-look">Hoy <ChevronDown size={14} /></span></div>
          <div className="donut-wrap"><svg viewBox="0 0 200 200" role="img" aria-label={`${cashPercent}% efectivo y ${transferPercent}% transferencia`}><circle cx="100" cy="100" r="76" fill="none" stroke="#d3e4d9" strokeWidth="27" /><circle cx="100" cy="100" r="76" fill="none" stroke="#064a31" strokeWidth="27" pathLength="100" strokeDasharray={`${cashPercent} ${100 - cashPercent}`} transform="rotate(-90 100 100)" /><circle cx="100" cy="100" r="76" fill="none" stroke="#17b871" strokeWidth="27" pathLength="100" strokeDasharray={`${transferPercent} ${100 - transferPercent}`} strokeDashoffset={`${-cashPercent}`} transform="rotate(-90 100 100)" /></svg><div className="donut-center"><span>TOTAL DEL DÍA</span><strong>{money(data.total)}</strong><small>en ingresos</small></div></div>
          <div className="payment-list"><div className="payment-row"><span className="payment-label"><i className="legend-dot deep" /> Efectivo</span><strong>{money(data.cash)}</strong><span>{cashPercent}%</span></div><div className="payment-row"><span className="payment-label"><i className="legend-dot green" /> Transferencia</span><strong>{money(data.transfer)}</strong><span>{transferPercent}%</span></div></div>
          <button className="text-link distribution-link" onClick={() => onNavigate("closure")}>Ir al cierre de caja <ArrowRight size={15} /></button>
        </article>
        <article className="card inside-card">
          <div className="card-heading"><div><h3>Motos dentro</h3><p>Actividad en este momento</p></div><button className="icon-plain" aria-label="Ver motos dentro" onClick={() => onNavigate("inside")}><Ellipsis size={20} /></button></div>
          <div className="inside-list">{data.active.length ? data.active.slice(0, 3).map((r, index) => <button className="inside-row" key={r.id} onClick={() => onOpen(r)}><span className={`bike-avatar bike-avatar-${index}`}><Bike size={17} /></span><span className="inside-name"><b>{r.plate}</b><small>Entrada {shortTime(r.enteredAt)}</small></span><span className="inside-time">{elapsed(r.enteredAt, now)}</span></button>) : <div className="mini-empty">No hay motos dentro en este momento.</div>}</div>
          <button className="text-link inside-link" onClick={() => onNavigate("inside")}>Ver todas las motos <ArrowRight size={15} /></button>
        </article>
      </div>
    </div>
    <article className="card recent-card">
      <div className="card-heading recent-heading"><div><h3>Movimientos recientes</h3><p>Las últimas entradas y salidas del parqueadero</p></div><div className="heading-actions"><button className="secondary-button" onClick={() => onNavigate("history")}>Ver historial <ArrowRight size={15} /></button><button className="primary-button small" onClick={onEntry}><Plus size={16} /> Registrar entrada</button></div></div>
      {data.recent.length ? <div className="table-scroll"><table><thead><tr><th>PLACA</th><th>HORA DE ENTRADA</th><th>HORA DE SALIDA</th><th>VALOR</th><th>MÉTODO DE PAGO</th><th>CUIDADOR</th><th>CASCO</th><th>COMENTARIOS</th><th>ESTADO</th><th /></tr></thead><tbody>{data.recent.map((r) => <tr key={r.id} onClick={() => onOpen(r)} className="clickable-row"><td><span className="plate-table"><span className="plate-icon"><Bike size={16} /></span><b>{r.plate}</b></span></td><td>{shortTime(r.enteredAt)}</td><td>{shortTime(r.exitedAt)}</td><td className="table-strong">{r.amount !== null ? money(r.amount) : "—"}</td><td>{r.paymentMethod === "efectivo" ? <span className="method"><HandCoins size={15} /> Efectivo</span> : r.paymentMethod === "transferencia" ? <span className="method"><CreditCard size={15} /> Transferencia</span> : "—"}</td><td>{r.exitUser || r.entryUser}</td><td>{r.helmet === "si" ? "Sí" : r.helmet === "no" ? "No" : "Sin especificar"}</td><td><span className="comment-preview">{r.comments.length ? r.comments[r.comments.length - 1].text : "—"}</span></td><td><Status status={r.status} /></td><td><ArrowRight size={15} className="row-arrow" /></td></tr>)}</tbody></table></div> : <Empty title="Aún no hay movimientos" text="Registra la primera entrada para comenzar a ver actividad aquí." />}
      <div className="recent-footer"><span><ShieldCheck size={15} /> Información actualizada de forma segura</span><button onClick={() => onNavigate("history")}>Ver todos los movimientos <ArrowRight size={14} /></button></div>
    </article>
    <div className="dashboard-bottom-note"><span><Clock3 size={14} /> Horarios en hora de Colombia</span><span>Hecho para que tu día ruede mejor <span className="heart">♥</span></span></div>
  </>;
}
