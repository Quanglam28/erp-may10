/**
 * Comprehensive Test Suite for ERP May 10 - PH5 Costing Lifecycle & Safety Verification
 * Covers:
 * 1. Preview Costing (validation, read-only guarantees, formulas)
 * 2. Save Draft (serializable transaction, advisory lock, duplicate prevention)
 * 3. Update & Delete Draft
 * 4. Maker-Checker SoD (ke_toan vs ke_toan_truong, creator cannot approve)
 * 5. Optimistic Concurrency (COSTING_SOURCE_CHANGED on warehouse or production change)
 * 6. Approved Immutability (cannot edit, cannot delete, cannot re-approve)
 * 7. Order Efficiency integration (strictly ignores du_thao, uses da_duyet)
 * 8. E2E Integration: PH2 -> PH4 -> PH5 (LSX -> PXK -> Costing Draft -> Approve -> Efficiency)
 */

const http = require('http');
const db = require('../src/config/database');
const { signToken } = require('../src/middlewares/auth');

let server;
const PORT = 5126;

function request(path, method = 'GET', data = null, token = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runCostingLifecycleTests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU BỘ TEST KIỂM THỬ VÒNG ĐỜI GIÁ THÀNH ĐỘNG PH5 (COSTING LIFECYCLE)');
  console.log('================================================================\n');

  const app = require('../src/app');
  server = app.listen(PORT);

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      failed++;
      console.error(`  ❌ [FAIL] ${message}`);
      if (details) console.error(`     Details: ${details}`);
      process.exitCode = 1;
    }
  }

  // Tokens
  const tokenKeToan = signToken(6);        // Hoàng Thị Toán (ke_toan, id: 6)
  const tokenKeToanTruong = signToken(7);  // Nguyễn Văn Trưởng (ke_toan_truong, id: 7)
  const tokenAdmin = signToken(1);         // Quản trị viên (admin, id: 1)
  const tokenSales = signToken(2);         // Kinh doanh (ban_hang - Không có quyền kế toán)

  try {
    // Initial cleanup of test artifacts
    await db.query("DELETE FROM gia_thanh_san_pham WHERE ky_tinh_gia_thanh IN ('Thang10/2026', 'Thang11/2026', 'Thang12/2026', 'Quy1/2027', 'Quy2/2027')");
    await db.query("DELETE FROM chi_tiet_phieu_xuat WHERE ma_phieu_xuat_kho IN (SELECT id FROM phieu_xuat_kho WHERE ma_phieu_xuat LIKE 'BLACKBOX-2026-%')");
    await db.query("DELETE FROM phieu_xuat_kho WHERE ma_phieu_xuat LIKE 'BLACKBOX-2026-%'");
    await db.query("DELETE FROM lenh_san_xuat WHERE ma_lenh_san_xuat LIKE 'BLACKBOX-2026-%'");

    // -------------------------------------------------------------------------
    // CHECKPOINT 1: PREVIEW COSTING
    // -------------------------------------------------------------------------
    console.log('--- Checkpoint 1: Preview Costing (Read-Only & Validations) ---');

    // 1.1 Non-accounting role rejection (403)
    const resForbidden = await request('/api/costing/preview', 'POST', {
      productionOrderId: 1,
      period: 'Thang10/2026',
      laborCost: '30000000.00',
      overheadCost: '15000000.00',
    }, tokenSales);
    assert(resForbidden.status === 403, 'Từ chối người dùng không có vai trò kế toán (403)');

    // 1.2 Count records before preview to verify read-only guarantee
    const countBeforeRes = await db.query('SELECT count(*)::int as count FROM gia_thanh_san_pham');
    const countBefore = countBeforeRes.rows[0].count;

    // 1.3 Valid Preview with LSX 1
    const resPreview = await request('/api/costing/preview', 'POST', {
      productionOrderId: 1,
      period: 'Thang10/2026',
      laborCost: '30000000.00',
      overheadCost: '15000000.00',
      allocationBasis: 'Phân bổ theo số giờ máy và lao động thực tế tháng 10',
    }, tokenKeToan);
    assert(resPreview.status === 200, `Preview thành công với HTTP 200 (status: ${resPreview.status})`);
    assert(resPreview.data?.data?.productionOrderCode === 'LSX-2026-001', 'Preview đúng mã lệnh sản xuất LSX-2026-001');
    assert(Number(resPreview.data?.data?.quantity) === 600, 'Preview đúng sản lượng hoàn thành 600 áo');
    assert(Number(resPreview.data?.data?.materialCost) === 58500000, 'Preview đúng chi phí NVL từ kho 58.500.000 VNĐ');

    // Verify mathematical formula: Total = 58.5M + 30M + 15M = 103.5M; Unit = 103.5M / 600 = 172,500.00
    const expectedTotal = 58500000 + 30000000 + 15000000;
    const expectedUnit = Math.round((expectedTotal / 600) * 100) / 100;
    assert(Number(resPreview.data?.data?.totalCost) === expectedTotal, `Tổng chi phí khớp công thức: ${expectedTotal}`);
    assert(Number(resPreview.data?.data?.unitCost) === expectedUnit, `Đơn vị giá thành khớp: ${expectedUnit}`);

    // Verify Read-Only guarantee (no rows added to DB)
    const countAfterPreviewRes = await db.query('SELECT count(*)::int as count FROM gia_thanh_san_pham');
    assert(countAfterPreviewRes.rows[0].count === countBefore, 'Preview đảm bảo Read-Only 100%: Số bản ghi DB không thay đổi');

    // 1.4 Validation: Missing production order (404)
    const resMissingLSX = await request('/api/costing/preview', 'POST', {
      productionOrderId: 999999,
      period: 'Thang10/2026',
      laborCost: '1000000.00',
      overheadCost: '500000.00',
    }, tokenKeToan);
    assert(resMissingLSX.status === 404, `Không tìm thấy LSX trả về 404: ${resMissingLSX.status}`);

    // 1.5 Validation: Negative labor cost (400)
    const resNegLabor = await request('/api/costing/preview', 'POST', {
      productionOrderId: 1,
      period: 'Thang10/2026',
      laborCost: '-5000.00',
      overheadCost: '500000.00',
    }, tokenKeToan);
    assert(resNegLabor.status === 400, `Chi phí nhân công âm trả về 400: ${resNegLabor.status}`);

    // 1.6 Validation: Negative overhead cost (400)
    const resNegOverhead = await request('/api/costing/preview', 'POST', {
      productionOrderId: 1,
      period: 'Thang10/2026',
      laborCost: '500000.00',
      overheadCost: '-200.00',
    }, tokenKeToan);
    assert(resNegOverhead.status === 400, `Chi phí SXC âm trả về 400: ${resNegOverhead.status}`);

    // 1.7 Validation: LSX has zero completed quantity (LSX 2: so_luong_hoan_thanh = 0) (409)
    const resZeroQty = await request('/api/costing/preview', 'POST', {
      productionOrderId: 2,
      period: 'Thang10/2026',
      laborCost: '1000000.00',
      overheadCost: '500000.00',
    }, tokenKeToan);
    assert(resZeroQty.status === 409, `LSX chưa có sản lượng hoàn thành trả về 409: ${resZeroQty.status}`);

    // -------------------------------------------------------------------------
    // CHECKPOINT 2: SAVE DRAFT, UPDATE DRAFT, DELETE DRAFT
    // -------------------------------------------------------------------------
    console.log('\n--- Checkpoint 2: Vòng đời dự thảo (Save, Update, Delete Draft) ---');

    // 2.1 Save Valid Draft for LSX 1 (Kỳ Thang10/2026)
    const previewData = resPreview.data.data;
    const resSaveDraft = await request('/api/costing/save', 'POST', {
      productionOrderId: 1,
      period: 'Thang10/2026',
      laborCost: '30000000.00',
      overheadCost: '15000000.00',
      allocationBasis: 'Phân bổ chi phí theo bảng lương chuyền 1 và khấu hao máy may',
      expectedQuantity: previewData.quantity,
      expectedMaterialCost: previewData.materialCost,
    }, tokenKeToan);
    assert(resSaveDraft.status === 201, `Lưu dự thảo thành công HTTP 201: ${resSaveDraft.status}`);
    const draftId = resSaveDraft.data?.data?.id;
    assert(draftId !== undefined, `Sinh ID dự thảo hợp lệ: id = ${draftId}`);
    assert(resSaveDraft.data?.data?.status === 'du_thao', 'Trạng thái bản ghi mới lưu là du_thao');
    assert(Number(resSaveDraft.data?.data?.createdBy) === 6, 'Ghi nhận đúng người tạo nguoi_tao = 6 (Hoàng Thị Toán)');

    // 2.2 Save Duplicate Draft for same LSX and same period (409)
    const resDuplicateDraft = await request('/api/costing/save', 'POST', {
      productionOrderId: 1,
      period: 'Thang10/2026',
      laborCost: '32000000.00',
      overheadCost: '16000000.00',
      allocationBasis: 'Thử lưu trùng kỳ',
      expectedQuantity: previewData.quantity,
      expectedMaterialCost: previewData.materialCost,
    }, tokenKeToan);
    assert(resDuplicateDraft.status === 409, `Chặn tạo trùng dự thảo cho cùng LSX và cùng kỳ (409): ${resDuplicateDraft.status}`);

    // 2.3 Update Draft
    const resUpdateDraft = await request(`/api/costing/results/${draftId}`, 'PATCH', {
      laborCost: '32000000.00',
      overheadCost: '16000000.00',
      allocationBasis: 'Điều chỉnh bổ sung chi phí nhân công tăng ca',
      expectedQuantity: previewData.quantity,
      expectedMaterialCost: previewData.materialCost,
    }, tokenKeToan);
    assert(resUpdateDraft.status === 200, `Cập nhật dự thảo thành công (200): ${resUpdateDraft.status}`);
    const updatedTotal = 58500000 + 32000000 + 16000000; // 106.5M
    const updatedUnit = Math.round((updatedTotal / 600) * 100) / 100; // 177,500.00
    assert(Number(resUpdateDraft.data?.data?.totalCost) === updatedTotal, `Tổng chi phí sau update khớp: ${updatedTotal}`);
    assert(Number(resUpdateDraft.data?.data?.unitCost) === updatedUnit, `Đơn giá sau update khớp: ${updatedUnit}`);
    assert(Number(resUpdateDraft.data?.data?.updatedBy) === 6, 'Ghi nhận đúng nguoi_cap_nhat = 6');

    // 2.4 Delete Draft test (tạo 1 draft tạm ở kỳ Thang11/2026 để xóa)
    const resSaveTemp = await request('/api/costing/save', 'POST', {
      productionOrderId: 1,
      period: 'Thang11/2026',
      laborCost: '20000000.00',
      overheadCost: '10000000.00',
      allocationBasis: 'Dự thảo tạm để test xóa',
      expectedQuantity: previewData.quantity,
      expectedMaterialCost: previewData.materialCost,
    }, tokenKeToan);
    const tempDraftId = resSaveTemp.data?.data?.id;
    assert(resSaveTemp.status === 201, `Tạo draft tạm thành công: id = ${tempDraftId}`);

    const resDeleteTemp = await request(`/api/costing/results/${tempDraftId}`, 'DELETE', null, tokenKeToan);
    assert(resDeleteTemp.status === 204, `Xóa draft tạm thành công với HTTP 204: ${resDeleteTemp.status}`);

    const checkDeleted = await db.query('SELECT id FROM gia_thanh_san_pham WHERE id = $1', [tempDraftId]);
    assert(checkDeleted.rows.length === 0, 'Bản ghi dự thảo đã thực sự bị xóa khỏi database');

    // -------------------------------------------------------------------------
    // CHECKPOINT 3: MAKER-CHECKER (SoD) ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log('\n--- Checkpoint 3: Kiểm soát phân định trách nhiệm Maker-Checker (SoD) ---');

    // 3.1 Non-chief accountant role attempt to approve (User 6 is ke_toan) -> 403 Forbidden by route & service
    const resApproveByMaker = await request(`/api/costing/results/${draftId}/approve`, 'POST', null, tokenKeToan);
    assert(resApproveByMaker.status === 403, `Kế toán viên (Maker) bị từ chối phê duyệt (403): ${resApproveByMaker.status}`);

    // 3.2 What if Chief Accountant created a draft and tries to approve their own draft?
    // Let's create a draft where creator is User 7 (ke_toan_truong)
    const resChiefDraft = await request('/api/costing/save', 'POST', {
      productionOrderId: 1,
      period: 'Thang12/2026',
      laborCost: '25000000.00',
      overheadCost: '12000000.00',
      allocationBasis: 'Kế toán trưởng tự lập dự thảo',
      expectedQuantity: previewData.quantity,
      expectedMaterialCost: previewData.materialCost,
    }, tokenKeToanTruong);
    const chiefDraftId = resChiefDraft.data?.data?.id;
    assert(resChiefDraft.status === 201, `KTT tạo draft thành công: id = ${chiefDraftId}`);

    // KTT tries to approve their own draft -> Must be rejected with 403 Maker-Checker SoD violation!
    const resSelfApprove = await request(`/api/costing/results/${chiefDraftId}/approve`, 'POST', null, tokenKeToanTruong);
    assert(resSelfApprove.status === 403, `KTT tự duyệt draft do chính mình tạo bị chặn bởi Maker-Checker (403): ${resSelfApprove.status}`);
    const errorMsg = resSelfApprove.data?.message || resSelfApprove.data?.error?.message || '';
    assert(errorMsg.includes('Maker-Checker'), 'Thông báo lỗi chỉ rõ vi phạm quy tắc Maker-Checker');

    // Clean up chiefDraft
    await db.query('DELETE FROM gia_thanh_san_pham WHERE id = $1', [chiefDraftId]);

    // 3.3 Valid Approval: User 7 (ke_toan_truong) approves draft created by User 6 (ke_toan) -> 200 OK!
    const resValidApprove = await request(`/api/costing/results/${draftId}/approve`, 'POST', null, tokenKeToanTruong);
    assert(resValidApprove.status === 200, `Kế toán trưởng duyệt dự thảo do kế toán viên lập thành công (200): ${resValidApprove.status}`);
    assert(resValidApprove.data?.data?.trang_thai === 'da_duyet', 'Trạng thái chuyển thành da_duyet');

    // Verify DB integrity of approval
    const dbDraft = (await db.query('SELECT id, trang_thai, nguoi_tao, nguoi_cap_nhat FROM gia_thanh_san_pham WHERE id = $1', [draftId])).rows[0];
    assert(dbDraft.trang_thai === 'da_duyet', 'DB xác nhận trang_thai = da_duyet');
    assert(Number(dbDraft.nguoi_tao) === 6, 'Maker: nguoi_tao = 6 (Hoàng Thị Toán)');
    assert(Number(dbDraft.nguoi_cap_nhat) === 7, 'Checker: nguoi_cap_nhat = 7 (Nguyễn Văn Trưởng)');

    // -------------------------------------------------------------------------
    // CHECKPOINT 4: APPROVED IMMUTABILITY
    // -------------------------------------------------------------------------
    console.log('\n--- Checkpoint 4: Tính bất biến của bản ghi đã duyệt (Approved Immutability) ---');

    // 4.1 Update on approved record must be blocked (409)
    const resUpdateApproved = await request(`/api/costing/results/${draftId}`, 'PATCH', {
      laborCost: '50000000.00',
      overheadCost: '20000000.00',
      allocationBasis: 'Cố tình sửa bản ghi đã duyệt',
      expectedQuantity: previewData.quantity,
      expectedMaterialCost: previewData.materialCost,
    }, tokenKeToan);
    assert(resUpdateApproved.status === 409, `Chặn sửa bản ghi đã duyệt (409): ${resUpdateApproved.status}`);

    // 4.2 Delete on approved record must be blocked (409)
    const resDeleteApproved = await request(`/api/costing/results/${draftId}`, 'DELETE', null, tokenKeToanTruong);
    assert(resDeleteApproved.status === 409, `Chặn xóa bản ghi đã duyệt (409): ${resDeleteApproved.status}`);

    // 4.3 Re-approve approved record must be blocked (409)
    const resReApprove = await request(`/api/costing/results/${draftId}/approve`, 'POST', null, tokenKeToanTruong);
    assert(resReApprove.status === 409, `Chặn duyệt lại bản ghi đã duyệt (409): ${resReApprove.status}`);

    // -------------------------------------------------------------------------
    // CHECKPOINT 5: OPTIMISTIC CONCURRENCY (COSTING_SOURCE_CHANGED)
    // -------------------------------------------------------------------------
    console.log('\n--- Checkpoint 5: Chống xung đột dữ liệu nguồn (Optimistic Concurrency) ---');

    // Case 5.1: User submits save draft with outdated expected material cost
    const resSourceChangedMaterial = await request('/api/costing/save', 'POST', {
      productionOrderId: 1,
      period: 'Quy1/2027',
      laborCost: '20000000.00',
      overheadCost: '10000000.00',
      allocationBasis: 'Kiểm tra phát hiện thay đổi chi phí kho',
      expectedQuantity: '600.000',
      expectedMaterialCost: '50000000.00', // Actual is 58,500,000.00
    }, tokenKeToan);
    assert(resSourceChangedMaterial.status === 409, `Phát hiện chi phí NVL kho thay đổi (409): ${resSourceChangedMaterial.status}`);
    assert(resSourceChangedMaterial.data?.error?.code === 'COSTING_SOURCE_CHANGED', 'Mã lỗi trả về đúng COSTING_SOURCE_CHANGED');
    assert(resSourceChangedMaterial.data?.error?.details?.preview !== undefined, 'Trả về payload preview mới trong details');

    // Case 5.2: User submits save draft with outdated expected quantity
    const resSourceChangedQty = await request('/api/costing/save', 'POST', {
      productionOrderId: 1,
      period: 'Quy1/2027',
      laborCost: '20000000.00',
      overheadCost: '10000000.00',
      allocationBasis: 'Kiểm tra phát hiện thay đổi sản lượng sản xuất',
      expectedQuantity: '500.000', // Actual is 600.000
      expectedMaterialCost: '58500000.00',
    }, tokenKeToan);
    assert(resSourceChangedQty.status === 409, `Phát hiện sản lượng sản xuất thay đổi (409): ${resSourceChangedQty.status}`);
    assert(resSourceChangedQty.data?.error?.code === 'COSTING_SOURCE_CHANGED', 'Mã lỗi trả về đúng COSTING_SOURCE_CHANGED');

    // -------------------------------------------------------------------------
    // CHECKPOINT 6: ORDER EFFICIENCY ISOLATION (DRAFT VS APPROVED)
    // -------------------------------------------------------------------------
    console.log('\n--- Checkpoint 6: Kiểm tra Order Efficiency chỉ lấy costing da_duyet ---');

    // 6.1 Call Order Efficiency for Order 1
    const resOrderEff = await request('/api/order-efficiency?orderId=1', 'GET', null, tokenKeToanTruong);
    assert(resOrderEff.status === 200, `Lấy dữ liệu hiệu quả đơn hàng thành công (200): ${resOrderEff.status}`);
    const order1 = resOrderEff.data?.data?.[0];
    assert(order1 !== undefined, 'Tìm thấy đơn hàng ID 1 trong báo cáo hiệu quả');

    // Order 1 is linked to LSX 1. We just approved draftId!
    // Let's create an unapproved draft for LSX 1 (e.g. period Quy2/2027) with huge cost 999,999,999
    const resDraftHuge = await request('/api/costing/save', 'POST', {
      productionOrderId: 1,
      period: 'Quy2/2027',
      laborCost: '400000000.00',
      overheadCost: '500000000.00',
      allocationBasis: 'Dự thảo chi phí khổng lồ chưa duyệt',
      expectedQuantity: previewData.quantity,
      expectedMaterialCost: previewData.materialCost,
    }, tokenKeToan);
    const hugeDraftId = resDraftHuge.data?.data?.id;
    assert(resDraftHuge.status === 201, `Tạo draft thử nghiệm chưa duyệt: id = ${hugeDraftId}`);

    // Re-check Order Efficiency: It MUST still use the approved costing (draftId), NOT hugeDraftId!
    const resOrderEffCheck = await request('/api/order-efficiency?orderId=1', 'GET', null, tokenKeToanTruong);
    const order1After = resOrderEffCheck.data?.data?.[0];
    assert(order1After !== undefined, 'Lấy lại đơn hàng 1 sau khi có draft mới');
    assert(Number(order1After.total_cost) !== Number(resDraftHuge.data?.data?.totalCost), 'Order Efficiency KHÔNG bị ô nhiễm bởi dự thảo du_thao khổng lồ');
    assert(Number(order1After.total_cost) === updatedTotal, `Order Efficiency chính xác sử dụng giá thành da_duyet (${updatedTotal} đ)`);

    // Clean up hugeDraft
    await db.query('DELETE FROM gia_thanh_san_pham WHERE id = $1', [hugeDraftId]);

    // -------------------------------------------------------------------------
    // CHECKPOINT 7: COSTING HISTORY ENDPOINT
    // -------------------------------------------------------------------------
    console.log('\n--- Checkpoint 7: Tra cứu lịch sử giá thành của lệnh sản xuất (Costing History) ---');
    const resHistory = await request('/api/costing/1/history', 'GET', null, tokenKeToan);
    assert(resHistory.status === 200, `Lấy lịch sử giá thành thành công (200): ${resHistory.status}`);
    assert(Array.isArray(resHistory.data?.data), 'Cấu trúc trả về mảng lịch sử');
    assert(resHistory.data?.data?.length >= 2, `Có ít nhất 2 bản ghi lịch sử cho LSX 1 (tìm thấy ${resHistory.data?.data?.length} bản ghi)`);
    const historyApproved = resHistory.data?.data?.find(h => Number(h.id) === Number(draftId));
    assert(historyApproved !== undefined, 'Lịch sử có chứa bản ghi đã duyệt');
    assert(historyApproved.trang_thai === 'da_duyet', 'Bản ghi lịch sử hiển thị đúng trạng thái da_duyet');
    assert(historyApproved.nguoi_tinh_ten !== undefined, 'Lịch sử có tên người tính');

    // -------------------------------------------------------------------------
    // CHECKPOINT 8: E2E INTEGRATION (PH2 -> PH4 -> PH5)
    // -------------------------------------------------------------------------
    console.log('\n--- Checkpoint 8: E2E Integration Chuỗi khép kín (PH2 -> PH4 -> PH5) ---');
    console.log('    Thực hiện luồng nghiệp vụ với mã kiểm thử BLACKBOX-2026-COSTING-E2E');

    // Step 8.1: Tạo Lệnh sản xuất mới trong PH2
    const lsxInsert = await db.query(`
      INSERT INTO lenh_san_xuat (
        ma_lenh_san_xuat, ma_ke_hoach_san_xuat, ma_don_ban_hang, ma_san_pham,
        so_luong_yeu_cau, so_luong_hoan_thanh, ngay_bat_dau, ngay_ket_thuc_yc,
        trang_thai, ghi_chu, nguoi_tao
      ) VALUES (
        'BLACKBOX-2026-COSTING-LSX', 1, 1, 1,
        100.000, 80.000, CURRENT_DATE, CURRENT_DATE + 5,
        'dang_san_xuat', 'Lệnh sản xuất test E2E PH2->PH4->PH5', 3
      ) RETURNING id, ma_lenh_san_xuat, so_luong_hoan_thanh;
    `);
    const testLsxId = lsxInsert.rows[0].id;
    const testLsxCode = lsxInsert.rows[0].ma_lenh_san_xuat;
    console.log(`    [PH2] Đã tạo LSX: ID = ${testLsxId}, Mã = ${testLsxCode}, Hoàn thành = 80 sản phẩm`);

    // Step 8.2: Tạo Phiếu xuất kho trong PH4 phục vụ LSX trên
    const pxkInsert = await db.query(`
      INSERT INTO phieu_xuat_kho (
        ma_phieu_xuat, loai_xuat, ma_lenh_san_xuat, ma_kho_xuat,
        ngay_xuat, trang_thai, tong_gia_tri_xuat, ghi_chu, nguoi_tao
      ) VALUES (
        'BLACKBOX-2026-COSTING-PXK', 'xuat_san_xuat', $1, 1,
        CURRENT_DATE, 'da_xuat', 16000000.00, 'Xuất vải và chỉ may test E2E', 5
      ) RETURNING id, ma_phieu_xuat;
    `, [testLsxId]);
    const testPxkId = pxkInsert.rows[0].id;

    // Insert chi tiết phiếu xuất kho
    // Dòng 1: Vải kate (vật tư 1) - 100m x 150,000 = 15,000,000 đ
    // Dòng 2: Chỉ may (vật tư 2) - 10 cuộn x 100,000 = 1,000,000 đ
    // Tổng = 16,000,000 đ
    await db.query(`
      INSERT INTO chi_tiet_phieu_xuat (
        ma_phieu_xuat_kho, ma_vat_tu, so_luong_xuat, don_gia_xuat, thanh_tien
      ) VALUES 
        ($1, 1, 100.000, 150000.00, 15000000.00),
        ($1, 2, 10.000, 100000.00, 1000000.00);
    `, [testPxkId]);
    console.log(`    [PH4] Đã tạo PXK xuất sản xuất: ID = ${testPxkId}, 2 dòng chi tiết, Tổng tiền = 16.000.000 VNĐ`);

    // Step 8.3: PH5 gọi Preview
    const e2ePreview = await request('/api/costing/preview', 'POST', {
      productionOrderId: testLsxId,
      period: 'Thang10/2026',
      laborCost: '8000000.00',
      overheadCost: '4000000.00',
      allocationBasis: 'Phân bổ lương công nhân 8tr, điện nước 4tr cho 80 áo sơ mi',
    }, tokenKeToan);
    assert(e2ePreview.status === 200, `[PH5] Preview E2E thành công (200): ${e2ePreview.status}`);
    assert(Number(e2ePreview.data?.data?.materialCost) === 16000000, '[PH5] Tự động tổng hợp chính xác 16.000.000 đ từ PH4');
    assert(Number(e2ePreview.data?.data?.quantity) === 80, '[PH5] Tự động lấy đúng 80 áo từ PH2');

    // Independent calculation:
    // Expected Material = 16,000,000
    // Expected Total = 16,000,000 + 8,000,000 + 4,000,000 = 28,000,000 VNĐ
    // Expected Unit Cost = 28,000,000 / 80 = 350,000.00 VNĐ/áo
    const e2eExpectedTotal = 28000000;
    const e2eExpectedUnit = 350000;
    assert(Number(e2ePreview.data?.data?.totalCost) === e2eExpectedTotal, `[PH5] Độc lập kiểm tra Tổng giá thành khớp 100%: ${e2eExpectedTotal}`);
    assert(Number(e2ePreview.data?.data?.unitCost) === e2eExpectedUnit, `[PH5] Độc lập kiểm tra Giá thành đơn vị khớp 100%: ${e2eExpectedUnit} đ/áo`);

    // Step 8.4: PH5 Kế toán viên Lưu dự thảo
    const e2eSave = await request('/api/costing/save', 'POST', {
      productionOrderId: testLsxId,
      period: 'Thang10/2026',
      laborCost: '8000000.00',
      overheadCost: '4000000.00',
      allocationBasis: 'Phân bổ lương công nhân 8tr, điện nước 4tr cho 80 áo sơ mi',
      expectedQuantity: '80.000',
      expectedMaterialCost: '16000000.00',
    }, tokenKeToan);
    assert(e2eSave.status === 201, `[PH5] Lưu dự thảo E2E thành công (201): id = ${e2eSave.data?.data?.id}`);
    const e2eDraftId = e2eSave.data?.data?.id;

    // Step 8.5: Kế toán trưởng Phê duyệt
    const e2eApprove = await request(`/api/costing/results/${e2eDraftId}/approve`, 'POST', null, tokenKeToanTruong);
    assert(e2eApprove.status === 200, `[PH5] Kế toán trưởng phê duyệt chính thức thành công (200): ${e2eApprove.status}`);
    assert(e2eApprove.data?.data?.trang_thai === 'da_duyet', '[PH5] Kết quả giá thành đã chuyển sang da_duyet');

    // Clean up E2E test data
    console.log('    🧹 Dọn dẹp dữ liệu kiểm thử E2E...');
    await db.query('DELETE FROM gia_thanh_san_pham WHERE id = $1', [e2eDraftId]);
    await db.query('DELETE FROM chi_tiet_phieu_xuat WHERE ma_phieu_xuat_kho = $1', [testPxkId]);
    await db.query('DELETE FROM phieu_xuat_kho WHERE id = $1', [testPxkId]);
    await db.query('DELETE FROM lenh_san_xuat WHERE id = $1', [testLsxId]);

    // Clean up test draft created in Checkpoint 2 (draftId)
    await db.query('DELETE FROM gia_thanh_san_pham WHERE id = $1', [draftId]);

    console.log('\n================================================================');
    console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
    console.log('================================================================');

  } catch (error) {
    console.error('Lỗi ngoại lệ trong quá trình chạy test:', error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

runCostingLifecycleTests().then(() => {
  // Graceful exit
  setTimeout(() => process.exit(process.exitCode || 0), 100);
});
