import React, { useState, useEffect, useMemo } from "react";
import {
  Check, X, Clock, FileText, ChevronRight, Users, Calendar, AlertCircle,
  Stamp, Bell, Trash2, AlertTriangle, RotateCcw,
} from "lucide-react";

const INK = "#1B2A4A";
const PAPER = "#F7F6F2";
const SEAL = "#6B3FA0";
const LINE = "#E3E0D8";
const MUTED = "#7C8092";

const serif = { fontFamily: "Georgia, 'Times New Roman', serif" };
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const labelStyle = { fontSize: 11.5, color: MUTED, display: "block", marginBottom: 3 };
const inputStyle = { width: "100%", padding: "7px 9px", borderRadius: 7, border: `1px solid ${LINE}`, fontSize: 12.5 };

const REQUEST_TYPES = {
  vacation: "Ամենամյա արձակուրդ",
  unpaid: "Անվճար արձակուրդ",
  sick: "Հիվանդության թերթիկ",
  dayoff: "Ազատ oր",
};

const PRIORITY_LABELS = {
  under18: "Մինչև 18 տարեկան",
  parentOrPregnant: "Հղի / մինչև 14 տ. երեխայի ծնող",
  teacher: "Մանկավարժ (միայն ամառ)",
  caregiver: "Հիվանդ/հաշմանդամ անձի խնամող",
  violenceVictim: "Բռնության/ոտնձգության զոհ",
};

const MIN_CHUNK_DAYS = 10; // հոդված 163, 5-oրյա աշխ. շաբաթ
const REMINDER_THRESHOLD_DAYS = 913; // ~2.5 տարի, հոդված 164.10
const REMINDER_NOTIFY_SET = new Set([30, 20, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);

const seedEmployees = [
  {
    id: "e1", name: "Անի Հակոբյան", position: "Մարքեթինգի մասնագետ", email: "ani.hakobyan@example.am",
    hireDate: "2022-04-01", minimumDays: 20, extendedDays: 0, additionalDays: 0,
    annualTotal: 20, balance: 20, dayOffBalance: 5, lastVacationRequestDate: "2022-04-01", lastReminderFired: null,
    tenDayChunkConfirmed: false,
    priorityFlags: { under18: false, parentOrPregnant: false, teacher: false, caregiver: false, violenceVictim: false },
  },
  {
    id: "e2", name: "Դավիթ Սարգսյան", position: "Ծրագրավորող", email: "davit.sargsyan@example.am",
    hireDate: "2021-02-15", minimumDays: 20, extendedDays: 0, additionalDays: 4,
    annualTotal: 24, balance: 11, dayOffBalance: 2, lastVacationRequestDate: "2024-03-01", lastReminderFired: null,
    tenDayChunkConfirmed: false,
    priorityFlags: { under18: false, parentOrPregnant: false, teacher: false, caregiver: true, violenceVictim: false },
  },
  {
    id: "e3", name: "Լիլիթ Պետրոսյան", position: "Հաշվապահ", email: "lilit.petrosyan@example.am",
    hireDate: "2023-09-10", minimumDays: 0, extendedDays: 25, additionalDays: 0,
    annualTotal: 25, balance: 25, dayOffBalance: 5, lastVacationRequestDate: "2023-09-10", lastReminderFired: null,
    tenDayChunkConfirmed: false,
    priorityFlags: { under18: false, parentOrPregnant: true, teacher: false, caregiver: false, violenceVictim: false },
  },
];

const DEFAULT_ORG = {
  companyName: "Օրինակ ընկերության անվանում",
  address: "ք. Երևան, հասցե",
  phone: "+374 XX XXX XXX",
  email: "info@company.am",
  directorName: "Ա. Առաքելյան",
  directorSignature: null,
  hrName: "Ն. Ներսիսյան",
  hrEmail: "hr@company.am",
};

function businessDays(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (end < start) return 0;
  let count = 0;
  let d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr || todayStr());
  if (isNaN(d.getTime())) return new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function toISODate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return todayStr();
  return date.toISOString().slice(0, 10);
}

function isWeekday(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function calendarDaysBetween(aStr, bStr) {
  return Math.round((new Date(bStr) - new Date(aStr)) / (1000 * 60 * 60 * 24));
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) <= new Date(bEnd) && new Date(bStart) <= new Date(aEnd);
}

const HY_MONTHS = ["հունվարի", "փետրվարի", "մարտի", "ապրիլի", "մայիսի", "հունիսի", "հուլիսի", "օգոստոսի", "սեպտեմբերի", "հոկտեմբերի", "նոյեմբերի", "դեկտեմբերի"];

function fmtDate(d) {
  const date = new Date(d);
  return `${date.getDate()} ${HY_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function fmtDateTime(d) {
  const date = new Date(d);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${fmtDate(d)}, ${hh}:${mm}`;
}

// Անհատական աշխատանքային տարվա սահմանները (հոդված 164.1)
function workYearBounds(hireDateStr, refStr) {
  const hire = new Date(hireDateStr || refStr);
  const ref = new Date(refStr);
  if (isNaN(hire.getTime())) return { start: ref, end: ref };
  let start = new Date(hire.getTime());
  let guard = 0;
  while (guard < 80) {
    const next = new Date(start);
    next.setFullYear(next.getFullYear() + 1);
    if (next > ref) break;
    start = next;
    guard++;
  }
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  return { start, end };
}

function getReminderInfo(emp, ref = todayStr()) {
  const last = emp.lastVacationRequestDate || emp.hireDate;
  const deadline = addDays(last, REMINDER_THRESHOLD_DAYS);
  const daysRemaining = calendarDaysBetween(ref, toISODate(deadline));
  return { deadlineDate: deadline, daysRemaining };
}

// --- Presentational primitives ---
function Seal({ label, sub, tone = SEAL }) {
  return (
    <div style={{ width: 108, height: 108, borderRadius: "50%", border: `2px dashed ${tone}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "rotate(-6deg)", color: tone, flexShrink: 0 }}>
      <div style={{ ...serif, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{label}</div>
      <div style={{ ...serif, fontSize: 10, letterSpacing: 1, marginTop: 4, textTransform: "uppercase" }}>{sub}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    submitted: { text: "Ուղարկված է", bg: "#EEF0F5", fg: INK },
    approved: { text: "Հաստատված է", bg: "#E7F3EA", fg: "#1E6B3A" },
    rejected: { text: "Մերժված/հետ կանչված է", bg: "#FBEAEA", fg: "#A02E2E" },
    order_created: { text: "Հրամանը կազմված է", bg: "#EFE7F7", fg: SEAL },
  };
  const s = map[status] || map.submitted;
  return <span style={{ background: s.bg, color: s.fg, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{s.text}</span>;
}

function Timeline({ history }) {
  return (
    <div style={{ marginTop: 10 }}>
      {history.map((h, i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: SEAL, marginTop: 4 }} />
            {i < history.length - 1 && <div style={{ width: 1, flex: 1, background: LINE, marginTop: 2 }} />}
          </div>
          <div style={{ paddingBottom: 2 }}>
            <div style={{ fontSize: 13, color: INK, fontWeight: 600 }}>{h.step}</div>
            <div style={{ fontSize: 12, color: MUTED }}>{h.actor} · {fmtDateTime(h.date)}</div>
            {h.note && <div style={{ fontSize: 12.5, color: "#4A4E5A", marginTop: 3, fontStyle: "italic" }}>«{h.note}»</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: 20, ...style }}>{children}</div>;
}

function Button({ children, onClick, variant = "primary", disabled, style }) {
  const variants = {
    primary: { background: INK, color: "#fff", border: `1px solid ${INK}` },
    ghost: { background: "transparent", color: INK, border: `1px solid ${LINE}` },
    danger: { background: "#fff", color: "#A02E2E", border: "1px solid #E3B9B9" },
    seal: { background: SEAL, color: "#fff", border: `1px solid ${SEAL}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...variants[variant], padding: "9px 16px", borderRadius: 7, fontSize: 13.5, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, display: "inline-flex", alignItems: "center", gap: 6, ...style }}>
      {children}
    </button>
  );
}

function NotificationBell({ items, onOpen, open, onMarkAllRead }) {
  const unread = items.filter((n) => !n.read).length;
  return (
    <div style={{ position: "relative" }}>
      <button onClick={onOpen} style={{ position: "relative", width: 38, height: 38, borderRadius: 8, border: `1px solid ${LINE}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Bell size={16} color={INK} />
        {unread > 0 && (
          <span style={{ position: "absolute", top: -5, right: -5, background: "#A02E2E", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 44, width: 300, maxHeight: 340, overflowY: "auto", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(27,42,74,0.12)", zIndex: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${LINE}` }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>Ծանուցումներ</span>
            {unread > 0 && <button onClick={onMarkAllRead} style={{ fontSize: 11.5, color: SEAL, background: "none", border: "none", cursor: "pointer" }}>Նշել բոլորը կարդացված</button>}
          </div>
          {items.length === 0 && <div style={{ padding: 16, fontSize: 13, color: MUTED }}>Ծանուցումներ չկան։</div>}
          {items.map((n) => (
            <div key={n.id} style={{ padding: "10px 14px", borderBottom: `1px solid ${LINE}`, background: n.read ? "#fff" : "#F7F4FC" }}>
              <div style={{ fontSize: 12.5, color: INK }}>{n.text}</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{fmtDateTime(n.date)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamOut({ requests, employees }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const out = requests.filter((r) => (r.status === "approved" || r.status === "order_created") && rangesOverlap(r.start, r.end, monthStart, monthEnd));
  if (out.length === 0) return null;
  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Calendar size={15} color={SEAL} />
        <div style={{ ...serif, fontSize: 15, color: INK }}>Այս ամիս բացակայում են</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {out.map((r) => {
          const emp = employees.find((e) => e.id === r.employeeId);
          return (
            <div key={r.id} style={{ fontSize: 13, color: "#4A4E5A", display: "flex", justifyContent: "space-between" }}>
              <span>{emp?.name}</span>
              <span style={{ color: MUTED }}>{fmtDate(r.start)} – {fmtDate(r.end)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ReminderPanel({ employees, onSchedule }) {
  const [drafts, setDrafts] = useState({});
  const rows = employees
    .map((e) => ({ e, info: getReminderInfo(e) }))
    .filter((x) => x.info.daysRemaining <= 30)
    .sort((a, b) => a.info.daysRemaining - b.info.daysRemaining);
  if (rows.length === 0) return null;
  return (
    <Card style={{ marginBottom: 20, borderColor: "#E8C9C9" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <AlertTriangle size={15} color="#A02E2E" />
        <div style={{ ...serif, fontSize: 15, color: INK }}>2,5-ամյա uzman ժամկետ (հոդված 164.10)</div>
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>
        Այս աշխատողները 2,5 տարի է՝ չեն ուղարկել արձակուրդի հայտ-դիմում։ Կարող եք ինքնուրույն նշանակել արձակուրդը՝ առանց աշխատողի հայտ-դիմումի։
      </div>
      {rows.map(({ e, info }) => (
        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 0", borderTop: `1px solid ${LINE}` }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{e.name}</div>
            <div style={{ fontSize: 11.5, color: info.daysRemaining < 0 ? "#A02E2E" : MUTED }}>
              {info.daysRemaining < 0 ? `Ուշացած է ${Math.abs(info.daysRemaining)} oրով` : `${info.daysRemaining} oր մնաց ժամկետից`}
            </div>
          </div>
          <input type="date" value={drafts[e.id]?.start || ""} onChange={(ev) => setDrafts({ ...drafts, [e.id]: { ...drafts[e.id], start: ev.target.value } })} style={{ ...inputStyle, width: 132 }} />
          <input type="number" min={1} placeholder="oր" value={drafts[e.id]?.days || ""} onChange={(ev) => setDrafts({ ...drafts, [e.id]: { ...drafts[e.id], days: ev.target.value } })} style={{ ...inputStyle, width: 64 }} />
          <Button
            variant="ghost"
            disabled={!drafts[e.id]?.start || !drafts[e.id]?.days}
            onClick={() => { onSchedule(e.id, drafts[e.id]?.start, Number(drafts[e.id]?.days) || 0); setDrafts({ ...drafts, [e.id]: {} }); }}
          >
            Նշանակել
          </Button>
        </div>
      ))}
    </Card>
  );
}

function OrderDocument({ request, employee, org, orderNumber, signed }) {
  const wy = workYearBounds(employee.hireDate, request.start);
  const returnDate = toISODate(addDays(request.end, 1));
  return (
    <div id="order-print-area" style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: "32px 36px", fontFamily: "'Times New Roman', Georgia, serif", color: "#111", fontSize: 14, lineHeight: 1.55 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#1B3E8C" }}>{org.companyName}</div>
      <div style={{ borderBottom: "2px dotted #1B3E8C", margin: "4px 0 10px" }} />
      <div style={{ fontSize: 12, color: "#333" }}>{org.address}, {org.phone}, {org.email}</div>

      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 18, margin: "30px 0 6px", letterSpacing: 0.5 }}>ՀՐԱՄԱՆ ԹԻՎ {orderNumber}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, margin: "14px 0 22px" }}>
        <span>ք. Երևան</span><span>{fmtDate(todayStr())}</span>
      </div>

      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 14, margin: "0 0 18px" }}>
        «{org.companyName}»-ի աշխատակից {employee.name}ին ամենամյա արձակուրդ տրամադրելու վերաբերյալ
      </div>

      <div style={{ marginBottom: 16 }}>Հիմք ընդունելով ՀՀ աշխատանքային oրենսգրքով սահմանված դրույթները և աշխատակցի անհատական հայտ-դիմումը՝</div>

      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 15, letterSpacing: 3, margin: "0 0 18px" }}>ՀՐԱՄԱՅՈՒՄ ԵՄ</div>

      <ol style={{ paddingLeft: 22, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>
          «{org.companyName}»-ի աշխատակից {employee.name}ին {fmtDate(wy.start)} – {fmtDate(wy.end)} աշխատանքային տարվա համար տրամադրել ամենամյա արձակուրդ {request.days} աշխատանքային oր տևողությամբ.
          <ul style={{ listStyle: "none", paddingLeft: 4, marginTop: 8 }}>
            <li>➤ Ամենամյա արձակուրդի սկիզբ — {fmtDate(request.start)}</li>
            <li>➤ Ամենամյա արձակուրդի ավարտ — {fmtDate(request.end)}</li>
            <li>➤ Աշխատանքի ներկայանալու ամսաթիվ — {fmtDate(returnDate)}</li>
          </ul>
        </li>
        <li style={{ marginBottom: 6 }}>Հրամանը հասցնել «{org.companyName}»-ի աշխատակից {employee.name}ին.</li>
        <li style={{ marginBottom: 6 }}>Հրամանի պատճենը հասցնել «{org.companyName}»-ի տնoրեն {org.directorName}ին.</li>
        <li style={{ marginBottom: 6 }}>Հրամանի կատարման հսկողությունը հանձնարարել անձնակազմի գծով մասնագետ {org.hrName}ին.</li>
      </ol>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 44 }}>
        <div>«{org.companyName}» տնoրեն</div>
        <div style={{ textAlign: "center", minWidth: 160 }}>
          {signed && org.directorSignature ? (
            <img src={org.directorSignature} alt="ստորագրություն" style={{ height: 52, marginBottom: 4, objectFit: "contain" }} />
          ) : (
            <div style={{ height: 52 }} />
          )}
          <div style={{ borderTop: "1px solid #000", paddingTop: 4 }}>{org.directorName}</div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState("employee");
  const [employees, setEmployees] = useState(seedEmployees);
  const [requests, setRequests] = useState([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState("e1");
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ type: "vacation", start: "", end: "", reason: "" });
  const [rejectDraft, setRejectDraft] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [balanceDraft, setBalanceDraft] = useState({});
  const [balanceLog, setBalanceLog] = useState([]);
  const [newEmp, setNewEmp] = useState({ name: "", position: "", balance: 20, hireDate: todayStr(), email: "" });
  const [recallDraft, setRecallDraft] = useState({});
  const [resetConfirm, setResetConfirm] = useState(false);
  const [orgSettings, setOrgSettings] = useState(DEFAULT_ORG);
  const [orderPreview, setOrderPreview] = useState(null); // { id, orderNumber, signed }
  const [employeeSection, setEmployeeSection] = useState("requests");

  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get("mrk-requests-v2"); if (r?.value) setRequests(JSON.parse(r.value)); } catch (e) {}
      try { const emp = await window.storage.get("mrk-employees-v2"); if (emp?.value) setEmployees(JSON.parse(emp.value)); } catch (e) {}
      try { const n = await window.storage.get("mrk-notifications-v2"); if (n?.value) setNotifications(JSON.parse(n.value)); } catch (e) {}
      try { const bl = await window.storage.get("mrk-balance-log-v2"); if (bl?.value) setBalanceLog(JSON.parse(bl.value)); } catch (e) {}
      try { const org = await window.storage.get("mrk-org-settings-v2"); if (org?.value) setOrgSettings({ ...DEFAULT_ORG, ...JSON.parse(org.value) }); } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) window.storage.set("mrk-requests-v2", JSON.stringify(requests)).catch(() => {}); }, [requests, loaded]);
  useEffect(() => { if (loaded) window.storage.set("mrk-employees-v2", JSON.stringify(employees)).catch(() => {}); }, [employees, loaded]);
  useEffect(() => { if (loaded) window.storage.set("mrk-notifications-v2", JSON.stringify(notifications)).catch(() => {}); }, [notifications, loaded]);
  useEffect(() => { if (loaded) window.storage.set("mrk-balance-log-v2", JSON.stringify(balanceLog)).catch(() => {}); }, [balanceLog, loaded]);
  useEffect(() => { if (loaded) window.storage.set("mrk-org-settings-v2", JSON.stringify(orgSettings)).catch(() => {}); }, [orgSettings, loaded]);

  // 2.5-year silent-employee reminder cadence: 30,20 then daily inside last 10 days (հոդված 164.10)
  useEffect(() => {
    if (!loaded) return;
    let changed = false;
    const next = employees.map((emp) => {
      const { daysRemaining } = getReminderInfo(emp);
      if (REMINDER_NOTIFY_SET.has(daysRemaining) && emp.lastReminderFired !== daysRemaining) {
        changed = true;
        notify("hr", `${emp.name}՝ 2,5 տարի է՝ չի ուղարկել արձակուրդի հայտ-դիմում (uzarko ${daysRemaining} oր)։`);
        notify(`employee:${emp.id}`, `Հիշեցում. Ձեր արձակուրդի հայտ-դիմումի ներկայացման ժամկետը մոտենում է (uzarko ${daysRemaining} oր)։`);
        return { ...emp, lastReminderFired: daysRemaining };
      }
      return emp;
    });
    if (changed) setEmployees(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, employees]);

  function notify(audience, text) {
    setNotifications((prev) => [{ id: "n" + Date.now() + Math.random(), audience, text, date: new Date().toISOString(), read: false }, ...prev]);
  }

  function updateEmployeeField(id, field, value) {
    setEmployees((prev) => prev.map((e) => {
      if (e.id !== id) return e;
      let next = { ...e, [field]: value };
      if (["minimumDays", "extendedDays", "additionalDays"].includes(field)) {
        const min = Number(next.minimumDays) || 0;
        const ext = Number(next.extendedDays) || 0;
        const add = Number(next.additionalDays) || 0;
        next.annualTotal = min + ext + add;
      }
      return next;
    }));
  }

  function updatePriorityFlag(id, key, value) {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, priorityFlags: { ...e.priorityFlags, [key]: value } } : e)));
  }

  function updateOrgField(field, value) {
    setOrgSettings((prev) => ({ ...prev, [field]: value }));
  }

  function handleSignatureUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateOrgField("directorSignature", reader.result);
    reader.readAsDataURL(file);
  }

  function saveBalance(employeeId) {
    const raw = balanceDraft[employeeId];
    if (raw === undefined || raw === "") return;
    const next = Math.max(0, Number(raw));
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp || Number.isNaN(next)) return;
    const previous = emp.balance;
    setEmployees((prev) => prev.map((e) => (e.id === employeeId ? { ...e, balance: next } : e)));
    setBalanceLog((prev) => [{ id: "b" + Date.now(), employeeId, previous, next, date: new Date().toISOString() }, ...prev]);
    notify(`employee:${employeeId}`, `Ձեր արձակուրդային մնացորդը ձեռքով ուղղվել է ${next} oրի (ՄՌԿ մասնագետի կողմից)։`);
    setBalanceDraft((prev) => ({ ...prev, [employeeId]: "" }));
  }

  function addEmployee() {
    if (!newEmp.name.trim()) return;
    const id = "e" + Date.now();
    const total = Math.max(0, Number(newEmp.balance) || 0);
    setEmployees((prev) => [...prev, {
      id, name: newEmp.name.trim(), position: newEmp.position.trim() || "—", email: newEmp.email.trim() || "—",
      hireDate: newEmp.hireDate || todayStr(), minimumDays: total, extendedDays: 0, additionalDays: 0,
      annualTotal: total, balance: total, dayOffBalance: 5, lastVacationRequestDate: newEmp.hireDate || todayStr(), lastReminderFired: null,
      tenDayChunkConfirmed: false,
      priorityFlags: { under18: false, parentOrPregnant: false, teacher: false, caregiver: false, violenceVictim: false },
    }]);
    setBalanceLog((prev) => [{ id: "b" + Date.now(), employeeId: id, previous: 0, next: total, date: new Date().toISOString() }, ...prev]);
    setNewEmp({ name: "", position: "", balance: 20, hireDate: todayStr(), email: "" });
  }

  function chunkSatisfied(employeeId, wy) {
    return requests.some((r) => r.employeeId === employeeId && r.type === "vacation" && r.status !== "rejected" && r.days >= MIN_CHUNK_DAYS && new Date(r.start) >= wy.start && new Date(r.start) <= wy.end);
  }

  const days = useMemo(() => businessDays(form.start, form.end), [form.start, form.end]);
  const currentEmployee = employees.find((e) => e.id === currentEmployeeId);
  const relevantBalance = currentEmployee ? (form.type === "vacation" ? currentEmployee.balance : form.type === "dayoff" ? currentEmployee.dayOffBalance : null) : null;

  function submitRequest() {
    setFormError("");
    if (!form.start || !form.end || days <= 0) { setFormError("Խնդրում ենք ընտրել վավեր ամսաթվեր (ավարտը չի կարող լինել սկզբից առաջ)։"); return; }
    if (form.start < todayStr()) { setFormError("Հայտ-դիմումի սկիզբը չի կարող լինել անցյալում։"); return; }
    const activeOwn = requests.filter((r) => r.employeeId === currentEmployeeId && r.status !== "rejected");
    if (activeOwn.some((r) => rangesOverlap(form.start, form.end, r.start, r.end))) { setFormError("Այս ժամանակահատվածն արդեն համընկնում է Ձեր մեկ այլ հայտ-դիմումի հետ։"); return; }

    if (form.type === "vacation") {
      const notice = calendarDaysBetween(todayStr(), form.start);
      if (notice < 5) { setFormError("Ամենամյա արձակուրդի հայտ-դիմումը պետք է ուղարկվի սկզբից առնվազն 5 oր առաջ (հոդված 169-ի վճարման ժամկետը պահպանելու համար)։"); return; }
      const paymentDeadline = toISODate(addDays(form.start, -3));
      const processStart = toISODate(addDays(todayStr(), 1));
      const availableWorkDays = businessDays(processStart, paymentDeadline);
      if (availableWorkDays < 2) {
        setFormError("Ձեր նշած ամսաթվերի դեպքում ՄՌԿ մասնագետին ու հաշվապահին կմնա 2-ից քիչ աշխատանքային oր՝ հրամանը կազմելու և վճարումն ավարտելու համար (հոդված 169-ի՝ սկզբից 3 oր առաջ վճարման ժամկետը հաշվի առնելով)։ Խնդրում ենք ուղարկել հայտ-դիմումը մի քանի oր ավելի շուտ։");
        return;
      }
      const wy = workYearBounds(currentEmployee.hireDate, todayStr());
      const chunkAlreadyUsed = chunkSatisfied(currentEmployeeId, wy) || currentEmployee.tenDayChunkConfirmed;
      const remainingAfter = currentEmployee.balance - days;
      const chunkRuleOk = days >= MIN_CHUNK_DAYS || chunkAlreadyUsed || remainingAfter <= 0 || remainingAfter > MIN_CHUNK_DAYS;
      if (!chunkRuleOk) {
        setFormError(`Այս հայտ-դիմումից հետո Ձեր ընթացիկ աշխատանքային տարվա մնացորդը կդառնա ${remainingAfter} oր (10 oրից պակաս կամ հավասար)։ Օրենքով (հոդված 163) մասնակի արձակուրդի դեպքում գոնե մեկ հատված պետք է կազմի առնվազն ${MIN_CHUNK_DAYS} աշխատանքային oր, հետևաբար այս մնացորդով դա այլևս հնարավոր չի լինի ապահովել։ Մեծացրեք հայտ-դիմումի oրերի քանակը, կամ դիմեք ՄՌԿ մասնագետին։`);
        return;
      }
    }

    const newReq = {
      id: "r" + Date.now(), employeeId: currentEmployeeId, type: form.type, start: form.start, end: form.end,
      days, reason: form.reason, status: "submitted", recall: null,
      history: [{ step: "Հայտ-դիմումն ուղարկվել է", actor: currentEmployee.name, date: new Date().toISOString(), note: form.reason }],
    };
    setRequests((prev) => [newReq, ...prev]);
    setForm({ type: "vacation", start: "", end: "", reason: "" });
    if (form.type === "vacation") {
      setEmployees((prev) => prev.map((e) => (e.id === currentEmployeeId ? { ...e, lastVacationRequestDate: todayStr(), lastReminderFired: null } : e)));
    }
    notify("director", `${currentEmployee.name}՝ նոր հայտ-դիմում (${REQUEST_TYPES[form.type]}, ${days} oր) սպասում է հաստատման։`);
  }

  function cancelRequest(id) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected", history: [...r.history, { step: "Հայտ-դիմումը հետ է կանչվել աշխատողի կողմից", actor: currentEmployee.name, date: new Date().toISOString() }] } : r));
  }

  function directorDecide(id, decision, note) {
    const req = requests.find((r) => r.id === id);
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const step = decision === "approved" ? "Հաստատված է տնօրենի կողմից" : "Մերժված է տնօրենի կողմից";
      return { ...r, status: decision, history: [...r.history, { step, actor: "Տնօրեն", date: new Date().toISOString(), note }] };
    }));
    if (decision === "approved" && req && req.type === "vacation") {
      setEmployees((prev) => prev.map((e) => (e.id === req.employeeId ? { ...e, balance: Math.max(0, e.balance - req.days) } : e)));
    }
    if (decision === "approved" && req && req.type === "dayoff") {
      setEmployees((prev) => prev.map((e) => (e.id === req.employeeId ? { ...e, dayOffBalance: Math.max(0, e.dayOffBalance - req.days) } : e)));
    }
    if (req) {
      const emp = employees.find((e) => e.id === req.employeeId);
      const text = decision === "approved"
        ? `Ձեր հայտ-դիմումը (${fmtDate(req.start)}–${fmtDate(req.end)}) հաստատվել է տնօրենի կողմից։ Ձեր մնացորդը թարմացվել է։`
        : `Ձեր հայտ-դիմումը (${fmtDate(req.start)}–${fmtDate(req.end)}) մերժվել է. «${note}»`;
      notify(`employee:${req.employeeId}`, text);
      if (decision === "approved") notify("hr", `${emp?.name}՝ հաստատված հայտ-դիմումը սպասում է հրամանի կազմման։`);
    }
  }

  function openOrderPreview(id) {
    const orderNumber = "Հրց-2026-" + String(100 + requests.filter((r) => r.status === "order_created").length + 1);
    setOrderPreview({ id, orderNumber, signed: false });
  }

  function confirmAndSignOrder() {
    if (!orderPreview) return;
    const { id, orderNumber } = orderPreview;
    const req = requests.find((r) => r.id === id);
    setRequests((prev) => prev.map((r) => r.id === id ? {
      ...r, status: "order_created", orderNumber,
      history: [
        ...r.history,
        { step: `Հրաման ${orderNumber} կազմված է`, actor: "ՄՌԿ մասնագետ", date: new Date().toISOString() },
        { step: `Հրամանը ստորագրված է տնoրենի կողմից (${orgSettings.directorName}) և ուղարկված է PDF-ով էլ. փոստով`, actor: "ՄՌԿ մասնագետ", date: new Date().toISOString() },
      ],
    } : r));
    if (req) {
      const emp = employees.find((e) => e.id === req.employeeId);
      notify(`employee:${req.employeeId}`, `Հրաման ${orderNumber} ստորագրված է և ուղարկված Ձեր էլ. փոստին (${emp?.email || "—"})՝ PDF տարբերակով։`);
      notify("hr", `Հրաման ${orderNumber} ուղարկվել է ${emp?.name}-ին և ձեր էլ. փոստին (${orgSettings.hrEmail || "—"})։`);
    }
    setOrderPreview((prev) => (prev ? { ...prev, signed: true } : prev));
  }

  function hrScheduleVacation(employeeId, start, days) {
    if (!start || !days) return;
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    const end = toISODate(addDays(start, Math.max(0, days - 1)));
    const newReq = {
      id: "r" + Date.now(), employeeId, type: "vacation", start, end, days: Number(days), reason: "",
      status: "approved", recall: null,
      history: [{ step: "Արձակուրդը նշանակվել է ՄՌԿ մասնագետի նախաձեռնությամբ (հոդված 164.10)", actor: "ՄՌԿ մասնագետ", date: new Date().toISOString() }],
    };
    setRequests((prev) => [newReq, ...prev]);
    setEmployees((prev) => prev.map((e) => (e.id === employeeId ? { ...e, balance: Math.max(0, e.balance - Number(days)), lastVacationRequestDate: todayStr(), lastReminderFired: null } : e)));
    notify(`employee:${employeeId}`, `ՄՌԿ մասնագետը Ձեզ համար նշանակել է արձակուրդ՝ ${fmtDate(start)}-ից, ${Number(days)} oր (հոդված 164.10)։`);
    notify("hr", `${emp.name}-ի արձակուրդը նշանակված է, սպասում է հրամանի կազմման։`);
  }

  function requestRecall(id, newEnd, reason) {
    const req = requests.find((r) => r.id === id);
    if (!req || !newEnd) return;
    setRequests((prev) => prev.map((r) => r.id === id ? {
      ...r,
      recall: { requestedEnd: newEnd, reason, status: "pending_employee", requestedAt: new Date().toISOString() },
      history: [...r.history, { step: "ՄՌԿ մասնագետը հայտ-դիմում է ուղարկել վաղաժամկետ վերադարձի մասին", actor: "ՄՌԿ մասնագետ", date: new Date().toISOString(), note: reason }],
    } : r));
    notify(`employee:${req.employeeId}`, `ՄՌԿ-ն խնդրում է Ձեր համաձայնությունը արձակուրդից ${fmtDate(newEnd)}-ից վաղաժամկետ վերադառնալու համար։`);
  }

  function respondToRecall(id, accept) {
    const req = requests.find((r) => r.id === id);
    if (!req || !req.recall) return;
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const status = accept ? "accepted" : "declined";
      const step = accept ? "Աշխատողը համաձայնվել է վաղաժամկետ վերադարձին" : "Աշխատողը մերժել է վաղաժամկետ վերադարձի հայտ-դիմումը";
      return { ...r, recall: { ...r.recall, status }, history: [...r.history, { step, actor: currentEmployee.name, date: new Date().toISOString() }] };
    }));
    notify("hr", accept ? `${currentEmployee.name}-ն համաձայնվել է վաղաժամկետ վերադառնալ։ Կարող եք կազմել հրամանը։` : `${currentEmployee.name}-ը մերժել է վաղաժամկետ վերադարձի հայտ-դիմումը։`);
  }

  function finalizeRecall(id) {
    const req = requests.find((r) => r.id === id);
    if (!req || !req.recall || req.recall.status !== "accepted") return;
    const newDays = businessDays(req.start, req.recall.requestedEnd);
    const delta = req.days - newDays;
    const orderNumber = "Հրց-2026-" + String(200 + requests.filter((r) => r.recall?.status === "finalized").length + 1);
    setRequests((prev) => prev.map((r) => r.id === id ? {
      ...r, end: r.recall.requestedEnd, days: newDays,
      recall: { ...r.recall, status: "finalized", orderNumber },
      history: [...r.history, { step: `Հետկանչման հրաման ${orderNumber} կազմված է. արձակուրդը կրճատված է`, actor: "ՄՌԿ մասնագետ", date: new Date().toISOString() }],
    } : r));
    if (req.type === "vacation" && delta > 0) {
      setEmployees((prev) => prev.map((e) => (e.id === req.employeeId ? { ...e, balance: e.balance + delta } : e)));
    }
    if (req.type === "dayoff" && delta > 0) {
      setEmployees((prev) => prev.map((e) => (e.id === req.employeeId ? { ...e, dayOffBalance: e.dayOffBalance + delta } : e)));
    }
    notify(`employee:${req.employeeId}`, `Հետկանչման հրամանը կազմված է. Ձեր մնացորդին վերադարձվել է ${delta} oր։`);
  }

  const audienceKey = role === "employee" ? `employee:${currentEmployeeId}` : role;
  const myNotifications = notifications.filter((n) => n.audience === audienceKey);
  function markAllRead() { setNotifications((prev) => prev.map((n) => (n.audience === audienceKey ? { ...n, read: true } : n))); }

  const myRequests = requests.filter((r) => r.employeeId === currentEmployeeId);
  const pendingForDirector = requests.filter((r) => r.status === "submitted");
  const pendingForHR = requests.filter((r) => r.status === "approved");
  const recallable = requests.filter((r) => r.status === "order_created" && !r.recall && new Date(r.end) >= new Date(todayStr()));
  const recallsToFinalize = requests.filter((r) => r.recall && r.recall.status === "accepted");
  const allSorted = [...requests].sort((a, b) => (b.history[0]?.date || "").localeCompare(a.history[0]?.date || ""));

  const roles = [
    { id: "employee", label: "Աշխատող", icon: Users },
    { id: "director", label: "Տնօրեն", icon: Stamp },
    { id: "hr", label: "ՄՌԿ մասնագետ", icon: FileText },
  ];

  const wy = currentEmployee ? workYearBounds(currentEmployee.hireDate, todayStr()) : null;
  const activePriorityFlags = currentEmployee ? Object.entries(currentEmployee.priorityFlags || {}).filter(([, v]) => v).map(([k]) => PRIORITY_LABELS[k]) : [];

  return (
    <div style={{ minHeight: "100%", background: PAPER, padding: "28px 20px", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #order-print-area, #order-print-area * { visibility: visible; }
          #order-print-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; }
        }
      `}</style>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>ՄՌԿ Թվային Հարթակ · Փուլ 1</div>
            <div style={{ ...serif, fontSize: 26, color: INK, fontWeight: 700 }}>Արձակուրդի/բացակայության հայտ-դիմում</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4, background: "#fff", padding: 4, borderRadius: 9, border: `1px solid ${LINE}` }}>
              {roles.map((r) => (
                <button key={r.id} onClick={() => { setRole(r.id); setNotifOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: role === r.id ? INK : "transparent", color: role === r.id ? "#fff" : MUTED }}>
                  <r.icon size={14} />{r.label}
                </button>
              ))}
            </div>
            <NotificationBell items={myNotifications} open={notifOpen} onOpen={() => setNotifOpen((o) => !o)} onMarkAllRead={markAllRead} />
          </div>
        </div>

        {/* EMPLOYEE VIEW */}
        {role === "employee" && currentEmployee && (
          <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${LINE}` }}>
              {[
                { id: "requests", label: "Դիմումներ" },
                { id: "salary", label: "Աշխատավարձ" },
                { id: "events", label: "Կորպորատիվ միջոցառումներ" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setEmployeeSection(s.id)}
                  style={{
                    padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
                    fontSize: 13.5, fontWeight: 600,
                    color: employeeSection === s.id ? INK : MUTED,
                    borderBottom: employeeSection === s.id ? `2px solid ${SEAL}` : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {employeeSection === "salary" && (
              <Card style={{ textAlign: "center", color: MUTED, padding: 40 }}>
                <FileText size={22} style={{ marginBottom: 8 }} />
                <div style={{ ...serif, fontSize: 16, color: INK, marginBottom: 4 }}>Աշխատավարձ</div>
                <div style={{ fontSize: 13 }}>Այս բաժինը կավելանա Փուլ 2-ում (աշխատավարձի բացվածք, հաշվարկային թերթիկ)։</div>
              </Card>
            )}
            {employeeSection === "events" && (
              <Card style={{ textAlign: "center", color: MUTED, padding: 40 }}>
                <Users size={22} style={{ marginBottom: 8 }} />
                <div style={{ ...serif, fontSize: 16, color: INK, marginBottom: 4 }}>Կորպորատիվ միջոցառումներ</div>
                <div style={{ fontSize: 13 }}>Այս բաժինը կավելանա հետագա փուլում (ստեղծագործական համագործակցության մոդուլ)։</div>
              </Card>
            )}

            {employeeSection === "requests" && (
              <>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Իմ արձակուրդային oրերի մնացորդ</div>
                  <Seal label={currentEmployee.balance} sub="oր մնացորդ" />
                </div>
                <div style={{ fontSize: 13, color: "#4A4E5A", minWidth: 170 }}>
                  <div>Օգտագործված՝ <b style={{ color: INK }}>{currentEmployee.annualTotal - currentEmployee.balance}</b> oր</div>
                  <div>Տարեկան ընդամենը՝ <b style={{ color: INK }}>{currentEmployee.annualTotal}</b> oր</div>
                  <div style={{ marginTop: 4, color: MUTED, fontSize: 11.5 }}>
                    {[
                      currentEmployee.minimumDays > 0 && `նվազագույն՝ ${currentEmployee.minimumDays}`,
                      currentEmployee.extendedDays > 0 && `երկարացված՝ ${currentEmployee.extendedDays}`,
                      currentEmployee.additionalDays > 0 && `լրացուցիչ՝ ${currentEmployee.additionalDays}`,
                    ].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <label style={labelStyle}>Ես եմ՝</label>
                  <select value={currentEmployeeId} onChange={(e) => setCurrentEmployeeId(e.target.value)} style={{ ...inputStyle, padding: "9px 10px", fontSize: 14 }}>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.position}</option>)}
                  </select>
                  {wy && <div style={{ fontSize: 11.5, color: MUTED, marginTop: 8 }}>Ընթացիկ աշխատանքային տարի՝ {fmtDate(wy.start)} – {fmtDate(wy.end)}</div>}
                </div>
              </div>
            </Card>

            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Իմ ազատ oրերի մնացորդ</div>
                  <Seal label={currentEmployee.dayOffBalance} sub="ազատ oր" tone={INK} />
                </div>
                <div style={{ fontSize: 12.5, color: MUTED, maxWidth: 340 }}>
                  Ներքին կանոնակարգով հաստատված ազատ oրերի (դեյoֆֆ) մնացորդն է. առանձին է oրենքով սահմանված արձակուրդից։
                </div>
              </div>
            </Card>


            {recallable.filter((r) => r.employeeId === currentEmployeeId).length === 0 && null}
            {myRequests.filter((r) => r.recall && r.recall.status === "pending_employee").map((r) => (
              <Card key={"recall-" + r.id} style={{ marginBottom: 16, borderColor: "#E8C9C9", background: "#FBF5F5" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <RotateCcw size={15} color="#A02E2E" />
                  <div style={{ ...serif, fontSize: 15, color: INK }}>Հայտ-դիմում՝ վաղաժամկետ վերադարձի մասին</div>
                </div>
                <div style={{ fontSize: 13, color: "#4A4E5A", marginBottom: 10 }}>
                  ՄՌԿ-ն խնդրում է Ձեզ վերադառնալ <b>{fmtDate(r.recall.requestedEnd)}</b>-ից (փոխարեն {fmtDate(r.end)}-ի)՝ «{r.recall.reason}»։ Համաձայն ե՞ք։
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button onClick={() => respondToRecall(r.id, true)}><Check size={14} />Համաձայն եմ</Button>
                  <Button variant="danger" onClick={() => respondToRecall(r.id, false)}><X size={14} />Մերժել</Button>
                </div>
              </Card>
            ))}

            <Card style={{ marginBottom: 16 }}>
              <div style={{ ...serif, fontSize: 17, color: INK, marginBottom: 14 }}>Նոր հայտ-դիմում</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Տեսակ</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, padding: "9px 10px", fontSize: 14 }}>
                    {Object.entries(REQUEST_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div />
                {form.type === "vacation" && (
                  <div style={{ gridColumn: "1 / -1", fontSize: 12, color: SEAL, background: "#F7F4FC", border: "1px solid #E4D9F5", borderRadius: 7, padding: "8px 10px", display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <Clock size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span>Հայտ-դիմումն ուղարկվում է առնվազն 5 oր առաջ (հոդված 169), և մինչև վճարման ժամկետը (սկզբից 3 oր առաջ) պետք է մնա առնվազն 2 աշխատանքային oր՝ հրամանի ձևակերպման համար. մասնակի հայտ-դիմումի դեպքում գոնե մեկ հատված պետք է լինի առնվազն {MIN_CHUNK_DAYS} աշխ. oր (հոդված 163)։</span>
                  </div>
                )}
                {form.type === "vacation" && activePriorityFlags.length > 0 && (
                  <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#1E6B3A", background: "#EDF7EF", border: "1px solid #CBE8D0", borderRadius: 7, padding: "8px 10px" }}>
                    Դուք ունեք արձակուրդի ժամանակի ընտրության առաջնահերթության իրավունք (հոդված 164)՝ {activePriorityFlags.join(", ")}։
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Սկիզբ</label>
                  <input type="date" min={form.type === "vacation" ? toISODate(addDays(todayStr(), 5)) : todayStr()} value={form.start} onChange={(e) => { setFormError(""); setForm({ ...form, start: e.target.value }); }} style={{ ...inputStyle, padding: "9px 10px", fontSize: 14 }} />
                </div>
                <div>
                  <label style={labelStyle}>Ավարտ</label>
                  <input type="date" min={form.start || todayStr()} value={form.end} onChange={(e) => { setFormError(""); setForm({ ...form, end: e.target.value }); }} style={{ ...inputStyle, padding: "9px 10px", fontSize: 14 }} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Մեկնաբանություն (ըստ ցանկության)</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} style={{ ...inputStyle, padding: "9px 10px", fontSize: 14, resize: "vertical" }} />
              </div>
              {formError && <div style={{ fontSize: 12.5, color: "#A02E2E", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}><AlertCircle size={13} />{formError}</div>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, color: relevantBalance !== null && days > relevantBalance ? "#A02E2E" : MUTED }}>
                  {days > 0 ? `${days} աշխատանքային oր` : "Ընտրեք ամսաթվերը"}
                  {relevantBalance !== null && days > relevantBalance && " — գերազանցում է մնացորդը"}
                </div>
                <Button onClick={submitRequest} disabled={!form.start || !form.end || days <= 0}>Ուղարկել հայտ-դիմումը <ChevronRight size={14} /></Button>
              </div>
            </Card>

            <TeamOut requests={requests} employees={employees} />

            <div style={{ ...serif, fontSize: 17, color: INK, marginBottom: 10 }}>Իմ հայտ-դիմումները</div>
            {myRequests.length === 0 && <div style={{ color: MUTED, fontSize: 14 }}>Դեռ հայտ-դիմումներ չկան։</div>}
            {myRequests.map((r) => (
              <Card key={r.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: INK, fontSize: 14.5 }}>{REQUEST_TYPES[r.type]}</div>
                    <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{fmtDate(r.start)} – {fmtDate(r.end)} · {r.days} oր</div>
                    {r.orderNumber && <div style={{ ...mono, fontSize: 12, color: SEAL, marginTop: 4 }}>{r.orderNumber}</div>}
                    {r.recall?.status === "finalized" && <div style={{ ...mono, fontSize: 12, color: "#A02E2E", marginTop: 2 }}>{r.recall.orderNumber} (հետկանչում)</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <StatusPill status={r.status} />
                    {r.status === "submitted" && (
                      <button onClick={() => cancelRequest(r.id)} style={{ background: "none", border: "none", color: MUTED, fontSize: 11.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                        <Trash2 size={12} />Հետ կանչել
                      </button>
                    )}
                  </div>
                </div>
                <Timeline history={r.history} />
              </Card>
            ))}
              </>
            )}
          </div>
        )}

        {/* DIRECTOR VIEW */}
        {role === "director" && (
          <div>
            <TeamOut requests={requests} employees={employees} />
            <div style={{ ...serif, fontSize: 17, color: INK, marginBottom: 10 }}>Հաստատման սպասող հայտ-դիմումներ ({pendingForDirector.length})</div>
            {pendingForDirector.length === 0 && <div style={{ color: MUTED, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><Check size={15} />Ընթացիկ հայտ-դիմումներ չկան։</div>}
            {pendingForDirector.map((r) => {
              const emp = employees.find((e) => e.id === r.employeeId);
              return (
                <Card key={r.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: INK, fontSize: 14.5 }}>{emp?.name}</div>
                      <div style={{ fontSize: 13, color: MUTED }}>
                        {emp?.position}
                        {(r.type === "vacation" || r.type === "dayoff") && ` · Մնացորդ մինչև հաստատումը՝ ${r.type === "vacation" ? emp?.balance : emp?.dayOffBalance} oր`}
                      </div>
                      <div style={{ fontSize: 13.5, color: INK, marginTop: 6 }}>{REQUEST_TYPES[r.type]} · {fmtDate(r.start)} – {fmtDate(r.end)} ({r.days} oր)</div>
                      {(r.type === "vacation" || r.type === "dayoff") && (
                        <div style={{ fontSize: 12, color: SEAL, marginTop: 3 }}>Հաստատումից հետո մնացորդ՝ {Math.max(0, (r.type === "vacation" ? emp?.balance : emp?.dayOffBalance) || 0) - r.days} oր</div>
                      )}
                      {r.reason && <div style={{ fontSize: 13, color: MUTED, marginTop: 3, fontStyle: "italic" }}>«{r.reason}»</div>}
                      {(r.type === "vacation" || r.type === "dayoff") && r.days > ((r.type === "vacation" ? emp?.balance : emp?.dayOffBalance) || 0) && <div style={{ fontSize: 12.5, color: "#A02E2E", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={13} />Հայտվող oրերը գերազանցում են մնացորդը</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
                      <Button onClick={() => directorDecide(r.id, "approved", "")}><Check size={14} />Հաստատել</Button>
                      <textarea placeholder="Մերժման հիմնավորում (պարտադիր)" value={rejectDraft[r.id] || ""} onChange={(e) => setRejectDraft({ ...rejectDraft, [r.id]: e.target.value })} rows={2} style={{ padding: "7px 9px", borderRadius: 7, border: `1px solid ${LINE}`, fontSize: 12.5, resize: "vertical" }} />
                      <Button variant="danger" disabled={!rejectDraft[r.id]} onClick={() => directorDecide(r.id, "rejected", rejectDraft[r.id])}><X size={14} />Մերժել</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* HR VIEW */}
        {role === "hr" && (
          <div>
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <FileText size={15} color={SEAL} /><div style={{ ...serif, fontSize: 17, color: INK }}>Կազմակերպության տվյալներ</div>
              </div>
              <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 14 }}>Այս տվյալները մուտքագրվում են մեկ անգամ՝ պրոդուկտի օգտագործման սկզբում, և ավտոմատ կիրառվում են բոլոր գեներացվող հրամանների վրա։</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, marginBottom: 10 }}>
                <div><label style={labelStyle}>Կազմակերպության անվանում</label><input value={orgSettings.companyName} onChange={(e) => updateOrgField("companyName", e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Հասցե</label><input value={orgSettings.address} onChange={(e) => updateOrgField("address", e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Հեռախոս</label><input value={orgSettings.phone} onChange={(e) => updateOrgField("phone", e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Էլ. փոստ</label><input value={orgSettings.email} onChange={(e) => updateOrgField("email", e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, marginBottom: 10 }}>
                <div><label style={labelStyle}>Տնoրենի անուն ազգանուն</label><input value={orgSettings.directorName} onChange={(e) => updateOrgField("directorName", e.target.value)} style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>Տնoրենի ստորագրության սկան</label>
                  <input type="file" accept="image/*" onChange={(e) => handleSignatureUpload(e.target.files?.[0])} style={{ ...inputStyle, padding: "4px" }} />
                </div>
                <div><label style={labelStyle}>ՄՌԿ մասնագետի անուն ազգանուն</label><input value={orgSettings.hrName} onChange={(e) => updateOrgField("hrName", e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>ՄՌԿ մասնագետի էլ. փոստ</label><input value={orgSettings.hrEmail} onChange={(e) => updateOrgField("hrEmail", e.target.value)} style={inputStyle} /></div>
              </div>
              {orgSettings.directorSignature && (
                <div style={{ fontSize: 11.5, color: MUTED, display: "flex", alignItems: "center", gap: 8 }}>
                  Ներկայիս ստորագրություն՝ <img src={orgSettings.directorSignature} alt="ստորագրություն" style={{ height: 32, border: `1px solid ${LINE}`, borderRadius: 4, background: "#fff" }} />
                </div>
              )}
            </Card>

            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Stamp size={15} color={SEAL} /><div style={{ ...serif, fontSize: 17, color: INK }}>Աշխատողների կառավարում (ադմին)</div>
              </div>
              <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 14 }}>Յուրաքանչյուր աշխատողի համար լրացրեք պայմանագրի արձակուրդային տվյալները։ Հետագա փուլում այս դաշտերն ավտոմատ կլրանան կնքվող պայմանագրերից։</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {employees.map((e) => {
                  const lastLog = balanceLog.find((l) => l.employeeId === e.id);
                  const eWy = workYearBounds(e.hireDate, todayStr());
                  const autoChunkDetected = chunkSatisfied(e.id, eWy);
                  return (
                    <div key={e.id} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: INK, fontSize: 14 }}>{e.name}</div>
                          <div style={{ fontSize: 12, color: MUTED }}>{e.position}</div>
                        </div>
                        <div style={{ fontSize: 12, color: MUTED }}>Ընդամենը՝ <b style={{ color: SEAL }}>{e.annualTotal} oր</b> · Մնացորդ՝ <b style={{ color: INK }}>{e.balance} oր</b></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 4 }}>
                        <div><label style={labelStyle}>Աշխ. սկիզբ</label><input type="date" value={e.hireDate} onChange={(ev) => updateEmployeeField(e.id, "hireDate", ev.target.value)} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Էլ. փոստ</label><input type="email" value={e.email} onChange={(ev) => updateEmployeeField(e.id, "email", ev.target.value)} style={inputStyle} /></div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: INK, margin: "6px 0 6px" }}>Արձակուրդի տեսակներ</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 8 }}>
                        <div>
                          <label style={labelStyle}>Նվազագույն oրեր (հոդ. 159)</label>
                          <input type="number" min={0} value={e.minimumDays} onChange={(ev) => updateEmployeeField(e.id, "minimumDays", Number(ev.target.value))} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Երկարացված oրեր (հոդ. 160)</label>
                          <input type="number" min={0} value={e.extendedDays} onChange={(ev) => updateEmployeeField(e.id, "extendedDays", Number(ev.target.value))} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Լրացուցիչ oրեր (հոդ. 161)</label>
                          <input type="number" min={0} value={e.additionalDays} onChange={(ev) => updateEmployeeField(e.id, "additionalDays", Number(ev.target.value))} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Ընդամենը</label>
                          <div style={{ ...inputStyle, background: "#F7F6F2", color: SEAL, fontWeight: 700, display: "flex", alignItems: "center" }}>{e.annualTotal} oր</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
                        {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                          <label key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#4A4E5A" }}>
                            <input type="checkbox" checked={!!e.priorityFlags[key]} onChange={(ev) => updatePriorityFlag(e.id, key, ev.target.checked)} />{label}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 8, background: "#F7F6F2", borderRadius: 7, padding: "7px 9px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: INK, fontWeight: 600 }}>
                          <input type="checkbox" checked={!!e.tenDayChunkConfirmed} onChange={(ev) => updateEmployeeField(e.id, "tenDayChunkConfirmed", ev.target.checked)} />
                          10-oրյա հատվածն արդեն կիրառված է (հոդված 163)
                        </label>
                        <span style={{ fontSize: 10.5, color: autoChunkDetected ? "#1E6B3A" : MUTED }}>
                          {autoChunkDetected ? "✓ Հայտնաբերված է հայտ-դիմումների պատմությունից" : "Համակարգում դեռ չկա ≥10-oրյա հայտ-դիմում այս աշխ. տարվա համար"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <input type="number" min={0} placeholder="ուղղել մնացորդը" value={balanceDraft[e.id] ?? ""} onChange={(ev) => setBalanceDraft({ ...balanceDraft, [e.id]: ev.target.value })} style={{ ...inputStyle, width: 130 }} />
                        <Button variant="ghost" onClick={() => saveBalance(e.id)} disabled={!balanceDraft[e.id]}>Պահպանել մնացորդը</Button>
                        {lastLog && <span style={{ fontSize: 10.5, color: MUTED }}>Վերջին՝ {fmtDate(lastLog.date)} ({lastLog.previous}→{lastLog.next})</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>Ազատ oրերի մնացորդ (ներքին)</label>
                        <input type="number" min={0} value={e.dayOffBalance} onChange={(ev) => updateEmployeeField(e.id, "dayOffBalance", Number(ev.target.value))} style={{ ...inputStyle, width: 90 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 8 }}>Ավելացնել նոր աշխատող</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input placeholder="Անուն Ազգանուն" value={newEmp.name} onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })} style={{ ...inputStyle, flex: 2, minWidth: 160 }} />
                  <input placeholder="Պաշտոն" value={newEmp.position} onChange={(e) => setNewEmp({ ...newEmp, position: e.target.value })} style={{ ...inputStyle, flex: 2, minWidth: 140 }} />
                  <input type="email" placeholder="Էլ. փոստ" value={newEmp.email} onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })} style={{ ...inputStyle, flex: 2, minWidth: 160 }} />
                  <input type="date" value={newEmp.hireDate} onChange={(e) => setNewEmp({ ...newEmp, hireDate: e.target.value })} style={{ ...inputStyle, width: 140 }} />
                  <input type="number" min={0} placeholder="Մնացորդ (oր)" value={newEmp.balance} onChange={(e) => setNewEmp({ ...newEmp, balance: e.target.value })} style={{ ...inputStyle, width: 110 }} />
                  <Button onClick={addEmployee} disabled={!newEmp.name.trim()}>Ավելացնել</Button>
                </div>
              </div>
            </Card>

            <ReminderPanel employees={employees} onSchedule={hrScheduleVacation} />

            {orderPreview && (() => {
              const req = requests.find((r) => r.id === orderPreview.id);
              const emp = req && employees.find((e) => e.id === req.employeeId);
              if (!req || !emp) return null;
              return (
                <Card style={{ marginBottom: 20, borderColor: SEAL }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <FileText size={15} color={SEAL} />
                    <div style={{ ...serif, fontSize: 15, color: INK }}>{orderPreview.signed ? "Հրամանը ստորագրված և ուղարկված է" : "Հրամանի նախադիտում — ստուգեք մինչև ստորագրելը"}</div>
                  </div>
                  <OrderDocument request={req} employee={emp} org={orgSettings} orderNumber={orderPreview.orderNumber} signed={orderPreview.signed} />
                  <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                    {!orderPreview.signed ? (
                      <>
                        <Button variant="seal" onClick={confirmAndSignOrder}><Stamp size={14} />Հաստատել և ստորագրել</Button>
                        <Button variant="ghost" onClick={() => setOrderPreview(null)}>Չեղարկել</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" onClick={() => window.print()}>Ներբեռնել որպես PDF</Button>
                        <Button variant="ghost" onClick={() => setOrderPreview(null)}>Փակել</Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })()}

            <div style={{ ...serif, fontSize: 17, color: INK, marginBottom: 10 }}>Հրամանի կազմման սպասող ({pendingForHR.length})</div>
            {pendingForHR.length === 0 && <div style={{ color: MUTED, fontSize: 14, marginBottom: 22 }}>Ընթացիկ գործողություններ չկան։</div>}
            {pendingForHR.map((r) => {
              const emp = employees.find((e) => e.id === r.employeeId);
              return (
                <Card key={r.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: INK, fontSize: 14.5 }}>{emp?.name}</div>
                      <div style={{ fontSize: 13, color: MUTED }}>{REQUEST_TYPES[r.type]} · {fmtDate(r.start)} – {fmtDate(r.end)} ({r.days} oր) · հաստատված է</div>
                    </div>
                    <Button variant="seal" onClick={() => openOrderPreview(r.id)}><Stamp size={14} />Կազմել հրամանը</Button>
                  </div>
                </Card>
              );
            })}

            {recallable.length > 0 && (
              <>
                <div style={{ ...serif, fontSize: 17, color: INK, margin: "26px 0 10px" }}>Հետկանչել ընթացիկ/uzarko արձակուրդից</div>
                {recallable.map((r) => {
                  const emp = employees.find((e) => e.id === r.employeeId);
                  const draft = recallDraft[r.id] || {};
                  return (
                    <Card key={r.id} style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, color: INK, fontSize: 14 }}>{emp?.name}</div>
                      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8 }}>{fmtDate(r.start)} – {fmtDate(r.end)} · {r.orderNumber}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input type="date" min={r.start} max={r.end} value={draft.end || ""} onChange={(ev) => setRecallDraft({ ...recallDraft, [r.id]: { ...draft, end: ev.target.value } })} style={{ ...inputStyle, width: 140 }} />
                        <input placeholder="Հիմնավորում" value={draft.reason || ""} onChange={(ev) => setRecallDraft({ ...recallDraft, [r.id]: { ...draft, reason: ev.target.value } })} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
                        <Button variant="ghost" disabled={!draft.end || !draft.reason} onClick={() => { requestRecall(r.id, draft.end, draft.reason); setRecallDraft({ ...recallDraft, [r.id]: {} }); }}>
                          <RotateCcw size={13} />Հետկանչել
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </>
            )}

            {recallsToFinalize.length > 0 && (
              <>
                <div style={{ ...serif, fontSize: 17, color: INK, margin: "26px 0 10px" }}>Հետկանչման հրամանի կազմում</div>
                {recallsToFinalize.map((r) => {
                  const emp = employees.find((e) => e.id === r.employeeId);
                  return (
                    <Card key={r.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: INK, fontSize: 14 }}>{emp?.name}</div>
                          <div style={{ fontSize: 12.5, color: MUTED }}>Աշխատողը համաձայնվել է վերադառնալ {fmtDate(r.recall.requestedEnd)}-ից (փոխարեն {fmtDate(r.end)})</div>
                        </div>
                        <Button variant="seal" onClick={() => finalizeRecall(r.id)}><Stamp size={14} />Կազմել հետկանչման հրամանը</Button>
                      </div>
                    </Card>
                  );
                })}
              </>
            )}

            <div style={{ ...serif, fontSize: 17, color: INK, margin: "26px 0 10px" }}>Աուդիտի մատյան — բոլոր հայտ-դիմումները</div>
            <Card>
              {allSorted.length === 0 && <div style={{ color: MUTED, fontSize: 14 }}>Դատարկ է։</div>}
              {allSorted.map((r, i) => {
                const emp = employees.find((e) => e.id === r.employeeId);
                return (
                  <div key={r.id} style={{ padding: "10px 0", borderTop: i > 0 ? `1px solid ${LINE}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: INK }}>{emp?.name}</span>
                      <span style={{ color: MUTED }}> · {REQUEST_TYPES[r.type]} · {fmtDate(r.start)}–{fmtDate(r.end)}</span>
                      {r.orderNumber && <span style={{ ...mono, color: SEAL }}> · {r.orderNumber}</span>}
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        <div style={{ marginTop: 30, fontSize: 11.5, color: MUTED, textAlign: "center" }}>
          Ինտերակտիվ նախատիպ · տվյալները պահվում են միայն այս սարքում, ցուցադրական նպատակով
          <br />
          {!resetConfirm ? (
            <button
              onClick={() => setResetConfirm(true)}
              style={{ marginTop: 6, background: "none", border: "none", color: MUTED, fontSize: 11, textDecoration: "underline", cursor: "pointer" }}
            >
              Զրոյացնել փորձարկման տվյալները
            </button>
          ) : (
            <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ color: "#A02E2E" }}>Զրոյացնե՞լ բոլոր հայտ-դիմումները, ծանուցումները և մնացորդները։</span>
              <button
                onClick={async () => {
                  try { await window.storage.delete("mrk-requests-v2"); } catch (e) {}
                  try { await window.storage.delete("mrk-employees-v2"); } catch (e) {}
                  try { await window.storage.delete("mrk-notifications-v2"); } catch (e) {}
                  try { await window.storage.delete("mrk-balance-log-v2"); } catch (e) {}
                  try { await window.storage.delete("mrk-org-settings-v2"); } catch (e) {}
                  setRequests([]);
                  setEmployees(seedEmployees);
                  setNotifications([]);
                  setBalanceLog([]);
                  setOrgSettings(DEFAULT_ORG);
                  setOrderPreview(null);
                  setResetConfirm(false);
                }}
                style={{ background: "#A02E2E", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
              >
                Այո, զրոյացնել
              </button>
              <button
                onClick={() => setResetConfirm(false)}
                style={{ background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, color: INK, cursor: "pointer" }}
              >
                Չեղարկել
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
