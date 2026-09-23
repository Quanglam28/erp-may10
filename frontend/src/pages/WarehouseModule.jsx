import ModuleHeader from '../components/layout/ModuleHeader';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import Toast from '../components/Toast';
import { useAuth } from '../components/rbac/AuthContext';

// 8 Audited & Frozen PH4 Pages
import DashboardPage from './DashboardPage';
import TonKhoPage from './TonKhoPage';
import ViTriKhoPage from './ViTriKhoPage';
import LoVatTuPage from './LoVatTuPage';
import PhieuNhapPage from './PhieuNhapPage';
import PhieuXuatPage from './PhieuXuatPage';
import PhieuChuyenPage from './PhieuChuyenPage';
import PhieuKiemKePage from './PhieuKiemKePage';

export default function WarehouseModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);
  const { hasPermission } = useAuth();

  // Normalize /warehouse to /warehouse?tab=dashboard to keep PH4 Sidebar active state in sync
  useEffect(() => {
    if (!searchParams.get('tab')) {
      setSearchParams({ tab: 'dashboard' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
      message: 'Đã làm mới dữ liệu toàn bộ phân hệ Kho & Vật tư May 10.',
    });
  };

  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage key={refreshKey} showToast={showToast} />;
      case 'ton-kho':
        return <TonKhoPage key={refreshKey} showToast={showToast} />;
      case 'vi-tri':
        return <ViTriKhoPage key={refreshKey} showToast={showToast} />;
      case 'lo-vat-tu':
        return <LoVatTuPage key={refreshKey} showToast={showToast} />;
      case 'cho-nhap':
        return <PhieuNhapPage key={refreshKey} initialView="cho-nhap" showToast={showToast} />;
      case 'phieu-nhap':
        return <PhieuNhapPage key={refreshKey} initialView="phieu-nhap" showToast={showToast} />;
      case 'phieu-xuat':
        return <PhieuXuatPage key={refreshKey} showToast={showToast} />;
      case 'phieu-chuyen':
        return <PhieuChuyenPage key={refreshKey} showToast={showToast} />;
      case 'kiem-ke':
        return <PhieuKiemKePage key={refreshKey} showToast={showToast} />;
      default:
        return <DashboardPage key={refreshKey} showToast={showToast} />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Module Header aligned with Core V2.11 */}
      <ModuleHeader
        title="Kho & Quản lý vật tư"
        description="Quản lý số dư tồn kho, vị trí kệ, theo dõi lô vật tư và quy trình xuất - nhập - điều chuyển - kiểm kê"
        badgeText="Đang vận hành"
        badgeType="success"
        imageKey="warehouse"
      >
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DCEAF4] text-xs font-semibold text-[#0F4C81] bg-white hover:bg-[#EAF5FC] transition-all self-start md:self-auto shadow-sm hover:border-[#96C8EB]"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#0F5FAF]" />
          <span>Làm mới dữ liệu</span>
        </button>
      </ModuleHeader>

      {/* Active Screen Content (Directly below ModuleHeader, No duplicate middle menu) */}
      <div>
        {renderActiveScreen()}
      </div>

      {/* Global Toast for Warehouse Actions */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
