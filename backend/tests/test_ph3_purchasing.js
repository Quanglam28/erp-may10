/**
 * Comprehensive Test Suite for ERP May 10 - PH3: Mua hàng & Nhà cung cấp
 * Verifies all 12 mandatory test cases:
 * 1. Create supplier
 * 2. Create PO
 * 3. Approve PO
 * 4. Reject invalid quantity
 * 5. Unauthorized
 * 6. Forbidden
 * 7. Duplicate approval
 * 8. Cancel PO
 * 9. PO waiting receiving
 * 10. Partial receiving
 * 11. Full receiving
 * 12. PH3 -> PH4 contract
 */

const http = require('http');
const db = require('../src/config/database');
const { signToken } = require('../src/middlewares/auth');

let server;
const PORT = 5123;

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

// Setup in-memory fallback database if real PostgreSQL is not currently running
async function setupDatabaseIfNeeded() {
  try {
    await db.query('SELECT 1');
    console.log('✅ Đã kết nối thành công tới PostgreSQL cơ sở dữ liệu erp_may10.');
  } catch (err) {
    console.log('ℹ️  PostgreSQL không khả dụng trên localhost:5432. Khởi tạo môi trường in-memory pg-mem erp_may10...');
    const { newDb } = require('pg-mem');
    const memDb = newDb();

    // Register PostgreSQL functions in pg-mem
    memDb.public.registerFunction({
      name: 'now',
      returns: memDb.public.getType('timestamp with time zone') || memDb.public.getType('timestamp'),
      implementation: () => new Date(),
    });

    const { Pool } = memDb.adapters.createPg();
    const memPool = new Pool();

    // Override db.query and db.getClient
    db.pool = memPool;
    db.query = (text, params) => memPool.query(text, params);
    db.getClient = () => memPool.connect();

    // DDL for required tables
    await memPool.query(`
      CREATE TABLE IF NOT EXISTS nguoi_dung (
        id SERIAL PRIMARY KEY,
        ho_ten VARCHAR(150) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        mat_khau VARCHAR(255) NOT NULL,
        so_dien_thoai VARCHAR(20),
        vai_tro VARCHAR(50) NOT NULL,
        phong_ban VARCHAR(100),
        trang_thai VARCHAR(20) DEFAULT 'hoat_dong',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS don_vi_tinh (
        id SERIAL PRIMARY KEY,
        ma_don_vi VARCHAR(20) UNIQUE NOT NULL,
        ten_don_vi VARCHAR(100) NOT NULL,
        ghi_chu TEXT,
        trang_thai VARCHAR(20) DEFAULT 'hoat_dong',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT
      );

      CREATE TABLE IF NOT EXISTS kho (
        id SERIAL PRIMARY KEY,
        ma_kho VARCHAR(50) UNIQUE NOT NULL,
        ten_kho VARCHAR(200) NOT NULL,
        dia_chi TEXT,
        dien_tich NUMERIC(18,3),
        suc_chua NUMERIC(18,3),
        loai_kho VARCHAR(50) NOT NULL,
        nguoi_quan_ly BIGINT,
        trang_thai VARCHAR(20) DEFAULT 'hoat_dong',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS nha_cung_cap (
        id SERIAL PRIMARY KEY,
        ma_nha_cung_cap VARCHAR(50) UNIQUE NOT NULL,
        ten_nha_cung_cap VARCHAR(200) NOT NULL,
        ma_so_thue VARCHAR(20),
        dia_chi TEXT NOT NULL,
        quoc_gia VARCHAR(100) DEFAULT 'Viet Nam',
        nguoi_lien_he VARCHAR(150) NOT NULL,
        so_dien_thoai VARCHAR(20) NOT NULL,
        email VARCHAR(100) NOT NULL,
        loai_hang_cung_cap TEXT,
        han_muc_tin_dung NUMERIC(18,2) DEFAULT 0,
        so_ngay_gia_han INTEGER DEFAULT 30,
        diem_danh_gia NUMERIC(3,1) DEFAULT 0,
        trang_thai VARCHAR(20) DEFAULT 'hoat_dong',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS vat_tu (
        id SERIAL PRIMARY KEY,
        ma_vat_tu VARCHAR(50) UNIQUE NOT NULL,
        ten_vat_tu VARCHAR(200) NOT NULL,
        loai_vat_tu VARCHAR(50) NOT NULL,
        ma_don_vi_tinh BIGINT,
        quy_cach VARCHAR(100),
        muc_ton_toi_thieu NUMERIC(18,3) DEFAULT 0,
        muc_ton_toi_da NUMERIC(18,3),
        gia_nhap_trung_binh NUMERIC(18,2) DEFAULT 0,
        nha_cung_cap_chinh BIGINT,
        trang_thai VARCHAR(20) DEFAULT 'dang_su_dung',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS yeu_cau_mua_hang (
        id SERIAL PRIMARY KEY,
        ma_yeu_cau_mua VARCHAR(50) UNIQUE NOT NULL,
        nguon_yeu_cau VARCHAR(20),
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

      CREATE TABLE IF NOT EXISTS don_mua_hang (
        id SERIAL PRIMARY KEY,
        ma_don_mua VARCHAR(50) UNIQUE NOT NULL,
        ma_nha_cung_cap BIGINT NOT NULL,
        ma_yeu_cau_mua_hang BIGINT,
        ngay_dat_hang TIMESTAMPTZ NOT NULL,
        ngay_giao_hang_yc TIMESTAMPTZ NOT NULL,
        tong_tien_hang NUMERIC(18,2) NOT NULL,
        tien_thue NUMERIC(18,2) DEFAULT 0,
        tong_thanh_toan NUMERIC(18,2) NOT NULL,
        dieu_kien_thanh_toan TEXT,
        nguoi_dat_hang BIGINT,
        ghi_chu TEXT,
        trang_thai VARCHAR(20) DEFAULT 'cho_duyet',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS chi_tiet_don_mua (
        id SERIAL PRIMARY KEY,
        ma_don_mua_hang BIGINT NOT NULL,
        ma_vat_tu BIGINT NOT NULL,
        so_luong_dat NUMERIC(18,3) NOT NULL,
        don_gia NUMERIC(18,2) NOT NULL,
        thanh_tien NUMERIC(18,2) NOT NULL,
        so_luong_da_nhap NUMERIC(18,3) DEFAULT 0,
        so_luong_loi_hong NUMERIC(18,3) DEFAULT 0,
        ghi_chu_kiem_dinh TEXT,
        ghi_chu TEXT,
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS phieu_nhap_kho (
        id SERIAL PRIMARY KEY,
        ma_phieu_nhap VARCHAR(50) UNIQUE NOT NULL,
        loai_nhap VARCHAR(50) NOT NULL,
        ma_don_mua_hang BIGINT,
        ma_lenh_san_xuat BIGINT,
        ma_kho_nhap BIGINT NOT NULL,
        ngay_nhap TIMESTAMPTZ NOT NULL,
        thu_kho BIGINT,
        nguoi_giao_hang VARCHAR(150),
        tong_gia_tri_nhap NUMERIC(18,2) DEFAULT 0,
        ghi_chu TEXT,
        trang_thai VARCHAR(20) DEFAULT 'da_nhap',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS danh_gia_ncc (
        id SERIAL PRIMARY KEY,
        ma_nha_cung_cap BIGINT NOT NULL,
        ky_danh_gia VARCHAR(20) NOT NULL,
        diem_chat_luong NUMERIC(3,1),
        diem_giao_hang NUMERIC(3,1),
        diem_gia_ca NUMERIC(3,1),
        diem_tong_hop NUMERIC(3,1),
        nhan_xet TEXT,
        nguoi_danh_gia BIGINT,
        ngay_danh_gia TIMESTAMPTZ NOT NULL,
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT
      );

      CREATE TABLE IF NOT EXISTS chi_tiet_yeu_cau_mua (
        id SERIAL PRIMARY KEY,
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
        id SERIAL PRIMARY KEY,
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
        id SERIAL PRIMARY KEY,
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

      ALTER TABLE nha_cung_cap ADD COLUMN IF NOT EXISTS so_tai_khoan_ngan_hang VARCHAR(50);
      ALTER TABLE nha_cung_cap ADD COLUMN IF NOT EXISTS ten_ngan_hang VARCHAR(100);
      ALTER TABLE nha_cung_cap ADD COLUMN IF NOT EXISTS chi_nhanh_ngan_hang VARCHAR(150);
      ALTER TABLE nha_cung_cap ADD COLUMN IF NOT EXISTS so_gpkd VARCHAR(50);
    `);

    // Insert Seed Data
    await memPool.query(`
      INSERT INTO nguoi_dung (id, ho_ten, email, mat_khau, vai_tro, phong_ban, trang_thai) VALUES
      (1, 'Quản Trị Viên Hệ Thống', 'admin@may10.vn', 'hash', 'admin', 'CNTT', 'hoat_dong'),
      (2, 'Nguyễn Văn Bán', 'banhang@may10.vn', 'hash', 'ban_hang', 'Kinh Doanh', 'hoat_dong'),
      (3, 'Trần Văn Xuất', 'sanxuat@may10.vn', 'hash', 'san_xuat', 'Kỹ Thuật', 'hoat_dong'),
      (4, 'Lê Thị Mua', 'muahang@may10.vn', 'hash', 'mua_hang', 'Cung Ứng', 'hoat_dong'),
      (5, 'Phạm Văn Kho', 'kho@may10.vn', 'hash', 'kho', 'Kho Vận', 'hoat_dong'),
      (6, 'Hoàng Thị Toán', 'ketoan@may10.vn', 'hash', 'ke_toan', 'Kế Toán', 'hoat_dong');

      INSERT INTO don_vi_tinh (id, ma_don_vi, ten_don_vi) VALUES
      (1, 'cai', 'Cái'),
      (2, 'met', 'Mét'),
      (3, 'cuon', 'Cuộn');

      INSERT INTO kho (id, ma_kho, ten_kho, loai_kho) VALUES
      (1, 'KNL01', 'Kho Nguyên Phụ Liệu Số 1', 'nguyen_lieu'),
      (2, 'KTP01', 'Kho Thành Phẩm', 'thanh_pham');

      INSERT INTO nha_cung_cap (ma_nha_cung_cap, ten_nha_cung_cap, ma_so_thue, dia_chi, nguoi_lien_he, so_dien_thoai, email, loai_hang_cung_cap, han_muc_tin_dung, so_ngay_gia_han, diem_danh_gia, trang_thai) VALUES
      ('NCC001', 'Công Ty Cổ Phần Dệt May Phong Phú', '0301456789', 'Khu CN Phong Phú, TP. Thủ Đức', 'Đỗ Mạnh Cường', '0283896012', 'sales@phongphu.com.vn', 'Vải dệt thoi, vải kate', 2000000000.00, 45, 9.2, 'hoat_dong'),
      ('NCC002', 'Công Ty TNHH Phụ Liệu May Thăng Long', '0105678901', 'Cụm CN Duyên Thái, Thường Tín', 'Trịnh Thị Mai', '0243867123', 'contact@thanglongacc.vn', 'Chỉ may, cúc áo', 500000000.00, 30, 8.8, 'hoat_dong');

      INSERT INTO vat_tu (id, ma_vat_tu, ten_vat_tu, loai_vat_tu, ma_don_vi_tinh, quy_cach, muc_ton_toi_thieu, gia_nhap_trung_binh, nha_cung_cap_chinh, trang_thai) VALUES
      (1, 'VT-VAI-KATE-01', 'Vải Kate Lụa Trắng Khổ 1.5m', 'vai_chinh', 2, 'Khổ 1.5m', 500.000, 65000.00, 1, 'dang_su_dung'),
      (2, 'VT-CHI-MAY-02', 'Chỉ May Poly 40/2 Trắng', 'chi_may', 3, 'Cuộn 5000m', 50.000, 28000.00, 2, 'dang_su_dung');
    `);
    console.log('✅ Đã tạo bảng và nạp seed data thành công cho môi trường kiểm thử.');
  }
}

async function runAllPurchasingTests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU BỘ KIỂM THỬ TOÀN DIỆN 12 TIÊU CHÍ PH3 (MUA HÀNG & NCC)');
  console.log('================================================================\n');

  await setupDatabaseIfNeeded();

  const app = require('../src/app');
  server = app.listen(PORT);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      failed++;
      console.error(`  ❌ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  // Tokens
  const tokenMuaHang = signToken(4); // Lê Thị Mua (vai_tro: 'mua_hang')
  const tokenAdmin = signToken(1);   // Admin (vai_tro: 'admin')
  const tokenSales = signToken(2);   // Bán hàng (vai_tro: 'ban_hang' - Không có quyền mua hàng)
  const tokenKho = signToken(5);     // Thủ kho (vai_tro: 'kho')

  let createdSupplierId;
  let createdPOId;
  let createdPOCode;
  let cancelTestPOId;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Create supplier (Tạo mới nhà cung cấp hợp lệ - Tiêu chí A, D, G)
    // -------------------------------------------------------------------------
    console.log('1. TEST 1: Create supplier (Tạo nhà cung cấp mới với MST, GPKD, SĐT hợp lệ):');
    const supSuffix = Date.now().toString().slice(-8);
    const supCode = `NCC-TEST-${supSuffix.slice(-4)}`;
    const validMst = `03${supSuffix}`;
    const validGpkd = `GP-${supSuffix}`;
    const validPhone = `09${supSuffix}`;

    const createSupRes = await request(
      '/api/v1/purchasing/suppliers',
      'POST',
      {
        ma_nha_cung_cap: supCode,
        ten_nha_cung_cap: 'Công Ty Cung Cấp Vải Sợi Sài Gòn',
        ma_so_thue: validMst,
        so_gpkd: validGpkd,
        dia_chi: '123 Đường Cộng Hòa, Q. Tân Bình, TP.HCM',
        so_dien_thoai: validPhone,
        email: 'sales@saisoil.vn',
        nguoi_lien_he: 'Vũ Đức Đam',
        loai_hang_cung_cap: 'Vải cotton, sợi dệt',
        han_muc_tin_dung: 500000000,
        so_ngay_gia_han: 45,
        diem_danh_gia: 9.0,
      },
      tokenMuaHang
    );

    assert(createSupRes.status === 201, `Tạo NCC hợp lệ trả về HTTP 201 Created (Nhận ${createSupRes.status})`);
    assert(createSupRes.data?.data?.ma_nha_cung_cap === supCode, `Mã NCC đúng: ${supCode}`);
    assert(createSupRes.data?.data?.trang_thai === 'hoat_dong', 'Trạng thái NCC ban đầu: hoat_dong');
    createdSupplierId = createSupRes.data?.data?.id;

    // -------------------------------------------------------------------------
    // TEST 1B: Ràng buộc Nhà cung cấp (MST, GPKD, SĐT - Tiêu chí B -> K)
    // -------------------------------------------------------------------------
    console.log('\n1B. TEST 1B: Kiểm tra bộ ràng buộc toàn diện Nhà cung cấp (B -> K):');

    // B. MST sai format -> 400
    const invalidMstRes = await request(
      '/api/v1/purchasing/suppliers',
      'POST',
      {
        ma_nha_cung_cap: `NCC-ERR-MST-${Date.now().toString().slice(-4)}`,
        ten_nha_cung_cap: 'NCC Sai MST',
        ma_so_thue: '12345ABC', // Sai format
        so_gpkd: `GP-ERR-${Date.now().toString().slice(-4)}`,
        dia_chi: 'Hà Nội',
        so_dien_thoai: `09${Date.now().toString().slice(-8)}`,
        email: 'test@mst.vn',
        nguoi_lien_he: 'Test MST',
      },
      tokenMuaHang
    );
    assert(invalidMstRes.status === 400, `[Tiêu chí B] MST sai format trả về HTTP 400 (Nhận ${invalidMstRes.status})`);

    // C. MST trùng -> 409
    const dupMstRes = await request(
      '/api/v1/purchasing/suppliers',
      'POST',
      {
        ma_nha_cung_cap: `NCC-DUP-MST-${Date.now().toString().slice(-4)}`,
        ten_nha_cung_cap: 'NCC Trùng MST',
        ma_so_thue: validMst, // Trùng với TEST 1
        so_gpkd: `GP-DUP-${Date.now().toString().slice(-6)}`,
        dia_chi: 'Hà Nội',
        so_dien_thoai: `09${(parseInt(supSuffix) + 1).toString().slice(-8)}`,
        email: 'test2@mst.vn',
        nguoi_lien_he: 'Test DUP MST',
      },
      tokenMuaHang
    );
    assert(dupMstRes.status === 409, `[Tiêu chí C] MST trùng lặp trả về HTTP 409 Conflict (Nhận ${dupMstRes.status})`);

    // E. GPKD sai format -> 400
    const invalidGpkdRes = await request(
      '/api/v1/purchasing/suppliers',
      'POST',
      {
        ma_nha_cung_cap: `NCC-ERR-GP-${Date.now().toString().slice(-4)}`,
        ten_nha_cung_cap: 'NCC Sai GPKD',
        ma_so_thue: `03${(parseInt(supSuffix) + 2).toString().slice(-8)}`,
        so_gpkd: '12', // Quá ngắn (< 5 ký tự)
        dia_chi: 'Đà Nẵng',
        so_dien_thoai: `09${(parseInt(supSuffix) + 2).toString().slice(-8)}`,
        email: 'test@gpkd.vn',
        nguoi_lien_he: 'Test GPKD',
      },
      tokenMuaHang
    );
    assert(invalidGpkdRes.status === 400, `[Tiêu chí E] GPKD sai format trả về HTTP 400 (Nhận ${invalidGpkdRes.status})`);

    // F. GPKD trùng -> 409
    const dupGpkdRes = await request(
      '/api/v1/purchasing/suppliers',
      'POST',
      {
        ma_nha_cung_cap: `NCC-DUP-GP-${Date.now().toString().slice(-4)}`,
        ten_nha_cung_cap: 'NCC Trùng GPKD',
        ma_so_thue: `03${(parseInt(supSuffix) + 3).toString().slice(-8)}`,
        so_gpkd: validGpkd, // Trùng với TEST 1
        dia_chi: 'Hải Phòng',
        so_dien_thoai: `09${(parseInt(supSuffix) + 3).toString().slice(-8)}`,
        email: 'test3@gpkd.vn',
        nguoi_lien_he: 'Test DUP GPKD',
      },
      tokenMuaHang
    );
    assert(dupGpkdRes.status === 409, `[Tiêu chí F] GPKD trùng lặp trả về HTTP 409 Conflict (Nhận ${dupGpkdRes.status})`);

    // H. SĐT sai format -> 400
    const invalidPhoneRes = await request(
      '/api/v1/purchasing/suppliers',
      'POST',
      {
        ma_nha_cung_cap: `NCC-ERR-TEL-${Date.now().toString().slice(-4)}`,
        ten_nha_cung_cap: 'NCC Sai SĐT',
        ma_so_thue: `03${(parseInt(supSuffix) + 4).toString().slice(-8)}`,
        so_gpkd: `GP-TEL-${Date.now().toString().slice(-6)}`,
        dia_chi: 'Cần Thơ',
        so_dien_thoai: '1234567890', // Không khớp đầu số VN
        email: 'test@tel.vn',
        nguoi_lien_he: 'Test Phone',
      },
      tokenMuaHang
    );
    assert(invalidPhoneRes.status === 400, `[Tiêu chí H] SĐT sai format trả về HTTP 400 (Nhận ${invalidPhoneRes.status})`);

    // I. SĐT trùng -> 409
    const dupPhoneRes = await request(
      '/api/v1/purchasing/suppliers',
      'POST',
      {
        ma_nha_cung_cap: `NCC-DUP-TEL-${Date.now().toString().slice(-4)}`,
        ten_nha_cung_cap: 'NCC Trùng SĐT',
        ma_so_thue: `03${(parseInt(supSuffix) + 5).toString().slice(-8)}`,
        so_gpkd: `GP-DUPTEL-${Date.now().toString().slice(-5)}`,
        dia_chi: 'Bình Dương',
        so_dien_thoai: validPhone, // Trùng với TEST 1
        email: 'test4@tel.vn',
        nguoi_lien_he: 'Test DUP Phone',
      },
      tokenMuaHang
    );
    assert(dupPhoneRes.status === 409, `[Tiêu chí I] SĐT trùng lặp trả về HTTP 409 Conflict (Nhận ${dupPhoneRes.status})`);

    // J. Update supplier với chính MST/GPKD/SĐT của nó -> 200 OK (không báo duplicate)
    const updateSelfRes = await request(
      `/api/v1/purchasing/suppliers/${createdSupplierId}`,
      'PUT',
      {
        ten_nha_cung_cap: 'Công Ty Cung Cấp Vải Sợi Sài Gòn (Updated)',
        ma_so_thue: validMst,
        so_gpkd: validGpkd,
        so_dien_thoai: validPhone,
      },
      tokenMuaHang
    );
    assert(updateSelfRes.status === 200, `[Tiêu chí J] Update chính mình không báo duplicate (Nhận ${updateSelfRes.status})`);

    // Tạo supplier thứ hai để test tiêu chí K
    const sup2Suffix = (parseInt(supSuffix) + 10).toString().slice(-8);
    const createSup2Res = await request(
      '/api/v1/purchasing/suppliers',
      'POST',
      {
        ma_nha_cung_cap: `NCC-TEST2-${sup2Suffix.slice(-4)}`,
        ten_nha_cung_cap: 'Nhà cung cấp đối chiếu 2',
        ma_so_thue: `03${sup2Suffix}`,
        so_gpkd: `GP-2-${sup2Suffix}`,
        dia_chi: 'Bắc Ninh',
        so_dien_thoai: `09${sup2Suffix}`,
        email: 'ncc2@may10.vn',
        nguoi_lien_he: 'Trần Văn Hai',
      },
      tokenMuaHang
    );
    assert(createSup2Res.status === 201, 'Tạo NCC thứ 2 để đối chiếu tiêu chí K thành công');
    const sup2Id = createSup2Res.data?.data?.id;

    // K1. Update supplier 2 sang MST của supplier 1 -> 409
    const updateDupMstRes = await request(
      `/api/v1/purchasing/suppliers/${sup2Id}`,
      'PUT',
      { ma_so_thue: validMst },
      tokenMuaHang
    );
    assert(updateDupMstRes.status === 409, `[Tiêu chí K1] Update sang MST của NCC khác trả về 409 Conflict (Nhận ${updateDupMstRes.status})`);

    // K2. Update supplier 2 sang GPKD của supplier 1 -> 409
    const updateDupGpkdRes = await request(
      `/api/v1/purchasing/suppliers/${sup2Id}`,
      'PUT',
      { so_gpkd: validGpkd },
      tokenMuaHang
    );
    assert(updateDupGpkdRes.status === 409, `[Tiêu chí K2] Update sang GPKD của NCC khác trả về 409 Conflict (Nhận ${updateDupGpkdRes.status})`);

    // K3. Update supplier 2 sang SĐT của supplier 1 -> 409
    const updateDupPhoneRes = await request(
      `/api/v1/purchasing/suppliers/${sup2Id}`,
      'PUT',
      { so_dien_thoai: validPhone },
      tokenMuaHang
    );
    assert(updateDupPhoneRes.status === 409, `[Tiêu chí K3] Update sang SĐT của NCC khác trả về 409 Conflict (Nhận ${updateDupPhoneRes.status})`);

    // -------------------------------------------------------------------------
    // TEST 2: Create PO (Tạo mới đơn mua hàng kèm chi tiết vật tư)
    // -------------------------------------------------------------------------
    console.log('\n2. TEST 2: Create PO (Tạo mới đơn mua hàng):');
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const createPORes = await request(
      '/api/v1/purchasing/purchase-orders',
      'POST',
      {
        ma_nha_cung_cap: createdSupplierId || 1,
        ngay_giao_hang_yc: nextWeek.toISOString(),
        dieu_kien_thanh_toan: 'Thanh toán sau 30 ngày',
        ghi_chu: 'Đơn mua vải cotton kiểm thử',
        chiTiet: [
          { ma_vat_tu: 1, so_luong_dat: 500, don_gia: 65000, ghi_chu: 'Vải trắng' },
          { ma_vat_tu: 2, so_luong_dat: 100, don_gia: 28000, ghi_chu: 'Chỉ may' },
        ],
      },
      tokenMuaHang
    );

    assert(createPORes.status === 201, `Tạo PO trả về HTTP 201 Created (Nhận ${createPORes.status})`);
    assert(createPORes.data?.data?.trang_thai === 'cho_duyet', "Trạng thái PO ban đầu là 'cho_duyet'");
    assert(createPORes.data?.data?.chiTiet?.length === 2, 'Đã lưu đủ 2 mặt hàng trong chi_tiet_don_mua');

    // 500 * 65000 = 32,500,000; 100 * 28000 = 2,800,000; Tiền hàng = 35,300,000; VAT 8% = 2,824,000; Tổng = 38,124,000
    const expectedTotal = 35300000 + 35300000 * 0.08;
    assert(
      Math.abs(parseFloat(createPORes.data?.data?.tong_thanh_toan) - expectedTotal) < 1,
      `Tính toán tổng thanh toán chính xác (Kỳ vọng: ${expectedTotal}, Thực tế: ${createPORes.data?.data?.tong_thanh_toan})`
    );

    createdPOId = createPORes.data?.data?.id;
    createdPOCode = createPORes.data?.data?.ma_don_mua;

    // -------------------------------------------------------------------------
    // TEST 3: Approve PO (Phê duyệt đơn mua hàng)
    // -------------------------------------------------------------------------
    console.log('\n3. TEST 3: Approve PO (Phê duyệt đơn mua):');
    const approveRes = await request(
      `/api/v1/purchasing/purchase-orders/${createdPOId}/approve`,
      'POST',
      {},
      tokenMuaHang
    );

    assert(approveRes.status === 200, `Duyệt PO trả về HTTP 200 OK (Nhận ${approveRes.status})`);
    assert(
      approveRes.data?.data?.trang_thai === 'da_gui_ncc',
      `Trạng thái PO sau khi duyệt chuyển sang 'da_gui_ncc' (Nhận: ${approveRes.data?.data?.trang_thai})`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Reject invalid quantity & price (Validate nghiệp vụ)
    // -------------------------------------------------------------------------
    console.log('\n4. TEST 4: Reject invalid quantity & price (Chặn số lượng âm/bằng 0):');
    const invalidQtyRes = await request(
      '/api/v1/purchasing/purchase-orders',
      'POST',
      {
        ma_nha_cung_cap: 1,
        ngay_giao_hang_yc: nextWeek.toISOString(),
        chiTiet: [{ ma_vat_tu: 1, so_luong_dat: -10, don_gia: 50000 }],
      },
      tokenMuaHang
    );
    assert(invalidQtyRes.status === 400, `Số lượng <= 0 bị từ chối với HTTP 400 Bad Request (Nhận ${invalidQtyRes.status})`);
    assert(invalidQtyRes.data?.errorCode === 'VALIDATION_ERROR', 'Mã lỗi trả về là VALIDATION_ERROR');

    const invalidPriceRes = await request(
      '/api/v1/purchasing/purchase-orders',
      'POST',
      {
        ma_nha_cung_cap: 1,
        ngay_giao_hang_yc: nextWeek.toISOString(),
        chiTiet: [{ ma_vat_tu: 1, so_luong_dat: 10, don_gia: -500 }],
      },
      tokenMuaHang
    );
    assert(invalidPriceRes.status === 400, `Đơn giá < 0 bị từ chối với HTTP 400 Bad Request (Nhận ${invalidPriceRes.status})`);

    // -------------------------------------------------------------------------
    // TEST 5: Unauthorized (Từ chối request không có token hoặc token giả mạo)
    // -------------------------------------------------------------------------
    console.log('\n5. TEST 5: Unauthorized (Kiểm tra xác thực):');
    const noTokenRes = await request('/api/v1/purchasing/purchase-orders', 'GET');
    assert(noTokenRes.status === 401, `Không có token bị từ chối với HTTP 401 Unauthorized (Nhận ${noTokenRes.status})`);
    assert(noTokenRes.data?.errorCode === 'UNAUTHORIZED', 'Mã lỗi: UNAUTHORIZED');

    const forgedTokenRes = await request(
      '/api/v1/purchasing/purchase-orders',
      'GET',
      null,
      'erp_token_4_123456789.badsignature1234567890abcdef1234567890abcdef1234567890abcdef12345678'
    );
    assert(forgedTokenRes.status === 401, `Token giả mạo sai HMAC bị từ chối HTTP 401 (Nhận ${forgedTokenRes.status})`);

    // -------------------------------------------------------------------------
    // TEST 6: Forbidden (RBAC - Chặn vai trò không có quyền)
    // -------------------------------------------------------------------------
    console.log('\n6. TEST 6: Forbidden (Kiểm tra phân quyền RBAC):');
    const forbiddenRes = await request(
      '/api/v1/purchasing/purchase-orders',
      'POST',
      {
        ma_nha_cung_cap: 1,
        ngay_giao_hang_yc: nextWeek.toISOString(),
        chiTiet: [{ ma_vat_tu: 1, so_luong_dat: 50, don_gia: 50000 }],
      },
      tokenSales // Bán hàng không có quyền tạo PO
    );
    assert(forbiddenRes.status === 403, `Vai trò ban_hang bị từ chối với HTTP 403 Forbidden (Nhận ${forbiddenRes.status})`);
    assert(forbiddenRes.data?.errorCode === 'FORBIDDEN', 'Mã lỗi: FORBIDDEN');

    // -------------------------------------------------------------------------
    // TEST 7: Duplicate approval (Chống Double Approval & Concurrency)
    // -------------------------------------------------------------------------
    console.log('\n7. TEST 7: Duplicate approval (Chống duyệt trùng lặp):');
    // Đơn createdPOId hiện đã ở trạng thái 'da_gui_ncc' từ Test 3.
    // Thử duyệt lại lần 2:
    const dupApproveRes = await request(
      `/api/v1/purchasing/purchase-orders/${createdPOId}/approve`,
      'POST',
      {},
      tokenMuaHang
    );
    assert(
      dupApproveRes.status === 409,
      `Duyệt lại PO đã duyệt trả về HTTP 409 Conflict (Nhận ${dupApproveRes.status})`
    );
    assert(dupApproveRes.data?.errorCode === 'CONFLICT', 'Mã lỗi: CONFLICT');

    // -------------------------------------------------------------------------
    // TEST 8: Cancel PO & Duplicate Cancel (Hủy đơn và chống hủy trùng lặp)
    // -------------------------------------------------------------------------
    console.log('\n8. TEST 8: Cancel PO & Duplicate Cancel (Hủy đơn an toàn):');
    // Tạo 1 PO mới để test hủy
    const poForCancelRes = await request(
      '/api/v1/purchasing/purchase-orders',
      'POST',
      {
        ma_nha_cung_cap: 1,
        ngay_giao_hang_yc: nextWeek.toISOString(),
        chiTiet: [{ ma_vat_tu: 1, so_luong_dat: 50, don_gia: 60000 }],
      },
      tokenMuaHang
    );
    cancelTestPOId = poForCancelRes.data?.data?.id;

    // Hủy lần 1
    const cancelRes = await request(
      `/api/v1/purchasing/purchase-orders/${cancelTestPOId}/cancel`,
      'POST',
      { ly_do_huy: 'Thay đổi kế hoạch sản xuất xưởng 2' },
      tokenMuaHang
    );
    assert(cancelRes.status === 200, `Hủy đơn PO trả về HTTP 200 OK (Nhận ${cancelRes.status})`);
    assert(cancelRes.data?.data?.trang_thai === 'huy', "Trạng thái chuyển sang 'huy'");

    // Hủy lần 2 (Double cancel)
    const dupCancelRes = await request(
      `/api/v1/purchasing/purchase-orders/${cancelTestPOId}/cancel`,
      'POST',
      { ly_do_huy: 'Thử hủy lại' },
      tokenMuaHang
    );
    assert(dupCancelRes.status === 409, `Hủy lại PO đã hủy trả về HTTP 409 Conflict (Nhận ${dupCancelRes.status})`);
    assert(dupCancelRes.data?.errorCode === 'CONFLICT', 'Mã lỗi: CONFLICT');

    // -------------------------------------------------------------------------
    // TEST 9: PO waiting receiving (Tra cứu đơn hàng chờ nhập kho)
    // -------------------------------------------------------------------------
    console.log('\n9. TEST 9: PO waiting receiving (Danh sách chờ nhập kho):');
    const waitingRes = await request('/api/v1/purchasing/receiving', 'GET', null, tokenKho);
    assert(waitingRes.status === 200, `Tra cứu đơn chờ nhập kho trả về HTTP 200 OK (Nhận ${waitingRes.status})`);
    assert(Array.isArray(waitingRes.data?.data), 'Dữ liệu trả về là danh sách Array');

    const foundTarget = waitingRes.data?.data?.find((p) => p.id === createdPOId);
    assert(foundTarget !== undefined, `Tìm thấy đơn PO [${createdPOCode}] trong danh sách chờ nhập kho`);
    assert(parseFloat(foundTarget?.tong_con_lai) > 0, 'Số lượng còn lại chờ nhập > 0');

    // -------------------------------------------------------------------------
    // TEST 10: Partial receiving (Giao nhận MỘT PHẦN hàng)
    // -------------------------------------------------------------------------
    console.log('\n10. TEST 10: Partial receiving (Nhập kho một phần hàng):');
    // Đơn createdPOId có 2 mặt hàng: VT1 (500), VT2 (100). Nhập 200 cái VT1 và 50 cái VT2.
    const partialReceiveRes = await request(
      '/api/v1/purchasing/receive-status-update',
      'POST',
      {
        ma_don_mua_hang: createdPOId,
        chiTiet: [
          { ma_vat_tu: 1, so_luong_nhap: 200 },
          { ma_vat_tu: 2, so_luong_nhap: 50 },
        ],
      },
      tokenKho
    );

    assert(partialReceiveRes.status === 200, `Nhập hàng một phần trả về HTTP 200 OK (Nhận ${partialReceiveRes.status})`);
    assert(
      partialReceiveRes.data?.data?.trang_thai === 'dang_giao',
      `Trạng thái PO tự động cập nhật sang 'dang_giao' (Nhận: ${partialReceiveRes.data?.data?.trang_thai})`
    );
    assert(partialReceiveRes.data?.data?.hoanThanh === false, 'Trạng thái hoàn thành: false (còn nợ hàng)');

    // -------------------------------------------------------------------------
    // TEST 11: Full receiving (Giao nhận TOÀN PHẦN hàng hoàn tất)
    // -------------------------------------------------------------------------
    console.log('\n11. TEST 11: Full receiving (Nhập kho đủ 100% hàng còn lại):');
    // Nhập tiếp 300 cái VT1 và 50 cái VT2
    const fullReceiveRes = await request(
      '/api/v1/purchasing/receive-status-update',
      'POST',
      {
        ma_don_mua_hang: createdPOId,
        chiTiet: [
          { ma_vat_tu: 1, so_luong_nhap: 300 },
          { ma_vat_tu: 2, so_luong_nhap: 50 },
        ],
      },
      tokenKho
    );

    assert(fullReceiveRes.status === 200, `Nhập hàng đủ trả về HTTP 200 OK (Nhận ${fullReceiveRes.status})`);
    assert(
      fullReceiveRes.data?.data?.trang_thai === 'da_nhap_kho',
      `Trạng thái PO tự động chuyển sang 'da_nhap_kho' khi đủ 100% hàng (Nhận: ${fullReceiveRes.data?.data?.trang_thai})`
    );
    assert(fullReceiveRes.data?.data?.hoanThanh === true, 'Trạng thái hoàn thành: true');

    // -------------------------------------------------------------------------
    // TEST 12: PH3 -> PH4 contract (Kiểm tra hợp đồng dữ liệu Mua hàng -> Kho)
    // -------------------------------------------------------------------------
    console.log('\n12. TEST 12: PH3 -> PH4 contract (Khóa ngoại và hợp đồng dữ liệu):');
    // PH4 lưu ma_don_mua_hang trong phieu_nhap_kho
    const testPNK = await db.query(
      `INSERT INTO phieu_nhap_kho (
         ma_phieu_nhap, loai_nhap, ma_don_mua_hang, ma_kho_nhap,
         ngay_nhap, thu_kho, tong_gia_tri_nhap, ghi_chu, trang_thai, nguoi_tao
       ) VALUES ($1, 'tu_mua_hang', $2, 1, NOW(), 5, 38124000.00, 'Phiếu nhập kho từ đơn PO', 'da_nhap', 5)
       RETURNING id, ma_phieu_nhap, ma_don_mua_hang`,
      [`PNK-CONTRACT-${Date.now().toString().slice(-4)}`, createdPOId]
    );

    assert(testPNK.rows.length === 1, 'Tạo phiếu nhập kho PH4 liên kết ma_don_mua_hang thành công');
    assert(testPNK.rows[0].ma_don_mua_hang === createdPOId, 'Khóa ngoại ma_don_mua_hang khớp 100% ID đơn mua');

    // Kiểm tra Core KPI endpoint contract
    const coreKpiRes = await request('/api/v1/purchasing/core-kpi', 'GET', null, tokenMuaHang);
    assert(coreKpiRes.status === 200, 'Core Homepage contract endpoint trả về 200 OK');
    assert(coreKpiRes.data?.data?.so_po >= 1, `Số PO: ${coreKpiRes.data?.data?.so_po}`);
    assert(coreKpiRes.data?.data?.ncc >= 1, `Số NCC: ${coreKpiRes.data?.data?.ncc}`);

    // -------------------------------------------------------------------------
    // TEST 13: Purchase Requisition (PR) lifecycle (Lập, duyệt, chuyển PO)
    // -------------------------------------------------------------------------
    console.log('\n13. TEST 13: Purchase Requisitions (Lập, duyệt và chuyển PR sang PO):');
    const prNeedDate = new Date();
    prNeedDate.setDate(prNeedDate.getDate() + 10);
    const prRes = await request(
      '/api/v1/purchasing/requisitions',
      'POST',
      {
        nguon_yeu_cau: 'san_xuat',
        ghi_chu: 'Yêu cầu vải may sơ mi lô hè xuất khẩu',
        chiTiet: [
          {
            ma_vat_tu: 1,
            so_luong_yeu_cau: 800,
            don_gia_du_kien: 65000,
            ngay_can_giao: prNeedDate.toISOString(),
            ma_kho_nhap: 1,
          },
        ],
      },
      tokenMuaHang
    );
    assert(prRes.status === 201, `Tạo PR trả về HTTP 201 Created (Nhận ${prRes.status})`);
    const createdPrId = prRes.data?.data?.id;
    assert(createdPrId !== undefined, `PR tạo thành công với ID: ${createdPrId}`);
    assert(prRes.data?.data?.trang_thai === 'cho_duyet', 'Trạng thái PR ban đầu: cho_duyet');

    // Phê duyệt PR
    const approvePrRes = await request(
      `/api/v1/purchasing/requisitions/${createdPrId}/approve`,
      'POST',
      {},
      tokenMuaHang
    );
    assert(approvePrRes.status === 200, `Phê duyệt PR trả về HTTP 200 OK (Nhận ${approvePrRes.status})`);
    assert(approvePrRes.data?.data?.trang_thai === 'da_duyet', 'Trạng thái PR sau duyệt: da_duyet');

    // Chuyển PR sang PO
    const convertPrRes = await request(
      `/api/v1/purchasing/requisitions/${createdPrId}/create-po`,
      'POST',
      {
        ma_nha_cung_cap: 1,
        ngay_giao_hang_yc: prNeedDate.toISOString(),
        dieu_kien_thanh_toan: 'Chuyển khoản 30 ngày',
        chiTiet: [
          {
            ma_vat_tu: 1,
            so_luong_dat: 800,
            don_gia: 64000,
          },
        ],
      },
      tokenMuaHang
    );
    assert(convertPrRes.status === 201, `Chuyển PR sang PO trả về HTTP 201 Created (Nhận ${convertPrRes.status})`);
    assert(convertPrRes.data?.data?.po?.id !== undefined, 'Đơn PO mới sinh ra từ PR thành công');
    assert(convertPrRes.data?.data?.requisition?.trang_thai === 'da_tao_don', 'Trạng thái PR cập nhật: da_tao_don');

    // -------------------------------------------------------------------------
    // TEST 14: RFQ & Multi-vendor comparison & Selection
    // -------------------------------------------------------------------------
    console.log('\n14. TEST 14: RFQ & Báo giá so sánh đa nhà cung cấp:');
    const rfqDeadline = new Date();
    rfqDeadline.setDate(rfqDeadline.getDate() + 5);
    const rfqRes = await request(
      '/api/v1/purchasing/rfqs',
      'POST',
      {
        tieu_de: 'RFQ Bông và vải kate lụa quý 3',
        han_bao_gia: rfqDeadline.toISOString(),
        dieu_khoan_thuong_mai: 'Giao tại kho May 10, thanh toán LC 30 ngày',
      },
      tokenMuaHang
    );
    assert(rfqRes.status === 201, `Tạo RFQ trả về HTTP 201 Created (Nhận ${rfqRes.status})`);
    const createdRfqId = rfqRes.data?.data?.id;

    // NCC001 gửi báo giá
    const quote1Res = await request(
      `/api/v1/purchasing/rfqs/${createdRfqId}/quotes`,
      'POST',
      {
        ma_nha_cung_cap: 1,
        ma_vat_tu: 1,
        so_luong_chao: 1000,
        don_gia_chao: 62000,
        thoi_gian_giao_hang_ngay: 5,
        dieu_kien_thanh_toan: 'TTR 30 ngày',
      },
      tokenMuaHang
    );
    assert(quote1Res.status === 201, 'NCC 1 gửi báo giá thành công (HTTP 201)');
    const quote1Id = quote1Res.data?.data?.id;

    // NCC002 gửi báo giá
    const quote2Res = await request(
      `/api/v1/purchasing/rfqs/${createdRfqId}/quotes`,
      'POST',
      {
        ma_nha_cung_cap: 2,
        ma_vat_tu: 1,
        so_luong_chao: 1000,
        don_gia_chao: 64500,
        thoi_gian_giao_hang_ngay: 7,
        dieu_kien_thanh_toan: 'TTR 45 ngày',
      },
      tokenMuaHang
    );
    assert(quote2Res.status === 201, 'NCC 2 gửi báo giá thành công (HTTP 201)');

    // So sánh & Lựa chọn NCC 1
    const selectRes = await request(
      `/api/v1/purchasing/rfqs/${createdRfqId}/select-vendor`,
      'POST',
      {
        quote_id: quote1Id,
        ly_do_chon: 'Giá rẻ hơn 2,500đ/mét và giao hàng nhanh hơn 2 ngày',
      },
      tokenMuaHang
    );
    assert(selectRes.status === 200, `Lựa chọn NCC thắng thầu trả về HTTP 200 OK (Nhận ${selectRes.status})`);
    assert(selectRes.data?.data?.po?.id !== undefined, 'Hệ thống tự động phát hành đơn PO từ báo giá được chọn');
    assert(selectRes.data?.data?.rfq?.trang_thai === 'da_chot', 'Trạng thái RFQ chuyển: da_chot');

    // -------------------------------------------------------------------------
    // TEST 15: Supplier Evaluation & Rating Calculation
    // -------------------------------------------------------------------------
    console.log('\n15. TEST 15: Đánh giá chất lượng nhà cung cấp định kỳ:');
    const evalRes = await request(
      '/api/v1/purchasing/suppliers/1/evaluations',
      'POST',
      {
        ky_danh_gia: 'Q3-2026',
        diem_chat_luong: 9.5,
        diem_giao_hang: 9.0,
        diem_gia_ca: 9.0,
        nhan_xet: 'Chất lượng vải kate xuất sắc, giao đúng hạn hợp đồng',
      },
      tokenMuaHang
    );
    assert(evalRes.status === 201, `Tạo đánh giá NCC trả về HTTP 201 Created (Nhận ${evalRes.status})`);
    assert(parseFloat(evalRes.data?.data?.diem_tong_hop) === 9.2, 'Điểm tổng hợp tính đúng trọng số (0.4/0.3/0.3) = 9.2');

    // Tra cứu danh sách đánh giá
    const listEvalRes = await request('/api/v1/purchasing/suppliers/1/evaluations', 'GET', null, tokenMuaHang);
    assert(listEvalRes.status === 200, 'Tra cứu lịch sử đánh giá NCC trả về HTTP 200 OK');
    assert(Array.isArray(listEvalRes.data?.data) && listEvalRes.data.data.length > 0, 'Có ít nhất 1 bản ghi đánh giá');

    // -------------------------------------------------------------------------
    // TEST 16: Quality Inspection on PO Receipt (Lỗi hỏng & kiểm định)
    // -------------------------------------------------------------------------
    console.log('\n16. TEST 16: Nhận hàng kèm kiểm nghiệm quy cách phẩm chất:');
    const rfqPoId = selectRes.data?.data?.po?.id;
    // Approve the RFQ-generated PO first so it can be received
    await request(`/api/v1/purchasing/purchase-orders/${rfqPoId}/approve`, 'POST', {}, tokenMuaHang);

    const inspectReceiveRes = await request(
      '/api/v1/purchasing/receive-status-update',
      'POST',
      {
        ma_don_mua_hang: rfqPoId,
        chiTiet: [
          {
            ma_vat_tu: 1,
            so_luong_nhap: 500,
            so_luong_loi_hong: 5,
            ghi_chu_kiem_dinh: '5m bị lỗi dệt mép, lập biên bản trừ tiền',
          },
        ],
      },
      tokenKho
    );
    assert(inspectReceiveRes.status === 200, `Kiểm nghiệm & nhận hàng trả về HTTP 200 OK (Nhận ${inspectReceiveRes.status})`);
    assert(inspectReceiveRes.data?.data?.trang_thai === 'dang_giao', 'PO chuyển sang dang_giao khi nhận 500/1000m');
  } catch (err) {
    console.error('Lỗi ngoại lệ trong quá trình chạy kiểm thử:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n================================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL (TỔNG: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 TẤT CẢ 16 TIÊU CHÍ KIỂM THỬ PH3 ĐÃ VƯỢT QUA 100%!\n');
    process.exit(0);
  }
}

if (require.main === module) {
  runAllPurchasingTests();
}

module.exports = { runAllPurchasingTests };
