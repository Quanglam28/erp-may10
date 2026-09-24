'use strict';

const db = require('../../config/database');
const { withTransaction } = require('../../utils/sales/transaction');

/**
 * Order repository (ported from PH1 `repositories/order.repository.ts`).
 * SQL is unchanged; only the module system and the database client (Core's shared
 * pool, contract §3.3) differ.
 */

const ALLOWED_ORDER_SORT_COLUMNS = [
  'id',
  'ma_don_ban',
  'ngay_dat_hang',
  'ngay_giao_hang_yc',
  'tong_thanh_toan',
  'trang_thai',
  'ngay_tao',
];

/**
 * Lists orders with search, filters, pagination, and sorting.
 * @param {object} filters
 * @returns {Promise<{orders: object[], total: number, page: number, pageSize: number, totalPages: number}>}
 */
async function list(filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const conditions = [];
  const params = [];

  if (filters.search && filters.search.trim().length > 0) {
    params.push(`%${filters.search.trim()}%`);
    const pIdx = params.length;
    conditions.push(`(o.ma_don_ban ILIKE $${pIdx} OR c.ten_khach_hang ILIKE $${pIdx})`);
  }

  if (filters.ma_khach_hang) {
    params.push(filters.ma_khach_hang);
    conditions.push(`o.ma_khach_hang = $${params.length}`);
  }

  if (filters.trang_thai) {
    params.push(filters.trang_thai);
    conditions.push(`o.trang_thai = $${params.length}`);
  }

  if (Array.isArray(filters.trang_thai_in) && filters.trang_thai_in.length > 0) {
    params.push(filters.trang_thai_in);
    conditions.push(`o.trang_thai = ANY($${params.length}::text[])`);
  }

  if (filters.nguoi_ban) {
    params.push(filters.nguoi_ban);
    conditions.push(`o.nguoi_ban = $${params.length}`);
  }

  if (filters.fromDate) {
    params.push(filters.fromDate);
    conditions.push(`o.ngay_dat_hang >= $${params.length}`);
  }

  if (filters.toDate) {
    params.push(filters.toDate);
    conditions.push(`o.ngay_dat_hang <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let sortColumn = 'ngay_dat_hang';
  if (filters.sortBy && ALLOWED_ORDER_SORT_COLUMNS.includes(filters.sortBy)) {
    sortColumn = filters.sortBy;
  }
  const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';

  // Count Total
  const countSql = `
      SELECT COUNT(*) AS total
      FROM don_ban_hang o
      LEFT JOIN khach_hang c ON c.id = o.ma_khach_hang
      ${whereClause}
    `;
  const countResult = await db.query(countSql, params);
  const total = Number(countResult.rows[0]?.total || 0);
  const totalPages = Math.ceil(total / pageSize) || 1;

  // Fetch Paginated Records
  params.push(pageSize);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const dataSql = `
      SELECT o.id, o.ma_don_ban, o.ma_khach_hang, c.ten_khach_hang, c.ma_khach_hang AS ma_khach_hang_code,
             o.ngay_dat_hang, o.ngay_giao_hang_yc, o.ngay_giao_thuc_te, o.dia_chi_giao_hang,
             o.tong_tien_hang, o.tien_thue, o.tien_giam_gia, o.tong_thanh_toan,
             o.nguoi_ban, u.ho_ten AS ten_nguoi_ban, o.trang_thai, o.ghi_chu,
             o.ngay_tao, o.ngay_cap_nhat, o.nguoi_tao, o.nguoi_cap_nhat
      FROM don_ban_hang o
      LEFT JOIN khach_hang c ON c.id = o.ma_khach_hang
      LEFT JOIN nguoi_dung u ON u.id = o.nguoi_ban
      ${whereClause}
      ORDER BY o.${sortColumn} ${sortOrder}, o.id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

  const dataResult = await db.query(dataSql, params);

  return {
    orders: dataResult.rows,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Finds an order record by ID along with its line items.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const orderSql = `
      SELECT o.id, o.ma_don_ban, o.ma_khach_hang, c.ten_khach_hang, c.ma_khach_hang AS ma_khach_hang_code,
             o.ngay_dat_hang, o.ngay_giao_hang_yc, o.ngay_giao_thuc_te, o.dia_chi_giao_hang,
             o.tong_tien_hang, o.tien_thue, o.tien_giam_gia, o.tong_thanh_toan,
             o.nguoi_ban, u.ho_ten AS ten_nguoi_ban, o.trang_thai, o.ghi_chu,
             o.ngay_tao, o.ngay_cap_nhat, o.nguoi_tao, o.nguoi_cap_nhat
      FROM don_ban_hang o
      LEFT JOIN khach_hang c ON c.id = o.ma_khach_hang
      LEFT JOIN nguoi_dung u ON u.id = o.nguoi_ban
      WHERE o.id = $1
      LIMIT 1
    `;
  const orderRes = await db.query(orderSql, [id]);
  const order = orderRes.rows[0];
  if (!order) return null;

  const linesSql = `
      SELECT l.id, l.ma_don_ban_hang, l.ma_san_pham, sp.ten_san_pham, sp.ma_san_pham AS ma_san_pham_code,
             dvt.ten_don_vi, l.so_luong, l.don_gia, l.ty_le_giam_gia, l.thanh_tien,
             l.so_luong_giao, l.ghi_chu, l.trang_thai, l.ngay_tao, l.nguoi_tao
      FROM chi_tiet_don_ban_hang l
      LEFT JOIN san_pham sp ON sp.id = l.ma_san_pham
      LEFT JOIN don_vi_tinh dvt ON dvt.id = sp.ma_don_vi_tinh
      WHERE l.ma_don_ban_hang = $1
      ORDER BY l.id ASC
    `;
  const linesRes = await db.query(linesSql, [id]);
  order.lines = linesRes.rows;

  return order;
}

/**
 * Finds an order record by its order code.
 * @param {string} code
 * @returns {Promise<object|null>}
 */
async function findByCode(code) {
  const orderSql = `
      SELECT o.id, o.ma_don_ban, o.ma_khach_hang, c.ten_khach_hang, c.ma_khach_hang AS ma_khach_hang_code,
             o.ngay_dat_hang, o.ngay_giao_hang_yc, o.ngay_giao_thuc_te, o.dia_chi_giao_hang,
             o.tong_tien_hang, o.tien_thue, o.tien_giam_gia, o.tong_thanh_toan,
             o.nguoi_ban, u.ho_ten AS ten_nguoi_ban, o.trang_thai, o.ghi_chu,
             o.ngay_tao, o.ngay_cap_nhat, o.nguoi_tao, o.nguoi_cap_nhat
      FROM don_ban_hang o
      LEFT JOIN khach_hang c ON c.id = o.ma_khach_hang
      LEFT JOIN nguoi_dung u ON u.id = o.nguoi_ban
      WHERE UPPER(o.ma_don_ban) = UPPER($1)
      LIMIT 1
    `;
  const orderRes = await db.query(orderSql, [code.trim()]);
  return orderRes.rows[0] || null;
}

/**
 * Creates a new order along with its order lines inside a transaction.
 * @param {object} params
 * @returns {Promise<object>}
 */
async function create(params) {
  return withTransaction(async (client) => {
    // 1. Insert order header
    const headerSql = `
        INSERT INTO don_ban_hang (
          ma_don_ban, ma_khach_hang, ngay_dat_hang, ngay_giao_hang_yc,
          dia_chi_giao_hang, tong_tien_hang, tien_thue, tien_giam_gia,
          tong_thanh_toan, nguoi_ban, trang_thai, ghi_chu,
          nguoi_tao, nguoi_cap_nhat
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, 'cho_xac_nhan', $11,
          $12, $12
        )
        RETURNING *
      `;
    const headerRes = await client.query(headerSql, [
      params.ma_don_ban,
      params.ma_khach_hang,
      params.ngay_dat_hang,
      params.ngay_giao_hang_yc,
      params.dia_chi_giao_hang,
      params.tong_tien_hang,
      params.tien_thue,
      params.tien_giam_gia,
      params.tong_thanh_toan,
      params.nguoi_ban,
      params.ghi_chu,
      params.creatorId,
    ]);
    const order = headerRes.rows[0];

    // 2. Insert order lines atomically
    const insertedLines = [];
    for (const line of params.lines) {
      const lineSql = `
          INSERT INTO chi_tiet_don_ban_hang (
            ma_don_ban_hang, ma_san_pham, so_luong, don_gia,
            ty_le_giam_gia, thanh_tien, so_luong_giao, ghi_chu,
            trang_thai, nguoi_tao
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, 0, $7,
            'chua_giao', $8
          )
          RETURNING *
        `;
      const lineRes = await client.query(lineSql, [
        order.id,
        line.ma_san_pham,
        line.so_luong,
        line.don_gia,
        line.ty_le_giam_gia,
        line.thanh_tien,
        line.ghi_chu,
        params.creatorId,
      ]);
      insertedLines.push(lineRes.rows[0]);
    }

    order.lines = insertedLines;
    return order;
  });
}

/**
 * Updates order header fields and replaces order lines if provided inside a transaction.
 * @param {number} id
 * @param {object} headerUpdates
 * @param {object[]|null} lines
 * @param {number} updaterId
 * @returns {Promise<object|null>}
 */
async function update(id, headerUpdates = {}, lines, updaterId) {
  return withTransaction(async (client) => {
    // 1. Update header
    const fields = ['nguoi_cap_nhat = $2', 'ngay_cap_nhat = NOW()'];
    const params = [id, updaterId];

    if (headerUpdates.ngay_giao_hang_yc !== undefined) {
      params.push(headerUpdates.ngay_giao_hang_yc);
      fields.push(`ngay_giao_hang_yc = $${params.length}`);
    }
    if (headerUpdates.dia_chi_giao_hang !== undefined) {
      params.push(headerUpdates.dia_chi_giao_hang);
      fields.push(`dia_chi_giao_hang = $${params.length}`);
    }
    if (headerUpdates.ghi_chu !== undefined) {
      params.push(headerUpdates.ghi_chu);
      fields.push(`ghi_chu = $${params.length}`);
    }
    if (headerUpdates.tong_tien_hang !== undefined) {
      params.push(headerUpdates.tong_tien_hang);
      fields.push(`tong_tien_hang = $${params.length}`);
    }
    if (headerUpdates.tien_thue !== undefined) {
      params.push(headerUpdates.tien_thue);
      fields.push(`tien_thue = $${params.length}`);
    }
    if (headerUpdates.tien_giam_gia !== undefined) {
      params.push(headerUpdates.tien_giam_gia);
      fields.push(`tien_giam_gia = $${params.length}`);
    }
    if (headerUpdates.tong_thanh_toan !== undefined) {
      params.push(headerUpdates.tong_thanh_toan);
      fields.push(`tong_thanh_toan = $${params.length}`);
    }

    const updateHeaderSql = `
        UPDATE don_ban_hang
        SET ${fields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;
    const headerRes = await client.query(updateHeaderSql, params);
    const order = headerRes.rows[0];
    if (!order) return null;

    // 2. If lines are supplied, replace order lines
    if (lines && lines.length > 0) {
      await client.query('DELETE FROM chi_tiet_don_ban_hang WHERE ma_don_ban_hang = $1', [id]);
      const insertedLines = [];
      for (const line of lines) {
        const lineSql = `
            INSERT INTO chi_tiet_don_ban_hang (
              ma_don_ban_hang, ma_san_pham, so_luong, don_gia,
              ty_le_giam_gia, thanh_tien, so_luong_giao, ghi_chu,
              trang_thai, nguoi_tao
            ) VALUES (
              $1, $2, $3, $4,
              $5, $6, 0, $7,
              'chua_giao', $8
            )
            RETURNING *
          `;
        const lineRes = await client.query(lineSql, [
          id,
          line.ma_san_pham,
          line.so_luong,
          line.don_gia,
          line.ty_le_giam_gia,
          line.thanh_tien,
          line.ghi_chu,
          updaterId,
        ]);
        insertedLines.push(lineRes.rows[0]);
      }
      order.lines = insertedLines;
    }

    return order;
  });
}

/**
 * Updates the status of an order and optional extra fields.
 * @param {number} id
 * @param {string} status
 * @param {number} updaterId
 * @param {object} [extraFields]
 * @returns {Promise<object|null>}
 */
async function updateStatus(id, status, updaterId, extraFields) {
  const fields = ['trang_thai = $2', 'nguoi_cap_nhat = $3', 'ngay_cap_nhat = NOW()'];
  const params = [id, status, updaterId];

  if (extraFields?.ngay_giao_thuc_te !== undefined) {
    params.push(extraFields.ngay_giao_thuc_te);
    fields.push(`ngay_giao_thuc_te = $${params.length}`);
  }
  if (extraFields?.ghi_chu !== undefined) {
    params.push(extraFields.ghi_chu);
    fields.push(`ghi_chu = $${params.length}`);
  }

  const sql = `
      UPDATE don_ban_hang
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
  const res = await db.query(sql, params);
  return res.rows[0] || null;
}

/**
 * Gets total outstanding debt for a customer.
 * @param {number} customerId
 * @returns {Promise<number>}
 */
async function getCustomerOutstanding(customerId) {
  const sql = `
      SELECT COALESCE(SUM(so_tien_con_lai), 0) AS total_outstanding
      FROM cong_no
      WHERE ma_khach_hang = $1 AND loai_cong_no = 'phai_thu'
    `;
  const res = await db.query(sql, [customerId]);
  return Number(res.rows[0]?.total_outstanding || 0);
}

module.exports = {
  ALLOWED_ORDER_SORT_COLUMNS,
  list,
  findById,
  findByCode,
  create,
  update,
  updateStatus,
  getCustomerOutstanding,
};
