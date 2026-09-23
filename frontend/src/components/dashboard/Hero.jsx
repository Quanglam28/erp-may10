import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  Database,
  CheckCircle2,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '../rbac/AuthContext';

export default function Hero() {
  const { user, role, roleMeta } = useAuth();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#8B1E2D] via-[#7A1A27] to-[#4D1018] text-white p-6 sm:p-8 lg:p-10 shadow-xl mb-8">
      {/* Background Subtle Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="garment-weave" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M0 20 L40 20 M20 0 L20 40" stroke="#FFFFFF" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#garment-weave)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-4xl">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-md border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Hệ thống Quản trị Doanh nghiệp Dệt may ERP May 10
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Kho & Vật tư: Ready & Frozen
          </span>
        </div>

        {/* Greeting & Headline */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight mb-3">
          Xin chào, {user?.ho_ten || 'Cán bộ May 10'}!
        </h1>
        <p className="text-sm sm:text-base text-red-100 font-light leading-relaxed max-w-3xl mb-6">
          Chào mừng đồng chí đến với Cổng điều hành ERP Tổng Công ty May 10.
          Hệ thống kết nối thống nhất 5 phân hệ từ Bán hàng, Lập kế hoạch sản xuất chuyền may,
          Mua hàng cung ứng, Quản lý kho vật tư đến Hạch toán kế toán giá thành trên cơ sở dữ liệu duy nhất.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/warehouse"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-may10-primary hover:bg-red-50 transition-all shadow-lg hover:shadow-xl transform active:scale-95"
          >
            <Warehouse className="w-4 h-4" />
            <span>Truy cập Kho & Quản lý vật tư</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/admin/permissions"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Kiểm tra Phân quyền RBAC ({roleMeta.shortName})</span>
          </Link>
        </div>

        {/* Quick System Indicator Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/15 text-xs text-red-100">
          <div>
            <div className="text-gray-300 text-[11px]">Cơ sở dữ liệu</div>
            <div className="font-bold text-white text-sm mt-0.5 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-amber-300" />
              erp_may10 (41 Bảng)
            </div>
          </div>
          <div>
            <div className="text-gray-300 text-[11px]">Phân hệ hoạt động</div>
            <div className="font-bold text-emerald-300 text-sm mt-0.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              Kho & Vật tư sẵn sàng
            </div>
          </div>
          <div>
            <div className="text-gray-300 text-[11px]">Vai trò hiện hành</div>
            <div className="font-bold text-white text-sm mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
              {roleMeta.name}
            </div>
          </div>
          <div>
            <div className="text-gray-300 text-[11px]">Phòng ban</div>
            <div className="font-bold text-white text-sm mt-0.5 truncate">
              {roleMeta.department}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
