'use strict';

const db = require('../../config/database');

/**
 * Customer repository (ported from PH1 `repositories/customer.repository.ts`).
 * SQL is unchanged; only the module system and the database client (Core's shared
 * pool, contract §3.3) differ.
 */

const ALLOWED_CUSTOMER_SORT_COLUMNS = [
  'id',
  'ma_khach_hang',
  'ten_khach_hang',
  'loai_khach_hang',
  'tinh_thanh_pho',
  'han_muc_cong_no',
  'so_ngay_cong_no',
  'trang_thai',
  'ngay_tao',
  'ngay_cap_nhat',
];

/**
 * Lists customers with the PH1 search/filter/pagination contract.
 * @returns {Promise<{customers: object[], total: number, page: number, pageSize: number, totalPages: number}>}
 */
async function list(filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const conditions = [];
  const params = [];

  // Search across code, name, phone, tax code
  if (filters.search && filters.search.trim().length > 0) {
    params.push(`%${filters.search.trim()}%`);
    const pIdx = params.length;
    conditions.push(
      `(ma_khach_hang ILIKE $${pIdx} OR ten_khach_hang ILIKE $${pIdx} OR so_dien_thoai ILIKE $${pIdx} OR ma_so_thue ILIKE $${pIdx})`
    );
  }

  if (filters.loai_khach_hang) {
    params.push(filters.loai_khach_hang);
    conditions.push(`loai_khach_hang = $${params.length}`);
  }

  if (filters.tinh_thanh_pho && filters.tinh_thanh_pho.trim().length > 0) {
    params.push(filters.tinh_thanh_pho.trim());
    conditions.push(`tinh_thanh_pho = $${params.length}`);
  }

  if (filters.trang_thai) {
    params.push(filters.trang_thai);
    conditions.push(`trang_thai = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Whitelist sorting - never interpolate caller-supplied column names
  let sortColumn = 'ngay_tao';
  if (filters.sortBy && ALLOWED_CUSTOMER_SORT_COLUMNS.includes(filters.sortBy)) {
    sortColumn = filters.sortBy;
  }

  const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';

  // Query Total Count
  const countSql = `SELECT COUNT(*) AS total FROM khach_hang ${whereClause}`;
  const countResult = await db.query(countSql, params);
  const total = Number(countResult.rows[0]?.total || 0);
  const totalPages = Math.ceil(total / pageSize) || 1;

  // Query Paginated Items
  params.push(pageSize);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const dataSql = `
      SELECT id, ma_khach_hang, ten_khach_hang, loai_khach_hang, ma_so_thue,
             so_dien_thoai, email, dia_chi, tinh_thanh_pho, nguoi_lien_he,
             han_muc_cong_no, so_ngay_cong_no, ghi_chu, trang_thai,
             ngay_tao, ngay_cap_nhat, nguoi_tao, nguoi_cap_nhat
      FROM khach_hang
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}, id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

  const dataResult = await db.query(dataSql, params);

  return {
    customers: dataResult.rows,
    total,
    page,
    pageSize,
    totalPages,
  };
}

async function findById(id) {
  const sql = `
      SELECT id, ma_khach_hang, ten_khach_hang, loai_khach_hang, ma_so_thue,
             so_dien_thoai, email, dia_chi, tinh_thanh_pho, nguoi_lien_he,
             han_muc_cong_no, so_ngay_cong_no, ghi_chu, trang_thai,
             ngay_tao, ngay_cap_nhat, nguoi_tao, nguoi_cap_nhat
      FROM khach_hang
      WHERE id = $1
      LIMIT 1
    `;
  const result = await db.query(sql, [id]);
  return result.rows[0] || null;
}

async function findByCode(code) {
  const sql = `
      SELECT id, ma_khach_hang, ten_khach_hang, loai_khach_hang, ma_so_thue,
             so_dien_thoai, email, dia_chi, tinh_thanh_pho, nguoi_lien_he,
             han_muc_cong_no, so_ngay_cong_no, ghi_chu, trang_thai,
             ngay_tao, ngay_cap_nhat, nguoi_tao, nguoi_cap_nhat
      FROM khach_hang
      WHERE UPPER(ma_khach_hang) = UPPER($1)
      LIMIT 1
    `;
  const result = await db.query(sql, [code.trim()]);
  return result.rows[0] || null;
}

/**
 * Finds the customer that owns a tax id, so the service can reject a duplicate
 * before the database. excludeId lets an update re-send the value it already stores.
 *
 * @param {string} taxCode
 * @param {number|null} [excludeId]
 * @returns {Promise<object|null>}
 */
async function findByTaxCode(taxCode, excludeId = null) {
  const sql = `
      SELECT id, ma_khach_hang, ten_khach_hang
      FROM khach_hang
      WHERE ma_so_thue = $1
        AND ($2::bigint IS NULL OR id <> $2::bigint)
      LIMIT 1
    `;
  const result = await db.query(sql, [taxCode, excludeId]);
  return result.rows[0] || null;
}

async function create(data) {
  const sql = `
      INSERT INTO khach_hang (
        ma_khach_hang, ten_khach_hang, loai_khach_hang, ma_so_thue,
        so_dien_thoai, email, dia_chi, tinh_thanh_pho, nguoi_lien_he,
        han_muc_cong_no, so_ngay_cong_no, ghi_chu, trang_thai,
        nguoi_tao, nguoi_cap_nhat
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $14
      )
      RETURNING *
    `;
  const params = [
    data.ma_khach_hang,
    data.ten_khach_hang,
    data.loai_khach_hang,
    data.ma_so_thue || null,
    data.so_dien_thoai,
    data.email || null,
    data.dia_chi,
    data.tinh_thanh_pho,
    data.nguoi_lien_he || null,
    data.han_muc_cong_no || 0,
    data.so_ngay_cong_no || 0,
    data.ghi_chu || null,
    data.trang_thai || 'hoat_dong',
    data.nguoi_tao || null,
  ];
  const result = await db.query(sql, params);
  return result.rows[0];
}

async function update(id, data, updaterId) {
  const fields = [];
  const params = [id];

  if (data.ten_khach_hang !== undefined) {
    params.push(data.ten_khach_hang);
    fields.push(`ten_khach_hang = $${params.length}`);
  }
  if (data.loai_khach_hang !== undefined) {
    params.push(data.loai_khach_hang);
    fields.push(`loai_khach_hang = $${params.length}`);
  }
  if (data.ma_so_thue !== undefined) {
    params.push(data.ma_so_thue);
    fields.push(`ma_so_thue = $${params.length}`);
  }
  if (data.so_dien_thoai !== undefined) {
    params.push(data.so_dien_thoai);
    fields.push(`so_dien_thoai = $${params.length}`);
  }
  if (data.email !== undefined) {
    params.push(data.email);
    fields.push(`email = $${params.length}`);
  }
  if (data.dia_chi !== undefined) {
    params.push(data.dia_chi);
    fields.push(`dia_chi = $${params.length}`);
  }
  if (data.tinh_thanh_pho !== undefined) {
    params.push(data.tinh_thanh_pho);
    fields.push(`tinh_thanh_pho = $${params.length}`);
  }
  if (data.nguoi_lien_he !== undefined) {
    params.push(data.nguoi_lien_he);
    fields.push(`nguoi_lien_he = $${params.length}`);
  }
  if (data.han_muc_cong_no !== undefined) {
    params.push(data.han_muc_cong_no);
    fields.push(`han_muc_cong_no = $${params.length}`);
  }
  if (data.so_ngay_cong_no !== undefined) {
    params.push(data.so_ngay_cong_no);
    fields.push(`so_ngay_cong_no = $${params.length}`);
  }
  if (data.ghi_chu !== undefined) {
    params.push(data.ghi_chu);
    fields.push(`ghi_chu = $${params.length}`);
  }

  if (fields.length === 0) {
    return findById(id);
  }

  params.push(updaterId);
  fields.push(`nguoi_cap_nhat = $${params.length}`);
  fields.push('ngay_cap_nhat = NOW()');

  const sql = `
      UPDATE khach_hang
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

  const result = await db.query(sql, params);
  return result.rows[0] || null;
}

async function updateStatus(id, status, updaterId) {
  const sql = `
      UPDATE khach_hang
      SET trang_thai = $2,
          nguoi_cap_nhat = $3,
          ngay_cap_nhat = NOW()
      WHERE id = $1
      RETURNING *
    `;
  const result = await db.query(sql, [id, status, updaterId]);
  return result.rows[0] || null;
}

async function getSummary(id) {
  // 1. Order aggregation (excluding cancelled orders)
  const orderSql = `
      SELECT COUNT(*) AS total_orders,
             COALESCE(SUM(tong_thanh_toan), 0) AS total_value
      FROM don_ban_hang
      WHERE ma_khach_hang = $1 AND trang_thai != 'huy'
    `;
  const orderRes = await db.query(orderSql, [id]);
  const totalOrders = Number(orderRes.rows[0]?.total_orders || 0);
  const totalOrderValue = String(orderRes.rows[0]?.total_value || '0.00');

  // 2. Unpaid invoices count
  const invoiceSql = `
      SELECT COUNT(*) AS unpaid_count
      FROM hoa_don_ban_hang
      WHERE ma_khach_hang = $1 AND trang_thai IN ('chua_thanh_toan', 'thanh_toan_mot_phan', 'qua_han')
    `;
  const invoiceRes = await db.query(invoiceSql, [id]);
  const unpaidInvoicesCount = Number(invoiceRes.rows[0]?.unpaid_count || 0);

  // 3. Receivables strictly filtered to loai_cong_no = 'phai_thu'
  const arSql = `
      SELECT COALESCE(SUM(so_tien_con_lai), 0) AS outstanding,
             COALESCE(SUM(CASE WHEN ngay_dao_han < NOW() AND so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0) AS overdue
      FROM cong_no
      WHERE ma_khach_hang = $1 AND loai_cong_no = 'phai_thu'
    `;
  const arRes = await db.query(arSql, [id]);
  const outstandingReceivable = String(arRes.rows[0]?.outstanding || '0.00');
  const overdueReceivable = String(arRes.rows[0]?.overdue || '0.00');

  return {
    totalOrders,
    totalOrderValue,
    unpaidInvoicesCount,
    outstandingReceivable,
    overdueReceivable,
  };
}

module.exports = {
  ALLOWED_CUSTOMER_SORT_COLUMNS,
  list,
  findById,
  findByCode,
  findByTaxCode,
  create,
  update,
  updateStatus,
  getSummary,
};
