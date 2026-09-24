-- =============================================================================
-- ERP MAY 10 — SEED DATA DỮ LIỆU MẪU (STEP 1)
-- =============================================================================

SET timezone = 'Asia/Ho_Chi_Minh';

-- 1. NGUOI_DUNG (Tối thiểu 6 người dùng cho 6 vai trò + 1 Kế toán trưởng PH5)
INSERT INTO nguoi_dung (id, ho_ten, email, mat_khau, so_dien_thoai, vai_tro, phong_ban, trang_thai) VALUES
(1, 'Quản Trị Viên Hệ Thống', 'admin@may10.vn', '$2b$12$e8YdC0zR/WJj8m9JmZ1V2.O7i3K9A3X9pTqI2y5Pz8d9yW3V1aB1e', '0901234567', 'admin', 'Công Nghệ Thông Tin', 'hoat_dong'),
(2, 'Nguyễn Văn Bán', 'banhang@may10.vn', '$2b$12$e8YdC0zR/WJj8m9JmZ1V2.O7i3K9A3X9pTqI2y5Pz8d9yW3V1aB1e', '0912345678', 'ban_hang', 'Phòng Kinh Doanh', 'hoat_dong'),
(3, 'Trần Văn Xuất', 'sanxuat@may10.vn', '$2b$12$e8YdC0zR/WJj8m9JmZ1V2.O7i3K9A3X9pTqI2y5Pz8d9yW3V1aB1e', '0923456789', 'san_xuat', 'Phòng Kỹ Thuật Sản Xuất', 'hoat_dong'),
(4, 'Lê Thị Mua', 'muahang@may10.vn', '$2b$12$e8YdC0zR/WJj8m9JmZ1V2.O7i3K9A3X9pTqI2y5Pz8d9yW3V1aB1e', '0934567890', 'mua_hang', 'Phòng Cung Ứng', 'hoat_dong'),
(5, 'Phạm Văn Kho', 'kho@may10.vn', '$2b$12$e8YdC0zR/WJj8m9JmZ1V2.O7i3K9A3X9pTqI2y5Pz8d9yW3V1aB1e', '0945678901', 'kho', 'Bộ Phận Kho Vận', 'hoat_dong'),
(6, 'Hoàng Thị Toán', 'ketoan@may10.vn', '$2b$12$e8YdC0zR/WJj8m9JmZ1V2.O7i3K9A3X9pTqI2y5Pz8d9yW3V1aB1e', '0956789012', 'ke_toan', 'Phòng Tài Chính Kế Toán', 'hoat_dong'),
(7, 'Nguyễn Văn Trưởng', 'ketoantruong@may10.vn', '$2b$12$e8YdC0zR/WJj8m9JmZ1V2.O7i3K9A3X9pTqI2y5Pz8d9yW3V1aB1e', '0967890122', 'ke_toan_truong', 'Phòng Tài Chính Kế Toán', 'hoat_dong')
ON CONFLICT (id) DO NOTHING;

SELECT setval('nguoi_dung_id_seq', (SELECT MAX(id) FROM nguoi_dung));

-- 2. DON_VI_TINH (Tối thiểu 2 đơn vị tính)
INSERT INTO don_vi_tinh (id, ma_don_vi, ten_don_vi, ghi_chu, trang_thai, nguoi_tao) VALUES
(1, 'cai', 'Cái', 'Đơn vị tính cho sản phẩm may mặc thành phẩm', 'hoat_dong', 1),
(2, 'met', 'Mét', 'Đơn vị tính chiều dài cho vải may', 'hoat_dong', 1),
(3, 'cuon', 'Cuộn', 'Đơn vị tính chỉ may', 'hoat_dong', 1),
(4, 'kg', 'Kilogram', 'Đơn vị tính khối lượng', 'hoat_dong', 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('don_vi_tinh_id_seq', (SELECT MAX(id) FROM don_vi_tinh));

-- 3. KHO (Tối thiểu 2 kho)
INSERT INTO kho (id, ma_kho, ten_kho, dia_chi, dien_tich, suc_chua, loai_kho, nguoi_quan_ly, trang_thai, nguoi_tao) VALUES
(1, 'KNL01', 'Kho Nguyên Phụ Liệu Số 1', 'Khu A - Tổng Công Ty May 10, Sài Đồng, Long Biên, Hà Nội', 1200.000, 50000.000, 'nguyen_lieu', 5, 'hoat_dong', 1),
(2, 'KTP01', 'Kho Thành Phẩm May 10', 'Khu B - Tổng Công Ty May 10, Sài Đồng, Long Biên, Hà Nội', 1500.000, 80000.000, 'thanh_pham', 5, 'hoat_dong', 1),
(3, 'KPL01', 'Kho Phụ Liệu May Mặc', 'Khu A2 - Tổng Công Ty May 10, Sài Đồng, Long Biên, Hà Nội', 600.000, 20000.000, 'vat_tu_phu', 5, 'hoat_dong', 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('kho_id_seq', (SELECT MAX(id) FROM kho));

-- 4. NHA_CUNG_CAP (Tối thiểu 2 nhà cung cấp)
INSERT INTO nha_cung_cap (id, ma_nha_cung_cap, ten_nha_cung_cap, ma_so_thue, so_gpkd, dia_chi, quoc_gia, nguoi_lien_he, so_dien_thoai, email, loai_hang_cung_cap, han_muc_tin_dung, so_ngay_gia_han, diem_danh_gia, trang_thai, nguoi_tao) VALUES
(1, 'NCC001', 'Công Ty Cổ Phần Dệt May Phong Phú', '0301456789', '0301456789-GP', 'Khu CN Phong Phú, TP. Thủ Đức, TP. Hồ Chí Minh', 'Viet Nam', 'Đỗ Mạnh Cường', '0283896012', 'sales@phongphu.com.vn', 'Vải dệt thoi, vải kate, poplin', 2000000000.00, 45, 9.2, 'hoat_dong', 4),
(2, 'NCC002', 'Công Ty TNHH Phụ Liệu May Thăng Long', '0105678901', '0105678901-GP', 'Cụm CN Duyên Thái, Thường Tín, Hà Nội', 'Viet Nam', 'Trịnh Thị Mai', '0243867123', 'contact@thanglongacc.vn', 'Chỉ may, cúc áo, mex, nhãn mác', 500000000.00, 30, 8.8, 'hoat_dong', 4)
ON CONFLICT (id) DO NOTHING;

SELECT setval('nha_cung_cap_id_seq', (SELECT MAX(id) FROM nha_cung_cap));

-- 5. SAN_PHAM (Tối thiểu 3 sản phẩm)
INSERT INTO san_pham (id, ma_san_pham, ten_san_pham, mo_ta, ma_don_vi_tinh, gia_ban, gia_von, thoi_gian_san_xuat, dinh_muc_vai, size, mau_sac, trang_thai, nguoi_tao) VALUES
(1, 'SP-SM-NAM-01', 'Áo Sơ Mi Nam Công Sở Dài Tay Trắng', 'Áo sơ mi nam cao cấp May 10, vải kate lụa chống nhăn', 1, 450000.00, 220000.00, 0.450, 1.650, 'L', 'Trắng', 'dang_ban', 2),
(2, 'SP-SM-NU-02', 'Áo Sơ Mi Nữ Tay Lỡ Xanh Pastel', 'Áo sơ mi nữ công sở cách điệu, thoáng mát', 1, 420000.00, 205000.00, 0.400, 1.450, 'M', 'Xanh Pastel', 'dang_ban', 2),
(3, 'SP-QT-NAM-03', 'Quần Tây Nam Slimfit Đen', 'Quần âu nam cao cấp chuẩn form tôn dáng', 1, 580000.00, 280000.00, 0.600, 1.350, '32', 'Đen', 'dang_ban', 2)
ON CONFLICT (id) DO NOTHING;

SELECT setval('san_pham_id_seq', (SELECT MAX(id) FROM san_pham));

-- 6. VAT_TU (Tối thiểu 3 vật tư)
INSERT INTO vat_tu (id, ma_vat_tu, ten_vat_tu, loai_vat_tu, ma_don_vi_tinh, quy_cach, muc_ton_toi_thieu, muc_ton_toi_da, gia_nhap_trung_binh, nha_cung_cap_chinh, trang_thai, nguoi_tao) VALUES
(1, 'VT-VAI-KATE-01', 'Vải Kate Lụa Trắng Khổ 1.5m', 'vai_chinh', 2, 'Khổ 1.5m, 100% Cotton CVC, màu trắng tinh', 500.000, 10000.000, 65000.00, 1, 'dang_su_dung', 4),
(2, 'VT-CHI-MAY-02', 'Chỉ May Poly 40/2 Trắng', 'chi_may', 3, 'Cuộn 5000m màu trắng', 50.000, 500.000, 28000.00, 2, 'dang_su_dung', 4),
(3, 'VT-CUC-AO-03', 'Cúc Nhựa 4 Lỗ 11mm Trắng Đục', 'cuc_kep', 1, 'Đường kính 11mm, chất liệu polyester cao cấp', 1000.000, 50000.000, 250.00, 2, 'dang_su_dung', 4),
(4, 'VT-VAI-XANH-04', 'Vải Chiffon Xanh Pastel Khổ 1.4m', 'vai_chinh', 2, 'Khổ 1.4m lụa mềm', 300.000, 8000.000, 72000.00, 1, 'dang_su_dung', 4)
ON CONFLICT (id) DO NOTHING;

SELECT setval('vat_tu_id_seq', (SELECT MAX(id) FROM vat_tu));

-- 7. KHACH_HANG (Tối thiểu 2 khách hàng)
INSERT INTO khach_hang (id, ma_khach_hang, ten_khach_hang, loai_khach_hang, ma_so_thue, so_dien_thoai, email, dia_chi, tinh_thanh_pho, nguoi_lien_he, han_muc_cong_no, so_ngay_cong_no, trang_thai, nguoi_tao) VALUES
(1, 'KH001', 'Công Ty Cổ Phần Thời Trang An Phước', 'to_chuc', '0302345678', '02838350059', 'purchase@anphuoc.com.vn', '100/11-12 An Dương Vương, P.9, Q.5', 'TP. Hồ Chí Minh', 'Nguyễn Thị Hồng', 1500000000.00, 45, 'hoat_dong', 2),
(2, 'KH002', 'Đại Lý Phân Phối Thời Trang Miền Bắc Viettien Mart', 'dai_ly', '0101239876', '02437689999', 'hangpt@viettienmart.vn', '45 Tràng Tiền, Hoàn Kiếm', 'Hà Nội', 'Phan Thanh Hằng', 800000000.00, 30, 'hoat_dong', 2)
ON CONFLICT (id) DO NOTHING;

SELECT setval('khach_hang_id_seq', (SELECT MAX(id) FROM khach_hang));

-- 8. DON_BAN_HANG (Tối thiểu 2 đơn bán)
INSERT INTO don_ban_hang (id, ma_don_ban, ma_khach_hang, ngay_dat_hang, ngay_giao_hang_yc, ngay_giao_thuc_te, dia_chi_giao_hang, tong_tien_hang, tien_thue, tien_giam_gia, tong_thanh_toan, nguoi_ban, trang_thai, ghi_chu, nguoi_tao) VALUES
(1, 'DBH-2026-001', 1, NOW() - INTERVAL '10 days', NOW() + INTERVAL '15 days', NULL, 'Kho An Phước - 100 An Dương Vương, Q.5, TP.HCM', 450000000.00, 36000000.00, 10000000.00, 476000000.00, 2, 'dang_san_xuat', 'Đơn hàng đồng phục sơ mi nam cao cấp quý 3', 2),
(2, 'DBH-2026-002', 2, NOW() - INTERVAL '5 days', NOW() + INTERVAL '20 days', NULL, 'Kho Viettien Mart - 45 Tràng Tiền, Hoàn Kiếm, HN', 210000000.00, 16800000.00, 5000000.00, 221800000.00, 2, 'cho_xac_nhan', 'Đơn hàng sơ mi nữ xanh pastel bổ sung đại lý', 2)
ON CONFLICT (id) DO NOTHING;

SELECT setval('don_ban_hang_id_seq', (SELECT MAX(id) FROM don_ban_hang));

-- 9. CHI_TIET_DON_BAN_HANG (Tối thiểu 2 chi tiết)
INSERT INTO chi_tiet_don_ban_hang (id, ma_don_ban_hang, ma_san_pham, so_luong, don_gia, ty_le_giam_gia, thanh_tien, so_luong_giao, trang_thai, nguoi_tao) VALUES
(1, 1, 1, 1000.000, 450000.00, 2.22, 440000000.00, 0.000, 'chua_giao', 2),
(2, 2, 2, 500.000, 420000.00, 2.38, 205000000.00, 0.000, 'chua_giao', 2)
ON CONFLICT (id) DO NOTHING;

SELECT setval('chi_tiet_don_ban_hang_id_seq', (SELECT MAX(id) FROM chi_tiet_don_ban_hang));

-- 10. GIAO_HANG
INSERT INTO giao_hang (id, ma_giao_hang, ma_don_ban_hang, ma_kho, ngay_giao, ten_nguoi_nhan, dia_chi_giao, phuong_tien_van_chuyen, nguoi_giao_hang, trang_thai, nguoi_tao) VALUES
(1, 'GH-2026-001', 1, 2, NOW() + INTERVAL '10 days', 'Nguyễn Thị Hồng', 'Kho An Phước, Q.5, TP.HCM', 'Xe tải thùng kín 5 tấn', 5, 'cho_giao', 2)
ON CONFLICT (id) DO NOTHING;

SELECT setval('giao_hang_id_seq', (SELECT MAX(id) FROM giao_hang));

-- 11. HOA_DON_BAN_HANG
INSERT INTO hoa_don_ban_hang (id, ma_hoa_don, ma_don_ban_hang, ma_khach_hang, ngay_xuat_hoa_don, ngay_dao_han, tong_tien_truoc_thue, tien_thue, tong_tien_sau_thue, so_tien_da_thu, trang_thai, ghi_chu, nguoi_tao) VALUES
(1, 'HDBH-2026-001', 1, 1, NOW() - INTERVAL '2 days', NOW() + INTERVAL '43 days', 440000000.00, 35200000.00, 475200000.00, 100000000.00, 'thanh_toan_mot_phan', 'Đã tạm ứng đợt 1', 6)
ON CONFLICT (id) DO NOTHING;

SELECT setval('hoa_don_ban_hang_id_seq', (SELECT MAX(id) FROM hoa_don_ban_hang));

-- 12. KE_HOACH_SAN_XUAT (Tối thiểu 2 KHSX)
INSERT INTO ke_hoach_san_xuat (id, ma_ke_hoach, ma_don_ban_hang, ma_san_pham, so_luong_ke_hoach, ngay_bat_dau, ngay_ket_thuc, nguoi_lap_ke_hoach, ghi_chu, trang_thai, nguoi_tao) VALUES
(1, 'KHSX-2026-001', 1, 1, 1000.000, NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days', 3, 'Kế hoạch sản xuất 1.000 áo sơ mi nam theo đơn DBH-2026-001', 'dang_thuc_hien', 3),
(2, 'KHSX-2026-002', 2, 2, 500.000, NOW() - INTERVAL '2 days', NOW() + INTERVAL '12 days', 3, 'Kế hoạch sản xuất 500 áo sơ mi nữ theo đơn DBH-2026-002', 'da_duyet', 3)
ON CONFLICT (id) DO NOTHING;

SELECT setval('ke_hoach_san_xuat_id_seq', (SELECT MAX(id) FROM ke_hoach_san_xuat));

-- 13. DINH_MUC_NGUYEN_LIEU (BOM)
INSERT INTO dinh_muc_nguyen_lieu (id, ma_san_pham, ma_vat_tu, dinh_muc, ty_le_hao_hut, dinh_muc_thuc_te, phien_ban, ghi_chu, trang_thai, nguoi_tao) VALUES
(1, 1, 1, 1.650, 3.00, 1.700, '1.0', 'Định mức vải kate lụa cho sơ mi nam tay dài', 'hieu_luc', 3),
(2, 1, 2, 0.050, 2.00, 0.051, '1.0', 'Chỉ may poly cho 1 áo', 'hieu_luc', 3),
(3, 1, 3, 8.000, 2.50, 8.200, '1.0', '8 cúc áo chính + 2 cúc phụ', 'hieu_luc', 3)
ON CONFLICT (id) DO NOTHING;

SELECT setval('dinh_muc_nguyen_lieu_id_seq', (SELECT MAX(id) FROM dinh_muc_nguyen_lieu));

-- 14. LENH_SAN_XUAT (Tối thiểu 2 LSX)
INSERT INTO lenh_san_xuat (id, ma_lenh_san_xuat, ma_ke_hoach_san_xuat, ma_don_ban_hang, ma_san_pham, so_luong_yeu_cau, so_luong_hoan_thanh, ngay_bat_dau, ngay_ket_thuc_yc, ngay_hoan_thanh, nguoi_phu_trach, ghi_chu, trang_thai, nguoi_tao) VALUES
(1, 'LSX-2026-001', 1, 1, 1, 1000.000, 600.000, NOW() - INTERVAL '6 days', NOW() + INTERVAL '5 days', NULL, 3, 'Lệnh sản xuất chuyền 1 xưởng may Sài Đồng', 'dang_san_xuat', 3),
(2, 'LSX-2026-002', 2, 2, 2, 500.000, 0.000, NOW() + INTERVAL '1 day', NOW() + INTERVAL '10 days', NULL, 3, 'Lệnh sản xuất chuyền 2 xưởng may Sài Đồng', 'chua_bat_dau', 3)
ON CONFLICT (id) DO NOTHING;

SELECT setval('lenh_san_xuat_id_seq', (SELECT MAX(id) FROM lenh_san_xuat));

-- 15. CONG_DOAN_SAN_XUAT
INSERT INTO cong_doan_san_xuat (id, ma_lenh_san_xuat, ten_cong_doan, so_thu_tu, thoi_gian_chuan, so_cong_nhan, ngay_bat_dau, ngay_ket_thuc, nguoi_phu_trach, trang_thai, nguoi_tao) VALUES
(1, 1, 'Trải và Cắt vải tự động CNC', 1, 4.000, 3, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', 3, 'hoan_thanh', 3),
(2, 1, 'Ráp thân và tay áo', 2, 18.000, 15, NOW() - INTERVAL '3 days', NULL, 3, 'dang_thuc_hien', 3),
(3, 1, 'May cổ và măng sét', 3, 12.000, 8, NOW() - INTERVAL '2 days', NULL, 3, 'dang_thuc_hien', 3),
(4, 1, 'Đính cúc, thùa khuyết và là ủi hoàn thiện', 4, 8.000, 6, NULL, NULL, 3, 'cho_thuc_hien', 3)
ON CONFLICT (id) DO NOTHING;

SELECT setval('cong_doan_san_xuat_id_seq', (SELECT MAX(id) FROM cong_doan_san_xuat));

-- 16. YEU_CAU_MUA_HANG (PH3)
INSERT INTO yeu_cau_mua_hang (id, ma_yeu_cau_mua, nguon_yeu_cau, ma_nhu_cau_npl, ngay_yeu_cau, nguoi_yeu_cau, nguoi_phe_duyet, ngay_phe_duyet, ghi_chu, trang_thai, nguoi_tao) VALUES
(1, 'YCMH-2026-001', 'san_xuat', NULL, NOW() - INTERVAL '12 days', 3, 1, NOW() - INTERVAL '11 days', 'Yêu cầu mua vải kate lụa cho KHSX áo sơ mi nam', 'da_tao_don', 3),
(2, 'YCMH-2026-002', 'kho', NULL, NOW() - INTERVAL '8 days', 5, 1, NOW() - INTERVAL '7 days', 'Bổ sung dự trữ cúc và chỉ may kho phụ liệu', 'da_duyet', 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('yeu_cau_mua_hang_id_seq', (SELECT MAX(id) FROM yeu_cau_mua_hang));

-- 17. NHU_CAU_NPL (MRP)
INSERT INTO nhu_cau_npl (id, ma_ke_hoach_san_xuat, ma_vat_tu, so_luong_can, so_luong_ton_kho, so_luong_can_mua, ngay_can, da_tao_yeu_cau_mua, ma_yeu_cau_mua_hang, ghi_chu, nguoi_tao) VALUES
(1, 1, 1, 1700.000, 200.000, 1500.000, NOW() - INTERVAL '8 days', 'da_tao', 1, 'Cần mua thêm 1500m vải kate trắng', 3)
ON CONFLICT (id) DO NOTHING;

SELECT setval('nhu_cau_npl_id_seq', (SELECT MAX(id) FROM nhu_cau_npl));

UPDATE yeu_cau_mua_hang SET ma_nhu_cau_npl = 1 WHERE id = 1;

-- 18. CHI_TIET_YEU_CAU_MUA
INSERT INTO chi_tiet_yeu_cau_mua (id, ma_yeu_cau_mua_hang, ma_vat_tu, so_luong_yeu_cau, don_gia_du_kien, ngay_can_giao, ma_kho_nhap, ghi_chu, nguoi_tao) VALUES
(1, 1, 1, 1500.000, 65000.00, NOW() - INTERVAL '6 days', 1, 'Vải trắng kate lụa nguyên cây', 4),
(2, 2, 2, 100.000, 28000.00, NOW() + INTERVAL '3 days', 3, 'Chỉ cuộn trắng', 4)
ON CONFLICT (id) DO NOTHING;

SELECT setval('chi_tiet_yeu_cau_mua_id_seq', (SELECT MAX(id) FROM chi_tiet_yeu_cau_mua));

-- 19. DON_MUA_HANG (Tối thiểu 2 đơn mua)
INSERT INTO don_mua_hang (id, ma_don_mua, ma_nha_cung_cap, ma_yeu_cau_mua_hang, ngay_dat_hang, ngay_giao_hang_yc, tong_tien_hang, tien_thue, tong_thanh_toan, dieu_kien_thanh_toan, nguoi_dat_hang, ghi_chu, trang_thai, nguoi_tao) VALUES
(1, 'DMH-2026-001', 1, 1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '4 days', 97500000.00, 7800000.00, 105300000.00, 'Thanh toán sau khi nhận hàng 30 ngày', 4, 'Đơn mua vải từ Phong Phú', 'da_nhap_kho', 4),
(2, 'DMH-2026-002', 2, 2, NOW() - INTERVAL '6 days', NOW() + INTERVAL '4 days', 15300000.00, 1224000.00, 16524000.00, 'Thanh toán tiền mặt hoặc chuyển khoản ngay', 4, 'Đơn mua phụ liệu chỉ may và cúc áo', 'da_xac_nhan', 4)
ON CONFLICT (id) DO NOTHING;

SELECT setval('don_mua_hang_id_seq', (SELECT MAX(id) FROM don_mua_hang));

-- 20. CHI_TIET_DON_MUA (Tối thiểu 2 chi tiết)
INSERT INTO chi_tiet_don_mua (id, ma_don_mua_hang, ma_vat_tu, so_luong_dat, don_gia, thanh_tien, so_luong_da_nhap, ghi_chu, nguoi_tao) VALUES
(1, 1, 1, 1500.000, 65000.00, 97500000.00, 1500.000, 'Đã nhập đủ 1.500m vải', 4),
(2, 2, 2, 100.000, 28000.00, 2800000.00, 0.000, 'Chờ giao hàng', 4)
ON CONFLICT (id) DO NOTHING;

SELECT setval('chi_tiet_don_mua_id_seq', (SELECT MAX(id) FROM chi_tiet_don_mua));

-- 21. HOA_DON_NHA_CUNG_CAP
INSERT INTO hoa_don_nha_cung_cap (id, ma_hoa_don_ncc, ma_don_mua_hang, ma_nha_cung_cap, so_hoa_don_ncc, ngay_hoa_don, ngay_dao_han, tong_tien_truoc_thue, tien_thue, tong_thanh_toan, so_tien_da_tra, trang_thai, nguoi_tao) VALUES
(1, 'HDNCC-2026-001', 1, 1, 'VAT-PP-00892', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', 97500000.00, 7800000.00, 105300000.00, 105300000.00, 'da_thanh_toan', 4)
ON CONFLICT (id) DO NOTHING;

SELECT setval('hoa_don_nha_cung_cap_id_seq', (SELECT MAX(id) FROM hoa_don_nha_cung_cap));

-- 22. THANH_TOAN_NCC
INSERT INTO thanh_toan_ncc (id, ma_thanh_toan_ncc, ma_hoa_don_ncc, so_tien_thanh_toan, ngay_thanh_toan, hinh_thuc_thanh_toan, so_tham_chieu, nguoi_thanh_toan, ghi_chu, trang_thai, nguoi_tao) VALUES
(1, 'TTNCC-2026-001', 1, 105300000.00, NOW() - INTERVAL '3 days', 'chuyen_khoan', 'UNC-VCB-20260901', 6, 'Ủy nhiệm chi Vietcombank chuyển trả Phong Phú', 'da_thanh_toan', 6)
ON CONFLICT (id) DO NOTHING;

SELECT setval('thanh_toan_ncc_id_seq', (SELECT MAX(id) FROM thanh_toan_ncc));

-- 23. DANH_GIA_NCC
INSERT INTO danh_gia_ncc (id, ma_nha_cung_cap, ky_danh_gia, diem_chat_luong, diem_giao_hang, diem_gia_ca, diem_tong_hop, nhan_xet, nguoi_danh_gia, ngay_danh_gia, nguoi_tao) VALUES
(1, 1, 'Q2/2026', 9.5, 9.0, 9.0, 9.2, 'Nhà cung cấp uy tín, vải đạt tiêu chuẩn xuất khẩu', 4, NOW() - INTERVAL '30 days', 4),
(2, 2, 'Q2/2026', 8.5, 9.0, 9.0, 8.8, 'Giao hàng đúng tiến độ, hỗ trợ đổi trả tốt', 4, NOW() - INTERVAL '30 days', 4)
ON CONFLICT (id) DO NOTHING;

SELECT setval('danh_gia_ncc_id_seq', (SELECT MAX(id) FROM danh_gia_ncc));

-- 24. VI_TRI_KHO (PH4)
INSERT INTO vi_tri_kho (id, ma_kho, ma_vi_tri, ten_vi_tri, khu_vuc, tang, suc_chua_toi_da, trang_thai, nguoi_tao) VALUES
(1, 1, 'KNL01-A-01', 'Kệ Vải A - Tầng 1', 'Khu A', '1', 5000.000, 'co_hang', 5),
(2, 1, 'KNL01-A-02', 'Kệ Vải A - Tầng 2', 'Khu A', '2', 5000.000, 'trong', 5),
(3, 2, 'KTP01-B-01', 'Kệ Sơ Mi Nam - Dãy B', 'Khu B', '1', 8000.000, 'co_hang', 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('vi_tri_kho_id_seq', (SELECT MAX(id) FROM vi_tri_kho));

-- 25. LO_VAT_TU
INSERT INTO lo_vat_tu (id, ma_lo, ma_vat_tu, ma_nha_cung_cap, ma_don_mua_hang, ngay_san_xuat, han_su_dung, so_luong_nhap, so_luong_hien_tai, don_gia_nhap, ma_vi_tri_kho, trang_thai, nguoi_tao) VALUES
(1, 'LO-VAI-2026-001', 1, 1, 1, NOW() - INTERVAL '15 days', NOW() + INTERVAL '730 days', 1500.000, 1500.000, 65000.00, 1, 'binh_thuong', 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('lo_vat_tu_id_seq', (SELECT MAX(id) FROM lo_vat_tu));

-- 26. TON_KHO
INSERT INTO ton_kho (id, ma_kho, ma_vat_tu, so_luong_ton, don_vi_tinh, gia_tri_ton_kho, ngay_cap_nhat, nguoi_cap_nhat) VALUES
(1, 1, 1, 1500.000, 2, 97500000.00, NOW(), 5),
(2, 3, 2, 200.000, 3, 5600000.00, NOW(), 5),
(3, 3, 3, 15000.000, 1, 3750000.00, NOW(), 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('ton_kho_id_seq', (SELECT MAX(id) FROM ton_kho));

-- 27. PHIEU_NHAP_KHO (Tối thiểu 1 phiếu nhập kho)
INSERT INTO phieu_nhap_kho (id, ma_phieu_nhap, loai_nhap, ma_don_mua_hang, ma_lenh_san_xuat, ma_kho_nhap, ngay_nhap, thu_kho, nguoi_giao_hang, tong_gia_tri_nhap, ghi_chu, trang_thai, nguoi_tao) VALUES
(1, 'PNK-2026-001', 'tu_mua_hang', 1, NULL, 1, NOW() - INTERVAL '4 days', 5, 'Đỗ Mạnh Cường (Phong Phú)', 97500000.00, 'Nhập kho 15 cây vải kate lụa từ đơn mua DMH-2026-001', 'da_nhap', 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('phieu_nhap_kho_id_seq', (SELECT MAX(id) FROM phieu_nhap_kho));

-- 28. CHI_TIET_PHIEU_NHAP
INSERT INTO chi_tiet_phieu_nhap (id, ma_phieu_nhap_kho, ma_vat_tu, ma_lo_vat_tu, so_luong_nhap, don_gia_nhap, thanh_tien, ma_vi_tri_kho, ghi_chu, nguoi_tao) VALUES
(1, 1, 1, 1, 1500.000, 65000.00, 97500000.00, 1, 'Vải kiểm tra đạt tiêu chuẩn bề mặt, độ co dãn', 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('chi_tiet_phieu_nhap_id_seq', (SELECT MAX(id) FROM chi_tiet_phieu_nhap));

-- 29. PHIEU_XUAT_KHO (Tối thiểu 1 phiếu xuất kho)
INSERT INTO phieu_xuat_kho (id, ma_phieu_xuat, loai_xuat, ma_don_ban_hang, ma_lenh_san_xuat, ma_kho_xuat, ngay_xuat, thu_kho, nguoi_nhan, tong_gia_tri_xuat, ghi_chu, trang_thai, nguoi_tao) VALUES
(1, 'PXK-2026-001', 'xuat_san_xuat', NULL, 1, 1, NOW() - INTERVAL '3 days', 5, 'Trần Văn Xuất (Xưởng may)', 55250000.00, 'Xuất 850m vải kate lụa phục vụ LSX-2026-001 đợt 1', 'da_xuat', 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('phieu_xuat_kho_id_seq', (SELECT MAX(id) FROM phieu_xuat_kho));

-- 30. CHI_TIET_PHIEU_XUAT
INSERT INTO chi_tiet_phieu_xuat (id, ma_phieu_xuat_kho, ma_vat_tu, ma_lo_vat_tu, so_luong_xuat, don_gia_xuat, thanh_tien, ghi_chu, nguoi_tao) VALUES
(1, 1, 1, 1, 850.000, 65000.00, 55250000.00, 'Xuất theo phiếu lĩnh vật tư xưởng cắt', 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('chi_tiet_phieu_xuat_id_seq', (SELECT MAX(id) FROM chi_tiet_phieu_xuat));

-- 31. PHIEU_CHUYEN_KHO
INSERT INTO phieu_chuyen_kho (id, ma_phieu_chuyen, ma_kho_xuat, ma_kho_nhap, ngay_chuyen, nguoi_chuyen, ly_do, trang_thai, nguoi_tao) VALUES
(1, 'PCK-2026-001', 1, 3, NOW() - INTERVAL '2 days', 5, 'Điều chuyển phụ liệu sang kho A2 dự phòng', 'da_chuyen', 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('phieu_chuyen_kho_id_seq', (SELECT MAX(id) FROM phieu_chuyen_kho));

-- 32. CHI_TIET_CHUYEN_KHO
INSERT INTO chi_tiet_chuyen_kho (id, ma_phieu_chuyen_kho, ma_vat_tu, so_luong_chuyen, don_gia, ghi_chu, nguoi_tao) VALUES
(1, 1, 2, 20.000, 28000.00, 'Chuyển 20 cuộn chỉ sang kho KPL01', 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('chi_tiet_chuyen_kho_id_seq', (SELECT MAX(id) FROM chi_tiet_chuyen_kho));

-- 33. PHIEU_KIEM_KE
INSERT INTO phieu_kiem_ke (id, ma_phieu_kiem_ke, ma_kho, ky_kiem_ke, ngay_kiem_ke, truong_kiem_ke, ghi_chu, trang_thai, nguoi_tao) VALUES
(1, 'PKK-2026-001', 1, 'Thang08/2026', NOW() - INTERVAL '10 days', 5, 'Kiểm kê định kỳ tháng 8 kho nguyên phụ liệu', 'hoan_thanh', 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('phieu_kiem_ke_id_seq', (SELECT MAX(id) FROM phieu_kiem_ke));

-- 34. CHI_TIET_KIEM_KE
INSERT INTO chi_tiet_kiem_ke (id, ma_phieu_kiem_ke, ma_vat_tu, so_luong_so_sach, so_luong_thuc_te, chenh_lech, gia_tri_chenh_lech, nguyen_nhan, da_dieu_chinh, nguoi_tao) VALUES
(1, 1, 1, 1500.000, 1500.000, 0.000, 0.00, 'Khớp sổ sách 100%', 'da_dieu_chinh', 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('chi_tiet_kiem_ke_id_seq', (SELECT MAX(id) FROM chi_tiet_kiem_ke));

-- 35. KET_QUA_SAN_XUAT (PH2)
INSERT INTO ket_qua_san_xuat (id, ma_lenh_san_xuat, ngay_bao_cao, so_luong_hoan_thanh, so_luong_loi, so_luong_tai_che, nhan_cong_thuc_te, ma_phieu_nhap_kho, ghi_chu, nguoi_bao_cao, nguoi_tao) VALUES
(1, 1, NOW() - INTERVAL '1 day', 600.000, 5.000, 3.000, 240.000, NULL, 'Báo cáo ca 1 + ca 2 ngày hôm qua, 600 áo đạt chuẩn', 3, 3)
ON CONFLICT (id) DO NOTHING;

SELECT setval('ket_qua_san_xuat_id_seq', (SELECT MAX(id) FROM ket_qua_san_xuat));

-- 36. HE_THONG_TAI_KHOAN (PH5)
INSERT INTO he_thong_tai_khoan (id, so_tai_khoan, ten_tai_khoan, loai_tai_khoan, tai_khoan_cha, cap_tai_khoan, cho_phep_hach_toan, ghi_chu, trang_thai, nguoi_tao) VALUES
(1, '111', 'Tiền mặt', 'tai_san', NULL, 1, 'khong', 'Tài khoản tổng hợp tiền mặt', 'hoat_dong', 6),
(2, '1111', 'Tiền Việt Nam', 'tai_san', 1, 2, 'co', 'Tiền mặt VND tại quỹ', 'hoat_dong', 6),
(3, '112', 'Tiền gửi ngân hàng', 'tai_san', NULL, 1, 'khong', 'Tài khoản tổng hợp TGNH', 'hoat_dong', 6),
(4, '1121', 'Tiền gửi VND - Vietcombank', 'tai_san', 3, 2, 'co', 'Tài khoản thanh toán VCB', 'hoat_dong', 6),
(5, '131', 'Phải thu của khách hàng', 'tai_san', NULL, 1, 'co', 'Công nợ phải thu bán hàng', 'hoat_dong', 6),
(6, '152', 'Nguyên liệu, vật liệu', 'tai_san', NULL, 1, 'co', 'Hàng tồn kho nguyên phụ liệu', 'hoat_dong', 6),
(7, '155', 'Thành phẩm', 'tai_san', NULL, 1, 'co', 'Thành phẩm may mặc tại kho', 'hoat_dong', 6),
(8, '154', 'Chi phí sản xuất, kinh doanh dở dang', 'tai_san', NULL, 1, 'co', 'Chi phí tập hợp sản xuất', 'hoat_dong', 6),
(9, '331', 'Phải trả cho người bán', 'no_phai_tra', NULL, 1, 'co', 'Công nợ phải trả NCC', 'hoat_dong', 6),
(10, '511', 'Doanh thu bán hàng và cung cấp dịch vụ', 'doanh_thu', NULL, 1, 'co', 'Doanh thu thuần', 'hoat_dong', 6),
(11, '632', 'Giá vốn hàng bán', 'chi_phi', NULL, 1, 'co', 'Giá vốn sản phẩm xuất bán', 'hoat_dong', 6)
ON CONFLICT (id) DO NOTHING;

SELECT setval('he_thong_tai_khoan_id_seq', (SELECT MAX(id) FROM he_thong_tai_khoan));

-- 37. CHUNG_TU_GOC (Tối thiểu 1 chứng từ gốc)
INSERT INTO chung_tu_goc (id, ma_chung_tu, loai_chung_tu, ma_chung_tu_lien_quan, bang_chung_tu_lien_quan, ngay_chung_tu, so_tien, mo_ta, trang_thai, nguoi_tao) VALUES
(1, 'CTG-2026-001', 'phieu_nhap_xuat_kho', 1, 'phieu_nhap_kho', NOW() - INTERVAL '4 days', 97500000.00, 'Chứng từ nhập kho vải kate lụa từ đơn mua DMH-2026-001', 'hieu_luc', 6),
(2, 'CTG-2026-002', 'hoa_don_ban', 1, 'hoa_don_ban_hang', NOW() - INTERVAL '2 days', 475200000.00, 'Chứng từ xuất hóa đơn bán hàng cho An Phước', 'hieu_luc', 6)
ON CONFLICT (id) DO NOTHING;

SELECT setval('chung_tu_goc_id_seq', (SELECT MAX(id) FROM chung_tu_goc));

-- 38. NHAT_KY_HACH_TOAN (Tối thiểu 1 bút toán hạch toán)
INSERT INTO nhat_ky_hach_toan (id, ma_hach_toan, ma_chung_tu_goc, ngay_hach_toan, tai_khoan_no, tai_khoan_co, so_tien, mo_ta, ky_ke_toan, nguoi_hach_toan, nguoi_phe_duyet, trang_thai, nguoi_tao) VALUES
(1, 'BT-2026-001', 1, NOW() - INTERVAL '4 days', 6, 9, 97500000.00, 'Hạch toán Nợ 152 / Có 331 tiền mua vải kate lụa nhập kho', '09/2026', 6, 1, 'da_hach_toan', 6),
(2, 'BT-2026-002', 2, NOW() - INTERVAL '2 days', 5, 10, 440000000.00, 'Hạch toán Nợ 131 / Có 511 doanh thu bán áo sơ mi nam An Phước', '09/2026', 6, 1, 'da_hach_toan', 6)
ON CONFLICT (id) DO NOTHING;

SELECT setval('nhat_ky_hach_toan_id_seq', (SELECT MAX(id) FROM nhat_ky_hach_toan));

-- 39. CONG_NO (Tối thiểu 1 bản ghi công nợ)
INSERT INTO cong_no (id, loai_cong_no, ma_khach_hang, ma_nha_cung_cap, ma_hoa_don, bang_hoa_don, so_tien_phat_sinh, so_tien_da_thanh_toan, so_tien_con_lai, ngay_dao_han, trang_thai, nguoi_tao) VALUES
(1, 'phai_thu', 1, NULL, 1, 'hoa_don_ban_hang', 475200000.00, 100000000.00, 375200000.00, NOW() + INTERVAL '43 days', 'mot_phan', 6),
(2, 'phai_tra', NULL, 1, 1, 'hoa_don_nha_cung_cap', 105300000.00, 105300000.00, 0.00, NOW() + INTERVAL '25 days', 'da_thanh_toan', 6)
ON CONFLICT (id) DO NOTHING;

SELECT setval('cong_no_id_seq', (SELECT MAX(id) FROM cong_no));

-- 40. BAO_CAO_TAI_CHINH
INSERT INTO bao_cao_tai_chinh (id, loai_bao_cao, ky_bao_cao, ngay_lap_bao_cao, tong_tai_san, tong_no_phai_tra, von_chu_so_huu, doanh_thu_thuan, gia_von_hang_ban, loi_nhuan_truoc_thue, loi_nhuan_sau_thue, nguoi_lap, nguoi_phe_duyet, trang_thai, nguoi_tao) VALUES
(1, 'ket_qua_kinh_doanh', 'Q2/2026', NOW() - INTERVAL '15 days', NULL, NULL, NULL, 12500000000.00, 8200000000.00, 4300000000.00, 3440000000.00, 6, 1, 'da_phe_duyet', 6)
ON CONFLICT (id) DO NOTHING;

SELECT setval('bao_cao_tai_chinh_id_seq', (SELECT MAX(id) FROM bao_cao_tai_chinh));

-- 41. GIA_THANH_SAN_PHAM (Tối thiểu 1 bản ghi giá thành)
INSERT INTO gia_thanh_san_pham (id, ma_san_pham, ma_lenh_san_xuat, ky_tinh_gia_thanh, so_luong_san_xuat, chi_phi_vat_lieu_truc_tiep, chi_phi_nhan_cong_truc_tiep, chi_phi_san_xuat_chung, tong_chi_phi, gia_thanh_don_vi, gia_ban_de_nghi, ghi_chu, nguoi_tinh, trang_thai, nguoi_tao) VALUES
(1, 1, 1, 'Thang09/2026', 1000.000, 110500000.00, 65000000.00, 44500000.00, 220000000.00, 220000.00, 450000.00, 'Giá thành định mức lệnh sản xuất LSX-2026-001 (áo sơ mi nam)', 6, 'da_duyet', 6)
ON CONFLICT (id) DO NOTHING;

SELECT setval('gia_thanh_san_pham_id_seq', (SELECT MAX(id) FROM gia_thanh_san_pham));
