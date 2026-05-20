import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// ── Firebase ──────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyA207pKFIA-d7S9HdN31-du2CGhbWt6NZQ",
  authDomain: "roadmap-automation-6e4ad.firebaseapp.com",
  projectId: "roadmap-automation-6e4ad",
  storageBucket: "roadmap-automation-6e4ad.firebasestorage.app",
  messagingSenderId: "1075036356196",
  appId: "1:1075036356196:web:c5b35497b0428f92d96971"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const gProvider = new GoogleAuthProvider();
const signIn = () => signInWithPopup(auth, gProvider);
const logOut = () => signOut(auth);
const onAuth = (cb) => onAuthStateChanged(auth, cb);
async function saveData(uid, data) { await setDoc(doc(db, "users2", uid), data); }
async function loadData(uid) {
  try {
    let s = await getDoc(doc(db, "users2", uid));
    if (s.exists()) return s.data();
    // fall back to old collection
    s = await getDoc(doc(db, "users", uid));
    if (s.exists()) {
      const old = s.data();
      // migrate old format to new format if needed
      if (old.categories) return old;
      return null;
    }
  } catch(e) {}
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const pad = (n) => String(n).padStart(2, "0");
function fmtTimer(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
function fmtHuman(s) {
  s = Math.floor(s || 0);
  if (!s) return "—";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : `${s}s`;
}

// ── Default data ──────────────────────────────────────────────────────────────
const DEFAULT_DATA = {
  categories: [
    {
      id: "cat1", name: "Automation Career", color: "#3B82F6", visible: true,
      levels: [
        {
          id: "lv1", name: "Foundation", subtitle: "Already done",
          tasks: [
            { id: "t1", name: "TIA Portal S7-1200/1500 programming", done: true, time: 0 },
            { id: "t2", name: "HMI / WinCC screens and alarms", done: true, time: 0 },
            { id: "t3", name: "Basic Python — loops, functions, files", done: true, time: 0 },
            { id: "t4", name: "Basic SQL — SELECT, INSERT, UPDATE", done: true, time: 0 },
          ]
        },
        {
          id: "lv2", name: "Python + SQL Power User", subtitle: "Months 1–3",
          tasks: [
            { id: "t5", name: "Install Git and create GitHub account", done: false, time: 0 },
            { id: "t6", name: "pandas — read, filter, export Excel/CSV", done: false, time: 0 },
            { id: "t7", name: "sqlite3 — connect Python to database", done: false, time: 0 },
            { id: "t8", name: "OPC-UA — read live PLC tags from Python", done: false, time: 0 },
            { id: "t9", name: "Boss project — OPC-UA pipeline to Excel report", done: false, time: 0 },
          ]
        },
        {
          id: "lv3", name: "TIA Openness", subtitle: "Months 4–8",
          tasks: [
            { id: "t10", name: "C# basics for TIA Openness", done: false, time: 0 },
            { id: "t11", name: "TIA Openness API — control TIA from code", done: false, time: 0 },
            { id: "t12", name: "Boss project — auto-generate 50 tags from Excel", done: false, time: 0 },
          ]
        },
      ]
    }
  ],
  activeCategory: "cat1",
  timerData: {}
};

// ── COLORS ────────────────────────────────────────────────────────────────────
const COLORS = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16","#F97316","#6366F1"];

// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(undefined);
  const [data, setData] = useState(null);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerStart, setTimerStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [page, setPage] = useState("tracker"); // tracker | manage | stats
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveRef = useRef(null);
  const intervalRef = useRef(null);

  // Auth
  useEffect(() => {
    return onAuth(async (u) => {
      setUser(u);
      if (u) {
        try {
          const d = await loadData(u.uid);
          setData(d || DEFAULT_DATA);
        } catch { setData(DEFAULT_DATA); }
      }
    });
  }, []);

  // Timer tick
  useEffect(() => {
    if (activeTimer) {
      intervalRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - timerStart) / 1000)), 500);
    } else { clearInterval(intervalRef.current); setElapsed(0); }
    return () => clearInterval(intervalRef.current);
  }, [activeTimer, timerStart]);

  const persist = useCallback((d) => {
    if (!user) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    setSyncing(true);
    saveRef.current = setTimeout(async () => {
      try { await saveData(user.uid, d); setSaved(true); setTimeout(() => setSaved(false), 1500); }
      catch (e) { }
      finally { setSyncing(false); }
    }, 400);
  }, [user]);

  const update = useCallback((fn) => {
    setData(prev => {
      const next = fn(JSON.parse(JSON.stringify(prev)));
      persist(next);
      return next;
    });
  }, [persist]);

  // ── Timer helpers ────────────────────────────────────────────────────────
  const getLive = (catId, lvId, taskId) => {
    const base = data?.categories?.find(c => c.id === catId)
      ?.levels?.find(l => l.id === lvId)
      ?.tasks?.find(t => t.id === taskId)?.time || 0;
    if (activeTimer === taskId) return base + elapsed;
    return base;
  };

  const startStop = (catId, lvId, taskId) => {
    if (activeTimer && activeTimer !== taskId) {
      // save previous
      const secs = Math.floor((Date.now() - timerStart) / 1000);
      update(d => {
        const task = d.categories.find(c => c.id === catId)?.levels.find(l => l.id === lvId)?.tasks.find(t => t.id === activeTimer);
        // find the task across all categories
        d.categories.forEach(c => c.levels.forEach(l => l.tasks.forEach(t => { if (t.id === activeTimer) t.time = (t.time || 0) + secs; })));
        return d;
      });
    }
    if (activeTimer === taskId) {
      const secs = Math.floor((Date.now() - timerStart) / 1000);
      update(d => { d.categories.forEach(c => c.levels.forEach(l => l.tasks.forEach(t => { if (t.id === taskId) t.time = (t.time || 0) + secs; }))); return d; });
      setActiveTimer(null); setTimerStart(null);
    } else {
      setActiveTimer(taskId); setTimerStart(Date.now());
    }
  };

  const toggleDone = (catId, lvId, taskId) => {
    if (activeTimer === taskId) startStop(catId, lvId, taskId);
    update(d => { d.categories.forEach(c => c.levels.forEach(l => l.tasks.forEach(t => { if (t.id === taskId) t.done = !t.done; }))); return d; });
  };

  if (user === undefined) return <Splash text="loading..." />;
  if (!user) return <LoginScreen onLogin={signIn} />;
  if (!data) return <Splash text="loading your data..." />;

  const activeCat = data.categories.find(c => c.id === data.activeCategory) || data.categories[0];

  return (
    <div style={{ fontFamily: "'Azeret Mono', 'Courier New', monospace", background: "#080808", minHeight: "100vh", color: "#E8E6E1" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: #111; } ::-webkit-scrollbar-thumb { background: #333; }
        input, button { font-family: inherit; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.2} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* TOP BAR */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "#080808cc", backdropFilter: "blur(12px)", borderBottom: "1px solid #1A1A1A", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E8E6E1", letterSpacing: "-0.02em" }}>track<span style={{ color: activeCat?.color || "#3B82F6" }}>.</span>it</div>
          <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.08em", marginTop: 1 }}>
            {syncing ? "⟳ syncing..." : saved ? "✓ saved" : user.displayName}
          </div>
        </div>
        <nav style={{ display: "flex", gap: 2, background: "#111", borderRadius: 8, padding: 2, border: "1px solid #1E1E1E" }}>
          {[["tracker","track"],["manage","edit"],["stats","stats"]].map(([p, label]) => (
            <button key={p} onClick={() => setPage(p)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, background: page === p ? "#1E1E1E" : "transparent", color: page === p ? "#E8E6E1" : "#555", border: "none", cursor: "pointer", letterSpacing: "0.04em" }}>{label}</button>
          ))}
        </nav>
        <button onClick={logOut} style={{ fontSize: 10, padding: "4px 8px", background: "transparent", border: "1px solid #222", borderRadius: 6, color: "#444", cursor: "pointer" }}>out</button>
      </div>

      {/* CATEGORY TABS */}
      <div style={{ display: "flex", gap: 6, padding: "10px 16px 0", overflowX: "auto" }}>
        {data.categories.map(cat => (
          <button key={cat.id} onClick={() => update(d => { d.activeCategory = cat.id; return d; })}
            style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, border: `1px solid ${cat.id === data.activeCategory ? cat.color : "#1E1E1E"}`, background: cat.id === data.activeCategory ? cat.color + "22" : "transparent", color: cat.id === data.activeCategory ? cat.color : "#555", cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
            {cat.name}
          </button>
        ))}
        <button onClick={() => setPage("manage")} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 20, border: "1px dashed #222", background: "transparent", color: "#333", cursor: "pointer" }}>+ category</button>
      </div>

      {/* ACTIVE TIMER BANNER */}
      {activeTimer && (
        <div style={{ margin: "10px 16px 0", background: "#0A1F0F", border: "1px solid #1A3A20", borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "center", gap: 8, animation: "fadeIn .3s" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E", animation: "pulse 1.2s infinite" }} />
          <span style={{ flex: 1, fontSize: 11, color: "#4ADE80", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {data.categories.flatMap(c => c.levels.flatMap(l => l.tasks)).find(t => t.id === activeTimer)?.name}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#22C55E", fontVariantNumeric: "tabular-nums" }}>{fmtTimer(elapsed)}</span>
          <button onClick={() => { const secs = Math.floor((Date.now() - timerStart) / 1000); update(d => { d.categories.forEach(c => c.levels.forEach(l => l.tasks.forEach(t => { if (t.id === activeTimer) t.time = (t.time || 0) + secs; }))); return d; }); setActiveTimer(null); setTimerStart(null); }}
            style={{ fontSize: 10, padding: "3px 9px", background: "#1A3A20", border: "1px solid #22C55E44", borderRadius: 5, color: "#22C55E", cursor: "pointer" }}>■ stop</button>
        </div>
      )}

      <div style={{ padding: "12px 16px 60px", animation: "fadeIn .3s" }}>
        {page === "tracker" && activeCat && <TrackerPage cat={activeCat} activeTimer={activeTimer} elapsed={elapsed} getLive={getLive} toggleDone={toggleDone} startStop={startStop} update={update} />}
        {page === "manage" && <ManagePage data={data} update={update} setPage={setPage} />}
        {page === "stats" && <StatsPage data={data} activeTimer={activeTimer} elapsed={elapsed} />}
      </div>
    </div>
  );
}

// ── TRACKER PAGE ──────────────────────────────────────────────────────────────
function TrackerPage({ cat, activeTimer, elapsed, getLive, toggleDone, startStop, update }) {
  const [openLv, setOpenLv] = useState({ [cat.levels[0]?.id]: true });

  const allTasks = cat.levels.flatMap(l => l.tasks);
  const done = allTasks.filter(t => t.done).length;
  const pct = allTasks.length ? Math.round(done / allTasks.length * 100) : 0;

  return (
    <div>
      {/* Category header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: cat.color }}>{cat.name}</div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>{done}/{allTasks.length} tasks · {pct}% complete</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#222" }}>{pct}%</div>
        </div>
        <div style={{ height: 2, background: "#111", borderRadius: 1 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 1, transition: "width .5s" }} />
        </div>
      </div>

      {/* Levels */}
      {cat.levels.map(lv => {
        const lvDone = lv.tasks.filter(t => t.done).length;
        const lvPct = lv.tasks.length ? Math.round(lvDone / lv.tasks.length * 100) : 0;
        const lvSecs = lv.tasks.reduce((a, t) => a + (t.id === activeTimer ? (t.time || 0) + elapsed : t.time || 0), 0);
        const isOpen = !!openLv[lv.id];

        return (
          <div key={lv.id} style={{ marginBottom: 8, border: `1px solid ${isOpen ? cat.color + "33" : "#141414"}`, borderRadius: 10, overflow: "hidden", background: "#0D0D0D" }}>
            <div onClick={() => setOpenLv(p => ({ ...p, [lv.id]: !p[lv.id] }))}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", cursor: "pointer", background: isOpen ? cat.color + "0A" : "transparent" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#D4D0C8" }}>{lv.name}</div>
                {lv.subtitle && <div style={{ fontSize: 10, color: "#3A3A3A", marginTop: 1 }}>{lv.subtitle}</div>}
              </div>
              {lvSecs > 0 && <span style={{ fontSize: 10, color: "#22C55E", background: "#0A1F0F", padding: "1px 7px", borderRadius: 20 }}>{fmtHuman(lvSecs)}</span>}
              <span style={{ fontSize: 11, color: cat.color, fontWeight: 500 }}>{lvPct}%</span>
              <span style={{ fontSize: 10, color: "#333" }}>{isOpen ? "▴" : "▾"}</span>
            </div>
            <div style={{ height: 1, background: "#111" }}>
              <div style={{ height: "100%", width: `${lvPct}%`, background: cat.color + "66", transition: "width .4s" }} />
            </div>

            {isOpen && (
              <div style={{ padding: "8px 12px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                {lv.tasks.map(t => {
                  const liveTime = t.id === activeTimer ? (t.time || 0) + elapsed : t.time || 0;
                  const running = activeTimer === t.id;
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, background: running ? "#0A1F0F" : "#111", border: `1px solid ${running ? "#1A3A20" : "#1A1A1A"}`, transition: "all .2s" }}>
                      <div onClick={() => toggleDone(cat.id, lv.id, t.id)}
                        style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${t.done ? cat.color : "#2A2A2A"}`, background: t.done ? cat.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all .2s" }}>
                        {t.done && <span style={{ fontSize: 9, color: "#000", lineHeight: 1, fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ flex: 1, fontSize: 11, color: t.done ? "#333" : "#C8C4BC", textDecoration: t.done ? "line-through" : "none" }}>{t.name}</span>
                      <span style={{ fontSize: 10, color: running ? "#22C55E" : liveTime > 0 ? "#444" : "#222", fontVariantNumeric: "tabular-nums", minWidth: 38, textAlign: "right" }}>
                        {running ? fmtTimer(liveTime) : liveTime > 0 ? fmtHuman(liveTime) : "—"}
                      </span>
                      <button onClick={() => startStop(cat.id, lv.id, t.id)}
                        style={{ fontSize: 10, width: 26, height: 26, borderRadius: 5, border: `1px solid ${running ? "#22C55E44" : "#222"}`, background: running ? "#0A2F14" : "transparent", color: running ? "#22C55E" : "#333", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {running ? "■" : "▶"}
                      </button>
                    </div>
                  );
                })}
                {/* Add task inline */}
                <AddInline placeholder="+ add task" onAdd={(name) => update(d => {
                  const l = d.categories.find(c => c.id === cat.id)?.levels.find(l => l.id === lv.id);
                  if (l) l.tasks.push({ id: uid(), name, done: false, time: 0 });
                  return d;
                })} color={cat.color} />
              </div>
            )}
          </div>
        );
      })}

      {/* Add level */}
      <AddInline placeholder="+ add level" onAdd={(name) => update(d => {
        const c = d.categories.find(c => c.id === cat.id);
        if (c) c.levels.push({ id: uid(), name, subtitle: "", tasks: [] });
        return d;
      })} color={cat.color} big />
    </div>
  );
}

// ── MANAGE PAGE ───────────────────────────────────────────────────────────────
function ManagePage({ data, update, setPage }) {
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(COLORS[0]);
  const [editCat, setEditCat] = useState(null); // id being edited

  const addCat = () => {
    if (!newCatName.trim()) return;
    const id = uid();
    update(d => {
      d.categories.push({ id, name: newCatName.trim(), color: newCatColor, visible: true, levels: [] });
      d.activeCategory = id;
      return d;
    });
    setNewCatName("");
    setPage("tracker");
  };

  const deleteCat = (catId) => {
    update(d => {
      d.categories = d.categories.filter(c => c.id !== catId);
      if (d.activeCategory === catId) d.activeCategory = d.categories[0]?.id || null;
      return d;
    });
  };

  const updateCat = (catId, key, val) => update(d => { const c = d.categories.find(c => c.id === catId); if (c) c[key] = val; return d; });

  return (
    <div>
      <div style={{ fontSize: 11, color: "#444", letterSpacing: "0.08em", marginBottom: 14 }}>MANAGE CATEGORIES</div>

      {/* Existing categories */}
      {data.categories.map(cat => (
        <div key={cat.id} style={{ marginBottom: 8, border: "1px solid #1A1A1A", borderRadius: 10, overflow: "hidden", background: "#0D0D0D" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
            {editCat === cat.id ? (
              <input value={cat.name} onChange={e => updateCat(cat.id, "name", e.target.value)}
                style={{ flex: 1, fontSize: 12, background: "#111", border: "1px solid #2A2A2A", borderRadius: 5, color: "#E8E6E1", padding: "3px 8px" }} />
            ) : (
              <span style={{ flex: 1, fontSize: 12, color: "#D4D0C8", fontWeight: 500 }}>{cat.name}</span>
            )}
            <span style={{ fontSize: 10, color: "#333" }}>{cat.levels.length} levels · {cat.levels.flatMap(l => l.tasks).length} tasks</span>
            <button onClick={() => setEditCat(editCat === cat.id ? null : cat.id)}
              style={{ fontSize: 10, padding: "3px 8px", background: "transparent", border: "1px solid #222", borderRadius: 5, color: "#555", cursor: "pointer" }}>
              {editCat === cat.id ? "done" : "edit"}
            </button>
            {data.categories.length > 1 && (
              <button onClick={() => deleteCat(cat.id)}
                style={{ fontSize: 10, padding: "3px 8px", background: "transparent", border: "1px solid #2A1A1A", borderRadius: 5, color: "#5A2A2A", cursor: "pointer" }}>del</button>
            )}
          </div>

          {/* Color picker */}
          {editCat === cat.id && (
            <div style={{ padding: "0 12px 12px", borderTop: "1px solid #141414" }}>
              <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.08em", margin: "10px 0 6px" }}>COLOR</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => updateCat(cat.id, "color", c)}
                    style={{ width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer", border: `2px solid ${cat.color === c ? "#fff" : "transparent"}`, transition: "border .15s" }} />
                ))}
              </div>
              <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.08em", margin: "12px 0 6px" }}>LEVELS IN THIS CATEGORY</div>
              {cat.levels.map(lv => (
                <div key={lv.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ flex: 1, fontSize: 11, color: "#555" }}>{lv.name} ({lv.tasks.length} tasks)</span>
                  <button onClick={() => update(d => { const c = d.categories.find(c => c.id === cat.id); if (c) c.levels = c.levels.filter(l => l.id !== lv.id); return d; })}
                    style={{ fontSize: 10, padding: "2px 7px", background: "transparent", border: "1px solid #2A1A1A", borderRadius: 4, color: "#5A2A2A", cursor: "pointer" }}>del</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Add new category */}
      <div style={{ marginTop: 16, border: "1px dashed #1E1E1E", borderRadius: 10, padding: "14px 12px", background: "#0A0A0A" }}>
        <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.08em", marginBottom: 10 }}>NEW CATEGORY</div>
        <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addCat()}
          placeholder="Category name e.g. Fitness, Arabic, Side Project..."
          style={{ width: "100%", fontSize: 12, background: "#111", border: "1px solid #1E1E1E", borderRadius: 7, color: "#E8E6E1", padding: "8px 10px", marginBottom: 10 }} />
        <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.08em", marginBottom: 6 }}>PICK A COLOR</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => setNewCatColor(c)}
              style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: `2px solid ${newCatColor === c ? "#fff" : "transparent"}`, transition: "border .15s" }} />
          ))}
        </div>
        <button onClick={addCat}
          style={{ width: "100%", padding: "9px", background: newCatColor, border: "none", borderRadius: 7, color: "#000", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.02em" }}>
          Create Category
        </button>
      </div>
    </div>
  );
}

// ── STATS PAGE ────────────────────────────────────────────────────────────────
function StatsPage({ data, activeTimer, elapsed }) {
  const allTasks = data.categories.flatMap(c => c.levels.flatMap(l => l.tasks.map(t => ({ ...t, catName: c.name, catColor: c.color, time: t.id === activeTimer ? (t.time || 0) + elapsed : t.time || 0 }))));
  const totalDone = allTasks.filter(t => t.done).length;
  const totalSecs = allTasks.reduce((a, t) => a + (t.time || 0), 0);
  const topTasks = [...allTasks].filter(t => t.time > 0).sort((a, b) => b.time - a.time).slice(0, 8);
  const maxSecs = topTasks[0]?.time || 1;

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {[["tasks done", totalDone], ["total tasks", allTasks.length], ["time logged", fmtHuman(totalSecs)]].map(([k, v]) => (
          <div key={k} style={{ background: "#0D0D0D", border: "1px solid #141414", borderRadius: 8, padding: "10px 10px" }}>
            <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.08em", marginBottom: 4 }}>{k.toUpperCase()}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#D4D0C8" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Per category */}
      <div style={{ fontSize: 10, color: "#333", letterSpacing: "0.08em", marginBottom: 10 }}>BY CATEGORY</div>
      {data.categories.map(cat => {
        const tasks = cat.levels.flatMap(l => l.tasks.map(t => ({ ...t, time: t.id === activeTimer ? (t.time || 0) + elapsed : t.time || 0 })));
        const done = tasks.filter(t => t.done).length;
        const secs = tasks.reduce((a, t) => a + (t.time || 0), 0);
        const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
        return (
          <div key={cat.id} style={{ marginBottom: 8, background: "#0D0D0D", border: "1px solid #141414", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color }} />
                <span style={{ fontSize: 12, color: "#C8C4BC" }}>{cat.name}</span>
              </div>
              <div style={{ fontSize: 11, color: "#444" }}>{pct}% · {fmtHuman(secs)}</div>
            </div>
            <div style={{ height: 3, background: "#111", borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 2, transition: "width .4s" }} />
            </div>
            <div style={{ fontSize: 10, color: "#2A2A2A", marginTop: 4 }}>{done} of {tasks.length} tasks done</div>
          </div>
        );
      })}

      {/* Top tasks by time */}
      {topTasks.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, color: "#333", letterSpacing: "0.08em", marginBottom: 10 }}>MOST TIME SPENT</div>
          <div style={{ background: "#0D0D0D", border: "1px solid #141414", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {topTasks.map(t => (
              <div key={t.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: "#555", maxWidth: "75%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: t.done ? "line-through" : "none" }}>{t.name}</span>
                  <span style={{ fontSize: 10, color: "#444" }}>{fmtHuman(t.time)}</span>
                </div>
                <div style={{ height: 2, background: "#111", borderRadius: 1 }}>
                  <div style={{ height: "100%", width: `${Math.round(t.time / maxSecs * 100)}%`, background: t.catColor + "88", borderRadius: 1 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ADD INLINE ────────────────────────────────────────────────────────────────
function AddInline({ placeholder, onAdd, color, big }) {
  const [val, setVal] = useState("");
  const [active, setActive] = useState(false);
  if (!active) return (
    <button onClick={() => setActive(true)}
      style={{ fontSize: 10, padding: big ? "8px 10px" : "5px 10px", background: "transparent", border: `1px dashed ${color}33`, borderRadius: 6, color: color + "66", cursor: "pointer", width: "100%", textAlign: "left", marginTop: big ? 8 : 0 }}>
      {placeholder}
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 5, marginTop: big ? 8 : 0 }}>
      <input autoFocus value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); setActive(false); } if (e.key === "Escape") setActive(false); }}
        placeholder="Type and press Enter..."
        style={{ flex: 1, fontSize: 11, background: "#111", border: `1px solid ${color}44`, borderRadius: 6, color: "#E8E6E1", padding: "5px 9px" }} />
      <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); } setActive(false); }}
        style={{ fontSize: 10, padding: "5px 10px", background: color + "22", border: `1px solid ${color}44`, borderRadius: 6, color: color, cursor: "pointer" }}>add</button>
      <button onClick={() => setActive(false)}
        style={{ fontSize: 10, padding: "5px 8px", background: "transparent", border: "1px solid #222", borderRadius: 6, color: "#333", cursor: "pointer" }}>✕</button>
    </div>
  );
}

// ── SPLASH / LOGIN ────────────────────────────────────────────────────────────
function Splash({ text }) {
  return (
    <div style={{ background: "#080808", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Azeret Mono, monospace", color: "#333", fontSize: 12 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@400&display=swap');`}</style>
      {text}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  return (
    <div style={{ background: "#080808", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Azeret Mono, monospace", padding: "2rem" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@300;400;500;600&display=swap');`}</style>
      <div style={{ maxWidth: 320, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 9, color: "#2A2A2A", letterSpacing: "0.16em", marginBottom: 20 }}>PERSONAL PROGRESS TRACKER</div>
        <div style={{ fontSize: 32, fontWeight: 600, color: "#E8E6E1", marginBottom: 6, letterSpacing: "-0.04em" }}>track<span style={{ color: "#3B82F6" }}>.</span>it</div>
        <div style={{ fontSize: 12, color: "#2A2A2A", marginBottom: 48, lineHeight: 1.8 }}>Track anything.<br />Careers. Skills. Habits. Goals.</div>
        <button onClick={onLogin}
          style={{ width: "100%", padding: "13px 20px", background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 10, color: "#E8E6E1", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, letterSpacing: "0.02em" }}>
          <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>
        <div style={{ marginTop: 16, fontSize: 10, color: "#1E1E1E" }}>Data is private and synced to your account</div>
      </div>
    </div>
  );
}
