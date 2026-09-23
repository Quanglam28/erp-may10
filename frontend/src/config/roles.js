/**
 * ERP May 10 - Role Definitions & Metadata
 * Synchronized with PostgreSQL table: nguoi_dung
 */

export const ROLES = {
  ADMIN: 'admin',
  KHO: 'kho',
  BAN_HANG: 'ban_hang',
  SAN_XUAT: 'san_xuat',
  MUA_HANG: 'mua_hang',
  KE_TOAN: 'ke_toan',
  KE_TOAN_TRUONG: 'ke_toan_truong',
};

export const ROLE_DETAILS = {
  [ROLES.ADMIN]: {
    code: 'admin',
    name: 'Quản trị viên Hệ thống',
    shortName: 'Admin',
    department: 'Công nghệ thông tin (CNTT)',
    badgeColor: 'bg-red-100 text-red-800 border-red-200',
    description: 'Toàn quyền quản trị phân hệ, người dùng, vai trò và phê duyệt cấp cao nhất.',
    defaultUserId: 1,
    defaultEmail: 'admin@may10.vn',
    defaultFullName: 'Quản Trị Viên Hệ Thống',
  },
  [ROLES.BAN_HANG]: {
    code: 'ban_hang',
    name: 'Chuyên viên Bán hàng',
    shortName: 'Bán hàng',
    department: 'Phòng Kinh Doanh & Tiếp Thị',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Quản lý đơn đặt hàng B2B/B2C, hợp đồng thương mại và dữ liệu khách hàng.',
    defaultUserId: 2,
    defaultEmail: 'banhang@may10.vn',
    defaultFullName: 'Nguyễn Văn Bán',
  },
  [ROLES.SAN_XUAT]: {
    code: 'san_xuat',
    name: 'Kỹ sư Kế hoạch Sản xuất',
    shortName: 'Sản xuất',
    department: 'Phòng Kỹ Thuật & Quản Lý SX',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Lập lệnh sản xuất, định mức NPL (BOM), theo dõi chuyền may và tiến độ đơn hàng.',
    defaultUserId: 3,
    defaultEmail: 'sanxuat@may10.vn',
    defaultFullName: 'Trần Văn Xuất',
  },
  [ROLES.MUA_HANG]: {
    code: 'mua_hang',
    name: 'Chuyên viên Mua hàng & Cung ứng',
    shortName: 'Mua hàng',
    department: 'Phòng Cung Ứng & Vật Tư',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Theo dõi nhu cầu NPL, phát hành đơn mua hàng (PO) và quản lý nhà cung cấp.',
    defaultUserId: 4,
    defaultEmail: 'muahang@may10.vn',
    defaultFullName: 'Lê Thị Mua',
  },
  [ROLES.KHO]: {
    code: 'kho',
    name: 'Thủ kho May 10',
    shortName: 'Thủ kho',
    department: 'Kho Vận & Quản Lý Vật Tư',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Quản lý nhập xuất, tồn kho thực tế, sơ đồ vị trí kệ, lô vải và kiểm kê kho.',
    defaultUserId: 5,
    defaultEmail: 'kho@may10.vn',
    defaultFullName: 'Phạm Văn Kho',
  },
  [ROLES.KE_TOAN]: {
    code: 'ke_toan',
    name: 'Kế toán viên Kho & Giá thành',
    shortName: 'Kế toán',
    department: 'Phòng Tài Chính – Kế Toán',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    description: 'Hạch toán nhập xuất, theo dõi công nợ nhà cung cấp/khách hàng và tính giá thành.',
    defaultUserId: 6,
    defaultEmail: 'ketoan@may10.vn',
    defaultFullName: 'Hoàng Thị Toán',
  },
  [ROLES.KE_TOAN_TRUONG]: {
    code: 'ke_toan_truong',
    name: 'Kế toán trưởng Tập đoàn May 10',
    shortName: 'Kế toán trưởng',
    department: 'Phòng Tài Chính – Kế Toán',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'Kiểm soát phê duyệt chứng từ & sổ nhật ký, phân tích hiệu quả đơn hàng và lập báo cáo tài chính.',
    defaultUserId: 7,
    defaultEmail: 'ketoantruong@may10.vn',
    defaultFullName: 'Nguyễn Văn Trưởng',
  },
};

export const DEMO_ACCOUNTS = [
  { ...ROLE_DETAILS[ROLES.ADMIN], id: 1 },
  { ...ROLE_DETAILS[ROLES.BAN_HANG], id: 2 },
  { ...ROLE_DETAILS[ROLES.SAN_XUAT], id: 3 },
  { ...ROLE_DETAILS[ROLES.MUA_HANG], id: 4 },
  { ...ROLE_DETAILS[ROLES.KHO], id: 5 },
  { ...ROLE_DETAILS[ROLES.KE_TOAN], id: 6 },
  { ...ROLE_DETAILS[ROLES.KE_TOAN_TRUONG], id: 7 },
];
