/**
 * ERP May 10 - Canonical Role Adapter & Permission Matrix
 * Synchronized across Backend, Frontend, and Database (nguoi_dung)
 */

// 1. CANONICAL ROLES (Chuẩn hóa các vai trò chính thức tiếng Việt theo RBAC Contract)
const CANONICAL_ROLES = {
  ADMIN: 'admin',
  KHO: 'kho',
  BAN_HANG: 'ban_hang',
  SAN_XUAT: 'san_xuat',
  MUA_HANG: 'mua_hang',
  KE_TOAN: 'ke_toan',
  KE_TOAN_TRUONG: 'ke_toan_truong',

  // Adapter tương thích nội bộ (Internal Security Adapter Compatibility)
  WAREHOUSE: 'kho',
  SALES: 'ban_hang',
  PRODUCTION: 'san_xuat',
  PURCHASING: 'mua_hang',
  ACCOUNTING: 'ke_toan',
  CHIEF_ACCOUNTANT: 'ke_toan_truong',
};

// 2. DICTIONARY MAPPING (Hỗ trợ chuẩn hóa mọi định dạng về các vai trò tiếng Việt)
const ROLE_MAPPING = {
  // Admin
  'admin': 'admin',
  'ADMIN': 'admin',

  // Phân hệ PH4: Kho & Quản lý vật tư
  'kho': 'kho',
  'KHO': 'kho',
  'warehouse': 'kho',
  'WAREHOUSE': 'kho',
  'warehouse_manager': 'kho',
  'WAREHOUSE_MANAGER': 'kho',
  'quan_ly_kho': 'kho',

  // Phân hệ PH1: Bán hàng
  'ban_hang': 'ban_hang',
  'BAN_HANG': 'ban_hang',
  'sales': 'ban_hang',
  'SALES': 'ban_hang',

  // Phân hệ PH2: Sản xuất & Nhu cầu NPL
  'san_xuat': 'san_xuat',
  'SAN_XUAT': 'san_xuat',
  'production': 'san_xuat',
  'PRODUCTION': 'san_xuat',

  // Phân hệ PH3: Mua hàng & NCC
  'mua_hang': 'mua_hang',
  'MUA_HANG': 'mua_hang',
  'purchasing': 'mua_hang',
  'PURCHASING': 'mua_hang',

  // Phân hệ PH5: Tài chính - Kế toán (Kế toán viên)
  'ke_toan': 'ke_toan',
  'KE_TOAN': 'ke_toan',
  'accounting': 'ke_toan',
  'ACCOUNTING': 'ke_toan',

  // Phân hệ PH5: Kế toán trưởng (Chief Accountant)
  'ke_toan_truong': 'ke_toan_truong',
  'KE_TOAN_TRUONG': 'ke_toan_truong',
  'chief_accountant': 'ke_toan_truong',
  'CHIEF_ACCOUNTANT': 'ke_toan_truong',
};

/**
 * Chuẩn hóa bất kỳ mã vai trò đầu vào về CANONICAL VIETNAMESE ROLE
 * @param {string} rawRole
 * @returns {string}
 */
function normalizeRole(rawRole) {
  if (!rawRole || typeof rawRole !== 'string') return 'kho';
  const cleaned = rawRole.trim().toLowerCase();
  return ROLE_MAPPING[cleaned] || ROLE_MAPPING[rawRole.trim()] || 'kho';
}

// 3. MA TRẬN PHÂN QUYỀN CHUẨN (ROLE_PERMISSIONS) CHO TỪNG VAI TRÒ
const KHO_PERMISSIONS = [
  'dashboard.view',
  // Canonical Vietnamese permissions
  'kho.view',
  'kho.nhap',
  'kho.xuat',
  'kho.chuyen',
  'kho.kiem_ke',
  // Standard module permissions
  'warehouse.view',
  'warehouse.receipt',
  'warehouse.issue',
  'warehouse.transfer',
  'warehouse.stocktake',
];

const SALES_PERMISSIONS = [
  'dashboard.view',
  'sales.view',
  'sales.create',
  'sales.update',
  'sales.approve',
];

const PRODUCTION_PERMISSIONS = [
  'dashboard.view',
  'production.view',
  'production.create',
  'production.update',
  'production.approve',
];

const PURCHASING_PERMISSIONS = [
  'dashboard.view',
  'purchasing.view',
  'purchasing.create',
  'purchasing.update',
  'purchasing.approve',
];

const ACCOUNTING_PERMISSIONS = [
  'dashboard.view',
  'accounting.view',
  'accounting.journal',
  'accounting.receivable',
  'accounting.payable',
  'accounting.cost',
  'accounting.costing',
  'document.view',
  'document.create',
  'document.edit',
  'journal.view',
  'journal.create',
  'journal.edit',
  'ledger.view',
  'debt.view',
  'cost.view',
  'costing.view',
];

const CHIEF_ACCOUNTING_PERMISSIONS = [
  ...ACCOUNTING_PERMISSIONS,
  'orderEfficiency.view',
  'accounting.reports',
  'report.view',
  'chiefDashboard.view',
  'monitoring.view',
  'accounting.approve',
  'document.approve',
  'journal.approve',
  'document.delete',
  'journal.delete',
];

const ADMIN_PERMISSIONS = [
  'dashboard.view',
  'sales.view', 'sales.create', 'sales.update', 'sales.delete', 'sales.approve',
  'production.view', 'production.create', 'production.update', 'production.approve',
  'purchasing.view', 'purchasing.create', 'purchasing.update', 'purchasing.approve',
  'kho.view', 'kho.nhap', 'kho.xuat', 'kho.chuyen', 'kho.kiem_ke',
  'warehouse.view', 'warehouse.receipt', 'warehouse.issue', 'warehouse.transfer', 'warehouse.stocktake',
  ...CHIEF_ACCOUNTING_PERMISSIONS,
  'admin.users', 'admin.roles', 'admin.permissions', 'admin.settings',
];

const ROLE_PERMISSIONS = {
  // Canonical Vietnamese roles
  admin: ADMIN_PERMISSIONS,
  kho: KHO_PERMISSIONS,
  ban_hang: SALES_PERMISSIONS,
  san_xuat: PRODUCTION_PERMISSIONS,
  mua_hang: PURCHASING_PERMISSIONS,
  ke_toan: ACCOUNTING_PERMISSIONS,
  ke_toan_truong: CHIEF_ACCOUNTING_PERMISSIONS,

  // Internal test / adapter compatibility
  ADMIN: ADMIN_PERMISSIONS,
  WAREHOUSE: KHO_PERMISSIONS,
  SALES: SALES_PERMISSIONS,
  PRODUCTION: PRODUCTION_PERMISSIONS,
  PURCHASING: PURCHASING_PERMISSIONS,
  ACCOUNTING: ACCOUNTING_PERMISSIONS,
  CHIEF_ACCOUNTANT: CHIEF_ACCOUNTING_PERMISSIONS,
  warehouse: KHO_PERMISSIONS,
  sales: SALES_PERMISSIONS,
  production: PRODUCTION_PERMISSIONS,
  purchasing: PURCHASING_PERMISSIONS,
  accounting: ACCOUNTING_PERMISSIONS,
  chief_accountant: CHIEF_ACCOUNTING_PERMISSIONS,
};

const ROLE_PERMISSIONS_LOWERCASE = ROLE_PERMISSIONS;

module.exports = {
  CANONICAL_ROLES,
  ROLE_MAPPING,
  normalizeRole,
  ROLE_PERMISSIONS,
  ROLE_PERMISSIONS_LOWERCASE,
};
