const { pool } = require('../config/database');

function businessError(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function postingCodeYear(date) {
  return new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(date);
}

function validateSourceDocumentStatus(document) {
  if (document.trang_thai !== 'hieu_luc') {
    businessError(409, 'Chứng từ nguồn không còn hiệu lực và không thể hạch toán.');
  }
}

async function createJournalEntry(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const documentResult = await client.query(`SELECT id, ma_chung_tu, so_tien, trang_thai
      FROM public.chung_tu_goc WHERE id = $1 FOR UPDATE`, [data.documentId]);
    const document = documentResult.rows[0];
    if (!document) businessError(404, 'Không tìm thấy chứng từ nguồn.');
    validateSourceDocumentStatus(document);

    const duplicate = await client.query('SELECT id, ma_hach_toan FROM public.nhat_ky_hach_toan WHERE ma_chung_tu_goc = $1 LIMIT 1', [data.documentId]);
    if (duplicate.rows.length) businessError(409, `Chứng từ ${document.ma_chung_tu} đã được hạch toán bằng bút toán ${duplicate.rows[0].ma_hach_toan}.`);
    const amountCheck = await client.query('SELECT $1::numeric > $2::numeric AS exceeds', [data.amount, document.so_tien]);
    if (amountCheck.rows[0].exceeds) businessError(400, 'Số tiền hạch toán không được vượt quá số tiền của chứng từ nguồn.');

    const accounts = await client.query(`SELECT id, so_tai_khoan, cho_phep_hach_toan, trang_thai
      FROM public.he_thong_tai_khoan WHERE id = ANY($1::bigint[])`, [[data.debitAccountId, data.creditAccountId]]);
    if (accounts.rows.length !== 2) businessError(400, 'Tài khoản Nợ hoặc tài khoản Có không tồn tại.');
    if (accounts.rows.some((account) => account.cho_phep_hach_toan !== 'co' || account.trang_thai !== 'hoat_dong')) {
      businessError(400, 'Chỉ được chọn tài khoản đang hoạt động và cho phép hạch toán.');
    }

    const postingDate = new Date();
    const year = postingCodeYear(postingDate);
    await client.query("SELECT pg_advisory_xact_lock(hashtext('nhat_ky_hach_toan:' || $1))", [year]);
    const sequence = await client.query(`SELECT coalesce(max(
      CASE WHEN ma_hach_toan ~ $1 THEN substring(ma_hach_toan from '[0-9]+$')::int END
    ), 0) + 1 AS next_number FROM public.nhat_ky_hach_toan`, [`^BT-${year}-[0-9]+$`]);
    const code = `BT-${year}-${String(sequence.rows[0].next_number).padStart(3, '0')}`;
    const period = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).format(postingDate);
    const result = await client.query(`INSERT INTO public.nhat_ky_hach_toan
      (ma_hach_toan, ma_chung_tu_goc, ngay_hach_toan, tai_khoan_no, tai_khoan_co,
       so_tien, mo_ta, ky_ke_toan, trang_thai, nguoi_hach_toan, nguoi_phe_duyet,
       nguoi_tao, nguoi_cap_nhat)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'da_hach_toan', $9, NULL, $9, NULL)
      RETURNING id, ma_hach_toan, ma_chung_tu_goc, ngay_hach_toan, tai_khoan_no,
        tai_khoan_co, so_tien, mo_ta, ky_ke_toan, trang_thai, nguoi_hach_toan, nguoi_phe_duyet`,
      [code, data.documentId, postingDate, data.debitAccountId, data.creditAccountId, data.amount, data.description, period, data.userId ?? null]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateJournalEntry(id, changes) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const journalResult = await client.query(`SELECT id, ma_hach_toan, ma_chung_tu_goc,
      tai_khoan_no, tai_khoan_co, so_tien, mo_ta
      FROM public.nhat_ky_hach_toan WHERE id = $1 FOR UPDATE`, [id]);
    const journal = journalResult.rows[0];
    if (!journal) businessError(404, 'Không tìm thấy bút toán.');

    const documentResult = await client.query(`SELECT id, ma_chung_tu, so_tien, trang_thai
      FROM public.chung_tu_goc WHERE id = $1 FOR SHARE`, [journal.ma_chung_tu_goc]);
    const document = documentResult.rows[0];
    if (!document) businessError(409, 'Chứng từ nguồn của bút toán không còn tồn tại.');
    validateSourceDocumentStatus(document);

    const debitAccountId = changes.debitAccountId ?? String(journal.tai_khoan_no);
    const creditAccountId = changes.creditAccountId ?? String(journal.tai_khoan_co);
    const amount = changes.amount ?? String(journal.so_tien);
    const description = changes.description ?? journal.mo_ta;
    if (debitAccountId === creditAccountId) businessError(400, 'Tài khoản Nợ và tài khoản Có phải khác nhau.');
    if (!description?.trim()) businessError(400, 'Diễn giải là bắt buộc.');

    const amountCheck = await client.query('SELECT $1::numeric > 0 AS positive, $1::numeric > $2::numeric AS exceeds', [amount, document.so_tien]);
    if (!amountCheck.rows[0].positive) businessError(400, 'Số tiền phải lớn hơn 0.');
    if (amountCheck.rows[0].exceeds) businessError(400, 'Số tiền hạch toán không được vượt quá số tiền của chứng từ nguồn.');

    const accounts = await client.query(`SELECT id, cho_phep_hach_toan, trang_thai
      FROM public.he_thong_tai_khoan WHERE id = ANY($1::bigint[])`, [[debitAccountId, creditAccountId]]);
    if (accounts.rows.length !== 2) businessError(400, 'Tài khoản Nợ hoặc tài khoản Có không tồn tại.');
    if (accounts.rows.some((account) => account.cho_phep_hach_toan !== 'co' || account.trang_thai !== 'hoat_dong')) {
      businessError(400, 'Chỉ được chọn tài khoản đang hoạt động và cho phép hạch toán.');
    }

    const result = await client.query(`UPDATE public.nhat_ky_hach_toan
      SET tai_khoan_no = $2, tai_khoan_co = $3, so_tien = $4, mo_ta = $5,
          ngay_cap_nhat = now(), nguoi_cap_nhat = NULL
      WHERE id = $1
      RETURNING id, ma_hach_toan, ma_chung_tu_goc, tai_khoan_no, tai_khoan_co, so_tien, mo_ta, trang_thai`,
    [id, debitAccountId, creditAccountId, amount, description.trim()]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function approveJournalEntry(id, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const journalResult = await client.query(`SELECT id, ma_hach_toan, ma_chung_tu_goc,
      nguoi_hach_toan, nguoi_tao, nguoi_phe_duyet, trang_thai
      FROM public.nhat_ky_hach_toan WHERE id = $1 FOR UPDATE`, [id]);
    const journal = journalResult.rows[0];
    if (!journal) businessError(404, 'Không tìm thấy bút toán.');

    // Separation of Duties (SoD) Check: Maker cannot be Checker (except Admin)
    const creatorId = journal.nguoi_tao || journal.nguoi_hach_toan;
    if (user && user.role !== 'admin' && creatorId && Number(creatorId) === Number(user.id)) {
      businessError(403, 'Nguyên tắc Bất kiêm nhiệm: Người lập không được tự phê duyệt bút toán của chính mình.');
    }

    const result = await client.query(`UPDATE public.nhat_ky_hach_toan
      SET nguoi_phe_duyet = $2, trang_thai = 'da_duyet', ngay_cap_nhat = now(), nguoi_cap_nhat = $2
      WHERE id = $1
      RETURNING id, ma_hach_toan, ma_chung_tu_goc, tai_khoan_no, tai_khoan_co, so_tien, mo_ta,
        trang_thai, nguoi_hach_toan, nguoi_phe_duyet, ngay_cap_nhat`,
      [id, user?.id ?? null]);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { validateSourceDocumentStatus, createJournalEntry, updateJournalEntry, approveJournalEntry };
