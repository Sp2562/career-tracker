import { useState, useEffect, useRef, useCallback } from "react";
import { signInWithGoogle, logOut, onAuth, saveData, loadData } from "./firebase";

// ── helpers ───────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 9);
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

// ── default data ──────────────────────────────────────────────────────────────
const COLORS = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16","#F97316","#6366F1"];

const DEFAULT = {
  activeCategory: "cat1",
  categories: [
    {
      id: "cat1", name: "Automation Career", color: "#3B82F6",
      levels: [
        {
          id: "lv0", name: "Foundation", subtitle: "Already done",
          tasks: [
            { id: "l0t0", name: "TIA Portal S7-1200/1500 programming", done: true, time: 0 },
            { id: "l0t1", name: "S7-300/400 programming", done: true, time: 0 },
            { id: "l0t2", name: "Ladder logic", done: true, time: 0 },
            { id: "l0t3", name: "SCL programming", done: true, time: 0 },
            { id: "l0t4", name: "WinCC HMI screens and alarms", done: true, time: 0 },
            { id: "l0t5", name: "Basic Python — loops, functions, files", done: true, time: 0 },
            { id: "l0t6", name: "Basic SQL — SELECT, INSERT, UPDATE", done: true, time: 0 },
          ]
        },
        {
          id: "lv1", name: "Python + SQL Power User", subtitle: "Months 1–3",
          tasks: [
            { id: "l1t0", name: "Install Git and create GitHub account", done: false, time: 0 },
            { id: "l1t1", name: "pandas — read, filter, export Excel/CSV", done: false, time: 0 },
            { id: "l1t2", name: "sqlite3 — connect Python to database", done: false, time: 0 },
            { id: "l1t3", name: "OPC-UA — read live PLC tags from Python", done: false, time: 0 },
            { id: "l1t4", name: "Boss project — OPC-UA pipeline to Excel report", done: false, time: 0 },
          ]
        },
        {
          id: "lv2", name: "TIA Openness", subtitle: "Months 4–8",
          tasks: [
            { id: "l2t0", name: "C# basics for TIA Openness", done: false, time: 0 },
            { id: "l2t1", name: "TIA Openness API — control TIA from code", done: false, time: 0 },
            { id: "l2t2", name: "Boss project — auto-generate 50 tags from Excel", done: false, time: 0 },
          ]
        },
        {
          id: "lv3", name: "MES and Dashboards", subtitle: "Months 9–14",
          tasks: [
            { id: "l3t0", name: "FastAPI — build REST API in Python", done: false, time: 0 },
            { id: "l3t1", name: "Grafana — live dashboard from SQL", done: false, time: 0 },
            { id: "l3t2", name: "Docker — package and deploy your app", done: false, time: 0 },
            { id: "l3t3", name: "Boss project — live OEE dashboard", done: false, time: 0 },
          ]
        },
        {
          id: "lv4", name: "Get the Job", subtitle: "Month 14+",
          tasks: [
            { id: "l4t0", name: "3 boss projects on GitHub with README", done: false, time: 0 },
            { id: "l4t1", name: "Apply to: Automation Software Developer", done: false, time: 0 },
            { id: "l4t2", name: "Apply to: MES Engineer", done: false, time: 0 },
            { id: "l4t3", name: "Apply to: SCADA Developer", done: false, time: 0 },
          ]
        },
      ]
    }
  ]
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(undefined);
  const [data, setData] = useState(null);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerStart, setTimerStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [page, setPage] = useState("track");
  const [sync, setSync] = useState("idle");
  const timerRef = useRef({ id: null, start: null });
  const intervalRef = useRef(null);
  const saveRef = useRef(null);
  const userRef = useRef(null); // always holds current user without stale closure

  // auth + load
  useEffect(() => {
    return onAuth(async (u) => {
      userRef.current = u; // update ref immediately so persist always sees latest user
      setUser(u);
      if (u) {
        try {
          const d = await loadData(u.uid);
          setData(d || DEFAULT);
        } catch (e) {
          setData(DEFAULT);
        }
      }
    });
  }, []);

  // timer tick
  useEffect(() => {
    if (activeTimer) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - timerRef.current.start) / 1000));
      }, 500);
    } else {
      clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [activeTimer]);

  // persist — uses userRef so it never has a stale user reference
  const persist = useCallback((next) => {
    const u = userRef.current;
    if (!u) return; // not logged in yet
    if (saveRef.current) clearTimeout(saveRef.current);
    setSync("saving");
    // snapshot the data NOW before the timeout fires
    const snapshot = JSON.parse(JSON.stringify(next));
    saveRef.current = setTimeout(async () => {
      try {
        await saveData(u.uid, snapshot);
        setSync("saved");
        setTimeout(() => setSync("idle"), 2000);
      } catch (e) {
        const msg = e?.code || e?.message || String(e);
        console.error("Save failed — code:", e?.code, "message:", e?.message, "full:", e);
        setSync("err:" + msg.slice(0, 40));
        setTimeout(() => setSync("idle"), 6000);
      }
    }, 500);
  }, []); // no dependencies — userRef is always current

  const update = useCallback((fn) => {
    setData(prev => {
      const next = fn(JSON.parse(JSON.stringify(prev)));
      persist(next);
      return next;
    });
  }, [persist]);

  // timer controls
  const getLive = (taskId) => {
    const base = (() => {
      if (!data) return 0;
      for (const c of data.categories) for (const l of c.levels) for (const t of l.tasks) if (t.id === taskId) return t.time || 0;
      return 0;
    })();
    return timerRef.current.id === taskId ? base + elapsed : base;
  };

  const startStop = (taskId) => {
    if (timerRef.current.id === taskId) {
      // stop
      const secs = Math.floor((Date.now() - timerRef.current.start) / 1000);
      timerRef.current = { id: null, start: null };
      setActiveTimer(null);
      update(d => {
        for (const c of d.categories) for (const l of c.levels) for (const t of l.tasks)
          if (t.id === taskId) { t.time = (t.time || 0) + secs; break; }
        return d;
      });
    } else {
      // save previous if running
      if (timerRef.current.id) {
        const prev = timerRef.current.id;
        const secs = Math.floor((Date.now() - timerRef.current.start) / 1000);
        update(d => {
          for (const c of d.categories) for (const l of c.levels) for (const t of l.tasks)
            if (t.id === prev) { t.time = (t.time || 0) + secs; break; }
          return d;
        });
      }
      timerRef.current = { id: taskId, start: Date.now() };
      setActiveTimer(taskId);
    }
  };

  const toggleDone = (taskId) => {
    if (timerRef.current.id === taskId) {
      const secs = Math.floor((Date.now() - timerRef.current.start) / 1000);
      timerRef.current = { id: null, start: null };
      setActiveTimer(null);
      update(d => {
        for (const c of d.categories) for (const l of c.levels) for (const t of l.tasks)
          if (t.id === taskId) { t.time = (t.time || 0) + secs; t.done = !t.done; break; }
        return d;
      });
    } else {
      update(d => {
        for (const c of d.categories) for (const l of c.levels) for (const t of l.tasks)
          if (t.id === taskId) { t.done = !t.done; break; }
        return d;
      });
    }
  };

  // loading / login screens
  if (user === undefined) return <Screen><p style={{color:"#555",fontSize:13}}>loading...</p></Screen>;
  if (!user) return <LoginScreen />;
  if (!data) return <Screen><p style={{color:"#555",fontSize:13}}>loading your data...</p></Screen>;

  const activeCat = data.categories.find(c => c.id === data.activeCategory) || data.categories[0];
  const allTasks = data.categories.flatMap(c => c.levels.flatMap(l => l.tasks));
  const totalDone = allTasks.filter(t => t.done).length;
  const totalTime = allTasks.reduce((a, t) => a + getLive(t.id), 0);
  const pct = allTasks.length ? Math.round(totalDone / allTasks.length * 100) : 0;
  const syncColor = sync === "saving" ? "#F59E0B" : sync === "saved" ? "#22C55E" : sync === "error" ? "#EF4444" : "#444";

  return (
    <div style={{ fontFamily: "'DM Mono','Courier New',monospace", background: "#090909", minHeight: "100vh", color: "#E2E2E2" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, button { font-family: inherit; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.2} }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #333; }
      `}</style>

      {/* NAV */}
      <div style={{ position: "sticky", top: 0, zIndex: 99, background: "#090909ee", backdropFilter: "blur(10px)", borderBottom: "1px solid #1C1C1C", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#E2E2E2" }}>track<span style={{ color: activeCat?.color || "#3B82F6" }}>.</span>it</div>
          <div style={{ fontSize: 9, color: syncColor, marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
            {sync === "saving" && <span style={{ display: "inline-block", animation: "spin .8s linear infinite" }}>⟳</span>}
            {sync === "saving" ? "saving..." : sync === "saved" ? "✓ saved" : sync === "error" ? "save error" : user.displayName}
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, background: "#141414", borderRadius: 8, padding: 2, border: "1px solid #1C1C1C" }}>
          {[["track","track"],["edit","edit"],["stats","stats"]].map(([p, label]) => (
            <button key={p} onClick={() => setPage(p)} style={{ fontSize: 10, padding: "4px 12px", borderRadius: 6, background: page === p ? "#222" : "transparent", color: page === p ? "#E2E2E2" : "#555", border: "none", cursor: "pointer" }}>{label}</button>
          ))}
        </div>
        <button onClick={logOut} style={{ fontSize: 10, padding: "4px 8px", background: "transparent", border: "1px solid #222", borderRadius: 6, color: "#444", cursor: "pointer" }}>out</button>
      </div>

      {/* STATS STRIP */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 10 }}>
          {[["done", `${totalDone}/${allTasks.length}`], ["pct", `${pct}%`], ["time", fmtHuman(totalTime)], ["xp", `${totalDone * 100}`]].map(([k, v]) => (
            <div key={k} style={{ background: "#141414", border: "1px solid #1C1C1C", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.08em", marginBottom: 3 }}>{k.toUpperCase()}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 2, background: "#1C1C1C", borderRadius: 1, marginBottom: 12 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#1D4ED8,#6D28D9)", borderRadius: 1, transition: "width .5s" }} />
        </div>
      </div>

      {/* CATEGORY TABS */}
      <div style={{ display: "flex", gap: 6, padding: "0 16px 10px", overflowX: "auto" }}>
        {data.categories.map(cat => (
          <button key={cat.id} onClick={() => update(d => { d.activeCategory = cat.id; return d; })}
            style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, border: `1px solid ${cat.id === data.activeCategory ? cat.color : "#1C1C1C"}`, background: cat.id === data.activeCategory ? cat.color + "22" : "transparent", color: cat.id === data.activeCategory ? cat.color : "#555", cursor: "pointer", whiteSpace: "nowrap" }}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* RUNNING TIMER BANNER */}
      {activeTimer && (() => {
        const task = data.categories.flatMap(c => c.levels.flatMap(l => l.tasks)).find(t => t.id === activeTimer);
        return (
          <div style={{ margin: "0 16px 10px", background: "#061810", border: "1px solid #0D3320", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E", animation: "pulse 1.2s infinite" }} />
            <span style={{ flex: 1, fontSize: 11, color: "#4ADE80", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task?.name}</span>
            <span style={{ fontSize: 15, fontWeight: 500, color: "#22C55E", fontVariantNumeric: "tabular-nums" }}>{fmtTimer(getLive(activeTimer))}</span>
            <button onClick={() => startStop(activeTimer)} style={{ fontSize: 10, padding: "3px 10px", background: "#0D3320", border: "1px solid #22C55E55", borderRadius: 5, color: "#22C55E", cursor: "pointer" }}>■ stop</button>
          </div>
        );
      })()}

      {/* PAGES */}
      <div style={{ padding: "0 16px 60px" }}>
        {page === "track" && <TrackPage cat={activeCat} activeTimer={activeTimer} getLive={getLive} startStop={startStop} toggleDone={toggleDone} update={update} />}
        {page === "edit"  && <EditPage data={data} update={update} setPage={setPage} />}
        {page === "stats" && <StatsPage data={data} getLive={getLive} />}
      </div>
    </div>
  );
}

// ── TRACK PAGE ────────────────────────────────────────────────────────────────
function TrackPage({ cat, activeTimer, getLive, startStop, toggleDone, update }) {
  const [openLv, setOpenLv] = useState({ [cat.levels[0]?.id]: true });
  const allTasks = cat.levels.flatMap(l => l.tasks);
  const done = allTasks.filter(t => t.done).length;
  const pct = allTasks.length ? Math.round(done / allTasks.length * 100) : 0;

  return (
    <div>
      {/* category header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: cat.color }}>{cat.name}</div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>{done}/{allTasks.length} tasks · {pct}%</div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 500, color: "#1C1C1C" }}>{pct}%</div>
        </div>
        <div style={{ height: 2, background: "#1C1C1C", borderRadius: 1 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: cat.color, transition: "width .5s", borderRadius: 1 }} />
        </div>
      </div>

      {cat.levels.map(lv => {
        const lvDone = lv.tasks.filter(t => t.done).length;
        const lvPct = lv.tasks.length ? Math.round(lvDone / lv.tasks.length * 100) : 0;
        const lvTime = lv.tasks.reduce((a, t) => a + getLive(t.id), 0);
        const open = !!openLv[lv.id];

        return (
          <div key={lv.id} style={{ marginBottom: 8, border: `1px solid ${open ? cat.color + "44" : "#181818"}`, borderRadius: 10, overflow: "hidden", background: "#0E0E0E" }}>
            <div onClick={() => setOpenLv(p => ({ ...p, [lv.id]: !p[lv.id] }))}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", cursor: "pointer", background: open ? cat.color + "09" : "transparent" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#D0D0D0" }}>{lv.name}</div>
                {lv.subtitle && <div style={{ fontSize: 10, color: "#383838", marginTop: 1 }}>{lv.subtitle}</div>}
              </div>
              {lvTime > 0 && <span style={{ fontSize: 10, color: "#22C55E", background: "#061810", padding: "1px 7px", borderRadius: 20 }}>{fmtHuman(lvTime)}</span>}
              <span style={{ fontSize: 11, color: cat.color, fontWeight: 500 }}>{lvPct}%</span>
              <span style={{ fontSize: 10, color: "#333" }}>{open ? "▴" : "▾"}</span>
            </div>
            <div style={{ height: 1, background: "#141414" }}>
              <div style={{ height: "100%", width: `${lvPct}%`, background: cat.color + "55", transition: "width .4s" }} />
            </div>

            {open && (
              <div style={{ padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                {lv.tasks.map(t => {
                  const live = getLive(t.id);
                  const running = activeTimer === t.id;
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, background: running ? "#061810" : "#111", border: `1px solid ${running ? "#0D3320" : "#191919"}` }}>
                      <div onClick={() => toggleDone(t.id)}
                        style={{ width: 17, height: 17, borderRadius: 4, border: `1.5px solid ${t.done ? cat.color : "#2C2C2C"}`, background: t.done ? cat.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                        {t.done && <span style={{ fontSize: 10, color: "#000", fontWeight: 700, lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ flex: 1, fontSize: 11, color: t.done ? "#333" : "#C0C0C0", textDecoration: t.done ? "line-through" : "none" }}>{t.name}</span>
                      <span style={{ fontSize: 10, color: running ? "#22C55E" : live > 0 ? "#555" : "#222", fontVariantNumeric: "tabular-nums", minWidth: 40, textAlign: "right" }}>
                        {running ? fmtTimer(live) : live > 0 ? fmtHuman(live) : "—"}
                      </span>
                      <button onClick={() => startStop(t.id)}
                        style={{ width: 28, height: 28, borderRadius: 5, border: `1px solid ${running ? "#22C55E55" : "#222"}`, background: running ? "#0A2218" : "transparent", color: running ? "#22C55E" : "#333", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                        {running ? "■" : "▶"}
                      </button>
                    </div>
                  );
                })}
                <Adder color={cat.color} placeholder="+ add task" onAdd={(name) => update(d => {
                  const l = d.categories.find(c => c.id === cat.id)?.levels.find(l => l.id === lv.id);
                  if (l) l.tasks.push({ id: genId(), name, done: false, time: 0 });
                  return d;
                })} />
              </div>
            )}
          </div>
        );
      })}

      <Adder color={cat.color} placeholder="+ add level" big onAdd={(name) => update(d => {
        const c = d.categories.find(c => c.id === cat.id);
        if (c) c.levels.push({ id: genId(), name, subtitle: "", tasks: [] });
        return d;
      })} />
    </div>
  );
}

// ── EDIT PAGE ─────────────────────────────────────────────────────────────────
function EditPage({ data, update, setPage }) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[1]);
  const [editId, setEditId] = useState(null);

  return (
    <div>
      <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.08em", marginBottom: 14 }}>CATEGORIES</div>

      {data.categories.map(cat => (
        <div key={cat.id} style={{ marginBottom: 8, border: "1px solid #1A1A1A", borderRadius: 10, overflow: "hidden", background: "#0E0E0E" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
            {editId === cat.id
              ? <input value={cat.name} onChange={e => update(d => { const c = d.categories.find(x => x.id === cat.id); if (c) c.name = e.target.value; return d; })}
                  style={{ flex: 1, fontSize: 12, background: "#111", border: "1px solid #2A2A2A", borderRadius: 5, color: "#E2E2E2", padding: "3px 8px" }} />
              : <span style={{ flex: 1, fontSize: 12, color: "#D0D0D0", fontWeight: 500 }}>{cat.name}</span>
            }
            <span style={{ fontSize: 10, color: "#2A2A2A" }}>{cat.levels.flatMap(l => l.tasks).length} tasks</span>
            <button onClick={() => setEditId(editId === cat.id ? null : cat.id)}
              style={{ fontSize: 10, padding: "3px 8px", background: "transparent", border: "1px solid #222", borderRadius: 5, color: "#555", cursor: "pointer" }}>
              {editId === cat.id ? "done" : "edit"}
            </button>
            {data.categories.length > 1 && (
              <button onClick={() => update(d => { d.categories = d.categories.filter(c => c.id !== cat.id); if (d.activeCategory === cat.id) d.activeCategory = d.categories[0]?.id; return d; })}
                style={{ fontSize: 10, padding: "3px 8px", background: "transparent", border: "1px solid #2A1515", borderRadius: 5, color: "#5A2A2A", cursor: "pointer" }}>del</button>
            )}
          </div>

          {editId === cat.id && (
            <div style={{ padding: "0 12px 12px", borderTop: "1px solid #141414" }}>
              <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.08em", margin: "10px 0 6px" }}>COLOR</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => update(d => { const x = d.categories.find(x => x.id === cat.id); if (x) x.color = c; return d; })}
                    style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: `2.5px solid ${cat.color === c ? "#fff" : "transparent"}` }} />
                ))}
              </div>
              <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.08em", marginBottom: 6 }}>LEVELS</div>
              {cat.levels.map(lv => (
                <div key={lv.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ flex: 1, fontSize: 11, color: "#444" }}>{lv.name} ({lv.tasks.length} tasks)</span>
                  <button onClick={() => update(d => { const c = d.categories.find(c => c.id === cat.id); if (c) c.levels = c.levels.filter(l => l.id !== lv.id); return d; })}
                    style={{ fontSize: 10, padding: "2px 7px", background: "transparent", border: "1px solid #2A1515", borderRadius: 4, color: "#5A2A2A", cursor: "pointer" }}>del</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* new category */}
      <div style={{ marginTop: 16, border: "1px dashed #1C1C1C", borderRadius: 10, padding: "14px 12px", background: "#0A0A0A" }}>
        <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.08em", marginBottom: 10 }}>NEW CATEGORY</div>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && newName.trim()) { update(d => { const id = genId(); d.categories.push({ id, name: newName.trim(), color: newColor, levels: [] }); d.activeCategory = id; return d; }); setNewName(""); setPage("track"); } }}
          placeholder="e.g. Fitness, Arabic, Side project..."
          style={{ width: "100%", fontSize: 12, background: "#111", border: "1px solid #1C1C1C", borderRadius: 7, color: "#E2E2E2", padding: "8px 10px", marginBottom: 10 }} />
        <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.08em", marginBottom: 6 }}>COLOR</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => setNewColor(c)}
              style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: `2.5px solid ${newColor === c ? "#fff" : "transparent"}` }} />
          ))}
        </div>
        <button onClick={() => { if (!newName.trim()) return; update(d => { const id = genId(); d.categories.push({ id, name: newName.trim(), color: newColor, levels: [] }); d.activeCategory = id; return d; }); setNewName(""); setPage("track"); }}
          style={{ width: "100%", padding: "9px", background: newColor, border: "none", borderRadius: 7, color: "#000", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Create Category
        </button>
      </div>
    </div>
  );
}

// ── STATS PAGE ────────────────────────────────────────────────────────────────
function StatsPage({ data, getLive }) {
  const allTasks = data.categories.flatMap(c => c.levels.flatMap(l => l.tasks.map(t => ({ ...t, catColor: c.color, live: getLive(t.id) }))));
  const totalDone = allTasks.filter(t => t.done).length;
  const totalTime = allTasks.reduce((a, t) => a + t.live, 0);
  const top = [...allTasks].filter(t => t.live > 0).sort((a, b) => b.live - a.live).slice(0, 8);
  const maxT = top[0]?.live || 1;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
        {[["done", totalDone], ["total", allTasks.length], ["time", fmtHuman(totalTime)]].map(([k, v]) => (
          <div key={k} style={{ background: "#0E0E0E", border: "1px solid #181818", borderRadius: 8, padding: "10px" }}>
            <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.08em", marginBottom: 4 }}>{k.toUpperCase()}</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#D0D0D0" }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: "#333", letterSpacing: "0.08em", marginBottom: 10 }}>BY CATEGORY</div>
      {data.categories.map(cat => {
        const tasks = cat.levels.flatMap(l => l.tasks.map(t => ({ ...t, live: getLive(t.id) })));
        const done = tasks.filter(t => t.done).length;
        const time = tasks.reduce((a, t) => a + t.live, 0);
        const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
        return (
          <div key={cat.id} style={{ marginBottom: 8, background: "#0E0E0E", border: "1px solid #181818", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color }} />
                <span style={{ fontSize: 12, color: "#C0C0C0" }}>{cat.name}</span>
              </div>
              <span style={{ fontSize: 11, color: "#444" }}>{pct}% · {fmtHuman(time)}</span>
            </div>
            <div style={{ height: 3, background: "#141414", borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 2, transition: "width .4s" }} />
            </div>
            <div style={{ fontSize: 10, color: "#252525", marginTop: 4 }}>{done} of {tasks.length} tasks</div>
          </div>
        );
      })}

      {top.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, color: "#333", letterSpacing: "0.08em", marginBottom: 10 }}>MOST TIME SPENT</div>
          <div style={{ background: "#0E0E0E", border: "1px solid #181818", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {top.map(t => (
              <div key={t.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: "#555", maxWidth: "75%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: t.done ? "line-through" : "none" }}>{t.name}</span>
                  <span style={{ fontSize: 10, color: "#444" }}>{fmtHuman(t.live)}</span>
                </div>
                <div style={{ height: 2, background: "#141414", borderRadius: 1 }}>
                  <div style={{ height: "100%", width: `${Math.round(t.live / maxT * 100)}%`, background: t.catColor + "77", borderRadius: 1 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ADDER ─────────────────────────────────────────────────────────────────────
function Adder({ placeholder, onAdd, color, big }) {
  const [val, setVal] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ fontSize: 10, padding: big ? "8px 10px" : "5px 10px", background: "transparent", border: `1px dashed ${color}33`, borderRadius: 6, color: color + "66", cursor: "pointer", width: "100%", textAlign: "left", marginTop: big ? 8 : 0 }}>
      {placeholder}
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 5, marginTop: big ? 8 : 0 }}>
      <input autoFocus value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); setOpen(false); } if (e.key === "Escape") setOpen(false); }}
        placeholder="Type and press Enter..."
        style={{ flex: 1, fontSize: 11, background: "#111", border: `1px solid ${color}44`, borderRadius: 6, color: "#E2E2E2", padding: "6px 9px" }} />
      <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); } setOpen(false); }}
        style={{ fontSize: 10, padding: "6px 10px", background: color + "22", border: `1px solid ${color}44`, borderRadius: 6, color: color, cursor: "pointer" }}>add</button>
      <button onClick={() => setOpen(false)}
        style={{ fontSize: 10, padding: "6px 8px", background: "transparent", border: "1px solid #222", borderRadius: 6, color: "#333", cursor: "pointer" }}>✕</button>
    </div>
  );
}

// ── SCREENS ───────────────────────────────────────────────────────────────────
function Screen({ children }) {
  return (
    <div style={{ background: "#090909", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Mono,monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400&display=swap');`}</style>
      {children}
    </div>
  );
}

function LoginScreen() {
  return (
    <Screen>
      <div style={{ maxWidth: 300, width: "100%", textAlign: "center", padding: "2rem" }}>
        <div style={{ fontSize: 9, color: "#222", letterSpacing: "0.16em", marginBottom: 20 }}>PERSONAL PROGRESS TRACKER</div>
        <div style={{ fontSize: 32, fontWeight: 500, color: "#E2E2E2", marginBottom: 8, letterSpacing: "-0.03em" }}>track<span style={{ color: "#3B82F6" }}>.</span>it</div>
        <div style={{ fontSize: 12, color: "#2A2A2A", marginBottom: 44, lineHeight: 1.9 }}>Track anything.<br />Careers. Skills. Habits.</div>
        <button onClick={signInWithGoogle}
          style={{ width: "100%", padding: "13px 20px", background: "#0E0E0E", border: "1px solid #1C1C1C", borderRadius: 10, color: "#E2E2E2", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>
        <div style={{ marginTop: 14, fontSize: 10, color: "#1A1A1A" }}>Private · synced · any device</div>
      </div>
    </Screen>
  );
}
