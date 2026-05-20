import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db, googleProvider, signInWithGoogle, logOut, onAuth, saveData, loadData } from "./firebase.js";

// ─── DATA ─────────────────────────────────────────────────────────────────────
const LEVELS = [
  {
    id:0, tag:"LVL 0", color:"#52525B", light:"#F4F4F5", title:"Foundation", subtitle:"Already completed",
    categories:[
      { name:"TIA Portal", tasks:[
        {id:"l0t0",name:"S7-1200 / 1500 programming"},
        {id:"l0t1",name:"S7-300 / 400 programming"},
        {id:"l0t2",name:"Ladder logic"},
        {id:"l0t3",name:"SCL programming"},
      ]},
      { name:"HMI / SCADA", tasks:[
        {id:"l0t4",name:"WinCC HMI screens and navigation"},
        {id:"l0t5",name:"Alarms and trends in WinCC"},
        {id:"l0t6",name:"VBScript in WinCC runtime"},
      ]},
      { name:"Programming basics", tasks:[
        {id:"l0t7",name:"Basic Python — loops, functions, files"},
        {id:"l0t8",name:"Basic SQL — SELECT, INSERT, UPDATE"},
        {id:"l0t9",name:"C intermediate — structs, pointers, state machine"},
      ]},
    ]
  },
  {
    id:1, tag:"LVL 1", color:"#1D4ED8", light:"#EFF6FF", title:"Python + SQL Power User", subtitle:"Months 1 – 3",
    categories:[
      { name:"Tools Setup", tasks:[
        {id:"l1t0",name:"Install Git on your computer"},
        {id:"l1t1",name:"Create GitHub account"},
        {id:"l1t2",name:"Push first project to GitHub"},
      ]},
      { name:"Python Skills", tasks:[
        {id:"l1t3",name:"pandas — read and filter CSV / Excel files"},
        {id:"l1t4",name:"pandas — group by and calculate averages"},
        {id:"l1t5",name:"pandas — export results to Excel"},
        {id:"l1t6",name:"sqlite3 — connect Python to database"},
        {id:"l1t7",name:"Read and write database rows from Python"},
      ]},
      { name:"OPC-UA", tasks:[
        {id:"l1t8",name:"Enable OPC-UA server on PLC in TIA Portal"},
        {id:"l1t9",name:"Install opcua library in Python"},
        {id:"l1t10",name:"Connect Python to PLC via OPC-UA"},
        {id:"l1t11",name:"Read live tag values from Python"},
        {id:"l1t12",name:"Build loop: read tags every 30 seconds"},
      ]},
      { name:"Boss Project", tasks:[
        {id:"l1t13",name:"Read 5 PLC tags → save to database → daily Excel report"},
        {id:"l1t14",name:"Push project to GitHub with README"},
      ]},
    ]
  },
  {
    id:2, tag:"LVL 2", color:"#0F766E", light:"#F0FDF9", title:"TIA Openness", subtitle:"Months 4 – 8",
    categories:[
      { name:"C# Basics", tasks:[
        {id:"l2t0",name:"Install Visual Studio Community"},
        {id:"l2t1",name:"Write a class with properties"},
        {id:"l2t2",name:"Use a list and loop through it"},
        {id:"l2t3",name:"Read a CSV file in C#"},
        {id:"l2t4",name:"Handle errors with try-catch"},
      ]},
      { name:"TIA Openness API", tasks:[
        {id:"l2t5",name:"Add Siemens.Engineering.dll reference"},
        {id:"l2t6",name:"Open a TIA project from C# code"},
        {id:"l2t7",name:"Loop through existing PLC tags and print them"},
        {id:"l2t8",name:"Create a new PLC tag from code"},
        {id:"l2t9",name:"Compile TIA project from code"},
      ]},
      { name:"Supporting Skills", tasks:[
        {id:"l2t10",name:"Parse XML file in Python"},
        {id:"l2t11",name:"Read and write JSON file in Python"},
        {id:"l2t12",name:"WinCC OA — dpGet and dpSet in CTRL script"},
        {id:"l2t13",name:"WinCC OA — dynamic color based on datapoint value"},
      ]},
      { name:"Boss Project", tasks:[
        {id:"l2t14",name:"Excel file → auto-generate 50 tags + HMI screens"},
        {id:"l2t15",name:"Push project to GitHub with README"},
      ]},
    ]
  },
  {
    id:3, tag:"LVL 3", color:"#B45309", light:"#FFFBEB", title:"MES & Dashboards", subtitle:"Months 9 – 14",
    categories:[
      { name:"APIs", tasks:[
        {id:"l3t0",name:"Install FastAPI and uvicorn"},
        {id:"l3t1",name:"Build a route that returns JSON data"},
        {id:"l3t2",name:"Build a POST route that saves to database"},
        {id:"l3t3",name:"Expose live PLC tag values through the API"},
      ]},
      { name:"Grafana Dashboards", tasks:[
        {id:"l3t4",name:"Install Grafana locally"},
        {id:"l3t5",name:"Connect Grafana to SQL database"},
        {id:"l3t6",name:"Build a time series chart panel"},
        {id:"l3t7",name:"Build a gauge panel showing OEE"},
        {id:"l3t8",name:"Set auto-refresh every 30 seconds"},
      ]},
      { name:"MES Knowledge", tasks:[
        {id:"l3t9",name:"Learn OEE formula: Availability × Performance × Quality"},
        {id:"l3t10",name:"Design database schema for production data"},
        {id:"l3t11",name:"Write Python script that calculates OEE"},
      ]},
      { name:"Docker", tasks:[
        {id:"l3t12",name:"Install Docker Desktop"},
        {id:"l3t13",name:"Run hello-world container"},
        {id:"l3t14",name:"Write a Dockerfile for your Python app"},
        {id:"l3t15",name:"Build and run your app inside Docker"},
      ]},
      { name:"Boss Project", tasks:[
        {id:"l3t16",name:"Full pipeline: PLC → OPC-UA → Python → SQL → Grafana"},
        {id:"l3t17",name:"Wrap everything in Docker"},
        {id:"l3t18",name:"Push to GitHub with screenshots and README"},
      ]},
    ]
  },
  {
    id:4, tag:"LVL 4", color:"#6D28D9", light:"#F5F3FF", title:"Get the Job", subtitle:"Month 14+",
    categories:[
      { name:"Portfolio", tasks:[
        {id:"l4t0",name:"3 boss projects on GitHub with clean code"},
        {id:"l4t1",name:"README with screenshot for each project"},
        {id:"l4t2",name:"GitHub profile page set up with pinned projects"},
      ]},
      { name:"Job Search", tasks:[
        {id:"l4t3",name:"Search: Automation Software Developer"},
        {id:"l4t4",name:"Search: MES Engineer"},
        {id:"l4t5",name:"Search: SCADA Developer"},
        {id:"l4t6",name:"Search: Digital Factory Engineer"},
        {id:"l4t7",name:"Apply to minimum 10 positions"},
      ]},
      { name:"Freelance", tasks:[
        {id:"l4t8",name:"Create Upwork profile"},
        {id:"l4t9",name:"Write your niche: TIA Portal automation + factory dashboards"},
        {id:"l4t10",name:"Complete first small freelance project"},
      ]},
      { name:"Community", tasks:[
        {id:"l4t11",name:"Create account on Siemens SIOS portal"},
        {id:"l4t12",name:"Answer 5 questions in TIA Portal forum"},
        {id:"l4t13",name:"Join r/PLC on Reddit"},
      ]},
    ]
  },
];

const ALL_TASKS = LEVELS.flatMap(l => l.categories.flatMap(c => c.tasks));

function pad(n){ return String(n).padStart(2,"0"); }
function fmtTimer(s){
  s=Math.max(0,Math.floor(s));
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
  if(h>0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}
function fmtHuman(s){
  s=Math.floor(s);
  if(s===0) return "—";
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);
  if(h>0) return `${h}h ${m}m`;
  if(m>0) return `${m}m`;
  return `${s}s`;
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App(){
  const [user, setUser] = useState(undefined); // undefined = loading
  const [done, setDone] = useState({});
  const [times, setTimes] = useState({});
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerStart, setTimerStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [page, setPage] = useState("tasks");
  const [openLv, setOpenLv] = useState({1:true});
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | saving | saved | error
  const [isDarkMode, setIsDarkMode] = useState(true);
  const intervalRef = useRef(null);
  const saveTimeout = useRef(null);

  // auth listener
  useEffect(()=>{
    const unsub = onAuth(async (u)=>{
      setUser(u);
      if(u){
        try {
          const data = await loadData(u.uid);
          if(data){
            setDone(data.done||{});
            setTimes(data.times||{});
            setOpenLv(data.openLv||{1:true});
            if(data.isDarkMode !== undefined) setIsDarkMode(data.isDarkMode);
          } else {
            // first login — mark level 0 done
            const d={};
            LEVELS[0].categories.forEach(c=>c.tasks.forEach(t=>{ d[t.id]=true; }));
            setDone(d);
          }
        } catch(e){}
      }
    });
    return unsub;
  },[]);

  // live timer
  useEffect(()=>{
    if(activeTimer){
      intervalRef.current = setInterval(()=> setElapsed(Math.floor((Date.now()-timerStart)/1000)), 500);
    } else {
      clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return ()=> clearInterval(intervalRef.current);
  },[activeTimer, timerStart]);

  const persist = useCallback((d, t, ol, dm)=>{
    if(!user) return;
    if(saveTimeout.current) clearTimeout(saveTimeout.current);
    setSyncStatus("saving");
    saveTimeout.current = setTimeout(async()=>{
      try {
        await saveData(user.uid, { done:d, times:t, openLv:ol, isDarkMode:dm });
        setSyncStatus("saved");
        setTimeout(()=> setSyncStatus("idle"), 2000);
      } catch(e){ setSyncStatus("error"); }
    }, 1000);
  },[user]);

  const getLive = (tid)=>{
    const base = times[tid]||0;
    if(activeTimer===tid) return base+elapsed;
    return base;
  };

  const startTimer = (tid)=>{
    if(activeTimer && activeTimer!==tid){
      const secs = Math.floor((Date.now()-timerStart)/1000);
      setTimes(prev=>{
        const next={...prev,[activeTimer]:(prev[activeTimer]||0)+secs};
        persist(done,next,openLv,isDarkMode);
        return next;
      });
    }
    setActiveTimer(tid);
    setTimerStart(Date.now());
  };

  const stopTimer = (tid)=>{
    if(activeTimer!==tid) return;
    const secs = Math.floor((Date.now()-timerStart)/1000);
    setTimes(prev=>{
      const next={...prev,[tid]:(prev[tid]||0)+secs};
      persist(done,next,openLv,isDarkMode);
      return next;
    });
    setActiveTimer(null);
    setTimerStart(null);
  };

  const toggleDone = (tid)=>{
    if(activeTimer===tid) stopTimer(tid);
    setDone(prev=>{
      const next={...prev,[tid]:!prev[tid]};
      persist(next,times,openLv,isDarkMode);
      return next;
    });
  };

  const toggleLv = (id)=>{
    setOpenLv(prev=>{
      const next={...prev,[id]:!prev[id]};
      persist(done,times,next,isDarkMode);
      return next;
    });
  };

  const toggleTheme = (darkOpt) => {
    setIsDarkMode(darkOpt);
    persist(done,times,openLv,darkOpt);
  };

  const totalDone = ALL_TASKS.filter(t=>done[t.id]).length;
  const totalTasks = ALL_TASKS.length;
  const pct = Math.round((totalDone/totalTasks)*100);
  const totalSecs = ALL_TASKS.reduce((a,t)=>a+getLive(t.id),0);

  // Theme Dynamic Values
  const bgMain = isDarkMode ? "#0A0A0A" : "#FFFFFF";
  const bgCard = isDarkMode ? "#18181B" : "#FAFAFA";
  const bgSubCard = isDarkMode ? "#111113" : "#F4F4F5";
  const borderCol = isDarkMode ? "#27272A" : "#E4E4E7";
  const textPrimary = isDarkMode ? "#FAFAFA" : "#18181B";
  const textSecondary = isDarkMode ? "#A1A1AA" : "#52525B";
  const textMuted = isDarkMode ? "#52525B" : "#A1A1AA";

  // ── LOADING ──
  if(user===undefined){
    return (
      <div style={{background:"#0A0A0A",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{color:"#52525B",fontFamily:"DM Mono, monospace",fontSize:13}}>loading...</div>
      </div>
    );
  }

  // ── LOGIN SCREEN ──
  if(!user){
    return (
      <div style={{background:"#0A0A0A",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"DM Mono, monospace",padding:"2rem"}}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>
        <div style={{maxWidth:340,width:"100%",textAlign:"center"}}>
          <div style={{fontSize:11,color:"#52525B",letterSpacing:"0.1em",marginBottom:16}}>AUTOMATION → SOFTWARE DEVELOPER</div>
          <div style={{fontSize:28,fontWeight:500,color:"#FAFAFA",marginBottom:8}}>career.track</div>
          <div style={{fontSize:13,color:"#71717A",marginBottom:40,lineHeight:1.7}}>Your personal progress tracker.<br/>Sign in to access from any device.</div>
          <button onClick={signInWithGoogle} style={{width:"100%",padding:"13px 20px",background:"#18181B",border:"1px solid #3F3F46",borderRadius:10,color:"#FAFAFA",fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:12,transition:"border-color .2s"}}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
            Continue with Google
          </button>
          <div style={{marginTop:20,fontSize:11,color:"#3F3F46"}}>Your data is private and tied to your Google account.</div>
        </div>
      </div>
    );
  }

  // ── MAIN APP ──
  return (
    <div style={{fontFamily:"DM Mono, monospace",background:bgMain,minHeight:"100vh",color:textPrimary,transition:"background 0.2s, color 0.2s"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>

      {/* TOP BAR */}
      <div style={{position:"sticky",top:0,zIndex:50,background:bgMain,borderBottom:`1px solid ${borderCol}`,padding:"10px 16px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:500,color:textPrimary}}>track.it</div>
          <div style={{fontSize:10,color:textSecondary}}>
            {syncStatus==="saving" && "syncing..."}
            {syncStatus==="saved" && "✓ synced"}
            {syncStatus==="error" && "sync error"}
            {syncStatus==="idle" && user.displayName}
          </div>
        </div>
        <div style={{display:"flex",background:bgCard,borderRadius:8,border:`1px solid ${borderCol}`,overflow:"hidden"}}>
          {["tasks","stats"].map(p=>(
            <button key={p} onClick={()=>setPage(p)} style={{fontSize:11,padding:"5px 14px",background:page===p?borderCol:"transparent",color:page===p?textPrimary:textSecondary,border:"none",cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.04em"}}>{p}</button>
          ))}
        </div>
        <button onClick={logOut} style={{fontSize:11,padding:"5px 10px",background:"transparent",border:`1px solid ${borderCol}`,borderRadius:7,color:textSecondary,cursor:"pointer",fontFamily:"inherit"}}>sign out</button>
      </div>

      {/* STATS STRIP */}
      <div style={{padding:"14px 16px 0"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
          {[["done",`${totalDone}/${totalTasks}`],["progress",`${pct}%`],["time",fmtHuman(totalSecs)],["xp",`${totalDone*100}`]].map(([label,val])=>(
            <div key={label} style={{background:bgCard,border:`1px solid ${borderCol}`,borderRadius:8,padding:"8px 10px"}}>
              <div style={{fontSize:9,color:textMuted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3}}>{label}</div>
              <div style={{fontSize:14,fontWeight:500,color:textPrimary}}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{height:3,background:borderCol,borderRadius:2,marginBottom:14}}>
          <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#1D4ED8,#6D28D9)",borderRadius:2,transition:"width .5s"}}/>
        </div>
      </div>

      {/* ACTIVE TIMER BANNER */}
      {activeTimer&&(()=>{
        const t=ALL_TASKS.find(t=>t.id===activeTimer);
        return(
          <div style={{margin:"0 16px 12px",background:isDarkMode?"#052e16":"#DCFCE7",border:"1px solid #22C55E",borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#22C55E",animation:"pulse 1s infinite"}}/>
            <div style={{flex:1,fontSize:11,color:isDarkMode?"#86EFAC":"#15803D",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t?.name}</div>
            <div style={{fontSize:16,fontWeight:500,color:"#22C55E",fontVariantNumeric:"tabular-nums"}}>{fmtTimer(getLive(activeTimer))}</div>
            <button onClick={()=>stopTimer(activeTimer)} style={{fontSize:11,padding:"3px 10px",background:isDarkMode?"#166534":"#BBF7D0",border:"1px solid #22C55E",borderRadius:6,color:isDarkMode?"#22C55E":"#166534",cursor:"pointer",fontFamily:"inherit"}}>■ stop</button>
          </div>
        );
      })()}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

      {page==="tasks"
        ? <TasksPage levels={LEVELS} done={done} getLive={getLive} activeTimer={activeTimer} toggleDone={toggleDone} startTimer={startTimer} stopTimer={stopTimer} openLv={openLv} toggleLv={toggleLv} isDarkMode={isDarkMode} bgCard={bgCard} bgSubCard={bgSubCard} borderCol={borderCol} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted}/>
        : <StatsPage done={done} getLive={getLive} totalSecs={totalSecs} isDarkMode={isDarkMode} bgCard={bgCard} bgSubCard={bgSubCard} borderCol={borderCol} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted}/>
      }

      {/* PRESETS & THEME SETTINGS BLOCK (Matched exactly to previous build mockup) */}
      <div style={{padding:"0 16px 40px", marginTop: "20px"}}>
        <div style={{border:`1px solid ${borderCol}`, borderRadius:10, background:bgSubCard, overflow:"hidden", padding:"16px"}}>
          <h3 style={{fontSize:14, fontWeight:500, color:textPrimary, marginBottom:12}}>Settings</h3>
          
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14}}>
            <span style={{fontSize:12, color:textSecondary}}>Color Theme</span>
            <div style={{display:"flex", background:bgCard, border:`1px solid ${borderCol}`, borderRadius:6, overflow:"hidden"}}>
              <button onClick={() => toggleTheme(false)} style={{fontFamily:"inherit", fontSize:11, padding:"6px 14px", border:"none", cursor:"pointer", background: !isDarkMode ? "#1D4ED8" : "transparent", color: !isDarkMode ? "#FFFFFF" : textSecondary, fontWeight: !isDarkMode ? 500 : 400}}>Light</button>
              <button onClick={() => toggleTheme(true)} style={{fontFamily:"inherit", fontSize:11, padding:"6px 14px", border:"none", cursor:"pointer", background: isDarkMode ? "#1D4ED8" : "transparent", color: isDarkMode ? "#FFFFFF" : textSecondary, fontWeight: isDarkMode ? 500 : 400}}>Dark</button>
            </div>
          </div>
          
          <div style={{fontSize:11, color:textMuted, lineHeight: 1.5}}>
            <div style={{marginBottom:4}}>Account: connected</div>
            <div>Integrations: Cloud Sync Storage</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TASKS PAGE ───────────────────────────────────────────────────────────────
function TasksPage({levels,done,getLive,activeTimer,toggleDone,startTimer,stopTimer,openLv,toggleLv,isDarkMode,bgCard,bgSubCard,borderCol,textPrimary,textSecondary,textMuted}){
  return(
    <div style={{padding:"0 16px 10px"}}>
      {levels.map(lv=>{
        const allT=lv.categories.flatMap(c=>c.tasks);
        const lvDone=allT.filter(t=>done[t.id]).length;
        const lvPct=allT.length?Math.round(lvDone/allT.length*100):0;
        const lvSecs=allT.reduce((a,t)=>a+getLive(t.id),0);
        const isOpen=!!openLv[lv.id];
        const currentLvColor = isDarkMode ? lv.color : (lv.id === 0 ? "#71717A" : lv.color);
        
        return(
          <div key={lv.id} style={{marginBottom:10,border:`1px solid ${isOpen?currentLvColor+"55":borderCol}`,borderRadius:10,overflow:"hidden",background:bgSubCard}}>
            <div onClick={()=>toggleLv(lv.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",cursor:"pointer",background:isOpen?currentLvColor+"11":"transparent"}}>
              <span style={{fontSize:10,fontWeight:500,color:currentLvColor,background:currentLvColor+"22",padding:"2px 8px",borderRadius:20,border:`1px solid ${currentLvColor}44`,letterSpacing:"0.06em"}}>{lv.tag}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:textPrimary}}>{lv.title}</div>
                <div style={{fontSize:10,color:textSecondary,marginTop:1}}>{lv.subtitle}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,color:currentLvColor,fontWeight:500}}>{lvPct}%</div>
                {lvSecs>0&&<div style={{fontSize:10,color:textMuted}}>{fmtHuman(lvSecs)}</div>}
              </div>
              <span style={{fontSize:12,color:textMuted}}>{isOpen?"▴":"▾"}</span>
            </div>
            <div style={{height:2,background:borderCol}}>
              <div style={{height:"100%",width:`${lvPct}%`,background:currentLvColor,transition:"width .4s"}}/>
            </div>
            {isOpen&&(
              <div style={{padding:"10px 14px 14px"}}>
                {lv.categories.map(cat=>{
                  const catDone=cat.tasks.filter(t=>done[t.id]).length;
                  return(
                    <div key={cat.name} style={{marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <span style={{fontSize:10,color:textMuted,letterSpacing:"0.08em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{cat.name}</span>
                        <span style={{fontSize:10,color:textSecondary}}>{catDone}/{cat.tasks.length}</span>
                        <div style={{flex:1,height:1,background:borderCol}}/>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        {cat.tasks.map(t=>{
                          const isDone=!!done[t.id];
                          const isActive=activeTimer===t.id;
                          const liveTime=getLive(t.id);
                          return(
                            <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:7,background:bgCard,border:`1px solid ${isActive?"#166534":borderCol}`,transition:"border-color .2s"}}>
                              <div onClick={()=>toggleDone(t.id)} style={{width:17,height:17,borderRadius:4,border:`1.5px solid ${isDone?currentLvColor:(isDarkMode?"#3F3F46":"#B4B4B8")}`,background:isDone?currentLvColor:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all .2s"}}>
                                {isDone&&<span style={{fontSize:10,color:"#fff",lineHeight:1}}>✓</span>}
                              </div>
                              <span style={{flex:1,fontSize:12,color:isDone?textMuted:textPrimary,textDecoration:isDone?"line-through":"none"}}>{t.name}</span>
                              <span style={{fontSize:11,color:isActive?"#22C55E":liveTime>0?textSecondary:textMuted,fontVariantNumeric:"tabular-nums",minWidth:44,textAlign:"right"}}>
                                {isActive?fmtTimer(liveTime):liveTime>0?fmtHuman(liveTime):"—"}
                              </span>
                              <button onClick={()=>isActive?stopTimer(t.id):startTimer(t.id)} style={{fontSize:11,padding:"3px 9px",borderRadius:5,border:`1px solid ${isActive?"#166534":(isDarkMode?"#3F3F46":"#B4B4B8")}`,background:isActive?(isDarkMode?"#052e16":"#DCFCE7"):"transparent",color:isActive?"#22C55E":textSecondary,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                                {isActive?"■":"▶"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── STATS PAGE ───────────────────────────────────────────────────────────────
function StatsPage({done,getLive,totalSecs,isDarkMode,bgCard,bgSubCard,borderCol,textPrimary,textSecondary,textMuted}){
  const topTasks=[...ALL_TASKS].map(t=>({...t,secs:getLive(t.id)})).filter(t=>t.secs>0).sort((a,b)=>b.secs-a.secs).slice(0,8);
  const maxSecs=topTasks[0]?.secs||1;

  return(
    <div style={{padding:"0 16px 10px"}}>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:10,color:textMuted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>Level breakdown</div>
        {LEVELS.map(lv=>{
          const allT=lv.categories.flatMap(c=>c.tasks);
          const lvDone=allT.filter(t=>done[t.id]).length;
          const lvSecs=allT.reduce((a,t)=>a+getLive(t.id),0);
          const lvPct=allT.length?Math.round(lvDone/allT.length*100):0;
          const currentLvColor = isDarkMode ? lv.color : (lv.id === 0 ? "#71717A" : lv.color);
          
          return(
            <div key={lv.id} style={{marginBottom:8,background:bgCard,border:`1px solid ${borderCol}`,borderRadius:8,padding:"10px 12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:10,color:currentLvColor,background:currentLvColor+"22",padding:"1px 7px",borderRadius:20,border:`1px solid ${currentLvColor}33`}}>{lv.tag}</span>
                  <span style={{fontSize:12,color:textPrimary}}>{lv.title}</span>
                </div>
                <div>
                  <span style={{fontSize:12,color:currentLvColor,fontWeight:500}}>{lvPct}%</span>
                  <span style={{fontSize:11,color:textMuted,marginLeft:8}}>{fmtHuman(lvSecs)}</span>
                </div>
              </div>
              <div style={{height:4,background:borderCol,borderRadius:2}}>
                <div style={{height:"100%",width:`${lvPct}%`,background:currentLvColor,borderRadius:2,transition:"width .4s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                <span style={{fontSize:10,color:textMuted}}>{lvDone} of {allT.length} tasks</span>
                <span style={{fontSize:10,color:textMuted}}>{fmtHuman(lvSecs)} logged</span>
              </div>
            </div>
          );
        })}
      </div>

      {topTasks.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,color:textMuted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>Most time spent</div>
          <div style={{background:bgCard,border:`1px solid ${borderCol}`,borderRadius:8,padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
            {topTasks.map(t=>{
              const barW=Math.round((t.secs/maxSecs)*100);
              const originLv = LEVELS.find(l=>l.categories.some(c=>c.tasks.some(tk=>tk.id===t.id)));
              const lvColor= originLv ? (isDarkMode ? originLv.color : (originLv.id === 0 ? "#71717A" : originLv.color)) : "#6D28D9";
              return(
                <div key={t.id}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:11,color:done[t.id]?textMuted:textSecondary,textDecoration:done[t.id]?"line-through":"none",maxWidth:"75%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span>
                    <span style={{fontSize:11,color:textSecondary,fontVariantNumeric:"tabular-nums"}}>{fmtHuman(t.secs)}</span>
                  </div>
                  <div style={{height:3,background:borderCol,borderRadius:2}}>
                    <div style={{height:"100%",width:`${barW}%`,background:lvColor+"99",borderRadius:2}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{background:bgCard,border:`1px solid ${borderCol}`,borderRadius:8,padding:"12px 14px"}}>
        <div style={{fontSize:10,color:textMuted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Total</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Total tasks",ALL_TASKS.length],["Completed",ALL_TASKS.filter(t=>done[t.id]).length],["Time logged",fmtHuman(totalSecs)],["XP earned",ALL_TASKS.filter(t=>done[t.id]).length*100]].map(([k,v])=>(
            <div key={k} style={{background:bgSubCard,border:`1px solid ${borderCol}`,borderRadius:6,padding:"8px 10px"}}>
              <div style={{fontSize:10,color:textMuted,marginBottom:2}}>{k}</div>
              <div style={{fontSize:15,fontWeight:500,color:textPrimary}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
