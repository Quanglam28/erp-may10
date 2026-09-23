import React from 'react';
import {
  ShoppingBag,
  Factory,
  ShoppingCart,
  Warehouse,
  Calculator,
  ArrowRight,
  Database,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const STEPS = [
  {
    step: '01',
    id: 'PH1',
    title: 'Bán hàng & Khách hàng',
    code: 'sales',
    icon: ShoppingBag,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    desc: 'Tiếp nhận đơn hàng may xuất khẩu & bán buôn nội địa.',
    action: 'Sinh nhu cầu đơn hàng (SO)',
    status: 'pending',
  },
  {
    step: '02',
    id: 'PH2',
    title: 'Sản xuất & Kế hoạch NPL',
    code: 'production',
    icon: Factory,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    desc: 'Lập định mức BOM (vải, chỉ, cúc), kế hoạch chuyền may.',
    action: 'Sinh Lệnh sản xuất (LSX)',
    status: 'pending',
  },
  {
    step: '03',
    id: 'PH3',
    title: 'Mua hàng & Cung ứng',
    code: 'purchasing',
    icon: ShoppingCart,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    desc: 'Lập PO mua vải/phụ liệu dệt may từ các NCC uy tín.',
    action: 'Phát hành đơn mua hàng (PO)',
    status: 'pending',
  },
  {
    step: '04',
    id: 'PH4',
    title: 'Kho & Quản lý vật tư',
    code: 'warehouse',
    icon: Warehouse,
    color: 'text-red-700 bg-red-50 border-red-200 ring-2 ring-red-400/40',
    desc: 'Nhập kho NPL, kiểm soát lô/cây vải FEFO, xuất chuyền may.',
    action: 'Phiếu Nhập/Xuất/Chuyển/Kiểm kê',
    status: 'active',
  },
  {
    step: '05',
    id: 'PH5',
    title: 'Tài chính & Giá thành',
    code: 'accounting',
    icon: Calculator,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    desc: 'Hạch toán kho tự động, công nợ NCC & giá thành sản phẩm.',
    action: 'Bút toán sổ cái & Báo cáo tài chính',
    status: 'pending',
  },
];

export default function ERPOverview() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-gray-100">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-may10-primary" />
            Luồng Nghiệp Vụ Tích Hợp Xuyên Suốt Chuỗi Cung Ứng May 10
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Mô hình dữ liệu tập trung duy nhất (PostgreSQL <code>erp_may10</code>) loại bỏ hoàn toàn sự phân mảnh thông tin giữa các phòng ban.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Kho & Vật tư: Active
          </span>
          <span className="flex items-center gap-1 text-amber-700 font-semibold px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Các phân hệ sẵn sàng
          </span>
        </div>
      </div>

      {/* Process Flow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-6 relative">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isWarehouse = step.id === 'PH4';

          return (
            <div
              key={step.id}
              className={`relative rounded-xl p-4 border transition-all ${
                isWarehouse
                  ? 'bg-gradient-to-b from-red-50/70 to-white border-red-300 shadow-md ring-2 ring-red-500/20'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {/* Step indicator */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  BƯỚC {step.step}
                </span>
                {step.status === 'active' ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    Hoạt động
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    Sẵn sàng
                  </span>
                )}
              </div>

              {/* Icon & Title */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${step.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  {step.id !== 'PH3' && step.id !== 'PH4' && (
                    <div className="text-[11px] font-bold text-gray-500">{step.id}</div>
                  )}
                  <h3 className="text-xs font-bold text-gray-900 leading-tight truncate">
                    {step.title}
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-[11px] text-gray-600 leading-relaxed mb-3">
                {step.desc}
              </p>

              {/* Output Result */}
              <div className="pt-2 border-t border-gray-100">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Đầu ra:
                </div>
                <div className="text-[11px] font-medium text-gray-800 mt-0.5">
                  {step.action}
                </div>
              </div>

              {/* Connector Arrow (on Desktop) */}
              {idx < STEPS.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-gray-200 items-center justify-center shadow-xs text-gray-400 pointer-events-none">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Database Guarantee Box */}
      <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-may10-primary flex-shrink-0" />
          <span>
            <strong>Đặc tính kiến trúc:</strong> Khóa ngoại (Foreign Keys) giữa <code>don_mua_hang</code> (PH3), <code>lenh_san_xuat</code> (PH2), <code>don_ban_hang</code> (PH1) đã liên kết đầy đủ vào các bảng chứng từ kho PH4 (<code>phieu_nhap_kho</code>, <code>phieu_xuat_kho</code>).
          </span>
        </div>
        <span className="font-mono text-[11px] text-gray-500 font-semibold bg-white px-2 py-1 rounded border border-gray-200 flex-shrink-0">
          Schema: public • 41 Tables
        </span>
      </div>
    </div>
  );
}
