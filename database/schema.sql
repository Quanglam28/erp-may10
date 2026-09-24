-- =============================================================================
-- ERP MAY 10 — HỆ THỐNG CƠ SỞ DỮ LIỆU TẬP TRUNG (STEP 1)
-- Tài liệu chuẩn: CHƯƠNG 4: ĐỒNG BỘ CƠ SỞ DỮ LIỆU HỆ THỐNG ERP MAY 10
-- Quy chuẩn:
--   Khóa chính: BIGSERIAL PRIMARY KEY
--   Khóa ngoại: BIGINT REFERENCES ...
--   Số lượng:   NUMERIC(18,3)
--   Tiền tệ:    NUMERIC(18,2)
--   Thời gian:  TIMESTAMPTZ DEFAULT NOW()
--   Mã NV:      VARCHAR(50) UNIQUE NOT NULL
--   Trạng thái: VARCHAR(20)
--   Đặt tên:    Tiếng Việt snake_case không dấu, chữ thường
-- =============================================================================

-- Thiết lập múi giờ chuẩn Việt Nam (UTC+7)
SET timezone = 'Asia/Ho_Chi_Minh';

-- =============================================================================
-- PHẦN 1: MASTER DATA (DỮ LIỆU DÙNG CHUNG TOÀN HỆ THỐNG)
-- =============================================================================

-- 1. Bảng người dùng (dùng chung cho cả 5 phân hệ)
CREATE TABLE IF NOT EXISTS nguoi_dung (
    id BIGSERIAL PRIMARY KEY,
    ho_ten VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mat_khau VARCHAR(255) NOT NULL,
    so_dien_thoai VARCHAR(20),
    vai_tro VARCHAR(50) NOT NULL, -- admin, ke_toan, ban_hang, san_xuat, kho, mua_hang
    phong_ban VARCHAR(100),
    trang_thai VARCHAR(20) DEFAULT 'hoat_dong', -- hoat_dong, khoa, nghi_viec
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT,
    nguoi_cap_nhat BIGINT
);

-- 2. Bảng đơn vị tính
CREATE TABLE IF NOT EXISTS don_vi_tinh (
    id BIGSERIAL PRIMARY KEY,
    ma_don_vi VARCHAR(20) UNIQUE NOT NULL,
    ten_don_vi VARCHAR(100) NOT NULL,
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'hoat_dong', -- hoat_dong, khong_su_dung
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- 3. Bảng kho
CREATE TABLE IF NOT EXISTS kho (
    id BIGSERIAL PRIMARY KEY,
    ma_kho VARCHAR(50) UNIQUE NOT NULL,
    ten_kho VARCHAR(200) NOT NULL,
    dia_chi TEXT,
    dien_tich NUMERIC(18,3) CHECK (dien_tich IS NULL OR dien_tich >= 0),
    suc_chua NUMERIC(18,3) CHECK (suc_chua IS NULL OR suc_chua >= 0),
    loai_kho VARCHAR(50) NOT NULL, -- nguyen_lieu, thanh_pham, vat_tu_phu
    nguoi_quan_ly BIGINT REFERENCES nguoi_dung(id),
    trang_thai VARCHAR(20) DEFAULT 'hoat_dong', -- hoat_dong, dong_cua, sua_chua
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 4. Bảng nhà cung cấp (tạo trước để tham chiếu từ vat_tu và PH3)
CREATE TABLE IF NOT EXISTS nha_cung_cap (
    id BIGSERIAL PRIMARY KEY,
    ma_nha_cung_cap VARCHAR(50) UNIQUE NOT NULL,
    ten_nha_cung_cap VARCHAR(200) NOT NULL,
    ma_so_thue VARCHAR(20),
    so_gpkd VARCHAR(50) UNIQUE,
    dia_chi TEXT NOT NULL,
    quoc_gia VARCHAR(100) DEFAULT 'Viet Nam',
    nguoi_lien_he VARCHAR(150) NOT NULL,
    so_dien_thoai VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    loai_hang_cung_cap TEXT,
    han_muc_tin_dung NUMERIC(18,2) DEFAULT 0 CHECK (han_muc_tin_dung >= 0),
    so_ngay_gia_han INTEGER DEFAULT 30 CHECK (so_ngay_gia_han >= 0),
    diem_danh_gia NUMERIC(3,1) DEFAULT 0 CHECK (diem_danh_gia >= 0 AND diem_danh_gia <= 10),
    trang_thai VARCHAR(20) DEFAULT 'hoat_dong', -- hoat_dong, tam_ngung, ngung_giao_dich
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 5. Bảng sản phẩm may mặc (dùng chung PH1, PH2, PH5)
CREATE TABLE IF NOT EXISTS san_pham (
    id BIGSERIAL PRIMARY KEY,
    ma_san_pham VARCHAR(50) UNIQUE NOT NULL,
    ten_san_pham VARCHAR(200) NOT NULL,
    mo_ta TEXT,
    ma_don_vi_tinh BIGINT REFERENCES don_vi_tinh(id),
    gia_ban NUMERIC(18,2) NOT NULL CHECK (gia_ban >= 0),
    gia_von NUMERIC(18,2) CHECK (gia_von IS NULL OR gia_von >= 0),
    thoi_gian_san_xuat NUMERIC(18,3) CHECK (thoi_gian_san_xuat IS NULL OR thoi_gian_san_xuat >= 0),
    dinh_muc_vai NUMERIC(18,3) CHECK (dinh_muc_vai IS NULL OR dinh_muc_vai >= 0),
    size VARCHAR(20),
    mau_sac VARCHAR(50),
    trang_thai VARCHAR(20) DEFAULT 'dang_ban', -- dang_ban, ngung_ban, mau_moi
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 6. Bảng vật tư / nguyên phụ liệu (dùng chung PH2, PH3, PH4)
CREATE TABLE IF NOT EXISTS vat_tu (
    id BIGSERIAL PRIMARY KEY,
    ma_vat_tu VARCHAR(50) UNIQUE NOT NULL,
    ten_vat_tu VARCHAR(200) NOT NULL,
    loai_vat_tu VARCHAR(50) NOT NULL, -- vai_chinh, vai_lot, chi_may, cuc_kep, khoa_keo, phu_lieu
    ma_don_vi_tinh BIGINT REFERENCES don_vi_tinh(id),
    quy_cach VARCHAR(100),
    muc_ton_toi_thieu NUMERIC(18,3) DEFAULT 0 CHECK (muc_ton_toi_thieu >= 0),
    muc_ton_toi_da NUMERIC(18,3) CHECK (muc_ton_toi_da IS NULL OR muc_ton_toi_da >= muc_ton_toi_thieu),
    gia_nhap_trung_binh NUMERIC(18,2) DEFAULT 0 CHECK (gia_nhap_trung_binh >= 0),
    nha_cung_cap_chinh BIGINT REFERENCES nha_cung_cap(id),
    trang_thai VARCHAR(20) DEFAULT 'dang_su_dung', -- dang_su_dung, ngung_su_dung
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- =============================================================================
-- PHẦN 2: PHÂN HỆ 1 — BÁN HÀNG VÀ QUẢN LÝ KHÁCH HÀNG
-- =============================================================================

-- 7. Bảng khách hàng
CREATE TABLE IF NOT EXISTS khach_hang (
    id BIGSERIAL PRIMARY KEY,
    ma_khach_hang VARCHAR(50) UNIQUE NOT NULL,
    ten_khach_hang VARCHAR(200) NOT NULL,
    loai_khach_hang VARCHAR(30) NOT NULL, -- ca_nhan, to_chuc, dai_ly, xuat_khau
    ma_so_thue VARCHAR(20),
    so_dien_thoai VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    dia_chi TEXT NOT NULL,
    tinh_thanh_pho VARCHAR(100) NOT NULL,
    nguoi_lien_he VARCHAR(150),
    han_muc_cong_no NUMERIC(18,2) DEFAULT 0 CHECK (han_muc_cong_no >= 0),
    so_ngay_cong_no INTEGER DEFAULT 0 CHECK (so_ngay_cong_no >= 0),
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'hoat_dong', -- hoat_dong, tam_khoa, ngung_giao_dich
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 8. Bảng đơn bán hàng
CREATE TABLE IF NOT EXISTS don_ban_hang (
    id BIGSERIAL PRIMARY KEY,
    ma_don_ban VARCHAR(50) UNIQUE NOT NULL,
    ma_khach_hang BIGINT NOT NULL REFERENCES khach_hang(id),
    ngay_dat_hang TIMESTAMPTZ NOT NULL,
    ngay_giao_hang_yc TIMESTAMPTZ NOT NULL,
    ngay_giao_thuc_te TIMESTAMPTZ,
    dia_chi_giao_hang TEXT NOT NULL,
    tong_tien_hang NUMERIC(18,2) NOT NULL CHECK (tong_tien_hang >= 0),
    tien_thue NUMERIC(18,2) DEFAULT 0 CHECK (tien_thue >= 0),
    tien_giam_gia NUMERIC(18,2) DEFAULT 0 CHECK (tien_giam_gia >= 0),
    tong_thanh_toan NUMERIC(18,2) NOT NULL CHECK (tong_thanh_toan >= 0),
    nguoi_ban BIGINT REFERENCES nguoi_dung(id),
    trang_thai VARCHAR(20) DEFAULT 'cho_xac_nhan', -- cho_xac_nhan, da_xac_nhan, dang_san_xuat, da_giao, huy
    ghi_chu TEXT,
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 9. Bảng chi tiết đơn bán hàng
CREATE TABLE IF NOT EXISTS chi_tiet_don_ban_hang (
    id BIGSERIAL PRIMARY KEY,
    ma_don_ban_hang BIGINT NOT NULL REFERENCES don_ban_hang(id) ON DELETE CASCADE,
    ma_san_pham BIGINT NOT NULL REFERENCES san_pham(id),
    so_luong NUMERIC(18,3) NOT NULL CHECK (so_luong > 0),
    don_gia NUMERIC(18,2) NOT NULL CHECK (don_gia >= 0),
    ty_le_giam_gia NUMERIC(5,2) DEFAULT 0 CHECK (ty_le_giam_gia >= 0 AND ty_le_giam_gia <= 100),
    thanh_tien NUMERIC(18,2) NOT NULL CHECK (thanh_tien >= 0),
    so_luong_giao NUMERIC(18,3) DEFAULT 0 CHECK (so_luong_giao >= 0),
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'chua_giao', -- chua_giao, giao_mot_phan, da_giao_du
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- 10. Bảng giao hàng
CREATE TABLE IF NOT EXISTS giao_hang (
    id BIGSERIAL PRIMARY KEY,
    ma_giao_hang VARCHAR(50) UNIQUE NOT NULL,
    ma_don_ban_hang BIGINT NOT NULL REFERENCES don_ban_hang(id),
    ma_kho BIGINT NOT NULL REFERENCES kho(id),
    ngay_giao TIMESTAMPTZ NOT NULL,
    ten_nguoi_nhan VARCHAR(150) NOT NULL,
    dia_chi_giao TEXT NOT NULL,
    phuong_tien_van_chuyen VARCHAR(100),
    nguoi_giao_hang BIGINT REFERENCES nguoi_dung(id),
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'cho_giao', -- cho_giao, dang_giao, da_giao, that_bai
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 11. Bảng hóa đơn bán hàng
CREATE TABLE IF NOT EXISTS hoa_don_ban_hang (
    id BIGSERIAL PRIMARY KEY,
    ma_hoa_don VARCHAR(50) UNIQUE NOT NULL,
    ma_don_ban_hang BIGINT NOT NULL REFERENCES don_ban_hang(id),
    ma_khach_hang BIGINT NOT NULL REFERENCES khach_hang(id),
    ngay_xuat_hoa_don TIMESTAMPTZ NOT NULL,
    ngay_dao_han TIMESTAMPTZ NOT NULL,
    tong_tien_truoc_thue NUMERIC(18,2) NOT NULL CHECK (tong_tien_truoc_thue >= 0),
    tien_thue NUMERIC(18,2) DEFAULT 0 CHECK (tien_thue >= 0),
    tong_tien_sau_thue NUMERIC(18,2) NOT NULL CHECK (tong_tien_sau_thue >= 0),
    so_tien_da_thu NUMERIC(18,2) DEFAULT 0 CHECK (so_tien_da_thu >= 0),
    trang_thai VARCHAR(20) DEFAULT 'chua_thanh_toan', -- chua_thanh_toan, thanh_toan_mot_phan, da_thanh_toan, qua_han
    ghi_chu TEXT,
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- =============================================================================
-- PHẦN 3: PHÂN HỆ 2 — SẢN XUẤT VÀ HOẠCH ĐỊNH NHU CẦU NGUYÊN PHỤ LIỆU
-- =============================================================================

-- 12. Bảng kế hoạch sản xuất
CREATE TABLE IF NOT EXISTS ke_hoach_san_xuat (
    id BIGSERIAL PRIMARY KEY,
    ma_ke_hoach VARCHAR(50) UNIQUE NOT NULL,
    ma_don_ban_hang BIGINT REFERENCES don_ban_hang(id),
    ma_san_pham BIGINT NOT NULL REFERENCES san_pham(id),
    so_luong_ke_hoach NUMERIC(18,3) NOT NULL CHECK (so_luong_ke_hoach > 0),
    ngay_bat_dau TIMESTAMPTZ NOT NULL,
    ngay_ket_thuc TIMESTAMPTZ NOT NULL,
    nguoi_lap_ke_hoach BIGINT REFERENCES nguoi_dung(id),
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'cho_duyet', -- cho_duyet, da_duyet, dang_thuc_hien, hoan_thanh, huy
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id),
    CONSTRAINT chk_khsx_ngay CHECK (ngay_ket_thuc >= ngay_bat_dau)
);

-- 13. Bảng định mức nguyên phụ liệu (BOM)
CREATE TABLE IF NOT EXISTS dinh_muc_nguyen_lieu (
    id BIGSERIAL PRIMARY KEY,
    ma_san_pham BIGINT NOT NULL REFERENCES san_pham(id),
    ma_vat_tu BIGINT NOT NULL REFERENCES vat_tu(id),
    dinh_muc NUMERIC(18,3) NOT NULL CHECK (dinh_muc > 0),
    ty_le_hao_hut NUMERIC(5,2) DEFAULT 0 CHECK (ty_le_hao_hut >= 0 AND ty_le_hao_hut <= 100),
    dinh_muc_thuc_te NUMERIC(18,3) NOT NULL CHECK (dinh_muc_thuc_te > 0),
    phien_ban VARCHAR(20) DEFAULT '1.0',
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'hieu_luc', -- hieu_luc, het_hieu_luc
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id),
    CONSTRAINT uq_dinh_muc_sp_vt_pb UNIQUE (ma_san_pham, ma_vat_tu, phien_ban)
);

-- 14. Bảng lệnh sản xuất
CREATE TABLE IF NOT EXISTS lenh_san_xuat (
    id BIGSERIAL PRIMARY KEY,
    ma_lenh_san_xuat VARCHAR(50) UNIQUE NOT NULL,
    ma_ke_hoach_san_xuat BIGINT REFERENCES ke_hoach_san_xuat(id),
    ma_don_ban_hang BIGINT REFERENCES don_ban_hang(id),
    ma_san_pham BIGINT NOT NULL REFERENCES san_pham(id),
    so_luong_yeu_cau NUMERIC(18,3) NOT NULL CHECK (so_luong_yeu_cau > 0),
    so_luong_hoan_thanh NUMERIC(18,3) DEFAULT 0 CHECK (so_luong_hoan_thanh >= 0),
    ngay_bat_dau TIMESTAMPTZ NOT NULL,
    ngay_ket_thuc_yc TIMESTAMPTZ NOT NULL,
    ngay_hoan_thanh TIMESTAMPTZ,
    nguoi_phu_trach BIGINT REFERENCES nguoi_dung(id),
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'chua_bat_dau', -- chua_bat_dau, dang_san_xuat, tam_dung, hoan_thanh, huy
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 15. Bảng công đoạn sản xuất
CREATE TABLE IF NOT EXISTS cong_doan_san_xuat (
    id BIGSERIAL PRIMARY KEY,
    ma_lenh_san_xuat BIGINT NOT NULL REFERENCES lenh_san_xuat(id) ON DELETE CASCADE,
    ten_cong_doan VARCHAR(200) NOT NULL,
    so_thu_tu INTEGER NOT NULL CHECK (so_thu_tu > 0),
    thoi_gian_chuan NUMERIC(18,3) NOT NULL CHECK (thoi_gian_chuan >= 0),
    so_cong_nhan INTEGER DEFAULT 1 CHECK (so_cong_nhan > 0),
    ngay_bat_dau TIMESTAMPTZ,
    ngay_ket_thuc TIMESTAMPTZ,
    nguoi_phu_trach BIGINT REFERENCES nguoi_dung(id),
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'cho_thuc_hien', -- cho_thuc_hien, dang_thuc_hien, hoan_thanh
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- =============================================================================
-- PHẦN 4: PHÂN HỆ 3 — MUA HÀNG VÀ QUẢN LÝ NHÀ CUNG CẤP
-- =============================================================================

-- 16. Bảng yêu cầu mua hàng
CREATE TABLE IF NOT EXISTS yeu_cau_mua_hang (
    id BIGSERIAL PRIMARY KEY,
    ma_yeu_cau_mua VARCHAR(50) UNIQUE NOT NULL,
    nguon_yeu_cau VARCHAR(50) NOT NULL, -- san_xuat, kho
    ma_nhu_cau_npl BIGINT, -- Sẽ liên kết tới nhu_cau_npl sau
    ngay_yeu_cau TIMESTAMPTZ NOT NULL,
    nguoi_yeu_cau BIGINT REFERENCES nguoi_dung(id),
    nguoi_phe_duyet BIGINT REFERENCES nguoi_dung(id),
    ngay_phe_duyet TIMESTAMPTZ,
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'cho_duyet', -- cho_duyet, da_duyet, da_tao_don, huy
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 17. Bảng nhu cầu NPL (MRP - liên kết giữa PH2 và PH3)
CREATE TABLE IF NOT EXISTS nhu_cau_npl (
    id BIGSERIAL PRIMARY KEY,
    ma_ke_hoach_san_xuat BIGINT NOT NULL REFERENCES ke_hoach_san_xuat(id),
    ma_vat_tu BIGINT NOT NULL REFERENCES vat_tu(id),
    so_luong_can NUMERIC(18,3) NOT NULL CHECK (so_luong_can > 0),
    so_luong_ton_kho NUMERIC(18,3) DEFAULT 0 CHECK (so_luong_ton_kho >= 0),
    so_luong_can_mua NUMERIC(18,3) DEFAULT 0 CHECK (so_luong_can_mua >= 0),
    ngay_can TIMESTAMPTZ NOT NULL,
    da_tao_yeu_cau_mua VARCHAR(20) DEFAULT 'chua', -- chua, da_tao
    ma_yeu_cau_mua_hang BIGINT REFERENCES yeu_cau_mua_hang(id),
    ghi_chu TEXT,
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- Thêm FK từ yeu_cau_mua_hang tới nhu_cau_npl
ALTER TABLE yeu_cau_mua_hang
    ADD CONSTRAINT fk_ycmh_nhu_cau_npl FOREIGN KEY (ma_nhu_cau_npl) REFERENCES nhu_cau_npl(id);

-- 18. Bảng chi tiết yêu cầu mua hàng
CREATE TABLE IF NOT EXISTS chi_tiet_yeu_cau_mua (
    id BIGSERIAL PRIMARY KEY,
    ma_yeu_cau_mua_hang BIGINT NOT NULL REFERENCES yeu_cau_mua_hang(id) ON DELETE CASCADE,
    ma_vat_tu BIGINT NOT NULL REFERENCES vat_tu(id),
    so_luong_yeu_cau NUMERIC(18,3) NOT NULL CHECK (so_luong_yeu_cau > 0),
    don_gia_du_kien NUMERIC(18,2) CHECK (don_gia_du_kien IS NULL OR don_gia_du_kien >= 0),
    ngay_can_giao TIMESTAMPTZ NOT NULL,
    ma_kho_nhap BIGINT NOT NULL REFERENCES kho(id),
    ghi_chu TEXT,
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- 19. Bảng đơn mua hàng (PO)
CREATE TABLE IF NOT EXISTS don_mua_hang (
    id BIGSERIAL PRIMARY KEY,
    ma_don_mua VARCHAR(50) UNIQUE NOT NULL,
    ma_nha_cung_cap BIGINT NOT NULL REFERENCES nha_cung_cap(id),
    ma_yeu_cau_mua_hang BIGINT REFERENCES yeu_cau_mua_hang(id),
    ngay_dat_hang TIMESTAMPTZ NOT NULL,
    ngay_giao_hang_yc TIMESTAMPTZ NOT NULL,
    tong_tien_hang NUMERIC(18,2) NOT NULL CHECK (tong_tien_hang >= 0),
    tien_thue NUMERIC(18,2) DEFAULT 0 CHECK (tien_thue >= 0),
    tong_thanh_toan NUMERIC(18,2) NOT NULL CHECK (tong_thanh_toan >= 0),
    dieu_kien_thanh_toan TEXT,
    nguoi_dat_hang BIGINT REFERENCES nguoi_dung(id),
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'cho_duyet', -- cho_duyet, da_gui_ncc, da_xac_nhan, dang_giao, da_nhap_kho, huy
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 20. Bảng chi tiết đơn mua hàng
CREATE TABLE IF NOT EXISTS chi_tiet_don_mua (
    id BIGSERIAL PRIMARY KEY,
    ma_don_mua_hang BIGINT NOT NULL REFERENCES don_mua_hang(id) ON DELETE CASCADE,
    ma_vat_tu BIGINT NOT NULL REFERENCES vat_tu(id),
    so_luong_dat NUMERIC(18,3) NOT NULL CHECK (so_luong_dat > 0),
    don_gia NUMERIC(18,2) NOT NULL CHECK (don_gia >= 0),
    thanh_tien NUMERIC(18,2) NOT NULL CHECK (thanh_tien >= 0),
    so_luong_da_nhap NUMERIC(18,3) DEFAULT 0 CHECK (so_luong_da_nhap >= 0),
    ghi_chu TEXT,
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- 21. Bảng hóa đơn nhà cung cấp
CREATE TABLE IF NOT EXISTS hoa_don_nha_cung_cap (
    id BIGSERIAL PRIMARY KEY,
    ma_hoa_don_ncc VARCHAR(50) UNIQUE NOT NULL,
    ma_don_mua_hang BIGINT REFERENCES don_mua_hang(id),
    ma_nha_cung_cap BIGINT NOT NULL REFERENCES nha_cung_cap(id),
    so_hoa_don_ncc VARCHAR(50) NOT NULL,
    ngay_hoa_don TIMESTAMPTZ NOT NULL,
    ngay_dao_han TIMESTAMPTZ NOT NULL,
    tong_tien_truoc_thue NUMERIC(18,2) NOT NULL CHECK (tong_tien_truoc_thue >= 0),
    tien_thue NUMERIC(18,2) DEFAULT 0 CHECK (tien_thue >= 0),
    tong_thanh_toan NUMERIC(18,2) NOT NULL CHECK (tong_thanh_toan >= 0),
    so_tien_da_tra NUMERIC(18,2) DEFAULT 0 CHECK (so_tien_da_tra >= 0),
    trang_thai VARCHAR(20) DEFAULT 'chua_thanh_toan', -- chua_thanh_toan, thanh_toan_mot_phan, da_thanh_toan, qua_han
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 22. Bảng thanh toán nhà cung cấp
CREATE TABLE IF NOT EXISTS thanh_toan_ncc (
    id BIGSERIAL PRIMARY KEY,
    ma_thanh_toan_ncc VARCHAR(50) UNIQUE NOT NULL,
    ma_hoa_don_ncc BIGINT NOT NULL REFERENCES hoa_don_nha_cung_cap(id),
    so_tien_thanh_toan NUMERIC(18,2) NOT NULL CHECK (so_tien_thanh_toan > 0),
    ngay_thanh_toan TIMESTAMPTZ NOT NULL,
    hinh_thuc_thanh_toan VARCHAR(50) NOT NULL, -- chuyen_khoan, tien_mat, sec
    so_tham_chieu VARCHAR(100),
    nguoi_thanh_toan BIGINT REFERENCES nguoi_dung(id),
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'da_thanh_toan', -- da_thanh_toan, huy
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- 23. Bảng đánh giá nhà cung cấp
CREATE TABLE IF NOT EXISTS danh_gia_ncc (
    id BIGSERIAL PRIMARY KEY,
    ma_nha_cung_cap BIGINT NOT NULL REFERENCES nha_cung_cap(id),
    ky_danh_gia VARCHAR(20) NOT NULL,
    diem_chat_luong NUMERIC(3,1) NOT NULL CHECK (diem_chat_luong >= 0 AND diem_chat_luong <= 10),
    diem_giao_hang NUMERIC(3,1) NOT NULL CHECK (diem_giao_hang >= 0 AND diem_giao_hang <= 10),
    diem_gia_ca NUMERIC(3,1) NOT NULL CHECK (diem_gia_ca >= 0 AND diem_gia_ca <= 10),
    diem_tong_hop NUMERIC(3,1) NOT NULL CHECK (diem_tong_hop >= 0 AND diem_tong_hop <= 10),
    nhan_xet TEXT,
    nguoi_danh_gia BIGINT REFERENCES nguoi_dung(id),
    ngay_danh_gia TIMESTAMPTZ NOT NULL,
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- =============================================================================
-- PHẦN 5: PHÂN HỆ 4 — KHO VÀ QUẢN LÝ VẬT TƯ
-- =============================================================================

-- 24. Bảng vị trí kho
CREATE TABLE IF NOT EXISTS vi_tri_kho (
    id BIGSERIAL PRIMARY KEY,
    ma_kho BIGINT NOT NULL REFERENCES kho(id),
    ma_vi_tri VARCHAR(50) UNIQUE NOT NULL,
    ten_vi_tri VARCHAR(100) NOT NULL,
    khu_vuc VARCHAR(50),
    tang VARCHAR(20),
    suc_chua_toi_da NUMERIC(18,3) CHECK (suc_chua_toi_da IS NULL OR suc_chua_toi_da >= 0),
    trang_thai VARCHAR(20) DEFAULT 'trong', -- trong, co_hang, day
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- 25. Bảng lô vật tư / cây vải
CREATE TABLE IF NOT EXISTS lo_vat_tu (
    id BIGSERIAL PRIMARY KEY,
    ma_lo VARCHAR(50) UNIQUE NOT NULL,
    ma_vat_tu BIGINT NOT NULL REFERENCES vat_tu(id),
    ma_nha_cung_cap BIGINT REFERENCES nha_cung_cap(id),
    ma_don_mua_hang BIGINT REFERENCES don_mua_hang(id),
    ngay_san_xuat TIMESTAMPTZ,
    han_su_dung TIMESTAMPTZ,
    so_luong_nhap NUMERIC(18,3) NOT NULL CHECK (so_luong_nhap >= 0),
    so_luong_hien_tai NUMERIC(18,3) NOT NULL CHECK (so_luong_hien_tai >= 0),
    don_gia_nhap NUMERIC(18,2) NOT NULL CHECK (don_gia_nhap >= 0),
    ma_vi_tri_kho BIGINT REFERENCES vi_tri_kho(id),
    trang_thai VARCHAR(20) DEFAULT 'binh_thuong', -- binh_thuong, het_hang, hong_hu, qua_han
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- 26. Bảng tồn kho
CREATE TABLE IF NOT EXISTS ton_kho (
    id BIGSERIAL PRIMARY KEY,
    ma_kho BIGINT NOT NULL REFERENCES kho(id),
    ma_vat_tu BIGINT NOT NULL REFERENCES vat_tu(id),
    so_luong_ton NUMERIC(18,3) NOT NULL DEFAULT 0 CHECK (so_luong_ton >= 0),
    don_vi_tinh BIGINT REFERENCES don_vi_tinh(id),
    gia_tri_ton_kho NUMERIC(18,2) DEFAULT 0 CHECK (gia_tri_ton_kho >= 0),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id),
    CONSTRAINT uq_ton_kho_kho_vat_tu UNIQUE (ma_kho, ma_vat_tu)
);

-- 27. Bảng phiếu nhập kho (Bảng gốc dùng chung PH2, PH3, PH4)
CREATE TABLE IF NOT EXISTS phieu_nhap_kho (
    id BIGSERIAL PRIMARY KEY,
    ma_phieu_nhap VARCHAR(50) UNIQUE NOT NULL,
    loai_nhap VARCHAR(50) NOT NULL, -- tu_mua_hang, thanh_pham_san_xuat, chuyen_kho, kiem_ke
    ma_don_mua_hang BIGINT REFERENCES don_mua_hang(id),
    ma_lenh_san_xuat BIGINT REFERENCES lenh_san_xuat(id),
    ma_kho_nhap BIGINT NOT NULL REFERENCES kho(id),
    ngay_nhap TIMESTAMPTZ NOT NULL,
    thu_kho BIGINT REFERENCES nguoi_dung(id),
    nguoi_giao_hang VARCHAR(150),
    tong_gia_tri_nhap NUMERIC(18,2) DEFAULT 0 CHECK (tong_gia_tri_nhap >= 0),
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'da_nhap', -- cho_duyet, da_nhap, huy
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 28. Bảng chi tiết phiếu nhập kho
CREATE TABLE IF NOT EXISTS chi_tiet_phieu_nhap (
    id BIGSERIAL PRIMARY KEY,
    ma_phieu_nhap_kho BIGINT NOT NULL REFERENCES phieu_nhap_kho(id) ON DELETE CASCADE,
    ma_vat_tu BIGINT NOT NULL REFERENCES vat_tu(id),
    ma_lo_vat_tu BIGINT REFERENCES lo_vat_tu(id),
    so_luong_nhap NUMERIC(18,3) NOT NULL CHECK (so_luong_nhap > 0),
    don_gia_nhap NUMERIC(18,2) NOT NULL CHECK (don_gia_nhap >= 0),
    thanh_tien NUMERIC(18,2) NOT NULL CHECK (thanh_tien >= 0),
    ma_vi_tri_kho BIGINT REFERENCES vi_tri_kho(id),
    ghi_chu TEXT,
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- 29. Bảng phiếu xuất kho (Bảng gốc liên kết PH1 và PH2)
CREATE TABLE IF NOT EXISTS phieu_xuat_kho (
    id BIGSERIAL PRIMARY KEY,
    ma_phieu_xuat VARCHAR(50) UNIQUE NOT NULL,
    loai_xuat VARCHAR(50) NOT NULL, -- giao_khach, xuat_san_xuat, chuyen_kho, huy_vat_tu
    ma_don_ban_hang BIGINT REFERENCES don_ban_hang(id),
    ma_lenh_san_xuat BIGINT REFERENCES lenh_san_xuat(id),
    ma_kho_xuat BIGINT NOT NULL REFERENCES kho(id),
    ngay_xuat TIMESTAMPTZ NOT NULL,
    thu_kho BIGINT REFERENCES nguoi_dung(id),
    nguoi_nhan VARCHAR(150),
    tong_gia_tri_xuat NUMERIC(18,2) DEFAULT 0 CHECK (tong_gia_tri_xuat >= 0),
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'da_xuat', -- cho_duyet, da_xuat, huy
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 30. Bảng chi tiết phiếu xuất kho
CREATE TABLE IF NOT EXISTS chi_tiet_phieu_xuat (
    id BIGSERIAL PRIMARY KEY,
    ma_phieu_xuat_kho BIGINT NOT NULL REFERENCES phieu_xuat_kho(id) ON DELETE CASCADE,
    ma_vat_tu BIGINT NOT NULL REFERENCES vat_tu(id),
    ma_lo_vat_tu BIGINT REFERENCES lo_vat_tu(id),
    so_luong_xuat NUMERIC(18,3) NOT NULL CHECK (so_luong_xuat > 0),
    don_gia_xuat NUMERIC(18,2) NOT NULL CHECK (don_gia_xuat >= 0),
    thanh_tien NUMERIC(18,2) NOT NULL CHECK (thanh_tien >= 0),
    ghi_chu TEXT,
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- 31. Bảng phiếu chuyển kho
CREATE TABLE IF NOT EXISTS phieu_chuyen_kho (
    id BIGSERIAL PRIMARY KEY,
    ma_phieu_chuyen VARCHAR(50) UNIQUE NOT NULL,
    ma_kho_xuat BIGINT NOT NULL REFERENCES kho(id),
    ma_kho_nhap BIGINT NOT NULL REFERENCES kho(id),
    ngay_chuyen TIMESTAMPTZ NOT NULL,
    nguoi_chuyen BIGINT REFERENCES nguoi_dung(id),
    ly_do TEXT,
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'da_chuyen', -- cho_duyet, da_chuyen, huy
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id),
    CONSTRAINT chk_chuyen_kho_khac_nhau CHECK (ma_kho_xuat <> ma_kho_nhap)
);

-- 32. Bảng chi tiết phiếu chuyển kho
CREATE TABLE IF NOT EXISTS chi_tiet_chuyen_kho (
    id BIGSERIAL PRIMARY KEY,
    ma_phieu_chuyen_kho BIGINT NOT NULL REFERENCES phieu_chuyen_kho(id) ON DELETE CASCADE,
    ma_vat_tu BIGINT NOT NULL REFERENCES vat_tu(id),
    so_luong_chuyen NUMERIC(18,3) NOT NULL CHECK (so_luong_chuyen > 0),
    don_gia NUMERIC(18,2) CHECK (don_gia IS NULL OR don_gia >= 0),
    ghi_chu TEXT,
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- 33. Bảng phiếu kiểm kê kho
CREATE TABLE IF NOT EXISTS phieu_kiem_ke (
    id BIGSERIAL PRIMARY KEY,
    ma_phieu_kiem_ke VARCHAR(50) UNIQUE NOT NULL,
    ma_kho BIGINT NOT NULL REFERENCES kho(id),
    ky_kiem_ke VARCHAR(50) NOT NULL,
    ngay_kiem_ke TIMESTAMPTZ NOT NULL,
    truong_kiem_ke BIGINT REFERENCES nguoi_dung(id),
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'dang_kiem_ke', -- dang_kiem_ke, hoan_thanh, da_dieu_chinh
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 34. Bảng chi tiết kiểm kê kho
CREATE TABLE IF NOT EXISTS chi_tiet_kiem_ke (
    id BIGSERIAL PRIMARY KEY,
    ma_phieu_kiem_ke BIGINT NOT NULL REFERENCES phieu_kiem_ke(id) ON DELETE CASCADE,
    ma_vat_tu BIGINT NOT NULL REFERENCES vat_tu(id),
    so_luong_so_sach NUMERIC(18,3) NOT NULL CHECK (so_luong_so_sach >= 0),
    so_luong_thuc_te NUMERIC(18,3) NOT NULL CHECK (so_luong_thuc_te >= 0),
    chenh_lech NUMERIC(18,3) NOT NULL,
    gia_tri_chenh_lech NUMERIC(18,2) NOT NULL,
    nguyen_nhan TEXT,
    da_dieu_chinh VARCHAR(20) DEFAULT 'chua', -- chua, da_dieu_chinh
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- 35. Bảng kết quả sản xuất (PH2 hoàn thiện sau khi có phieu_nhap_kho)
CREATE TABLE IF NOT EXISTS ket_qua_san_xuat (
    id BIGSERIAL PRIMARY KEY,
    ma_lenh_san_xuat BIGINT NOT NULL REFERENCES lenh_san_xuat(id),
    ngay_bao_cao TIMESTAMPTZ NOT NULL,
    so_luong_hoan_thanh NUMERIC(18,3) NOT NULL CHECK (so_luong_hoan_thanh >= 0),
    so_luong_loi NUMERIC(18,3) DEFAULT 0 CHECK (so_luong_loi >= 0),
    so_luong_tai_che NUMERIC(18,3) DEFAULT 0 CHECK (so_luong_tai_che >= 0),
    nhan_cong_thuc_te NUMERIC(18,3) CHECK (nhan_cong_thuc_te IS NULL OR nhan_cong_thuc_te >= 0),
    ma_phieu_nhap_kho BIGINT REFERENCES phieu_nhap_kho(id),
    ghi_chu TEXT,
    nguoi_bao_cao BIGINT REFERENCES nguoi_dung(id),
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- =============================================================================
-- PHẦN 6: PHÂN HỆ 5 — TÀI CHÍNH – KẾ TOÁN VÀ GIÁ THÀNH
-- =============================================================================

-- 36. Bảng hệ thống tài khoản kế toán
CREATE TABLE IF NOT EXISTS he_thong_tai_khoan (
    id BIGSERIAL PRIMARY KEY,
    so_tai_khoan VARCHAR(20) UNIQUE NOT NULL,
    ten_tai_khoan VARCHAR(200) NOT NULL,
    loai_tai_khoan VARCHAR(50) NOT NULL, -- tai_san, no_phai_tra, von_chu_so_huu, doanh_thu, chi_phi
    tai_khoan_cha BIGINT REFERENCES he_thong_tai_khoan(id),
    cap_tai_khoan INTEGER NOT NULL CHECK (cap_tai_khoan >= 1 AND cap_tai_khoan <= 4),
    cho_phep_hach_toan VARCHAR(20) DEFAULT 'co', -- co, khong
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'hoat_dong', -- hoat_dong, khong_su_dung
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 37. Bảng chứng từ gốc
CREATE TABLE IF NOT EXISTS chung_tu_goc (
    id BIGSERIAL PRIMARY KEY,
    ma_chung_tu VARCHAR(50) UNIQUE NOT NULL,
    loai_chung_tu VARCHAR(50) NOT NULL, -- hoa_don_ban, hoa_don_mua, phieu_thu, phieu_chi, phieu_nhap_xuat_kho
    ma_chung_tu_lien_quan BIGINT,
    bang_chung_tu_lien_quan VARCHAR(100),
    ngay_chung_tu TIMESTAMPTZ NOT NULL,
    so_tien NUMERIC(18,2) NOT NULL CHECK (so_tien >= 0),
    mo_ta TEXT,
    file_dinh_kem TEXT,
    trang_thai VARCHAR(20) DEFAULT 'hieu_luc', -- hieu_luc, huy, dieu_chinh
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 38. Bảng nhật ký hạch toán (bút toán sổ cái)
CREATE TABLE IF NOT EXISTS nhat_ky_hach_toan (
    id BIGSERIAL PRIMARY KEY,
    ma_hach_toan VARCHAR(50) UNIQUE NOT NULL,
    ma_chung_tu_goc BIGINT NOT NULL REFERENCES chung_tu_goc(id) ON DELETE CASCADE,
    ngay_hach_toan TIMESTAMPTZ NOT NULL,
    tai_khoan_no BIGINT NOT NULL REFERENCES he_thong_tai_khoan(id),
    tai_khoan_co BIGINT NOT NULL REFERENCES he_thong_tai_khoan(id),
    so_tien NUMERIC(18,2) NOT NULL CHECK (so_tien > 0),
    mo_ta TEXT NOT NULL,
    ky_ke_toan VARCHAR(20) NOT NULL,
    nguoi_hach_toan BIGINT REFERENCES nguoi_dung(id),
    nguoi_phe_duyet BIGINT REFERENCES nguoi_dung(id),
    trang_thai VARCHAR(20) DEFAULT 'da_hach_toan', -- cho_duyet, da_hach_toan, da_dao_but_toan
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 39. Bảng công nợ (phải thu / phải trả)
CREATE TABLE IF NOT EXISTS cong_no (
    id BIGSERIAL PRIMARY KEY,
    loai_cong_no VARCHAR(20) NOT NULL, -- phai_thu, phai_tra
    ma_khach_hang BIGINT REFERENCES khach_hang(id),
    ma_nha_cung_cap BIGINT REFERENCES nha_cung_cap(id),
    ma_hoa_don BIGINT,
    bang_hoa_don VARCHAR(100),
    so_tien_phat_sinh NUMERIC(18,2) NOT NULL CHECK (so_tien_phat_sinh >= 0),
    so_tien_da_thanh_toan NUMERIC(18,2) DEFAULT 0 CHECK (so_tien_da_thanh_toan >= 0),
    so_tien_con_lai NUMERIC(18,2) NOT NULL CHECK (so_tien_con_lai >= 0),
    ngay_dao_han TIMESTAMPTZ NOT NULL,
    trang_thai VARCHAR(20) DEFAULT 'chua_thanh_toan', -- chua_thanh_toan, mot_phan, da_thanh_toan, qua_han
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id),
    CONSTRAINT chk_cong_no_doi_tuong CHECK (
        (loai_cong_no = 'phai_thu' AND ma_khach_hang IS NOT NULL) OR
        (loai_cong_no = 'phai_tra' AND ma_nha_cung_cap IS NOT NULL)
    )
);

-- 40. Bảng báo cáo tài chính
CREATE TABLE IF NOT EXISTS bao_cao_tai_chinh (
    id BIGSERIAL PRIMARY KEY,
    loai_bao_cao VARCHAR(100) NOT NULL, -- bang_can_doi_ke_toan, ket_qua_kinh_doanh, luu_chuyen_tien_te, thuyet_minh
    ky_bao_cao VARCHAR(20) NOT NULL,
    ngay_lap_bao_cao TIMESTAMPTZ NOT NULL,
    tong_tai_san NUMERIC(18,2),
    tong_no_phai_tra NUMERIC(18,2),
    von_chu_so_huu NUMERIC(18,2),
    doanh_thu_thuan NUMERIC(18,2),
    gia_von_hang_ban NUMERIC(18,2),
    loi_nhuan_truoc_thue NUMERIC(18,2),
    loi_nhuan_sau_thue NUMERIC(18,2),
    nguoi_lap BIGINT REFERENCES nguoi_dung(id),
    nguoi_phe_duyet BIGINT REFERENCES nguoi_dung(id),
    trang_thai VARCHAR(20) DEFAULT 'nhap', -- nhap, cho_duyet, da_phe_duyet, da_nop
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 41. Bảng giá thành sản phẩm
CREATE TABLE IF NOT EXISTS gia_thanh_san_pham (
    id BIGSERIAL PRIMARY KEY,
    ma_san_pham BIGINT NOT NULL REFERENCES san_pham(id),
    ma_lenh_san_xuat BIGINT REFERENCES lenh_san_xuat(id),
    ky_tinh_gia_thanh VARCHAR(20) NOT NULL,
    so_luong_san_xuat NUMERIC(18,3) NOT NULL CHECK (so_luong_san_xuat > 0),
    chi_phi_vat_lieu_truc_tiep NUMERIC(18,2) NOT NULL CHECK (chi_phi_vat_lieu_truc_tiep >= 0),
    chi_phi_nhan_cong_truc_tiep NUMERIC(18,2) NOT NULL CHECK (chi_phi_nhan_cong_truc_tiep >= 0),
    chi_phi_san_xuat_chung NUMERIC(18,2) NOT NULL CHECK (chi_phi_san_xuat_chung >= 0),
    tong_chi_phi NUMERIC(18,2) NOT NULL CHECK (tong_chi_phi >= 0),
    gia_thanh_don_vi NUMERIC(18,2) NOT NULL CHECK (gia_thanh_don_vi >= 0),
    gia_ban_de_nghi NUMERIC(18,2) CHECK (gia_ban_de_nghi IS NULL OR gia_ban_de_nghi >= 0),
    ghi_chu TEXT,
    nguoi_tinh BIGINT REFERENCES nguoi_dung(id),
    trang_thai VARCHAR(20) DEFAULT 'du_thao', -- du_thao, da_duyet, da_cap_nhat_vao_san_pham
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- =============================================================================
-- PHẦN 7: RÀNG BUỘC TỰ THAM CHIẾU VÀ CÁC LIÊN KẾT BỔ SUNG
-- =============================================================================

-- Self-reference FKs cho nguoi_dung
ALTER TABLE nguoi_dung
    ADD CONSTRAINT fk_nguoi_dung_nguoi_tao FOREIGN KEY (nguoi_tao) REFERENCES nguoi_dung(id),
    ADD CONSTRAINT fk_nguoi_dung_nguoi_cap_nhat FOREIGN KEY (nguoi_cap_nhat) REFERENCES nguoi_dung(id);

-- =============================================================================
-- PHẦN 8: CHỈ MỤC TỐI ƯU HÓA (INDEXES)
-- =============================================================================

-- Indexes cho Master Data
CREATE INDEX IF NOT EXISTS idx_nguoi_dung_email ON nguoi_dung(email);
CREATE INDEX IF NOT EXISTS idx_nguoi_dung_vai_tro ON nguoi_dung(vai_tro);
CREATE INDEX IF NOT EXISTS idx_san_pham_ma ON san_pham(ma_san_pham);
CREATE INDEX IF NOT EXISTS idx_san_pham_dvt ON san_pham(ma_don_vi_tinh);
CREATE INDEX IF NOT EXISTS idx_vat_tu_ma ON vat_tu(ma_vat_tu);
CREATE INDEX IF NOT EXISTS idx_vat_tu_loai ON vat_tu(loai_vat_tu);
CREATE INDEX IF NOT EXISTS idx_vat_tu_dvt ON vat_tu(ma_don_vi_tinh);
CREATE INDEX IF NOT EXISTS idx_vat_tu_ncc ON vat_tu(nha_cung_cap_chinh);
CREATE INDEX IF NOT EXISTS idx_kho_ma ON kho(ma_kho);
CREATE INDEX IF NOT EXISTS idx_kho_loai ON kho(loai_kho);
CREATE INDEX IF NOT EXISTS idx_kho_quan_ly ON kho(nguoi_quan_ly);

-- Indexes cho PH1 (Bán hàng)
CREATE INDEX IF NOT EXISTS idx_khach_hang_ma ON khach_hang(ma_khach_hang);
CREATE INDEX IF NOT EXISTS idx_khach_hang_loai ON khach_hang(loai_khach_hang);
CREATE INDEX IF NOT EXISTS idx_don_ban_hang_ma ON don_ban_hang(ma_don_ban);
CREATE INDEX IF NOT EXISTS idx_don_ban_hang_khach_hang ON don_ban_hang(ma_khach_hang);
CREATE INDEX IF NOT EXISTS idx_don_ban_hang_nguoi_ban ON don_ban_hang(nguoi_ban);
CREATE INDEX IF NOT EXISTS idx_don_ban_hang_trang_thai ON don_ban_hang(trang_thai);
CREATE INDEX IF NOT EXISTS idx_chi_tiet_don_ban_hang_don ON chi_tiet_don_ban_hang(ma_don_ban_hang);
CREATE INDEX IF NOT EXISTS idx_chi_tiet_don_ban_hang_san_pham ON chi_tiet_don_ban_hang(ma_san_pham);
CREATE INDEX IF NOT EXISTS idx_giao_hang_don ON giao_hang(ma_don_ban_hang);
CREATE INDEX IF NOT EXISTS idx_giao_hang_kho ON giao_hang(ma_kho);
CREATE INDEX IF NOT EXISTS idx_hoa_don_ban_hang_don ON hoa_don_ban_hang(ma_don_ban_hang);
CREATE INDEX IF NOT EXISTS idx_hoa_don_ban_hang_khach ON hoa_don_ban_hang(ma_khach_hang);

-- Indexes cho PH2 (Sản xuất)
CREATE INDEX IF NOT EXISTS idx_ke_hoach_san_xuat_ma ON ke_hoach_san_xuat(ma_ke_hoach);
CREATE INDEX IF NOT EXISTS idx_ke_hoach_san_xuat_don_ban ON ke_hoach_san_xuat(ma_don_ban_hang);
CREATE INDEX IF NOT EXISTS idx_ke_hoach_san_xuat_san_pham ON ke_hoach_san_xuat(ma_san_pham);
CREATE INDEX IF NOT EXISTS idx_dinh_muc_san_pham ON dinh_muc_nguyen_lieu(ma_san_pham);
CREATE INDEX IF NOT EXISTS idx_dinh_muc_vat_tu ON dinh_muc_nguyen_lieu(ma_vat_tu);
CREATE INDEX IF NOT EXISTS idx_lenh_san_xuat_ma ON lenh_san_xuat(ma_lenh_san_xuat);
CREATE INDEX IF NOT EXISTS idx_lenh_san_xuat_ke_hoach ON lenh_san_xuat(ma_ke_hoach_san_xuat);
CREATE INDEX IF NOT EXISTS idx_lenh_san_xuat_don_ban_hang ON lenh_san_xuat(ma_don_ban_hang);
CREATE INDEX IF NOT EXISTS idx_lenh_san_xuat_san_pham ON lenh_san_xuat(ma_san_pham);
CREATE INDEX IF NOT EXISTS idx_lenh_san_xuat_trang_thai ON lenh_san_xuat(trang_thai);
CREATE INDEX IF NOT EXISTS idx_cong_doan_lenh ON cong_doan_san_xuat(ma_lenh_san_xuat);
CREATE INDEX IF NOT EXISTS idx_nhu_cau_npl_ke_hoach ON nhu_cau_npl(ma_ke_hoach_san_xuat);
CREATE INDEX IF NOT EXISTS idx_nhu_cau_npl_vat_tu ON nhu_cau_npl(ma_vat_tu);
CREATE INDEX IF NOT EXISTS idx_nhu_cau_npl_ycmh ON nhu_cau_npl(ma_yeu_cau_mua_hang);
CREATE INDEX IF NOT EXISTS idx_ket_qua_san_xuat_lenh ON ket_qua_san_xuat(ma_lenh_san_xuat);
CREATE INDEX IF NOT EXISTS idx_ket_qua_san_xuat_phieu_nhap ON ket_qua_san_xuat(ma_phieu_nhap_kho);

-- Indexes cho PH3 (Mua hàng)
CREATE INDEX IF NOT EXISTS idx_nha_cung_cap_ma ON nha_cung_cap(ma_nha_cung_cap);
CREATE INDEX IF NOT EXISTS idx_yeu_cau_mua_hang_ma ON yeu_cau_mua_hang(ma_yeu_cau_mua);
CREATE INDEX IF NOT EXISTS idx_yeu_cau_mua_hang_npl ON yeu_cau_mua_hang(ma_nhu_cau_npl);
CREATE INDEX IF NOT EXISTS idx_chi_tiet_yeu_cau_mua_yc ON chi_tiet_yeu_cau_mua(ma_yeu_cau_mua_hang);
CREATE INDEX IF NOT EXISTS idx_chi_tiet_yeu_cau_mua_vat_tu ON chi_tiet_yeu_cau_mua(ma_vat_tu);
CREATE INDEX IF NOT EXISTS idx_don_mua_hang_ma ON don_mua_hang(ma_don_mua);
CREATE INDEX IF NOT EXISTS idx_don_mua_hang_ncc ON don_mua_hang(ma_nha_cung_cap);
CREATE INDEX IF NOT EXISTS idx_don_mua_hang_ycmh ON don_mua_hang(ma_yeu_cau_mua_hang);
CREATE INDEX IF NOT EXISTS idx_chi_tiet_don_mua_don ON chi_tiet_don_mua(ma_don_mua_hang);
CREATE INDEX IF NOT EXISTS idx_chi_tiet_don_mua_vat_tu ON chi_tiet_don_mua(ma_vat_tu);
CREATE INDEX IF NOT EXISTS idx_hoa_don_ncc_ma ON hoa_don_nha_cung_cap(ma_hoa_don_ncc);
CREATE INDEX IF NOT EXISTS idx_hoa_don_ncc_don_mua ON hoa_don_nha_cung_cap(ma_don_mua_hang);
CREATE INDEX IF NOT EXISTS idx_hoa_don_ncc_ncc ON hoa_don_nha_cung_cap(ma_nha_cung_cap);
CREATE INDEX IF NOT EXISTS idx_thanh_toan_ncc_hoa_don ON thanh_toan_ncc(ma_hoa_don_ncc);
CREATE INDEX IF NOT EXISTS idx_danh_gia_ncc_ncc ON danh_gia_ncc(ma_nha_cung_cap);

-- Indexes cho PH4 (Kho)
CREATE INDEX IF NOT EXISTS idx_vi_tri_kho_kho ON vi_tri_kho(ma_kho);
CREATE INDEX IF NOT EXISTS idx_lo_vat_tu_vat_tu ON lo_vat_tu(ma_vat_tu);
CREATE INDEX IF NOT EXISTS idx_lo_vat_tu_ncc ON lo_vat_tu(ma_nha_cung_cap);
CREATE INDEX IF NOT EXISTS idx_lo_vat_tu_vi_tri ON lo_vat_tu(ma_vi_tri_kho);
CREATE INDEX IF NOT EXISTS idx_ton_kho_kho ON ton_kho(ma_kho);
CREATE INDEX IF NOT EXISTS idx_ton_kho_vat_tu ON ton_kho(ma_vat_tu);
CREATE INDEX IF NOT EXISTS idx_phieu_nhap_kho_ma ON phieu_nhap_kho(ma_phieu_nhap);
CREATE INDEX IF NOT EXISTS idx_phieu_nhap_kho_don_mua ON phieu_nhap_kho(ma_don_mua_hang);
CREATE INDEX IF NOT EXISTS idx_phieu_nhap_kho_lenh_san_xuat ON phieu_nhap_kho(ma_lenh_san_xuat);
CREATE INDEX IF NOT EXISTS idx_phieu_nhap_kho_kho ON phieu_nhap_kho(ma_kho_nhap);
CREATE INDEX IF NOT EXISTS idx_chi_tiet_phieu_nhap_phieu ON chi_tiet_phieu_nhap(ma_phieu_nhap_kho);
CREATE INDEX IF NOT EXISTS idx_chi_tiet_phieu_nhap_vat_tu ON chi_tiet_phieu_nhap(ma_vat_tu);
CREATE INDEX IF NOT EXISTS idx_phieu_xuat_kho_ma ON phieu_xuat_kho(ma_phieu_xuat);
CREATE INDEX IF NOT EXISTS idx_phieu_xuat_kho_don_ban_hang ON phieu_xuat_kho(ma_don_ban_hang);
CREATE INDEX IF NOT EXISTS idx_phieu_xuat_kho_lenh_san_xuat ON phieu_xuat_kho(ma_lenh_san_xuat);
CREATE INDEX IF NOT EXISTS idx_phieu_xuat_kho_kho ON phieu_xuat_kho(ma_kho_xuat);
CREATE INDEX IF NOT EXISTS idx_chi_tiet_phieu_xuat_phieu ON chi_tiet_phieu_xuat(ma_phieu_xuat_kho);
CREATE INDEX IF NOT EXISTS idx_chi_tiet_phieu_xuat_vat_tu ON chi_tiet_phieu_xuat(ma_vat_tu);
CREATE INDEX IF NOT EXISTS idx_phieu_chuyen_kho_xuat ON phieu_chuyen_kho(ma_kho_xuat);
CREATE INDEX IF NOT EXISTS idx_phieu_chuyen_kho_nhap ON phieu_chuyen_kho(ma_kho_nhap);
CREATE INDEX IF NOT EXISTS idx_chi_tiet_chuyen_kho_phieu ON chi_tiet_chuyen_kho(ma_phieu_chuyen_kho);
CREATE INDEX IF NOT EXISTS idx_phieu_kiem_ke_kho ON phieu_kiem_ke(ma_kho);
CREATE INDEX IF NOT EXISTS idx_chi_tiet_kiem_ke_phieu ON chi_tiet_kiem_ke(ma_phieu_kiem_ke);

-- Indexes cho PH5 (Tài chính - Kế toán)
CREATE INDEX IF NOT EXISTS idx_tai_khoan_so ON he_thong_tai_khoan(so_tai_khoan);
CREATE INDEX IF NOT EXISTS idx_tai_khoan_cha ON he_thong_tai_khoan(tai_khoan_cha);
CREATE INDEX IF NOT EXISTS idx_chung_tu_goc_ma ON chung_tu_goc(ma_chung_tu);
CREATE INDEX IF NOT EXISTS idx_chung_tu_goc_loai ON chung_tu_goc(loai_chung_tu);
CREATE INDEX IF NOT EXISTS idx_nhat_ky_hach_toan_ma ON nhat_ky_hach_toan(ma_hach_toan);
CREATE INDEX IF NOT EXISTS idx_nhat_ky_hach_toan_chung_tu ON nhat_ky_hach_toan(ma_chung_tu_goc);
CREATE INDEX IF NOT EXISTS idx_nhat_ky_hach_toan_tk_no ON nhat_ky_hach_toan(tai_khoan_no);
CREATE INDEX IF NOT EXISTS idx_nhat_ky_hach_toan_tk_co ON nhat_ky_hach_toan(tai_khoan_co);
CREATE INDEX IF NOT EXISTS idx_cong_no_khach_hang ON cong_no(ma_khach_hang);
CREATE INDEX IF NOT EXISTS idx_cong_no_nha_cung_cap ON cong_no(ma_nha_cung_cap);
CREATE INDEX IF NOT EXISTS idx_cong_no_loai ON cong_no(loai_cong_no);
CREATE INDEX IF NOT EXISTS idx_gia_thanh_san_pham_san_pham ON gia_thanh_san_pham(ma_san_pham);
CREATE INDEX IF NOT EXISTS idx_gia_thanh_san_pham_lenh ON gia_thanh_san_pham(ma_lenh_san_xuat);
CREATE INDEX IF NOT EXISTS idx_bao_cao_tai_chinh_loai_ky ON bao_cao_tai_chinh(loai_bao_cao, ky_bao_cao);
