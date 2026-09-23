import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Factory,
  ShoppingCart,
  Warehouse,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import { ERP_MODULES } from '../../config/modules';
import { useAuth } from '../rbac/AuthContext';

const ICON_COMPONENTS = {
  ShoppingBag,
  Factory,
  ShoppingCart,
  Warehouse,
  Calculator,
};

export default function ModuleCards() {
  const navigate = useNavigate();
  const { hasPermission, role } = useAuth();

  const handleModuleClick = (mod) => {
    const isAllowed = hasPermission(mod.requiredPermission);
    if (!isAllowed && role !== 'admin') {
      navigate('/403', {
        state: {
          requiredPermission: mod.requiredPermission,
          moduleName: mod.name,
        },
      });
      return;
    }
    navigate(mod.route);
  };

  return (
    <div className="mb-6">
      <div className="pb-3 mb-3.5 border-b border-[#DCEAF4] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033] flex items-center gap-2">
            <span>CÁC PHÂN HỆ</span>
            <span className="text-[10px] font-normal text-[#6B7785] lowercase">(core modules)</span>
          </h2>
          <p className="text-xs text-[#6B7785] mt-0.5">
            5 phân hệ quản trị doanh nghiệp cốt lõi của Tổng Công ty May 10
          </p>
        </div>
        <span className="text-[11px] text-[#6B7785]">
          Phân quyền theo vai trò người dùng
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {ERP_MODULES.map((mod) => {
          const Icon = ICON_COMPONENTS[mod.icon] || Warehouse;
          const isOperational = mod.status === 'active';

          return (
            <div
              key={mod.id}
              onClick={() => handleModuleClick(mod)}
              className={`bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between cursor-pointer transition-all ${
                isOperational
                  ? 'border-[#96C8EB] hover:border-[#0F5FAF] hover:shadow-xs ring-1 ring-[#96C8EB]/30'
                  : 'border-[#DCEAF4] opacity-85 hover:opacity-100 hover:border-[#96C8EB]'
              }`}
            >
              <div>
                {/* Header: Module Code & Status Badge */}
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  {mod.id !== 'PH3' && mod.id !== 'PH4' ? (
                    <span className="text-xs font-bold text-[#172033] font-mono">
                      {mod.id}
                    </span>
                  ) : <span />}

                  <span
                    className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                      isOperational
                        ? 'bg-emerald-50 text-[#16A878] border border-emerald-200/60'
                        : 'bg-[#F4FAFE] text-[#6B7785] border border-[#DCEAF4]'
                    }`}
                  >
                    {isOperational ? 'Đang vận hành' : 'Đang triển khai'}
                  </span>
                </div>

                {/* Module Title & Icon */}
                <div className="flex items-start gap-2.5 mb-2">
                  <div
                    className={`p-1.5 rounded-lg flex-shrink-0 ${
                      isOperational
                        ? 'bg-[#EAF5FC] text-[#0F5FAF]'
                        : 'bg-[#F4FAFE] text-[#6B7785]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#172033] leading-snug">
                      {mod.name}
                    </h3>
                  </div>
                </div>

                <p className="text-[11px] text-[#6B7785] mt-1 leading-relaxed line-clamp-3">
                  {mod.description}
                </p>
              </div>

              {/* Action link */}
              <div className="mt-3 pt-2.5 border-t border-[#DCEAF4]/60 flex items-center justify-between text-xs">
                <span className="text-[10px] text-[#6B7785] font-medium">
                  {isOperational ? '8 quy trình kho' : 'Chuẩn bị dữ liệu'}
                </span>

                <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-[#0F5FAF]">
                  <span>{isOperational ? 'Vào phân hệ' : 'Xem chi tiết'}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
