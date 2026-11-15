import React from "react";
import { Stage, Window, Check, Connector, Icon, Roll, type Act } from "../stageshow/kit";
import "./StageDemo.css";

type DemoState = { step: number };
const START: DemoState = { step: 0 };

const script = async (a: Act<DemoState>) => {
  await a.wait(350);
  a.mark("funded");
  a.put({ step: 1 });
  await a.wait(1050);
  a.mark("submitted");
  a.put({ step: 2 });
  await a.wait(1150);
  a.mark("approved");
  a.put({ step: 3 });
  await a.wait(950);
  a.mark("paid");
  a.put({ step: 4 });
  await a.wait(2200);
};

const STATUS = ["รอฝากค่าจ้าง", "พักเงินใน Escrow", "ส่งผลงานแล้ว", "อนุมัติการจ่าย", "จ่ายให้ฟรีแลนซ์แล้ว"];

export default function StageDemo() {
  return <Stage<DemoState>
    width={660}
    height={370}
    compact={{ below: 600, width: 358, height: 505 }}
    initial={START}
    play="once"
    poster={{ step: 4 }}
    script={script}
    className="wf-demo"
  >
    {(state, rect, layout) => {
      const compact = layout === "compact";
      const row = rect("workflow-row");
      const receipt = rect("receipt");
      return <>
        <Window
          className="wf-window"
          title="WorkFlow · สัญญางาน"
          toolbar={<span className="wf-window-network"><i/>Sepolia</span>}
          body={{ className: "wf-window-body" }}
        >
          <div className="wf-demo-content">
            <div className="wf-demo-top">
              <div><small>แฟ้มงาน · ตัวอย่าง</small><strong>เว็บไซต์สำหรับร้านกาแฟ</strong></div>
              <span className="wf-demo-number">#024</span>
            </div>
            <div className="wf-demo-parties"><span><Icon name="user" size={14}/>ผู้ว่าจ้าง</span><span><Icon name="user" size={14}/>ฟรีแลนซ์</span></div>
            <div className="wf-demo-amount"><span>ค่าจ้างตามข้อตกลง</span><strong>0.012 <small>ETH</small></strong></div>
            <div className="wf-demo-row" data-target="workflow-row">
              <span className="wf-demo-lock"><Icon name="lock" size={15} filled/></span>
              <span className="wf-demo-rowcopy"><strong>ขั้นตอนการชำระเงิน</strong><small>สัญญา · งาน · การจ่าย</small></span>
              <span className={"wf-demo-state phase-" + state.step}><i/><Roll variant="fade">{STATUS[state.step]}</Roll></span>
            </div>
          </div>
        </Window>
        <section className="wf-receipt" data-target="receipt" data-in={state.step >= 3 || undefined} data-paid={state.step >= 4 || undefined}>
          <div className="wf-receipt-head"><span><Check on={state.step >= 4} pending={state.step >= 3 && state.step < 4} size={17}/></span><div><small>การชำระเงิน</small><strong><Roll variant="fade">{state.step >= 4 ? "จ่ายสำเร็จ" : "รอการยืนยัน"}</Roll></strong></div></div>
          <div className="wf-receipt-amount">0.012 <small>Sepolia ETH</small></div>
          <div className="wf-receipt-line"><span>ผู้รับเงิน</span><b>ฟรีแลนซ์</b></div>
          <div className="wf-receipt-line"><span>สถานะงาน</span><b>{state.step >= 4 ? "เสร็จสิ้น" : "อนุมัติแล้ว"}</b></div>
          <div className="wf-receipt-foot"><Icon name={state.step >= 4 ? "check" : "lock"} size={13} filled/><span>{state.step >= 4 ? "ยืนยันบน Sepolia" : "เงินพักใน Contract"}</span></div>
        </section>
        {row.width > 0 && receipt.width > 0 && <Connector
          show={state.step >= 3}
          from={{ x: compact ? row.x + row.width / 2 : row.x + row.width + 8, y: compact ? row.y + row.height : row.y + row.height / 2 }}
          to={{ x: compact ? receipt.x + receipt.width / 2 : receipt.x, y: compact ? receipt.y - 5 : receipt.y + receipt.height / 2 }}
          route={compact ? "v" : "straight"}
          arrow
          className="wf-connector"
        />}
      </>;
    }}
  </Stage>;
}
