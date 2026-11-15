# Freelance Escrow — ขั้นที่ 2: Smart Contract

ชุดไฟล์นี้เป็น Contract และการทดสอบสำหรับโครงงานบน Ethereum Sepolia ยังไม่มีหน้าเว็บ และยังไม่ได้ deploy บน Sepolia

## ไฟล์
- contracts/FreelanceEscrow.sol — อัปโหลดเข้า Remix ได้โดยตรง ไม่ต้อง import library
- test/escrow.test.mjs — ทดสอบอัตโนมัติบน EVM จำลอง
- artifacts/FreelanceEscrow.json — ABI และ bytecode จากการคอมไพล์
- TEST-RESULTS.txt — ผลการทดสอบจริง
- package-lock.json — เวอร์ชัน dependencies สำหรับรันทดสอบซ้ำ

## กติกาที่ใช้
- หนึ่งงาน จ่ายเต็มจำนวนครั้งเดียว ไม่มีค่าธรรมเนียมแพลตฟอร์ม
- Admin คือบัญชี deploy และไม่สามารถเป็นคู่สัญญา เพื่อไม่ให้ต้องตัดสินงานตนเอง
- ผู้ว่าจ้างคือผู้สร้างงาน ฟรีแลนซ์คือ Address ที่ระบุ และต้องไม่ใช่ผู้ว่าจ้าง
- ข้อมูลข้อตกลงแก้ไม่ได้ งานที่สร้างผิดและยังไม่ฝากเงินคงอยู่เป็น Created
- ฝากครั้งเดียว จำนวนตรงค่าจ้าง และแยกยอดตาม jobId
- ส่งงานหนึ่งครั้งด้วย URL หรือ Hash; อนุญาตส่งล่าช้า
- เลยกำหนดไม่ทำให้จ่ายหรือคืนเงินอัตโนมัติ ฝากหลัง deadline ได้ แต่เว็บควรแสดงว่างานเลยกำหนดแล้ว
- คู่สัญญาเปิดข้อพิพาทจาก Funded หรือ Submitted ได้ โดยไม่ต้องรอครบเวลา
- ระหว่างข้อพิพาททั้งสองฝ่ายเพิ่มหลักฐานผ่าน addDisputeEvidence ได้ (เก็บใน Events)
- Admin ตัดสินจ่ายเต็มจำนวนหรือคืนเต็มจำนวน พร้อมเหตุผล ไม่มีสิทธิ์ถอนเงินรวม
- โอน ETH ไม่สำเร็จ ธุรกรรมจะ revert รวมทั้งสถานะและยอดเงิน
- การส่ง ETH เข้าตรง ๆ ถูกปฏิเสธ ให้ใช้ depositPayment เท่านั้น เงินที่ถูกบังคับส่งด้วยกลไก EVM ไม่ถือเป็นยอด escrow และไม่มีฟังก์ชันกู้คืน

## สถานะและ Decision ที่ Remix แสดงเป็นตัวเลข
| ค่า | Status |
|---|---|
| 0 | Created |
| 1 | Funded |
| 2 | Submitted |
| 3 | Disputed |
| 4 | Completed |
| 5 | Refunded |

Decision 0 = PayFreelancer, Decision 1 = RefundEmployer

## ทดสอบอัตโนมัติบนเครื่อง
ใช้ Node.js และ npm ภายในโฟลเดอร์นี้:

```sh
npm ci
npm test
```

สคริปต์ compile ด้วย Solidity 0.8.34, optimizer 200 runs, EVM Shanghai แล้วทดสอบด้วย Ganache โดยไม่ใช้ MetaMask หรือเงินจริง บน Node บางรุ่น Ganache อาจแจ้งว่าใช้ JavaScript fallback แทน native µWS ซึ่งไม่ใช่ความล้มเหลวของการทดสอบ

## ทดลองใน Remix VM ก่อน
1. เปิด https://remix.ethereum.org แล้วสร้างหรืออัปโหลดไฟล์ contracts/FreelanceEscrow.sol
2. ใน Solidity Compiler เลือก 0.8.34 เปิด Optimization = 200 runs และ EVM Version = shanghai (ไม่ต้องเปิด viaIR)
3. Compile FreelanceEscrow.sol
4. Deploy & Run: เลือก Remix VM ที่รองรับ Shanghai หรือใหม่กว่า เลือกบัญชีแรกเป็น Admin และ Value = 0 แล้ว Deploy ไม่มี constructor arguments
5. สำเนา Address บัญชีที่สามเป็นฟรีแลนซ์ แล้วเลือกบัญชีที่สองเป็นผู้ว่าจ้าง
6. เรียก createJob ด้วย title, description, amount, deadline และ freelancer ตามลำดับ
   - amount = 10000000000000000 (wei เท่ากับ 0.01 ETH)
   - deadline = Unix timestamp หน่วยวินาทีในอนาคต
   - คำนวณ timestamp ได้จาก browser console: Math.floor(Date.now()/1000) + 7*24*60*60
   - freelancer = Address เต็มของบัญชีที่สาม
   - ช่อง Value ของ Remix = 0 เพราะฟังก์ชันสร้างงานไม่รับเงิน
7. งานแรกมี jobId = 1 ตรวจด้วย getJob(1)
8. ยังใช้บัญชีผู้ว่าจ้าง ตั้ง Value = 0.01 หน่วย ether แล้วเรียก depositPayment(1)
9. ตั้ง Value กลับเป็น 0 สำหรับฟังก์ชันอื่นทั้งหมด
10. เปลี่ยนเป็นบัญชีฟรีแลนซ์ เรียก submitWork(1, "https://example.com/delivery")
11. เปลี่ยนเป็นผู้ว่าจ้าง เรียก approveAndRelease(1)
12. ตรวจ getJob(1): status = 4 และ escrowBalance = 0 ตรวจ log PaymentReleased และยอดผู้รับ
13. ลองอนุมัติซ้ำ ต้องถูกปฏิเสธ

### ทดลองข้อพิพาท
สร้างและฝากเงินงานใหม่ ไม่ใช้ jobId ที่เสร็จแล้ว
- ผู้ว่าจ้างหรือฟรีแลนซ์เรียก raiseDispute(jobId, "เหตุผล", "URL หลักฐานหรือค่าว่าง")
- อีกฝ่ายเรียก addDisputeEvidence(jobId, "URL หลักฐานเพิ่มเติม") ได้
- เปลี่ยนเป็น Admin แล้วเรียก resolveDispute(jobId, 1, "เหตุผลคืนเงิน") เพื่อคืนเงิน
- ทดลองงานใหม่อีกงาน โดยใช้ decision = 0 เพื่อจ่ายฟรีแลนซ์
- บัญชีอื่นต้องเรียก resolveDispute ไม่ได้ และ Admin ต้องตัดสินงานที่ยังไม่ Disputed ไม่ได้

## Deploy บน Sepolia หลังผ่าน Remix VM
1. เตรียม MetaMask 3 Account และ Sepolia ETH สำหรับค่า gas; ผู้ว่าจ้างมีค่าจ้างเพิ่มด้วย
2. เลือกบัญชี Admin และเครือข่าย Sepolia (chainId 11155111)
3. ใน Remix ใช้ค่าคอมไพล์ข้างต้น และ Environment = Browser Extension (บางรุ่นใช้ Injected Provider - MetaMask)
4. ตรวจ Account กับเครือข่าย, Value = 0 แล้ว Deploy และยืนยันใน MetaMask ด้วยตัวเอง
5. บันทึก Contract Address, deployment transaction hash, deployment block และ ABI
6. ส่งเฉพาะข้อมูลสาธารณะเหล่านี้กลับมาเพื่อเชื่อมหน้าเว็บ ไม่ส่ง Seed Phrase หรือ Private Key
7. ทดสอบ happy path, คืนเงิน และตัดสินจ่ายบน Sepolia พร้อมเก็บ transaction hashes เป็นหลักฐาน

Remix VM กับ Sepolia เป็นคนละเครือข่าย บัญชีและ ETH จำลองใน VM ไม่ย้ายไป MetaMask

## แนวทางเชื่อมหน้าเว็บขั้นถัดไป
- ใช้ chainId + contractAddress + ABI + deploymentBlock เป็น configuration
- อ่าน getJob และ jobCount; ใช้ JobCreated events กรอง employer/freelancer และแบ่งโหลด logs เป็นช่วง block
- อ่าน transactionHash จาก receipt/event logs ไม่ต้องเขียน hash ซ้ำใน contract
- รอ receipt สำเร็จก่อนแสดงสำเร็จ รองรับ rejected/reverted transactions และ accountsChanged/chainChanged
- ปุ่มเลือก Role เปลี่ยน UI เท่านั้น Contract ตรวจสิทธิ์จริงทุกฟังก์ชัน
- หน่วยเงินใช้ bigint + parseEther/formatEther ไม่ใช้ floating point คำนวณค่าจ้าง
- ข้อมูลบน chain เปิดเผยสาธารณะ แสดงข้อความแบบ escaped และเปิดลิงก์เฉพาะ scheme ที่อนุญาต เช่น https ไม่ใช้ innerHTML กับข้อมูลผู้ใช้
- ความยาวข้อความใน Contract จำกัดเป็น UTF-8 bytes ไม่ใช่จำนวนตัวอักษร: title 200, description 4000, references/reasons/evidence 2000

## ขอบเขตของรุ่นนี้
เหมาะกับการสาธิตโดยใช้ MetaMask accounts บน Sepolia การทดสอบ local ไม่ใช่การตรวจรับบน Sepolia หรือ security audit สำหรับเงินบน mainnet
Admin เป็น immutable และไม่มีระบบเปลี่ยน Admin; ถ้า Admin ไม่ทำงาน ข้อพิพาทจะยังค้าง ผู้รับที่เป็น contract และปฏิเสธ ETH จะทำให้การจ่าย revert จนกว่าจะรับเงินได้หรือคู่สัญญาดำเนินกระบวนการข้อพิพาทที่เหมาะสม ไม่มี timeout payout, partial settlement, cancellation หรือ revision workflow

## เอกสารอ้างอิง
- Remix Deploy & Run: https://remix-ide.readthedocs.io/en/latest/run.html
- Solidity Checks-Effects-Interactions: https://docs.soliditylang.org/en/latest/security-considerations.html

## หน้าเว็บ DApp
หน้าเว็บอยู่ใน `web/` ใช้ React, Vite และ ethers.js 6 เชื่อม MetaMask โดยตรง ไม่มี Backend และไม่ต้องใส่ Private Key ลงในเว็บ

```sh
cd web
npm ci
npm run dev
```

ตั้งค่า Contract ที่ deploy ไว้ใน `web/src/config.js`:
- Contract Address: `0x191be8940C43C6061B2Aca7936B451646c6A666c`
- Deployment Block: `12140251`
- Chain ID: `11155111` (Sepolia)

เว็บมีหน้าเริ่มต้น เชื่อม Wallet เลือกบทบาท Dashboard สร้างงาน รายละเอียดงาน/ส่งงาน/เปิดข้อพิพาท ศูนย์ข้อพิพาท และประวัติจาก Event Logs เลือกโหมดผู้ดูแลได้ แต่ Contract ยังตรวจ `admin` และสิทธิ์คู่สัญญาทุกธุรกรรมเหมือนเดิม การฝากเงินจะส่งค่าจ้างตรงตามยอดในงาน

## เผยแพร่ GitHub Pages
มี workflow ที่ `.github/workflows/pages.yml` ซึ่ง build `web/` และเผยแพร่ไป GitHub Pages เมื่อ push ไป branch `main`:

1. สร้าง Repository บน GitHub แล้ว push เนื้อหาทั้งโฟลเดอร์โครงงานนี้ไป branch `main`
2. ใน Repository ไปที่ **Settings → Pages** แล้วตั้ง **Build and deployment → Source: GitHub Actions**
3. รอ workflow `Publish DApp to GitHub Pages` ทำงานสำเร็จ แล้วเปิด URL ที่ GitHub แสดง
4. เปิดเว็บด้วยเบราว์เซอร์ที่ติดตั้ง MetaMask และเลือก Sepolia

Vite ตั้ง `base: "./"` และใช้ hash navigation เพื่อให้หน้าเว็บทำงานใน Project Pages โดยไม่ต้องตั้งค่าโดเมนหรือส่ง Secret ให้ GitHub Actions
