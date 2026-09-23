import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Scale,
  ShoppingCart,
  Truck,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import ModuleHeader from '../components/layout/ModuleHeader';
import Toast from '../components/Toast';

// Subpages
import PurchasingDashboard from './purchasing/PurchasingDashboard';
import SuppliersPage from './purchasing/SuppliersPage';
import PurchaseRequisitionsPage from './purchasing/PurchaseRequisitionsPage';
import RfqComparisonPage from './purchasing/RfqComparisonPage';
import PurchaseOrdersPage from './purchasing/PurchaseOrdersPage';
import PurchaseOrderDetailPage from './purchasing/PurchaseOrderDetailPage';
import ReceivingOrdersPage from './purchasing/ReceivingOrdersPage';
import PurchasingReportsPage from './purchasing/PurchasingReportsPage';

export default function PurchasingModule() {
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);

  const showToast = (toastData) => {
    setToast(toastData);
    setTimeout(() => {
      setToast(null);
    }, 6000);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    showToast({
      type: 'success',
      message: 'Đã làm mới dữ liệu toàn bộ phân hệ Mua Hàng & Nhà Cung Cấp May 10.',
    });
  };

  const currentPath = location.pathname;

  const navItems = [
    {
      label: 'Tổng quan',
      path: '/purchasing',
      icon: LayoutDashboard,
      isActive: currentPath === '/purchasing' || currentPath === '/purchasing/',
    },
    {
      label: 'Nhà cung cấp',
      path: '/purchasing/suppliers',
      icon: Building2,
      isActive: currentPath.startsWith('/purchasing/suppliers'),
    },
    {
      label: 'Yêu cầu mua sắm (PR)',
      path: '/purchasing/requisitions',
      icon: ClipboardList,
      isActive: currentPath.startsWith('/purchasing/requisitions'),
    },
    {
      label: 'Báo giá & So sánh (RFQ)',
      path: '/purchasing/rfqs',
      icon: Scale,
      isActive: currentPath.startsWith('/purchasing/rfqs'),
    },
    {
      label: 'Đơn mua hàng (PO)',
      path: '/purchasing/purchase-orders',
      icon: ShoppingCart,
      isActive: currentPath.startsWith('/purchasing/purchase-orders'),
    },
    {
      label: 'Chờ nhập kho',
      path: '/purchasing/receiving',
      icon: Truck,
      isActive: currentPath.startsWith('/purchasing/receiving'),
    },
    {
      label: 'Báo cáo',
      path: '/purchasing/reports',
      icon: BarChart3,
      isActive: currentPath.startsWith('/purchasing/reports'),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Module Header aligned with Global UI V2.11 */}
      <ModuleHeader
        title="Mua Hàng & Quản Lý Nhà Cung Cấp"
        description="Quản lý mạng lưới nhà cung cấp bông sợi vải, lập PR, RFQ so sánh NCC, phát hành PO, kiểm nghiệm và tiếp nhận nhập kho May 10"
        badgeText="Đang vận hành"
        badgeType="success"
        imageKey="purchasing"
      >
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DCEAF4] text-xs font-semibold text-[#0F4C81] bg-white hover:bg-[#EAF5FC] transition-all self-start md:self-auto shadow-xs hover:border-[#96C8EB]"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#0F5FAF]" />
          <span>Làm mới dữ liệu</span>
        </button>
      </ModuleHeader>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white rounded-xl px-2 py-1 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  item.isActive
                    ? 'bg-[#0F5FAF] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0F5FAF] hover:bg-[#F4FAFE]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Subpage Router */}
      <div key={refreshKey}>
        <Routes>
          <Route index element={<PurchasingDashboard showToast={showToast} />} />
          <Route path="suppliers" element={<SuppliersPage showToast={showToast} />} />
          <Route path="requisitions" element={<PurchaseRequisitionsPage showToast={showToast} />} />
          <Route path="rfqs" element={<RfqComparisonPage showToast={showToast} />} />
          <Route path="purchase-orders" element={<PurchaseOrdersPage showToast={showToast} />} />
          <Route path="purchase-orders/:id" element={<PurchaseOrderDetailPage showToast={showToast} />} />
          <Route path="receiving" element={<ReceivingOrdersPage showToast={showToast} />} />
          <Route path="reports" element={<PurchasingReportsPage showToast={showToast} />} />
          <Route path="*" element={<PurchasingDashboard showToast={showToast} />} />
        </Routes>
      </div>

      {/* Global Toast for Purchasing Actions */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
