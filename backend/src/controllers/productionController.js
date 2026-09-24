/**
 * ERP May 10 — Production Controller (PH2: Sản xuất & Hoạch định nguyên liệu)
 * Migrated from Frontend/localStorage into Node.js + Express + PostgreSQL erp_may10
 */

const db = require('../config/database');
const {
  validatePlanInput,
  validateBomInput,
  validateOrderInput,
  validateResultInput,
} = require('../validators/productionValidator');

// 1. Dashboard Overview Stats
async function getDashboardStats(req, res) {
  try {
    // 1.1. Kế hoạch chờ duyệt
    const pendingPlansRes = await db.query(
      `SELECT COUNT(*) FROM ke_hoach_san_xuat WHERE trang_thai = 'cho_duyet'`
    );
    const pendingPlans = parseInt(pendingPlansRes.rows[0].count, 10);

    // 1.2. Lệnh đang sản xuất
    const activeOrdersRes = await db.query(
      `SELECT COUNT(*) FROM lenh_san_xuat WHERE trang_thai = 'dang_san_xuat'`
    );
    const activeOrders = parseInt(activeOrdersRes.rows[0].count, 10);

    // 1.3. Tỷ lệ hoàn thành trung bình
    const completionRes = await db.query(
      `SELECT 
         COALESCE(AVG(CASE WHEN so_luong_yeu_cau > 0 THEN (so_luong_hoan_thanh / so_luong_yeu_cau) * 100 ELSE 0 END), 0) AS avg_completion
       FROM lenh_san_xuat
       WHERE trang_thai != 'huy'`
    );
    const completionRate = Math.round(parseFloat(completionRes.rows[0].avg_completion));

    // 1.4. Tính số lượng vật tư thiếu hụt (MRP Shortage)
    const mrpData = await calculateMrpInternal();
    const shortageCount = mrpData.filter((m) => m.so_luong_can_mua > 0).length;

    // 1.5. Kế hoạch gần đây
    const recentPlansRes = await db.query(
      `SELECT kh.*, sp.ma_san_pham, sp.ten_san_pham, dvt.ten_don_vi AS don_vi_tinh
       FROM ke_hoach_san_xuat kh
       LEFT JOIN san_pham sp ON sp.id = kh.ma_san_pham
       LEFT JOIN don_vi_tinh dvt ON dvt.id = sp.ma_don_vi_tinh
       ORDER BY kh.ngay_tao DESC
       LIMIT 5`
    );

    // 1.6. Lệnh sản xuất đang chạy
    const recentOrdersRes = await db.query(
      `SELECT lsx.*, sp.ma_san_pham, sp.ten_san_pham, kh.ma_ke_hoach
       FROM lenh_san_xuat lsx
       LEFT JOIN ke_hoach_san_xuat kh ON kh.id = lsx.ma_ke_hoach_san_xuat
       LEFT JOIN san_pham sp ON sp.id = lsx.ma_san_pham
       ORDER BY lsx.ngay_tao DESC
       LIMIT 5`
    );

    return res.json({
      success: true,
      data: {
        pendingPlans,
        activeOrders,
        completionRate,
        shortageCount,
        recentPlans: recentPlansRes.rows,
        recentOrders: recentOrdersRes.rows,
      },
    });
  } catch (err) {
    console.error('[ProductionController.getDashboardStats Error]:', err);
    return res.status(500).json({
      success: false,
      errorCode: 'INTERNAL_ERROR',
      message: 'Lỗi máy chủ khi tải thống kê sản xuất.',
      error: err.message,
    });
  }
}

// 2. Kế hoạch sản xuất (Plans)
async function getPlans(req, res) {
  try {
    const { trang_thai, search } = req.query;
    let query = `
      SELECT kh.*, sp.ma_san_pham, sp.ten_san_pham, dvt.ten_don_vi AS don_vi_tinh,
             u.ho_ten AS nguoi_lap
      FROM ke_hoach_san_xuat kh
      LEFT JOIN san_pham sp ON sp.id = kh.ma_san_pham
      LEFT JOIN don_vi_tinh dvt ON dvt.id = sp.ma_don_vi_tinh
      LEFT JOIN nguoi_dung u ON u.id = kh.nguoi_lap_ke_hoach
      WHERE 1=1
    `;
    const params = [];

    if (trang_thai && trang_thai !== 'all') {
      params.push(trang_thai);
      query += ` AND kh.trang_thai = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(kh.ma_ke_hoach) LIKE $${params.length} OR LOWER(sp.ten_san_pham) LIKE $${params.length})`;
    }

    query += ` ORDER BY kh.ngay_tao DESC`;
    const result = await db.query(query, params);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error('[ProductionController.getPlans Error]:', err);
    return res.status(500).json({
      success: false,
      errorCode: 'INTERNAL_ERROR',
      message: 'Lỗi máy chủ khi lấy danh sách kế hoạch sản xuất.',
    });
  }
}

async function getPlanById(req, res) {
  try {
    const { id } = req.params;
    const query = `
      SELECT kh.*, sp.ma_san_pham, sp.ten_san_pham, dvt.ten_don_vi AS don_vi_tinh,
             u.ho_ten AS nguoi_lap
      FROM ke_hoach_san_xuat kh
      LEFT JOIN san_pham sp ON sp.id = kh.ma_san_pham
      LEFT JOIN don_vi_tinh dvt ON dvt.id = sp.ma_don_vi_tinh
      LEFT JOIN nguoi_dung u ON u.id = kh.nguoi_lap_ke_hoach
      WHERE kh.id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Không tìm thấy kế hoạch sản xuất.',
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error('[ProductionController.getPlanById Error]:', err);
    return res.status(500).json({
      success: false,
      errorCode: 'INTERNAL_ERROR',
      message: 'Lỗi máy chủ khi lấy chi tiết kế hoạch sản xuất.',
    });
  }
}

async function updatePlan(req, res) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const validation = validatePlanInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: validation.errors.join(' ') });
    }

    await client.query('BEGIN');
    const currentRes = await client.query(
      `SELECT * FROM ke_hoach_san_xuat WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (!currentRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Không tìm thấy kế hoạch sản xuất.' });
    }

    const current = currentRes.rows[0];
    if (['hoan_thanh', 'huy'].includes(current.trang_thai)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, errorCode: 'CONFLICT', message: 'Không thể sửa kế hoạch đã hoàn thành hoặc đã hủy.' });
    }

    // Giữ an toàn liên phân hệ: sau khi kế hoạch đã duyệt/đang chạy,
    // không đổi sản phẩm và số lượng vì MRP đã được ghi nhận cho kế hoạch.
    const approved = ['da_duyet', 'dang_thuc_hien', 'tam_dung'].includes(current.trang_thai);
    const maSanPham = approved ? current.ma_san_pham : (req.body.ma_san_pham ?? current.ma_san_pham);
    const soLuong = approved ? current.so_luong_ke_hoach : (req.body.so_luong_ke_hoach ?? current.so_luong_ke_hoach);

    const result = await client.query(
      `UPDATE ke_hoach_san_xuat
       SET ma_ke_hoach = COALESCE($1, ma_ke_hoach),
           ma_san_pham = $2,
           so_luong_ke_hoach = $3,
           ngay_bat_dau = COALESCE($4, ngay_bat_dau),
           ngay_ket_thuc = COALESCE($5, ngay_ket_thuc),
           ghi_chu = COALESCE($6, ghi_chu),
           ma_don_ban_hang = COALESCE($7, ma_don_ban_hang),
           ngay_cap_nhat = NOW(),
           nguoi_cap_nhat = $8
       WHERE id = $9
       RETURNING *`,
      [
        req.body.ma_ke_hoach?.trim() || null,
        maSanPham,
        soLuong,
        req.body.ngay_bat_dau || null,
        req.body.ngay_ket_thuc || null,
        req.body.ghi_chu ?? null,
        req.body.ma_don_ban_hang ?? null,
        req.user?.id || 1,
        id,
      ]
    );

    await client.query('COMMIT');
    return res.json({
      success: true,
      message: 'Đã cập nhật kế hoạch sản xuất thành công.',
      data: result.rows[0],
      protectedFields: approved ? ['ma_san_pham', 'so_luong_ke_hoach'] : [],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ProductionController.updatePlan Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi khi cập nhật kế hoạch sản xuất.', error: err.message });
  } finally {
    client.release();
  }
}

async function createPlan(req, res) {
  try {
    const validation = validatePlanInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: validation.errors.join(' '),
      });
    }

    const {
      ma_ke_hoach,
      ma_san_pham,
      so_luong_ke_hoach,
      ngay_bat_dau,
      ngay_ket_thuc,
      ghi_chu,
      ma_don_ban_hang,
    } = req.body;

    const code = ma_ke_hoach
      ? ma_ke_hoach.trim().toUpperCase()
      : `KHSX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const userId = req.user?.id || 1;

    const result = await db.query(
      `INSERT INTO ke_hoach_san_xuat (
         ma_ke_hoach, ma_san_pham, so_luong_ke_hoach, ngay_bat_dau, ngay_ket_thuc, 
         ghi_chu, ma_don_ban_hang, nguoi_lap_ke_hoach, trang_thai, nguoi_tao
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'cho_duyet', $8)
       RETURNING *`,
      [
        code,
        ma_san_pham,
        so_luong_ke_hoach,
        ngay_bat_dau || new Date().toISOString(),
        ngay_ket_thuc || new Date(Date.now() + 86400000 * 10).toISOString(),
        ghi_chu || null,
        ma_don_ban_hang || null,
        userId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Đã tạo kế hoạch sản xuất mới thành công.',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('[ProductionController.createPlan Error]:', err);
    return res.status(500).json({
      success: false,
      errorCode: 'INTERNAL_ERROR',
      message: 'Lỗi máy chủ khi tạo kế hoạch sản xuất.',
      error: err.message,
    });
  }
}

async function approvePlan(req, res) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    // Khóa dòng kế hoạch chống xung đột đồng thời
    const planLock = await client.query(
      `SELECT * FROM ke_hoach_san_xuat WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (planLock.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Không tìm thấy kế hoạch sản xuất yêu cầu.',
      });
    }

    const plan = planLock.rows[0];

    // Kiểm tra trạng thái hợp lệ để duyệt
    if (plan.trang_thai !== 'cho_duyet') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Kế hoạch sản xuất [${plan.ma_ke_hoach}] đang ở trạng thái "${plan.trang_thai}", không thể phê duyệt lại.`,
      });
    }

    // Quy tắc nghiệp vụ từ src/main.js: Phải có BOM hiệu lực cho sản phẩm mới được duyệt
    const bomRes = await client.query(
      `SELECT * FROM dinh_muc_nguyen_lieu 
       WHERE ma_san_pham = $1 AND trang_thai = 'hieu_luc'`,
      [plan.ma_san_pham]
    );

    if (bomRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        errorCode: 'BOM_MISSING',
        message: `Sản phẩm này chưa có định mức nguyên liệu (BOM) hiệu lực. Vui lòng thiết lập định mức trước khi duyệt.`,
      });
    }

    // Tính toán nhu cầu NVL và lưu vào bảng nhu_cau_npl
    const shortages = [];
    for (const b of bomRes.rows) {
      const norm = parseFloat(b.dinh_muc);
      const wastePct = parseFloat(b.ty_le_hao_hut || 0);
      const needed = parseFloat(plan.so_luong_ke_hoach) * norm * (1 + wastePct / 100);

      // Tra cứu tồn kho khả dụng hiện tại từ PH4 (chỉ SELECT, KHÔNG sửa ton_kho)
      const stockRes = await client.query(
        `SELECT COALESCE(SUM(so_luong_ton), 0) AS stock 
         FROM ton_kho 
         WHERE ma_vat_tu = $1`,
        [b.ma_vat_tu]
      );
      const currentStock = parseFloat(stockRes.rows[0].stock);
      const missing = Math.max(0, needed - currentStock);

      if (missing > 0) {
        shortages.push({
          ma_vat_tu: b.ma_vat_tu,
          needed,
          currentStock,
          missing,
        });
      }

      await client.query(
        `INSERT INTO nhu_cau_npl (
           ma_ke_hoach_san_xuat, ma_vat_tu, so_luong_can, so_luong_ton_kho, 
           so_luong_can_mua, ngay_can, da_tao_yeu_cau_mua, ghi_chu, nguoi_tao
         ) VALUES ($1, $2, $3, $4, $5, $6, 'chua_tao', $7, $8)`,
        [
          plan.id,
          b.ma_vat_tu,
          needed,
          currentStock,
          missing,
          plan.ngay_bat_dau,
          `Hoạch định NVL tự động cho KHSX ${plan.ma_ke_hoach}`,
          req.user?.id || 1,
        ]
      );
    }

    // Cập nhật trạng thái kế hoạch
    const updatedRes = await client.query(
      `UPDATE ke_hoach_san_xuat 
       SET trang_thai = 'da_duyet', ngay_cap_nhat = NOW(), nguoi_cap_nhat = $1
       WHERE id = $2
       RETURNING *`,
      [req.user?.id || 1, plan.id]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: `Đã phê duyệt kế hoạch [${plan.ma_ke_hoach}] thành công.`,
      data: updatedRes.rows[0],
      shortages,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ProductionController.approvePlan Error]:', err);
    return res.status(500).json({
      success: false,
      errorCode: 'INTERNAL_ERROR',
      message: 'Lỗi máy chủ khi phê duyệt kế hoạch sản xuất.',
      error: err.message,
    });
  } finally {
    client.release();
  }
}

async function pausePlan(req, res) {
  try {
    const { id } = req.params;
    const planRes = await db.query(`SELECT * FROM ke_hoach_san_xuat WHERE id = $1`, [id]);

    if (planRes.rows.length === 0) {
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Không tìm thấy kế hoạch.' });
    }

    const plan = planRes.rows[0];
    const resume = plan.trang_thai === 'tam_dung';
    const newStatus = resume ? 'da_duyet' : 'tam_dung';

    const updated = await db.query(
      `UPDATE ke_hoach_san_xuat SET trang_thai = $1, ngay_cap_nhat = NOW() WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );

    return res.json({
      success: true,
      message: resume ? `Đã tiếp tục kế hoạch [${plan.ma_ke_hoach}].` : `Đã tạm dừng kế hoạch [${plan.ma_ke_hoach}].`,
      data: updated.rows[0],
    });
  } catch (err) {
    console.error('[ProductionController.pausePlan Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi khi tạm dừng/tiếp tục kế hoạch.' });
  }
}

async function cancelPlan(req, res) {
  try {
    const { id } = req.params;
    const planRes = await db.query(`SELECT * FROM ke_hoach_san_xuat WHERE id = $1`, [id]);

    if (planRes.rows.length === 0) {
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Không tìm thấy kế hoạch.' });
    }

    const plan = planRes.rows[0];
    // Kiểm tra xem đã có lệnh sản xuất nào đã hoàn thành một phần chưa
    const orderCheck = await db.query(
      `SELECT * FROM lenh_san_xuat WHERE ma_ke_hoach_san_xuat = $1 AND so_luong_hoan_thanh > 0`,
      [id]
    );
    if (orderCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        errorCode: 'CANNOT_CANCEL',
        message: 'Không thể hủy kế hoạch đã phát sinh sản lượng hoàn thành trên lệnh sản xuất.',
      });
    }

    const updated = await db.query(
      `UPDATE ke_hoach_san_xuat SET trang_thai = 'huy', ngay_cap_nhat = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    return res.json({
      success: true,
      message: `Đã hủy kế hoạch [${plan.ma_ke_hoach}].`,
      data: updated.rows[0],
    });
  } catch (err) {
    console.error('[ProductionController.cancelPlan Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi khi hủy kế hoạch.' });
  }
}

// 3. Định mức nguyên liệu (BOM)
async function getBom(req, res) {
  try {
    const { ma_san_pham, ke_hoach_id, plan_id, search } = req.query;
    const planFilter = ke_hoach_id || plan_id;
    let query = `
      SELECT b.*, sp.ma_san_pham, sp.ten_san_pham, vt.ma_vat_tu, vt.ten_vat_tu, 
             dvt.ten_don_vi AS don_vi_tinh
      FROM dinh_muc_nguyen_lieu b
      JOIN san_pham sp ON sp.id = b.ma_san_pham
      JOIN vat_tu vt ON vt.id = b.ma_vat_tu
      LEFT JOIN don_vi_tinh dvt ON dvt.id = vt.ma_don_vi_tinh
      WHERE 1=1
    `;
    const params = [];

    if (planFilter) {
      params.push(planFilter);
      query += ` AND b.ma_san_pham = (SELECT ma_san_pham FROM ke_hoach_san_xuat WHERE id = $${params.length})`;
    } else if (ma_san_pham) {
      params.push(ma_san_pham);
      query += ` AND b.ma_san_pham = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(sp.ten_san_pham) LIKE $${params.length} OR LOWER(vt.ten_vat_tu) LIKE $${params.length})`;
    }

    query += ` ORDER BY sp.ma_san_pham, b.id`;
    const result = await db.query(query, params);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error('[ProductionController.getBom Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi máy chủ khi lấy danh mục định mức.' });
  }
}

async function createBom(req, res) {
  try {
    const validation = validateBomInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: validation.errors.join(' ') });
    }

    const { ma_san_pham, ma_vat_tu, dinh_muc, ty_le_hao_hut, trang_thai, ghi_chu } = req.body;

    const dupCheck = await db.query(
      `SELECT * FROM dinh_muc_nguyen_lieu WHERE ma_san_pham = $1 AND ma_vat_tu = $2`,
      [ma_san_pham, ma_vat_tu]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        errorCode: 'DUPLICATE_BOM',
        message: 'Sản phẩm này đã có định mức cho nguyên vật liệu đã chọn. Vui lòng cập nhật thay vì tạo mới.',
      });
    }

    const waste = ty_le_hao_hut !== undefined ? parseFloat(ty_le_hao_hut) : 2;
    const actualNorm = parseFloat(dinh_muc) * (1 + waste / 100);

    const result = await db.query(
      `INSERT INTO dinh_muc_nguyen_lieu (
         ma_san_pham, ma_vat_tu, dinh_muc, ty_le_hao_hut, dinh_muc_thuc_te, trang_thai, ghi_chu, nguoi_tao
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        ma_san_pham,
        ma_vat_tu,
        dinh_muc,
        waste,
        actualNorm,
        trang_thai || 'hieu_luc',
        ghi_chu || null,
        req.user?.id || 1,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Đã thêm định mức nguyên vật liệu thành công.',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('[ProductionController.createBom Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi máy chủ khi tạo định mức.' });
  }
}

async function updateBom(req, res) {
  try {
    const { id } = req.params;
    const { dinh_muc, ty_le_hao_hut, trang_thai, ghi_chu } = req.body;

    const result = await db.query(
      `UPDATE dinh_muc_nguyen_lieu
       SET dinh_muc = COALESCE($1, dinh_muc),
           ty_le_hao_hut = COALESCE($2, ty_le_hao_hut),
           dinh_muc_thuc_te = COALESCE($1, dinh_muc) * (1 + COALESCE($2, ty_le_hao_hut) / 100),
           trang_thai = COALESCE($3, trang_thai),
           ghi_chu = COALESCE($4, ghi_chu),
           ngay_cap_nhat = NOW()
       WHERE id = $5
       RETURNING *`,
      [dinh_muc, ty_le_hao_hut, trang_thai, ghi_chu, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Không tìm thấy định mức.' });
    }

    return res.json({
      success: true,
      message: 'Đã cập nhật định mức thành công.',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('[ProductionController.updateBom Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi máy chủ khi cập nhật định mức.' });
  }
}

// 4. Lệnh sản xuất (Orders)
async function getOrders(req, res) {
  try {
    const { trang_thai, search } = req.query;
    let query = `
      SELECT lsx.*, kh.ma_ke_hoach, sp.ma_san_pham, sp.ten_san_pham, dvt.ten_don_vi AS don_vi_tinh,
             u.ho_ten AS ten_nguoi_phu_trach
      FROM lenh_san_xuat lsx
      JOIN ke_hoach_san_xuat kh ON kh.id = lsx.ma_ke_hoach_san_xuat
      JOIN san_pham sp ON sp.id = lsx.ma_san_pham
      LEFT JOIN don_vi_tinh dvt ON dvt.id = sp.ma_don_vi_tinh
      LEFT JOIN nguoi_dung u ON u.id = lsx.nguoi_phu_trach
      WHERE 1=1
    `;
    const params = [];

    if (trang_thai && trang_thai !== 'all') {
      params.push(trang_thai);
      query += ` AND lsx.trang_thai = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(lsx.ma_lenh_san_xuat) LIKE $${params.length} OR LOWER(sp.ten_san_pham) LIKE $${params.length})`;
    }

    query += ` ORDER BY lsx.ngay_tao DESC`;
    const result = await db.query(query, params);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error('[ProductionController.getOrders Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi máy chủ khi lấy danh sách lệnh sản xuất.' });
  }
}

async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const query = `
      SELECT lsx.*, kh.ma_ke_hoach, sp.ma_san_pham, sp.ten_san_pham, dvt.ten_don_vi AS don_vi_tinh,
             u.ho_ten AS ten_nguoi_phu_trach
      FROM lenh_san_xuat lsx
      JOIN ke_hoach_san_xuat kh ON kh.id = lsx.ma_ke_hoach_san_xuat
      JOIN san_pham sp ON sp.id = lsx.ma_san_pham
      LEFT JOIN don_vi_tinh dvt ON dvt.id = sp.ma_don_vi_tinh
      LEFT JOIN nguoi_dung u ON u.id = lsx.nguoi_phu_trach
      WHERE lsx.id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Không tìm thấy lệnh sản xuất.',
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error('[ProductionController.getOrderById Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi máy chủ khi lấy chi tiết lệnh sản xuất.' });
  }
}

async function createOrder(req, res) {
  const client = await db.getClient();
  try {
    const validation = validateOrderInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: validation.errors.join(' ') });
    }

    const { ma_ke_hoach_san_xuat, so_luong_yeu_cau, nguoi_phu_trach, ghi_chu } = req.body;
    await client.query('BEGIN');

    // Kiểm tra kế hoạch
    const planRes = await client.query(
      `SELECT * FROM ke_hoach_san_xuat WHERE id = $1 FOR UPDATE`,
      [ma_ke_hoach_san_xuat]
    );

    if (planRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Không tìm thấy kế hoạch.' });
    }

    const plan = planRes.rows[0];
    if (!['da_duyet', 'dang_thuc_hien'].includes(plan.trang_thai)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATUS',
        message: 'Lệnh sản xuất chỉ được phát hành từ kế hoạch đã được phê duyệt.',
      });
    }

    const code = `LSX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const qty = parseFloat(so_luong_yeu_cau) || parseFloat(plan.so_luong_ke_hoach);

    const orderRes = await client.query(
      `INSERT INTO lenh_san_xuat (
         ma_lenh_san_xuat, ma_ke_hoach_san_xuat, ma_san_pham, so_luong_yeu_cau, 
         so_luong_hoan_thanh, ngay_bat_dau, ngay_ket_thuc_yc, nguoi_phu_trach, 
         ghi_chu, trang_thai, nguoi_tao
       ) VALUES ($1, $2, $3, $4, 0, NOW(), $5, $6, $7, 'chua_bat_dau', $8)
       RETURNING *`,
      [
        code,
        plan.id,
        plan.ma_san_pham,
        qty,
        plan.ngay_ket_thuc,
        nguoi_phu_trach || req.user?.id || 1,
        ghi_chu || null,
        req.user?.id || 1,
      ]
    );

    const newOrder = orderRes.rows[0];

    // Khởi tạo 4 công đoạn chuẩn May 10 theo src/main.js: Cắt (1), May (2), Hoàn thiện (3), KCS (4)
    const stages = [
      { name: 'Cắt vải & chuẩn bị NPL', order: 1, hours: 24, workers: 8 },
      { name: 'Chuyền may lắp ráp', order: 2, hours: 48, workers: 20 },
      { name: 'Là ép & Hoàn thiện', order: 3, hours: 16, workers: 6 },
      { name: 'Kiểm tra KCS & Đóng gói', order: 4, hours: 12, workers: 4 },
    ];

    for (const s of stages) {
      await client.query(
        `INSERT INTO cong_doan_san_xuat (
           ma_lenh_san_xuat, ten_cong_doan, so_thu_tu, thoi_gian_chuan, 
           so_cong_nhan, trang_thai, nguoi_tao
         ) VALUES ($1, $2, $3, $4, $5, 'chua_bat_dau', $6)`,
        [newOrder.id, s.name, s.order, s.hours, s.workers, req.user?.id || 1]
      );
    }

    // Cập nhật kế hoạch sang dang_thuc_hien
    await client.query(
      `UPDATE ke_hoach_san_xuat SET trang_thai = 'dang_thuc_hien' WHERE id = $1`,
      [plan.id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: `Đã phát hành lệnh sản xuất [${code}] thành công.`,
      data: newOrder,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ProductionController.createOrder Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi khi tạo lệnh sản xuất.', error: err.message });
  } finally {
    client.release();
  }
}

async function startOrder(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE lenh_san_xuat 
       SET trang_thai = 'dang_san_xuat', ngay_bat_dau = NOW(), ngay_cap_nhat = NOW()
       WHERE id = $1 AND trang_thai = 'chua_bat_dau'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATUS',
        message: 'Lệnh sản xuất không ở trạng thái "chưa bắt đầu".',
      });
    }

    // Cập nhật công đoạn đầu tiên sang dang_thuc_hien
    await db.query(
      `UPDATE cong_doan_san_xuat 
       SET trang_thai = 'dang_thuc_hien', ngay_bat_dau = NOW()
       WHERE ma_lenh_san_xuat = $1 AND so_thu_tu = 1`,
      [id]
    );

    return res.json({
      success: true,
      message: `Đã bắt đầu triển khai lệnh sản xuất [${result.rows[0].ma_lenh_san_xuat}].`,
      data: result.rows[0],
    });
  } catch (err) {
    console.error('[ProductionController.startOrder Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi máy chủ khi bắt đầu lệnh.' });
  }
}

async function pauseOrder(req, res) {
  try {
    const { id } = req.params;
    const current = await db.query(`SELECT * FROM lenh_san_xuat WHERE id = $1`, [id]);
    if (!current.rows.length) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Không tìm thấy lệnh sản xuất.',
      });
    }

    const order = current.rows[0];
    const resume = order.trang_thai === 'tam_dung';
    if (!resume && order.trang_thai !== 'dang_san_xuat') {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATUS',
        message: 'Chỉ lệnh sản xuất đã bắt đầu mới được tạm dừng.',
      });
    }

    const newStatus = resume ? 'dang_san_xuat' : 'tam_dung';
    const updated = await db.query(
      `UPDATE lenh_san_xuat SET trang_thai = $1, ngay_cap_nhat = NOW() WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );

    return res.json({
      success: true,
      message: resume
        ? `Đã tiếp tục lệnh sản xuất [${order.ma_lenh_san_xuat}].`
        : `Đã tạm dừng lệnh sản xuất [${order.ma_lenh_san_xuat}].`,
      data: updated.rows[0],
    });
  } catch (err) {
    console.error('[ProductionController.pauseOrder Error]:', err);
    return res.status(500).json({
      success: false,
      errorCode: 'INTERNAL_ERROR',
      message: 'Lỗi khi tạm dừng/tiếp tục lệnh sản xuất.',
    });
  }
}

// 5. Hoạch định nhu cầu NVL (MRP)
async function calculateMrpInternal(planId = null) {
  // Lấy tất cả KHSX đang hoạt động (da_duyet, dang_thuc_hien, tam_dung)
  const query = `
    SELECT 
      vt.id AS ma_vat_tu,
      vt.ma_vat_tu AS ma_vat_tu_code,
      vt.ten_vat_tu,
      dvt.ten_don_vi AS don_vi_tinh,
      COALESCE(SUM(kh.so_luong_ke_hoach * b.dinh_muc * (1 + b.ty_le_hao_hut / 100)), 0) AS so_luong_can,
      COALESCE(tk.stock, 0) AS so_luong_ton_kho
    FROM ke_hoach_san_xuat kh
    JOIN dinh_muc_nguyen_lieu b ON b.ma_san_pham = kh.ma_san_pham AND b.trang_thai = 'hieu_luc'
    JOIN vat_tu vt ON vt.id = b.ma_vat_tu
    LEFT JOIN don_vi_tinh dvt ON dvt.id = vt.ma_don_vi_tinh
    LEFT JOIN (
      SELECT ma_vat_tu, SUM(so_luong_ton) AS stock
      FROM ton_kho
      GROUP BY ma_vat_tu
    ) tk ON tk.ma_vat_tu = vt.id
    WHERE kh.trang_thai IN ('da_duyet', 'dang_thuc_hien', 'tam_dung')
      ${planId ? 'AND kh.id = $1' : ''}
    GROUP BY vt.id, vt.ma_vat_tu, vt.ten_vat_tu, dvt.ten_don_vi, tk.stock
    ORDER BY vt.ma_vat_tu
  `;

  const result = await db.query(query, planId ? [planId] : []);

  return result.rows.map((row) => {
    const needed = parseFloat(row.so_luong_can);
    const stock = parseFloat(row.so_luong_ton_kho);
    const missing = Math.max(0, needed - stock);
    return {
      ma_vat_tu: row.ma_vat_tu,
      ma_vat_tu_code: row.ma_vat_tu_code,
      ten_vat_tu: row.ten_vat_tu,
      don_vi_tinh: row.don_vi_tinh,
      so_luong_can: needed,
      so_luong_ton_kho: stock,
      so_luong_can_mua: missing,
      isShortage: missing > 0,
      trang_thai: missing > 0 ? 'thieu_hang' : 'du_hang',
    };
  });
}

async function getMrpStockByMaterial(req, res) {
  try {
    const maVatTu = Number(req.params.maVatTu);
    if (!Number.isInteger(maVatTu) || maVatTu <= 0) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Mã vật tư không hợp lệ.',
      });
    }

    // PH2 chỉ đọc dữ liệu tồn kho dùng chung của PH4.
    // Không cập nhật trực tiếp ton_kho để tránh trừ kho hai lần.
    const result = await db.query(
      `SELECT
         tk.ma_kho,
         k.ma_kho AS ma_kho_code,
         k.ten_kho,
         tk.ma_vat_tu,
         vt.ma_vat_tu AS ma_vat_tu_code,
         vt.ten_vat_tu,
         COALESCE(dvt.ten_don_vi, '') AS don_vi_tinh,
         COALESCE(tk.so_luong_ton, 0) AS so_luong_ton,
         tk.gia_tri_ton_kho,
         tk.ngay_cap_nhat
       FROM ton_kho tk
       JOIN kho k ON k.id = tk.ma_kho
       JOIN vat_tu vt ON vt.id = tk.ma_vat_tu
       LEFT JOIN don_vi_tinh dvt ON dvt.id = vt.ma_don_vi_tinh
       WHERE tk.ma_vat_tu = $1
       ORDER BY k.id ASC`,
      [maVatTu]
    );

    const totalStock = result.rows.reduce((sum, row) => sum + parseFloat(row.so_luong_ton || 0), 0);

    return res.json({
      success: true,
      data: {
        ma_vat_tu: maVatTu,
        tong_ton_kho: totalStock,
        warehouses: result.rows,
      },
    });
  } catch (err) {
    console.error('[ProductionController.getMrpStockByMaterial Error]:', err);
    return res.status(500).json({
      success: false,
      errorCode: 'INTERNAL_ERROR',
      message: 'Lỗi khi lấy tồn kho theo kho từ phân hệ Kho.',
    });
  }
}

async function getMrp(req, res) {
  try {
    const planId = req.query.ke_hoach_id ? Number(req.query.ke_hoach_id) : null;
    const mrpData = await calculateMrpInternal(planId);
    return res.json({
      success: true,
      data: mrpData,
    });
  } catch (err) {
    console.error('[ProductionController.getMrp Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi khi tính toán nhu cầu nguyên liệu MRP.' });
  }
}

// 5.1. Tạo Yêu cầu mua sắm (PR) sang PH3 từ kết quả MRP thiếu hụt
async function createPurchaseRequestFromMrp(req, res) {
  const client = await db.getClient();
  try {
    const { ma_vat_tu, so_luong_yeu_cau, ma_ke_hoach_san_xuat, ghi_chu } = req.body;
    if (!ma_vat_tu || !so_luong_yeu_cau || parseFloat(so_luong_yeu_cau) <= 0) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'Thông tin vật tư hoặc số lượng không hợp lệ.' });
    }

    await client.query('BEGIN');

    const prCode = `PR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Tạo Header yêu cầu mua sắm trong PH3
    const prRes = await client.query(
      `INSERT INTO yeu_cau_mua_hang (
         ma_yeu_cau_mua, nguon_yeu_cau, ngay_yeu_cau, nguoi_yeu_cau, 
         ghi_chu, trang_thai, nguoi_tao
       ) VALUES ($1, 'san_xuat', NOW(), $2, $3, 'cho_duyet', $2)
       RETURNING *`,
      [prCode, req.user?.id || 3, ghi_chu || 'Yêu cầu bổ sung NVL từ hoạch định MRP sản xuất']
    );

    const prHeader = prRes.rows[0];

    // Tạo Line item chi tiết
    await client.query(
      `INSERT INTO chi_tiet_yeu_cau_mua (
         ma_yeu_cau_mua_hang, ma_vat_tu, so_luong_yeu_cau, ngay_can_giao, 
         ma_kho_nhap, ghi_chu, nguoi_tao
       ) VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', 1, $4, $5)`,
      [
        prHeader.id,
        ma_vat_tu,
        so_luong_yeu_cau,
        ghi_chu || 'Bổ sung thiếu hụt MRP',
        req.user?.id || 3,
      ]
    );

    // Đánh dấu đúng nhu cầu NPL của kế hoạch hiện tại.
    // Nếu MRP đang tổng hợp nhiều kế hoạch thì không đánh dấu nhầm toàn bộ
    // nhu cầu cùng mã vật tư của các kế hoạch khác.
    const updateRequirementQuery = ma_ke_hoach_san_xuat
      ? `UPDATE nhu_cau_npl
         SET da_tao_yeu_cau_mua = 'da_tao', ma_yeu_cau_mua_hang = $1
         WHERE ma_vat_tu = $2
           AND ma_ke_hoach_san_xuat = $3
           AND da_tao_yeu_cau_mua = 'chua_tao'`
      : `UPDATE nhu_cau_npl
         SET da_tao_yeu_cau_mua = 'da_tao', ma_yeu_cau_mua_hang = $1
         WHERE ma_vat_tu = $2
           AND da_tao_yeu_cau_mua = 'chua_tao'`;

    const updateRequirementParams = ma_ke_hoach_san_xuat
      ? [prHeader.id, ma_vat_tu, ma_ke_hoach_san_xuat]
      : [prHeader.id, ma_vat_tu];

    await client.query(updateRequirementQuery, updateRequirementParams);

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: `Đã tạo yêu cầu mua sắm [${prCode}] chuyển tiếp sang Phân hệ Mua hàng (PH3).`,
      data: prHeader,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ProductionController.createPurchaseRequestFromMrp Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi khi tạo yêu cầu mua hàng từ MRP.' });
  } finally {
    client.release();
  }
}

// 6. Công đoạn & Kết quả sản xuất (Stages & Results)
async function getStages(req, res) {
  try {
    const { ma_lenh_san_xuat } = req.query;
    let query = `
      SELECT cd.*, lsx.ma_lenh_san_xuat, sp.ten_san_pham
      FROM cong_doan_san_xuat cd
      JOIN lenh_san_xuat lsx ON lsx.id = cd.ma_lenh_san_xuat
      JOIN san_pham sp ON sp.id = lsx.ma_san_pham
      WHERE 1=1
    `;
    const params = [];

    if (ma_lenh_san_xuat) {
      params.push(ma_lenh_san_xuat);
      query += ` AND cd.ma_lenh_san_xuat = $${params.length}`;
    }

    query += ` ORDER BY cd.ma_lenh_san_xuat, cd.so_thu_tu ASC`;
    const result = await db.query(query, params);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error('[ProductionController.getStages Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi khi lấy danh sách công đoạn.' });
  }
}

async function recordResult(req, res) {
  const client = await db.getClient();
  try {
    const validation = validateResultInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: validation.errors.join(' ') });
    }

    const { ma_lenh_san_xuat, so_luong_hoan_thanh, so_luong_loi, nhan_cong_thuc_te, ghi_chu } = req.body;
    await client.query('BEGIN');

    // Khóa dòng lệnh sản xuất
    const orderLock = await client.query(
      `SELECT * FROM lenh_san_xuat WHERE id = $1 FOR UPDATE`,
      [ma_lenh_san_xuat]
    );

    if (orderLock.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Không tìm thấy lệnh sản xuất.' });
    }

    const order = orderLock.rows[0];
    if (!['dang_san_xuat', 'tam_dung'].includes(order.trang_thai)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'INVALID_STATUS',
        message: 'Chỉ được cập nhật kết quả cho lệnh sản xuất đang sản xuất hoặc tạm dừng.',
      });
    }

    const completedBatch = parseFloat(so_luong_hoan_thanh);
    const failedBatch = parseFloat(so_luong_loi || 0);
    const currentCompleted = parseFloat(order.so_luong_hoan_thanh || 0);
    const targetQuantity = parseFloat(order.so_luong_yeu_cau || 0);
    const remainingQuantity = Math.max(0, targetQuantity - currentCompleted);

    if (completedBatch > remainingQuantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        errorCode: 'OVER_COMPLETION',
        message: `Sản lượng cập nhật (${completedBatch}) vượt số lượng còn lại (${remainingQuantity}).`,
      });
    }

    const newCompleted = currentCompleted + completedBatch;

    // Ghi nhật ký vào ket_qua_san_xuat
    const logRes = await client.query(
      `INSERT INTO ket_qua_san_xuat (
         ma_lenh_san_xuat, ngay_bao_cao, so_luong_hoan_thanh, so_luong_loi, 
         nhan_cong_thuc_te, ghi_chu, nguoi_bao_cao, nguoi_tao
       ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $6)
       RETURNING *`,
      [
        order.id,
        completedBatch,
        failedBatch,
        nhan_cong_thuc_te || 8,
        ghi_chu || null,
        req.user?.id || 1,
      ]
    );

    // Cập nhật số lượng hoàn thành trên lệnh sản xuất
    const isFinished = newCompleted >= parseFloat(order.so_luong_yeu_cau);
    const newStatus = isFinished ? 'hoan_thanh' : order.trang_thai;

    await client.query(
      `UPDATE lenh_san_xuat 
       SET so_luong_hoan_thanh = $1, 
           trang_thai = $2,
           ngay_hoan_thanh = CASE WHEN $3 = true THEN NOW() ELSE ngay_hoan_thanh END,
           ngay_cap_nhat = NOW()
       WHERE id = $4`,
      [newCompleted, newStatus, isFinished, order.id]
    );

    // Đồng bộ luồng ban đầu: khi lệnh hoàn tất thì kế hoạch liên kết cũng hoàn thành
    if (isFinished && order.ma_ke_hoach_san_xuat) {
      await client.query(
        `UPDATE ke_hoach_san_xuat
         SET trang_thai = 'hoan_thanh', ngay_cap_nhat = NOW()
         WHERE id = $1 AND trang_thai IN ('dang_thuc_hien', 'da_duyet')`,
        [order.ma_ke_hoach_san_xuat]
      );
    }

    // Cập nhật công đoạn hoàn tất nếu đạt đủ sản lượng
    if (isFinished) {
      await client.query(
        `UPDATE cong_doan_san_xuat 
         SET trang_thai = 'hoan_thanh', ngay_ket_thuc = NOW()
         WHERE ma_lenh_san_xuat = $1`,
        [order.id]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: isFinished
        ? `Đã ghi nhận kết quả và hoàn tất lệnh sản xuất [${order.ma_lenh_san_xuat}].`
        : `Đã ghi nhận kết quả sản xuất cho lệnh [${order.ma_lenh_san_xuat}].`,
      data: logRes.rows[0],
      totalCompleted: newCompleted,
      isFinished,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ProductionController.recordResult Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi khi ghi nhận kết quả sản xuất.' });
  } finally {
    client.release();
  }
}

// 7. Danh mục Sản phẩm (Products helper)
async function getProducts(req, res) {
  try {
    const result = await db.query(
      `SELECT sp.*, dvt.ten_don_vi AS don_vi_tinh 
       FROM san_pham sp
       LEFT JOIN don_vi_tinh dvt ON dvt.id = sp.ma_don_vi_tinh
       ORDER BY sp.ma_san_pham`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[ProductionController.getProducts Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi khi tải danh mục sản phẩm.' });
  }
}

// 8. Đối chiếu tiêu hao nguyên vật liệu (Material Reconciliation / Alignment with FR-09)
async function getOrderReconciliation(req, res) {
  try {
    const { orderId } = req.params;

    // Tra cứu lệnh sản xuất
    const orderRes = await db.query(
      `SELECT lsx.*, sp.id AS san_pham_id, sp.ma_san_pham AS ma_san_pham_code, sp.ten_san_pham, dvt.ten_don_vi AS don_vi_tinh
       FROM lenh_san_xuat lsx
       JOIN san_pham sp ON sp.id = lsx.ma_san_pham
       LEFT JOIN don_vi_tinh dvt ON dvt.id = sp.ma_don_vi_tinh
       WHERE lsx.id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Không tìm thấy lệnh sản xuất.' });
    }

    const order = orderRes.rows[0];

    // Tra cứu số lượng NVL thực tế PH4 đã xuất kho cho lệnh này
    const actualIssuesRes = await db.query(
      `SELECT 
         ctpx.ma_vat_tu,
         vt.ma_vat_tu AS ma_vat_tu_code,
         vt.ten_vat_tu,
         dvt.ten_don_vi AS don_vi_tinh,
         SUM(ctpx.so_luong_xuat) AS tong_xuat_thuc_te
       FROM phieu_xuat_kho px
       JOIN chi_tiet_phieu_xuat ctpx ON ctpx.ma_phieu_xuat_kho = px.id
       JOIN vat_tu vt ON vt.id = ctpx.ma_vat_tu
       LEFT JOIN don_vi_tinh dvt ON dvt.id = vt.ma_don_vi_tinh
       WHERE px.ma_lenh_san_xuat = $1 AND px.loai_xuat = 'xuat_san_xuat'
       GROUP BY ctpx.ma_vat_tu, vt.ma_vat_tu, vt.ten_vat_tu, dvt.ten_don_vi`,
      [orderId]
    );

    // Tra cứu định mức BOM chuẩn cho sản phẩm của lệnh
    const bomRes = await db.query(
      `SELECT b.*, vt.ma_vat_tu AS ma_vat_tu_code, vt.ten_vat_tu, dvt.ten_don_vi AS don_vi_tinh
       FROM dinh_muc_nguyen_lieu b
       JOIN vat_tu vt ON vt.id = b.ma_vat_tu
       LEFT JOIN don_vi_tinh dvt ON dvt.id = vt.ma_don_vi_tinh
       WHERE b.ma_san_pham = $1 AND b.trang_thai = 'hieu_luc'`,
      [order.san_pham_id]
    );

    // Bảng đối soát giữa Tiêu hao định mức (BOM * Sản lượng hoàn thành) và Xuất kho thực tế
    const reconciliation = bomRes.rows.map((b) => {
      const norm = parseFloat(b.dinh_muc);
      const wastePct = parseFloat(b.ty_le_hao_hut || 0);
      const completed = parseFloat(order.so_luong_hoan_thanh);
      const plannedStandard = completed * norm * (1 + wastePct / 100);

      const actualRow = actualIssuesRes.rows.find((a) => a.ma_vat_tu === b.ma_vat_tu);
      const actualIssued = actualRow ? parseFloat(actualRow.tong_xuat_thuc_te) : 0;
      const variance = actualIssued - plannedStandard; // Chênh lệch thực xuất vs định mức

      return {
        ma_vat_tu: b.ma_vat_tu,
        ma_vat_tu_code: b.ma_vat_tu_code,
        ten_vat_tu: b.ten_vat_tu,
        don_vi_tinh: b.don_vi_tinh,
        dinh_muc: norm,
        ty_le_hao_hut: wastePct,
        so_luong_hoan_thanh: completed,
        dinh_muc_tieu_hao_chuan: plannedStandard,
        tong_xuat_thuc_te: actualIssued,
        chenh_lech: variance,
        status: variance === 0 ? 'chinh_xac' : (variance > 0 ? 'vuot_dinh_muc' : 'tiet_kiem'),
      };
    });

    return res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          ma_lenh_san_xuat: order.ma_lenh_san_xuat,
          san_pham: order.ten_san_pham,
          so_luong_yeu_cau: parseFloat(order.so_luong_yeu_cau),
          so_luong_hoan_thanh: parseFloat(order.so_luong_hoan_thanh),
          trang_thai: order.trang_thai,
        },
        reconciliation,
      },
    });
  } catch (err) {
    console.error('[ProductionController.getOrderReconciliation Error]:', err);
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Lỗi khi đối soát tiêu hao nguyên vật liệu.' });
  }
}

module.exports = {
  getDashboardStats,
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  approvePlan,
  pausePlan,
  cancelPlan,
  getBom,
  createBom,
  updateBom,
  getOrders,
  getOrderById,
  createOrder,
  startOrder,
  pauseOrder,
  getMrp,
  getMrpStockByMaterial,
  createPurchaseRequestFromMrp,
  getStages,
  recordResult,
  getProducts,
  getOrderReconciliation,
};
