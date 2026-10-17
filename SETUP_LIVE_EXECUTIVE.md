# HF Clinic Web — เชื่อม Executive Dashboard กับ Google Sheets

อัปเดต: 17 ตุลาคม 2569 | กลุ่มงานเภสัชกรรม โรงพยาบาลร้อยเอ็ด

## สิ่งที่แก้แล้วใน GitHub

- หน้าเว็บไซต์ `index.html`: แสดง FMT eligibility รายครั้งและปรับ MTD/GDMT Executive Dashboard ให้ใช้ค่าตามชีตล่าสุดที่ตรวจ พร้อมแยกข้อมูลสดกับข้อมูลสรุปสำรอง
- `executive-dashboard-summary.json`: สรุปผลรวม ณ 17/10/2026 เท่านั้น (ไม่ใช่ข้อมูลสด)
- `AppsScript_ExecutiveDashboard.gs`: ตัวอ่านข้อมูลสรุปแบบ aggregate-only สำหรับติดตั้งใน Apps Script **โครงการเดิม** หลังระบบตรวจสอบสิทธิ์

## ค่าที่ตรวจจาก Google Sheets เมื่อ 17/10/2026

| ตัวชี้วัด | ตัวเศษ / ตัวส่วน | ผล |
|---|---|---|
| FMT eligibility รายครั้ง | Eligible 258 / มีค่า AV 272 ครั้ง | 94.9% |
| MTD รายครั้งทั้งทะเบียน | 268 / 273 ครั้ง | 98.2% |
| ความครบถ้วน FMT/GDMT (คนละตัวชี้วัดกับ FMT eligibility) | 46 / 58 ครั้ง HFrEF eligible-adjusted | 79.3% |

FMT eligibility นับจาก `HF_Patient_Data!D6:D1098` (HN) และ `AV6:AV1098` (FMT eligibility) **นับ HN ซ้ำทั้งเศษและส่วน**:
```gs
=COUNTIFS(HF_Patient_Data!D6:D1098,"<>",HF_Patient_Data!AV6:AV1098,"Eligible")
=COUNTIFS(HF_Patient_Data!D6:D1098,"<>",HF_Patient_Data!AV6:AV1098,"<>")
```
สถานะ “ต้องประเมินเพิ่ม” 14 ครั้งอยู่ในตัวหาร และ 1 ครั้งที่ยังไม่มีค่า AV ไม่เข้าตัวหาร ไม่คัด HN ซ้ำ ไม่ใช้สถานะล่าสุดของแต่ละ HN และไม่กรองตามเดือนสำหรับตัวชี้วัดนี้

## วิธีเปิดใช้งานข้อมูลสดผ่าน Apps Script

1. ไปยัง **Apps Script โครงการเดิม** ที่ให้บริการ login/dispatch ของเว็บ `https://cpanidaja.github.io/heartfailure_REH/` ห้ามสร้างโปรเจ็กต์ใหม่หรือแทนที่ Code.gs ทั้งไฟล์
2. สำรองไฟล์ Script เดิม เพิ่มหรืออัปเดต Script ชื่อ `AppsScript_ExecutiveDashboard` ด้วยเนื้อหาที่ตรวจสอบแล้วใน [GitHub](https://github.com/cpanidaja/heartfailure_REH/blob/main/AppsScript_ExecutiveDashboard.gs)
3. ใน dispatch เดิม เพิ่มกรณี `getExecutiveDashboardSummary` **หลังตรวจ session/token และสิทธิ์ผู้ใช้เสร็จแล้วเท่านั้น**:
   ```js
   case 'getExecutiveDashboardSummary':
     return hfReadExecutiveDashboardSummary_();
   ```
   ห้ามสร้าง dispatch ซ้ำ หรือเปิด doGet/doPost ใหม่ที่ไม่ตรวจสิทธิ์
4. บันทึก แล้วเลือก **Deploy → Manage deployments → Edit → New version → Deploy** ใน deployment เดิมของเว็บไซต์
5. เข้าสู่ระบบในเว็บ กด “โหลดกราฟล่าสุด” และตรวจว่ามีข้อความ **เชื่อม Google Sheets ผ่าน Apps Script สำเร็จ** หากยังขึ้น “ข้อมูลสำรอง” แสดงว่ายังไม่ยืนยันการทำงานของ endpoint ใหม่
6. ตรวจที่ `Executive_Dashboard!A14:E21`, `_Executive_Metrics!B2:B4` และ `Dashboard!B31:D31` เพื่อยืนยันว่าตัวเลขเท่ากับเว็บหลังโหลดจริง

### ขอบเขตความเป็นส่วนตัว

API ตัวนี้อ่านเฉพาะเซลล์สรุปของ Google Sheets และส่งกลับผลรวมตัวชี้วัดเท่านั้น ไม่มี HN ชื่อผู้ป่วยหรือข้อมูลรายบุคคลใน GitHub Pages หรือ JSON สาธารณะ ห้ามเผยแพร่ Google Sheets เป็นสาธารณะเพื่อให้ API ทำงาน

**สถานะ:** การแก้ GitHub สำเร็จ แต่ยังไม่ได้ยืนยันว่าผู้ดูแลได้ปรับ/Deploy โครงการ Apps Script ที่ใช้งานจริง ดังนั้นระบบจะต้องแสดงข้อมูลสำรองพร้อมวันที่จนกว่า backend ใหม่จะใช้งานได้
