import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, Contract, isAddress, parseEther } from "ethers";
import abiFile from "./FreelanceEscrow.abi.json";
import { CHAIN_ID, CONTRACT_ADDRESS, DEPLOYMENT_BLOCK, EXPLORER } from "./config.js";
import { Welcome, RolePicker, Dashboard, CreateJobForm, JobDetail, DisputeList, ActivityList, NavItem } from "./Sections.jsx";

const EVENT_LABEL = { JobCreated: "สร้างงาน", PaymentDeposited: "ฝากเงิน", WorkSubmitted: "ส่งผลงาน", DisputeRaised: "เปิดข้อพิพาท", DisputeEvidenceAdded: "เพิ่มหลักฐาน", DisputeResolved: "ตัดสินข้อพิพาท", PaymentReleased: "จ่ายให้ฟรีแลนซ์", PaymentRefunded: "คืนเงินผู้ว่าจ้าง" };
const short = (value = "") => typeof value === "string" && value ? `${value.slice(0, 7)}…${value.slice(-5)}` : "—";
const errText = (error) => error?.code === 4001 || error?.info?.error?.code === 4001 ? "ยกเลิกคำขอใน MetaMask แล้ว" : error?.shortMessage || error?.reason || error?.info?.error?.message || error?.message || "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง";
const go = (path) => { window.location.hash = path; };

export default function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || "/");
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [admin, setAdmin] = useState("");
  const [mode, setMode] = useState("");
  const [roleAccount, setRoleAccount] = useState("");
  const loggedOut = useRef(sessionStorage.getItem("wf-logged-out") === "1");
  const sessionEpoch = useRef(0);
  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastTx, setLastTx] = useState("");
  const [filter, setFilter] = useState("all");

  const parts = route.split("/").filter(Boolean);
  const routeRole = parts[0] || "";
  const section = parts[1] || "dashboard";
  const id = section === "job" ? parts[2] || "" : "";
  const job = jobs.find((item) => String(item.id) === id);
  const connected = Boolean(contract && account);
  const correctNetwork = chainId === CHAIN_ID;
  const isAdmin = connected && account.toLowerCase() === admin.toLowerCase();
  const activeMode = roleAccount.toLowerCase() === account.toLowerCase() ? mode : "";
  const hasWorkspace = connected && correctNetwork && Boolean(activeMode);

  useEffect(() => {
    const onHashChange = () => setRoute(location.hash.slice(1) || "/");
    addEventListener("hashchange", onHashChange);
    return () => removeEventListener("hashchange", onHashChange);
  }, []);

  const loadData = useCallback(async (activeContract) => {
    if (!activeContract) return;
    const epoch = sessionEpoch.current;
    setLoading(true);
    setError("");
    try {
      const [count, adminAddress] = await Promise.all([activeContract.jobCount(), activeContract.admin()]);
      if (epoch !== sessionEpoch.current) return;
      setAdmin(adminAddress);
      const total = Number(count);
      const first = Math.max(1, total - 199);
      const rows = total ? await Promise.all(Array.from({ length: total - first + 1 }, (_, index) => first + index).map(async (jobId) => {
        const item = await activeContract.getJob(jobId);
        return { id: jobId, employer: item.employer, freelancer: item.freelancer, title: item.title, description: item.description, amount: item.amount, deadline: item.deadline, status: Number(item.status), escrowBalance: item.escrowBalance, workReference: item.workReference, submittedAt: item.submittedAt, disputeReason: item.disputeReason, disputeEvidence: item.disputeEvidence, disputeOpenedBy: item.disputeOpenedBy, resolutionReason: item.resolutionReason };
      })) : [];
      if (epoch !== sessionEpoch.current) return;
      setJobs(rows.reverse());
      const history = await Promise.all(Object.entries(EVENT_LABEL).map(async ([name, label]) => {
        try {
          const logs = await activeContract.queryFilter(activeContract.filters[name](), DEPLOYMENT_BLOCK, "latest");
          return logs.map((log) => {
            const args = log.args;
            const accountAddress = [args?.employer, args?.freelancer, args?.openedBy, args?.submittedBy].find((value) => typeof value === "string" && isAddress(value)) || "";
            const amount = args?.amount ?? (["PaymentDeposited", "PaymentReleased", "PaymentRefunded"].includes(name) ? args?.[2] : null);
            return { name, label, jobId: String(args?.jobId ?? args?.[0] ?? ""), account: accountAddress, amount, reason: args?.reason ?? "", evidence: args?.evidence ?? "", decision: args?.decision ?? null, hash: log.transactionHash, block: log.blockNumber };
          });
        } catch {
          return [];
        }
      }));
      if (epoch !== sessionEpoch.current) return;
      setEvents(history.flat().sort((a, b) => b.block - a.block));
    } catch (loadError) {
      if (epoch === sessionEpoch.current) setError(`อ่านข้อมูล Contract ไม่สำเร็จ: ${errText(loadError)}`);
    } finally {
      if (epoch === sessionEpoch.current) setLoading(false);
    }
  }, []);

  const connect = useCallback(async (silent = false) => {
    const epoch = ++sessionEpoch.current;
    setError("");
    setNotice("");
    if (!silent) {
      loggedOut.current = false;
      sessionStorage.removeItem("wf-logged-out");
    }
    if (!window.ethereum) {
      setError("ไม่พบ MetaMask Extension กรุณาติดตั้งหรือเปิดใช้งาน");
      return;
    }
    try {
      const p = new BrowserProvider(window.ethereum);
      const accounts = await p.send(silent ? "eth_accounts" : "eth_requestAccounts", []);
      if (epoch !== sessionEpoch.current || loggedOut.current) return;
      if (!accounts.length) {
        setAccount("");
        setContract(null);
        setMode("");
        return;
      }
      const network = await p.getNetwork();
      if (epoch !== sessionEpoch.current || loggedOut.current) return;
      const accountChanged = account && account.toLowerCase() !== accounts[0].toLowerCase();
      setAccount(accounts[0]);
      setChainId(network.chainId);
      if (accountChanged) {
        setMode("");
        setRoleAccount("");
      }
      if (network.chainId !== CHAIN_ID) {
        setContract(null);
        setMode("");
        setRoleAccount("");
        setError("เปลี่ยนเครือข่าย MetaMask เป็น Sepolia ก่อนใช้งาน");
        return;
      }
      const signer = await p.getSigner();
      const activeContract = new Contract(CONTRACT_ADDRESS, abiFile.abi, signer);
      const adminAddress = await activeContract.admin();
      if (epoch !== sessionEpoch.current || loggedOut.current) return;
      setContract(activeContract);
      setAdmin(adminAddress);
      await loadData(activeContract);
      if (epoch !== sessionEpoch.current || loggedOut.current) return;
      if (!silent || accountChanged || !mode || roleAccount.toLowerCase() !== accounts[0].toLowerCase()) go("/roles");
      if (!silent) setNotice("เชื่อมต่อ MetaMask บน Sepolia แล้ว เลือก Role เพื่อเริ่มใช้งาน");
    } catch (connectError) {
      setError(errText(connectError));
    }
  }, [account, loadData, mode, roleAccount]);

  useEffect(() => {
    if (!window.ethereum) return undefined;
    const onAccountsChanged = (accounts) => {
      if (loggedOut.current) return;
      setMode("");
      setRoleAccount("");
      if (!accounts.length) {
        setAccount("");
        setContract(null);
        setJobs([]);
        setEvents([]);
        go("/");
      } else {
        connect(true);
      }
    };
    const onChainChanged = () => {
      if (loggedOut.current) return;
      setMode("");
      setRoleAccount("");
      connect(true);
    };
    window.ethereum.on?.("accountsChanged", onAccountsChanged);
    window.ethereum.on?.("chainChanged", onChainChanged);
    if (!loggedOut.current) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
        if (accounts?.length && !loggedOut.current) connect(true);
      }).catch(() => {});
    }
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener?.("chainChanged", onChainChanged);
    };
  }, [connect]);

  useEffect(() => {
    if (!account || !correctNetwork) {
      if (route !== "/") go("/");
      return;
    }
    if (!connected) return;
    if (!activeMode && route !== "/roles") go("/roles");
    else if (activeMode && ["dashboard", "create", "disputes", "history"].includes(routeRole)) go(routeRole === "dashboard" ? `/${activeMode}` : `/${activeMode}/${routeRole}`);
    else if (activeMode && route !== "/roles" && routeRole && routeRole !== activeMode) go(`/${activeMode}`);
    else if (activeMode && routeRole === activeMode && !["dashboard", "create", "job", "disputes", "history"].includes(section)) go(`/${activeMode}`);
    else if (activeMode && routeRole === activeMode && section === "create" && activeMode !== "employer") go(`/${activeMode}`);
    else if (activeMode && route === "/") go(`/${activeMode}`);
  }, [account, activeMode, connected, correctNetwork, route, routeRole, section]);

  const logout = () => {
    sessionEpoch.current += 1;
    loggedOut.current = true;
    sessionStorage.setItem("wf-logged-out", "1");
    setAccount("");
    setContract(null);
    setChainId(null);
    setAdmin("");
    setMode("");
    setRoleAccount("");
    setJobs([]);
    setEvents([]);
    setError("");
    setNotice("");
    setLastTx("");
    go("/");
  };

  const switchChain = async () => {
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
      await connect(true);
    } catch (switchError) {
      setError(errText(switchError));
    }
  };

  const tx = async (label, send) => {
    if (!contract || !correctNetwork) {
      setError("เชื่อม MetaMask บน Sepolia ก่อนทำรายการ");
      return false;
    }
    setBusy(true);
    setError("");
    setNotice("");
    setLastTx("");
    try {
      const pending = await send(contract);
      setLastTx(pending.hash);
      setNotice(`${label}: ส่งแล้ว กำลังรอการยืนยันบน Blockchain`);
      const receipt = await pending.wait();
      if (receipt.status !== 1) throw Error("ธุรกรรมถูกย้อนกลับ");
      setNotice(`${label}: สำเร็จ`);
      await loadData(contract);
      return true;
    } catch (txError) {
      setError(errText(txError));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const chooseMode = (selected) => {
    if (!connected || !correctNetwork) {
      setError("เชื่อมต่อ Wallet บน Sepolia ก่อนเลือก Role");
      return;
    }
    if (isAdmin && selected !== "admin") {
      setError("Wallet Admin ใช้ได้เฉพาะหน้าผู้ดูแลระบบ ตามเงื่อนไขของ Contract");
      return;
    }
    if (!isAdmin && selected === "admin") {
      setError("Wallet นี้ไม่ได้เป็น Admin ของ Contract");
      return;
    }
    setError("");
    setMode(selected);
    setRoleAccount(account);
    setFilter("all");
    go(`/${selected}`);
  };

  const goSection = (nextSection) => go(nextSection === "dashboard" ? `/${activeMode}` : `/${activeMode}/${nextSection}`);
  const visibleJobs = useMemo(() => {
    if (!connected || !activeMode) return [];
    const filtered = activeMode === "admin" ? jobs.filter((item) => item.status === 3) : jobs.filter((item) => (activeMode === "employer" ? item.employer : item.freelancer).toLowerCase() === account.toLowerCase());
    return filter === "all" ? filtered : filtered.filter((item) => item.status === Number(filter));
  }, [connected, jobs, activeMode, account, filter]);

  const createJob = async (form) => {
    if (isAdmin) { setError("Admin ไม่สามารถเป็นผู้ว่าจ้างหรือฟรีแลนซ์ได้ตามเงื่อนไข Contract"); return; }
    if (!isAddress(form.freelancer)) { setError("Address ฟรีแลนซ์ไม่ถูกต้อง"); return; }
    if (!form.title.trim() || !form.description.trim() || !form.deadline) { setError("กรอกข้อมูลให้ครบ"); return; }
    if (form.freelancer.toLowerCase() === account.toLowerCase()) { setError("Address ฟรีแลนซ์ต้องไม่ใช่ผู้ว่าจ้าง"); return; }
    if (form.freelancer.toLowerCase() === admin.toLowerCase()) { setError("Address ฟรีแลนซ์ต้องไม่ใช่ Wallet Admin"); return; }
    try {
      const value = parseEther(form.amount);
      const deadline = Math.floor(new Date(form.deadline).getTime() / 1000);
      const success = await tx("สร้างงาน", (activeContract) => activeContract.createJob(form.title.trim(), form.description.trim(), value, deadline, form.freelancer));
      if (success) goSection("dashboard");
    } catch (formError) {
      setError(errText(formError));
    }
  };

  const doDeposit = (item) => tx("ฝากค่าจ้าง", (activeContract) => activeContract.depositPayment(item.id, { value: item.amount }));
  const doSubmit = (item, reference) => tx("ส่งผลงาน", (activeContract) => activeContract.submitWork(item.id, reference));
  const doRelease = (item) => tx("อนุมัติและจ่าย", (activeContract) => activeContract.approveAndRelease(item.id));
  const doRaise = (item, reason, evidence) => tx("เปิดข้อพิพาท", (activeContract) => activeContract.raiseDispute(item.id, reason, evidence));
  const doEvidence = (item, evidence) => tx("เพิ่มหลักฐาน", (activeContract) => activeContract.addDisputeEvidence(item.id, evidence));
  const doResolve = (item, decision, reason) => tx("ตัดสินข้อพิพาท", (activeContract) => activeContract.resolveDispute(item.id, decision, reason));

  const title = route === "/" ? "เชื่อมต่อเพื่อเริ่มใช้งาน" : route === "/roles" ? "เลือก Role" : section === "create" ? "สร้างงานใหม่" : section === "disputes" ? "ข้อพิพาท" : section === "history" ? "ประวัติธุรกรรม" : id ? "รายละเอียดงาน" : "แดชบอร์ด";
  const roleName = activeMode === "admin" ? "ผู้ดูแลระบบ" : activeMode === "freelancer" ? "ฟรีแลนซ์" : activeMode === "employer" ? "ผู้ว่าจ้าง" : "เลือก Role";

  if (!connected || !correctNetwork) {
    return <div className="entry-shell">
      {error && <div className="notice bad entry-notice"><span>!</span><div>{error}</div><button onClick={() => setError("")}>×</button></div>}
      <Welcome connected={connected} wrongNetwork={Boolean(account && !correctNetwork)} onConnect={() => connect(false)} onSwitch={switchChain}/>
      <footer><span>WorkFlow · Smart Contract บน Sepolia</span><a href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Contract {short(CONTRACT_ADDRESS)} ↗</a></footer>
    </div>;
  }

  return <div className="shell">
    <aside className="sidebar">
      <a className="brand" href={`#/${activeMode}`}><span className="brand-icon">W</span><span><b>WorkFlow</b><small>FREELANCE ESCROW</small></span></a>
      <div className="network-label"><i className="live"/> Sepolia Testnet</div>
      <p className="nav-caption">{roleName}</p>
      {activeMode && <nav>
        <NavItem icon="▦" label="แดชบอร์ด" active={section === "dashboard" && !id} onClick={() => goSection("dashboard")}/>
        {activeMode === "employer" && <NavItem icon="＋" label="สร้างงาน" active={section === "create"} onClick={() => goSection("create")}/>}
        <NavItem icon="⚖" label="ข้อพิพาท" active={section === "disputes"} onClick={() => goSection("disputes")}/>
        <NavItem icon="↗" label="ประวัติธุรกรรม" active={section === "history"} onClick={() => goSection("history")}/>
      </nav>}
      <div className="sidebar-foot"><div className="account-mini"><span className="avatar">{account.slice(2, 4).toUpperCase()}</span><span><b>{roleName}</b><small>{short(account)}</small></span></div><button className="button ghost full" onClick={() => go("/roles")}>เปลี่ยน Role</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="overline">FREELANCE ESCROW PLATFORM</span><h1>{title}</h1></div><div className="top-buttons"><button className="wallet-chip" onClick={() => connect(false)}><i/> {short(account)}　⌄</button><button className="button ghost" onClick={() => loadData(contract)}>{loading ? "กำลังโหลด…" : "↻ รีเฟรช"}</button><button className="button ghost logout-button" title="ออกจาก session บนเว็บนี้" aria-label="ออกจากระบบ" onClick={logout}>ออกจากระบบ</button></div></header>
      {(error || notice) && <div className={`notice ${error ? "bad" : "good"}`}><span>{error ? "!" : "✓"}</span><div>{error || notice}{lastTx && <div><a href={`${EXPLORER}/tx/${lastTx}`} target="_blank" rel="noreferrer">ดูธุรกรรม {short(lastTx)} ↗</a></div>}</div><button onClick={() => { setError(""); setNotice(""); }}>×</button></div>}
      {route === "/roles" && <RolePicker account={account} mode={activeMode} isAdmin={isAdmin} onSelect={chooseMode}/>}
      {hasWorkspace && section === "dashboard" && routeRole === activeMode && <Dashboard mode={activeMode} jobs={visibleJobs} loading={loading} filter={filter} setFilter={setFilter} onJob={(number) => goSection(`job/${number}`)} onCreate={() => goSection("create")}/>}
      {hasWorkspace && section === "create" && routeRole === activeMode && activeMode === "employer" && <CreateJobForm enabled={connected && correctNetwork && activeMode === "employer" && !isAdmin} busy={busy} account={account} onSubmit={createJob}/>}
      {hasWorkspace && id && section === "job" && routeRole === activeMode && <JobDetail job={job} loading={loading} mode={activeMode} account={account} isAdmin={isAdmin} enabled={connected && correctNetwork} busy={busy} events={events.filter((event) => event.jobId === id)} onBack={() => goSection("dashboard")} onDeposit={doDeposit} onSubmit={doSubmit} onRelease={doRelease} onRaise={doRaise} onEvidence={doEvidence} onResolve={doResolve}/>}
      {hasWorkspace && section === "disputes" && routeRole === activeMode && <DisputeList jobs={jobs.filter((item) => item.status === 3 && (activeMode === "admin" ? isAdmin : [item.employer, item.freelancer].some((address) => address.toLowerCase() === account.toLowerCase())))} mode={activeMode} isAdmin={isAdmin} onJob={(number) => goSection(`job/${number}`)}/>}
      {hasWorkspace && section === "history" && routeRole === activeMode && <ActivityList events={events}/>}
      {hasWorkspace && routeRole === activeMode && !["dashboard", "create", "job", "disputes", "history"].includes(section) && <Dashboard mode={activeMode} jobs={visibleJobs} loading={loading} filter={filter} setFilter={setFilter} onJob={(number) => goSection(`job/${number}`)} onCreate={() => goSection("create")}/>}
      <footer><span>WorkFlow · Smart Contract บน Sepolia</span><a href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Contract {short(CONTRACT_ADDRESS)} ↗</a></footer>
    </main>
  </div>;
}
