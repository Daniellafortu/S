"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import Brand from "./brand";

type Props = {
  parkName: string;
  username: string;
  password: string;
  onUsername: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
  error: string;
  notice: string;
};

export default function LoginScreen({ parkName, username, password, onUsername, onPassword, onSubmit, busy, error, notice }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  return <div className="auth-screen">
    <header className="auth-header"><Brand name={parkName} /><div className="auth-header-note"><ShieldCheck size={16} /> ACCESO SEGURO</div></header>
    <main className="auth-layout">
      <section className="auth-story" aria-label={parkName}>
        <div className="auth-story-orb orb-one" /><div className="auth-story-orb orb-two" />
        <div className="auth-story-copy"><span className="auth-story-label"><span /> TU PARQUEADERO, MÁS SIMPLE</span><h1>Todo en orden.<br /><em>Siempre contigo.</em></h1><p>La manera más sencilla de llevar el control de tu parqueadero de motos.</p></div>
        <div className="auth-illustration" aria-hidden="true">
          <div className="illustration-ring ring-one" /><div className="illustration-ring ring-two" />
          <svg viewBox="0 0 420 230" fill="none"><circle cx="91" cy="168" r="42" stroke="#A6E6B8" strokeWidth="4"/><circle cx="91" cy="168" r="27" stroke="#5BA879" strokeWidth="2"/><circle cx="323" cy="168" r="42" stroke="#A6E6B8" strokeWidth="4"/><circle cx="323" cy="168" r="27" stroke="#5BA879" strokeWidth="2"/><circle cx="91" cy="168" r="5" fill="#C7F3D3"/><circle cx="323" cy="168" r="5" fill="#C7F3D3"/><path d="M91 168L131 121L163 168H91ZM163 168H235L267 118M163 168L192 116M235 168H272L301 112L323 168M272 168H323" stroke="#C7F3D3" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><path d="M118 119H173C184 119 190 112 191 102H145C132 102 124 108 118 119Z" fill="#82DCA1"/><path d="M190 104L211 83H242L269 118H219C204 118 195 113 190 104Z" fill="#B6F1C8"/><path d="M273 117L286 83L308 80M277 94H308M305 81L319 87" stroke="#C7F3D3" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><path d="M188 126H238L247 145L233 160H188L177 145L188 126Z" fill="#428E60" stroke="#A6E6B8" strokeWidth="3"/><path d="M186 141H236M199 129L196 157M211 129L208 157M223 129L220 157" stroke="#C7F3D3" strokeWidth="2" strokeLinecap="round"/><path d="M50 215H364" stroke="#8CD5A2" strokeOpacity=".25" strokeWidth="2" strokeLinecap="round"/><path d="M39 103H80M26 116H68M45 129H73" stroke="#A6E6B8" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round"/></svg>
          <div className="auth-floating-chip"><span><Check size={14} /></span><div><b>Todo bajo control</b><small>Tu operación, más fácil</small></div></div>
        </div>
        <div className="auth-story-footer"><span><ShieldCheck size={18} /></span><p><b>Información protegida</b><br />Solo tu equipo autorizado puede ingresar.</p></div>
      </section>
      <section className="auth-form-area"><div className="auth-form-inner">
        <div className="auth-form-icon"><KeyRound size={22} /></div>
        <div className="auth-eyebrow">Bienvenido a {parkName}</div><h2>Iniciar sesión</h2><p className="auth-subtitle">Ingresa tus datos para acceder a tu parqueadero.</p>
        {notice && <div className="auth-notice" role="status"><Check size={16} /> {notice}</div>}
        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-field"><span>Usuario</span><div className="auth-input"><UserRound size={18} /><input autoComplete="username" value={username} onChange={(e) => onUsername(e.target.value)} placeholder="Ingresa tu usuario" required /></div></label>
          <label className="auth-field"><span>Contraseña</span><div className="auth-input"><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} autoComplete="current-password" aria-describedby="password-case-hint" value={password} onChange={(e) => onPassword(e.target.value)} placeholder="Ingresa tu contraseña" required /><button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small className="auth-field-help" id="password-case-hint">La contraseña distingue mayúsculas y minúsculas.</small></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button auth-submit" disabled={busy}>{busy ? "Ingresando..." : "Iniciar sesión"} <ArrowRight size={18} /></button>
        </form>
        <div className="auth-security"><LockKeyhole size={15} /><span>Acceso exclusivo para personal autorizado.</span></div>
        <p className="auth-help">¿Necesitas acceso? <b>Contacta al administrador.</b></p>
      </div></section>
    </main>
    <footer className="auth-page-footer"><span>© 2026 {parkName}</span><span>Hecho para que tu día ruede mejor <span>♥</span></span></footer>
  </div>;
}
