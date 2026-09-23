/**
 * ERP May 10 - RBAC Permissions Definition
 * Defines fine-grained permissions and maps them to system roles.
 */

export const PERMISSIONS = {
  // Global & Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // PH1 - Bán hàng & Quản lý khách hàng
  SALES_VIEW: 'sales.view',
  SALES_CREATE: 'sales.create',
  SALES_UPDATE: 'sales.update',
  SALES_DELETE: 'sales.delete',
  SALES_APPROVE: 'sales.approve',

  // PH2 - Sản xuất & Nhu cầu NPL
  PRODUCTION_VIEW: 'production.view',
  PRODUCTION_CREATE: 'production.create',
  PRODUCTION_UPDATE: 'production.update',
  PRODUCTION_APPROVE: 'production.approve',

  // PH3 - Mua hàng & NCC
  PURCHASING_VIEW: 'purchasing.view',
  PURCHASING_CREATE: 'purchasing.create',
  PURCHASING_UPDATE: 'purchasing.update',
  PURCHASING_APPROVE: 'purchasing.approve',

  // PH4 - Kho & Quản lý vật tư (Canonical Permissions & Module Keys)
  KHO_VIEW: 'kho.view',
  KHO_NHAP: 'kho.nhap',
  KHO_XUAT: 'kho.xuat',
  KHO_CHUYEN: 'kho.chuyen',
  KHO_KIEM_KE: 'kho.kiem_ke',
  WAREHOUSE_VIEW: 'warehouse.view',
  WAREHOUSE_RECEIPT: 'warehouse.receipt',
  WAREHOUSE_ISSUE: 'warehouse.issue',
  WAREHOUSE_TRANSFER: 'warehouse.transfer',
  WAREHOUSE_STOCKTAKE: 'warehouse.stocktake',

  // PH5 - Kế toán & Giá thành
  ACCOUNTING_VIEW: 'accounting.view',
  ACCOUNTING_JOURNAL: 'accounting.journal',
  ACCOUNTING_RECEIVABLE: 'accounting.receivable',
  ACCOUNTING_PAYABLE: 'accounting.payable',
  ACCOUNTING_COST: 'accounting.cost',
  ACCOUNTING_APPROVE: 'accounting.approve',
  ACCOUNTING_REPORTS: 'accounting.reports',
  ORDER_EFFICIENCY_VIEW: 'orderEfficiency.view',

  // System Administration
  ADMIN_USERS: 'admin.users',
  ADMIN_ROLES: 'admin.roles',
  ADMIN_PERMISSIONS: 'admin.permissions',
  ADMIN_SETTINGS: 'admin.settings',
};

export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),

  kho: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.KHO_VIEW,
    PERMISSIONS.KHO_NHAP,
    PERMISSIONS.KHO_XUAT,
    PERMISSIONS.KHO_CHUYEN,
    PERMISSIONS.KHO_KIEM_KE,
    PERMISSIONS.WAREHOUSE_VIEW,
    PERMISSIONS.WAREHOUSE_RECEIPT,
    PERMISSIONS.WAREHOUSE_ISSUE,
    PERMISSIONS.WAREHOUSE_TRANSFER,
    PERMISSIONS.WAREHOUSE_STOCKTAKE,
  ],

  ban_hang: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_UPDATE,
    PERMISSIONS.SALES_APPROVE,
  ],

  san_xuat: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PRODUCTION_VIEW,
    PERMISSIONS.PRODUCTION_CREATE,
    PERMISSIONS.PRODUCTION_UPDATE,
    PERMISSIONS.PRODUCTION_APPROVE,
  ],

  mua_hang: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PURCHASING_VIEW,
    PERMISSIONS.PURCHASING_CREATE,
    PERMISSIONS.PURCHASING_UPDATE,
    PERMISSIONS.PURCHASING_APPROVE,
  ],

  ke_toan: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.ACCOUNTING_JOURNAL,
    PERMISSIONS.ACCOUNTING_RECEIVABLE,
    PERMISSIONS.ACCOUNTING_PAYABLE,
    PERMISSIONS.ACCOUNTING_COST,
  ],

  ke_toan_truong: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.ACCOUNTING_JOURNAL,
    PERMISSIONS.ACCOUNTING_RECEIVABLE,
    PERMISSIONS.ACCOUNTING_PAYABLE,
    PERMISSIONS.ACCOUNTING_COST,
    PERMISSIONS.ACCOUNTING_APPROVE,
    PERMISSIONS.ACCOUNTING_REPORTS,
    PERMISSIONS.ORDER_EFFICIENCY_VIEW,
  ],
};

export const PERMISSION_GROUPS = [
  {
    code: 'dashboard',
    name: 'Tổng quan Hệ thống',
    permissions: [
      { id: PERMISSIONS.DASHBOARD_VIEW, name: 'Xem Dashboard & Báo cáo tổng thể', description: 'Truy cập cổng portal và chỉ số KPI tập đoàn' },
    ],
  },
  {
    code: 'ph1',
    name: 'PH1 — Bán hàng & Khách hàng',
    permissions: [
      { id: PERMISSIONS.SALES_VIEW, name: 'Xem dữ liệu bán hàng', description: 'Xem danh sách đơn hàng, báo giá, khách hàng' },
      { id: PERMISSIONS.SALES_CREATE, name: 'Tạo đơn bán hàng & hợp đồng', description: 'Tạo mới đơn hàng kinh doanh' },
      { id: PERMISSIONS.SALES_UPDATE, name: 'Cập nhật đơn bán hàng', description: 'Chỉnh sửa đơn hàng kinh doanh' },
      { id: PERMISSIONS.SALES_APPROVE, name: 'Phê duyệt đơn bán hàng', description: 'Duyệt đơn và chuyển tiếp sản xuất' },
    ],
  },
  {
    code: 'ph2',
    name: 'PH2 — Sản xuất & Định mức NPL',
    permissions: [
      { id: PERMISSIONS.PRODUCTION_VIEW, name: 'Xem kế hoạch sản xuất', description: 'Xem định mức BOM, chuyền may và lệnh SX' },
      { id: PERMISSIONS.PRODUCTION_CREATE, name: 'Lập lệnh sản xuất', description: 'Tạo mới lệnh may và yêu cầu cấp vật tư' },
      { id: PERMISSIONS.PRODUCTION_UPDATE, name: 'Cập nhật tiến độ may', description: 'Cập nhật sản lượng chuyền may' },
      { id: PERMISSIONS.PRODUCTION_APPROVE, name: 'Phê duyệt lệnh sản xuất', description: 'Ký duyệt lệnh sản xuất chính thức' },
    ],
  },
  {
    code: 'ph3',
    name: 'PH3 — Mua hàng & Nhà cung cấp',
    permissions: [
      { id: PERMISSIONS.PURCHASING_VIEW, name: 'Xem đơn mua hàng & NCC', description: 'Xem danh sách PO và nhà cung ứng' },
      { id: PERMISSIONS.PURCHASING_CREATE, name: 'Tạo đơn đặt mua (PO)', description: 'Lập đơn mua NPL vải, chỉ, phụ liệu' },
      { id: PERMISSIONS.PURCHASING_UPDATE, name: 'Cập nhật đơn mua', description: 'Chỉnh sửa thông tin đơn mua hàng' },
      { id: PERMISSIONS.PURCHASING_APPROVE, name: 'Duyệt đơn mua hàng', description: 'Ký duyệt phát hành PO cho nhà cung ứng' },
    ],
  },
  {
    code: 'ph4',
    name: 'PH4 — Kho & Quản lý vật tư',
    permissions: [
      { id: PERMISSIONS.WAREHOUSE_VIEW, name: 'Xem tồn kho & thẻ kho', description: 'Tra cứu số dư, vị trí kệ và lô vật tư' },
      { id: PERMISSIONS.WAREHOUSE_RECEIPT, name: 'Lập & duyệt Phiếu Nhập kho', description: 'Nhập mua hàng, nhập thành phẩm' },
      { id: PERMISSIONS.WAREHOUSE_ISSUE, name: 'Lập & duyệt Phiếu Xuất kho', description: 'Xuất cấp sản xuất chuyền may, xuất bán' },
      { id: PERMISSIONS.WAREHOUSE_TRANSFER, name: 'Điều chuyển kho nội bộ', description: 'Chuyển vật tư giữa các kho May 10' },
      { id: PERMISSIONS.WAREHOUSE_STOCKTAKE, name: 'Kiểm kê & Cân đối kho', description: 'Lập phiếu kiểm kê và điều chỉnh tồn' },
    ],
  },
  {
    code: 'ph5',
    name: 'PH5 — Tài chính, Kế toán & Giá thành',
    permissions: [
      { id: PERMISSIONS.ACCOUNTING_VIEW, name: 'Xem báo cáo kế toán', description: 'Xem tổng hợp công nợ và chi phí' },
      { id: PERMISSIONS.ACCOUNTING_JOURNAL, name: 'Định khoản nhật ký chung', description: 'Hạch toán tự động phiếu nhập/xuất kho' },
      { id: PERMISSIONS.ACCOUNTING_RECEIVABLE, name: 'Quản lý công nợ phải thu', description: 'Theo dõi thanh toán khách hàng' },
      { id: PERMISSIONS.ACCOUNTING_PAYABLE, name: 'Quản lý công nợ phải trả', description: 'Theo dõi thanh toán nhà cung cấp' },
      { id: PERMISSIONS.ACCOUNTING_COST, name: 'Tính giá thành sản phẩm', description: 'Tập hợp chi phí NPL, nhân công, SX chung' },
    ],
  },
  {
    code: 'admin',
    name: 'Quản trị hệ thống ERP',
    permissions: [
      { id: PERMISSIONS.ADMIN_USERS, name: 'Quản lý Người dùng', description: 'Xem, phân quyền và khóa tài khoản' },
      { id: PERMISSIONS.ADMIN_ROLES, name: 'Quản lý Vai trò (Roles)', description: 'Cấu hình nhóm quyền trong doanh nghiệp' },
      { id: PERMISSIONS.ADMIN_PERMISSIONS, name: 'Ma trận Phân quyền (RBAC)', description: 'Gán và thu hồi đặc quyền phân hệ' },
    ],
  },
];
