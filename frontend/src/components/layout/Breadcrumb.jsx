import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
  '': 'Trang chủ',
  sales: 'PH1 — Bán hàng & Khách hàng',
  production: 'PH2 — Sản xuất & Kế hoạch NPL',
  purchasing: 'Mua hàng & Nhà cung cấp',
  warehouse: 'Kho & Quản lý vật tư',
  accounting: 'PH5 — Tài chính – Kế toán',
  admin: 'Quản trị hệ thống',
  users: 'Người dùng',
  roles: 'Vai trò doanh nghiệp',
  permissions: 'Ma trận phân quyền (RBAC)',
};

export default function Breadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // On Homepage, breadcrumb is omitted
  if (location.pathname === '/') {
    return null;
  }

  return (
    <nav className="flex items-center text-xs font-medium mb-4" aria-label="Breadcrumb">
      <Link
        to="/"
        className="flex items-center gap-1.5 text-[#6B7785] hover:text-[#0F5FAF] transition-colors"
      >
        <Home className="w-3.5 h-3.5 text-[#5A8CAE]" />
        <span>Trang chủ Portal</span>
      </Link>

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = ROUTE_LABELS[value] || decodeURIComponent(value);

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-3.5 h-3.5 text-[#96C8EB] mx-1 flex-shrink-0" />
            {isLast ? (
              <span className="text-[#172033] font-semibold truncate max-w-xs">{label}</span>
            ) : (
              <Link to={to} className="text-[#6B7785] hover:text-[#0F5FAF] transition-colors">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
