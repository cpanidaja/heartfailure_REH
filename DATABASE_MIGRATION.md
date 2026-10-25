# เตรียมย้ายฐานข้อมูล HF Clinic ไป MySQL

สาขานี้เป็น **ชุดเตรียม migration** เท่านั้น ยังไม่เปลี่ยนเว็บที่ใช้งานจริง

## สิ่งที่ตรวจพบในระบบปัจจุบัน

- เว็บอยู่บน GitHub Pages และไฟล์หน้าเว็บหลักคือ `index.html`
- เว็บเรียก Google Apps Script Web App ผ่าน RPC `dispatch`
- Google Sheets เป็นแหล่งข้อมูลสำหรับทะเบียนผู้ป่วย, บันทึกรายครั้ง, DRP, ADR, FMT และรายงาน
- หน้าเว็บมี API methods เช่น `getBootstrap`, `login`, `getDashboard`, `listRecords`, `getRecord`, `saveRecord`, `searchPatients`, `getPatientLinks`, `getReport`, `saveReport`, `getExecutiveDashboardSummary` และ `changePassword`

GitHub Pages เป็น static hosting จึงไม่สามารถเชื่อมต่อ MySQL โดยตรงได้อย่างปลอดภัย ต้องมี API server ที่ยืนยันตัวตนและเชื่อมฐานข้อมูลให้ก่อน

## ไฟล์ในสาขานี้

- `database/mysql_schema.sql` — โครงสร้างตั้งต้นของ MySQL 8: ผู้ใช้, ผู้ป่วย, แถวข้อมูลตามชีต, session และ audit events
- `DATABASE_MIGRATION.md` — ขั้นตอนและเงื่อนไขการย้าย

## ลำดับการย้ายที่ต้องทำ

1. เตรียม MySQL ส่วนตัวในระบบที่โรงพยาบาลอนุมัติ และ API server ในเครือข่าย/Cloud ที่ได้รับอนุมัติ
2. กำหนด API contract ให้รองรับ methods ที่หน้าเว็บเรียกอยู่ โดยคงการตรวจสิทธิ์, schema ของแบบบันทึก, สูตร KPI และการเขียน audit log
3. ทำ importer จาก Google Sheets ที่อ่านทุกชีตและเก็บแถวเดิมใน `clinical_records.payload`; แปลงวันที่ พ.ศ. เป็นวันที่ ISO ก่อนบันทึก และเก็บ HN เป็นข้อความ
4. ทดสอบเปรียบเทียบจำนวนแถว, dashboard/KPI, การค้นหา, การแก้ไข, การบันทึก และ role permissions กับระบบ Google Sheets
5. ทดสอบด้วยข้อมูลจำลองก่อน จากนั้นทดสอบข้อมูลจริงภายใต้สิทธิ์โรงพยาบาล พร้อมแผน rollback
6. เมื่อตรวจผ่านแล้ว จึงตั้งค่า URL API ในเว็บและ deploy หน้า GitHub Pages; เก็บรหัสผ่าน MySQL ใน Secret Manager/secret ของ hosting เท่านั้น

## ต้องระบุเพื่อทำ production cutover

- ผู้ให้บริการ MySQL และ API hosting ที่โรงพยาบาลอนุมัติ (ตัวเลือก Google Cloud SQL + Cloud Run ต้องมี Google Cloud project และ billing)
- API base URL ของระบบใหม่
- วิธีนำเข้าข้อมูลจาก Google Sheets และผู้รับผิดชอบอนุมัติการใช้ข้อมูลผู้ป่วย
- วิธีคง/ย้ายบัญชีผู้ใช้และระดับสิทธิ์จาก Apps Script เดิม

ห้ามใส่รหัสผ่าน, connection string, patient rows หรือ secret ลง GitHub หรือใน frontend สาธารณะ
