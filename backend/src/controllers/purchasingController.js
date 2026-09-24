const db = require('../config/database');
const {
  validateSupplierInput,
  validatePurchaseOrderInput,
  isValidStatusTransition,
  validateReceiveStatusInput,
  validatePurchaseRequisitionInput,
  validateRfqInput,
  validateQuoteInput,
  validateEvaluationInput,
  isValidPrTransition,
} = require('../validators/purchasingValidator');

let tablesEnsured = false;
async function ensurePh3Tables() {
  if (tablesEnsured) return;
  try {
    await db.query(`
      ALTER TABLE nha_cung_cap ADD COLUMN IF NOT EXISTS so_tai_khoan_ngan_hang VARCHAR(50);
      ALTER TABLE nha_cung_cap ADD COLUMN IF NOT EXISTS ten_ngan_hang VARCHAR(150);
      ALTER TABLE nha_cung_cap ADD COLUMN IF NOT EXISTS chi_nhanh_ngan_hang VARCHAR(200);
      ALTER TABLE nha_cung_cap ADD COLUMN IF NOT EXISTS so_gpkd VARCHAR(50);

      CREATE TABLE IF NOT EXISTS yeu_cau_mua_hang (
        id BIGSERIAL PRIMARY KEY,
        ma_yeu_cau_mua VARCHAR(50) UNIQUE NOT NULL,
        nguon_yeu_cau VARCHAR(50) NOT NULL,
        ma_nhu_cau_npl BIGINT,
        ngay_yeu_cau TIMESTAMPTZ NOT NULL,
        nguoi_yeu_cau BIGINT,
        nguoi_phe_duyet BIGINT,
        ngay_phe_duyet TIMESTAMPTZ,
        ghi_chu TEXT,
        trang_thai VARCHAR(20) DEFAULT 'cho_duyet',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS chi_tiet_yeu_cau_mua (
        id BIGSERIAL PRIMARY KEY,
        ma_yeu_cau_mua_hang BIGINT NOT NULL,
        ma_vat_tu BIGINT NOT NULL,
        so_luong_yeu_cau NUMERIC(18,3) NOT NULL,
        don_gia_du_kien NUMERIC(18,2),
        ngay_can_giao TIMESTAMPTZ NOT NULL,
        ma_kho_nhap BIGINT,
        ghi_chu TEXT,
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT
      );

      CREATE TABLE IF NOT EXISTS yeu_cau_bao_gia (
        id BIGSERIAL PRIMARY KEY,
        ma_rfq VARCHAR(50) UNIQUE NOT NULL,
        ma_yeu_cau_mua_hang BIGINT,
        tieu_de VARCHAR(200) NOT NULL,
        ngay_gui TIMESTAMPTZ DEFAULT NOW(),
        han_bao_gia TIMESTAMPTZ NOT NULL,
        dieu_khoan_thuong_mai TEXT,
        ghi_chu TEXT,
        trang_thai VARCHAR(20) DEFAULT 'dang_mo',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS chi_tiet_bao_gia_ncc (
        id BIGSERIAL PRIMARY KEY,
        ma_rfq BIGINT NOT NULL,
        ma_nha_cung_cap BIGINT NOT NULL,
        ma_vat_tu BIGINT NOT NULL,
        so_luong_chao NUMERIC(18,3) NOT NULL,
        don_gia_chao NUMERIC(18,2) NOT NULL,
        thoi_gian_giao_hang_ngay INTEGER DEFAULT 7,
        dieu_kien_thanh_toan TEXT,
        ghi_chu TEXT,
        da_chon BOOLEAN DEFAULT FALSE,
        ly_do_chon TEXT,
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT
      );

      CREATE TABLE IF NOT EXISTS danh_gia_ncc (
        id BIGSERIAL PRIMARY KEY,
        ma_nha_cung_cap BIGINT NOT NULL,
        ky_danh_gia VARCHAR(20) NOT NULL,
        diem_chat_luong NUMERIC(3,1) NOT NULL,
        diem_giao_hang NUMERIC(3,1) NOT NULL,
        diem_gia_ca NUMERIC(3,1) NOT NULL,
        diem_tong_hop NUMERIC(3,1) NOT NULL,
        nhan_xet TEXT,
        nguoi_danh_gia BIGINT,
        ngay_danh_gia TIMESTAMPTZ NOT NULL,
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT
      );

      ALTER TABLE chi_tiet_don_mua ADD COLUMN IF NOT EXISTS so_luong_loi_hong NUMERIC(18,3) DEFAULT 0;
      ALTER TABLE chi_tiet_don_mua ADD COLUMN IF NOT EXISTS ghi_chu_kiem_dinh TEXT;
    `);
    tablesEnsured = true;
  } catch (e) {
    // Continue even if schema warning
  }
}

/**
 * 1. KPI & DASHBOARD MUA HÀNG
 * GET /api/v1/purchasing/dashboard
 */
async function getDashboardStats(req, res, next) {
  try {
    // 1. Tổng số PO và phân bổ trạng thái
    const statusCountsRes = await db.query(`
      SELECT 
        COUNT(*) AS total_po,
        COUNT(CASE WHEN trang_thai = 'cho_duyet' THEN 1 END) AS cho_duyet,
        COUNT(CASE WHEN trang_thai = 'da_gui_ncc' THEN 1 END) AS da_gui_ncc,
        COUNT(CASE WHEN trang_thai = 'da_xac_nhan' THEN 1 END) AS da_xac_nhan,
        COUNT(CASE WHEN trang_thai = 'dang_giao' THEN 1 END) AS dang_giao,
        COUNT(CASE WHEN trang_thai = 'da_nhap_kho' THEN 1 END) AS da_nhap_kho,
        COUNT(CASE WHEN trang_thai = 'huy' THEN 1 END) AS da_huy,
        COUNT(CASE WHEN trang_thai IN ('cho_duyet', 'da_gui_ncc', 'da_xac_nhan', 'dang_giao') THEN 1 END) AS dang_xu_ly,
        COUNT(CASE WHEN ngay_giao_hang_yc < NOW() AND trang_thai NOT IN ('da_nhap_kho', 'huy') THEN 1 END) AS qua_han,
        COALESCE(SUM(tong_thanh_toan), 0) AS tong_gia_tri_tat_ca,
        COALESCE(SUM(CASE WHEN trang_thai = 'da_nhap_kho' THEN tong_thanh_toan ELSE 0 END), 0) AS tong_gia_tri_da_nhap,
        COALESCE(SUM(CASE WHEN trang_thai IN ('da_gui_ncc', 'da_xac_nhan', 'dang_giao') THEN tong_thanh_toan ELSE 0 END), 0) AS gia_tri_dang_giao
      FROM don_mua_hang
    `);

    // 2. Số lượng nhà cung cấp
    const supplierCountRes = await db.query(`
      SELECT 
        COUNT(*) AS total_suppliers,
        COUNT(CASE WHEN trang_thai = 'hoat_dong' THEN 1 END) AS active_suppliers,
        COUNT(CASE WHEN trang_thai = 'tam_ngung' THEN 1 END) AS suspended_suppliers,
        COALESCE(AVG(CASE WHEN diem_danh_gia > 0 THEN diem_danh_gia END), 0) AS avg_rating
      FROM nha_cung_cap
    `);

    // 3. Đơn hàng cần xử lý gấp (Chờ duyệt hoặc Quá hạn)
    const urgentOrdersRes = await db.query(`
      SELECT dmh.id, dmh.ma_don_mua, dmh.ngay_dat_hang, dmh.ngay_giao_hang_yc,
             dmh.tong_thanh_toan, dmh.trang_thai,
             ncc.ten_nha_cung_cap, ncc.ma_nha_cung_cap,
             CASE 
               WHEN dmh.ngay_giao_hang_yc < NOW() AND dmh.trang_thai NOT IN ('da_nhap_kho', 'huy') THEN true
               ELSE false
             END AS is_overdue
      FROM don_mua_hang dmh
      JOIN nha_cung_cap ncc ON dmh.ma_nha_cung_cap = ncc.id
      WHERE dmh.trang_thai = 'cho_duyet' 
         OR (dmh.ngay_giao_hang_yc < NOW() AND dmh.trang_thai NOT IN ('da_nhap_kho', 'huy'))
      ORDER BY is_overdue DESC, dmh.ngay_giao_hang_yc ASC
      LIMIT 10
    `);

    // 4. 5 Đơn mua hàng gần nhất
    const recentOrdersRes = await db.query(`
      SELECT dmh.id, dmh.ma_don_mua, dmh.ngay_dat_hang, dmh.ngay_giao_hang_yc,
             dmh.tong_thanh_toan, dmh.trang_thai,
             ncc.ten_nha_cung_cap,
             nd.ho_ten AS ten_nguoi_dat
      FROM don_mua_hang dmh
      JOIN nha_cung_cap ncc ON dmh.ma_nha_cung_cap = ncc.id
      LEFT JOIN nguoi_dung nd ON dmh.nguoi_dat_hang = nd.id
      ORDER BY dmh.id DESC
      LIMIT 5
    `);

    const stats = statusCountsRes.rows[0];
    const supStats = supplierCountRes.rows[0];

    res.json({
      success: true,
      data: {
        summary: {
          totalPOs: parseInt(stats.total_po, 10) || 0,
          pendingApproval: parseInt(stats.cho_duyet, 10) || 0,
          inProgress: parseInt(stats.dang_xu_ly, 10) || 0,
          overdue: parseInt(stats.qua_han, 10) || 0,
          completed: parseInt(stats.da_nhap_kho, 10) || 0,
          cancelled: parseInt(stats.da_huy, 10) || 0,
          totalValueAll: parseFloat(stats.tong_gia_tri_tat_ca) || 0,
          totalValueCompleted: parseFloat(stats.tong_gia_tri_da_nhap) || 0,
          totalValueInProgress: parseFloat(stats.gia_tri_dang_giao) || 0,
          totalSuppliers: parseInt(supStats.total_suppliers, 10) || 0,
          activeSuppliers: parseInt(supStats.active_suppliers, 10) || 0,
          avgSupplierRating: parseFloat(supStats.avg_rating) || 0,
        },
        urgentOrders: urgentOrdersRes.rows,
        recentOrders: recentOrdersRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. API CONTRACT CHO CORE HOMEPAGE
 * GET /api/v1/purchasing/core-kpi
 * Cung cấp số liệu Mua hàng cho Trang chủ không cần sửa trực tiếp Homepage
 */
async function getCoreKpiContract(req, res, next) {
  try {
    const kpiRes = await db.query(`
      SELECT 
        COUNT(*) AS so_po,
        COUNT(CASE WHEN trang_thai IN ('cho_duyet', 'da_gui_ncc', 'da_xac_nhan', 'dang_giao') THEN 1 END) AS po_dang_xu_ly,
        COUNT(CASE WHEN ngay_giao_hang_yc < NOW() AND trang_thai NOT IN ('da_nhap_kho', 'huy') THEN 1 END) AS po_qua_han,
        (SELECT COUNT(CASE WHEN trang_thai = 'hoat_dong' THEN 1 END) FROM nha_cung_cap) AS ncc,
        COALESCE(SUM(CASE WHEN trang_thai != 'huy' THEN tong_thanh_toan ELSE 0 END), 0) AS gia_tri_mua_hang
      FROM don_mua_hang
    `);

    const row = kpiRes.rows[0];
    res.json({
      success: true,
      data: {
        so_po: parseInt(row.so_po, 10) || 0,
        po_dang_xu_ly: parseInt(row.po_dang_xu_ly, 10) || 0,
        po_qua_han: parseInt(row.po_qua_han, 10) || 0,
        ncc: parseInt(row.ncc, 10) || 0,
        gia_tri_mua_hang: parseFloat(row.gia_tri_mua_hang) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 3. QUẢN LÝ NHÀ CUNG CẤP (SUPPLIERS)
 * GET /api/v1/purchasing/suppliers
 */
async function getSuppliers(req, res, next) {
  try {
    const { search, trang_thai, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT ncc.*,
             COALESCE(agg.tong_don_mua, 0) AS tong_don_mua,
             COALESCE(agg.tong_gia_tri_mua, 0) AS tong_gia_tri_mua
      FROM nha_cung_cap ncc
      LEFT JOIN (
        SELECT ma_nha_cung_cap,
               COUNT(id) AS tong_don_mua,
               SUM(CASE WHEN trang_thai != 'huy' THEN tong_thanh_toan ELSE 0 END) AS tong_gia_tri_mua
        FROM don_mua_hang
        GROUP BY ma_nha_cung_cap
      ) agg ON ncc.id = agg.ma_nha_cung_cap
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (ncc.ten_nha_cung_cap ILIKE $${params.length} OR ncc.ma_nha_cung_cap ILIKE $${params.length} OR ncc.email ILIKE $${params.length} OR ncc.so_dien_thoai ILIKE $${params.length})`;
    }

    if (trang_thai) {
      params.push(trang_thai);
      query += ` AND ncc.trang_thai = $${params.length}`;
    }

    query += `
      ORDER BY ncc.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await db.query(query, params);
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/purchasing/suppliers/:id
 */
async function getSupplierDetail(req, res, next) {
  try {
    const { id } = req.params;
    const nccRes = await db.query(
      `SELECT ncc.*, nd.ho_ten AS ten_nguoi_tao
       FROM nha_cung_cap ncc
       LEFT JOIN nguoi_dung nd ON ncc.nguoi_tao = nd.id
       WHERE ncc.id = $1`,
      [id]
    );

    if (nccRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy nhà cung cấp với ID ${id}`,
      });
    }

    // Lịch sử đơn mua của NCC này
    const poListRes = await db.query(
      `SELECT dmh.id, dmh.ma_don_mua, dmh.ngay_dat_hang, dmh.ngay_giao_hang_yc,
              dmh.tong_thanh_toan, dmh.trang_thai
       FROM don_mua_hang dmh
       WHERE dmh.ma_nha_cung_cap = $1
       ORDER BY dmh.id DESC
       LIMIT 10`,
      [id]
    );

    // Lịch sử đánh giá
    const ratingRes = await db.query(
      `SELECT dg.*, nd.ho_ten AS ten_nguoi_danh_gia
       FROM danh_gia_ncc dg
       LEFT JOIN nguoi_dung nd ON dg.nguoi_danh_gia = nd.id
       WHERE dg.ma_nha_cung_cap = $1
       ORDER BY dg.id DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...nccRes.rows[0],
        donMuaHang: poListRes.rows,
        danhGia: ratingRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/purchasing/suppliers
 */
async function createSupplier(req, res, next) {
  try {
    const validation = validateSupplierInput(req.body, false);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Dữ liệu nhà cung cấp không hợp lệ.',
        errors: validation.errors,
      });
    }

    const {
      ma_nha_cung_cap,
      ten_nha_cung_cap,
      ma_so_thue,
      so_gpkd,
      dia_chi,
      quoc_gia = 'Viet Nam',
      nguoi_lien_he,
      so_dien_thoai,
      email,
      loai_hang_cung_cap,
      han_muc_tin_dung = 0,
      so_ngay_gia_han = 30,
      diem_danh_gia = 0,
      trang_thai = 'hoat_dong',
    } = req.body;

    const nguoiTao = req.user?.id || 1;
    const cleanPhone = (so_dien_thoai || '').trim().replace(/[\s.-]/g, '');
    const cleanTax = (ma_so_thue || '').trim();
    const cleanGpkd = (so_gpkd || '').trim();

    // Tự sinh mã NCC nếu không truyền
    const maNCC =
      ma_nha_cung_cap ||
      `NCC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Kiểm tra trùng mã NCC
    const checkDup = await db.query('SELECT id FROM nha_cung_cap WHERE ma_nha_cung_cap = $1', [maNCC]);
    if (checkDup.rows.length > 0) {
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Mã nhà cung cấp [${maNCC}] đã tồn tại trong hệ thống.`,
      });
    }

    // 2. Kiểm tra trùng Mã số thuế
    if (cleanTax) {
      const checkTax = await db.query('SELECT id FROM nha_cung_cap WHERE ma_so_thue = $1', [cleanTax]);
      if (checkTax.rows.length > 0) {
        return res.status(409).json({
          success: false,
          errorCode: 'CONFLICT',
          message: `Mã số thuế [${cleanTax}] đã tồn tại trong hệ thống.`,
        });
      }
    }

    // 3. Kiểm tra trùng Số GPKD / ĐKKD
    if (cleanGpkd) {
      const checkGpkd = await db.query('SELECT id FROM nha_cung_cap WHERE so_gpkd = $1', [cleanGpkd]);
      if (checkGpkd.rows.length > 0) {
        return res.status(409).json({
          success: false,
          errorCode: 'CONFLICT',
          message: `Số GPKD / ĐKKD [${cleanGpkd}] đã tồn tại trong hệ thống.`,
        });
      }
    }

    // 4. Kiểm tra trùng Số điện thoại
    if (cleanPhone) {
      const checkPhone = await db.query('SELECT id FROM nha_cung_cap WHERE so_dien_thoai = $1', [cleanPhone]);
      if (checkPhone.rows.length > 0) {
        return res.status(409).json({
          success: false,
          errorCode: 'CONFLICT',
          message: `Số điện thoại [${cleanPhone}] đã được sử dụng bởi nhà cung cấp khác.`,
        });
      }
    }

    const insertRes = await db.query(
      `INSERT INTO nha_cung_cap (
         ma_nha_cung_cap, ten_nha_cung_cap, ma_so_thue, so_gpkd, dia_chi, quoc_gia,
         nguoi_lien_he, so_dien_thoai, email, loai_hang_cung_cap,
         han_muc_tin_dung, so_ngay_gia_han, diem_danh_gia, trang_thai,
         nguoi_tao, nguoi_cap_nhat
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
       RETURNING *`,
      [
        maNCC,
        ten_nha_cung_cap.trim(),
        cleanTax || null,
        cleanGpkd || null,
        dia_chi.trim(),
        quoc_gia,
        nguoi_lien_he.trim(),
        cleanPhone,
        email.trim(),
        loai_hang_cung_cap || null,
        parseFloat(han_muc_tin_dung) || 0,
        parseInt(so_ngay_gia_han, 10) || 30,
        parseFloat(diem_danh_gia) || 0,
        trang_thai,
        nguoiTao,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Tạo mới nhà cung cấp thành công.',
      data: insertRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/purchasing/suppliers/:id
 */
async function updateSupplier(req, res, next) {
  try {
    const { id } = req.params;
    const checkExists = await db.query('SELECT id FROM nha_cung_cap WHERE id = $1', [id]);
    if (checkExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy nhà cung cấp với ID ${id}`,
      });
    }

    const validation = validateSupplierInput(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Dữ liệu cập nhật nhà cung cấp không hợp lệ.',
        errors: validation.errors,
      });
    }

    const {
      ten_nha_cung_cap,
      ma_so_thue,
      so_gpkd,
      dia_chi,
      quoc_gia,
      nguoi_lien_he,
      so_dien_thoai,
      email,
      loai_hang_cung_cap,
      han_muc_tin_dung,
      so_ngay_gia_han,
      diem_danh_gia,
      trang_thai,
    } = req.body;

    const cleanTax = ma_so_thue !== undefined ? (ma_so_thue ? ma_so_thue.trim() : null) : undefined;
    const cleanGpkd = so_gpkd !== undefined ? (so_gpkd ? so_gpkd.trim() : null) : undefined;
    const cleanPhone = so_dien_thoai !== undefined ? (so_dien_thoai ? so_dien_thoai.trim().replace(/[\s.-]/g, '') : null) : undefined;

    // 1. Kiểm tra trùng Mã số thuế với NCC khác
    if (cleanTax) {
      const checkTax = await db.query('SELECT id FROM nha_cung_cap WHERE ma_so_thue = $1 AND id != $2', [cleanTax, id]);
      if (checkTax.rows.length > 0) {
        return res.status(409).json({
          success: false,
          errorCode: 'CONFLICT',
          message: `Mã số thuế [${cleanTax}] đã được sử dụng bởi nhà cung cấp khác.`,
        });
      }
    }

    // 2. Kiểm tra trùng GPKD với NCC khác
    if (cleanGpkd) {
      const checkGpkd = await db.query('SELECT id FROM nha_cung_cap WHERE so_gpkd = $1 AND id != $2', [cleanGpkd, id]);
      if (checkGpkd.rows.length > 0) {
        return res.status(409).json({
          success: false,
          errorCode: 'CONFLICT',
          message: `Số GPKD / ĐKKD [${cleanGpkd}] đã được sử dụng bởi nhà cung cấp khác.`,
        });
      }
    }

    // 3. Kiểm tra trùng SĐT với NCC khác
    if (cleanPhone) {
      const checkPhone = await db.query('SELECT id FROM nha_cung_cap WHERE so_dien_thoai = $1 AND id != $2', [cleanPhone, id]);
      if (checkPhone.rows.length > 0) {
        return res.status(409).json({
          success: false,
          errorCode: 'CONFLICT',
          message: `Số điện thoại [${cleanPhone}] đã được đăng ký bởi nhà cung cấp khác.`,
        });
      }
    }

    const nguoiCapNhat = req.user?.id || 1;

    const updateRes = await db.query(
      `UPDATE nha_cung_cap SET
         ten_nha_cung_cap = COALESCE($1, ten_nha_cung_cap),
         ma_so_thue = COALESCE($2, ma_so_thue),
         so_gpkd = COALESCE($3, so_gpkd),
         dia_chi = COALESCE($4, dia_chi),
         quoc_gia = COALESCE($5, quoc_gia),
         nguoi_lien_he = COALESCE($6, nguoi_lien_he),
         so_dien_thoai = COALESCE($7, so_dien_thoai),
         email = COALESCE($8, email),
         loai_hang_cung_cap = COALESCE($9, loai_hang_cung_cap),
         han_muc_tin_dung = COALESCE($10, han_muc_tin_dung),
         so_ngay_gia_han = COALESCE($11, so_ngay_gia_han),
         diem_danh_gia = COALESCE($12, diem_danh_gia),
         trang_thai = COALESCE($13, trang_thai),
         nguoi_cap_nhat = $14,
         ngay_cap_nhat = NOW()
       WHERE id = $15
       RETURNING *`,
      [
        ten_nha_cung_cap,
        cleanTax,
        cleanGpkd,
        dia_chi,
        quoc_gia,
        nguoi_lien_he,
        cleanPhone,
        email,
        loai_hang_cung_cap,
        han_muc_tin_dung,
        so_ngay_gia_han,
        diem_danh_gia,
        trang_thai,
        nguoiCapNhat,
        id,
      ]
    );

    res.json({
      success: true,
      message: 'Cập nhật nhà cung cấp thành công.',
      data: updateRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 4. QUẢN LÝ ĐƠN MUA HÀNG (PURCHASE ORDERS)
 * GET /api/v1/purchasing/purchase-orders
 */
async function getPurchaseOrders(req, res, next) {
  try {
    const { search, trang_thai, ma_nha_cung_cap, tu_ngay, den_ngay, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT dmh.id, dmh.ma_don_mua, dmh.ngay_dat_hang, dmh.ngay_giao_hang_yc,
             dmh.tong_tien_hang, dmh.tien_thue, dmh.tong_thanh_toan,
             dmh.dieu_kien_thanh_toan, dmh.trang_thai, dmh.ghi_chu,
             dmh.ngay_tao,
             ncc.id AS ncc_id, ncc.ma_nha_cung_cap, ncc.ten_nha_cung_cap,
             nd_dat.ho_ten AS ten_nguoi_dat,
             COALESCE(ct_agg.so_mat_hang, 0) AS so_mat_hang,
             COALESCE(ct_agg.tong_so_luong_dat, 0) AS tong_so_luong_dat,
             COALESCE(ct_agg.tong_so_luong_da_nhap, 0) AS tong_so_luong_da_nhap
      FROM don_mua_hang dmh
      JOIN nha_cung_cap ncc ON dmh.ma_nha_cung_cap = ncc.id
      LEFT JOIN nguoi_dung nd_dat ON dmh.nguoi_dat_hang = nd_dat.id
      LEFT JOIN (
        SELECT ma_don_mua_hang,
               COUNT(id) AS so_mat_hang,
               SUM(so_luong_dat) AS tong_so_luong_dat,
               SUM(so_luong_da_nhap) AS tong_so_luong_da_nhap
        FROM chi_tiet_don_mua
        GROUP BY ma_don_mua_hang
      ) ct_agg ON dmh.id = ct_agg.ma_don_mua_hang
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (dmh.ma_don_mua ILIKE $${params.length} OR ncc.ten_nha_cung_cap ILIKE $${params.length})`;
    }

    if (trang_thai) {
      params.push(trang_thai);
      query += ` AND dmh.trang_thai = $${params.length}`;
    }

    if (ma_nha_cung_cap) {
      params.push(ma_nha_cung_cap);
      query += ` AND dmh.ma_nha_cung_cap = $${params.length}`;
    }

    if (tu_ngay) {
      params.push(tu_ngay);
      query += ` AND dmh.ngay_dat_hang >= $${params.length}`;
    }

    if (den_ngay) {
      params.push(den_ngay);
      query += ` AND dmh.ngay_dat_hang <= $${params.length}`;
    }

    query += `
      ORDER BY dmh.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await db.query(query, params);
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/purchasing/purchase-orders/:id
 */
async function getPurchaseOrderDetail(req, res, next) {
  try {
    const { id } = req.params;
    const poRes = await db.query(
      `SELECT dmh.*,
              ncc.ma_nha_cung_cap, ncc.ten_nha_cung_cap, ncc.dia_chi AS dia_chi_ncc,
              ncc.so_dien_thoai AS sdt_ncc, ncc.email AS email_ncc,
              nd_dat.ho_ten AS ten_nguoi_dat,
              nd_tao.ho_ten AS ten_nguoi_tao,
              ycm.ma_yeu_cau_mua
       FROM don_mua_hang dmh
       JOIN nha_cung_cap ncc ON dmh.ma_nha_cung_cap = ncc.id
       LEFT JOIN nguoi_dung nd_dat ON dmh.nguoi_dat_hang = nd_dat.id
       LEFT JOIN nguoi_dung nd_tao ON dmh.nguoi_tao = nd_tao.id
       LEFT JOIN yeu_cau_mua_hang ycm ON dmh.ma_yeu_cau_mua_hang = ycm.id
       WHERE dmh.id = $1`,
      [id]
    );

    if (poRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy đơn mua hàng với ID ${id}`,
      });
    }

    const itemsRes = await db.query(
      `SELECT ct.*,
              vt.ma_vat_tu, vt.ten_vat_tu, vt.quy_cach,
              dvt.ten_don_vi AS ten_dvt,
              (ct.so_luong_dat - ct.so_luong_da_nhap) AS so_luong_con_lai
       FROM chi_tiet_don_mua ct
       JOIN vat_tu vt ON ct.ma_vat_tu = vt.id
       LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
       WHERE ct.ma_don_mua_hang = $1
       ORDER BY ct.id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...poRes.rows[0],
        chiTiet: itemsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/purchasing/purchase-orders
 * Tạo mới đơn mua hàng (Transaction Boundary ACID)
 */
async function createPurchaseOrder(req, res, next) {
  const client = await db.getClient();
  try {
    // 1. Validation cú pháp & dữ liệu cơ bản
    const validation = validatePurchaseOrderInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Dữ liệu đơn mua hàng không hợp lệ.',
        errors: validation.errors,
      });
    }

    const {
      ma_don_mua,
      ma_nha_cung_cap,
      ma_yeu_cau_mua_hang,
      ngay_dat_hang,
      ngay_giao_hang_yc,
      dieu_kien_thanh_toan,
      ghi_chu,
      chiTiet, // [{ ma_vat_tu, so_luong_dat, don_gia, ghi_chu }]
    } = req.body;

    const nguoiTao = req.user?.id || 1;

    await client.query('BEGIN');

    // 2. Kiểm tra Nhà cung cấp hợp lệ và đang hoạt động
    const nccCheck = await client.query(
      'SELECT id, ten_nha_cung_cap, trang_thai FROM nha_cung_cap WHERE id = $1',
      [ma_nha_cung_cap]
    );
    if (nccCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: `Nhà cung cấp ID ${ma_nha_cung_cap} không tồn tại trong hệ thống.`,
      });
    }
    if (nccCheck.rows[0].trang_thai !== 'hoat_dong') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: `Nhà cung cấp [${nccCheck.rows[0].ten_nha_cung_cap}] đang bị tạm ngưng hoặc ngừng giao dịch.`,
      });
    }

    // 3. Kiểm tra danh sách vật tư tồn tại
    for (const item of chiTiet) {
      const vtCheck = await client.query('SELECT id, ten_vat_tu FROM vat_tu WHERE id = $1', [item.ma_vat_tu]);
      if (vtCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          errorCode: 'VALIDATION_ERROR',
          message: `Vật tư ID ${item.ma_vat_tu} không tồn tại trong hệ thống.`,
        });
      }
    }

    // 4. Sinh mã đơn mua hàng tự động nếu không truyền
    const maPO =
      ma_don_mua ||
      `DMH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Kiểm tra trùng mã PO
    const poDup = await client.query('SELECT id FROM don_mua_hang WHERE ma_don_mua = $1', [maPO]);
    if (poDup.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Mã đơn mua hàng [${maPO}] đã tồn tại.`,
      });
    }

    // 5. Tính toán thành tiền & thuế
    let tongTienHang = 0;
    chiTiet.forEach((item) => {
      const sl = parseFloat(item.so_luong_dat);
      const dg = parseFloat(item.don_gia);
      tongTienHang += sl * dg;
    });
    const tienThue = Math.round(tongTienHang * 0.08 * 100) / 100; // VAT 8%
    const tongThanhToan = tongTienHang + tienThue;

    // 6. Chèn vào bảng don_mua_hang
    const insertPORes = await client.query(
      `INSERT INTO don_mua_hang (
         ma_don_mua, ma_nha_cung_cap, ma_yeu_cau_mua_hang,
         ngay_dat_hang, ngay_giao_hang_yc,
         tong_tien_hang, tien_thue, tong_thanh_toan,
         dieu_kien_thanh_toan, nguoi_dat_hang, ghi_chu,
         trang_thai, nguoi_tao, nguoi_cap_nhat
       ) VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, $6, $7, $8, $9, $10, $11, 'cho_duyet', $10, $10)
       RETURNING *`,
      [
        maPO,
        ma_nha_cung_cap,
        ma_yeu_cau_mua_hang || null,
        ngay_dat_hang || null,
        ngay_giao_hang_yc,
        tongTienHang,
        tienThue,
        tongThanhToan,
        dieu_kien_thanh_toan || 'Thanh toán sau khi nhận hàng và hóa đơn 30 ngày',
        nguoiTao,
        ghi_chu || null,
      ]
    );

    const newPO = insertPORes.rows[0];

    // 7. Chèn chi tiết chi_tiet_don_mua
    const insertedItems = [];
    for (const item of chiTiet) {
      const sl = parseFloat(item.so_luong_dat);
      const dg = parseFloat(item.don_gia);
      const tt = sl * dg;

      const itemRes = await client.query(
        `INSERT INTO chi_tiet_don_mua (
           ma_don_mua_hang, ma_vat_tu, so_luong_dat,
           don_gia, thanh_tien, so_luong_da_nhap,
           ghi_chu, nguoi_tao
         ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7)
         RETURNING *`,
        [newPO.id, item.ma_vat_tu, sl, dg, tt, item.ghi_chu || null, nguoiTao]
      );
      insertedItems.push(itemRes.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Tạo đơn mua hàng mới thành công.',
      data: {
        ...newPO,
        chiTiet: insertedItems,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * 5. PHÊ DUYỆT ĐƠN MUA HÀNG (APPROVE PO)
 * POST /api/v1/purchasing/purchase-orders/:id/approve
 * Concurrency Protection với SELECT ... FOR UPDATE chống Double Approval
 */
async function approvePurchaseOrder(req, res, next) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1;

    await client.query('BEGIN');

    // Khóa dòng bằng FOR UPDATE ngăn chặn 2 người hoặc 2 request phê duyệt song song
    const lockRes = await client.query(
      `SELECT id, ma_don_mua, trang_thai, tong_thanh_toan
       FROM don_mua_hang
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (lockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy đơn mua hàng với ID ${id}`,
      });
    }

    const currentPO = lockRes.rows[0];

    // Kiểm tra trạng thái: chỉ cho phép duyệt khi trạng thái là 'cho_duyet'
    if (currentPO.trang_thai !== 'cho_duyet') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Không thể phê duyệt đơn mua hàng [${currentPO.ma_don_mua}]. Đơn hàng hiện đang ở trạng thái [${currentPO.trang_thai}] (chỉ được duyệt khi ở trạng thái 'cho_duyet').`,
        currentStatus: currentPO.trang_thai,
      });
    }

    // Cập nhật trạng thái sang 'da_gui_ncc'
    const updateRes = await client.query(
      `UPDATE don_mua_hang SET
         trang_thai = 'da_gui_ncc',
         nguoi_cap_nhat = $1,
         ngay_cap_nhat = NOW()
       WHERE id = $2 AND trang_thai = 'cho_duyet'
       RETURNING *`,
      [userId, id]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Không thể phê duyệt đơn mua hàng [${currentPO.ma_don_mua}] vì trạng thái đã bị thay đổi đồng thời bởi một giao dịch khác.`,
        currentStatus: currentPO.trang_thai,
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Đơn mua hàng [${currentPO.ma_don_mua}] đã được phê duyệt và chuyển trạng thái gửi Nhà cung cấp thành công.`,
      data: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * 6. HỦY ĐƠN MUA HÀNG (CANCEL PO)
 * POST /api/v1/purchasing/purchase-orders/:id/cancel
 * Concurrency Protection với SELECT ... FOR UPDATE chống Double Cancel
 */
async function cancelPurchaseOrder(req, res, next) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { ly_do_huy } = req.body;
    const userId = req.user?.id || 1;

    await client.query('BEGIN');

    // Khóa dòng bằng FOR UPDATE
    const lockRes = await client.query(
      `SELECT id, ma_don_mua, trang_thai
       FROM don_mua_hang
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (lockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy đơn mua hàng với ID ${id}`,
      });
    }

    const currentPO = lockRes.rows[0];

    // Chống double cancel
    if (currentPO.trang_thai === 'huy') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Đơn mua hàng [${currentPO.ma_don_mua}] đã bị hủy trước đó.`,
        currentStatus: currentPO.trang_thai,
      });
    }

    // Không cho phép hủy khi đã nhập kho xong
    if (currentPO.trang_thai === 'da_nhap_kho') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Không thể hủy đơn mua hàng [${currentPO.ma_don_mua}] vì hàng đã được nhập đủ vào kho.`,
        currentStatus: currentPO.trang_thai,
      });
    }

    const updateRes = await client.query(
      `UPDATE don_mua_hang SET
         trang_thai = 'huy',
         ghi_chu = CASE 
           WHEN $1::text IS NOT NULL THEN COALESCE(ghi_chu || ' | Lý do hủy: ' || $1, 'Lý do hủy: ' || $1)
           ELSE ghi_chu
         END,
         nguoi_cap_nhat = $2,
         ngay_cap_nhat = NOW()
       WHERE id = $3 AND trang_thai NOT IN ('huy', 'da_nhap_kho')
       RETURNING *`,
      [ly_do_huy || null, userId, id]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Đơn mua hàng [${currentPO.ma_don_mua}] đã bị hủy hoặc thay đổi trạng thái bởi một giao dịch khác đồng thời.`,
        currentStatus: currentPO.trang_thai,
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Đơn mua hàng [${currentPO.ma_don_mua}] đã được hủy thành công.`,
      data: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * 7. CHUYỂN DỊCH TRẠNG THÁI (STATUS TRANSITION)
 * POST /api/v1/purchasing/purchase-orders/:id/status
 */
async function updateStatusTransition(req, res, next) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { trang_thai_moi, ghi_chu } = req.body;
    const userId = req.user?.id || 1;

    if (!trang_thai_moi) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Trạng thái mới (trang_thai_moi) là bắt buộc.',
      });
    }

    await client.query('BEGIN');

    const lockRes = await client.query(
      `SELECT id, ma_don_mua, trang_thai
       FROM don_mua_hang
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (lockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy đơn mua hàng với ID ${id}`,
      });
    }

    const currentPO = lockRes.rows[0];

    // Kiểm tra tính hợp lệ của bước chuyển trạng thái
    if (!isValidStatusTransition(currentPO.trang_thai, trang_thai_moi)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Chuyển trạng thái không hợp lệ: từ [${currentPO.trang_thai}] sang [${trang_thai_moi}] không được phép theo quy trình chuẩn.`,
        currentStatus: currentPO.trang_thai,
        requestedStatus: trang_thai_moi,
      });
    }

    const updateRes = await client.query(
      `UPDATE don_mua_hang SET
         trang_thai = $1,
         ghi_chu = CASE WHEN $2::text IS NOT NULL THEN COALESCE(ghi_chu || ' | ' || $2, $2) ELSE ghi_chu END,
         nguoi_cap_nhat = $3,
         ngay_cap_nhat = NOW()
       WHERE id = $4 AND trang_thai = $5
       RETURNING *`,
      [trang_thai_moi, ghi_chu || null, userId, id, currentPO.trang_thai]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Chuyển dịch trạng thái đơn mua hàng [${currentPO.ma_don_mua}] thất bại do trạng thái đã bị thay đổi đồng thời bởi một giao dịch khác.`,
        currentStatus: currentPO.trang_thai,
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái đơn mua sang [${trang_thai_moi}].`,
      data: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * 8. ĐƠN MUA HÀNG ĐỦ ĐIỀU KIỆN NHẬP KHO (CHO PH3 VÀ PH4)
 * GET /api/v1/purchasing/receiving
 */
async function getReceivingOrders(req, res, next) {
  try {
    // Đơn mua đủ điều kiện nhập kho: trạng thái 'da_gui_ncc', 'da_xac_nhan', 'dang_giao'
    const result = await db.query(`
      SELECT dmh.id, dmh.ma_don_mua, dmh.ngay_dat_hang, dmh.ngay_giao_hang_yc,
             dmh.trang_thai, dmh.tong_thanh_toan,
             ncc.id AS ma_nha_cung_cap, ncc.ten_nha_cung_cap, ncc.ma_nha_cung_cap AS ncc_code
      FROM don_mua_hang dmh
      JOIN nha_cung_cap ncc ON dmh.ma_nha_cung_cap = ncc.id
      WHERE dmh.trang_thai IN ('da_gui_ncc', 'da_xac_nhan', 'dang_giao')
      ORDER BY dmh.id DESC
    `);

    // Gắn thêm chi tiết vật tư cần nhập cho từng đơn mua và chỉ lấy đơn còn hàng cần nhận
    const receivingOrders = [];
    for (const po of result.rows) {
      const itemsRes = await db.query(
        `SELECT ct.id, ct.ma_vat_tu, ct.so_luong_dat, ct.so_luong_da_nhap,
                (ct.so_luong_dat - ct.so_luong_da_nhap) AS so_luong_can_nhap,
                ct.don_gia,
                vt.ma_vat_tu AS ma_vat_tu_code, vt.ten_vat_tu,
                dvt.ten_don_vi AS ten_dvt
         FROM chi_tiet_don_mua ct
         JOIN vat_tu vt ON ct.ma_vat_tu = vt.id
         LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
         WHERE ct.ma_don_mua_hang = $1
         ORDER BY ct.id ASC`,
        [po.id]
      );

      let tongDat = 0;
      let tongDaNhap = 0;
      let tongConLai = 0;

      itemsRes.rows.forEach((it) => {
        const dat = parseFloat(it.so_luong_dat) || 0;
        const daNhap = parseFloat(it.so_luong_da_nhap) || 0;
        tongDat += dat;
        tongDaNhap += daNhap;
        tongConLai += Math.max(0, dat - daNhap);
      });

      if (tongConLai > 0) {
        receivingOrders.push({
          ...po,
          so_dong_hang: itemsRes.rows.length,
          tong_dat: tongDat,
          tong_da_nhap: tongDaNhap,
          tong_con_lai: tongConLai,
          chiTiet: itemsRes.rows,
        });
      }
    }

    res.json({
      success: true,
      data: receivingOrders,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 9. CẬP NHẬT TIẾN ĐỘ NHẬP KHO (RECEIVE STATUS UPDATE)
 * POST /api/v1/purchasing/receive-status-update
 * Nhận một phần hoặc Toàn phần - Đảm bảo ranh giới Transaction ACID
 */
async function receiveStatusUpdate(req, res, next) {
  const client = await db.getClient();
  try {
    const validation = validateReceiveStatusInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Dữ liệu nhận hàng không hợp lệ.',
        errors: validation.errors,
      });
    }

    const { ma_don_mua_hang, chiTiet } = req.body;
    const userId = req.user?.id || 1;

    await client.query('BEGIN');

    // 1. Khóa dòng đơn mua hàng
    const poLock = await client.query(
      `SELECT id, ma_don_mua, trang_thai
       FROM don_mua_hang
       WHERE id = $1
       FOR UPDATE`,
      [ma_don_mua_hang]
    );

    if (poLock.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy đơn mua hàng ID ${ma_don_mua_hang}`,
      });
    }

    const po = poLock.rows[0];

    // Không nhận hàng cho đơn đã hủy hoặc đã đóng
    if (po.trang_thai === 'huy') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Đơn mua hàng [${po.ma_don_mua}] đã bị hủy, không thể nhận hàng.`,
      });
    }

    // 2. Cập nhật số lượng đã nhập trên từng dòng chi tiết
    for (const item of chiTiet) {
      const slNhap = parseFloat(item.so_luong_nhap);
      let queryItem;
      let paramsItem;

      if (item.id) {
        queryItem = `
          SELECT id, so_luong_dat, so_luong_da_nhap
          FROM chi_tiet_don_mua
          WHERE id = $1 AND ma_don_mua_hang = $2
          FOR UPDATE
        `;
        paramsItem = [item.id, ma_don_mua_hang];
      } else {
        queryItem = `
          SELECT id, so_luong_dat, so_luong_da_nhap
          FROM chi_tiet_don_mua
          WHERE ma_don_mua_hang = $1 AND ma_vat_tu = $2
          FOR UPDATE
        `;
        paramsItem = [ma_don_mua_hang, item.ma_vat_tu];
      }

      const itemLock = await client.query(queryItem, paramsItem);
      if (itemLock.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          errorCode: 'VALIDATION_ERROR',
          message: `Không tìm thấy dòng mặt hàng tương ứng trong đơn mua ${po.ma_don_mua}`,
        });
      }

      const ctRow = itemLock.rows[0];
      const newDaNhap = parseFloat(ctRow.so_luong_da_nhap) + slNhap;
      const slLoi = item.so_luong_loi_hong ? parseFloat(item.so_luong_loi_hong) : 0;
      const ghiChuKd = item.ghi_chu_kiem_dinh || null;

      await client.query(
        `UPDATE chi_tiet_don_mua SET
           so_luong_da_nhap = $1,
           so_luong_loi_hong = COALESCE(so_luong_loi_hong, 0) + $2,
           ghi_chu_kiem_dinh = COALESCE($3, ghi_chu_kiem_dinh),
           ngay_cap_nhat = NOW()
         WHERE id = $4`,
        [newDaNhap, slLoi, ghiChuKd, ctRow.id]
      );
    }

    // 3. Đánh giá trạng thái tổng thể sau khi nhập:
    // Kiểm tra xem tất cả các dòng của đơn mua đã nhập đủ chưa
    const checkAllRes = await client.query(
      `SELECT id, so_luong_dat, so_luong_da_nhap
       FROM chi_tiet_don_mua
       WHERE ma_don_mua_hang = $1`,
      [ma_don_mua_hang]
    );

    let tongDat = 0;
    let tongDaNhap = 0;

    checkAllRes.rows.forEach((row) => {
      tongDat += parseFloat(row.so_luong_dat) || 0;
      tongDaNhap += parseFloat(row.so_luong_da_nhap) || 0;
    });

    const isAllComplete = tongDaNhap >= tongDat && tongDat > 0;
    const newStatus = isAllComplete ? 'da_nhap_kho' : 'dang_giao';

    await client.query(
      `UPDATE don_mua_hang SET
         trang_thai = $1,
         nguoi_cap_nhat = $2,
         ngay_cap_nhat = NOW()
       WHERE id = $3`,
      [newStatus, userId, ma_don_mua_hang]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: isAllComplete
        ? `Đơn mua [${po.ma_don_mua}] đã nhập đủ 100% hàng và tự động hoàn tất ('da_nhap_kho').`
        : `Đơn mua [${po.ma_don_mua}] đã nhập một phần hàng, cập nhật trạng thái 'dang_giao'.`,
      data: {
        poId: ma_don_mua_hang,
        trang_thai: newStatus,
        tongDat,
        tongDaNhap,
        isComplete: isAllComplete,
        hoanThanh: isAllComplete,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * 10. BÁO CÁO MUA HÀNG (PURCHASING REPORTS)
 * GET /api/v1/purchasing/reports
 */
async function getReports(req, res, next) {
  try {
    const { tu_ngay, den_ngay, ma_nha_cung_cap } = req.query;

    const params = [];
    let dateFilterPO = '';

    if (ma_nha_cung_cap) {
      params.push(ma_nha_cung_cap);
      dateFilterPO += ` AND dmh.ma_nha_cung_cap = $${params.length}`;
    }

    if (tu_ngay) {
      params.push(tu_ngay);
      dateFilterPO += ` AND dmh.ngay_dat_hang >= $${params.length}`;
    }

    if (den_ngay) {
      params.push(den_ngay);
      dateFilterPO += ` AND dmh.ngay_dat_hang <= $${params.length}`;
    }

    // 1. Phân bổ chi phí theo Nhà cung cấp
    const bySupplierRes = await db.query(
      `SELECT ncc.id, ncc.ma_nha_cung_cap, ncc.ten_nha_cung_cap,
              COUNT(dmh.id) AS so_don_mua,
              COALESCE(SUM(CASE WHEN dmh.trang_thai != 'huy' THEN dmh.tong_thanh_toan ELSE 0 END), 0) AS tong_chi_phi,
              COALESCE(SUM(CASE WHEN dmh.trang_thai = 'da_nhap_kho' THEN dmh.tong_thanh_toan ELSE 0 END), 0) AS chi_phi_da_nhap
       FROM nha_cung_cap ncc
       LEFT JOIN don_mua_hang dmh ON ncc.id = dmh.ma_nha_cung_cap ${dateFilterPO}
       GROUP BY ncc.id
       ORDER BY tong_chi_phi DESC
       LIMIT 10`,
      params
    );

    // 2. Phân bổ theo loại vật tư
    const byMaterialTypeRes = await db.query(
      `SELECT vt.loai_vat_tu,
              COUNT(DISTINCT dmh.id) AS so_don_mua,
              COALESCE(SUM(CASE WHEN dmh.trang_thai != 'huy' THEN ct.thanh_tien ELSE 0 END), 0) AS tong_tien,
              COALESCE(SUM(CASE WHEN dmh.trang_thai != 'huy' THEN ct.so_luong_dat ELSE 0 END), 0) AS tong_so_luong
       FROM chi_tiet_don_mua ct
       JOIN don_mua_hang dmh ON ct.ma_don_mua_hang = dmh.id ${dateFilterPO}
       JOIN vat_tu vt ON ct.ma_vat_tu = vt.id
       GROUP BY vt.loai_vat_tu
       ORDER BY tong_tien DESC`,
      params
    );

    // 3. Tiến độ thực hiện theo tháng (6 tháng gần nhất)
    const monthlyTrendRes = await db.query(`
      SELECT 
        TO_CHAR(ngay_dat_hang, 'YYYY-MM') AS thang,
        COUNT(*) AS so_don,
        COALESCE(SUM(CASE WHEN trang_thai != 'huy' THEN tong_thanh_toan ELSE 0 END), 0) AS gia_tri
      FROM don_mua_hang
      WHERE ngay_dat_hang >= NOW() - INTERVAL '6 months'
      GROUP BY thang
      ORDER BY thang ASC
    `);

    res.json({
      success: true,
      data: {
        bySupplier: bySupplierRes.rows,
        byMaterialType: byMaterialTypeRes.rows,
        monthlyTrend: monthlyTrendRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * =============================================================================
 * 11. YÊU CẦU MUA HÀNG (PURCHASE REQUISITIONS - PR)
 * =============================================================================
 */

/**
 * GET /api/v1/purchasing/requisitions
 */
async function getPurchaseRequisitions(req, res, next) {
  try {
    await ensurePh3Tables();
    const { page = 1, limit = 10, search = '', trang_thai } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);

    const conditions = [];
    const params = [];

    if (trang_thai && trang_thai !== 'all') {
      params.push(trang_thai);
      conditions.push(`ycm.trang_thai = $${params.length}`);
    }

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(ycm.ma_yeu_cau_mua) LIKE $${params.length} OR LOWER(COALESCE(ycm.ghi_chu, '')) LIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await db.query(
      `SELECT COUNT(*) FROM yeu_cau_mua_hang ycm ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.count || 0, 10);

    params.push(limitNum, offset);
    const listRes = await db.query(
      `SELECT ycm.id, ycm.ma_yeu_cau_mua, ycm.nguon_yeu_cau, ycm.ma_nhu_cau_npl,
              ycm.ngay_yeu_cau, ycm.nguoi_yeu_cau, ycm.nguoi_phe_duyet, ycm.ngay_phe_duyet,
              ycm.ghi_chu, ycm.trang_thai, ycm.ngay_tao, ycm.ngay_cap_nhat,
              nd_yc.ho_ten AS ten_nguoi_yeu_cau,
              nd_pd.ho_ten AS ten_nguoi_phe_duyet,
              COALESCE(ct_agg.so_mat_hang, 0) AS so_mat_hang,
              COALESCE(ct_agg.tong_so_luong, 0) AS tong_so_luong
       FROM yeu_cau_mua_hang ycm
       LEFT JOIN nguoi_dung nd_yc ON ycm.nguoi_yeu_cau = nd_yc.id
       LEFT JOIN nguoi_dung nd_pd ON ycm.nguoi_phe_duyet = nd_pd.id
       LEFT JOIN (
         SELECT ma_yeu_cau_mua_hang,
                COUNT(id) AS so_mat_hang,
                SUM(so_luong_yeu_cau) AS tong_so_luong
         FROM chi_tiet_yeu_cau_mua
         GROUP BY ma_yeu_cau_mua_hang
       ) ct_agg ON ycm.id = ct_agg.ma_yeu_cau_mua_hang
       ${whereClause}
       ORDER BY ycm.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: listRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/purchasing/requisitions/:id
 */
async function getRequisitionDetail(req, res, next) {
  try {
    await ensurePh3Tables();
    const { id } = req.params;

    const prRes = await db.query(
      `SELECT ycm.*,
              nd_yc.ho_ten AS ten_nguoi_yeu_cau,
              nd_pd.ho_ten AS ten_nguoi_phe_duyet
       FROM yeu_cau_mua_hang ycm
       LEFT JOIN nguoi_dung nd_yc ON ycm.nguoi_yeu_cau = nd_yc.id
       LEFT JOIN nguoi_dung nd_pd ON ycm.nguoi_phe_duyet = nd_pd.id
       WHERE ycm.id = $1`,
      [id]
    );

    if (prRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy yêu cầu mua hàng với ID ${id}`,
      });
    }

    const itemsRes = await db.query(
      `SELECT ct.*,
              vt.ma_vat_tu, vt.ten_vat_tu, vt.loai_vat_tu,
              dvt.ten_don_vi,
              k.ten_kho AS ten_kho_nhap
       FROM chi_tiet_yeu_cau_mua ct
       JOIN vat_tu vt ON ct.ma_vat_tu = vt.id
       LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
       LEFT JOIN kho k ON ct.ma_kho_nhap = k.id
       WHERE ct.ma_yeu_cau_mua_hang = $1
       ORDER BY ct.id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...prRes.rows[0],
        chiTiet: itemsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/purchasing/requisitions
 */
async function createPurchaseRequisition(req, res, next) {
  const client = await db.getClient();
  try {
    await ensurePh3Tables();
    const validation = validatePurchaseRequisitionInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Dữ liệu yêu cầu mua hàng không hợp lệ.',
        errors: validation.errors,
      });
    }

    const { nguon_yeu_cau, ghi_chu, chiTiet, ma_nhu_cau_npl } = req.body;
    const userId = req.user?.id || 1;

    const maPR = `PR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    await client.query('BEGIN');

    const prRes = await client.query(
      `INSERT INTO yeu_cau_mua_hang (
         ma_yeu_cau_mua, nguon_yeu_cau, ma_nhu_cau_npl, ngay_yeu_cau,
         nguoi_yeu_cau, ghi_chu, trang_thai, nguoi_tao, nguoi_cap_nhat
       ) VALUES ($1, $2, $3, NOW(), $4, $5, 'cho_duyet', $4, $4)
       RETURNING *`,
      [maPR, nguon_yeu_cau, ma_nhu_cau_npl || null, userId, ghi_chu || null]
    );

    const newPr = prRes.rows[0];
    const insertedItems = [];

    for (const item of chiTiet) {
      const sl = parseFloat(item.so_luong_yeu_cau);
      const dg = item.don_gia_du_kien ? parseFloat(item.don_gia_du_kien) : null;
      const khoId = item.ma_kho_nhap || 1;

      const itemRes = await client.query(
        `INSERT INTO chi_tiet_yeu_cau_mua (
           ma_yeu_cau_mua_hang, ma_vat_tu, so_luong_yeu_cau,
           don_gia_du_kien, ngay_can_giao, ma_kho_nhap, ghi_chu, nguoi_tao
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [newPr.id, item.ma_vat_tu, sl, dg, item.ngay_can_giao, khoId, item.ghi_chu || null, userId]
      );
      insertedItems.push(itemRes.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Tạo yêu cầu mua hàng thành công.',
      data: {
        ...newPr,
        chiTiet: insertedItems,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * POST /api/v1/purchasing/requisitions/:id/approve
 */
async function approveRequisition(req, res, next) {
  const client = await db.getClient();
  try {
    await ensurePh3Tables();
    const { id } = req.params;
    const userId = req.user?.id || 1;

    await client.query('BEGIN');

    const lockRes = await client.query(
      `SELECT id, ma_yeu_cau_mua, trang_thai FROM yeu_cau_mua_hang WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (lockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy yêu cầu mua hàng ID ${id}`,
      });
    }

    const currentPR = lockRes.rows[0];
    if (currentPR.trang_thai !== 'cho_duyet') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Không thể duyệt yêu cầu [${currentPR.ma_yeu_cau_mua}]. Trạng thái hiện tại là [${currentPR.trang_thai}].`,
      });
    }

    const updateRes = await client.query(
      `UPDATE yeu_cau_mua_hang SET
         trang_thai = 'da_duyet',
         nguoi_phe_duyet = $1,
         ngay_phe_duyet = NOW(),
         nguoi_cap_nhat = $1,
         ngay_cap_nhat = NOW()
       WHERE id = $2 AND trang_thai = 'cho_duyet'
       RETURNING *`,
      [userId, id]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: 'Yêu cầu mua hàng đã bị thay đổi trạng thái đồng thời.',
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Đã phê duyệt yêu cầu mua hàng [${currentPR.ma_yeu_cau_mua}].`,
      data: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * POST /api/v1/purchasing/requisitions/:id/reject
 */
async function rejectRequisition(req, res, next) {
  const client = await db.getClient();
  try {
    await ensurePh3Tables();
    const { id } = req.params;
    const { ly_do_tu_choi } = req.body;
    const userId = req.user?.id || 1;

    await client.query('BEGIN');

    const lockRes = await client.query(
      `SELECT id, ma_yeu_cau_mua, trang_thai FROM yeu_cau_mua_hang WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (lockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy yêu cầu mua hàng ID ${id}`,
      });
    }

    const currentPR = lockRes.rows[0];
    if (currentPR.trang_thai !== 'cho_duyet') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Không thể từ chối yêu cầu [${currentPR.ma_yeu_cau_mua}]. Trạng thái hiện tại là [${currentPR.trang_thai}].`,
      });
    }

    const updateRes = await client.query(
      `UPDATE yeu_cau_mua_hang SET
         trang_thai = 'tu_choi',
         ghi_chu = CASE WHEN $1::text IS NOT NULL THEN COALESCE(ghi_chu || ' | Từ chối: ' || $1, 'Từ chối: ' || $1) ELSE ghi_chu END,
         nguoi_cap_nhat = $2,
         ngay_cap_nhat = NOW()
       WHERE id = $3 AND trang_thai = 'cho_duyet'
       RETURNING *`,
      [ly_do_tu_choi || null, userId, id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Đã từ chối yêu cầu mua hàng [${currentPR.ma_yeu_cau_mua}].`,
      data: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * POST /api/v1/purchasing/requisitions/:id/create-po
 * Chuyển đổi nhanh PR đã duyệt thành PO
 */
async function convertPrToPo(req, res, next) {
  const client = await db.getClient();
  try {
    await ensurePh3Tables();
    const { id } = req.params;
    const { ma_nha_cung_cap, ngay_giao_hang_yc, dieu_kien_thanh_toan, chiTiet } = req.body;
    const userId = req.user?.id || 1;

    if (!ma_nha_cung_cap) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Vui lòng chọn nhà cung cấp (ma_nha_cung_cap) để lập đơn mua hàng.',
      });
    }

    await client.query('BEGIN');

    // 1. Khóa và kiểm tra PR
    const prRes = await client.query(
      `SELECT * FROM yeu_cau_mua_hang WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (prRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy yêu cầu mua hàng ID ${id}`,
      });
    }

    const pr = prRes.rows[0];
    if (pr.trang_thai !== 'da_duyet') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Yêu cầu mua hàng [${pr.ma_yeu_cau_mua}] chưa được duyệt hoặc đã xử lý (trạng thái hiện tại: [${pr.trang_thai}]).`,
      });
    }

    // 2. Lấy chi tiết PR nếu body không truyền chiTiet
    let lineItems = chiTiet;
    if (!lineItems || lineItems.length === 0) {
      const prItems = await client.query(
        `SELECT ma_vat_tu, so_luong_yeu_cau AS so_luong_dat, COALESCE(don_gia_du_kien, 0) AS don_gia, ghi_chu
         FROM chi_tiet_yeu_cau_mua WHERE ma_yeu_cau_mua_hang = $1`,
        [id]
      );
      lineItems = prItems.rows;
    }

    if (!lineItems || lineItems.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Yêu cầu mua hàng không có mặt hàng nào.',
      });
    }

    // 3. Tính tiền
    let tongTienHang = 0;
    lineItems.forEach((item) => {
      const sl = parseFloat(item.so_luong_dat) || 0;
      const dg = parseFloat(item.don_gia) || 0;
      tongTienHang += sl * dg;
    });
    const tienThue = Math.round(tongTienHang * 0.08 * 100) / 100;
    const tongThanhToan = tongTienHang + tienThue;

    const maPO = `DMH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const poRes = await client.query(
      `INSERT INTO don_mua_hang (
         ma_don_mua, ma_nha_cung_cap, ma_yeu_cau_mua_hang,
         ngay_dat_hang, ngay_giao_hang_yc,
         tong_tien_hang, tien_thue, tong_thanh_toan,
         dieu_kien_thanh_toan, nguoi_dat_hang, ghi_chu,
         trang_thai, nguoi_tao, nguoi_cap_nhat
       ) VALUES ($1, $2, $3, NOW(), COALESCE($4, NOW() + INTERVAL '7 days'), $5, $6, $7, $8, $9, $10, 'cho_duyet', $9, $9)
       RETURNING *`,
      [
        maPO,
        ma_nha_cung_cap,
        id,
        ngay_giao_hang_yc || null,
        tongTienHang,
        tienThue,
        tongThanhToan,
        dieu_kien_thanh_toan || 'Thanh toán sau 30 ngày',
        userId,
        `Tạo tự động từ yêu cầu mua [${pr.ma_yeu_cau_mua}]`,
      ]
    );

    const newPO = poRes.rows[0];

    // Chèn chi tiết PO
    for (const item of lineItems) {
      const sl = parseFloat(item.so_luong_dat);
      const dg = parseFloat(item.don_gia) || 0;
      const tt = sl * dg;
      await client.query(
        `INSERT INTO chi_tiet_don_mua (
           ma_don_mua_hang, ma_vat_tu, so_luong_dat, don_gia, thanh_tien, so_luong_da_nhap, ghi_chu, nguoi_tao
         ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7)`,
        [newPO.id, item.ma_vat_tu, sl, dg, tt, item.ghi_chu || null, userId]
      );
    }

    // Cập nhật trạng thái PR sang 'da_tao_don'
    await client.query(
      `UPDATE yeu_cau_mua_hang SET trang_thai = 'da_tao_don', ngay_cap_nhat = NOW(), nguoi_cap_nhat = $1 WHERE id = $2`,
      [userId, id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Đã tạo thành công Đơn mua hàng [${newPO.ma_don_mua}] từ yêu cầu mua [${pr.ma_yeu_cau_mua}].`,
      data: {
        ...newPO,
        po: newPO,
        requisition: {
          id: pr.id,
          ma_yeu_cau_mua: pr.ma_yeu_cau_mua,
          trang_thai: 'da_tao_don',
        },
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * =============================================================================
 * 12. YÊU CẦU BÁO GIÁ (RFQ) & SO SÁNH LỰA CHỌN NHÀ CUNG CẤP
 * =============================================================================
 */

/**
 * GET /api/v1/purchasing/rfqs
 */
async function getRfqs(req, res, next) {
  try {
    await ensurePh3Tables();
    const listRes = await db.query(`
      SELECT rfq.id, rfq.ma_rfq, rfq.ma_yeu_cau_mua_hang, rfq.tieu_de,
             rfq.ngay_gui, rfq.han_bao_gia, rfq.dieu_khoan_thuong_mai, rfq.ghi_chu,
             rfq.trang_thai, rfq.ngay_tao, rfq.ngay_cap_nhat,
             ycm.ma_yeu_cau_mua,
             COALESCE(ct_agg.so_bao_gia_nhan_duoc, 0) AS so_bao_gia_nhan_duoc
      FROM yeu_cau_bao_gia rfq
      LEFT JOIN yeu_cau_mua_hang ycm ON rfq.ma_yeu_cau_mua_hang = ycm.id
      LEFT JOIN (
        SELECT ma_rfq, COUNT(id) AS so_bao_gia_nhan_duoc
        FROM chi_tiet_bao_gia_ncc
        GROUP BY ma_rfq
      ) ct_agg ON rfq.id = ct_agg.ma_rfq
      ORDER BY rfq.id DESC
    `);
    res.json({ success: true, data: listRes.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/purchasing/rfqs/:id
 */
async function getRfqDetail(req, res, next) {
  try {
    await ensurePh3Tables();
    const { id } = req.params;

    const rfqRes = await db.query(
      `SELECT rfq.*, ycm.ma_yeu_cau_mua
       FROM yeu_cau_bao_gia rfq
       LEFT JOIN yeu_cau_mua_hang ycm ON rfq.ma_yeu_cau_mua_hang = ycm.id
       WHERE rfq.id = $1`,
      [id]
    );

    if (rfqRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy yêu cầu báo giá ID ${id}`,
      });
    }

    const quotesRes = await db.query(
      `SELECT ct.*,
              ncc.ten_nha_cung_cap, ncc.ma_nha_cung_cap, ncc.diem_danh_gia,
              ncc.so_dien_thoai AS sdt_ncc, ncc.email AS email_ncc,
              vt.ten_vat_tu, vt.ma_vat_tu,
              dvt.ten_don_vi
       FROM chi_tiet_bao_gia_ncc ct
       JOIN nha_cung_cap ncc ON ct.ma_nha_cung_cap = ncc.id
       JOIN vat_tu vt ON ct.ma_vat_tu = vt.id
       LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
       WHERE ct.ma_rfq = $1
       ORDER BY ct.don_gia_chao ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...rfqRes.rows[0],
        baoGia: quotesRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/purchasing/rfqs
 */
async function createRfq(req, res, next) {
  try {
    await ensurePh3Tables();
    const validation = validateRfqInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Dữ liệu yêu cầu báo giá không hợp lệ.',
        errors: validation.errors,
      });
    }

    const { tieu_de, ma_yeu_cau_mua_hang, han_bao_gia, dieu_khoan_thuong_mai, ghi_chu } = req.body;
    const userId = req.user?.id || 1;
    const maRfq = `RFQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const rfqRes = await db.query(
      `INSERT INTO yeu_cau_bao_gia (
         ma_rfq, ma_yeu_cau_mua_hang, tieu_de, han_bao_gia,
         dieu_khoan_thuong_mai, ghi_chu, trang_thai, nguoi_tao, nguoi_cap_nhat
       ) VALUES ($1, $2, $3, $4, $5, $6, 'dang_mo', $7, $7)
       RETURNING *`,
      [maRfq, ma_yeu_cau_mua_hang || null, tieu_de.trim(), han_bao_gia, dieu_khoan_thuong_mai || null, ghi_chu || null, userId]
    );

    res.status(201).json({
      success: true,
      message: 'Tạo đợt yêu cầu báo giá thành công.',
      data: rfqRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/purchasing/rfqs/:id/quotes
 * Tiếp nhận báo giá từ một NCC
 */
async function submitQuote(req, res, next) {
  try {
    await ensurePh3Tables();
    const { id } = req.params;
    const validation = validateQuoteInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Dữ liệu báo giá không hợp lệ.',
        errors: validation.errors,
      });
    }

    const {
      ma_nha_cung_cap,
      ma_vat_tu,
      so_luong_chao,
      don_gia_chao,
      thoi_gian_giao_hang_ngay = 7,
      dieu_kien_thanh_toan,
      ghi_chu,
    } = req.body;
    const userId = req.user?.id || 1;

    // Kiểm tra RFQ tồn tại
    const rfqCheck = await db.query('SELECT id, trang_thai FROM yeu_cau_bao_gia WHERE id = $1', [id]);
    if (rfqCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy RFQ ID ${id}`,
      });
    }

    const quoteRes = await db.query(
      `INSERT INTO chi_tiet_bao_gia_ncc (
         ma_rfq, ma_nha_cung_cap, ma_vat_tu, so_luong_chao, don_gia_chao,
         thoi_gian_giao_hang_ngay, dieu_kien_thanh_toan, ghi_chu, nguoi_tao
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        ma_nha_cung_cap,
        ma_vat_tu,
        parseFloat(so_luong_chao),
        parseFloat(don_gia_chao),
        parseInt(thoi_gian_giao_hang_ngay, 10) || 7,
        dieu_kien_thanh_toan || null,
        ghi_chu || null,
        userId,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Tiếp nhận báo giá từ nhà cung cấp thành công.',
      data: quoteRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/purchasing/rfqs/:id/select-vendor
 * Chốt lựa chọn nhà cung cấp trúng thầu + Ghi nhận lý do lựa chọn + Tùy chọn sinh PO
 */
async function selectVendorQuote(req, res, next) {
  const client = await db.getClient();
  try {
    await ensurePh3Tables();
    const { id } = req.params;
    const { quote_id, ly_do_chon, auto_create_po = true } = req.body;
    const userId = req.user?.id || 1;

    if (!quote_id) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Vui lòng chỉ định báo giá được chọn (quote_id).',
      });
    }

    if (!ly_do_chon || !ly_do_chon.trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Vui lòng ghi nhận lý do lựa chọn nhà cung cấp (ly_do_chon).',
      });
    }

    await client.query('BEGIN');

    // 1. Kiểm tra quote
    const quoteRes = await client.query(
      `SELECT ct.*, ncc.ten_nha_cung_cap, rfq.ma_rfq, rfq.ma_yeu_cau_mua_hang
       FROM chi_tiet_bao_gia_ncc ct
       JOIN nha_cung_cap ncc ON ct.ma_nha_cung_cap = ncc.id
       JOIN yeu_cau_bao_gia rfq ON ct.ma_rfq = rfq.id
       WHERE ct.id = $1 AND ct.ma_rfq = $2`,
      [quote_id, id]
    );

    if (quoteRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Không tìm thấy báo giá chỉ định trong RFQ này.',
      });
    }

    const quote = quoteRes.rows[0];

    // 2. Bỏ chọn các quote khác và chọn quote này
    await client.query(`UPDATE chi_tiet_bao_gia_ncc SET da_chon = FALSE WHERE ma_rfq = $1`, [id]);
    await client.query(
      `UPDATE chi_tiet_bao_gia_ncc SET da_chon = TRUE, ly_do_chon = $1 WHERE id = $2`,
      [ly_do_chon.trim(), quote_id]
    );

    // 3. Cập nhật RFQ sang 'da_chot'
    await client.query(
      `UPDATE yeu_cau_bao_gia SET trang_thai = 'da_chot', ngay_cap_nhat = NOW(), nguoi_cap_nhat = $1 WHERE id = $2`,
      [userId, id]
    );

    let createdPo = null;

    // 4. Nếu auto_create_po = true, tự động sinh Đơn mua hàng (PO)
    if (auto_create_po) {
      const maPO = `DMH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const sl = parseFloat(quote.so_luong_chao);
      const dg = parseFloat(quote.don_gia_chao);
      const tongTienHang = sl * dg;
      const tienThue = Math.round(tongTienHang * 0.08 * 100) / 100;
      const tongThanhToan = tongTienHang + tienThue;

      const poInsert = await client.query(
        `INSERT INTO don_mua_hang (
           ma_don_mua, ma_nha_cung_cap, ma_yeu_cau_mua_hang,
           ngay_dat_hang, ngay_giao_hang_yc,
           tong_tien_hang, tien_thue, tong_thanh_toan,
           dieu_kien_thanh_toan, nguoi_dat_hang, ghi_chu,
           trang_thai, nguoi_tao, nguoi_cap_nhat
         ) VALUES ($1, $2, $3, NOW(), NOW() + ($4 || ' days')::INTERVAL, $5, $6, $7, $8, $9, $10, 'cho_duyet', $9, $9)
         RETURNING *`,
        [
          maPO,
          quote.ma_nha_cung_cap,
          quote.ma_yeu_cau_mua_hang || null,
          quote.thoi_gian_giao_hang_ngay || 7,
          tongTienHang,
          tienThue,
          tongThanhToan,
          quote.dieu_kien_thanh_toan || 'Theo báo giá thầu',
          userId,
          `Tạo tự động từ kết quả lựa chọn báo giá [${quote.ma_rfq}] - Lý do: ${ly_do_chon}`,
        ]
      );
      createdPo = poInsert.rows[0];

      await client.query(
        `INSERT INTO chi_tiet_don_mua (
           ma_don_mua_hang, ma_vat_tu, so_luong_dat, don_gia, thanh_tien, so_luong_da_nhap, ghi_chu, nguoi_tao
         ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7)`,
        [createdPo.id, quote.ma_vat_tu, sl, dg, tongTienHang, quote.ghi_chu || null, userId]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Đã chọn nhà cung cấp [${quote.ten_nha_cung_cap}] trúng thầu thành công.${createdPo ? ` Đơn mua hàng [${createdPo.ma_don_mua}] đã được tạo tự động.` : ''}`,
      data: {
        rfq_id: id,
        selected_quote: quote,
        ly_do_chon: ly_do_chon.trim(),
        created_po: createdPo,
        po: createdPo,
        rfq: {
          id,
          trang_thai: 'da_chot',
        },
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * =============================================================================
 * 13. ĐÁNH GIÁ NHÀ CUNG CẤP (SUPPLIER EVALUATION)
 * =============================================================================
 */

/**
 * GET /api/v1/purchasing/suppliers/:id/evaluations
 */
async function getSupplierEvaluations(req, res, next) {
  try {
    await ensurePh3Tables();
    const { id } = req.params;

    const listRes = await db.query(
      `SELECT dg.*, nd.ho_ten AS ten_nguoi_danh_gia
       FROM danh_gia_ncc dg
       LEFT JOIN nguoi_dung nd ON dg.nguoi_danh_gia = nd.id
       WHERE dg.ma_nha_cung_cap = $1
       ORDER BY dg.id DESC`,
      [id]
    );

    res.json({ success: true, data: listRes.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/purchasing/suppliers/:id/evaluations
 */
async function createSupplierEvaluation(req, res, next) {
  const client = await db.getClient();
  try {
    await ensurePh3Tables();
    const { id } = req.params;
    const body = { ...req.body, ma_nha_cung_cap: id };

    const validation = validateEvaluationInput(body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Dữ liệu đánh giá nhà cung cấp không hợp lệ.',
        errors: validation.errors,
      });
    }

    const {
      ky_danh_gia,
      diem_chat_luong,
      diem_giao_hang,
      diem_tien_do,
      diem_gia_ca,
      nhan_xet,
    } = req.body;
    const userId = req.user?.id || 1;

    const currentQ = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${new Date().getFullYear()}`;
    const ky = (ky_danh_gia && ky_danh_gia.trim()) ? ky_danh_gia.trim() : currentQ;

    const cl = parseFloat(diem_chat_luong);
    const deliveryScore = diem_giao_hang !== undefined ? diem_giao_hang : diem_tien_do;
    const gh = parseFloat(deliveryScore);
    const gc = parseFloat(diem_gia_ca);
    const diemTongHop = Math.round((cl * 0.4 + gh * 0.3 + gc * 0.3) * 10) / 10;

    await client.query('BEGIN');

    const evalRes = await client.query(
      `INSERT INTO danh_gia_ncc (
         ma_nha_cung_cap, ky_danh_gia, diem_chat_luong, diem_giao_hang,
         diem_gia_ca, diem_tong_hop, nhan_xet, nguoi_danh_gia, ngay_danh_gia, nguoi_tao
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $8)
       RETURNING *`,
      [id, ky, cl, gh, gc, diemTongHop, nhan_xet || null, userId]
    );

    // Cập nhật điểm đánh giá trung bình lên nha_cung_cap
    const avgRes = await client.query(
      `SELECT AVG(diem_tong_hop) AS dtb FROM danh_gia_ncc WHERE ma_nha_cung_cap = $1`,
      [id]
    );
    const dtb = Math.round((parseFloat(avgRes.rows[0]?.dtb) || diemTongHop) * 10) / 10;

    await client.query(
      `UPDATE nha_cung_cap SET diem_danh_gia = $1, ngay_cap_nhat = NOW() WHERE id = $2`,
      [dtb, id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Ghi nhận đánh giá nhà cung cấp thành công.',
      data: evalRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  getDashboardStats,
  getCoreKpiContract,
  getSuppliers,
  getSupplierDetail,
  createSupplier,
  updateSupplier,
  getPurchaseOrders,
  getPurchaseOrderDetail,
  createPurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  updateStatusTransition,
  getReceivingOrders,
  receiveStatusUpdate,
  getReports,
  getPurchaseRequisitions,
  getRequisitionDetail,
  createPurchaseRequisition,
  approveRequisition,
  rejectRequisition,
  convertPrToPo,
  getRfqs,
  getRfqDetail,
  createRfq,
  submitQuote,
  selectVendorQuote,
  getSupplierEvaluations,
  createSupplierEvaluation,
};

