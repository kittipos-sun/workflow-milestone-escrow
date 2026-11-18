# ทดลอง Freelance Escrow แบบ Milestones ใน Remix

## 1. วาง contract และ compile

1. เปิด [Remix IDE](https://remix.ethereum.org/)
2. สร้างไฟล์ `FreelanceEscrow.sol` แล้วคัดลอกเนื้อหาจาก [`contracts/FreelanceEscrow.sol`](contracts/FreelanceEscrow.sol) ทั้งไฟล์
3. ที่ Solidity Compiler เลือก compiler `0.8.34`, เปิด Optimization `200 runs`, เลือก EVM Version `shanghai` และ Compile
4. หาก Remix แจ้ง error ให้ตรวจเวอร์ชัน compiler และคัดลอกไฟล์ให้ครบ

## 2. Deploy ใน Remix VM

1. เปิด Deploy & Run Transactions แล้วเลือก `Remix VM (Shanghai)` หรือ VM ที่รองรับ Shanghai
2. เลือกบัญชีแรกเป็น **Admin** แล้ว Deploy `FreelanceEscrow` โดยไม่ใส่ constructor argument และตั้ง Value เป็น `0`
3. ใช้บัญชีที่สองเป็น **Employer** และบัญชีที่สามเป็น **Freelancer**; Admin ห้ามเป็นคู่สัญญา
4. คัดลอก address ของบัญชี Freelancer

## 3. สร้างงานตัวอย่างสอง milestones

คำนวณ deadline ในอนาคตจาก browser console ของ Remix:

```js
Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
```

เรียก `createJob` ในบัญชี Employer โดยกรอก:

- `title`: `Bike shop website`
- `description`: `Build a responsive website in two delivery stages`
- `freelancer`: address ที่คัดลอกไว้
- `inputs` (ปรับ deadline ให้เป็น timestamp ที่คำนวณข้างต้น):

```json
[["Wireframe","Homepage and shop page prototype",10000000000000000,1796000000],["Frontend","Responsive website preview",20000000000000000,1796600000]]
```

ตัวอย่างจำนวนเงินคือ 0.01 ETH และ 0.02 ETH; timestamps เป็นตัวอย่างเท่านั้น ต้องใส่เวลาที่อยู่ในอนาคตตอนทดลองจริง งานจะได้ `jobId = 1` หากเป็นงานแรก และ milestone ID เริ่มจาก `1`

## 4. ทดลอง flow ปกติ

1. Employer เรียก `getJob(1)` และ `getMilestone(1, 1)` เพื่อตรวจข้อมูล
2. Employer เลือก Value = `0.01 ether` แล้วเรียก `depositMilestonePayment(1, 1)`
3. ตั้ง Value กลับเป็น `0`; เปลี่ยนบัญชีเป็น Freelancer แล้วเรียก `submitMilestoneWork(1, 1, "https://example.com/wireframe")`
4. เปลี่ยนกลับเป็น Employer แล้วเรียก `approveMilestoneAndRelease(1, 1)`
5. ตรวจว่า milestone 1 เป็น `Completed` และ escrow balance เป็น `0`; milestone 2 ยังเป็น `Created`
6. ทำซ้ำกับ milestone 2 โดยฝาก `0.02 ether`, ส่งงาน และอนุมัติ
7. `getJobStatus(1)` คืน `3` เมื่อ milestones จบทั้งหมดโดยไม่มีการคืนเงิน

## 5. ทดลองข้อพิพาท

สร้าง job ใหม่เพื่อทดสอบ หรือสร้าง dispute ก่อน settle milestone ที่ฝากเงินแล้ว:

1. Employer ฝากเงิน milestone
2. Employer หรือ Freelancer เรียก `raiseMilestoneDispute(jobId, milestoneId, "งานไม่ตรงข้อตกลง", "https://example.com/evidence")`
3. อีกฝ่ายเพิ่มหลักฐานด้วย `addMilestoneDisputeEvidence(jobId, milestoneId, "https://example.com/response")`
4. เปลี่ยนกลับบัญชี Admin แล้วเรียก `resolveMilestoneDispute(jobId, milestoneId, decision, "เหตุผลการตัดสิน")`
   - `decision = 0`: จ่ายเงินงวดนั้นให้ Freelancer
   - `decision = 1`: คืนเงินงวดนั้นให้ Employer
5. ตรวจ event และ `getMilestone`; `getJobStatus` คืน `2` ขณะยังมี dispute เปิดอยู่

สถานะ milestone: `0 Created`, `1 Funded`, `2 Submitted`, `3 Disputed`, `4 Completed`, `5 Refunded`

สถานะรวม job: `1 InProgress`, `2 Disputed`, `3 Completed`, `4 PartiallySettled/Refunded`

## Contract บน Sepolia ที่ตั้งค่าไว้ในเว็บ

มีการ deploy contract บน Sepolia แล้วที่ `0xC9bCae77e4bfb0Beb7bBabc403130cfe997c1Afa` ใน block `12158595` โดยบัญชี Admin คือ `0x391095587C2F1de1817c6B02227901DF7041ab35` เว็บตั้งค่า address และ block นี้ไว้แล้ว หากเพียงทดลอง Remix VM อย่านำ address จาก VM มาใช้แทน address Sepolia

ถ้าจะ deploy contract ใหม่อีกครั้ง จะได้ address ใหม่และ Admin จะเปลี่ยนตามบัญชีที่ deploy ต้องปรับ `web/src/config.js` และตรวจ ABI ให้ตรงก่อนใช้เว็บ การ deploy contract กับ GitHub Pages เป็นคนละขั้น ห้ามใส่ seed phrase หรือ private key ใน repo หรือหน้าเว็บ
