import { useState } from "react";

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  forest: "#2D4A2B", forestD: "#1B3019", forestL: "#4A6B47",
  cream: "#FAF3DC", creamS: "#F4E9C1", gold: "#D4A93C", goldL: "#E8C766",
  earth: "#5C4A2E", ink: "#1A1A1A", rose: "#C77B5A", red: "#C0392B",
};

// ─── SPEC DATA ────────────────────────────────────────────────────────────────
const PRODUCTS = [
  { id:"A", name:"Nanoki Plus",       desc:"โปรตีนพืช · ผู้สูงวัย 60-75 ปี",        price:820,  bags:16, scanToken:1.02, dailyToken:0.51, img:"🌿" },
  { id:"B", name:"Nanoki Wellness",   desc:"โปรตีนมะพร้าว · ระบบทางเดินอาหาร",     price:690,  bags:16, scanToken:0.86, dailyToken:0.43, img:"🥥" },
  { id:"C", name:"Nanoki Filling",    desc:"ข้าวโอ๊ตลูกเดือย · วัยทำงาน 18-35",    price:420,  bags:10, scanToken:0.84, dailyToken:0.42, img:"🌾" },
  { id:"D", name:"Nanoki Sweetdream", desc:"งาดำหล่อฮังก๊วย · ฟื้นฟูการนอน",       price:229,  bags:12, scanToken:0.38, dailyToken:0.19, img:"🌙" },
];

const WALLET_CAP = 2000;
const streakMult = d => d >= 180 ? 1.4 : d >= 60 ? 1.3 : d >= 30 ? 1.2 : d >= 16 ? 1.1 : 1.0;
const streakTier = d => d >= 180 ? { label:"Diamond", col:"#7DD3C0", next:null }
  : d >= 60  ? { label:"Gold",    col:C.gold,    next:180 }
  : d >= 30  ? { label:"Silver",  col:"#B0B0B0", next:60  }
  : d >= 16  ? { label:"Bronze",  col:C.rose,    next:30  }
  :            { label:"Starter", col:"#8B9F4D", next:16  };

const NANOKI_REWARDS = [
  { id:"nr1", cat:"product", name:"Nanoki Plus 1 กล่อง",       value:820,  tokens:399, icon:"🌿" },
  { id:"nr2", cat:"product", name:"Nanoki Wellness 1 กล่อง",   value:690,  tokens:334, icon:"🥥" },
  { id:"nr3", cat:"product", name:"Nanoki Filling 1 กล่อง",    value:420,  tokens:204, icon:"🌾" },
  { id:"nr4", cat:"product", name:"Nanoki Sweetdream 1 กล่อง", value:229,  tokens:111, icon:"🌙" },
  { id:"nr5", cat:"merch",   name:"ร่ม Nanoki",                value:199,  tokens:50,  icon:"☂️" },
  { id:"nr6", cat:"merch",   name:"ถุงผ้า Nanoki",             value:99,   tokens:25,  icon:"👜" },
  { id:"nr7", cat:"merch",   name:"Nanoki Gift Set",           value:599,  tokens:150, icon:"🎁" },
  { id:"nr8", cat:"discount",name:"ส่วนลด 20 บาท (10 Token min)",value:20, tokens:10,  icon:"🏷️" },
];

const ENT_ARTIST = { name:"PROXIMA", period:"ม.ค.–มิ.ย. 2569", emoji:"🎤" };
const ENT_REWARDS = [
  { id:"er1", name:"Wristband",           desc:"ริสแบนด์ลายเซ็น",              value:390,   tokens:89,   quota:500, remaining:500, hot:false },
  { id:"er2", name:"Signed Notebook",     desc:"สมุดบันทึกพร้อมลายเซ็น",      value:590,   tokens:119,  quota:250, remaining:187, hot:true  },
  { id:"er3", name:"Exclusive Photobook", desc:"หนังสือภาพ 80 หน้า",           value:1690,  tokens:349,  quota:100, remaining:42,  hot:true  },
  { id:"er4", name:"Farm Trip 3D2N",      desc:"ทัวร์ฟาร์ม + Vlog กับศิลปิน", value:10000, tokens:1500, quota:7,   remaining:7,   hot:true, exclusive:true },
];

// ─── INITIAL STATE ────────────────────────────────────────────────────────────
const TODAY = () => new Date().toDateString();
const initState = (u) => ({
  user: u,
  balance: u.new ? 0 : 587,
  streak: { days: u.new ? 0 : 23, lastDate: null },
  inventory: {},
  daily: {
    lastLogin: null, loginWeek: 0, lastWeekReset: null,
    consumed: [], repeatableCount: 0, lastRepeatableDate: null,
    steps: 0, stepsClaimed: false, stepsDate: null,
  },
  history: u.new ? [] : [
    { type:"scan",   label:"Scan Nanoki Plus",       amt:+1.02, t:"เมื่อวาน",    date:"sample" },
    { type:"daily",  label:"บริโภค Nanoki Wellness",  amt:+0.43, t:"เมื่อวาน",    date:"sample" },
    { type:"login",  label:"Daily Login",             amt:+1,    t:"2 วันที่แล้ว", date:"sample" },
    { type:"redeem", label:"แลก ถุงผ้า Nanoki",       amt:-25,   t:"3 วันที่แล้ว", date:"sample" },
  ],
  totalEverEarned: u.new ? 0 : 587,
});

// ─── REDUCER ──────────────────────────────────────────────────────────────────
function reducer(s, a) {
  switch (a.type) {
    case "SCAN_QR": {
      const { pid, date } = a;
      const p = PRODUCTS.find(x => x.id === pid);
      const mult = streakMult(s.streak.days);
      const yd = new Date(); yd.setDate(yd.getDate()-1);
      const cont = s.streak.lastDate === yd.toDateString() || s.streak.lastDate === date;
      const newDays = cont ? (s.streak.lastDate === date ? s.streak.days : s.streak.days + 1) : 1;
      const raw = +(p.scanToken * mult).toFixed(2);
      const earned = Math.min(raw, WALLET_CAP - s.balance);
      if (earned <= 0) return s;
      return {
        ...s,
        balance: +(s.balance + earned).toFixed(2),
        totalEverEarned: s.totalEverEarned + earned,
        streak: { days: newDays, lastDate: date },
        inventory: { ...s.inventory, [pid]: (s.inventory[pid] || 0) + p.bags },
        history: [{ type:"scan", label:`Scan ${p.name} (+${p.bags} ซอง)`, amt:+earned, t:"เมื่อสักครู่", date }, ...s.history],
      };
    }
    case "CONSUME": {
      const { pid, date, isRepeatable } = a;
      const p = PRODUCTS.find(x => x.id === pid);
      if ((s.inventory[pid] || 0) <= 0) return s;
      if (isRepeatable && s.daily.repeatableCount >= 2) return s;
      const mult = streakMult(s.streak.days);
      const raw = +(p.dailyToken * mult).toFixed(2);
      const earned = Math.min(raw, WALLET_CAP - s.balance);
      if (earned <= 0) return s;
      const newInv = { ...s.inventory, [pid]: s.inventory[pid] - 1 };
      const newDaily = { ...s.daily };
      if (isRepeatable) {
        newDaily.repeatableCount = (newDaily.lastRepeatableDate === date ? newDaily.repeatableCount : 0) + 1;
        newDaily.lastRepeatableDate = date;
      } else {
        newDaily.consumed = [...(newDaily.consumed || []), { pid, time: "เมื่อสักครู่" }];
      }
      return {
        ...s,
        balance: +(s.balance + earned).toFixed(2),
        totalEverEarned: s.totalEverEarned + earned,
        inventory: newInv, daily: newDaily,
        history: [{ type:"daily", label:`บริโภค ${p.name}`, amt:+earned, t:"เมื่อสักครู่", date }, ...s.history],
      };
    }
    case "STEPS": {
      const { steps, date } = a;
      const newDaily = { ...s.daily, steps, stepsDate: date };
      if (steps >= 10000 && !s.daily.stepsClaimed && s.daily.stepsDate !== date) {
        const earned = Math.min(0.1, WALLET_CAP - s.balance);
        newDaily.stepsClaimed = true;
        return {
          ...s, balance: +(s.balance + earned).toFixed(2),
          totalEverEarned: s.totalEverEarned + earned, daily: newDaily,
          history: [{ type:"steps", label:"เดิน 10,000 ก้าว", amt:+earned, t:"เมื่อสักครู่", date }, ...s.history],
        };
      }
      return { ...s, daily: newDaily };
    }
    case "LOGIN": {
      const { date } = a;
      if (s.daily.lastLogin === date) return s;
      const isMonday = new Date().getDay() === 1;
      const weekProg = isMonday && s.daily.lastWeekReset !== date ? 0 : s.daily.loginWeek;
      const newWeek = weekProg + 1;
      const earned = Math.min(newWeek === 7 ? 4 : 1, WALLET_CAP - s.balance);
      return {
        ...s, balance: +(s.balance + earned).toFixed(2),
        totalEverEarned: s.totalEverEarned + earned,
        daily: { ...s.daily, lastLogin: date, loginWeek: newWeek >= 7 ? 0 : newWeek, lastWeekReset: isMonday ? date : s.daily.lastWeekReset },
        history: [{ type:"login", label:"Daily Login"+(newWeek===7?" 🎉":""), amt:+earned, t:"เมื่อสักครู่", date }, ...s.history],
      };
    }
    case "REDEEM": {
      const { reward, date } = a;
      if (s.balance < reward.tokens) return s;
      return {
        ...s, balance: +(s.balance - reward.tokens).toFixed(2),
        history: [{ type:"redeem", label:`แลก ${reward.name}`, amt:-reward.tokens, t:"เมื่อสักครู่", date }, ...s.history],
      };
    }
    case "TRANSFER": {
      const { to, amount, date } = a;
      if (s.balance < amount) return s;
      return {
        ...s, balance: +(s.balance - amount).toFixed(2),
        history: [{ type:"transfer", label:`โอนให้ ${to}`, amt:-amount, t:"เมื่อสักครู่", date }, ...s.history],
      };
    }
    default: return s;
  }
}

// ─── localStorage HOOK ────────────────────────────────────────────────────────
function useStorage(key, init) {
  const load = () => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : init; }
    catch { return init; }
  };
  const [val, setVal] = useState(load);
  const [rdy] = useState(true);
  const save = v => {
    setVal(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  };
  return [val, save, rdy];
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
const Token = ({ size=14 }) => (
  <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",
    width:size,height:size,borderRadius:"50%",
    background:`radial-gradient(circle at 30% 30%, ${C.goldL}, ${C.gold} 60%, ${C.earth})`,
    flexShrink:0 }}>
    <span style={{ fontSize:size*0.45, lineHeight:1 }}>♥</span>
  </span>
);
const Pill = ({ children, bg, color, small }) => (
  <span style={{ background:bg||C.forest, color:color||C.cream,
    padding:small?"1px 6px":"2px 8px", borderRadius:99, fontSize:small?9:10,
    fontWeight:700, display:"inline-flex", alignItems:"center", gap:3, whiteSpace:"nowrap" }}>
    {children}
  </span>
);
const Card = ({ children, style }) => (
  <div style={{ background:"white", borderRadius:20, padding:16, ...style }}>{children}</div>
);
const Btn = ({ children, onClick, disabled, color, style }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background:disabled?C.creamS:(color||C.forest), color:disabled?C.earth:C.cream,
      border:"none", borderRadius:99, padding:"10px 20px", fontWeight:700, fontSize:13,
      cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.6:1,
      display:"flex", alignItems:"center", gap:6, ...style }}>
    {children}
  </button>
);

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(160deg,${C.forestD},${C.forest})`,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32 }}>
      <div style={{ fontSize:64, marginBottom:8 }}>🌿</div>
      <div style={{ fontSize:40,fontWeight:900,color:C.cream,fontFamily:"Georgia,serif",letterSpacing:2 }}>NANOKI</div>
      <div style={{ fontSize:11,letterSpacing:6,color:C.goldL,marginBottom:40 }}>CARE TOKEN</div>
      {step===0 && (
        <div style={{ width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:10 }}>
          <Btn onClick={()=>setStep(1)} style={{ width:"100%",justifyContent:"center",background:C.gold,color:C.forestD }}>สมัครสมาชิกใหม่</Btn>
          <Btn onClick={()=>onLogin({name:"สมาชิก",new:false})} style={{ width:"100%",justifyContent:"center",background:"transparent",border:`2px solid ${C.cream}`,color:C.cream }}>เข้าสู่ระบบ</Btn>
        </div>
      )}
      {step===1 && (
        <div style={{ width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:12 }}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="ชื่อของคุณ"
            style={{ padding:"12px 16px",borderRadius:14,border:"none",fontSize:15,background:"rgba(250,243,220,0.12)",color:C.cream,outline:"none" }}/>
          <Btn onClick={()=>onLogin({name:name.trim(),new:true})} disabled={!name.trim()}
            style={{ width:"100%",justifyContent:"center",background:C.gold,color:C.forestD }}>สมัครสมาชิก</Btn>
        </div>
      )}
    </div>
  );
}

// ─── ACTIVITY ROW ─────────────────────────────────────────────────────────────
function ActivityRow({ h }) {
  const cfg = { scan:{bg:C.forest,icon:"📷"}, daily:{bg:C.forestL,icon:"✅"}, login:{bg:C.forestD,icon:"📅"}, steps:{bg:"#4A9B7F",icon:"👟"}, redeem:{bg:C.rose,icon:"🎁"}, transfer:{bg:C.earth,icon:"↗️"} }[h.type] || {bg:C.forest,icon:"•"};
  return (
    <div style={{ display:"flex",alignItems:"center",gap:12,background:"white",borderRadius:14,padding:"10px 12px",marginBottom:6 }}>
      <div style={{ width:38,height:38,borderRadius:10,background:cfg.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>{cfg.icon}</div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontWeight:600,fontSize:13,color:C.forestD,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{h.label}</div>
        <div style={{ fontSize:10,color:C.forestD,opacity:0.5 }}>{h.t}</div>
      </div>
      <div style={{ fontWeight:700,fontSize:14,color:h.amt>0?C.forest:C.red,whiteSpace:"nowrap" }}>{h.amt>0?"+":""}{h.amt.toFixed(2)}</div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({ s, dispatch, setTab }) {
  const today = TODAY();
  const loggedInToday = s.daily.lastLogin === today;
  const tier = streakTier(s.streak.days);
  const atCap = s.balance >= WALLET_CAP;
  return (
    <div style={{ paddingBottom:90 }}>
      <div style={{ background:`linear-gradient(180deg,${C.forestD},${C.forest})`, padding:"20px 20px 32px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
          <div>
            <div style={{ color:C.cream,opacity:0.6,fontSize:11 }}>สวัสดี</div>
            <div style={{ color:C.cream,fontWeight:700,fontSize:16 }}>{s.user.name}</div>
          </div>
          <button onClick={()=>dispatch({type:"LOGOUT"})}
            style={{ background:"rgba(250,243,220,0.1)",border:"none",borderRadius:99,padding:"6px 10px",cursor:"pointer",color:C.cream,fontSize:11 }}>
            ออก
          </button>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.gold},${C.goldL})`,borderRadius:22,padding:20,position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",right:-20,top:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.15)" }}/>
          <div style={{ fontSize:10,fontWeight:700,color:C.forestD,opacity:0.7,letterSpacing:2 }}>CARE Balance</div>
          <div style={{ display:"flex",alignItems:"baseline",gap:8,margin:"6px 0" }}>
            <Token size={28}/>
            <span style={{ fontSize:42,fontWeight:900,color:C.forestD,fontFamily:"Georgia,serif" }}>{s.balance.toFixed(2)}</span>
          </div>
          {atCap && <Pill bg={C.red} color="white" small>Wallet Cap 2,000 ถึงแล้ว</Pill>}
          <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:12,paddingTop:12,borderTop:"1px solid rgba(0,0,0,0.1)" }}>
            <span style={{ fontSize:14 }}>🔥</span>
            <span style={{ fontSize:13,fontWeight:700,color:C.forestD }}>{s.streak.days} วัน</span>
            <Pill bg={tier.col} color={C.forestD} small>{tier.label} ×{streakMult(s.streak.days).toFixed(1)}</Pill>
          </div>
        </div>
      </div>

      <div style={{ background:C.cream,borderRadius:"24px 24px 0 0",marginTop:-16,padding:20,display:"flex",flexDirection:"column",gap:16 }}>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8 }}>
          {[{id:"scan",icon:"📷",label:"Scan QR"},{id:"task",icon:"✅",label:"Daily Task"},{id:"rewards",icon:"🎁",label:"Rewards"},{id:"transfer",icon:"↗️",label:"โอน"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ background:"white",border:"none",borderRadius:16,padding:"12px 4px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
              <span style={{ fontSize:22 }}>{t.icon}</span>
              <span style={{ fontSize:10,fontWeight:700,color:C.forestD }}>{t.label}</span>
            </button>
          ))}
        </div>

        <Card>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
            <div style={{ fontWeight:700,color:C.forestD }}>Daily Login</div>
            <span style={{ fontSize:11,color:C.forestL }}>{s.daily.loginWeek}/7 สัปดาห์นี้</span>
          </div>
          <div style={{ display:"flex",gap:5,marginBottom:12 }}>
            {Array.from({length:7}).map((_,i)=>{
              const done = i < s.daily.loginWeek;
              const isNext = i === s.daily.loginWeek;
              return (
                <div key={i} style={{ flex:1,height:36,borderRadius:10,
                  background:done?C.forest:isNext&&!loggedInToday?"rgba(212,169,60,0.3)":C.creamS,
                  border:isNext&&!loggedInToday?`2px solid ${C.gold}`:"none",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:done?C.cream:C.forestD }}>
                  {done?"✓":i===6?"+4":"+1"}
                </div>
              );
            })}
          </div>
          <Btn onClick={()=>dispatch({type:"LOGIN",date:today})} disabled={loggedInToday||atCap} style={{ width:"100%",justifyContent:"center" }}>
            {loggedInToday?"✓ เช็คอินแล้ววันนี้":"เช็คอิน รับ Token"}
          </Btn>
        </Card>

        <Card style={{ background:`linear-gradient(135deg,${C.forestD},${C.forest})` }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
            <Pill bg={tier.col} color={C.forestD}>🔥 {tier.label}</Pill>
            <span style={{ color:C.cream,fontSize:12,fontWeight:700 }}>×{streakMult(s.streak.days).toFixed(1)} Bonus</span>
          </div>
          <div style={{ color:C.cream,fontSize:24,fontWeight:900,fontFamily:"Georgia,serif" }}>{s.streak.days} วันต่อเนื่อง</div>
          {tier.next && <>
            <div style={{ height:4,background:"rgba(255,255,255,0.15)",borderRadius:99,margin:"10px 0 4px" }}>
              <div style={{ height:"100%",width:`${(s.streak.days/tier.next)*100}%`,background:C.gold,borderRadius:99 }}/>
            </div>
            <div style={{ color:C.cream,fontSize:10,opacity:0.6 }}>อีก {tier.next-s.streak.days} วัน → {streakTier(tier.next).label}</div>
          </>}
        </Card>

        <button onClick={()=>setTab("rewards")}
          style={{ background:`linear-gradient(135deg,${C.rose},${C.earth})`,border:"none",borderRadius:20,padding:18,cursor:"pointer",textAlign:"left",position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",right:8,top:8,fontSize:48,opacity:0.2 }}>🎤</div>
          <Pill bg={C.gold} color={C.forestD} small>🎵 Limited Drop</Pill>
          <div style={{ color:C.cream,fontSize:22,fontWeight:900,fontFamily:"Georgia,serif",marginTop:6 }}>{ENT_ARTIST.name}</div>
          <div style={{ color:C.cream,fontSize:11,opacity:0.8 }}>Farm Trip 3D2N เหลือ {ENT_REWARDS[3].remaining} สิทธิ์</div>
        </button>

        <div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
            <div style={{ fontWeight:700,color:C.forestD }}>กิจกรรมล่าสุด</div>
            <button onClick={()=>setTab("history")} style={{ background:"none",border:"none",cursor:"pointer",color:C.forestL,fontSize:11,fontWeight:600 }}>ดูทั้งหมด</button>
          </div>
          {s.history.slice(0,3).map((h,i)=><ActivityRow key={i} h={h}/>)}
          {s.history.length===0 && <p style={{ textAlign:"center",color:C.forestD,opacity:0.4,fontSize:12,padding:"24px 0" }}>ยังไม่มีกิจกรรม · เริ่มด้วย Scan QR!</p>}
        </div>
      </div>
    </div>
  );
}

// ─── SCAN ─────────────────────────────────────────────────────────────────────
function ScanScreen({ s, dispatch }) {
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const today = TODAY();
  const atCap = s.balance >= WALLET_CAP;

  const doScan = pid => {
    setScanning(pid);
    setTimeout(()=>{ dispatch({type:"SCAN_QR",pid,date:today}); setScanning(null); setResult(pid); }, 1400);
  };

  const p = result ? PRODUCTS.find(x=>x.id===result) : null;

  if (scanning) return (
    <div style={{ minHeight:"100vh",background:C.forestD,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16 }}>
      <div style={{ width:180,height:180,border:`3px dashed ${C.gold}`,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center" }}>
        <span style={{ fontSize:48 }}>📷</span>
      </div>
      <div style={{ color:C.cream,fontSize:14,fontWeight:600 }}>กำลัง Scan…</div>
    </div>
  );

  if (result && p) {
    const earned = +(p.scanToken * streakMult(s.streak.days)).toFixed(2);
    return (
      <div style={{ minHeight:"100vh",background:C.cream,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:16 }}>
        <div style={{ width:80,height:80,borderRadius:"50%",background:C.forest,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36 }}>✅</div>
        <div style={{ fontSize:24,fontWeight:900,color:C.forestD,fontFamily:"Georgia,serif" }}>Scan สำเร็จ!</div>
        <Card style={{ width:"100%",maxWidth:320,textAlign:"center" }}>
          <div style={{ fontSize:11,color:C.forestD,opacity:0.6,marginBottom:4 }}>{p.name} · ได้รับ +{p.bags} ซองในคลัง</div>
          <div style={{ display:"flex",alignItems:"baseline",justifyContent:"center",gap:6,margin:"8px 0" }}>
            <Token size={28}/><span style={{ fontSize:44,fontWeight:900,color:C.forest,fontFamily:"Georgia,serif" }}>+{earned}</span>
          </div>
        </Card>
        <Btn onClick={()=>setResult(null)}>เสร็จสิ้น</Btn>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh",background:C.forestD,paddingBottom:90 }}>
      <div style={{ padding:"24px 20px 16px" }}>
        <div style={{ color:C.cream,fontSize:24,fontWeight:900,fontFamily:"Georgia,serif" }}>Scan QR Code</div>
        <div style={{ color:C.cream,opacity:0.5,fontSize:11,marginTop:4 }}>QR ด้านในซอง · รับ 2% ของมูลค่าสินค้า × streak</div>
      </div>
      <div style={{ margin:"0 20px 16px",aspectRatio:"1",background:"#0A1809",borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center" }}>
        <div style={{ textAlign:"center",color:C.cream,opacity:0.4 }}>
          <span style={{ fontSize:48 }}>📷</span><br/>
          <span style={{ fontSize:11 }}>Demo: เลือกสินค้าด้านล่าง</span>
        </div>
      </div>
      <div style={{ padding:"0 20px" }}>
        {PRODUCTS.map(p=>{
          const earned = +(p.scanToken * streakMult(s.streak.days)).toFixed(2);
          return (
            <button key={p.id} onClick={()=>!atCap&&doScan(p.id)}
              style={{ width:"100%",background:"rgba(250,243,220,0.06)",border:"1px solid rgba(250,243,220,0.1)",borderRadius:16,padding:14,display:"flex",alignItems:"center",gap:12,marginBottom:8,cursor:atCap?"not-allowed":"pointer" }}>
              <div style={{ width:44,height:44,borderRadius:12,background:C.forest,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{p.img}</div>
              <div style={{ flex:1,textAlign:"left" }}>
                <div style={{ color:C.cream,fontWeight:700,fontSize:13 }}>{p.name}</div>
                <div style={{ color:C.cream,opacity:0.5,fontSize:10 }}>{p.desc}</div>
                <div style={{ color:C.goldL,fontSize:11,marginTop:2 }}>฿{p.price} · +{p.bags} ซอง</div>
              </div>
              <div style={{ color:C.gold,fontWeight:900,fontSize:16,fontFamily:"Georgia,serif" }}>+{earned}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── TASK ─────────────────────────────────────────────────────────────────────
function TaskScreen({ s, dispatch }) {
  const today = TODAY();
  const [steps, setSteps] = useState(s.daily.steps || 0);
  const atCap = s.balance >= WALLET_CAP;
  const mult = streakMult(s.streak.days);
  const ownedProducts = PRODUCTS.filter(p => (s.inventory[p.id] || 0) > 0);
  const dailyConsumedToday = (s.daily.consumed || []).map(x=>x.pid);
  const repeatableCount = s.daily.lastRepeatableDate === today ? s.daily.repeatableCount : 0;

  return (
    <div style={{ minHeight:"100vh",background:C.cream,paddingBottom:90 }}>
      <div style={{ background:`linear-gradient(180deg,${C.forestD},${C.forest})`,padding:"24px 20px 28px" }}>
        <div style={{ color:C.cream,fontSize:24,fontWeight:900,fontFamily:"Georgia,serif" }}>Daily Task</div>
        <div style={{ color:C.cream,opacity:0.5,fontSize:11,marginTop:4 }}>บริโภคผลิตภัณฑ์ · เดิน 10,000 ก้าว</div>
        <div style={{ marginTop:14,display:"flex",alignItems:"center",gap:8 }}>
          <span>🔥</span>
          <span style={{ color:C.gold,fontWeight:700,fontSize:13 }}>×{mult.toFixed(1)} Streak Bonus</span>
          <span style={{ color:C.cream,opacity:0.4,fontSize:11 }}>Repeatable: {repeatableCount}/2</span>
        </div>
      </div>

      <div style={{ padding:20,display:"flex",flexDirection:"column",gap:14,marginTop:-8,background:C.cream,borderRadius:"24px 24px 0 0" }}>
        <Card>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
            <span>👟</span>
            <div style={{ fontWeight:700,color:C.forestD }}>บันทึกก้าวเดิน</div>
            {s.daily.stepsDate===today&&s.daily.stepsClaimed && <Pill bg={C.forest} small>✓ รับแล้ว</Pill>}
          </div>
          <input type="range" min={0} max={15000} value={steps} onChange={e=>setSteps(Number(e.target.value))} style={{ width:"100%",accentColor:C.forest }}/>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8 }}>
            <div style={{ fontSize:22,fontWeight:900,color:C.forestD,fontFamily:"Georgia,serif" }}>{steps.toLocaleString()} ก้าว</div>
            <Btn onClick={()=>dispatch({type:"STEPS",steps,date:today})}
              disabled={steps<10000||(s.daily.stepsDate===today&&s.daily.stepsClaimed)||atCap}
              style={{ padding:"8px 14px",fontSize:12 }}>
              {s.daily.stepsDate===today&&s.daily.stepsClaimed?"✓ รับแล้ว":steps>=10000?"+0.1 Token":`ขาดอีก ${(10000-steps).toLocaleString()}`}
            </Btn>
          </div>
        </Card>

        <Card>
          <div style={{ fontWeight:700,color:C.forestD,marginBottom:4 }}>Daily Task · บริโภค</div>
          <div style={{ fontSize:11,color:C.forestD,opacity:0.5,marginBottom:12 }}>เลือกผลิตภัณฑ์ที่ครอบครองอยู่</div>
          {ownedProducts.length===0 && <div style={{ textAlign:"center",color:C.forestD,opacity:0.4,fontSize:12,padding:"16px 0" }}>ยังไม่มีสินค้าในคลัง · Scan QR ก่อนนะ</div>}
          {ownedProducts.map(p=>{
            const alreadyDaily = dailyConsumedToday.includes(p.id);
            const earnedD = +(p.dailyToken * mult).toFixed(2);
            return (
              <div key={p.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.creamS}` }}>
                <span style={{ fontSize:20 }}>{p.img}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:C.forestD }}>{p.name}</div>
                  <div style={{ fontSize:10,color:C.forestD,opacity:0.5 }}>คลัง: {s.inventory[p.id]} ซอง</div>
                </div>
                <Btn onClick={()=>dispatch({type:"CONSUME",pid:p.id,date:today,isRepeatable:false})}
                  disabled={alreadyDaily||atCap} style={{ padding:"6px 12px",fontSize:11 }}>
                  {alreadyDaily?"✓":"+"+earnedD}
                </Btn>
              </div>
            );
          })}
        </Card>

        <Card style={{ border:`2px solid ${C.gold}` }}>
          <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4 }}>
            <div style={{ fontWeight:700,color:C.forestD }}>Repeatable Task</div>
            <Pill bg={C.gold} color={C.forestD} small>max 2×/วัน</Pill>
          </div>
          <div style={{ fontSize:11,color:C.forestD,opacity:0.5,marginBottom:12 }}>{repeatableCount}/2 ครั้งวันนี้</div>
          {ownedProducts.length===0 && <div style={{ textAlign:"center",color:C.forestD,opacity:0.4,fontSize:12,padding:"8px 0" }}>ยังไม่มีสินค้าในคลัง</div>}
          {ownedProducts.map(p=>{
            const earnedR = +(p.dailyToken * mult).toFixed(2);
            return (
              <div key={p.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.creamS}` }}>
                <span style={{ fontSize:20 }}>{p.img}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:C.forestD }}>{p.name}</div>
                  <div style={{ fontSize:10,color:C.forestD,opacity:0.5 }}>คลัง: {s.inventory[p.id]} ซอง</div>
                </div>
                <Btn onClick={()=>dispatch({type:"CONSUME",pid:p.id,date:today,isRepeatable:true})}
                  disabled={repeatableCount>=2||(s.inventory[p.id]||0)<=0||atCap} style={{ padding:"6px 12px",fontSize:11 }}>
                  {repeatableCount>=2?"ครบแล้ว":"+"+earnedR}
                </Btn>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

// ─── REWARDS ──────────────────────────────────────────────────────────────────
function RewardsScreen({ s, dispatch }) {
  const [tab, setTab] = useState("ent");
  const [confirm, setConfirm] = useState(null);
  const today = TODAY();

  return (
    <div style={{ minHeight:"100vh",background:C.cream,paddingBottom:90 }}>
      <div style={{ background:`linear-gradient(180deg,${C.forestD},${C.forest})`,padding:"24px 20px 16px",position:"sticky",top:0,zIndex:10 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
          <div style={{ color:C.cream,fontSize:22,fontWeight:900,fontFamily:"Georgia,serif" }}>Rewards</div>
          <div style={{ display:"flex",alignItems:"center",gap:4 }}><Token size={16}/><span style={{ color:C.gold,fontWeight:700,fontSize:16 }}>{s.balance.toFixed(2)}</span></div>
        </div>
        <div style={{ display:"flex",background:"rgba(250,243,220,0.08)",borderRadius:99,padding:4,gap:4 }}>
          {[{id:"ent",label:"🎤 Entertainment"},{id:"nan",label:"🌿 Nanoki"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ flex:1,padding:"8px 0",borderRadius:99,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,
                background:tab===t.id?(t.id==="ent"?C.rose:C.forest):"transparent",color:C.cream }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:16,display:"flex",flexDirection:"column",gap:10 }}>
        {tab==="ent" && (
          <div style={{ background:`linear-gradient(135deg,${C.rose},${C.earth})`,borderRadius:18,padding:16,marginBottom:4,position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",right:8,top:8,fontSize:40,opacity:0.25 }}>🎤</div>
            <div style={{ fontSize:10,color:C.cream,opacity:0.7,letterSpacing:2 }}>FEATURED CAMPAIGN</div>
            <div style={{ color:C.cream,fontSize:22,fontWeight:900,fontFamily:"Georgia,serif" }}>{ENT_ARTIST.name}</div>
            <div style={{ color:C.cream,fontSize:11,opacity:0.7 }}>{ENT_ARTIST.period}</div>
          </div>
        )}

        {(tab==="ent" ? ENT_REWARDS : NANOKI_REWARDS).map(r=>{
          const canAfford = s.balance >= r.tokens;
          const stockPct = r.quota ? (r.remaining/r.quota)*100 : 100;
          return (
            <div key={r.id} style={{ background:"white",borderRadius:18,overflow:"hidden",border:r.exclusive?`2px solid ${C.gold}`:"none" }}>
              {r.exclusive && (
                <div style={{ background:`linear-gradient(90deg,${C.gold},${C.goldL})`,padding:"4px 14px",fontSize:10,fontWeight:700,color:C.forestD }}>
                  👑 EXCLUSIVE · {r.remaining}/{r.quota} สิทธิ์
                </div>
              )}
              <div style={{ padding:14,display:"flex",gap:12,alignItems:"flex-start" }}>
                <div style={{ width:52,height:52,borderRadius:14,
                  background:tab==="ent"?`linear-gradient(135deg,${C.rose},${C.earth})`:`linear-gradient(135deg,${C.forest},${C.forestL})`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0 }}>
                  {r.icon||"🎁"}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:700,fontSize:14,color:C.forestD }}>{r.name}</div>
                  {r.desc && <div style={{ fontSize:11,color:C.forestD,opacity:0.5,marginTop:2 }}>{r.desc}</div>}
                  <div style={{ fontSize:10,color:C.forestD,opacity:0.4,marginTop:2 }}>มูลค่า ฿{r.value.toLocaleString()}</div>
                  {r.quota && !r.exclusive && (
                    <>
                      <div style={{ height:3,background:C.creamS,borderRadius:99,marginTop:8 }}>
                        <div style={{ height:"100%",width:`${stockPct}%`,background:stockPct<30?C.red:C.forestL,borderRadius:99 }}/>
                      </div>
                      <div style={{ fontSize:10,color:stockPct<30?C.red:C.forestD,opacity:stockPct<30?1:0.5,marginTop:2 }}>เหลือ {r.remaining}/{r.quota}</div>
                    </>
                  )}
                </div>
              </div>
              <div style={{ padding:"0 14px 14px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                  <Token size={16}/><span style={{ fontWeight:900,fontSize:17,color:C.forestD,fontFamily:"Georgia,serif" }}>{r.tokens}</span>
                  <span style={{ fontSize:10,color:C.forestD,opacity:0.5 }}>tokens</span>
                </div>
                <Btn onClick={()=>canAfford&&setConfirm(r)} disabled={!canAfford}
                  color={tab==="ent"?C.rose:C.forest} style={{ padding:"8px 16px",fontSize:12 }}>
                  {canAfford?"แลก":`ขาด ${(r.tokens-s.balance).toFixed(2)}`}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>

      {confirm && (
        <div style={{ position:"fixed",inset:0,zIndex:99,background:"rgba(26,48,25,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center" }}
          onClick={()=>setConfirm(null)}>
          <div style={{ background:C.cream,borderRadius:"24px 24px 0 0",padding:28,width:"100%",maxWidth:480 }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:20,fontWeight:900,color:C.forestD,fontFamily:"Georgia,serif",marginBottom:12 }}>ยืนยันการแลก</div>
            <Card style={{ marginBottom:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8 }}>
                <span style={{ color:C.forestD,opacity:0.6 }}>รายการ</span>
                <span style={{ fontWeight:600,color:C.forestD }}>{confirm.name}</span>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8 }}>
                <span style={{ color:C.forestD,opacity:0.6 }}>ใช้</span>
                <span style={{ fontWeight:700,color:C.red }}>-{confirm.tokens} tokens</span>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:13,paddingTop:8,borderTop:`1px solid ${C.creamS}` }}>
                <span style={{ color:C.forestD,opacity:0.6 }}>คงเหลือ</span>
                <span style={{ fontWeight:700,color:C.forestD }}>{(s.balance-confirm.tokens).toFixed(2)} tokens</span>
              </div>
            </Card>
            <Btn onClick={()=>{ dispatch({type:"REDEEM",reward:confirm,date:today}); setConfirm(null); }} style={{ width:"100%",justifyContent:"center",marginBottom:8 }}>ยืนยัน</Btn>
            <button onClick={()=>setConfirm(null)} style={{ width:"100%",background:"none",border:"none",padding:"10px 0",fontSize:13,color:C.forestD,cursor:"pointer" }}>ยกเลิก</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TRANSFER ─────────────────────────────────────────────────────────────────
function TransferScreen({ s, dispatch }) {
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("");
  const [done, setDone] = useState(null);
  const today = TODAY();
  const MONTHLY_LIMIT = 200;
  const monthTransferred = s.history.filter(h=>h.type==="transfer"&&h.date!=="sample").reduce((a,h)=>a+Math.abs(h.amt),0);
  const remaining = Math.max(0, MONTHLY_LIMIT - monthTransferred);

  const submit = () => {
    const a = parseFloat(amt);
    if (!to.trim()||!a||a<=0||a>s.balance||a>remaining) return;
    dispatch({type:"TRANSFER",to:to.trim(),amount:a,date:today});
    setDone({to:to.trim(),amount:a}); setTo(""); setAmt("");
  };

  if (done) return (
    <div style={{ minHeight:"100vh",background:C.cream,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:14 }}>
      <div style={{ width:70,height:70,borderRadius:"50%",background:C.forest,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32 }}>✅</div>
      <div style={{ fontSize:22,fontWeight:900,color:C.forestD,fontFamily:"Georgia,serif" }}>โอนสำเร็จ</div>
      <Card style={{ textAlign:"center",maxWidth:280,width:"100%" }}>
        <div style={{ display:"flex",justifyContent:"center",alignItems:"baseline",gap:6 }}>
          <Token size={22}/><span style={{ fontSize:34,fontWeight:900,color:C.forest,fontFamily:"Georgia,serif" }}>{done.amount}</span>
        </div>
        <div style={{ fontSize:12,color:C.forestD,opacity:0.6,marginTop:4 }}>ส่งให้ {done.to}</div>
      </Card>
      <Btn onClick={()=>setDone(null)}>เสร็จสิ้น</Btn>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:C.cream,paddingBottom:90 }}>
      <div style={{ background:`linear-gradient(180deg,${C.forestD},${C.forest})`,padding:"24px 20px 28px" }}>
        <div style={{ color:C.cream,fontSize:24,fontWeight:900,fontFamily:"Georgia,serif" }}>โอน Token</div>
        <div style={{ color:C.cream,opacity:0.5,fontSize:11,marginTop:4 }}>ส่ง CARE Token ให้สมาชิก Nanoki ท่านอื่น</div>
      </div>
      <div style={{ padding:20,display:"flex",flexDirection:"column",gap:14,marginTop:-8,background:C.cream,borderRadius:"24px 24px 0 0" }}>
        <div style={{ background:`linear-gradient(135deg,${C.gold},${C.goldL})`,borderRadius:18,padding:16 }}>
          <div style={{ fontSize:10,fontWeight:700,color:C.forestD,opacity:0.7,letterSpacing:2 }}>CARE BALANCE</div>
          <div style={{ display:"flex",alignItems:"baseline",gap:6,marginTop:4 }}>
            <Token size={22}/><span style={{ fontSize:32,fontWeight:900,color:C.forestD,fontFamily:"Georgia,serif" }}>{s.balance.toFixed(2)}</span>
          </div>
        </div>
        <div style={{ background:"rgba(212,169,60,0.1)",border:`1px solid ${C.gold}`,borderRadius:14,padding:"10px 14px",fontSize:11,color:C.earth }}>
          ⚠️ วงเงินโอนเดือนนี้เหลือ <strong>{remaining.toFixed(2)}</strong> / {MONTHLY_LIMIT} tokens
        </div>
        <Card style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div>
            <div style={{ fontSize:10,fontWeight:700,color:C.forestD,opacity:0.6,letterSpacing:2,textTransform:"uppercase",marginBottom:6 }}>ผู้รับ</div>
            <input value={to} onChange={e=>setTo(e.target.value)} placeholder="@username หรือ 08xxxxxxxx"
              style={{ width:"100%",padding:"10px 14px",borderRadius:12,border:`1px solid ${C.creamS}`,fontSize:14,background:C.cream,color:C.forestD,outline:"none",boxSizing:"border-box" }}/>
          </div>
          <div>
            <div style={{ fontSize:10,fontWeight:700,color:C.forestD,opacity:0.6,letterSpacing:2,textTransform:"uppercase",marginBottom:6 }}>จำนวน Token</div>
            <input type="number" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="0.00"
              style={{ width:"100%",padding:"10px 14px",borderRadius:12,border:`1px solid ${C.creamS}`,fontSize:24,fontWeight:900,background:C.cream,color:C.forestD,outline:"none",fontFamily:"Georgia,serif",boxSizing:"border-box" }}/>
            <div style={{ display:"flex",gap:6,marginTop:8 }}>
              {[10,25,50,"MAX"].map(v=>(
                <button key={v} onClick={()=>setAmt(String(v==="MAX"?Math.min(s.balance,remaining):v))}
                  style={{ flex:1,padding:"7px 0",borderRadius:10,border:"none",background:C.creamS,color:C.forestD,fontSize:11,fontWeight:700,cursor:"pointer" }}>
                  {v==="MAX"?"MAX":"+"+v}
                </button>
              ))}
            </div>
          </div>
          <Btn onClick={submit} disabled={!to.trim()||!amt||parseFloat(amt)>s.balance||parseFloat(amt)>remaining||parseFloat(amt)<=0}
            style={{ width:"100%",justifyContent:"center" }}>
            ↗️ โอน Token
          </Btn>
        </Card>
      </div>
    </div>
  );
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
function HistoryScreen({ s }) {
  const totalEarned = s.history.filter(h=>h.amt>0).reduce((a,h)=>a+h.amt,0);
  const totalSpent  = s.history.filter(h=>h.amt<0).reduce((a,h)=>a+Math.abs(h.amt),0);
  return (
    <div style={{ minHeight:"100vh",background:C.cream,paddingBottom:90 }}>
      <div style={{ background:`linear-gradient(180deg,${C.forestD},${C.forest})`,padding:"24px 20px 28px" }}>
        <div style={{ color:C.cream,fontSize:24,fontWeight:900,fontFamily:"Georgia,serif" }}>ประวัติ</div>
        <div style={{ display:"flex",gap:12,marginTop:14 }}>
          <div style={{ flex:1,background:"rgba(250,243,220,0.08)",borderRadius:14,padding:12 }}>
            <div style={{ color:C.cream,opacity:0.5,fontSize:10 }}>รวมได้รับ</div>
            <div style={{ color:C.gold,fontWeight:900,fontSize:18 }}>+{totalEarned.toFixed(2)}</div>
          </div>
          <div style={{ flex:1,background:"rgba(250,243,220,0.08)",borderRadius:14,padding:12 }}>
            <div style={{ color:C.cream,opacity:0.5,fontSize:10 }}>รวมใช้ไป</div>
            <div style={{ color:C.rose,fontWeight:900,fontSize:18 }}>-{totalSpent.toFixed(2)}</div>
          </div>
        </div>
      </div>
      <div style={{ padding:16,marginTop:-8,background:C.cream,borderRadius:"24px 24px 0 0" }}>
        {s.history.length===0 && <div style={{ textAlign:"center",color:C.forestD,opacity:0.4,fontSize:13,padding:"48px 0" }}>ยังไม่มีประวัติ</div>}
        {s.history.map((h,i)=><ActivityRow key={i} h={h}/>)}
      </div>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
const TABS = [
  {id:"home",icon:"🏠",label:"Home"},
  {id:"scan",icon:"📷",label:"Scan"},
  {id:"task",icon:"✅",label:"Task"},
  {id:"rewards",icon:"🎁",label:"Rewards"},
  {id:"transfer",icon:"↗️",label:"Transfer"},
  {id:"history",icon:"📋",label:"History"},
];
function BottomNav({ tab, setTab }) {
  return (
    <div style={{ position:"fixed",bottom:0,left:0,right:0,zIndex:30,padding:"8px 8px 12px",pointerEvents:"none" }}>
      <div style={{ background:C.forestD,borderRadius:24,display:"flex",padding:6,pointerEvents:"all",boxShadow:"0 -4px 24px rgba(0,0,0,0.3)",maxWidth:480,margin:"0 auto" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ flex:1,padding:"7px 2px",borderRadius:16,border:"none",cursor:"pointer",background:tab===t.id?C.gold:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
            <span style={{ fontSize:16 }}>{t.icon}</span>
            <span style={{ fontSize:8,fontWeight:700,color:tab===t.id?C.forestD:C.cream }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [appState, setAppState] = useStorage("nanoki_v2", null);
  const [tab, setTab] = useState("home");

  const dispatch = a => {
    if (a.type === "LOGOUT") { setAppState(null); return; }
    setAppState(prev => reducer(prev, a));
  };

  if (!appState) return <Login onLogin={u => setAppState(initState(u))} />;

  return (
    <div style={{ minHeight:"100vh",background:C.cream,maxWidth:480,margin:"0 auto",
      fontFamily:'"SF Pro Text",-apple-system,BlinkMacSystemFont,sans-serif',position:"relative" }}>
      {tab==="home"     && <HomeScreen     s={appState} dispatch={dispatch} setTab={setTab}/>}
      {tab==="scan"     && <ScanScreen     s={appState} dispatch={dispatch}/>}
      {tab==="task"     && <TaskScreen     s={appState} dispatch={dispatch}/>}
      {tab==="rewards"  && <RewardsScreen  s={appState} dispatch={dispatch}/>}
      {tab==="transfer" && <TransferScreen s={appState} dispatch={dispatch}/>}
      {tab==="history"  && <HistoryScreen  s={appState}/>}
      <BottomNav tab={tab} setTab={setTab}/>
    </div>
  );
}