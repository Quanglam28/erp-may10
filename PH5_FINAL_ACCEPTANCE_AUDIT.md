# BÁO CÁO KIỂM TOÁN VÀ NGHIỆM THU CUỐI CÙNG (FINAL ACCEPTANCE AUDIT)
## PHÂN HỆ PH5: DYNAMIC COSTING SELECTIVE PORT
### ĐỐI CHIẾU ĐỘC LẬP: REPORT vs SOURCE vs DATABASE vs RUNTIME vs GIT

---

## 1. Baseline

| Thông số | Nguồn A: GitHub Reference (`erp_5new`) | Đích B: Local Codebase (`E:\ERP`) |
| :--- | :--- | :--- |
| **Repository URL** | `https://github.com/Zieep39/erp_5new.git` | Local Directory `E:\ERP` |
| **Branch** | `main` | `main` |
| **Commit Baseline** | `7fdd313ff74d6cdda88d2f2cb298222146ddb33c` | `26d17d6a44893301c0714fe568a35f64d5da31f4` |
| **Kiểm tra Git HEAD** | N/A | `git rev-parse HEAD` $\rightarrow$ `26d17d6a44893301c0714fe568a35f64d5da31f4` |
| **Tình trạng Commit** | N/A | Không có commit mới, không có git push |

---

## 2. Scope

Đối chiếu phạm vi thay đổi thực tế so với thiết kế được duyệt tại `PH5_SELECTIVE_PORT_DESIGN.md`:

### Tệp tin thay đổi (Modified Files - 8 files):
- `backend/src/controllers/costingController.js`
- `backend/src/routes/financeRoutes.js`
- `backend/src/services/costingService.js`
- `backend/src/services/orderEfficiencyService.js`
- `frontend/src/finance/FinanceRoutes.jsx`
- `frontend/src/finance/config/permissions.js`
- `frontend/src/finance/pages/Costing.jsx`
- `frontend/src/finance/services/costing.js`

### Tệp tin mới (New Files - 5 files):
- `backend/src/services/costingWriteService.js`
- `backend/tests/test_ph5_costing_lifecycle.js`
- `frontend/src/finance/components/CostingCalculator.jsx`
- `frontend/src/finance/components/CostingResultsManager.jsx`
- `PH5_COSTING_IMPLEMENTATION_REPORT.md`

**Kết luận phạm vi:** Không có bất kỳ tệp tin nào bị thay đổi ngoài phạm vi cho phép (No Unexpected Changes).

---

## 3. Git Integrity

Kết quả kiểm tra trực tiếp qua git client:
```bash
git status --short
```
- Các tệp tin mã nguồn thuộc phạm vi selective port nằm trên Working Tree ở trạng thái uncommitted.
- Nhánh hiện tại: `main` (up to date with `origin/main`).
- Không phát sinh merge branch, không rebase, không cherry-pick, không sửa lịch sử git.
- **Đánh giá: PASS**.

---

## 4. PH4 Frozen Integrity

Đối soát mã băm SHA-256 đối với 3 tệp tin thuộc ranh giới đóng băng của Phân hệ 4 (PH4):

```powershell
Get-FileHash backend\src\controllers\tonKhoController.js, backend\src\routes\tonKhoRoutes.js, backend\tests\test_ph4_fr11_stock_card.js -Algorithm SHA256
```

| Tệp Tin | SHA-256 Kỳ Vọng | SHA-256 Thực Tế | Kết Quả |
| :--- | :--- | :--- | :---: |
| `backend/src/controllers/tonKhoController.js` | `B1719AB8B57A292FD9E0F2A250B21E8D72393AF1D3D5B4E858B118D1B0926508` | `B1719AB8B57A292FD9E0F2A250B21E8D72393AF1D3D5B4E858B118D1B0926508` | **MATCH** |
| `backend/src/routes/tonKhoRoutes.js` | `C55596AA8CB5F39A8AB77229FE29ABEC7E5715FFDD7141B2654BDC881D2FA5FB` | `C55596AA8CB5F39A8AB77229FE29ABEC7E5715FFDD7141B2654BDC881D2FA5FB` | **MATCH** |
| `backend/tests/test_ph4_fr11_stock_card.js` | `A6D5868223A331936B6699D1108864C6BAED95BB288152C05E5273BF15872F1A` | `A6D5868223A331936B6699D1108864C6BAED95BB288152C05E5273BF15872F1A` | **MATCH** |

**Kết luận:** 3/3 MATCH. Quy tắc đóng băng PH4 được bảo toàn 100%. **Đánh giá: PASS**.

---

## 5. Schema Verification

Truy vấn thực tế từ `information_schema.columns` trên PostgreSQL 18.6 `erp_may10`:
- **`gia_thanh_san_pham`:** `id`, `ma_san_pham`, `ma_lenh_san_xuat`, `ky_tinh_gia_thanh`, `so_luong_san_xuat`, `chi_phi_vat_lieu_truc_tiep`, `chi_phi_nhan_cong_truc_tiep`, `chi_phi_san_xuat_chung`, `tong_chi_phi`, `gia_thanh_don_vi`, `gia_ban_de_nghi`, `ghi_chu`, `nguoi_tinh`, `trang_thai`, `ngay_tao`, `ngay_cap_nhat`, `nguoi_tao`, `nguoi_cap_nhat`.
- **`lenh_san_xuat`:** `id`, `ma_lenh_san_xuat`, `ma_ke_hoach_san_xuat`, `ma_don_ban_hang`, `ma_san_pham`, `so_luong_yeu_cau`, `so_luong_hoan_thanh`, `ngay_bat_dau`, `ngay_ket_thuc_yc`, `ngay_hoan_thanh`, `nguoi_phu_trach`, `ghi_chu`, `trang_thai`, `ngay_tao`, `ngay_cap_nhat`, `nguoi_tao`, `nguoi_cap_nhat`.
- **`phieu_xuat_kho`:** `id`, `ma_phieu_xuat`, `loai_xuat`, `ma_don_ban_hang`, `ma_lenh_san_xuat`, `ma_kho_xuat`, `ngay_xuat`, `thu_kho`, `nguoi_nhan`, `tong_gia_tri_xuat`, `ghi_chu`, `trang_thai`, `ngay_tao`, `ngay_cap_nhat`, `nguoi_tao`, `nguoi_cap_nhat`.
- **`chi_tiet_phieu_xuat`:** `id`, `ma_phieu_xuat_kho`, `ma_vat_tu`, `ma_lo_vat_tu`, `so_luong_xuat`, `don_gia_xuat`, `thanh_tien`, `ghi_chu`, `ngay_tao`, `nguoi_tao`.

**Kết luận:** Mã nguồn trong `costingWriteService.js` sử dụng chính xác các cột thực tế đang tồn tại trong DB. Không chạy bất kỳ migration script nào. **Đánh giá: PASS**.

---

## 6. Preview Verification

Kiểm tra implementation của `previewCosting`:
- Hàm bọc qua `transaction(..., 'REPEATABLE READ READ ONLY')` (Dòng 272).
- Mức cô lập `REPEATABLE READ` kết hợp cờ `READ ONLY` ngăn chặn mọi hành vi ghi vào DB ở tầng PostgreSQL driver.
- Không phát sinh câu lệnh INSERT/UPDATE trên `gia_thanh_san_pham`, không tạo phiếu xuất kho, không dịch chuyển tồn kho.
- Kiểm tra độc lập tại runtime: Dữ liệu DB trước và sau khi gọi Preview không hề thay đổi. **Đánh giá: PASS**.

---

## 7. Draft Lifecycle

Kiểm tra chu trình: Lưu dự thảo $\rightarrow$ Hiệu chỉnh $\rightarrow$ Xóa:
- **Save Draft:** Tạo bản ghi với `trang_thai = 'du_thao'`, ghi nhận `nguoi_tao = user.id`. Chặn lưu nếu thiếu căn cứ phân bổ (`allocationBasis`) hoặc sai định dạng số học.
- **Update Draft:** Chỉ cho phép cập nhật khi bản ghi đang ở `du_thao`. Cập nhật chi phí nhân công, SXC, căn cứ phân bổ, đơn giá và `nguoi_cap_nhat`.
- **Delete Draft:** Chỉ cho phép xóa khi bản ghi ở `du_thao`. Xóa triệt để bản ghi khỏi DB (HTTP 204).
- Runtime test: Cả 3 thao tác đều được kiểm thử và xác nhận bằng câu lệnh SQL trực tiếp. **Đánh giá: PASS**.

---

## 8. Maker-Checker

Kiểm tra phân định trách nhiệm Maker-Checker (Segregation of Duties):
1. **Maker (Kế toán viên - user ID 6):** Cố gắng gọi endpoint phê duyệt $\rightarrow$ Bị chặn với HTTP 403 Forbidden.
2. **Kế toán trưởng (user ID 7):** Tạo một dự thảo riêng đóng vai Maker, sau đó cố gắng tự duyệt dự thảo đó $\rightarrow$ Bị chặn với HTTP 403 Forbidden và thông báo: `"Quy tắc Maker-Checker (SoD): Người lập dự thảo không được tự phê duyệt kết quả giá thành."`.
3. **Kế toán trưởng duyệt dự thảo do Kế toán viên tạo:** Thành công với HTTP 200 OK.
4. Database lưu vết: `nguoi_tao = 6` $\neq$ `nguoi_cap_nhat = 7`. **Đánh giá: PASS**.

---

## 9. Approved Immutability

Kiểm tra tính bất biến sau khi bản ghi đã chuyển sang `da_duyet`:
- Cố gắng gọi `updateCostingDraft` trên bản ghi `da_duyet` $\rightarrow$ Bị chặn với HTTP 409 Conflict.
- Cố gắng gọi `deleteCostingDraft` trên bản ghi `da_duyet` $\rightarrow$ Bị chặn với HTTP 409 Conflict.
- Cố gắng gọi `approveCostingDraft` lần thứ 2 trên bản ghi `da_duyet` $\rightarrow$ Bị chặn với HTTP 409 Conflict.
- Không có bất kỳ sự thay đổi nào xảy ra trên bản ghi đã duyệt. **Đánh giá: PASS**.

---

## 10. Advisory Lock

Kiểm tra cơ chế khóa đồng thời:
- Sử dụng hàm PostgreSQL Transaction-scoped:
  ```sql
  SELECT pg_advisory_xact_lock(hashtextextended('costing:' || lsxId || ':' || period, 0));
  ```
- Khóa gắn liền với vòng đời của Transaction, tự động giải phóng khi COMMIT hoặc ROLLBACK.
- Không sử dụng `pg_advisory_lock` mức session (tránh rò rỉ khóa khi connection pool tái sử dụng).
- Resource key được băm chuẩn xác theo cặp `(LSX, Kỳ)`. **Đánh giá: PASS**.

---

## 11. Optimistic Concurrency

Kiểm tra chống xung đột dữ liệu nguồn:
- Trong quá trình lưu dự thảo, `saveCostingWithClient` so sánh snapshot lúc Preview với dữ liệu thực tế tại thời điểm ghi:
  - Nếu kho xuất thêm NVL $\rightarrow$ `preview.materialCost !== input.expectedMaterialCost` $\rightarrow$ Ném mã lỗi `COSTING_SOURCE_CHANGED` (HTTP 409).
  - Nếu xưởng thay đổi sản lượng $\rightarrow$ `preview.quantity !== input.expectedQuantity` $\rightarrow$ Ném mã lỗi `COSTING_SOURCE_CHANGED` (HTTP 409).
- Trả về payload preview mới trong thuộc tính `details` để client cập nhật giao diện. **Đánh giá: PASS**.

---

## 12. Formula Verification

Kiểm chứng độc lập 3 nguồn: (1) SQL Calculation độc lập, (2) API Response, (3) Dữ liệu lưu trong bảng `gia_thanh_san_pham`:

| Khoản Mục | (1) Independent SQL | (2) API Runtime Response | (3) DB `gia_thanh_san_pham` | Trạng Thái Khớp |
| :--- | :--- | :--- | :--- | :---: |
| Chi phí NVL trực tiếp | $22,500,000.00$ đ | $22,500,000.00$ đ | $22,500,000.00$ đ | **100% MATCH** |
| Chi phí Nhân công TT | $10,000,000.00$ đ | $10,000,000.00$ đ | $10,000,000.00$ đ | **100% MATCH** |
| Chi phí Sản xuất chung | $5,000,000.00$ đ | $5,000,000.00$ đ | $5,000,000.00$ đ | **100% MATCH** |
| **Tổng chi phí sản xuất** | **$37,500,000.00$ đ** | **$37,500,000.00$ đ** | **$37,500,000.00$ đ** | **100% MATCH** |
| Sản lượng tính giá | $100.000$ sản phẩm | $100.000$ sản phẩm | $100.000$ sản phẩm | **100% MATCH** |
| **Giá thành đơn vị** | **$375,000.00$ đ/SP** | **$375,000.00$ đ/SP** | **$375,000.00$ đ/SP** | **100% MATCH** |

**Đánh giá: PASS**.

---

## 13. Order Efficiency Isolation

Kiểm tra cô lập Báo cáo Hiệu quả Đơn hàng:
- Tại `backend/src/services/orderEfficiencyService.js`:
  ```sql
  WHERE g.id IS NOT NULL AND g.trang_thai = 'da_duyet'
  ```
- Kiểm tra runtime:
  - Khi tồn tại bản ghi đã duyệt: Tổng chi phí đơn hàng là $106,500,000$ đ.
  - Khi tạo thêm một dự thảo chưa duyệt (`du_thao`) với chi phí $900,000,000$ đ cho cùng đơn hàng $\rightarrow$ Báo cáo Order Efficiency vẫn giữ nguyên $106,500,000$ đ, hoàn toàn không bị ảnh hưởng. **Đánh giá: PASS**.

---

## 14. Frontend Verification

Kiểm tra mã nguồn và bundle frontend:
- `CostingCalculator.jsx`: Gọi `previewCosting`, bắt lỗi `COSTING_SOURCE_CHANGED`, gọi `saveCosting`.
- `CostingResultsManager.jsx`: Nạp lịch sử giá thành, chỉ mở modal sửa/xóa khi trạng thái là `du_thao`, chỉ hiển thị nút Duyệt khi `canApprove` là true.
- `Costing.jsx` & `FinanceRoutes.jsx`: Nhận quyền `COSTING_APPROVE` từ `permissions.js`, truyền xuống component con.
- `frontend/src/finance/services/costing.js`: Toàn bộ gọi qua `financeFetch`, tự động đính kèm JWT Bearer token.
- Biên dịch production `npm run build`: Thành công trong 6.13s, không có lỗi. **Đánh giá: PASS**.

---

## 15. Regression Tests

Kiểm tra thực thi lại toàn bộ 4 bộ test tự động của hệ thống:

| Tên Bộ Kiểm Thử | Lệnh Thực Thi | Kết Quả Thực Tế | Trạng Thái |
| :--- | :--- | :--- | :---: |
| **PH5 Costing Lifecycle & E2E** | `node tests/test_ph5_costing_lifecycle.js` | 61 PASS, 0 FAIL, 0 SKIP, 0 ERROR | **PASS** |
| **PH5 Finance Comprehensive** | `npm test` | 24 PASS, 0 FAIL, 0 SKIP, 0 ERROR | **PASS** |
| **PH4 Warehouse & Inventory** | `node tests/test_ph4_api.js` | 16 PASS, 0 FAIL, 0 SKIP, 0 ERROR | **PASS** |
| **PH2 Production Planning & MRP**| `node tests/test_ph2_production.js` | 38 PASS, 0 FAIL, 0 SKIP, 0 ERROR | **PASS** |
| **Frontend Production Build** | `npm run build` | Built in 6.13s, 1838 modules | **PASS** |

**Tổng cộng kiểm thử tự động:** **139/139 PASS (100%)**. **Đánh giá: PASS**.

---

## 16. Database Integrity

Kiểm tra toàn vẹn dữ liệu thực tế trên PostgreSQL:
- Orphan costing (bản ghi không có LSX hoặc Sản phẩm hợp lệ): **0**
- Invalid status (trạng thái khác `du_thao`, `da_duyet`): **0**
- Maker == Checker (bản ghi duyệt có người tạo trùng người duyệt): **0**
- Negative costs (chi phí âm): **0**
- Zero completed quantity (sản lượng tính giá $\le 0$): **0**
- Duplicate approved costings cho cùng một cặp LSX + Kỳ: **0**
- Tổng số bản ghi sản xuất gốc trong DB: **1** (bảo toàn nguyên vẹn). **Đánh giá: PASS**.

---

## 17. E2E ID Trace

Truy vết chi tiết một chu trình nghiệp vụ thực tế hoàn chỉnh vừa được thực thi và xác thực trong quá trình audit:

```
[PH2: Lệnh Sản Xuất]
├── ID: 125
├── Mã LSX: AUDIT-2026-LSX-26838
├── Sản phẩm ID: 1 (Áo Sơ Mi Nam Công Sở Dài Tay Trắng)
├── Kế hoạch: 120.000 SP
└── Sản lượng hoàn thành thực tế: 100.000 SP (Trạng thái: dang_san_xuat)
      │
      ▼
[PH4: Phiếu Xuất Kho]
├── ID: 311
├── Mã PXK: AUDIT-2026-PXK-36713
├── Loại xuất: xuat_san_xuat | Trạng thái: da_xuat
├── Dòng chi tiết 1: Vật tư 1 (Vải Kate) - 120m x 150,000 đ = 18,000,000 đ
├── Dòng chi tiết 2: Vật tư 2 (Chỉ may) - 45 cuộn x 100,000 đ = 4,500,000 đ
└── Tổng chi phí NVL xuất kho: 22,500,000.00 đ
      │
      ▼
[PH5: Dynamic Costing Preview]
├── Nhân công trực tiếp: 10,000,000.00 đ
├── Sản xuất chung: 5,000,000.00 đ
├── Tổng giá thành: 22.5M + 10M + 5M = 37,500,000.00 đ
└── Giá thành đơn vị: 37,500,000.00 / 100 = 375,000.00 đ/SP (Khớp 100%)
      │
      ▼
[PH5: Save Draft]
├── Bản ghi ID: 15
├── Kỳ: Thang11/2026
├── Trạng thái: du_thao
└── Maker: nguoi_tao = 6 (Hoàng Thị Toán)
      │
      ▼
[PH5: Maker-Checker & Approval]
├── Maker (6) tự duyệt: BỊ CHẶN (HTTP 403)
├── KTT (7) duyệt: THÀNH CÔNG (HTTP 200)
├── Trạng thái mới: da_duyet
└── Checker: nguoi_cap_nhat = 7 (Nguyễn Văn Trưởng)
      │
      ▼
[PH5: Order Efficiency]
└── Chỉ nạp bản ghi ID 15 sau khi da_duyet, loại bỏ hoàn toàn các dự thảo chưa duyệt
```

**Đánh giá: PASS**.

---

## 18. Report Discrepancies

Đối chiếu giữa báo cáo `PH5_COSTING_IMPLEMENTATION_REPORT.md` và thực tế kiểm toán độc lập:

1. **Sai lệch mô tả tên cột Database Schema (Section XVI):**
   - *Report Claim:* Báo cáo viết bảng mô tả cột với các tên trường giả định: `ma_gia_thanh`, `chi_phi_nvl_truc_tiep`, `tieu_thuc_phan_bo`, `tong_chi_phi_sx`.
   - *Current Reality:* Schema thực tế của PostgreSQL và code thực thi trong `costingWriteService.js` sử dụng các tên cột chuẩn: `ky_tinh_gia_thanh`, `chi_phi_vat_lieu_truc_tiep`, `chi_phi_nhan_cong_truc_tiep`, `chi_phi_san_xuat_chung`, `tong_chi_phi`, `gia_thanh_don_vi`, `ghi_chu`, `trang_thai`, `nguoi_tinh`, `nguoi_tao`, `nguoi_cap_nhat`.
   - *Status:* **DOCUMENTATION DISCREPANCY** (Code chạy đúng với schema thực tế, báo cáo cũ ghi sai tên cột).
2. **Sai lệch chuỗi ID kiểm thử Runtime (Section XVIII & XIX):**
   - *Report Claim:* Báo cáo ghi nhận chuỗi ID của lần chạy test trước: LSX ID 123, PXK ID 309, Draft ID 14.
   - *Current Reality:* Lần chạy kiểm toán độc lập tạo chuỗi ID tăng dần tự nhiên: LSX ID 125, PXK ID 311, Draft ID 15; và test suite rerun tạo Draft ID 17, 18, 19, 20, 21.
   - *Status:* **VERIFIED RUNTIME VARIATION** (Đúng quy luật sequence PostgreSQL, không ảnh hưởng logic).

---

## 19. Known Limitations

1. **Phạm vi tính giá thành động:** Hiện tại tính theo từng Lệnh sản xuất riêng lẻ kết hợp Kỳ kế toán (`productionOrderId` + `period`). Chưa áp dụng cho tính gộp nhiều Lệnh sản xuất chung trong một bảng tính.
2. **Chi phí dở dang cuối kỳ (WIP):** Hệ thống giả định toàn bộ chi phí NVL xuất kho trong kỳ được phân bổ hết cho sản lượng hoàn thành của lệnh đó (chưa tính hệ số hoàn thành dở dang tương đương).

---

## 20. Final Acceptance

Căn cứ trên 19 mục kiểm tra độc lập:
- 100% chức năng Dynamic Costing Lifecycle hoạt động chuẩn mực.
- 100% các biện pháp phòng vệ dữ liệu (Advisory Lock, Optimistic Concurrency, Maker-Checker SoD, Approved Immutability) hoạt động chính xác.
- 100% tệp tin PH4 Frozen được bảo toàn mã băm SHA-256.
- 139/139 kiểm thử tự động và build production đạt PASS.

**KẾT LUẬN NGHIỆM THU:** **PASS — VERIFIED**.
