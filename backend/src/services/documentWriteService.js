const { pool } = require('../config/database');

function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
function validId(id) {
  if (typeof id !== 'string' || !/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) fail(400, 'ID chứng từ không hợp lệ.');
  return id;
}
const fields = ['ma_chung_tu', 'loai_chung_tu', 'ngay_chung_tu', 'so_tien', 'mo_ta', 'file_dinh_kem'];
const required = fields.slice(0, 4);
function validateDocument(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Nội dung chứng từ không hợp lệ.');
  if (!Object.keys(body).length || Object.keys(body).some((key) => !fields.includes(key))) fail(400, 'Chỉ được gửi các trường nghiệp vụ cho phép; không được ghi ID, trạng thái hoặc trường hệ thống.');
  if (!partial && required.some((key) => !(key in body))) fail(400, 'Thiếu mã, loại, ngày chứng từ hoặc số tiền.');
  const data = {};
  for (const key of Object.keys(body)) {
    const value = body[key];
    if (['mo_ta', 'file_dinh_kem'].includes(key)) {
      if (value !== null && typeof value !== 'string') fail(400, `${key} phải là văn bản hoặc null.`);
      const max = key === 'mo_ta' ? 10000 : 2000;
      if (value?.length > max) fail(400, `${key} vượt giới hạn ${max} ký tự.`);
      data[key] = value?.trim() || null;
    } else if (['ma_chung_tu', 'loai_chung_tu'].includes(key)) {
      if (typeof value !== 'string' || !value.trim() || [...value.trim()].length > 50) fail(400, `${key} bắt buộc và tối đa 50 ký tự.`);
      data[key] = value.trim();
    } else if (key === 'so_tien') {
      if (typeof value !== 'string' || !/^\d{1,16}(\.\d{1,2})?$/.test(value)) fail(400, 'Số tiền phải là chuỗi số không âm, tối đa 16 chữ số nguyên và 2 chữ số thập phân.');
      data[key] = value;
    } else {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) fail(400, 'Ngày chứng từ phải là thời gian ISO có múi giờ.');
      const day = value.slice(0, 10);
      if (day < '0001-01-01' || new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) fail(400, 'Ngày chứng từ không tồn tại.');
      if (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59) fail(400, 'Giờ chứng từ không hợp lệ.');
      data[key] = value;
    }
  }
  return data;
}

async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') fail(409, 'Mã chứng từ đã tồn tại. Vui lòng sử dụng mã khác.');
    if (error.code === '23503') fail(409, 'Chứng từ đang được dữ liệu khác tham chiếu; không thể thực hiện thao tác.');
    throw error;
  } finally { client.release(); }
}

async function lockEditable(client, id) {
  // Serialize document writes, including logical self-references without a FK.
  await client.query('LOCK TABLE public.chung_tu_goc IN SHARE ROW EXCLUSIVE MODE');
  const result = await client.query('SELECT id, trang_thai, ma_chung_tu_lien_quan, bang_chung_tu_lien_quan FROM public.chung_tu_goc WHERE id = $1 FOR UPDATE', [id]);
  if (!result.rows.length) fail(404, 'Không tìm thấy chứng từ.');
  // FOR UPDATE also conflicts with the FK key-share lock when a journal is added.
  const entries = await client.query('SELECT 1 FROM public.nhat_ky_hach_toan WHERE ma_chung_tu_goc = $1 LIMIT 1', [id]);
  if (entries.rows.length) fail(409, 'Chứng từ đã liên kết với bút toán. Không được sửa hoặc xóa; các bút toán được giữ nguyên.');
  const record = result.rows[0];
  if (record.trang_thai !== 'hieu_luc') fail(409, 'Trạng thái hiện tại chưa có quy tắc sửa/xóa được xác nhận. Thao tác bị chặn.');
  if (record.ma_chung_tu_lien_quan !== null || record.bang_chung_tu_lien_quan !== null) fail(409, 'Chứng từ có tham chiếu nguồn. Chưa đủ quan hệ ràng buộc để sửa/xóa an toàn.');
  const incoming = await client.query("SELECT 1 FROM public.chung_tu_goc WHERE ma_chung_tu_lien_quan = $1 AND bang_chung_tu_lien_quan IN ('chung_tu_goc', 'public.chung_tu_goc') LIMIT 1", [id]);
  if (incoming.rows.length) fail(409, 'Chứng từ đang được chứng từ khác tham chiếu. Không được sửa/xóa.');
}

function createDocument(data, userId = null) {
  return transaction(async (client) => {
    const result = await client.query(`INSERT INTO public.chung_tu_goc
      (ma_chung_tu, loai_chung_tu, ngay_chung_tu, so_tien, mo_ta, file_dinh_kem, nguoi_tao)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, ma_chung_tu`,
    [data.ma_chung_tu, data.loai_chung_tu, data.ngay_chung_tu, data.so_tien, data.mo_ta ?? null, data.file_dinh_kem ?? null, userId ?? null]);
    return result.rows[0];
  });
}
function updateDocument(id, data) {
  return transaction(async (client) => {
    await lockEditable(client, id);
    // Column identifiers can only originate from this fixed allowlist.
    const keys = fields.filter((key) => Object.hasOwn(data, key));
    const assignments = keys.map((key, index) => `${key} = $${index + 2}`);
    const result = await client.query(`UPDATE public.chung_tu_goc SET ${assignments.join(', ')}, ngay_cap_nhat = now(), nguoi_cap_nhat = NULL WHERE id = $1 RETURNING id, ma_chung_tu`, [id, ...keys.map((key) => data[key])]);
    return result.rows[0];
  });
}
function deleteDocument(id) {
  return transaction(async (client) => {
    await lockEditable(client, id);
    await client.query('DELETE FROM public.chung_tu_goc WHERE id = $1', [id]);
  });
}

function approveDocument(id, user) {
  return transaction(async (client) => {
    const docResult = await client.query('SELECT id, ma_chung_tu, nguoi_tao, trang_thai FROM public.chung_tu_goc WHERE id = $1 FOR UPDATE', [id]);
    if (!docResult.rows.length) fail(404, 'Không tìm thấy chứng từ.');
    const doc = docResult.rows[0];

    // Separation of Duties (SoD) Check: Maker cannot be Checker (except Admin)
    if (user && user.role !== 'admin' && doc.nguoi_tao && Number(doc.nguoi_tao) === Number(user.id)) {
      fail(403, 'Nguyên tắc Bất kiêm nhiệm: Người lập không được tự phê duyệt chứng từ của chính mình.');
    }

    const result = await client.query(
      `UPDATE public.chung_tu_goc
       SET trang_thai = 'hieu_luc', ngay_cap_nhat = now(), nguoi_cap_nhat = $2
       WHERE id = $1
       RETURNING id, ma_chung_tu, loai_chung_tu, ngay_chung_tu, so_tien, trang_thai, nguoi_cap_nhat, ngay_cap_nhat`,
      [id, user?.id ?? null]
    );
    return result.rows[0];
  });
}

module.exports = { fail, validId, validateDocument, createDocument, updateDocument, deleteDocument, approveDocument };
