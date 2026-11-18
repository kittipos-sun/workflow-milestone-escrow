# แผนต่อยอด Freelance Escrow: Milestone Workflow

## เป้าหมาย

ต่อยอดจากระบบ escrow งานฟรีแลนซ์เดิม ให้จ่ายค่าจ้างเป็นงวด (milestones) และมีหน้าติดตามความคืบหน้าที่ชัดเจน โดยยังใช้ Ethereum Sepolia, Remix IDE, MetaMask และ GitHub Pages ตามแนวทางโครงงานเดิม

## ความแตกต่างจากงานเดิม

| ประเด็น | ระบบเดิม | รุ่นที่จะพัฒนา |
|---|---|---|
| การจ่าย | ฝากและจ่ายครั้งเดียวเต็มจำนวน | แบ่งค่าจ้างเป็น milestones และจ่ายแยกแต่ละงวด |
| การส่งงาน | ส่งงานหนึ่งครั้งต่อ job | ส่งหลักฐานและอนุมัติเป็นราย milestone |
| การติดตาม | ดูสถานะรวมของ job | มี timeline แสดง milestone สถานะ หลักฐาน และธุรกรรม |
| ข้อพิพาท | แอดมินตัดสินยอดเต็ม | เปิดข้อพิพาทผูกกับ milestone และแอดมินเลือกจ่ายหรือคืนเงินเฉพาะยอดงวดนั้น |

## บทบาทและสิทธิ์

- **ผู้ว่าจ้าง (Employer):** สร้าง job และ milestones พร้อมจำนวนเงิน/กำหนดส่ง ฝากเงินของ milestone อนุมัติส่งงาน หรือเปิดข้อพิพาท
- **ฟรีแลนซ์ (Freelancer):** รับมอบหมายงาน ส่งหลักฐานของ milestone และเปิดข้อพิพาท
- **แอดมิน (Admin):** ผู้ deploy contract; ตัดสินข้อพิพาทเฉพาะ milestone ที่อยู่สถานะ Disputed โดยจ่ายให้ฟรีแลนซ์หรือคืนให้ผู้ว่าจ้าง

Contract ยังคงตรวจสิทธิ์ตาม address จริง การเลือก role ในหน้าเว็บเป็นเพียงตัวช่วยจัด UI ไม่ใช่การควบคุมสิทธิ์

## Flow หลัก

1. ผู้ว่าจ้างสร้าง job และกำหนด milestones 2–5 งวด โดยผลรวมยอดทุกงวดคือมูลค่างาน
2. ผู้ว่าจ้างฝากเงินสำหรับ milestone ที่พร้อมเริ่ม (กำหนดในรุ่นแรกว่าจะฝากแยกงวดหรือฝากรวมล่วงหน้า; ข้อเสนอคือฝากแยกงวดเพื่อลดเงินที่ล็อกไว้)
3. ฟรีแลนซ์ส่ง URL/Hash เป็นหลักฐานของ milestone
4. ผู้ว่าจ้างอนุมัติ milestone; contract จ่ายยอดงวดนั้นและบันทึกสถานะเป็น Completed
5. หากมีปัญหา คู่สัญญาฝ่ายใดก็เปิดข้อพิพาทของ milestone พร้อมเหตุผลและหลักฐาน
6. แอดมินอ่านหลักฐานและตัดสินจ่ายฟรีแลนซ์หรือคืนเงินผู้ว่าจ้างเฉพาะยอด milestone
7. Job จบเมื่อทุก milestone ถูกชำระหรือคืนเงิน และหน้าเว็บแสดงสรุปยอดรวม

## ตัวอย่างงาน

**งาน:** สร้างหน้าเว็บแนะนำร้านจักรยาน — รวม 0.03 ETH — กำหนด 14 วัน

| Milestone | ผลส่งมอบ | จำนวน | เงื่อนไขปล่อยเงิน |
|---|---|---:|---|
| 1. Wireframe | ลิงก์ต้นแบบหน้าแรกและหน้าร้าน | 0.01 ETH | ผู้ว่าจ้างตรวจและอนุมัติ |
| 2. Frontend | ลิงก์เว็บ preview พร้อม responsive layout | 0.01 ETH | ผู้ว่าจ้างตรวจและอนุมัติ |
| 3. ส่งมอบ | source code และคู่มือใช้งาน | 0.01 ETH | ผู้ว่าจ้างตรวจและอนุมัติ |

## ขอบเขตรุ่นแรก

### รวมในรุ่นแรก

- สร้าง job ที่มี 2–5 milestones พร้อม title, description, จำนวนเงิน และ deadline ต่อ milestone
- ฝากเงินเป็นราย milestone (เสนอให้ใช้รูปแบบนี้)
- ส่งหลักฐาน, อนุมัติจ่าย, เปิดข้อพิพาท, เพิ่มหลักฐาน, และแอดมินตัดสินเป็นราย milestone
- Dashboard แยกมุมมอง Employer, Freelancer และ Admin ตาม address ที่เชื่อมอยู่
- Timeline และลิงก์ transaction/explorer สำหรับทุกการเปลี่ยนสถานะ
- เชื่อม MetaMask บน Sepolia และ deploy เว็บผ่าน GitHub Actions ไป GitHub Pages

### ยังไม่รวม

- แก้ไข milestones หลังสร้างงาน, ยกเลิกงานอัตโนมัติ, จ่ายบางส่วนใน milestone, ค่าธรรมเนียมแพลตฟอร์ม
- mainnet หรือเงินจริง
- การเก็บไฟล์หลักฐานบนระบบของเรา (รุ่นแรกเก็บ URL/Hash บน chain; ห้ามใส่ข้อมูลลับ)

## สถานะที่เสนอ

สถานะของแต่ละ milestone: `Created → Funded → Submitted → Completed` หรือ `Funded/Submitted → Disputed → Completed/Refunded`.

สถานะรวมของ job คำนวณจาก milestones: `InProgress`, `Disputed`, `Completed` หรือ `PartiallySettled` (มีทั้ง milestone ที่จ่ายและคืนเงิน)

## แผนทำงาน

1. **ล็อกกติกาและโครงข้อมูล:** ตกลงจำนวน milestones สูงสุด, วิธีฝากเงิน (แยกงวด/ฝากรวม), การคิดสถานะรวม, และการจัดการ deadline
2. **ออกแบบ contract รุ่นใหม่:** data model, events, access control และวิธีตัดสินข้อพิพาทต่อ milestone
3. **ปรับ tests:** happy path หลายงวด, สิทธิ์แต่ละ role, ฝากผิดยอด, จ่ายซ้ำ, dispute/refund และยอดคงเหลือ
4. **ทดลอง Remix VM:** compile ด้วย Solidity 0.8.34, optimizer 200, Shanghai และทดสอบ flow ก่อน testnet
5. **Deploy Sepolia ผ่าน Remix + MetaMask:** บันทึก address, deployment block, tx hash และ ABI
6. **ปรับเว็บและ MetaMask:** เชื่อม contract รุ่นใหม่, milestone dashboard, event timeline, ตรวจ network/account และสถานะธุรกรรม
7. **Deploy GitHub Pages:** ตั้ง Pages source เป็น GitHub Actions และตรวจ URL, asset paths, wallet connection และ Sepolia flow

## ข้อมูลที่ต้องยืนยันก่อนแก้ contract

- จำกัดสูงสุดกี่ milestones ต่อ job? ค่าเริ่มต้นที่แนะนำ: **5**
- ฝากเงินแยกทีละ milestone หรือฝากยอดรวมทั้งหมดล่วงหน้า? ค่าเริ่มต้นที่แนะนำ: **แยกทีละ milestone**
- ถ้าเลยกำหนด ให้เปิดข้อพิพาทได้ทันที แต่ไม่จ่าย/คืนเงินอัตโนมัติหรือไม่? ค่าเริ่มต้นที่แนะนำ: **ไม่ทำอัตโนมัติ**

## หมายเหตุเรื่องการ deploy

- Remix VM ใช้ทดสอบ logic ก่อน; deployment บน Sepolia ต้องใช้ MetaMask ที่เชื่อม Sepolia และ test ETH
- การ deploy contract และการ deploy เว็บเป็นคนละขั้นตอน; contract address/ABI ใหม่ต้องนำไปตั้งค่าในเว็บก่อน build
- GitHub Pages เผยแพร่เว็บแบบ static; ห้ามใส่ private key, seed phrase หรือ secret ใน repository หรือ frontend
- ตรวจสอบ address ที่ตั้งไว้ใน `web/src/config.js` กับ chain และ source ปัจจุบันก่อนใช้งาน; อย่าถือว่าเป็น deployment ที่ยืนยันแล้ว

## แหล่งอ้างอิง

- Remix Deploy & Run: https://remix-ide.readthedocs.io/en/latest/run.html
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- MetaMask developer docs: https://docs.metamask.io/quickstart/
