const { pool } = require('../config/database');

function businessError(status, message, code, details) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  if (details) error.details = details;
  return error;
}

function requiredId(value) {
  const normalized = String(value ?? '').trim();
  if (!/^[1-9]\d{0,18}$/.test(normalized)) {
    throw businessError(400, 'Lệnh sản xuất không hợp lệ.');
  }
  return normalized;
}

function decimal(value, label, scale = 2) {
  const normalized = String(value ?? '').trim();
  const pattern = new RegExp(`^(?:0|[1-9]\\d*)(?:\\.\\d{1,${scale}})?$`);
  if (!pattern.test(normalized)) {
    throw businessError(400, `${label} phải là số không âm, tối đa ${scale} chữ số thập phân.`);
  }
  return normalized;
}

function period(value) {
  const normalized = String(value ?? '').trim();
  if (!/^(?:Thang(?:0[1-9]|1[0-2])\/\d{4}|Quy[1-4]\/\d{4}|Nam\d{4})$/.test(normalized)) {
    throw businessError(400, 'Kỳ tính giá thành không hợp lệ.');
  }
  return normalized;
}

function note(value, required) {
  if (typeof value !== 'string') throw businessError(400, 'Căn cứ phân bổ không hợp lệ.');
  const normalized = value.trim();
  if (required && !normalized) throw businessError(400, 'Căn cứ phân bổ là bắt buộc khi lưu kết quả.');
  if (normalized.length > 2000) throw businessError(400, 'Căn cứ phân bổ không được vượt quá 2.000 ký tự.');
  return normalized;
}

function validateCostingInput(input, { forSave = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw businessError(400, 'Dữ liệu tính giá thành không hợp lệ.');
  }
  const allowed = ['productionOrderId', 'period', 'laborCost', 'overheadCost', 'allocationBasis', 'expectedQuantity', 'expectedMaterialCost'];
  if (Object.keys(input).some((key) => !allowed.includes(key))) {
    throw businessError(400, 'Dữ liệu có trường không được phép.');
  }
  const result = {
    productionOrderId: requiredId(input.productionOrderId),
    period: period(input.period),
    laborCost: decimal(input.laborCost, 'Chi phí nhân công trực tiếp'),
    overheadCost: decimal(input.overheadCost, 'Chi phí sản xuất chung'),
    allocationBasis: note(input.allocationBasis ?? '', forSave),
  };
  if (forSave) {
    result.expectedQuantity = decimal(input.expectedQuantity, 'Sản lượng đã xem trước', 3);
    result.expectedMaterialCost = decimal(input.expectedMaterialCost, 'Chi phí NVL đã xem trước');
  }
  return result;
}

async function sourceData(client, productionOrderId, lock = false) {
  const order = (await client.query(
    `SELECT lsx.id, lsx.ma_lenh_san_xuat, lsx.ma_san_pham AS san_pham_id,
            lsx.so_luong_hoan_thanh::text AS quantity,
            sp.ma_san_pham, sp.ten_san_pham
       FROM public.lenh_san_xuat lsx
       JOIN public.san_pham sp ON sp.id = lsx.ma_san_pham
      WHERE lsx.id = $1${lock ? ' FOR UPDATE OF lsx' : ''}`,
    [productionOrderId],
  )).rows[0];
  if (!order) throw businessError(404, 'Không tìm thấy lệnh sản xuất hoặc sản phẩm liên quan.');
  if (!order.quantity || Number(order.quantity) <= 0) {
    throw businessError(409, 'Lệnh sản xuất chưa có sản lượng hoàn thành hợp lệ.');
  }

  const material = (await client.query(
    `SELECT count(*)::int AS source_line_count,
            COALESCE(sum(ct.thanh_tien), 0)::numeric(18,2)::text AS material_cost
       FROM public.phieu_xuat_kho px
       JOIN public.chi_tiet_phieu_xuat ct ON ct.ma_phieu_xuat_kho = px.id
      WHERE px.ma_lenh_san_xuat = $1
        AND px.loai_xuat = 'xuat_san_xuat'
        AND px.trang_thai = 'da_xuat'`,
    [productionOrderId],
  )).rows[0];
  if (!material || Number(material.source_line_count) <= 0 || Number(material.material_cost) < 0) {
    throw businessError(409, 'Lệnh sản xuất chưa có nguồn chi phí nguyên vật liệu hợp lệ.');
  }
  return { ...order, ...material };
}

async function computedPreview(client, input, { lock = false } = {}) {
  const source = await sourceData(client, input.productionOrderId, lock);
  const amounts = (await client.query(
    `SELECT ($1::numeric + $2::numeric + $3::numeric)::numeric(18,2)::text AS total_cost,
            round(($1::numeric + $2::numeric + $3::numeric) / $4::numeric, 2)::numeric(18,2)::text AS unit_cost`,
    [source.material_cost, input.laborCost, input.overheadCost, source.quantity],
  )).rows[0];
  return {
    productionOrderId: source.id,
    productionOrderCode: source.ma_lenh_san_xuat,
    productId: source.san_pham_id,
    productCode: source.ma_san_pham,
    productName: source.ten_san_pham,
    period: input.period,
    quantity: source.quantity,
    sourceLineCount: source.source_line_count,
    materialCost: source.material_cost,
    laborCost: input.laborCost,
    overheadCost: input.overheadCost,
    totalCost: amounts.total_cost,
    unitCost: amounts.unit_cost,
    allocationBasis: input.allocationBasis,
  };
}

async function previewCostingWithClient(client, rawInput) {
  return computedPreview(client, validateCostingInput(rawInput));
}

async function saveCostingWithClient(client, rawInput, user) {
  const input = validateCostingInput(rawInput, { forSave: true });
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`costing:${input.productionOrderId}:${input.period}`]);
  const preview = await computedPreview(client, input, { lock: true });

  if (Number(preview.quantity) !== Number(input.expectedQuantity)
      || Number(preview.materialCost) !== Number(input.expectedMaterialCost)) {
    throw businessError(
      409,
      'Dữ liệu nguồn đã thay đổi sau khi xem trước. Vui lòng kiểm tra và xác nhận lại kết quả mới.',
      'COSTING_SOURCE_CHANGED',
      { preview },
    );
  }

  const duplicate = (await client.query(
    `SELECT id FROM public.gia_thanh_san_pham
      WHERE ma_lenh_san_xuat = $1 AND ky_tinh_gia_thanh = $2 AND trang_thai = 'du_thao'
      LIMIT 1 FOR UPDATE`,
    [input.productionOrderId, input.period],
  )).rows[0];
  if (duplicate) {
    throw businessError(409, 'Đã tồn tại một dự thảo giá thành đang làm việc cho lệnh sản xuất trong kỳ này.');
  }

  const userId = user?.id || null;
  const saved = (await client.query(
    `INSERT INTO public.gia_thanh_san_pham
      (ma_san_pham, ma_lenh_san_xuat, ky_tinh_gia_thanh, so_luong_san_xuat,
       chi_phi_vat_lieu_truc_tiep, chi_phi_nhan_cong_truc_tiep,
       chi_phi_san_xuat_chung, tong_chi_phi, gia_thanh_don_vi,
       ghi_chu, trang_thai, nguoi_tinh, nguoi_tao, ngay_tao, ngay_cap_nhat)
     VALUES ($1, $2, $3, $4::numeric, $5::numeric, $6::numeric, $7::numeric,
             $8::numeric, $9::numeric, $10, 'du_thao', $11, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id, ma_lenh_san_xuat, ky_tinh_gia_thanh, trang_thai, ngay_tao, nguoi_tinh, nguoi_tao`,
    [preview.productId, input.productionOrderId, input.period, preview.quantity,
      preview.materialCost, input.laborCost, input.overheadCost, preview.totalCost,
      preview.unitCost, input.allocationBasis, userId],
  )).rows[0];
  return { ...preview, id: saved.id, status: saved.trang_thai, createdAt: saved.ngay_tao, createdBy: saved.nguoi_tao };
}

function snapshotId(value) {
  const normalized = String(value ?? '').trim();
  if (!/^[1-9]\d{0,18}$/.test(normalized)) throw businessError(400, 'ID kết quả giá thành không hợp lệ.');
  return normalized;
}

function validateDraftChange(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw businessError(400, 'Dữ liệu sửa dự thảo không hợp lệ.');
  const allowed = ['laborCost', 'overheadCost', 'allocationBasis', 'expectedQuantity', 'expectedMaterialCost', 'confirmSourceChange'];
  if (Object.keys(input).some((key) => !allowed.includes(key))) throw businessError(400, 'Dữ liệu có trường không được phép.');
  return {
    laborCost: decimal(input.laborCost, 'Chi phí nhân công trực tiếp'),
    overheadCost: decimal(input.overheadCost, 'Chi phí sản xuất chung'),
    allocationBasis: note(input.allocationBasis ?? '', true),
    expectedQuantity: decimal(input.expectedQuantity, 'Sản lượng đã xác nhận', 3),
    expectedMaterialCost: decimal(input.expectedMaterialCost, 'Chi phí NVL đã xác nhận'),
    confirmSourceChange: input.confirmSourceChange === true,
  };
}

async function lockedDraft(client, id) {
  const snapshot = (await client.query('SELECT * FROM public.gia_thanh_san_pham WHERE id=$1 FOR UPDATE', [snapshotId(id)])).rows[0];
  if (!snapshot) throw businessError(404, 'Không tìm thấy kết quả giá thành.');
  if (snapshot.trang_thai !== 'du_thao') throw businessError(409, 'Chỉ kết quả giá thành ở trạng thái Dự thảo mới được sửa hoặc xóa.');
  return snapshot;
}

async function updateCostingDraftWithClient(client, id, rawInput, user) {
  const input = validateDraftChange(rawInput);
  const snapshot = await lockedDraft(client, id);
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`costing:${snapshot.ma_lenh_san_xuat}:${snapshot.ky_tinh_gia_thanh}`]);
  const preview = await computedPreview(client, {
    productionOrderId: String(snapshot.ma_lenh_san_xuat), period: snapshot.ky_tinh_gia_thanh,
    laborCost: input.laborCost, overheadCost: input.overheadCost, allocationBasis: input.allocationBasis,
  }, { lock: true });
  const changedFromSnapshot = Number(preview.quantity) !== Number(snapshot.so_luong_san_xuat)
    || Number(preview.materialCost) !== Number(snapshot.chi_phi_vat_lieu_truc_tiep);
  const changedAfterConfirmation = Number(preview.quantity) !== Number(input.expectedQuantity)
    || Number(preview.materialCost) !== Number(input.expectedMaterialCost);
  if (changedAfterConfirmation || (changedFromSnapshot && !input.confirmSourceChange)) {
    throw businessError(409, 'Dữ liệu nguồn hiện tại khác với snapshot dự thảo. Vui lòng kiểm tra và xác nhận lại trước khi cập nhật.', 'COSTING_SOURCE_CHANGED', { preview });
  }
  const userId = user?.id || null;
  const saved = (await client.query(`UPDATE public.gia_thanh_san_pham SET
      so_luong_san_xuat=$2::numeric,chi_phi_vat_lieu_truc_tiep=$3::numeric,
      chi_phi_nhan_cong_truc_tiep=$4::numeric,chi_phi_san_xuat_chung=$5::numeric,
      tong_chi_phi=$6::numeric,gia_thanh_don_vi=$7::numeric,ghi_chu=$8,
      nguoi_cap_nhat=$9,ngay_cap_nhat=now()
    WHERE id=$1 RETURNING id,trang_thai,ngay_cap_nhat,nguoi_cap_nhat`,
  [snapshot.id,preview.quantity,preview.materialCost,input.laborCost,input.overheadCost,preview.totalCost,preview.unitCost,input.allocationBasis,userId])).rows[0];
  return { ...preview, id: saved.id, status: saved.trang_thai, updatedAt: saved.ngay_cap_nhat, updatedBy: saved.nguoi_cap_nhat };
}

async function deleteCostingDraftWithClient(client, id) {
  const snapshot = await lockedDraft(client, id);
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`costing:${snapshot.ma_lenh_san_xuat}:${snapshot.ky_tinh_gia_thanh}`]);
  await client.query('DELETE FROM public.gia_thanh_san_pham WHERE id=$1', [snapshot.id]);
  return { id: snapshot.id };
}

async function approveCostingDraftWithClient(client, id, user) {
  const snapshot = await lockedDraft(client, id);

  // Maker-Checker SoD enforcement: Creator cannot approve their own draft (unless admin override)
  if (snapshot.nguoi_tao && user?.id && String(snapshot.nguoi_tao) === String(user.id) && user.vai_tro !== 'admin') {
    throw businessError(403, 'Quy tắc Maker-Checker (SoD): Người lập dự thảo không được tự phê duyệt kết quả giá thành.');
  }

  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`costing:${snapshot.ma_lenh_san_xuat}:${snapshot.ky_tinh_gia_thanh}`]);
  const source = await sourceData(client, String(snapshot.ma_lenh_san_xuat), true);
  if (Number(source.quantity) !== Number(snapshot.so_luong_san_xuat)
      || Number(source.material_cost) !== Number(snapshot.chi_phi_vat_lieu_truc_tiep)) {
    throw businessError(409, 'Dữ liệu nguồn đã thay đổi so với dự thảo. Vui lòng cập nhật và kiểm tra lại dự thảo trước khi duyệt.', 'COSTING_SOURCE_CHANGED', {
      currentSource: { quantity: source.quantity, materialCost: source.material_cost },
    });
  }
  const userId = user?.id || null;
  const approved = (await client.query(`UPDATE public.gia_thanh_san_pham
    SET trang_thai='da_duyet', nguoi_cap_nhat=$2, ngay_cap_nhat=now()
    WHERE id=$1 AND trang_thai='du_thao'
    RETURNING id,trang_thai,ngay_cap_nhat,nguoi_cap_nhat`, [snapshot.id, userId])).rows[0];
  if (!approved) throw businessError(409, 'Dự thảo không còn ở trạng thái có thể duyệt.');
  return approved;
}

async function transaction(work, isolation) {
  const client = await pool.connect();
  try {
    await client.query(`BEGIN ISOLATION LEVEL ${isolation}`);
    const value = await work(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error?.code === '40001') {
      throw businessError(409, 'Dữ liệu nguồn vừa thay đổi. Vui lòng xem trước lại kết quả.');
    }
    throw error;
  } finally {
    client.release();
  }
}

function previewCosting(rawInput) {
  return transaction((client) => previewCostingWithClient(client, rawInput), 'REPEATABLE READ READ ONLY');
}

function saveCosting(rawInput, user) {
  return transaction((client) => saveCostingWithClient(client, rawInput, user), 'SERIALIZABLE');
}

function updateCostingDraft(id, rawInput, user) {
  return transaction((client) => updateCostingDraftWithClient(client, id, rawInput, user), 'SERIALIZABLE');
}

function deleteCostingDraft(id, user) {
  return transaction((client) => deleteCostingDraftWithClient(client, id, user), 'SERIALIZABLE');
}

function approveCostingDraft(id, user) {
  return transaction((client) => approveCostingDraftWithClient(client, id, user), 'SERIALIZABLE');
}

module.exports = {
  validateCostingInput,
  previewCosting,
  saveCosting,
  updateCostingDraft,
  deleteCostingDraft,
  approveCostingDraft,
  previewCostingWithClient,
  saveCostingWithClient,
  updateCostingDraftWithClient,
  deleteCostingDraftWithClient,
  approveCostingDraftWithClient,
};
