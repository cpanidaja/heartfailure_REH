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

## นิยามข้อมูล GDMT สำหรับกราฟ

- ทั้งกราฟ **ข้อจำกัด** (คอลัมน์ I/L/O/R) และ **ความเหมาะสม GDMT** (คอลัมน์ BB) ใช้ฐาน **ทุกแถวที่มี HN ทั้งทะเบียน** และรวม HN ซ้ำ ไม่ผสมกับช่วงวันที่ที่เลือกใน Dashboard หลัก
- ผลสำรอง ณ 17 ต.ค. 2569: ข้อจำกัด ACEi/ARB/ARNI 56, β-blocker 17, MRA 116, SGLT2i 218 ครั้ง; BB เหมาะสม 273/273 ครั้ง (100% ตามการบันทึก ไม่ใช่การรับรองความเหมาะสมของคำสั่งรักษา)
- 38 ระเบียนที่มีผล BB แต่ยังไม่จำแนก HFrEF/HFpEF หรือยังรอยืนยัน phenotype ถูกนับในผลรวม ไม่อยู่ในกราฟแยก phenotype
- Backend ใหม่รับผิดชอบคำนวณผลรวมและส่งเฉพาะ aggregate แทนการอ่านประวัติรายบุคคลลง browser เพื่อประกอบกราฟ

## วิธีเปิดใช้งานข้อมูลสดผ่าน Apps Script

1. ไปยัง **Apps Script โครงการเดิม** ที่ให้บริการ login/dispatch ของเว็บ `https://cpanidaja.github.io/heartfailure_REH/` ห้ามสร้างโปรเจ็กต์ใหม่หรือแทนที่ Code.gs ทั้งไฟล์
2. สำรองไฟล์ Script เดิม เพิ่มหรืออัปเดต Script ชื่อ `AppsScript_ExecutiveDashboard` ด้วยเนื้อหาที่ตรวจสอบแล้วใน [GitHub](https://github.com/cpanidaja/heartfailure_REH/blob/main/AppsScript_ExecutiveDashboard.gs)
3. ใน dispatch เดิม เพิ่ม **สองคำสั่ง** `getExecutiveDashboardSummary` และ `getGdmtReviewSummary` **หลังตรวจ session/token และสิทธิ์ผู้ใช้เสร็จแล้วเท่านั้น**:
   ```js
   case 'getExecutiveDashboardSummary':
     return hfReadExecutiveDashboardSummary_();
   case 'getGdmtReviewSummary':
     return hfReadGdmtReviewSummary_();
   ```
   ห้ามสร้าง dispatch ซ้ำ หรือเปิด doGet/doPost ใหม่ที่ไม่ตรวจสิทธิ์
4. บันทึก แล้วเลือก **Deploy → Manage deployments → Edit → New version → Deploy** ใน deployment เดิมของเว็บไซต์
5. เข้าสู่ระบบในเว็บ ตรวจ Web build `2026.10.17.3` ที่ Executive Dashboard แล้วกด “โหลดกราฟล่าสุด” และ “โหลดกราฟ GDMT ทั้งทะเบียนล่าสุด” ต้องขึ้นคำว่า **ข้อมูลสด** ทั้งส่วน Executive และส่วน GDMT แยกกัน หากขึ้น “ข้อมูลสำรอง” แปลว่ายังไม่ยืนยันการทำงานของ endpoint ใหม่นั้น
6. ตรวจที่ `Executive_Dashboard!A14:E21`, `_Executive_Metrics!B2:B4`, `Dashboard!B31:D31` และสถานะ I/L/O/R/BB ในทะเบียน เพื่อยืนยันว่าผลรวมตรงกับเว็บหลังโหลดจริง

### ขอบเขตความเป็นส่วนตัว

ทั้งสอง API ส่งออกเพียงผลรวมตัวชี้วัด ไม่มีข้อมูลผู้ป่วยรายบุคคล; ตัวอ่าน GDMT ประมวลผลคอลัมน์ใน Apps Script ฝั่งเซิร์ฟเวอร์ ไม่มี HN ชื่อผู้ป่วยหรือข้อมูลรายบุคคลใน GitHub Pages หรือ JSON สาธารณะ ห้ามเผยแพร่ Google Sheets เป็นสาธารณะเพื่อให้ API ทำงาน

**สถานะ:** การแก้ GitHub สำเร็จ แต่ยังไม่ได้ยืนยันว่าผู้ดูแลได้ปรับ/Deploy โครงการ Apps Script ที่ใช้งานจริง ดังนั้นระบบจะต้องแสดงข้อมูลสำรองพร้อมวันที่จนกว่า backend ใหม่จะใช้งานได้


## การทดสอบความถูกต้องและแก้ปัญหาแคช

- ถ้าหน้าจอยังแสดง MTD 0/187 หรือชื่อ KPI/ข้อความเก่า ให้เปิด `https://cpanidaja.github.io/heartfailure_REH/?v=20261017-3` และโหลดหน้าใหม่ ตรวจว่า Web build แสดง `2026.10.17.3`; GitHub Pages อาจต้องรอการเผยแพร่
- ถ้า Executive Dashboard แสดง **ข้อมูลสำรอง** แม้เว็บเป็นเวอร์ชันใหม่: โปรดตรวจ Apps Script `getExecutiveDashboardSummary`, session/auth, และ deployment version เดิมที่เว็บเชื่อมอยู่
- ถ้ากราฟ GDMT ยังแสดง **ข้อมูลสำรอง**: โปรดตรวจ Apps Script `getGdmtReviewSummary`, session/auth, และ deployment. ทั้งสองกราฟจะเปลี่ยนเป็นข้อมูลสดพร้อมกันเท่านั้น เพื่อไม่ผสมฐานคนละช่วง
- ห้ามนำกราฟข้อมูลสำรอง ณ 17 ต.ค. ไปเรียกว่า "ข้อมูลสด" หลังจากชีตมีข้อมูลใหม่ และห้ามเปลี่ยนสิทธิ์ไฟล์เป็น public เพื่อหลบปัญหา authentication
