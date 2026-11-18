import React, { lazy, Suspense, useMemo, useState } from "react";
import { formatEther, isAddress, parseEther } from "ethers";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, BriefcaseBusiness, CalendarDays,
  Check, ChevronRight, CircleAlert, CircleCheck, Clock3, ExternalLink, FileCheck2, Plus,
  FileText, HandCoins, History, LockKeyhole, Scale, Search, ShieldCheck, Upload, WalletCards,
} from "lucide-react";
import { EXPLORER, CONTRACT_ADDRESS } from "./config.js";
import StageDemo from "./hero-demo/StageDemo.tsx";
const EscrowScene = lazy(() => import("./EscrowScene.jsx"));

const STATUS = ["กำลังทำงาน", "มีข้อพิพาท", "เสร็จสิ้น", "ชำระบางส่วน", "คืนเงินแล้ว"];
const ETH = (n) => Number(formatEther(n)).toLocaleString("th-TH", { maximumFractionDigits: 5 }) + " ETH";
const short = (s = "") => s ? s.slice(0, 7) + "…" + s.slice(-5) : "—";
const when = (n) => n ? new Date(Number(n) * 1000).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "—";
const safeUrl = (value) => {
  try {
    const u = new URL(value);
    return ["https:", "http:", "ipfs:"].includes(u.protocol);
  } catch {
    return false;
  }
};

export function NavItem({ icon, label, active, onClick }) {
  return <button type="button" className={"nav-item" + (active ? " active" : "")} aria-current={active ? "page" : undefined} onClick={onClick}>
    <span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span>
  </button>;
}

export function Welcome({ connected, wrongNetwork, onConnect, onSwitch }) {
  const action = wrongNetwork ? onSwitch : onConnect;
  const actionText = wrongNetwork ? "เปลี่ยนเครือข่ายเป็น Sepolia" : connected ? "เลือก Role เพื่อเริ่มต้น" : "เชื่อมต่อ MetaMask";
  return <main className="landing">
    <header className="landing-header">
      <a className="brand landing-brand" href="#/" aria-label="WorkFlow หน้าแรก"><span className="brand-word">work<span>flow</span></span><small>สัญญางานบนเชน</small></a>
      <div className="landing-network"><span className="network-mark"/> Sepolia Testnet <span className="network-caption">· ETH ทดสอบ</span></div>
    </header>
    <section className="hero-grid">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-rule"/> งานฟรีแลนซ์แบ่งจ่ายตาม Milestone</p>
        <h2>แบ่งงานเป็นงวด<br/>จ่ายเมื่อส่งมอบ</h2>
        <p className="hero-description">กำหนดผลส่งมอบและค่าจ้างแยกแต่ละ Milestone ฝากเงินเป็นงวด แล้วตรวจสอบทุกขั้นตอนได้บน Sepolia</p>
        <button className="button primary hero-cta" onClick={action}>{actionText}<ArrowRight size={18}/></button>
        <div className="wallet-prompt"><WalletCards size={16}/><span>{wrongNetwork ? "ต้องใช้ Sepolia ก่อนเข้าใช้งาน" : "เชื่อม Wallet ก่อนเลือกบทบาท"}</span></div>
        <div className="hero-seal">
          <div className="hero-seal-object"><Suspense fallback={<div className="scene-loading" aria-hidden="true"/>}><EscrowScene/></Suspense></div>
          <div><small>เงินพักตามข้อตกลง</small><strong>ใน Smart Contract</strong><span><ShieldCheck size={15}/> ยืนยันการจ่ายใน MetaMask</span></div>
        </div>
      </div>
      <div className="hero-visual">
        <div className="visual-topline"><span>วิธีทำงาน</span><span className="demo-tag">ตัวอย่างจำลอง</span></div>
        <div className="visual-stage">
          <div className="stage-demo"><StageDemo/></div>
        </div>
        <p className="visual-caption">ภาพตัวอย่าง · ไม่ใช่ข้อมูลงานจริงจาก Contract</p>
      </div>
    </section>
    <section className="landing-process" aria-label="ขั้นตอนทำงาน">
      <div className="process-intro"><span>ตั้งแต่แบ่งงานจนจ่ายครบ</span><p>สถานะงวดและยอดที่พักอ้างอิงจาก Contract</p></div>
      <div className="process-step"><b>01</b><span><strong>กำหนด Milestones</strong><small>ระบุผลงาน ค่าจ้าง และกำหนดส่งรายงวด</small></span></div>
      <div className="process-step"><b>02</b><span><strong>ฝากเงินเป็นงวด</strong><small>พักค่าจ้างแต่ละงวดไว้ใน Escrow</small></span></div>
      <div className="process-step"><b>03</b><span><strong>ตรวจรับและจ่าย</strong><small>อนุมัติรายงวดหรือเปิดข้อพิพาทให้ Admin</small></span></div>
    </section>
    <div className="landing-footnote"><span>WorkFlow · Freelance escrow</span><span>ไม่ต้องส่ง Private Key ให้เว็บไซต์</span></div>
  </main>;
}

export function RolePicker({ account, mode, isAdmin, onSelect }) {
  const roles = [
    { id: "employer", icon: <BriefcaseBusiness size={20}/>, title: "ผู้ว่าจ้าง", text: "สร้างข้อตกลง ฝากค่าจ้าง และตรวจรับผลงาน", detail: "สร้างงานใหม่หรือดูงานที่คุณจ้าง" },
    { id: "freelancer", icon: <FileCheck2 size={20}/>, title: "ฟรีแลนซ์", text: "ติดตามงาน ส่งลิงก์ผลงาน และรับค่าจ้าง", detail: "ดูงานที่กำหนด Wallet นี้เป็นผู้รับจ้าง" },
    { id: "admin", icon: <ShieldCheck size={20}/>, title: "ผู้ดูแลระบบ", text: "ตรวจหลักฐานและตัดสินข้อพิพาท", detail: isAdmin ? "Wallet นี้เป็น Admin ของ Contract" : "ใช้ได้เฉพาะ Wallet Admin ของ Contract" },
  ];
  const allowed = (role) => isAdmin ? role === "admin" : role !== "admin";
  return <section className="page role-page">
    <div className="page-heading role-heading">
      <div><span className="eyebrow"><span className="eyebrow-rule"/> เลือกพื้นที่ทำงาน</span><h2>วันนี้คุณเข้ามาในฐานะไหน?</h2><p>{isAdmin ? "Wallet ที่เชื่อมเป็นผู้ดูแล Contract" : "Wallet เดียวทำได้ทั้งสองบทบาท แต่ต้องเป็นคนละงานและคนละคู่สัญญา"}</p></div>
      <div className="connected-address"><span>Wallet ที่เชื่อมต่อ</span><b><WalletCards size={15}/>{short(account)}</b><small><span className="network-mark"/> Sepolia Testnet</small></div>
    </div>
    <div className="role-list">
      {roles.map((role) => <button key={role.id} disabled={!allowed(role.id)} aria-pressed={mode === role.id} title={!allowed(role.id) ? role.detail : undefined} className={"role-option" + (mode === role.id ? " selected" : "") + (!allowed(role.id) ? " unavailable" : "")} onClick={() => onSelect(role.id)}>
        <span className="role-option-icon">{role.icon}</span>
        <span className="role-option-copy"><strong>{role.title}</strong><small>{role.text}</small><em>{role.detail}</em></span>
        <span className="role-option-action">{allowed(role.id) ? <><span>เปิดพื้นที่นี้</span><ArrowRight size={17}/></> : <span>ไม่มีสิทธิ์</span>}</span>
      </button>)}
    </div>
    <div className="policy-note"><ShieldCheck size={18}/><p><strong>Role เปลี่ยนหน้าที่ที่เห็นเท่านั้น</strong><br/>Contract ยังตรวจสิทธิ์ผู้ว่าจ้าง ฟรีแลนซ์ และ Admin ทุกธุรกรรม และไม่อนุญาตให้ Wallet เดียวเป็นคู่สัญญาทั้งสองฝั่งของงานเดียวกัน</p></div>
  </section>;
}

export function Dashboard({ mode, jobs, loading, filter, setFilter, onJob, onCreate }) {
  const [query, setQuery] = useState("");
  const label = mode === "admin" ? "คดีที่ต้องพิจารณา" : mode === "freelancer" ? "งานที่ได้รับมอบหมาย" : "งานที่ฉันจ้าง";
  const escrow = jobs.reduce((sum, job) => sum + job.escrowBalance, 0n);
  const filters = mode === "admin" ? ["1"] : ["all", "0", "1", "2", "3", "4"];
  const shown = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return jobs;
    return jobs.filter((job) => [job.title, job.description, job.employer, job.freelancer].some((value) => String(value).toLocaleLowerCase().includes(term)));
  }, [jobs, query]);
  return <section className="page dashboard-page">
    <div className="overview-strip">
      <div className="overview-primary"><span>{mode === "admin" ? "กำลังรอคำตัดสิน" : label}</span><strong>{jobs.length}</strong><small>{loading ? "กำลังอ่านข้อมูลจาก Contract…" : "รายการจาก Contract"}</small></div>
      <div className="overview-value"><span><CircleAlert size={16}/> ข้อพิพาทที่เปิดอยู่</span><strong>{jobs.filter((job) => job.status === 1).length}</strong><small>ต้องตรวจสอบ</small></div>
      <div className="overview-value escrow"><span><LockKeyhole size={16}/> เงินที่พักใน Escrow</span><strong>{ETH(escrow)}</strong><small>เฉพาะงานในรายการนี้</small></div>
    </div>
    <div className="page-heading docket-heading">
      <div><span className="eyebrow"><span className="eyebrow-rule"/> แฟ้มงาน</span><h2>{label}</h2><p>{mode === "admin" ? "เปิดรายการเพื่อดูหลักฐานและบันทึกคำตัดสิน" : "เลือกงานเพื่อดูคู่สัญญา กำหนดส่ง และขั้นตอนชำระเงิน"}</p></div>
      {mode === "employer" && <button className="button primary" onClick={onCreate}><Plus size={17}/>สร้างข้อตกลง</button>}
    </div>
    <div className="list-tools">
      <label className="search-field"><Search size={17}/><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่องานหรือ Address" aria-label="ค้นหางาน"/></label>
      <label className="filter-select"><span>สถานะ</span><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="กรองงานตามสถานะ">{filters.map((value) => <option key={value} value={value}>{value === "all" ? "ทุกสถานะ" : STATUS[Number(value)]}</option>)}</select></label>
      <span className="result-count">{loading ? "กำลังโหลด…" : shown.length + " งาน"}</span>
    </div>
    {shown.length ? <div className="docket">
      <div className="docket-header"><span>งานและคู่สัญญา</span><span>สถานะ</span><span>กำหนดส่ง</span><span>ค่าจ้าง</span><span/></div>
      <div className="docket-rows">{shown.map((job) => <JobRow key={job.id} job={job} mode={mode} onClick={() => onJob(job.id)}/>)}</div>
    </div> : <div className="empty-state"><span className="empty-mark"><BriefcaseBusiness size={22}/></span><h3>{loading ? "กำลังอ่านงานจาก Contract" : query ? "ไม่พบงานที่ตรงกับคำค้น" : "ยังไม่มีงานในรายการนี้"}</h3><p>{mode === "admin" ? "เมื่อมีข้อพิพาทที่ต้องพิจารณา จะปรากฏที่นี่" : "งานที่ผูกกับ Wallet นี้จะแสดงในแฟ้มงานของคุณ"}</p>{mode === "employer" && !query && <button className="button secondary" onClick={onCreate}>สร้างข้อตกลงแรก</button>}</div>}
  </section>;
}

function JobRow({ job, mode, onClick }) {
  const party = mode === "admin" ? "ผู้ว่าจ้าง " + short(job.employer) : mode === "employer" ? "ฟรีแลนซ์ " + short(job.freelancer) : "ผู้ว่าจ้าง " + short(job.employer);
  return <button type="button" className="docket-row" onClick={onClick}>
    <span className="job-summary"><span className={"job-status status-" + job.status}><i/>{STATUS[job.status]}</span><strong>{job.title || "งาน #" + job.id}</strong><small>#{String(job.id).padStart(3, "0")} · {party}</small></span>
    <span className={"docket-status status-" + job.status}><i/>{STATUS[job.status]}</span>
    <span className="docket-due"><small>กำหนดส่ง</small><b><CalendarDays size={14}/>{when(job.deadline)}</b></span>
    <span className="docket-amount"><small>ค่าจ้าง</small><b>{ETH(job.amount)}</b></span>
    <span className="docket-open" aria-hidden="true"><ChevronRight size={18}/></span>
  </button>;
}

function LegacyCreateJobForm({ enabled, busy, account, onSubmit }) {
  const initial = new Date(Date.now() + 7 * 86400000);
  initial.setMinutes(initial.getMinutes() - initial.getTimezoneOffset());
  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() - minDate.getTimezoneOffset());
  const [form, setForm] = useState({ title: "", description: "", amount: "0.001", deadline: initial.toISOString().slice(0, 16), freelancer: "" });
  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  const freelancerReady = isAddress(form.freelancer);
  const freelancerInvalid = Boolean(form.freelancer) && !freelancerReady;
  const validAmount = (() => { try { return parseEther(form.amount) > 0n; } catch { return false; } })();
  return <section className="page create-page">
    <div className="page-heading"><div><span className="eyebrow"><span className="eyebrow-rule"/> ข้อตกลงใหม่</span><h2>ระบุรายละเอียดก่อนสร้างงาน</h2><p>ข้อมูลและค่าจ้างจะถูกส่งไปบันทึกบน Sepolia เมื่อยืนยันใน MetaMask</p></div></div>
    <div className="create-layout">
      <form className="agreement-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <fieldset>
          <legend><span>รายละเอียดงาน</span><small>ระบุผลลัพธ์ที่ต้องการให้ชัดเจน</small></legend>
          <label>ชื่อโครงการ<input maxLength="200" value={form.title} onChange={set("title")} placeholder="เช่น ออกแบบเว็บไซต์ร้านค้า" required/></label>
          <label>ขอบเขตงาน<textarea maxLength="4000" rows="5" value={form.description} onChange={set("description")} placeholder="ระบุงานที่ต้องส่งมอบ ขอบเขต และสิ่งที่ถือว่างานเสร็จ" required/></label>
          <div className="form-pair">
            <label>ค่าจ้าง<div className="unit-input"><input type="number" inputMode="decimal" min="0.000000000000000001" step="0.000000000000000001" value={form.amount} onChange={set("amount")} required/><span>Sepolia ETH</span></div>{!validAmount && <small className="field-error">ใส่จำนวน ETH มากกว่า 0 และไม่เกิน 18 ตำแหน่งทศนิยม</small>}</label>
            <label>กำหนดส่ง<input type="datetime-local" min={minDate.toISOString().slice(0, 16)} value={form.deadline} onChange={set("deadline")} required/></label>
          </div>
        </fieldset>
        <fieldset>
          <legend><span>ผู้รับงาน</span><small>ส่งค่าจ้างไปยัง Wallet นี้</small></legend>
          <label>Address ของฟรีแลนซ์<input value={form.freelancer} onChange={set("freelancer")} placeholder="0x..." autoComplete="off" spellCheck="false" required aria-invalid={freelancerInvalid}/>{freelancerInvalid && <small className="field-error">กรุณาตรวจ Address ให้มีรูปแบบที่ถูกต้อง</small>}</label>
          <p className="form-safety"><ShieldCheck size={17}/> ผู้รับงานต้องไม่ใช่ Wallet ของคุณหรือ Wallet Admin ของ Contract</p>
        </fieldset>
        <div className="form-submit"><span><LockKeyhole size={16}/> ค่า Gas จะแสดงใน MetaMask ก่อนยืนยัน</span><button className="button primary" disabled={!enabled || busy || !validAmount || !freelancerReady}>{busy ? "กำลังส่งธุรกรรม…" : "สร้างข้อตกลง"}<ArrowRight size={17}/></button></div>
      </form>
      <aside className="agreement-aside">
        <div className="agreement-receipt">
          <div className="receipt-heading"><span><FileText size={18}/></span><div><small>สรุปข้อตกลง</small><strong>ตรวจข้อมูลก่อนส่ง</strong></div></div>
          <div className="receipt-line"><span>ผู้ว่าจ้าง</span><b>{short(account)}</b></div>
          <div className="receipt-line"><span>ผู้รับงาน</span><b>{form.freelancer && isAddress(form.freelancer) ? short(form.freelancer) : "ยังไม่ได้ระบุ"}</b></div>
          <div className="receipt-total"><span>ค่าจ้างทั้งหมด</span><strong>{form.amount || "0"} <small>ETH</small></strong></div>
          <p><LockKeyhole size={15}/> เงินจะพักใน Escrow หลังผู้ว่าจ้างฝากค่าจ้าง</p>
        </div>
        <div className="privacy-copy"><ShieldCheck size={17}/><span>ข้อมูลบน Blockchain เปิดเผยต่อสาธารณะ อย่าใส่ข้อมูลลับหรือข้อมูลส่วนบุคคลในรายละเอียดงาน</span></div>
      </aside>
    </div>
  </section>;
}

export function CreateJobForm({ enabled, busy, account, onSubmit }) {
  const initial = (days = 7) => {
    const date = new Date(Date.now() + days * 86400000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  };
  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() - minDate.getTimezoneOffset());
  const [form, setForm] = useState({ title: "", description: "", freelancer: "", milestones: [
    { title: "Wireframe", description: "Homepage and shop page prototype", amount: "0.01", deadline: initial(7) },
    { title: "Frontend", description: "Responsive website preview", amount: "0.02", deadline: initial(14) },
  ] });
  const freelancerReady = isAddress(form.freelancer);
  const freelancerInvalid = Boolean(form.freelancer) && !freelancerReady;
  const updateMilestone = (index, key, value) => setForm((current) => ({ ...current, milestones: current.milestones.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  const total = form.milestones.reduce((sum, milestone) => {
    try { return sum + parseEther(milestone.amount || "0"); } catch { return sum; }
  }, 0n);
  const validMilestones = form.milestones.length >= 2 && form.milestones.length <= 5 && form.milestones.every((item) => item.title.trim() && item.description.trim() && (() => { try { return parseEther(item.amount) > 0n; } catch { return false; } })());
  return <section className="page create-page">
    <div className="page-heading"><div><span className="eyebrow"><span className="eyebrow-rule"/> ข้อตกลงใหม่</span><h2>แบ่งงานเป็น Milestone</h2><p>กำหนดผลส่งมอบและค่าจ้างแยกงวด ผู้ว่าจ้างฝากเงินทีละ Milestone</p></div></div>
    <div className="create-layout">
      <form className="agreement-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <fieldset>
          <legend><span>รายละเอียดงาน</span><small>ข้อตกลงหลักของผู้ว่าจ้างและฟรีแลนซ์</small></legend>
          <label>ชื่อโครงการ<input maxLength="200" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="เช่น สร้างเว็บไซต์ร้านจักรยาน" required/></label>
          <label>ขอบเขตงาน<textarea maxLength="4000" rows="4" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="สรุปขอบเขตและผลลัพธ์ของโครงการ" required/></label>
        </fieldset>
        <fieldset>
          <legend><span>Milestones ({form.milestones.length}/5)</span><small>แต่ละงวดมี deadline และยอดจ่ายของตัวเอง</small></legend>
          {form.milestones.map((milestone, index) => <div className="detail-sheet milestone-form-card" key={index}>
            <div className="sheet-heading"><div><span>งวดที่ {index + 1}</span><h3>{milestone.title || "Milestone ใหม่"}</h3></div>{form.milestones.length > 2 && <button className="button ghost" type="button" onClick={() => setForm((current) => ({ ...current, milestones: current.milestones.filter((_, i) => i !== index) }))}>ลบงวด</button>}</div>
            <label>ชื่อผลส่งมอบ<input maxLength="200" value={milestone.title} onChange={(event) => updateMilestone(index, "title", event.target.value)} placeholder="เช่น Wireframe" required/></label>
            <label>รายละเอียด<textarea maxLength="4000" rows="2" value={milestone.description} onChange={(event) => updateMilestone(index, "description", event.target.value)} placeholder="ระบุสิ่งที่ต้องส่งในงวดนี้" required/></label>
            <div className="form-pair">
              <label>ค่าจ้างงวดนี้<div className="unit-input"><input type="number" inputMode="decimal" min="0.000000000000000001" step="0.000000000000000001" value={milestone.amount} onChange={(event) => updateMilestone(index, "amount", event.target.value)} required/><span>ETH</span></div></label>
              <label>กำหนดส่ง<input type="datetime-local" min={minDate.toISOString().slice(0, 16)} value={milestone.deadline} onChange={(event) => updateMilestone(index, "deadline", event.target.value)} required/></label>
            </div>
          </div>)}
          {form.milestones.length < 5 && <button type="button" className="button secondary" onClick={() => setForm((current) => ({ ...current, milestones: [...current.milestones, { title: "", description: "", amount: "0.01", deadline: initial(21) }] }))}><Plus size={16}/>เพิ่ม Milestone</button>}
        </fieldset>
        <fieldset>
          <legend><span>ผู้รับงาน</span><small>ส่งค่าจ้างไปยัง Wallet นี้</small></legend>
          <label>Address ของฟรีแลนซ์<input value={form.freelancer} onChange={(event) => setForm((current) => ({ ...current, freelancer: event.target.value }))} placeholder="0x..." autoComplete="off" spellCheck="false" required aria-invalid={freelancerInvalid}/>{freelancerInvalid && <small className="field-error">กรุณาตรวจ Address ให้มีรูปแบบที่ถูกต้อง</small>}</label>
          <p className="form-safety"><ShieldCheck size={17}/> ผู้รับงานต้องไม่ใช่ Wallet ของคุณหรือ Wallet Admin ของ Contract</p>
        </fieldset>
        <div className="form-submit"><span><LockKeyhole size={16}/> ค่า Gas จะแสดงใน MetaMask ก่อนยืนยัน</span><button className="button primary" disabled={!enabled || busy || !validMilestones || !freelancerReady}>{busy ? "กำลังส่งธุรกรรม…" : "สร้างข้อตกลง"}<ArrowRight size={17}/></button></div>
      </form>
      <aside className="agreement-aside">
        <div className="agreement-receipt"><div className="receipt-heading"><span><FileText size={18}/></span><div><small>สรุปข้อตกลง</small><strong>{form.milestones.length} Milestones</strong></div></div>
          <div className="receipt-line"><span>ผู้ว่าจ้าง</span><b>{short(account)}</b></div><div className="receipt-line"><span>ผู้รับงาน</span><b>{freelancerReady ? short(form.freelancer) : "ยังไม่ได้ระบุ"}</b></div>
          {form.milestones.map((milestone, index) => <div className="receipt-line" key={index}><span>{index + 1}. {milestone.title || "Milestone"}</span><b>{milestone.amount || "0"} ETH</b></div>)}
          <div className="receipt-total"><span>ค่าจ้างรวม</span><strong>{Number(formatEther(total)).toLocaleString("th-TH", { maximumFractionDigits: 5 })} <small>ETH</small></strong></div><p><LockKeyhole size={15}/> ฝากเงินแยกเป็นราย Milestone</p>
        </div><div className="privacy-copy"><ShieldCheck size={17}/><span>ข้อมูลบน Blockchain เปิดเผยต่อสาธารณะ อย่าใส่ข้อมูลลับหรือข้อมูลส่วนบุคคล</span></div>
      </aside>
    </div>
  </section>;
}

function LegacyJobDetail({ job, loading, mode, account, isAdmin, enabled, busy, events, onBack, onDeposit, onSubmit, onRelease, onRaise, onEvidence, onResolve }) {
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [extra, setExtra] = useState("");
  const [decision, setDecision] = useState("0");
  const [resolution, setResolution] = useState("");
  if (!job) return <section className="page"><button className="back-link" onClick={onBack}><ArrowLeft size={16}/>กลับไปยังแฟ้มงาน</button><div className="empty-state">{loading ? "กำลังอ่านข้อมูลงาน…" : "ไม่พบงานนี้ใน Contract"}</div></section>;
  const employer = job.employer.toLowerCase() === account.toLowerCase();
  const freelancer = job.freelancer.toLowerCase() === account.toLowerCase();
  const can = enabled && !busy;
  const submit = (event, fn) => { event.preventDefault(); fn(); };
  const releaseLabel = job.status === 5 ? "คืนเงินผู้ว่าจ้าง" : "จ่ายให้ฟรีแลนซ์";
  const disputed = job.status === 3;
  const settled = job.status === 4 || job.status === 5;
  const submitted = Boolean(job.workReference) || job.status === 2 || settled;
  const flow = {
    0: { id: "agreement", from: 0, label: "ข้อตกลงพร้อมแล้ว · รอฝากค่าจ้าง", source: <FileText size={14}/>, icon: <FileText size={13}/>, target: <LockKeyhole size={13}/> },
    1: { id: "funding", from: 1, label: "ฝากค่าจ้างใน Escrow แล้ว · รอส่งผลงาน", source: <LockKeyhole size={14}/>, target: <Upload size={13}/> },
    2: { id: "payout", from: 2, label: "ส่งผลงานแล้ว · รออนุมัติและจ่ายเงิน", source: <FileCheck2 size={14}/>, target: <HandCoins size={13}/> },
    3: { id: "dispute", from: 2, label: "เปิดข้อพิพาทแล้ว · รอผู้ดูแลพิจารณา", source: <Scale size={14}/>, target: <BadgeCheck size={13}/> },
  }[job.status];
  const timeline = [
    { title: "สร้างข้อตกลง", complete: true },
    { title: "ฝากค่าจ้าง", complete: job.status >= 1, active: job.status === 0 },
    { title: disputed && !submitted ? "เปิดข้อพิพาท" : "ส่งผลงาน", complete: submitted || disputed, active: job.status === 1 },
    { title: disputed ? "ตัดสินข้อพิพาท" : releaseLabel, complete: settled, active: job.status === 2 || disputed },
  ];
  return <section className="page job-detail-page">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16}/>กลับไปยังแฟ้มงาน</button>
    <div className="detail-header">
      <div className="detail-title"><span className="eyebrow"><span className="eyebrow-rule"/> งาน #{String(job.id).padStart(3, "0")}</span><h2>{job.title}</h2><p>{job.description}</p></div>
      <span className={"large-status status-" + job.status}><i/>{STATUS[job.status]}</span>
    </div>
    <div className={"milestone-track" + (flow ? ` flow-${flow.id}` : "")} aria-label="ความคืบหน้าของงาน">
      {timeline.map((item, index) => <div className={"milestone" + (item.complete ? " complete" : "") + (item.active ? " active" : "") + (disputed && index === 3 ? " disputed" : "")} aria-current={item.active ? "step" : undefined} key={item.title}>
        <i>{item.complete ? <Check size={13}/> : item.active && flow ? flow.target : index + 1}</i>
        <span>{item.title}</span>
        {flow?.from === index && <span className="milestone-arrow-runner" aria-hidden="true"><i/><i/><i/></span>}
      </div>)}
      {flow && <div className={`milestone-motion motion-${flow.id}`} role="status">
        <span className="motion-source" aria-hidden="true">{flow.source}</span>
        <span className="motion-route" aria-hidden="true"><i/><i/><i/></span>
        <span className="motion-target" aria-hidden="true">{flow.target}</span>
        <span className="motion-copy">{flow.label}</span>
      </div>}
    </div>
    <div className="detail-layout">
      <div className="detail-column">
        <section className="detail-sheet">
          <div className="sheet-heading"><div><span>ข้อตกลง</span><h3>คู่สัญญาและค่าจ้าง</h3></div><span className="chain-stamp"><LockKeyhole size={14}/>Sepolia Contract</span></div>
          <div className="party-pair"><Party label="ผู้ว่าจ้าง" address={job.employer}/><ArrowRight size={18}/><Party label="ฟรีแลนซ์" address={job.freelancer}/></div>
          <div className="agreement-facts"><div><small>กำหนดส่ง</small><b><CalendarDays size={15}/>{when(job.deadline)}</b></div><div><small>ค่าจ้างที่ตกลง</small><b>{ETH(job.amount)}</b></div><div><small>ยอดพักใน Escrow</small><b>{ETH(job.escrowBalance)}</b></div></div>
        </section>
        <section className="detail-sheet">
          <div className="sheet-heading"><div><span>การส่งมอบ</span><h3>ผลงานจากฟรีแลนซ์</h3></div>{job.submittedAt > 0n && <small>ส่งเมื่อ {when(job.submittedAt)}</small>}</div>
          {job.workReference ? <div className="evidence-link"><span><FileCheck2 size={18}/></span><div><small>ลิงก์หรือ Hash ของผลงาน</small><SafeLink value={job.workReference}/></div></div> : <p className="quiet-copy">ยังไม่มีการส่งผลงาน</p>}
          {can && freelancer && job.status === 1 && <form className="inline-action" onSubmit={(event) => submit(event, () => onSubmit(job, reference))}><label>ลิงก์หรือ Hash ผลงาน<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="https://… หรือ Content Hash" required/></label><button className="button primary" disabled={busy}>ส่งผลงาน</button></form>}
        </section>
        <section className="detail-sheet">
          <div className="sheet-heading"><div><span>กรณีมีปัญหา</span><h3>ข้อพิพาทและหลักฐาน</h3></div>{job.status === 3 && <span className="large-status status-3"><i/>กำลังพิจารณา</span>}</div>
          {job.disputeReason ? <div className="case-record"><b>เหตุผลที่เปิดข้อพิพาท</b><p>{job.disputeReason}</p><small>เปิดโดย {short(job.disputeOpenedBy)}</small>{job.disputeEvidence && <div><SafeLink value={job.disputeEvidence}/></div>}</div> : <p className="quiet-copy">ยังไม่มีข้อพิพาทในงานนี้</p>}
          {events.filter((item) => item.name === "DisputeEvidenceAdded").map((item, index) => <div className="case-record secondary-record" key={item.hash + index}><b>หลักฐานเพิ่มเติมจาก {short(item.account)}</b><p><SafeLink value={item.evidence}/></p></div>)}
          {job.resolutionReason && <div className="resolution-record"><CircleCheck size={17}/><span><b>ผลการพิจารณา</b><p>{job.resolutionReason}</p></span></div>}
          {can && job.status === 3 && (employer || freelancer) && <form className="inline-action stacked" onSubmit={(event) => submit(event, () => { onEvidence(job, extra); setExtra(""); })}><label>เพิ่มหลักฐาน<input value={extra} onChange={(event) => setExtra(event.target.value)} placeholder="URL หรือรายละเอียดหลักฐาน" required/></label><button className="button secondary" disabled={busy}>เพิ่มหลักฐาน</button></form>}
          {can && (employer || freelancer) && (job.status === 1 || job.status === 2) && <form className="inline-action stacked" onSubmit={(event) => submit(event, () => onRaise(job, reason, evidence))}><label>เหตุผลในการเปิดข้อพิพาท<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="อธิบายปัญหาที่เกิดขึ้น" required/></label><label>หลักฐานประกอบ (ไม่บังคับ)<input value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="https://…"/></label><button className="button danger" disabled={busy}>เปิดข้อพิพาท</button></form>}
        </section>
        {can && isAdmin && job.status === 3 && <form className="detail-sheet decision-sheet" onSubmit={(event) => submit(event, () => onResolve(job, Number(decision), resolution))}>
          <div className="sheet-heading"><div><span>การพิจารณา</span><h3>บันทึกคำตัดสิน</h3></div><span className="admin-mark"><ShieldCheck size={15}/>Admin</span></div>
          <label>ผลการพิจารณา<select value={decision} onChange={(event) => setDecision(event.target.value)}><option value="0">จ่ายให้ฟรีแลนซ์</option><option value="1">คืนเงินผู้ว่าจ้าง</option></select></label>
          <label>เหตุผลประกอบคำตัดสิน<textarea value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="ระบุเหตุผลที่ใช้พิจารณา" required/></label>
          <p className="decision-warning"><CircleAlert size={17}/> การยืนยันจะโอนยอด Escrow ทั้งหมดตามผลที่เลือก</p><button className="button primary" disabled={busy}>{busy ? "กำลังส่งธุรกรรม…" : "ยืนยันผลการพิจารณ"}</button>
        </form>}
      </div>
      <aside className="detail-aside">
        <div className="escrow-summary"><span><LockKeyhole size={18}/> เงินใน Escrow</span><strong>{ETH(job.escrowBalance)}</strong><small>{job.escrowBalance > 0n ? "ยังพักอยู่ใน Contract" : "ไม่มีเงินค้างใน Contract"}</small><div className="escrow-rule"><i style={{ width: job.escrowBalance > 0n ? "100%" : "0%" }}/></div>
          <div className="contract-link"><span>Smart Contract</span><a href={EXPLORER + "/address/" + CONTRACT_ADDRESS} target="_blank" rel="noreferrer">{short(CONTRACT_ADDRESS)}<ExternalLink size={14}/></a></div>
          <small className="contract-network">Sepolia · Job #{job.id}</small>
        </div>
        {can && employer && job.status === 0 && <div className="next-action"><span className="action-symbol"><HandCoins size={20}/></span><small>ขั้นตอนถัดไป</small><strong>ฝากค่าจ้างเพื่อเริ่มงาน</strong><p>Contract จะพัก {ETH(job.amount)} จนกว่าจะตรวจรับผลงาน</p><button className="button primary full" onClick={() => onDeposit(job)} disabled={busy}>{busy ? "กำลังส่ง…" : "ฝากค่าจ้าง"}<ArrowRight size={17}/></button></div>}
        {can && employer && job.status === 2 && <div className="next-action"><span className="action-symbol"><BadgeCheck size={20}/></span><small>ขั้นตอนถัดไป</small><strong>ตรวจรับผลงาน</strong><p>เมื่ออนุมัติ Contract จะจ่าย {ETH(job.amount)} ให้ฟรีแลนซ์</p><button className="button primary full" onClick={() => onRelease(job)} disabled={busy}>{busy ? "กำลังส่ง…" : "อนุมัติและจ่าย"}<ArrowRight size={17}/></button></div>}
        <div className="workflow-sheet"><div className="sheet-heading"><div><span>บันทึกเหตุการณ์</span><h3>ลำดับงาน</h3></div><History size={16}/></div>{events.slice(0, 5).map((item, index) => <div className="event-mini" key={item.hash + index}><i/><span><b>{item.label}</b><small>Block {item.block}</small></span></div>)}{!events.length && timeline.map((item, index) => <div className={"event-mini" + (item.complete ? " complete" : "")} key={item.title}><i/>{item.title}</div>)}</div>
      </aside>
    </div>
  </section>;
}

export function JobDetail({ job, loading, mode, account, isAdmin, enabled, busy, events, onBack, onDeposit, onSubmit, onRelease, onRaise, onEvidence, onResolve }) {
  const [references, setReferences] = useState({});
  const [reasons, setReasons] = useState({});
  const [evidence, setEvidence] = useState({});
  const [extraEvidence, setExtraEvidence] = useState({});
  const [decisions, setDecisions] = useState({});
  const [resolutions, setResolutions] = useState({});
  if (!job) return <section className="page"><button className="back-link" onClick={onBack}><ArrowLeft size={16}/>กลับไปยังแฟ้มงาน</button><div className="empty-state">{loading ? "กำลังอ่านข้อมูลงาน…" : "ไม่พบงานนี้ใน Contract"}</div></section>;
  const employer = job.employer.toLowerCase() === account.toLowerCase();
  const freelancer = job.freelancer.toLowerCase() === account.toLowerCase();
  const can = enabled && !busy;
  const jobStatus = STATUS[job.status] || STATUS[0];
  const setField = (setter, id, value) => setter((current) => ({ ...current, [id]: value }));
  const submit = (event, fn) => { event.preventDefault(); fn(); };
  return <section className="page job-detail-page">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16}/>กลับไปยังแฟ้มงาน</button>
    <div className="detail-header"><div className="detail-title"><span className="eyebrow"><span className="eyebrow-rule"/> งาน #{String(job.id).padStart(3, "0")}</span><h2>{job.title}</h2><p>{job.description}</p></div><span className={"large-status status-" + job.status}><i/>{jobStatus}</span></div>
    <div className="milestone-track" aria-label="ความคืบหน้าของงาน">{job.milestones.map((milestone, index) => <div className={"milestone" + ([4, 5].includes(milestone.status) ? " complete" : "") + (milestone.status === 3 ? " disputed" : "")} key={milestone.id}><i>{[4, 5].includes(milestone.status) ? <Check size={13}/> : index + 1}</i><span>{milestone.title}</span></div>)}</div>
    <div className="detail-layout">
      <div className="detail-column">
        <section className="detail-sheet"><div className="sheet-heading"><div><span>ข้อตกลง</span><h3>คู่สัญญาและภาพรวม</h3></div><span className="chain-stamp"><LockKeyhole size={14}/>Sepolia Contract</span></div>
          <div className="party-pair"><Party label="ผู้ว่าจ้าง" address={job.employer}/><ArrowRight size={18}/><Party label="ฟรีแลนซ์" address={job.freelancer}/></div>
          <div className="agreement-facts"><div><small>จำนวน Milestone</small><b>{job.milestones.length} งวด</b></div><div><small>ค่าจ้างรวม</small><b>{ETH(job.amount)}</b></div><div><small>ยอดพักใน Escrow</small><b>{ETH(job.escrowBalance)}</b></div></div>
        </section>
        {job.milestones.map((milestone) => {
          const statusName = ["รอฝากเงิน", "รอส่งผลงาน", "รอตรวจรับ", "มีข้อพิพาท", "จ่ายแล้ว", "คืนเงินแล้ว"][milestone.status];
          const relatedEvents = events.filter((event) => event.milestoneId === String(milestone.id));
          return <section className="detail-sheet milestone-detail" key={milestone.id}>
            <div className="sheet-heading"><div><span>Milestone {milestone.id} · กำหนดส่ง {when(milestone.deadline)}</span><h3>{milestone.title}</h3></div><span className={"large-status status-" + (milestone.status === 3 ? 1 : milestone.status >= 4 ? 2 : 0)}><i/>{statusName}</span></div>
            <p>{milestone.description}</p><div className="agreement-facts"><div><small>ค่าจ้างงวดนี้</small><b>{ETH(milestone.amount)}</b></div><div><small>ยอดพักงวดนี้</small><b>{ETH(milestone.escrowBalance)}</b></div><div><small>ส่งเมื่อ</small><b>{milestone.submittedAt ? when(milestone.submittedAt) : "ยังไม่ส่ง"}</b></div></div>
            {milestone.workReference && <div className="evidence-link"><span><FileCheck2 size={18}/></span><div><small>หลักฐานส่งงาน</small><SafeLink value={milestone.workReference}/></div></div>}
            {milestone.disputeReason && <div className="case-record"><b>เหตุผลที่เปิดข้อพิพาท</b><p>{milestone.disputeReason}</p><small>เปิดโดย {short(milestone.disputeOpenedBy)}</small>{milestone.disputeEvidence && <div><SafeLink value={milestone.disputeEvidence}/></div>}</div>}
            {relatedEvents.filter((event) => event.name === "DisputeEvidenceAdded").map((event) => <div className="case-record secondary-record" key={event.hash}><b>หลักฐานเพิ่มเติมจาก {short(event.account)}</b><p><SafeLink value={event.evidence}/></p></div>)}
            {milestone.resolutionReason && <div className="resolution-record"><CircleCheck size={17}/><span><b>ผลการพิจารณา</b><p>{milestone.resolutionReason}</p></span></div>}
            {can && employer && milestone.status === 0 && <button className="button primary" onClick={() => onDeposit(job, milestone)}><HandCoins size={16}/>ฝาก {ETH(milestone.amount)}</button>}
            {can && freelancer && milestone.status === 1 && <form className="inline-action" onSubmit={(event) => submit(event, () => onSubmit(job, milestone, references[milestone.id] || ""))}><label>ลิงก์หรือ Hash ผลงาน<input value={references[milestone.id] || ""} onChange={(event) => setField(setReferences, milestone.id, event.target.value)} placeholder="https://… หรือ Content Hash" required/></label><button className="button primary">ส่งผลงาน</button></form>}
            {can && employer && milestone.status === 2 && <button className="button primary" onClick={() => onRelease(job, milestone)}><BadgeCheck size={16}/>อนุมัติและจ่าย {ETH(milestone.amount)}</button>}
            {can && (employer || freelancer) && [1, 2].includes(milestone.status) && <form className="inline-action stacked" onSubmit={(event) => submit(event, () => onRaise(job, milestone, reasons[milestone.id] || "", evidence[milestone.id] || ""))}><label>เหตุผลเปิดข้อพิพาท<textarea value={reasons[milestone.id] || ""} onChange={(event) => setField(setReasons, milestone.id, event.target.value)} placeholder="อธิบายปัญหาของงวดนี้" required/></label><label>หลักฐาน (ไม่บังคับ)<input value={evidence[milestone.id] || ""} onChange={(event) => setField(setEvidence, milestone.id, event.target.value)} placeholder="URL หรือ Hash"/></label><button className="button danger">เปิดข้อพิพาทงวดนี้</button></form>}
            {can && milestone.status === 3 && (employer || freelancer) && <form className="inline-action" onSubmit={(event) => submit(event, () => onEvidence(job, milestone, extraEvidence[milestone.id] || ""))}><label>เพิ่มหลักฐาน<input value={extraEvidence[milestone.id] || ""} onChange={(event) => setField(setExtraEvidence, milestone.id, event.target.value)} placeholder="URL หรือ Hash" required/></label><button className="button secondary">เพิ่มหลักฐาน</button></form>}
            {can && isAdmin && milestone.status === 3 && <form className="decision-sheet" onSubmit={(event) => submit(event, () => onResolve(job, milestone, Number(decisions[milestone.id] || 0), resolutions[milestone.id] || ""))}><div className="sheet-heading"><div><span>การพิจารณา</span><h3>ตัดสินข้อพิพาทงวด {milestone.id}</h3></div><span className="admin-mark"><ShieldCheck size={15}/>Admin</span></div><label>ผลการพิจารณา<select value={decisions[milestone.id] || "0"} onChange={(event) => setField(setDecisions, milestone.id, event.target.value)}><option value="0">จ่ายให้ฟรีแลนซ์</option><option value="1">คืนเงินผู้ว่าจ้าง</option></select></label><label>เหตุผลประกอบคำตัดสิน<textarea value={resolutions[milestone.id] || ""} onChange={(event) => setField(setResolutions, milestone.id, event.target.value)} placeholder="ระบุเหตุผล" required/></label><button className="button primary">ยืนยันผลการพิจารณา</button></form>}
          </section>;
        })}
      </div>
      <aside className="detail-aside"><div className="escrow-summary"><span><LockKeyhole size={18}/> เงินใน Escrow</span><strong>{ETH(job.escrowBalance)}</strong><small>{job.escrowBalance > 0n ? "รวมยอดของ Milestone ที่ฝากแล้ว" : "ไม่มีเงินค้างใน Contract"}</small><div className="escrow-rule"><i style={{ width: job.amount > 0n ? `${Number(job.escrowBalance * 100n / job.amount)}%` : "0%" }}/></div><div className="contract-link"><span>Smart Contract</span><a href={EXPLORER + "/address/" + CONTRACT_ADDRESS} target="_blank" rel="noreferrer">{short(CONTRACT_ADDRESS)}<ExternalLink size={14}/></a></div><small className="contract-network">Sepolia · Job #{job.id}</small></div>
        <div className="workflow-sheet"><div className="sheet-heading"><div><span>บันทึกเหตุการณ์</span><h3>ลำดับงาน</h3></div><History size={16}/></div>{events.slice(0, 8).map((event) => <div className="event-mini" key={event.hash + event.name}><i/><span><b>{event.label}{event.milestoneId ? ` · งวด ${event.milestoneId}` : ""}</b><small>Block {event.block}</small></span></div>)}{!events.length && <p className="quiet-copy">{jobStatus}</p>}</div>
      </aside>
    </div>
  </section>;
}

function Party({ label, address }) {
  return <div className="party"><small>{label}</small><b><WalletCards size={15}/>{short(address)}</b></div>;
}

function SafeLink({ value }) {
  if (!safeUrl(value)) return <span className="untrusted-value">{value}</span>;
  const href = value.startsWith("ipfs://") ? "https://ipfs.io/ipfs/" + value.slice(7) : value;
  return <a href={href} target="_blank" rel="noreferrer">{value}<ExternalLink size={13}/></a>;
}

export function DisputeList({ jobs, mode, isAdmin, onJob }) {
  return <section className="page dispute-page">
    <div className="page-heading"><div><span className="eyebrow"><span className="eyebrow-rule"/> ศูนย์ข้อพิพาท</span><h2>{mode === "admin" ? "คดีที่รอการพิจารณา" : "ข้อพิพาทในงานของฉัน"}</h2><p>{mode === "admin" ? (isAdmin ? "ตรวจข้อตกลง หลักฐาน และลำดับเหตุการณ์ก่อนบันทึกผล" : "ต้องเชื่อม Wallet Admin ของ Contract เพื่อพิจารณา") : "เปิดดูรายละเอียดและเพิ่มหลักฐานให้ข้อพิพาทของงาน"}</p></div><div className="case-count"><strong>{jobs.length}</strong><span>รายการ</span></div></div>
    {jobs.length ? <div className="case-register"><div className="case-register-head"><span>งานและเหตุผล</span><span>ยอดที่พัก</span><span>เปิดโดย</span><span/></div>{jobs.map((job) => <button className="case-row" key={job.id + ":" + job.milestoneId} onClick={() => onJob(job.id)}><span className="case-title"><span className="status-3"><i/>กำลังพิจารณา · งวด {job.milestoneId}</span><b>{job.title}</b><small>#{String(job.id).padStart(3, "0")} · {job.milestoneTitle} · {job.disputeReason}</small></span><strong>{ETH(job.escrowBalance)}</strong><span>{short(job.disputeOpenedBy)}</span><ChevronRight size={18}/></button>)}</div> : <div className="empty-state"><span className="empty-mark"><Scale size={22}/></span><h3>ยังไม่มีข้อพิพาทที่ต้องแสดง</h3><p>{mode === "admin" ? "คดีที่รอพิจารณาจาก Contract จะแสดงที่นี่" : "เมื่อเปิดข้อพิพาทในงานของคุณ รายการจะปรากฏที่นี่"}</p></div>}
  </section>;
}

export function ActivityList({ events }) {
  const [kind, setKind] = useState("all");
  const types = ["all", ...Array.from(new Set(events.map((item) => item.name)))];
  const visible = kind === "all" ? events : events.filter((item) => item.name === kind);
  return <section className="page history-page">
    <div className="page-heading"><div><span className="eyebrow"><span className="eyebrow-rule"/> ประวัติบนเชน</span><h2>ทุกขั้นตอนมีหลักฐาน</h2><p>อ่านจาก Event Logs ของ Contract บน Sepolia · รายการใหม่อยู่ด้านบน</p></div><div className="case-count"><strong>{visible.length}</strong><span>เหตุการณ์</span></div></div>
    <div className="history-toolbar"><span><History size={17}/> ธุรกรรมที่บันทึกแล้ว</span><label><span>ประเภท</span><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="all">ทุกประเภท</option>{types.filter((name) => name !== "all").map((name) => <option key={name} value={name}>{events.find((item) => item.name === name)?.label || name}</option>)}</select></label></div>
    {visible.length ? <div className="event-register">{visible.map((event, index) => <article className="chain-event" key={event.hash + index}><span className="event-mark"><CircleCheck size={18}/></span><div className="event-main"><strong>{event.label}</strong><small>งาน #{event.jobId}{event.milestoneId ? " · Milestone " + event.milestoneId : ""}{event.reason ? " · " + event.reason : ""}</small></div><div className="event-value">{event.amount != null ? ETH(event.amount) : "—"}<small>{event.account ? short(event.account) : "Contract"}</small></div><div className="event-block"><span>Block</span><b>{event.block}</b></div><a className="event-hash" href={EXPLORER + "/tx/" + event.hash} target="_blank" rel="noreferrer">{short(event.hash)}<ExternalLink size={14}/></a></article>)}</div> : <div className="empty-state"><span className="empty-mark"><History size={22}/></span><h3>{events.length ? "ไม่มีเหตุการณ์ประเภทนี้" : "ยังไม่มีประวัติจาก Contract"}</h3><p>{events.length ? "เปลี่ยนตัวกรองเพื่อดูเหตุการณ์ประเภทอื่น" : "Event Logs ของธุรกรรมจะปรากฏที่นี่หลังบันทึกบน Sepolia"}</p></div>}
  </section>;
}
