import React from 'react';
import {
  FileText,
  CalendarDays,
  ShoppingCart,
  Warehouse,
  Factory,
  PackageCheck,
  Calculator,
  BarChart3,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

const WORKFLOW_STEPS = [
  { id: 1, name: 'Đơn hàng', icon: FileText, code: 'PH1 Kinh doanh' },
  { id: 2, name: 'Kế hoạch sản xuất', icon: CalendarDays, code: 'PH2 Kế hoạch' },
  { id: 3, name: 'Mua NPL', icon: ShoppingCart, code: 'Mua hàng' },
  { id: 4, name: 'Nhập kho & NPL', icon: Warehouse, code: 'Đang chạy', isActive: true },
  { id: 5, name: 'Chuyền may', icon: Factory, code: 'PH2 Sản xuất' },
  { id: 6, name: 'Xuất kho TP', icon: PackageCheck, code: 'Thành phẩm' },
  { id: 7, name: 'Tài chính', icon: Calculator, code: 'PH5 Định khoản' },
  { id: 8, name: 'Báo cáo & BI', icon: BarChart3, code: 'Điều hành' },
];

export default function Workflow() {
  return (
    <div className="bg-white rounded-xl border border-[#DCEAF4] p-5 sm:p-6 shadow-2xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DCEAF4] mb-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033] flex items-center gap-2">
            <span>QUY TRÌNH VẬN HÀNH</span>
            <span className="text-[10px] font-normal text-[#6B7785] lowercase">(supply chain workflow)</span>
          </h2>
          <p className="text-xs text-[#6B7785] mt-0.5">
            Chuỗi cung ứng dệt may liên thông từ đơn hàng đến kho vận, sản xuất và tài chính May 10
          </p>
        </div>
        <span className="text-[10px] font-semibold text-[#0F5FAF] bg-[#EAF5FC] px-2.5 py-0.5 rounded-full border border-[#DCEAF4] self-start sm:self-auto">
          8 Công đoạn cốt lõi
        </span>
      </div>

      {/* Desktop Horizontal Stepper with Connectors */}
      <div className="hidden lg:flex items-center justify-between gap-1.5">
        {WORKFLOW_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === WORKFLOW_STEPS.length - 1;

          return (
            <React.Fragment key={step.id}>
              <div
                className={`relative flex-1 p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-between min-h-[105px] ${
                  step.isActive
                    ? 'border-[#0F5FAF] bg-[#EAF5FC] shadow-2xs ring-1 ring-[#0F5FAF]/30'
                    : 'border-[#DCEAF4] bg-[#F9FBFC] hover:bg-[#F4FAFE] hover:border-[#96C8EB]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[9px] font-mono text-[#6B7785]">0{step.id}</span>
                  <span
                    className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      step.isActive
                        ? 'bg-[#0F5FAF] text-white'
                        : 'bg-white text-[#6B7785] border border-[#DCEAF4]'
                    }`}
                  >
                    {step.code}
                  </span>
                </div>

                <div
                  className={`p-1.5 rounded-lg mb-1.5 ${
                    step.isActive
                      ? 'bg-[#0F5FAF] text-white shadow-2xs'
                      : 'bg-white text-[#0F4C81] border border-[#DCEAF4]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div
                  className={`text-[11px] font-bold leading-tight ${
                    step.isActive ? 'text-[#0F5FAF]' : 'text-[#172033]'
                  }`}
                >
                  {step.name}
                </div>
              </div>

              {!isLast && (
                <div className="flex items-center justify-center flex-shrink-0 text-[#96C8EB]">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile / Tablet Grid Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-2">
        {WORKFLOW_STEPS.map((step) => {
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                step.isActive
                  ? 'border-[#0F5FAF] bg-[#EAF5FC] ring-1 ring-[#0F5FAF]/20'
                  : 'border-[#DCEAF4] bg-[#F9FBFC]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-[#6B7785]">
                  0{step.id}
                </span>
                <div
                  className={`p-1.5 rounded-lg ${
                    step.isActive
                      ? 'bg-[#0F5FAF] text-white'
                      : 'bg-white text-[#0F4C81] border border-[#DCEAF4]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`text-xs font-bold ${
                    step.isActive ? 'text-[#0F5FAF]' : 'text-[#172033]'
                  }`}
                >
                  {step.name}
                </span>
              </div>

              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  step.isActive
                    ? 'bg-[#0F5FAF] text-white'
                    : 'bg-white text-[#6B7785] border border-[#DCEAF4]'
                }`}
              >
                {step.code}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

