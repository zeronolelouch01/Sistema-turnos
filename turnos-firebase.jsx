// ╔══════════════════════════════════════════════════════════════════╗
// ║         SISTEMA DE TURNOS — Conectado a Firebase                ║
// ║  Firestore en tiempo real · Auth · Multi-sucursal               ║
// ╚══════════════════════════════════════════════════════════════════╝

import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, setDoc, getDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCyHV9eqiHstrViQNpZOK_dQfM0yNU1QJI",
  authDomain: "turnos-produccion.firebaseapp.com",
  projectId: "turnos-produccion",
  storageBucket: "turnos-produccion.firebasestorage.app",
  messagingSenderId: "1027210944071",
  appId: "1:1027210944071:web:e0a4561e7729d0cd13db62"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const CATEGORIES = ["Contratacion Nueva", "Cita con Ejecutivo", "Aclaraciones", "Pago de Servicio", "Recargas"];
const CAT_PREFIX = { General:"G", Créditos:"C", Cuentas:"A", Inversiones:"I", Reclamos:"R" };
const EXEC_COLORS = ["#00C9A7","#845EF7","#FF6B6B","#F7B731","#26de81","#fd9644","#a55eea","#45aaf2"];

function ticketNumber(cat) {
  return `${CAT_PREFIX[cat]||"T"}${String(Math.floor(Math.random()*900)+100)}`;
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Ico = {
  ticket:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 1 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 0-4V7a2 2 0 0 1 2-2z"/></svg>,
  user:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  check:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  skip:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>,
  clock:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  tv:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  logout:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  branch:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  plus:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  sound:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
};

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const S = {
  btn: (color="#00C9A7", ghost=false) => ({
    display:"flex", alignItems:"center", gap:"6px",
    padding:"10px 20px", borderRadius:"10px", fontSize:"13px",
    fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
    border: ghost ? `1.5px solid ${color}55` : "none",
    background: ghost ? `${color}15` : color,
    color: ghost ? color : color==="#00C9A7"?"#000":"#fff",
    transition:"all .2s",
  }),
  card: (accent="rgba(255,255,255,0.06)") => ({
    background:"rgba(255,255,255,0.03)",
    border:`1px solid ${accent}`,
    borderRadius:"18px", padding:"22px",
  }),
  input: {
    width:"100%", padding:"11px 14px", boxSizing:"border-box",
    background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
    borderRadius:"10px", color:"#fff", fontSize:"14px",
    fontFamily:"'DM Sans',sans-serif", outline:"none",
  },
  label: { color:"#8892A4", fontSize:"12px", letterSpacing:"1px", display:"block", marginBottom:"6px" },
};

// ─── USEELAPSED HOOK ──────────────────────────────────────────────────────────
function useElapsed(startTs) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startTs) { setElapsed(0); return; }
    const start = startTs.toDate ? startTs.toDate() : new Date(startTs);
    const iv = setInterval(() => setElapsed(Math.floor((Date.now()-start)/1000)), 1000);
    return () => clearInterval(iv);
  }, [startTs]);
  return elapsed;
}
function fmt(s) { return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`; }

// ─── SOUND ALERT ──────────────────────────────────────────────────────────────
function playBeep() {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    [0,150,300].forEach(d => {
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value=880; g.gain.setValueAtTime(0.3,ctx.currentTime+d/1000);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+d/1000+0.15);
      o.start(ctx.currentTime+d/1000); o.stop(ctx.currentTime+d/1000+0.15);
    });
  } catch(e){}
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [email,setEmail]=useState(""); const [pass,setPass]=useState("");
  const [error,setError]=useState(""); const [loading,setLoading]=useState(false);

  const handle = async () => {
    setLoading(true); setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const snap = await getDoc(doc(db,"users",cred.user.uid));
      if (snap.exists()) onLogin({ uid:cred.user.uid, ...snap.data() });
      else setError("Usuario no configurado en el sistema.");
    } catch(e) {
      setError("Correo o contraseña incorrectos.");
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#080B12,#0D1B2A)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Bebas+Neue&display=swap" rel="stylesheet"/>
      <div style={{width:"100%",maxWidth:"380px",padding:"0 20px"}}>
        <div style={{textAlign:"center",marginBottom:"40px"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"52px",color:"#fff",letterSpacing:"4px",lineHeight:1}}>TURNOS</div>
          <div style={{color:"#00C9A7",fontSize:"12px",letterSpacing:"3px",marginTop:"4px"}}>SISTEMA DE ATENCIÓN</div>
        </div>
        <div style={{...S.card("rgba(255,255,255,0.08)"),padding:"32px"}}>
          <div style={{marginBottom:"16px"}}>
            <label style={S.label}>CORREO</label>
            <input style={S.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="usuario@empresa.com"/>
          </div>
          <div style={{marginBottom:"24px"}}>
            <label style={S.label}>CONTRASEÑA</label>
            <input style={S.input} type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} placeholder="••••••••"/>
          </div>
          {error && <div style={{color:"#FF6B6B",fontSize:"13px",marginBottom:"16px",textAlign:"center"}}>{error}</div>}
          <button onClick={handle} disabled={loading} style={{...S.btn(),width:"100%",justifyContent:"center",padding:"14px",fontSize:"14px"}}>
            {loading ? "Ingresando..." : "Ingresar →"}
          </button>
        </div>
        <div style={{textAlign:"center",color:"#4A5568",fontSize:"12px",marginTop:"20px"}}>
          Contacta al administrador para obtener acceso
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TABLET VIEW — Kiosko de emisión de turnos
// ══════════════════════════════════════════════════════════════════════════════
function TabletView({ branchId, branchName, executives, queue }) {
  const [selected, setSelected]=useState(null);
  const [issued, setIssued]=useState(null);
  const [busy, setBusy]=useState(false);

  // Categorías disponibles según ejecutivos activos en esta sucursal
  const availableCats = [...new Set(
    executives.filter(e=>e.active&&e.branchId===branchId).flatMap(e=>e.categories||[])
  )];

  const assignExecutive = (cat) => {
    const pool = executives.filter(e=>e.active&&e.branchId===branchId&&(e.categories||[]).includes(cat));
    if (!pool.length) return null;
    const scored = pool.map(e=>{
      const inQ = queue.filter(t=>t.executiveId===e.id&&t.status==="waiting").length;
      return { id:e.id, score: inQ/e.maxQueue + (e.priority==="high"?-0.2:0) };
    });
    scored.sort((a,b)=>a.score-b.score);
    return scored[0].id;
  };

  const handleIssue = async () => {
    if (!selected||busy) return;
    setBusy(true);
    const execId = assignExecutive(selected);
    const ticket = {
      number: ticketNumber(selected),
      category: selected,
      status: "waiting",
      branchId,
      executiveId: execId,
      createdAt: serverTimestamp(),
      servedAt: null,
      finishedAt: null,
    };
    const ref = await addDoc(collection(db,"tickets"), ticket);
    setIssued({ ...ticket, id:ref.id });
    setBusy(false);
    setTimeout(()=>{ setIssued(null); setSelected(null); }, 6000);
  };

  const waitCount = queue.filter(t=>t.status==="waiting"&&t.branchId===branchId).length;

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0A0E1A,#0D1B2A,#0A1628)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px",fontFamily:"'DM Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Bebas+Neue&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{textAlign:"center",marginBottom:"48px"}}>
        <div style={{fontSize:"11px",letterSpacing:"4px",color:"#00C9A7",textTransform:"uppercase",marginBottom:"10px"}}>
          {Ico.branch}&nbsp; {branchName}
        </div>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(44px,8vw,78px)",color:"#fff",margin:0,letterSpacing:"3px",lineHeight:1}}>OBTÉN TU TURNO</h1>
        <div style={{display:"flex",gap:"20px",justifyContent:"center",marginTop:"18px"}}>
          <span style={{color:"#8892A4",fontSize:"13px",display:"flex",alignItems:"center",gap:"6px"}}>
            <span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#00C9A7",display:"inline-block",animation:"pulse 2s infinite"}}/>
            {executives.filter(e=>e.active&&e.branchId===branchId).length} ejecutivos activos
          </span>
          <span style={{color:"#8892A4",fontSize:"13px"}}>{waitCount} en espera</span>
        </div>
      </div>

      {issued ? (
        <div style={{...S.card("rgba(0,201,167,0.3)"),textAlign:"center",padding:"48px 64px",animation:"fadeIn .5s ease"}}>
          <div style={{fontSize:"56px",marginBottom:"8px"}}>🎫</div>
          <div style={{color:"#00C9A7",fontSize:"12px",letterSpacing:"3px",textTransform:"uppercase",marginBottom:"10px"}}>Tu turno es</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"96px",color:"#fff",lineHeight:1,letterSpacing:"4px"}}>{issued.number}</div>
          <div style={{color:"#8892A4",marginTop:"6px",fontSize:"14px"}}>{issued.category}</div>
          <div style={{marginTop:"24px",padding:"12px 24px",background:"rgba(255,255,255,0.05)",borderRadius:"12px",color:"#fff",fontSize:"13px"}}>
            Espera ser llamado · Posición #{waitCount}
          </div>
        </div>
      ) : (
        <div style={{width:"100%",maxWidth:"640px"}}>
          <div style={{color:"#8892A4",fontSize:"12px",textAlign:"center",marginBottom:"18px",letterSpacing:"1px"}}>Selecciona el tipo de atención</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"12px",marginBottom:"28px"}}>
            {(availableCats.length ? availableCats : CATEGORIES).map(cat=>(
              <button key={cat} onClick={()=>setSelected(cat)} style={{background:selected===cat?"rgba(0,201,167,0.15)":"rgba(255,255,255,0.04)",border:`1.5px solid ${selected===cat?"#00C9A7":"rgba(255,255,255,0.08)"}`,borderRadius:"16px",padding:"22px 16px",color:selected===cat?"#00C9A7":"#B0BAC9",fontSize:"15px",fontWeight:selected===cat?600:400,cursor:"pointer",transition:"all .2s",fontFamily:"'DM Sans',sans-serif",transform:selected===cat?"scale(1.04)":"scale(1)"}}>
                {cat}
              </button>
            ))}
          </div>
          <button onClick={handleIssue} disabled={!selected||busy} style={{width:"100%",padding:"20px",background:selected?"linear-gradient(135deg,#00C9A7,#00A896)":"rgba(255,255,255,0.06)",border:"none",borderRadius:"16px",color:selected?"#000":"#4A5568",fontSize:"17px",fontWeight:700,cursor:selected?"pointer":"not-allowed",transition:"all .3s",fontFamily:"'DM Sans',sans-serif"}}>
            {busy?"Generando turno...":"Generar Turno →"}
          </button>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes fadeIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DISPLAY SCREEN — Pantalla TV sala de espera
// ══════════════════════════════════════════════════════════════════════════════
function DisplayScreen({ branchId, branchName, queue, executives }) {
  const serving = queue.filter(t=>t.status==="serving"&&t.branchId===branchId);
  const waiting = queue.filter(t=>t.status==="waiting"&&t.branchId===branchId).slice(0,8);
  const prevServing = useRef([]);

  useEffect(()=>{
    const newOnes = serving.filter(t=>!prevServing.current.find(p=>p.id===t.id));
    if (newOnes.length) playBeep();
    prevServing.current = serving;
  },[serving]);

  const getExecName = (id) => executives.find(e=>e.id===id)?.name?.split(" ")[0] || "Módulo";

  return (
    <div style={{minHeight:"100vh",background:"#060810",fontFamily:"'DM Sans',sans-serif",padding:"32px",color:"#fff"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Bebas+Neue&display=swap" rel="stylesheet"/>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"40px",borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:"20px"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"36px",letterSpacing:"4px",color:"#00C9A7"}}>TURNOS · {branchName.toUpperCase()}</div>
        <div style={{color:"#4A5568",fontSize:"14px"}}>{new Date().toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"})}</div>
      </div>

      {/* Turnos siendo atendidos */}
      <div style={{marginBottom:"40px"}}>
        <div style={{color:"#4A5568",fontSize:"11px",letterSpacing:"3px",textTransform:"uppercase",marginBottom:"16px"}}>Pase al módulo</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"16px"}}>
          {serving.length===0 && (
            <div style={{color:"#2D3748",fontSize:"16px",padding:"32px",textAlign:"center"}}>Sin turnos activos</div>
          )}
          {serving.map(t=>{
            const exec = executives.find(e=>e.id===t.executiveId);
            return (
              <div key={t.id} style={{background:`${exec?.color||"#00C9A7"}12`,border:`2px solid ${exec?.color||"#00C9A7"}55`,borderRadius:"20px",padding:"28px 32px",animation:"fadeIn .5s ease"}}>
                <div style={{color:exec?.color||"#00C9A7",fontSize:"11px",letterSpacing:"2px",marginBottom:"8px"}}>PASE AL MÓDULO</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"72px",lineHeight:1,letterSpacing:"3px"}}>{t.number}</div>
                <div style={{color:"#8892A4",marginTop:"8px",fontSize:"14px"}}>con {getExecName(t.executiveId)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cola de espera */}
      <div>
        <div style={{color:"#4A5568",fontSize:"11px",letterSpacing:"3px",textTransform:"uppercase",marginBottom:"16px"}}>Próximos en espera</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"10px"}}>
          {waiting.map((t,i)=>(
            <div key={t.id} style={{padding:"10px 20px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",display:"flex",gap:"12px",alignItems:"center"}}>
              <span style={{color:"#4A5568",fontSize:"12px"}}>#{i+1}</span>
              <span style={{fontWeight:700,fontSize:"18px",fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"1px"}}>{t.number}</span>
              <span style={{color:"#4A5568",fontSize:"12px"}}>{t.category}</span>
            </div>
          ))}
          {waiting.length===0&&<div style={{color:"#2D3748",fontSize:"14px"}}>No hay turnos en espera</div>}
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXECUTIVE VIEW
// ══════════════════════════════════════════════════════════════════════════════
function ExecutiveView({ user, executives, queue }) {
  const exec = executives.find(e=>e.uid===user.uid);
  if (!exec) return <div style={{color:"#fff",padding:"40px",textAlign:"center",fontFamily:"'DM Sans',sans-serif"}}>Ejecutivo no configurado. Contacta al administrador.</div>;

  const myQueue   = queue.filter(t=>t.executiveId===exec.id&&t.status==="waiting");
  const current   = queue.find(t=>t.executiveId===exec.id&&t.status==="serving");
  const served    = queue.filter(t=>t.executiveId===exec.id&&t.status==="served").length;
  const elapsed   = useElapsed(current?.servedAt);
  const overTime  = elapsed > exec.avgTime*60;

  const callNext = async () => {
    const next = myQueue[0]; if(!next) return;
    await updateDoc(doc(db,"tickets",next.id),{ status:"serving", servedAt:serverTimestamp() });
    playBeep();
  };
  const finalize = async () => {
    if(!current) return;
    await updateDoc(doc(db,"tickets",current.id),{ status:"served", finishedAt:serverTimestamp() });
  };
  const skip = async () => {
    if(!current) return;
    await updateDoc(doc(db,"tickets",current.id),{ status:"waiting", servedAt:null });
  };
  const toggleActive = async () => {
    await updateDoc(doc(db,"executives",exec.id),{ active:!exec.active });
  };

  return (
    <div style={{minHeight:"100vh",background:"#0F1218",fontFamily:"'DM Sans',sans-serif",color:"#fff",display:"flex",flexDirection:"column"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Bebas+Neue&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{background:"rgba(255,255,255,0.02)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"16px",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{width:"36px",height:"36px",borderRadius:"10px",background:exec.color+"22",border:`1.5px solid ${exec.color}44`,display:"flex",alignItems:"center",justifyContent:"center",color:exec.color}}>{Ico.user}</div>
          <div>
            <div style={{fontWeight:600,fontSize:"15px"}}>{exec.name}</div>
            <div style={{color:"#4A5568",fontSize:"12px"}}>{(exec.categories||[]).join(" · ")}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:"16px",alignItems:"center"}}>
          {[{l:"Atendidos",v:served},{l:"En cola",v:myQueue.length},{l:"Límite",v:exec.avgTime+"m"}].map(s=>(
            <div key={s.l} style={{textAlign:"center"}}>
              <div style={{fontWeight:700,fontSize:"18px"}}>{s.v}</div>
              <div style={{color:"#4A5568",fontSize:"11px"}}>{s.l}</div>
            </div>
          ))}
          <button onClick={toggleActive} style={{...S.btn(exec.active?"#FF6B6B":"#00C9A7",true),fontSize:"12px",padding:"8px 14px"}}>
            {exec.active?"Pausarme":"Activarme"}
          </button>
          <button onClick={()=>signOut(auth)} style={{...S.btn("#8892A4",true),fontSize:"12px",padding:"8px 14px"}}>
            {Ico.logout}
          </button>
        </div>
      </div>

      <div style={{flex:1,padding:"24px",display:"grid",gridTemplateColumns:"1fr 300px",gap:"20px",maxWidth:"1000px",margin:"0 auto",width:"100%"}}>
        <div>
          {/* Panel turno actual */}
          <div style={{...S.card(current?exec.color+"44":"rgba(255,255,255,0.06)"),background:current?`${exec.color}10`:"rgba(255,255,255,0.02)",marginBottom:"18px",minHeight:"200px",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"28px"}}>
            <div style={{fontSize:"11px",letterSpacing:"3px",color:current?exec.color:"#4A5568",textTransform:"uppercase",marginBottom:"16px"}}>
              {current?"⬤ Atendiendo ahora":"Sin turno activo"}
            </div>
            {current ? (
              <>
                <div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"80px",letterSpacing:"3px",lineHeight:1}}>{current.number}</div>
                  <div style={{color:"#8892A4",fontSize:"14px",marginTop:"4px"}}>{current.category}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"10px"}}>
                  <span style={{color:overTime?"#FF6B6B":"#8892A4",fontSize:"13px",display:"flex",alignItems:"center",gap:"5px"}}>
                    {Ico.clock} {fmt(elapsed)} / {exec.avgTime}m {overTime&&"⚠️ Tiempo excedido"}
                  </span>
                  <div style={{display:"flex",gap:"10px"}}>
                    <button onClick={skip} style={{...S.btn("#FF6B6B",true),padding:"9px 16px"}}>
                      {Ico.skip} Saltar
                    </button>
                    <button onClick={finalize} style={{...S.btn(exec.color),padding:"9px 18px",color:"#000"}}>
                      {Ico.check} Finalizar
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,paddingTop:"16px"}}>
                <button onClick={callNext} disabled={myQueue.length===0||!exec.active} style={{...S.btn(exec.color),padding:"15px 36px",fontSize:"15px",color:"#000",opacity:myQueue.length===0||!exec.active?.5:1}}>
                  {!exec.active?"Estás pausado":myQueue.length===0?"Cola vacía":"Llamar siguiente →"}
                </button>
              </div>
            )}
          </div>

          {/* Cola */}
          <div style={{color:"#4A5568",fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>Cola asignada ({myQueue.length}/{exec.maxQueue})</div>
          <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {myQueue.slice(0,7).map((t,i)=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:"14px",padding:"12px 16px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"12px"}}>
                <div style={{width:"26px",height:"26px",borderRadius:"7px",background:exec.color+"22",display:"flex",alignItems:"center",justifyContent:"center",color:exec.color,fontSize:"12px",fontWeight:700}}>{i+1}</div>
                <div style={{flex:1}}>
                  <span style={{fontWeight:600,fontSize:"15px"}}>{t.number}</span>
                  <span style={{color:"#4A5568",fontSize:"12px",marginLeft:"10px"}}>{t.category}</span>
                </div>
                <span style={{color:"#4A5568",fontSize:"12px",display:"flex",alignItems:"center",gap:"4px"}}>
                  {Ico.clock} {t.createdAt?.toDate?Math.floor((Date.now()-t.createdAt.toDate())/60000):0}m
                </span>
              </div>
            ))}
            {myQueue.length===0&&<div style={{textAlign:"center",padding:"28px",color:"#4A5568",fontSize:"14px"}}>No hay turnos asignados</div>}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          <div style={S.card()}>
            <div style={{color:"#4A5568",fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase",marginBottom:"16px"}}>Parámetros</div>
            {[{l:"Cola máxima",v:exec.maxQueue+" turnos"},{l:"Tiempo límite",v:exec.avgTime+" min"},{l:"Prioridad",v:exec.priority==="high"?"Alta ⚡":"Normal"},{l:"Estado",v:exec.active?"Activo ✓":"Pausado ⏸"}].map(p=>(
              <div key={p.l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <span style={{color:"#8892A4",fontSize:"13px"}}>{p.l}</span>
                <span style={{color:"#fff",fontSize:"13px",fontWeight:500}}>{p.v}</span>
              </div>
            ))}
          </div>
          <div style={S.card()}>
            <div style={{color:"#4A5568",fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase",marginBottom:"14px"}}>Categorías</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
              {(exec.categories||[]).map(c=>(
                <span key={c} style={{padding:"4px 12px",background:exec.color+"18",border:`1px solid ${exec.color}33`,borderRadius:"20px",color:exec.color,fontSize:"12px"}}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN VIEW
// ══════════════════════════════════════════════════════════════════════════════
function AdminView({ user, executives, setExecutives, branches, setBranches, queue }) {
  const [tab, setTab]       = useState("overview"); // overview | executives | branches
  const [editing, setEditing] = useState(null);
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);
  const [newBranch, setNewBranch] = useState("");
  const [addingExec, setAddingExec] = useState(false);
  const [newExec, setNewExec] = useState({ name:"", email:"", password:"", branchId:"", maxQueue:8, avgTime:8, priority:"normal", categories:["General"] });
  const [execMsg, setExecMsg] = useState("");

  const stats = {
    total:   queue.length,
    waiting: queue.filter(t=>t.status==="waiting").length,
    serving: queue.filter(t=>t.status==="serving").length,
    served:  queue.filter(t=>t.status==="served").length,
  };

  const openEdit = (exec) => { setEditing(exec.id); setForm({...exec, categories:[...(exec.categories||[])]}); };

  const saveEdit = async () => {
    setSaving(true);
    await updateDoc(doc(db,"executives",editing),{
      name: form.name, maxQueue:+form.maxQueue, avgTime:+form.avgTime,
      priority:form.priority, categories:form.categories,
    });
    setSaving(false); setEditing(null);
  };

  const toggleActive = async (exec) => {
    await updateDoc(doc(db,"executives",exec.id),{ active:!exec.active });
  };

  const addBranch = async () => {
    if (!newBranch.trim()) return;
    await addDoc(collection(db,"branches"),{ name:newBranch.trim(), createdAt:serverTimestamp() });
    setNewBranch("");
  };

  const createExecutive = async () => {
    if (!newExec.name||!newExec.email||!newExec.password||!newExec.branchId) {
      setExecMsg("Completa todos los campos."); return;
    }
    setSaving(true); setExecMsg("");
    try {
      // Crear usuario en Firebase Auth via API REST (sin Admin SDK)
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyCyHV9eqiHstrViQNpZOK_dQfM0yNU1QJI`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ email:newExec.email, password:newExec.password, returnSecureToken:true })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const uid = data.localId;
      const color = EXEC_COLORS[executives.length % EXEC_COLORS.length];
      const execRef = await addDoc(collection(db,"executives"),{
        uid, name:newExec.name, email:newExec.email, branchId:newExec.branchId,
        maxQueue:+newExec.maxQueue, avgTime:+newExec.avgTime,
        priority:newExec.priority, categories:newExec.categories,
        active:false, color, served:0, createdAt:serverTimestamp(),
      });
      await setDoc(doc(db,"users",uid),{ role:"executive", name:newExec.name, executiveId:execRef.id });
      setExecMsg("✅ Ejecutivo creado exitosamente.");
      setNewExec({ name:"", email:"", password:"", branchId:"", maxQueue:8, avgTime:8, priority:"normal", categories:["General"] });
      setAddingExec(false);
    } catch(e) {
      setExecMsg("Error: " + (e.message==="EMAIL_EXISTS"?"El correo ya está registrado.":e.message));
    }
    setSaving(false);
  };

  const NavTab = ({id,label,icon}) => (
    <button onClick={()=>setTab(id)} style={{display:"flex",alignItems:"center",gap:"7px",padding:"9px 16px",background:tab===id?"rgba(0,201,167,0.15)":"transparent",border:`1px solid ${tab===id?"#00C9A7":"rgba(255,255,255,0.08)"}`,borderRadius:"10px",color:tab===id?"#00C9A7":"#8892A4",fontSize:"13px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
      {icon} {label}
    </button>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0A0E1A",fontFamily:"'DM Sans',sans-serif",color:"#fff"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Bebas+Neue&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{background:"rgba(255,255,255,0.02)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"16px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"26px",letterSpacing:"3px"}}>ADMINISTRACIÓN CENTRAL</div>
          <div style={{color:"#4A5568",fontSize:"12px"}}>{user.name} · {branches.length} sucursales</div>
        </div>
        <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
          <NavTab id="overview" label="Resumen" icon={Ico.ticket}/>
          <NavTab id="executives" label="Ejecutivos" icon={Ico.user}/>
          <NavTab id="branches" label="Sucursales" icon={Ico.branch}/>
          <button onClick={()=>signOut(auth)} style={{...S.btn("#8892A4",true),padding:"9px 14px",fontSize:"12px"}}>{Ico.logout}</button>
        </div>
      </div>

      <div style={{padding:"28px",maxWidth:"1200px",margin:"0 auto"}}>

        {/* OVERVIEW */}
        {tab==="overview" && <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"14px",marginBottom:"28px"}}>
            {[{l:"Total turnos",v:stats.total,c:"#8892A4"},{l:"En espera",v:stats.waiting,c:"#F7B731"},{l:"Atendiendo",v:stats.serving,c:"#00C9A7"},{l:"Finalizados",v:stats.served,c:"#845EF7"}].map(s=>(
              <div key={s.l} style={{...S.card(),padding:"20px 24px"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"42px",color:s.c,letterSpacing:"2px"}}>{s.v}</div>
                <div style={{color:"#4A5568",fontSize:"12px",marginTop:"4px"}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Por sucursal */}
          <div style={{color:"#4A5568",fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase",marginBottom:"14px"}}>Estado por sucursal</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"14px"}}>
            {branches.map(b=>{
              const bExecs = executives.filter(e=>e.branchId===b.id);
              const bQueue = queue.filter(t=>t.branchId===b.id);
              return (
                <div key={b.id} style={S.card()}>
                  <div style={{fontWeight:600,marginBottom:"14px",display:"flex",alignItems:"center",gap:"8px",color:"#00C9A7"}}>
                    {Ico.branch} {b.name}
                  </div>
                  {[{l:"Ejecutivos activos",v:bExecs.filter(e=>e.active).length+"/"+bExecs.length},{l:"En espera",v:bQueue.filter(t=>t.status==="waiting").length},{l:"Atendidos hoy",v:bQueue.filter(t=>t.status==="served").length}].map(s=>(
                    <div key={s.l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <span style={{color:"#8892A4",fontSize:"13px"}}>{s.l}</span>
                      <span style={{color:"#fff",fontWeight:600,fontSize:"13px"}}>{s.v}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>}

        {/* EXECUTIVES */}
        {tab==="executives" && <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px",flexWrap:"wrap",gap:"10px"}}>
            <div style={{color:"#4A5568",fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase"}}>{executives.length} ejecutivos</div>
            <button onClick={()=>setAddingExec(true)} style={{...S.btn(),gap:"6px"}}>{Ico.plus} Nuevo Ejecutivo</button>
          </div>
          {execMsg&&<div style={{padding:"12px 16px",background:"rgba(0,201,167,0.1)",border:"1px solid rgba(0,201,167,0.3)",borderRadius:"10px",color:"#00C9A7",fontSize:"13px",marginBottom:"16px"}}>{execMsg}</div>}

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"14px"}}>
            {executives.map(exec=>(
              <div key={exec.id} style={{...S.card(exec.active?exec.color+"33":"rgba(255,255,255,0.06)"),position:"relative"}}>
                <div style={{position:"absolute",top:"14px",right:"14px",display:"flex",gap:"8px"}}>
                  <button onClick={()=>openEdit(exec)} style={{padding:"5px 12px",background:"rgba(255,255,255,0.06)",border:"none",borderRadius:"7px",color:"#8892A4",fontSize:"12px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Editar</button>
                  <button onClick={()=>toggleActive(exec)} style={{padding:"5px 12px",background:exec.active?"rgba(255,107,107,0.12)":"rgba(0,201,167,0.12)",border:`1px solid ${exec.active?"rgba(255,107,107,0.3)":"rgba(0,201,167,0.3)"}`,borderRadius:"7px",color:exec.active?"#FF6B6B":"#00C9A7",fontSize:"12px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                    {exec.active?"Pausar":"Activar"}
                  </button>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px",paddingRight:"100px"}}>
                  <div style={{width:"38px",height:"38px",borderRadius:"12px",background:exec.color+"22",border:`1.5px solid ${exec.color}44`,display:"flex",alignItems:"center",justifyContent:"center",color:exec.color}}>{Ico.user}</div>
                  <div>
                    <div style={{fontWeight:600,fontSize:"15px"}}>{exec.name}</div>
                    <div style={{color:"#4A5568",fontSize:"12px"}}>{branches.find(b=>b.id===exec.branchId)?.name||"Sin sucursal"}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"12px"}}>
                  {[{l:"Cola máx.",v:exec.maxQueue},{l:"T. límite",v:exec.avgTime+"m"},{l:"Prioridad",v:exec.priority==="high"?"Alta":"Normal"},{l:"Atendidos",v:exec.served||0}].map(p=>(
                    <div key={p.l} style={{background:"rgba(255,255,255,0.03)",borderRadius:"8px",padding:"8px 12px"}}>
                      <div style={{color:"#4A5568",fontSize:"11px"}}>{p.l}</div>
                      <div style={{fontWeight:600,fontSize:"13px",marginTop:"2px"}}>{p.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                  {(exec.categories||[]).map(c=>(
                    <span key={c} style={{padding:"3px 10px",background:exec.color+"18",border:`1px solid ${exec.color}33`,borderRadius:"20px",color:exec.color,fontSize:"11px"}}>{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>}

        {/* BRANCHES */}
        {tab==="branches" && <>
          <div style={{color:"#4A5568",fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase",marginBottom:"14px"}}>Sucursales registradas</div>
          <div style={{display:"flex",gap:"10px",marginBottom:"24px",flexWrap:"wrap"}}>
            <input style={{...S.input,maxWidth:"280px"}} value={newBranch} onChange={e=>setNewBranch(e.target.value)} placeholder="Nombre de nueva sucursal" onKeyDown={e=>e.key==="Enter"&&addBranch()}/>
            <button onClick={addBranch} style={S.btn()}>{Ico.plus} Agregar Sucursal</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:"14px"}}>
            {branches.map(b=>(
              <div key={b.id} style={{...S.card("rgba(0,201,167,0.2)"),display:"flex",alignItems:"center",gap:"14px"}}>
                <div style={{width:"40px",height:"40px",borderRadius:"12px",background:"rgba(0,201,167,0.12)",display:"flex",alignItems:"center",justifyContent:"center",color:"#00C9A7"}}>{Ico.branch}</div>
                <div>
                  <div style={{fontWeight:600}}>{b.name}</div>
                  <div style={{color:"#4A5568",fontSize:"12px"}}>{executives.filter(e=>e.branchId===b.id).length} ejecutivos</div>
                </div>
              </div>
            ))}
          </div>
        </>}
      </div>

      {/* Modal Editar Ejecutivo */}
      {editing && (
        <Modal title="EDITAR EJECUTIVO" onClose={()=>setEditing(null)}>
          {[{l:"Nombre",k:"name",t:"text"},{l:"Cola máxima",k:"maxQueue",t:"number"},{l:"Tiempo límite (min)",k:"avgTime",t:"number"}].map(f=>(
            <div key={f.k} style={{marginBottom:"14px"}}>
              <label style={S.label}>{f.l.toUpperCase()}</label>
              <input style={S.input} type={f.t} value={form[f.k]||""} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/>
            </div>
          ))}
          <div style={{marginBottom:"14px"}}>
            <label style={S.label}>PRIORIDAD</label>
            <div style={{display:"flex",gap:"8px"}}>
              {["normal","high"].map(p=>(
                <button key={p} onClick={()=>setForm(pr=>({...pr,priority:p}))} style={{flex:1,padding:"10px",background:form.priority===p?"rgba(0,201,167,0.15)":"rgba(255,255,255,0.04)",border:`1.5px solid ${form.priority===p?"#00C9A7":"rgba(255,255,255,0.08)"}`,borderRadius:"10px",color:form.priority===p?"#00C9A7":"#8892A4",fontSize:"13px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                  {p==="high"?"Alta ⚡":"Normal"}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:"20px"}}>
            <label style={S.label}>CATEGORÍAS</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>
              {CATEGORIES.map(cat=>{const sel=(form.categories||[]).includes(cat);return(
                <button key={cat} onClick={()=>setForm(p=>({...p,categories:sel?p.categories.filter(c=>c!==cat):[...(p.categories||[]),cat]}))} style={{padding:"6px 14px",background:sel?"rgba(0,201,167,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${sel?"#00C9A7":"rgba(255,255,255,0.08)"}`,borderRadius:"20px",color:sel?"#00C9A7":"#8892A4",fontSize:"12px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{cat}</button>
              );})}
            </div>
          </div>
          <div style={{display:"flex",gap:"10px"}}>
            <button onClick={()=>setEditing(null)} style={{...S.btn("#8892A4",true),flex:1,justifyContent:"center"}}>Cancelar</button>
            <button onClick={saveEdit} disabled={saving} style={{...S.btn(),flex:2,justifyContent:"center",color:"#000"}}>{saving?"Guardando...":"Guardar cambios"}</button>
          </div>
        </Modal>
      )}

      {/* Modal Nuevo Ejecutivo */}
      {addingExec && (
        <Modal title="NUEVO EJECUTIVO" onClose={()=>setAddingExec(false)}>
          {[{l:"Nombre completo",k:"name",t:"text"},{l:"Correo (login)",k:"email",t:"email"},{l:"Contraseña temporal",k:"password",t:"password"}].map(f=>(
            <div key={f.k} style={{marginBottom:"14px"}}>
              <label style={S.label}>{f.l.toUpperCase()}</label>
              <input style={S.input} type={f.t} value={newExec[f.k]} onChange={e=>setNewExec(p=>({...p,[f.k]:e.target.value}))}/>
            </div>
          ))}
          <div style={{marginBottom:"14px"}}>
            <label style={S.label}>SUCURSAL</label>
            <select style={{...S.input}} value={newExec.branchId} onChange={e=>setNewExec(p=>({...p,branchId:e.target.value}))}>
              <option value="">Selecciona sucursal</option>
              {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
            <div>
              <label style={S.label}>COLA MÁX.</label>
              <input style={S.input} type="number" value={newExec.maxQueue} onChange={e=>setNewExec(p=>({...p,maxQueue:e.target.value}))}/>
            </div>
            <div>
              <label style={S.label}>T. LÍMITE (min)</label>
              <input style={S.input} type="number" value={newExec.avgTime} onChange={e=>setNewExec(p=>({...p,avgTime:e.target.value}))}/>
            </div>
          </div>
          <div style={{marginBottom:"14px"}}>
            <label style={S.label}>CATEGORÍAS</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>
              {CATEGORIES.map(cat=>{const sel=newExec.categories.includes(cat);return(
                <button key={cat} onClick={()=>setNewExec(p=>({...p,categories:sel?p.categories.filter(c=>c!==cat):[...p.categories,cat]}))} style={{padding:"6px 14px",background:sel?"rgba(0,201,167,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${sel?"#00C9A7":"rgba(255,255,255,0.08)"}`,borderRadius:"20px",color:sel?"#00C9A7":"#8892A4",fontSize:"12px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{cat}</button>
              );})}
            </div>
          </div>
          {execMsg&&<div style={{color:execMsg.startsWith("✅")?"#00C9A7":"#FF6B6B",fontSize:"13px",marginBottom:"12px"}}>{execMsg}</div>}
          <div style={{display:"flex",gap:"10px"}}>
            <button onClick={()=>setAddingExec(false)} style={{...S.btn("#8892A4",true),flex:1,justifyContent:"center"}}>Cancelar</button>
            <button onClick={createExecutive} disabled={saving} style={{...S.btn(),flex:2,justifyContent:"center",color:"#000"}}>{saving?"Creando...":"Crear Ejecutivo"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,backdropFilter:"blur(4px)"}}>
      <div style={{background:"#141822",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"22px",padding:"32px",width:"460px",maxWidth:"92vw",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"22px",letterSpacing:"2px",marginBottom:"24px"}}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP ROOT — Orquesta auth + listeners + routing
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser]         = useState(null);      // { uid, role, name, executiveId? }
  const [authReady, setAuthReady] = useState(false);
  const [executives, setExecutives] = useState([]);
  const [branches, setBranches]     = useState([]);
  const [queue, setQueue]           = useState([]);
  const [demoMode, setDemoMode]     = useState(null);  // "tablet"|"display"|null

  // Auth listener
  useEffect(()=>{
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const snap = await getDoc(doc(db,"users",fbUser.uid));
        if (snap.exists()) setUser({ uid:fbUser.uid, ...snap.data() });
      } else setUser(null);
      setAuthReady(true);
    });
  },[]);

  // Firestore listeners (siempre activos para tablet/display público)
  useEffect(()=>{
    const unsubE = onSnapshot(collection(db,"executives"), snap=>{
      setExecutives(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    const unsubB = onSnapshot(collection(db,"branches"), snap=>{
      setBranches(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    const today = new Date(); today.setHours(0,0,0,0);
    const unsubQ = onSnapshot(
      query(collection(db,"tickets"), where("status","in",["waiting","serving","served"]), orderBy("createdAt","asc")),
      snap=>{ setQueue(snap.docs.map(d=>({id:d.id,...d.data()}))); }
    );
    return ()=>{ unsubE(); unsubB(); unsubQ(); };
  },[]);

  if (!authReady) return (
    <div style={{minHeight:"100vh",background:"#080B12",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#00C9A7",fontFamily:"'Bebas Neue',sans-serif",fontSize:"24px",letterSpacing:"4px",animation:"pulse 1.5s infinite"}}>CARGANDO...</div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );

  // Vistas públicas (tablet/display) sin login
  const firstBranch = branches[0];

  if (demoMode==="tablet") return (
    <div>
      <button onClick={()=>setDemoMode(null)} style={{position:"fixed",top:"12px",left:"12px",zIndex:99,...S.btn("#8892A4",true),fontSize:"11px",padding:"6px 12px"}}>← Salir</button>
      <TabletView branchId={firstBranch?.id||"demo"} branchName={firstBranch?.name||"Sucursal Demo"} executives={executives} queue={queue}/>
    </div>
  );
  if (demoMode==="display") return (
    <div>
      <button onClick={()=>setDemoMode(null)} style={{position:"fixed",top:"12px",left:"12px",zIndex:99,...S.btn("#8892A4",true),fontSize:"11px",padding:"6px 12px"}}>← Salir</button>
      <DisplayScreen branchId={firstBranch?.id||"demo"} branchName={firstBranch?.name||"Sucursal Demo"} queue={queue} executives={executives}/>
    </div>
  );

  // No autenticado → login + accesos rápidos públicos
  if (!user) return (
    <div>
      <div style={{position:"fixed",bottom:"20px",right:"20px",display:"flex",gap:"10px",zIndex:99}}>
        <button onClick={()=>setDemoMode("tablet")} style={{...S.btn("#845EF7",true),fontSize:"12px"}}>{Ico.ticket} Tablet Turnos</button>
        <button onClick={()=>setDemoMode("display")} style={{...S.btn("#F7B731",true),fontSize:"12px"}}>{Ico.tv} Pantalla TV</button>
      </div>
      <LoginScreen onLogin={setUser}/>
    </div>
  );

  // Autenticado
  if (user.role==="admin") return (
    <AdminView user={user} executives={executives} setExecutives={setExecutives} branches={branches} setBranches={setBranches} queue={queue}/>
  );
  if (user.role==="executive") return (
    <ExecutiveView user={user} executives={executives} queue={queue}/>
  );

  return <div style={{color:"#fff",padding:"40px",textAlign:"center"}}>Rol desconocido. Contacta al administrador.</div>;
}
