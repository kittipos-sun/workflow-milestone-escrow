# WorkFlow — Freelance Escrow with Milestones

เว็บ React/Vite นี้ต่อยอดจากงาน Freelance Escrow เดิม โดยแบ่งค่าจ้างเป็น Milestones ที่ฝากและจ่ายแยกกัน ยังคงดีไซน์เดิมและมี 3 role: ผู้ว่าจ้าง, ฟรีแลนซ์ และ Admin ผู้ deploy contract

## Smart contract ที่เว็บเชื่อมอยู่

- Source: `contracts/FreelanceEscrow.sol` (Solidity `0.8.34`)
- เครือข่าย: Sepolia (`chainId 11155111`)
- Contract: [`0xC9bCae77e4bfb0Beb7bBabc403130cfe997c1Afa`](https://sepolia.etherscan.io/address/0xc9bcae77e4bfb0beb7bbabc403130cfe997c1afa)
- Deployment block: `12158595`
- ABI ที่เว็บใช้: `web/src/FreelanceEscrow.abi.js`
- วิธีทดลอง contract ใน Remix: `REMIX-QUICKSTART.md`

เว็บอ่านข้อมูล Job และ Milestones จาก contract, ให้ผู้ว่าจ้างฝากเงินรายงวด, ฟรีแลนซ์ส่งหลักฐาน, ผู้ว่าจ้างอนุมัติจ่าย และเปิดข้อพิพาทให้ Admin ตัดสินเฉพาะเงินงวดที่มีปัญหา Contract state เปลี่ยนได้เมื่อมีคนส่งธุรกรรม; ตรวจ Dashboard/Explorer ก่อนสร้างงานใหม่ เพราะเลข `jobId` อาจไม่เริ่มที่ 1 ข้อมูลและหลักฐานบนเชนเป็นสาธารณะ อย่าใส่ข้อมูลลับ

## ตรวจ contract ในเครื่อง

```sh
npm ci
npm test
```

ชุดทดสอบ compile Solidity ด้วย optimizer 200 runs และ Shanghai แล้ว deploy ลง Ganache จำลองเพื่อทดสอบการสร้างงาน, สิทธิ์, การฝาก/จ่ายแยกงวด และข้อพิพาท การทดสอบนี้ไม่ส่งธุรกรรมไป Sepolia

## รันเว็บในเครื่อง

```sh
cd web
npm ci
npm run dev
```

เปิดเว็บด้วย browser ที่มี MetaMask เลือก Sepolia และเชื่อม wallet ที่เป็นคู่สัญญาหรือ Admin ของ contract ที่ตั้งค่าไว้

## Deploy ไป GitHub Pages ใน repo ส่วนตัว

มี workflow ที่ `.github/workflows/pages.yml` ซึ่ง build `web/` และ deploy เมื่อ push ไป branch `main`:

1. นำ repo นี้ไป fork หรือ push เป็น repository ในบัญชี GitHub ของคุณ
2. ใน repository ไปที่ **Settings → Pages** แล้วตั้ง **Build and deployment → Source: GitHub Actions**
3. push การเปลี่ยนแปลงไป branch `main` หรือกดรัน workflow `Publish DApp to GitHub Pages` จากแท็บ Actions
4. เมื่อ workflow สำเร็จ เปิด URL ที่ GitHub Pages แสดง

Vite ใช้ relative asset paths และเว็บใช้ hash navigation จึงรองรับ Project Pages path ของ repository โดยไม่ต้องเพิ่ม secret ให้ GitHub Actions

## สิ่งที่ยังต้องระวัง

- Contract address และ deployment block ใน `web/src/config.js` ต้องตรงกับ deployment ที่ใช้งาน
- GitHub Pages เผยแพร่เว็บแบบ static; การ deploy เว็บไม่ได้ deploy contract ให้ด้วย
- อย่าใส่ seed phrase, private key หรือข้อมูลส่วนบุคคลใน repo, frontend, contract fields หรือ event evidence
- Sepolia ใช้ ETH ทดสอบเท่านั้น; การทดสอบใน Remix VM ไม่ได้ใช้ address หรือยอดเงินร่วมกับ Sepolia
