"use client";

import { X, Search, Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-label={title} className={`modal ${wide ? "modal-wide" : ""}`} onMouseDown={(e) => e.stopPropagation()}>
    <div className="modal-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button modal-close" onClick={onClose} aria-label="Cerrar"><X size={19} /></button></div>
    {children}
  </section></div>;
}

export function Empty({ title, text, search = false }: { title: string; text: string; search?: boolean }) {
  return <div className="empty-state"><div className="empty-icon">{search ? <Search size={22} /> : <Inbox size={22} />}</div><strong>{title}</strong><p>{text}</p></div>;
}

export function Status({ status }: { status: string }) {
  return <span className={`status ${status === "dentro" || status === "activo" ? "status-green" : status === "pagado" || status === "cerrado" ? "status-gray" : "status-muted"}`}><i />{status === "dentro" ? "Dentro" : status === "pagado" ? "Pagado" : status === "activo" ? "Activo" : status === "cerrado" ? "Cerrado" : "Inactivo"}</span>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function HelmetText({ value }: { value: string }) {
  return <span>{value === "si" ? "Sí" : value === "no" ? "No" : "Sin especificar"}</span>;
}
