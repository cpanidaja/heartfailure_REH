# ทำให้ Executive Dashboard ใน HF Clinic Web App อ่าน Google Sheets สด

อัปเดต: 16 ต.ค. 2569

## เป้าหมาย
เมื่อเปิดหน้า Dashboard หรือกด "โหลดกราฟล่าสุด" ฝั่งเว็บจะเรียกคำสั่ง
\`api('getExecutiveDashboardSummary')\` ผ่าน **ระบบล็อกอินเดิม** ของ HF Clinic Web App
ไปยัง Apps Script โครงการเดิม ระบบจะอ่านเฉพาะเซลล์สรุปในชีต
\`Executive_Dashboard\` และ \`_Executive_Metrics\` จากไฟล์ Google Sheets ของโรงพยาบาล
โดยไม่มีชื่อผู้ป่วย HN หรือเลขบัตรประชาชนในคำตอบ

**ห้าม** เปลี่ยนการแชร์ Google Sheets ให้เป็น "ทุกคนที่มีลิงก์" เพียงเพื่อให้กราฟทำงาน
และ **ห้าม** เปิดปลายทาง doGet() ที่ส่งข้อมูลโดยไม่มีการตรวจสอบสิทธิ์

## ขั้นตอนที่ต้องทำใน Apps Script (ทำครั้งเดียว)

1. เปิด Apps Script **โครงการเดิมที่เว็บใช้จริง** (ซึ่งให้บริการ \`dispatch\` และ \`login\`)
   อย่าสร้าง Apps Script แยกโครงการใหม่ อย่าคัดลอกทับ Code.gs เดิม
2. ในแถบ Files ด้านซ้าย กด + แล้วเลือก **Script** ตั้งชื่อ
   \`AppsScript_ExecutiveDashboard\`
3. เปิดไฟล์นี้ใน GitHub:
   https://github.com/cpanidaja/heartfailure_REH/blob/main/AppsScript_ExecutiveDashboard.gs
   คัดลอกเนื้อหาทั้งไฟล์ไปใส่ใน Script ที่เพิ่งสร้าง แล้ว Save
4. เปิด Code.gs (หรือไฟล์เดิม) ค้นหา \`function dispatch\` และตำแหน่งที่แยกคำสั่ง
   ตาม \`payload.method\` หรือ \`request.method\`.
   **สำคัญ: เพิ่มคำสั่งใหม่หลังการตรวจสอบ session/token และสิทธิ์ผู้ใช้แล้วเท่านั้น**

   ถ้าระบบใช้ switch(method):
   
   \`\`\`javascript
   case 'getExecutiveDashboardSummary':
     return hfReadExecutiveDashboardSummary_();
   \`\`\`

   ถ้าระบบใช้ if/else:
   
   \`\`\`javascript
   if (method === 'getExecutiveDashboardSummary') {
     return hfReadExecutiveDashboardSummary_();
   }
   \`\`\`

   ชื่อ \`method\` อาจเป็น \`payload.method\` หรือ \`request.method\`
   ตามโค้ดจริง **อย่าสร้าง dispatch() ซ้ำ** เพราะอาจทำให้ระบบล็อกอินและบันทึกข้อมูลเสีย
5. กด **Save** จากนั้นเลือก **Deploy → Manage deployments →
   Edit (รูปดินสอ) → Version: New version → Deploy**
   ใช้ Deployment ที่เว็บเดิมเชื่อมอยู่ (อย่าเลือก New deployment ถ้าไม่จำเป็น)
   หาก Apps Script ขอสิทธิ์เพิ่มเติม ให้ตรวจสอบว่าโครงการเป็นของโรงพยาบาล
   และอนุญาตเฉพาะสิทธิ์อ่านชีตที่จำเป็น
6. กลับมาเปิด https://cpanidaja.github.io/heartfailure_REH/ 
   ล็อกอิน แล้วเปิดหน้า "ภาพรวม" หรือ "บทสรุปสำหรับผู้บริหาร"
   กด "โหลดกราฟล่าสุด"
7. ตรวจสถานะ:
   - **เชื่อม Google Sheets ผ่าน Apps Script สำเร็จ** =
     ข้อมูลอ่านมาจากเซลล์ชีตต้นฉบับ ณ เวลากดจริง
   - **แสดงข้อมูลสรุปสำรอง** = backend ยังไม่รองรับคำสั่ง/ยังไม่ได้ Deploy;
     ตัวเลขที่แสดงเป็นข้อมูลอ้างอิง ไม่ใช่ค่าปัจจุบัน
   - **โหลดไม่สำเร็จ** = ตรวจ token / สิทธิ์อ่าน Spreadsheet /
     ชื่อแท็บ หรือ Deployment

## เซลล์ที่อ่าน
- \`Executive_Dashboard!A6:M6\` — ผู้ป่วยสะสม 192,
  visits ต.ค. 61, unique ต.ค. 47 (เป็นค่าที่ชีตแสดง ไม่ใช่คำรับรองว่าอัปเดต)
- \`Executive_Dashboard!A14:E20\` — KPI 7 รายการ
- \`Executive_Dashboard!A34:D37\` — GDMT 4 กลุ่มยา
- \`_Executive_Metrics!B2:B4\` — MTD 164/195 = 84.1%
- \`Executive_Dashboard!A3\` — วันที่อ้างอิงของรายงาน

**ข้อควรระวัง:** ตัวเลขที่ชีตคำนวณด้วยสูตรจะเปลี่ยนตามสูตรจริง
แต่ตัวเลขที่พิมพ์คงที่ในชีตจะยังคงเดิมแม้เว็บจะดึงข้อมูลสด
ดังนั้นการทำให้ "ล่าสุด" ต้องตรวจข้อมูลในต้นฉบับด้วย
และเลขสะสม A6 (192) ไม่ตรงฐานนับ MTD B2 (195) — ยังไม่ควรแก้โดยไม่มีการตรวจสอบข้อมูล

## ความเป็นส่วนตัว
- จำกัดการแชร์ไฟล์ Google Sheets ตามนโยบายโรงพยาบาล; ปัจจุบัน
  เมทาดาทาระบุว่ามีสิทธิ์ "anyone" สำหรับ Commenter ควรทบทวน
- ตรวจสอบว่า dispatch บังคับ session/token ก่อนเรียกตัวอ่านชีต
- ไม่มีการส่ง patient-level data ไป GitHub และไม่มี API key ใน GitHub

## ยังไม่ได้ทำอะไร
ตัวช่วยมีสิทธิ์แก้โค้ด GitHub แต่ยัง **ไม่มีสิทธิ์แก้หรือ Deploy โปรเจ็กต์ Apps Script ที่ใช้งานอยู่**
ดังนั้นต้องทำขั้นตอนที่ 1–5 โดยผู้ดูแลโปรเจ็กต์ก่อนจะเรียกว่าเชื่อมข้อมูลสดสำเร็จ
