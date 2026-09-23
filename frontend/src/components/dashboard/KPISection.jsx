import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Factory,
  Package,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import portalService from '../../services/portalService';
import { useAuth } from '../rbac/AuthContext';

export default function KPISection() {
  const { role } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await portalService.getDashboardSummary();
        setSummary(data);
      } catch (err) {
        console.warn('Lỗi lấy chỉ số KPI:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return null;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatMoney = (val) => {
    if (val === null || val === undefined) return 'Chưa có dữ liệu';
    const num = Number(val);
    if (isNaN(num)) return 'Chưa có dữ liệu';
    if (Math.abs(num) >= 1000000000) {
      return `${(num / 1000000000).toFixed(2)} tỷ`;
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const inv = summary?.inventory;
  const sales = summary?.sales;
  const prod = summary?.production;
  const acc = summary?.accounting;

  // 6 Business KPI Cards with real database data & transparent status
  const kpiCards = [
    {
      id: 'kpi-sales-orders',
      title: 'Đơn hàng',
      value:
        sales?.soDonHang !== undefined && sales?.soDonHang !== null
          ? `${sales.soDonHang}`
          : (sales?.soDonHangSeed !== undefined && sales?.soDonHangSeed !== null
              ? `${sales.soDonHangSeed}`
              : 'Chưa có dữ liệu'),
      change: null,
      changeType: 'neutral',
      subtext: sales?.connected || sales?.soDonHangSeed ? 'Tổng đơn trên hệ thống' : 'Phân hệ đang triển khai',
      icon: ShoppingBag,
      isOperational: Boolean(
        (sales?.soDonHang !== undefined && sales?.soDonHang !== null) ||
        (sales?.soDonHangSeed !== undefined && sales?.soDonHangSeed !== null)
      ),
    },
    {
      id: 'kpi-production',
      title: 'Sản xuất',
      value:
        prod?.connected && prod?.sanLuongHoanThanh !== null && prod?.sanLuongHoanThanh !== undefined
          ? `${Number(prod.sanLuongHoanThanh).toLocaleString('vi-VN')} SP`
          : 'Chưa có dữ liệu',
      change: null,
      changeType: 'neutral',
      subtext: prod?.connected ? 'Tiến độ chuyền may công nghiệp' : 'Phân hệ đang triển khai',
      icon: Factory,
      isOperational: Boolean(prod?.connected && prod?.sanLuongHoanThanh !== null && prod?.sanLuongHoanThanh !== undefined),
    },
    {
      id: 'kpi-inventory',
      title: 'Tồn kho',
      value: inv?.tongGiaTriTon
        ? `${(inv.tongGiaTriTon / 1000000000).toFixed(2)} tỷ`
        : 'Chưa có dữ liệu',
      change: inv?.canhBaoThap ? `${inv.canhBaoThap} cảnh báo` : null,
      changeType: 'warning',
      subtext: inv ? `${inv.soMatHangTon} mặt hàng (PH4 thời gian thực)` : 'Phân hệ đang triển khai',
      icon: Package,
      highlight: true,
      isOperational: Boolean(inv?.tongGiaTriTon),
    },
    {
      id: 'kpi-revenue',
      title: 'Doanh thu',
      value:
        sales?.connected && sales?.doanhThu !== null && sales?.doanhThu !== undefined
          ? formatMoney(sales.doanhThu)
          : 'Chưa có dữ liệu',
      change: null,
      changeType: 'neutral',
      subtext: sales?.connected ? 'Doanh thu bán hàng' : 'Phân hệ đang triển khai',
      icon: TrendingUp,
      isOperational: Boolean(sales?.connected && sales?.doanhThu !== null && sales?.doanhThu !== undefined),
    },
    {
      id: 'kpi-ar',
      title: 'Công nợ phải thu',
      value:
        acc?.connected && acc?.congNoPhaiThu !== null && acc?.congNoPhaiThu !== undefined
          ? formatMoney(acc.congNoPhaiThu)
          : 'Chưa có dữ liệu',
      change: null,
      changeType: 'neutral',
      subtext: acc?.connected ? 'Khách hàng đến hạn' : 'Phân hệ đang triển khai',
      icon: ArrowDownLeft,
      isOperational: Boolean(acc?.connected && acc?.congNoPhaiThu !== null && acc?.congNoPhaiThu !== undefined),
    },
    {
      id: 'kpi-ap',
      title: 'Công nợ phải trả',
      value:
        acc?.connected && acc?.congNoPhaiTra !== null && acc?.congNoPhaiTra !== undefined
          ? formatMoney(acc.congNoPhaiTra)
          : 'Chưa có dữ liệu',
      change: null,
      changeType: 'neutral',
      subtext: acc?.connected ? 'Nhà cung cấp' : 'Phân hệ đang triển khai',
      icon: ArrowUpRight,
      isOperational: Boolean(acc?.connected && acc?.congNoPhaiTra !== null && acc?.congNoPhaiTra !== undefined),
    },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-3.5">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;

          return (
            <div
              key={kpi.id}
              className={`bg-white rounded-2xl border p-3.5 sm:p-4 shadow-xs transition-all hover:shadow-sm flex flex-col justify-between min-h-[140px] ${
                kpi.highlight
                  ? 'border-[#96C8EB] ring-1 ring-[#96C8EB]/30 bg-gradient-to-b from-[#F7FBFF] to-white'
                  : 'border-[#E2EDF5] hover:border-[#96C8EB]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EAF5FC] text-[#0F5FAF] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#0F5FAF]" />
                  </div>
                  {kpi.change && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        kpi.changeType === 'positive'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : kpi.changeType === 'warning'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-[#F0F4F8] text-[#5F6F82] border border-[#DCE5ED]'
                      }`}
                    >
                      {kpi.change}
                    </span>
                  )}
                </div>

                <div className="text-xs font-medium text-[#5F6F82]">
                  {kpi.title}
                </div>

                <div
                  className={`mt-1 tracking-tight truncate ${
                    kpi.isOperational
                      ? 'text-base sm:text-lg font-bold text-[#172033]'
                      : 'text-xs sm:text-sm font-normal text-[#8DA0B3] italic'
                  }`}
                >
                  {loading ? '...' : kpi.value}
                </div>
              </div>

              <div className="mt-2 text-[10px] text-[#8DA0B3] truncate">
                {kpi.subtext}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
