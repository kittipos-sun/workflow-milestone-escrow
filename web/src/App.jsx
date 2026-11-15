import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, formatEther, isAddress, parseEther } from "ethers";
import abiFile from "./FreelanceEscrow.abi.json";
import { CHAIN_ID, CONTRACT_ADDRESS, DEPLOYMENT_BLOCK, EXPLORER } from "./config.js";
import { Welcome, RolePicker, Dashboard, CreateJobForm, JobDetail, DisputeList, ActivityList, NavItem } from "./Sections.jsx";

const STATUS = ["รอฝากเงิน", "กำลังทำงาน", "รอตรวจรับ", "มีข้อพิพาท", "เสร็จสิ้น", "คืนเงินแล้ว"];
const EVENT_LABEL = {JobCreated:"สร้างงาน",PaymentDeposited:"ฝากเงิน",WorkSubmitted:"ส่งผลงาน",DisputeRaised:"เปิดข้อพิพาท",DisputeEvidenceAdded:"เพิ่มหลักฐาน",DisputeResolved:"ตัดสินข้อพิพาท",PaymentReleased:"จ่ายให้ฟรีแลนซ์",PaymentRefunded:"คืนเงินผู้ว่าจ้าง"};
const short = (s="") => s ? `${s.slice(0,7)}…${s.slice(-5)}` : "—";
const ether = (n) => `${Number(formatEther(n)).toLocaleString("th-TH",{maximumFractionDigits:5})} ETH`;
const when = (n) => n ? new Date(Number(n)*1000).toLocaleString("th-TH",{dateStyle:"medium",timeStyle:"short"}) : "—";
const errText = (e) => e?.code===4001||e?.info?.error?.code===4001 ? "ยกเลิกคำขอใน MetaMask แล้ว" : e?.shortMessage||e?.reason||e?.info?.error?.message||e?.message||"เกิดข้อผิดพลาด กรุณาลองอีกครั้ง";
const go = (path) => { window.location.hash=path; };

export default function App(){
  const [route,setRoute]=useState(location.hash.slice(1)||"/");
  const [provider,setProvider]=useState(null),[account,setAccount]=useState(""),[contract,setContract]=useState(null),[chainId,setChainId]=useState(null),[admin,setAdmin]=useState("");
  const [mode,setMode]=useState(localStorage.getItem("wf-mode")||"employer"),[jobs,setJobs]=useState([]),[events,setEvents]=useState([]);
  const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[lastTx,setLastTx]=useState("");
  const [filter,setFilter]=useState("all");
  const id=route.startsWith("/job/")?route.split("/")[2]:"";
  const job=jobs.find((j)=>String(j.id)===id);
  const connected=Boolean(contract&&account),correctNetwork=chainId===CHAIN_ID,isAdmin=connected&&account.toLowerCase()===admin.toLowerCase();

  useEffect(()=>{const f=()=>setRoute(location.hash.slice(1)||"/");addEventListener("hashchange",f);return()=>removeEventListener("hashchange",f);},[]);

  const loadData=useCallback(async(c)=>{
    if(!c)return;setLoading(true);setError("");
    try{
      const [count,adminAddress]=await Promise.all([c.jobCount(),c.admin()]);setAdmin(adminAddress);
      const total=Number(count),first=Math.max(1,total-199);
      const rows=total?await Promise.all(Array.from({length:total-first+1},(_,i)=>first+i).map(async(jobId)=>{
        const j=await c.getJob(jobId);return{id:jobId,employer:j.employer,freelancer:j.freelancer,title:j.title,description:j.description,amount:j.amount,deadline:j.deadline,status:Number(j.status),escrowBalance:j.escrowBalance,workReference:j.workReference,submittedAt:j.submittedAt,disputeReason:j.disputeReason,disputeEvidence:j.disputeEvidence,disputeOpenedBy:j.disputeOpenedBy,resolutionReason:j.resolutionReason};
      })):[];setJobs(rows.reverse());
      const hist=await Promise.all(Object.entries(EVENT_LABEL).map(async([name,label])=>{
        try{return(await c.queryFilter(c.filters[name](),DEPLOYMENT_BLOCK,"latest")).map((log)=>({name,label,jobId:String(log.args?.jobId??log.args?.[0]??""),account:log.args?.employer??log.args?.freelancer??log.args?.openedBy??log.args?.submittedBy??log.args?.[1]??"",amount:log.args?.amount??(name==="PaymentDeposited"||name==="PaymentReleased"||name==="PaymentRefunded"?log.args?.[2]:null),reason:log.args?.reason??"",evidence:log.args?.evidence??"",decision:log.args?.decision??null,hash:log.transactionHash,block:log.blockNumber}));}catch{return[];}
      }));setEvents(hist.flat().sort((a,b)=>b.block-a.block));
    }catch(e){setError(`อ่านข้อมูล Contract ไม่สำเร็จ: ${errText(e)}`);}finally{setLoading(false);}
  },[]);

  const connect=useCallback(async(silent=false)=>{
    setError("");setNotice("");
    if(!window.ethereum){setError("ไม่พบ MetaMask Extension กรุณาติดตั้งหรือเปิดใช้งาน");return;}
    try{
      const p=new BrowserProvider(window.ethereum),accounts=await p.send("eth_requestAccounts",[]);if(!accounts.length)return;
      const network=await p.getNetwork();setProvider(p);setAccount(accounts[0]);setChainId(network.chainId);
      if(network.chainId!==CHAIN_ID){setContract(null);setError("เปลี่ยนเครือข่าย MetaMask เป็น Sepolia ก่อนใช้งาน");return;}
      const signer=await p.getSigner(),c=new Contract(CONTRACT_ADDRESS,abiFile.abi,signer);setContract(c);setAdmin(await c.admin());await loadData(c);if(!silent)setNotice("เชื่อมต่อ MetaMask บน Sepolia แล้ว");
    }catch(e){setError(errText(e));}
  },[loadData]);

  useEffect(()=>{
    if(!window.ethereum)return;
    const onAccounts=(a)=>{if(!a.length){setAccount("");setContract(null);setJobs([]);setEvents([]);}else connect(true);};
    const onChain=()=>connect(true);
    window.ethereum.on?.("accountsChanged",onAccounts);window.ethereum.on?.("chainChanged",onChain);
    window.ethereum.request({method:"eth_accounts"}).then(a=>{if(a?.length)connect(true);}).catch(()=>{});
    return()=>{window.ethereum.removeListener?.("accountsChanged",onAccounts);window.ethereum.removeListener?.("chainChanged",onChain);};
  },[connect]);

  const switchChain=async()=>{try{await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:"0xaa36a7"}]});await connect(true);}catch(e){setError(errText(e));}};
  const tx=async(label,send)=>{
    if(!contract||!correctNetwork){setError("เชื่อม MetaMask บน Sepolia ก่อนทำรายการ");return false;}
    setBusy(true);setError("");setNotice("");setLastTx("");
    try{const pending=await send(contract);setLastTx(pending.hash);setNotice(`${label}: ส่งแล้ว กำลังรอการยืนยันบน Blockchain`);const receipt=await pending.wait();if(receipt.status!==1)throw Error("ธุรกรรมถูกย้อนกลับ");setNotice(`${label}: สำเร็จ`);await loadData(contract);return true;}catch(e){setError(errText(e));return false;}finally{setBusy(false);}
  };
  const chooseMode=(m)=>{setMode(m);localStorage.setItem("wf-mode",m);go("/dashboard");};
  const visibleJobs=useMemo(()=>{
    if(!connected)return[];
    const filtered=mode==="admin"?jobs.filter(j=>j.status===3):jobs.filter(j=>(mode==="employer"?j.employer:j.freelancer).toLowerCase()===account.toLowerCase());
    return filter==="all"?filtered:filtered.filter(j=>j.status===Number(filter));
  },[connected,jobs,mode,account,filter]);

  const createJob=async(form)=>{
    if(!isAddress(form.freelancer)){setError("Address ฟรีแลนซ์ไม่ถูกต้อง");return;}
    if(!form.title.trim()||!form.description.trim()||!form.deadline){setError("กรอกข้อมูลให้ครบ");return;}
    if(form.freelancer.toLowerCase()===account.toLowerCase()){setError("Address ฟรีแลนซ์ต้องไม่ใช่ผู้ว่าจ้าง");return;}
    try{const value=parseEther(form.amount),deadline=Math.floor(new Date(form.deadline).getTime()/1000);const ok=await tx("สร้างงาน",c=>c.createJob(form.title.trim(),form.description.trim(),value,deadline,form.freelancer));if(ok)go("/dashboard");}catch(e){setError(errText(e));}
  };
  const doDeposit=(j)=>tx("ฝากค่าจ้าง",c=>c.depositPayment(j.id,{value:j.amount}));
  const doSubmit=(j,ref)=>tx("ส่งผลงาน",c=>c.submitWork(j.id,ref));
  const doRelease=(j)=>tx("อนุมัติและจ่าย",c=>c.approveAndRelease(j.id));
  const doRaise=(j,reason,evidence)=>tx("เปิดข้อพิพาท",c=>c.raiseDispute(j.id,reason,evidence));
  const doEvidence=(j,evidence)=>tx("เพิ่มหลักฐาน",c=>c.addDisputeEvidence(j.id,evidence));
  const doResolve=(j,decision,reason)=>tx("ตัดสินข้อพิพาท",c=>c.resolveDispute(j.id,decision,reason));

  const title=route==="/"?"ยินดีต้อนรับ":route==="/roles"?"เลือกบทบาท":route==="/create"?"สร้างงานใหม่":route==="/disputes"?"ข้อพิพาท":route==="/history"?"ประวัติธุรกรรม":id?"รายละเอียดงาน":"แดชบอร์ด";
  const roleName=mode==="admin"?"ผู้ดูแลระบบ":mode==="freelancer"?"ฟรีแลนซ์":"ผู้ว่าจ้าง";
  return <div className="shell">
    <aside className="sidebar"><a className="brand" href="#/"><span className="brand-icon">W</span><span><b>WorkFlow</b><small>FREELANCE ESCROW</small></span></a>
      <div className="network-label"><i className={correctNetwork?"live":""}/> Sepolia Testnet</div><p className="nav-caption">เมนูหลัก</p><nav>
        <NavItem icon="▦" label="แดชบอร์ด" active={route==="/dashboard"||route==="/"} onClick={()=>go("/dashboard")}/>
        <NavItem icon="◎" label="เลือกบทบาท" active={route==="/roles"} onClick={()=>go("/roles")}/>
        {mode==="employer"&&<NavItem icon="＋" label="สร้างงาน" active={route==="/create"} onClick={()=>go("/create")}/>}
        <NavItem icon="⚖" label="ข้อพิพาท" active={route==="/disputes"} onClick={()=>go("/disputes")}/>
        <NavItem icon="↗" label="ประวัติธุรกรรม" active={route==="/history"} onClick={()=>go("/history")}/>
      </nav>
      <div className="sidebar-foot"><div className="account-mini"><span className="avatar">{account?account.slice(2,4).toUpperCase():"W"}</span><span><b>{connected?roleName:"ยังไม่เชื่อม Wallet"}</b><small>{connected?short(account):"MetaMask"}</small></span></div><button className="button ghost full" onClick={()=>connected?go("/roles"):connect()}>{connected?"สลับโหมด":"เชื่อม Wallet"}</button></div>
    </aside>
      <main className="main"><header className="topbar"><div><span className="overline">FREELANCE ESCROW PLATFORM</span><h1>{title}</h1></div><div className="top-buttons">{connected&&<button className="wallet-chip" onClick={()=>connect()}><i/> {short(account)}　⌄</button>}{!connected?<button className="button primary" onClick={()=>connect()}>เชื่อม MetaMask</button>:!correctNetwork?<button className="button amber" onClick={switchChain}>เปลี่ยนเป็น Sepolia</button>:<button className="button ghost" onClick={()=>loadData(contract)}>{loading?"กำลังโหลด…":"↻ รีเฟรช"}</button>}</div></header>
      {(error||notice)&&<div className={`notice ${error?"bad":"good"}`}><span>{error?"!":"✓"}</span><div>{error||notice}{lastTx&&<div><a href={`${EXPLORER}/tx/${lastTx}`} target="_blank" rel="noreferrer">ดูธุรกรรม {short(lastTx)} ↗</a></div>}</div><button onClick={()=>{setError("");setNotice("");}}>×</button></div>}
      {connected&&!correctNetwork&&<div className="notice bad"><span>!</span>เปลี่ยน MetaMask เป็น Sepolia ก่อนอ่านหรือส่งธุรกรรม</div>}
      {route==="/"&&<Welcome connected={connected} onConnect={connect} onChoose={()=>go("/roles")}/>}
      {route==="/roles"&&<RolePicker account={account} mode={mode} isAdmin={isAdmin} onSelect={chooseMode}/>}
      {route==="/dashboard"&&<Dashboard mode={mode} jobs={visibleJobs} loading={loading} filter={filter} setFilter={setFilter} onJob={n=>go(`/job/${n}`)} onCreate={()=>go("/create")}/>}
      {route==="/create"&&<CreateJobForm enabled={connected&&correctNetwork&&mode==="employer"} busy={busy} account={account} onSubmit={createJob}/>}
      {id&&<JobDetail job={job} loading={loading} mode={mode} account={account} isAdmin={isAdmin} enabled={connected&&correctNetwork} busy={busy} events={events.filter(e=>e.jobId===id)} onBack={()=>go("/dashboard")} onDeposit={doDeposit} onSubmit={doSubmit} onRelease={doRelease} onRaise={doRaise} onEvidence={doEvidence} onResolve={doResolve}/>}
      {route==="/disputes"&&<DisputeList jobs={jobs.filter(j=>j.status===3&&(mode==="admin"?isAdmin:[j.employer,j.freelancer].some(a=>a.toLowerCase()===account.toLowerCase())))} mode={mode} isAdmin={isAdmin} onJob={n=>go(`/job/${n}`)}/>}
      {route==="/history"&&<ActivityList events={events}/>}
      <footer><span>WorkFlow · Smart Contract บน Sepolia</span><a href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Contract {short(CONTRACT_ADDRESS)} ↗</a></footer>
    </main>
  </div>;
}
