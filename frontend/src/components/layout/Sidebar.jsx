import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  CalendarDays,
  Factory,
  ShoppingCart,
  Building2,
  Warehouse,
  Package,
  Layers,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ClipboardCheck,
  ClipboardList,
  Scale,
  Truck,
  BarChart3,
  Calculator,
  CreditCard,
  DollarSign,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  Cpu,
  FileText,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../rbac/AuthContext';
import { ENTERPRISE_MENU } from '../../config/menu';

const ICON_MAP = {
  LayoutDashboard,
  ShoppingBag,
  Users,
  CalendarDays,
  Factory,
  ShoppingCart,
  Building2,
  Warehouse,
  Package,
  Layers,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ClipboardCheck,
  ClipboardList,
  Scale,
  Truck,
  BarChart3,
  Calculator,
  CreditCard,
  DollarSign,
  ShieldCheck,
  Cpu,
  FileText,
  BookOpen,
};

const getActiveModuleMeta = (pathname) => {
  if (pathname.startsWith('/warehouse')) {
    return {
      groupKey: 'KHO & VẬT TƯ',
      title: 'Kho & Quản lý Vật tư',
      desc: 'Quản lý kho vải, NPL & kiểm kê',
    };
  }
  if (pathname.startsWith('/sales')) {
    return {
      groupKey: 'KINH DOANH',
      code: 'PH1',
      title: 'Bán hàng & Khách hàng',
      desc: 'Đơn hàng, hợp đồng & đối tác',
    };
  }
  if (pathname.startsWith('/production')) {
    return {
      groupKey: 'SẢN XUẤT',
      code: 'PH2',
      title: 'Quản lý Sản xuất',
      desc: 'Kế hoạch sản xuất & lệnh LSX',
    };
  }
  if (pathname.startsWith('/purchasing')) {
    return {
      groupKey: 'MUA HÀNG',
      title: 'Mua hàng & Nhà cung ứng',
      desc: 'Đơn mua hàng PO & nhà cung cấp',
    };
  }
  if (pathname.startsWith('/accounting')) {
    return {
      groupKey: 'TÀI CHÍNH',
      code: 'PH5',
      title: 'Tài chính & Kế toán',
      desc: 'Sổ cái, công nợ & giá thành',
    };
  }
  if (pathname.startsWith('/admin')) {
    return {
      groupKey: 'QUẢN TRỊ',
      code: 'SYS',
      title: 'Quản trị Hệ thống',
      desc: 'Người dùng & ma trận phân quyền',
    };
  }
  return null;
};

export default function Sidebar({ isOpen, onClose }) {
  const { hasPermission, role, user, roleMeta } = useAuth();
  const location = useLocation();

  const activeModule = getActiveModuleMeta(location.pathname);

  // Filter groups: if activeModule is defined, show only that module's group.
  // Otherwise, fallback to showing all permitted groups.
  const relevantGroups = ENTERPRISE_MENU.filter((group) => {
    if (activeModule) {
      return group.group === activeModule.groupKey;
    }
    return group.group !== 'TỔNG QUAN';
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Contextual Module Sidebar */}
      <aside
        className={`fixed top-14 bottom-0 left-0 z-40 w-64 bg-white border-r border-[#DCEAF4] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Context Header: Back to Portal & Module Info */}
        <div className="p-3 border-b border-[#DCEAF4] bg-[#F7FAFC]/90">
          <Link
            to="/"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs text-[#5A8CAE] hover:text-[#0F5FAF] font-medium transition-colors mb-2 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Về Cổng Doanh nghiệp</span>
          </Link>

          {activeModule && (
            <div className="p-2.5 rounded-xl bg-white border border-[#DCEAF4] shadow-2xs">
              <div className="flex items-center gap-2">
                {activeModule.code && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0F5FAF] text-white">
                    {activeModule.code}
                  </span>
                )}
                <span className="text-xs font-bold text-[#0F3B66] truncate">
                  {activeModule.title}
                </span>
              </div>
              <p className="text-[10px] text-[#4A7D9D] mt-1 leading-snug">
                {activeModule.desc}
              </p>
            </div>
          )}
        </div>

        {/* Module Operations Navigation (Business-First, Clean, RBAC Filtered) */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-3">
          {relevantGroups.map((group, groupIdx) => {
            if (group.permission && !hasPermission(group.permission) && role !== 'admin') {
              return null;
            }

            const permittedItems = group.items.filter((item) => {
              if (role === 'admin') return true;
              return hasPermission(item.permission);
            });

            if (permittedItems.length === 0) return null;

            return (
              <div key={groupIdx} className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#628DAE]">
                  {group.group}
                </div>

                <div className="space-y-0.5">
                  {permittedItems.map((item) => {
                    const IconComponent = ICON_MAP[item.icon] || LayoutDashboard;
                    const effectiveRole = user?.vai_tro || role;
                    const itemPath = item.id === 'acc-dashboard'
                      ? (effectiveRole === 'ke_toan_truong'
                          ? '/accounting/tong-quan-ke-toan-truong'
                          : '/accounting/tong-quan-ke-toan')
                      : item.path;
                    
                    const isMatch = item.id === 'acc-dashboard'
                      ? (location.pathname === '/accounting' ||
                         location.pathname === '/accounting/' ||
                         location.pathname === '/accounting/tong-quan-ke-toan' ||
                         location.pathname === '/accounting/tong-quan-ke-toan-truong' ||
                         location.pathname === '/accounting/dashboard')
                      : (item.path === '/purchasing' || item.path === '/production')
                        ? (location.pathname === item.path || location.pathname === item.path + '/')
                        : (item.path.includes('?tab=')
                            ? location.pathname + location.search === item.path
                            : (location.pathname === item.path || location.pathname.startsWith(item.path + '/')));

                    return (
                      <NavLink
                        key={item.id}
                        to={itemPath}
                        onClick={onClose}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                          isMatch
                            ? 'bg-[#EAF5FC] text-[#0F5FAF] font-semibold border-l-2 border-[#0F5FAF] shadow-2xs'
                            : 'text-[#4A7D9D] hover:bg-[#F0F7FC] hover:text-[#0F3B66]'
                        }`}
                      >
                        <IconComponent
                          className={`w-4 h-4 flex-shrink-0 ${
                            isMatch ? 'text-[#0F5FAF]' : 'text-[#5A8CAE]'
                          }`}
                        />
                        <span className="truncate">{item.title}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Identity Footer */}
        <div className="p-3 border-t border-[#DCEAF4] bg-[#F7FAFC]/80 text-xs text-[#0F3B66] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="font-semibold text-[#0F3B66] truncate text-[11px]">
              {user?.ho_ten || 'Cán bộ May 10'}
            </div>
            <div className="text-[10px] text-[#4A7D9D] truncate">
              {roleMeta?.shortName || user?.phong_ban || 'Văn phòng May 10'}
            </div>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#EAF5FC] text-[#0F5FAF] font-semibold flex-shrink-0 border border-[#D6EDFF]">
            RBAC
          </span>
        </div>
      </aside>
    </>
  );
}
