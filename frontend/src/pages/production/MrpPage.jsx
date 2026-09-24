import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Calculator,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Info,
  CalendarDays,
  Warehouse,
  X,
} from 'lucide-react';
import {
  getProductionPlans,
  calculateMrp,
  getMrpRequirements,
  createPrFromMrp,
  getMrpStockByMaterial,
} from '../../services/productionService';

export default function MrpPage({ showToast }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [mrpItems, setMrpItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creatingPr, setCreatingPr] = useState(false);
  const [stockDetail, setStockDetail] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);

  const fetchPlans = async () => {
    try {
      const res = await getProductionPlans();
      const list = (res?.data || []).filter((p) => ['da_duyet', 'dang_thuc_hien', 'tam_dung'].includes(p.trang_thai));
      setPlans(list);
    } catch (err) {
      console.error('Lỗi tải danh sách kế hoạch:', err);
    }
  };

  const fetchMrpData = async (planId = '') => {
    try {
      setLoading(true);
      const res = await getMrpRequirements(planId ? { ke_hoach_id: planId } : {});
      setMrpItems(res?.data || []);
    } catch (err) {
      console.error('Lỗi tính toán MRP:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: err.response?.data?.message || 'Không thể tính MRP từ hệ thống.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchMrpData();
  }, []);

  const handlePlanChange = (planId) => {
    setSelectedPlanId(planId);
    fetchMrpData(planId);
  };

  const shortageItems = mrpItems.filter((m) => Number(m.so_luong_can_mua) > 0);

  const handleViewWarehouseStock = async (item) => {
    try {
      setStockLoading(true);
      const res = await getMrpStockByMaterial(item.ma_vat_tu);
      setStockDetail(res?.data || null);
    } catch (err) {
      console.error('Lỗi tải tồn kho theo kho:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: err.response?.data?.message || 'Không thể lấy chi tiết tồn kho từ phân hệ Kho.',
        });
      }
    } finally {
      setStockLoading(false);
    }
  };

  // Tạo PR cho một vật tư cụ thể
  const handleCreatePrSingle = async (item) => {
    if (!window.confirm(`Xác nhận tạo Yêu cầu mua sắm (PR) cho vật tư [${item.ten_vat_tu}] với số lượng thiếu ${item.so_luong_can_mua} ${item.don_vi_tinh}?`)) {
      return;
    }
    try {
      setCreatingPr(true);
      const res = await createPrFromMrp({
        ma_vat_tu: item.ma_vat_tu,
        ma_ke_hoach_san_xuat: selectedPlanId ? Number(selectedPlanId) : undefined,
        so_luong_yeu_cau: Number(item.so_luong_can_mua),
        ghi_chu: `Bổ sung thiếu hụt MRP cho vật tư ${item.ten_vat_tu} (${item.ma_vat_tu_code || item.ma_vat_tu})`,
      });
      const prCode = res.data?.ma_yeu_cau_mua || 'PR Mới';
      if (showToast) {
        showToast({
          type: 'success',
          message: `Đã phát hành Yêu cầu mua sắm [${prCode}] chuyển tiếp sang Phân hệ Mua Hàng (PH3)!`,
        });
      }
      fetchMrpData(selectedPlanId);
    } catch (err) {
      console.error('Lỗi tạo PR từ MRP:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: err.response?.data?.message || 'Lỗi phát hành PR sang PH3.',
        });
      }
    } finally {
      setCreatingPr(false);
    }
  };

  // Tạo PR cho toàn bộ danh sách thiếu hụt
  const handleCreatePrAll = async () => {
    if (shortageItems.length === 0) {
      if (showToast) showToast({ type: 'info', message: 'Tồn kho đủ đáp ứng, không có vật tư thiếu hụt!' });
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn tự động phát hành Yêu cầu mua sắm (PR) sang PH3 cho toàn bộ ${shortageItems.length} mặt hàng còn thiếu?`)) {
      return;
    }
    try {
      setCreatingPr(true);
      let successCount = 0;
      for (const item of shortageItems) {
        await createPrFromMrp({
          ma_vat_tu: item.ma_vat_tu,
          ma_ke_hoach_san_xuat: selectedPlanId ? Number(selectedPlanId) : undefined,
          so_luong_yeu_cau: Number(item.so_luong_can_mua),
          ghi_chu: `Bổ sung thiếu hụt MRP cho ${item.ten_vat_tu}`,
        });
        successCount++;
      }
      if (showToast) {
        showToast({
          type: 'success',
          message: `Đã phát hành thành công ${successCount} Yêu cầu mua sắm sang Phân hệ Mua Hàng (PH3)!`,
        });
      }
      fetchMrpData(selectedPlanId);
    } catch (err) {
      console.error('Lỗi tạo PR hàng loạt:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: err.response?.data?.message || 'Lỗi phát hành PR sang PH3.',
        });
      }
    } finally {
      setCreatingPr(false);
    }
  };

  const selectedPlan = plans.find((p) => String(p.id) === String(selectedPlanId));

  return (
    <div className="space-y-6">
      {/* Selector & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#0F5FAF]" />
            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Kế hoạch SX:</label>
          </div>
          <select
            value={selectedPlanId}
            onChange={(e) => handlePlanChange(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F5FAF] w-full sm:w-80"
          >
            <option value="">-- Toàn bộ KHSX đang hoạt động --</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.ma_ke_hoach}] {p.ten_san_pham} ({p.so_luong_ke_hoach || p.so_luong} SP - {p.trang_thai})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchMrpData(selectedPlanId)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Chạy lại MRP</span>
          </button>

          <button
            onClick={handleCreatePrAll}
            disabled={creatingPr || shortageItems.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Tạo PR PH3 ({shortageItems.length} NPL thiếu)</span>
          </button>
        </div>
      </div>

      {/* Formula Explanation Card */}
      <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#0F5FAF] shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-blue-950 mb-1">Thuật toán Hoạch định Nhu cầu Nguyên liệu (MRP May 10):</h4>
          <p className="leading-relaxed">
            1. <strong>Nhu cầu tổng (Gross Req)</strong> = $\sum$ [Số lượng KHSX $\times$ Định mức BOM $\times$ (1 + % Hao hụt)]<br />
            2. <strong>Tồn kho khả dụng</strong> = Tổng tồn kho thực tế tại Kho May 10 (PH4: `ton_kho.so_luong_ton`)<br />
            3. <strong>Thiếu hụt ròng (Net Req)</strong> = Max(0, Nhu cầu tổng - Tồn khả dụng). Khi thiếu hụt &gt; 0, hệ thống cho phép phát hành Phiếu PR chuyển thẳng sang Phân hệ Mua hàng (PH3).
          </p>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 text-[#0F5FAF] animate-spin" />
          <span className="ml-3 text-sm font-medium text-slate-600">Đang phân tích định mức BOM và tồn kho thực tế...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview banner */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 font-medium">Phạm vi hoạch định</span>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="text-[#0F5FAF]">
                  {selectedPlan ? selectedPlan.ma_ke_hoach : 'Tất cả Kế hoạch đang thực hiện'}
                </span>
                {selectedPlan && (
                  <>
                    <span className="text-slate-400 font-normal">|</span>
                    <span>{selectedPlan.ten_san_pham}</span>
                  </>
                )}
              </h3>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-slate-500">Tổng chủng loại NPL:</span>
                <div className="font-bold text-slate-900 text-sm">{mrpItems.length} loại vật tư</div>
              </div>
              <div>
                <span className="text-slate-500">Trạng thái cân đối kho:</span>
                <div className={`font-bold text-sm ${shortageItems.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {shortageItems.length > 0 ? `Thiếu ${shortageItems.length} loại NPL` : 'Đủ vật tư sản xuất'}
                </div>
              </div>
            </div>
          </div>

          {/* MRP Calculation Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Chi tiết đối soát Nhu cầu vs Tồn kho thực tế (PH4)</h3>
              <span className="text-xs text-slate-500">{mrpItems.length} nguyên phụ liệu</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Mã NPL</th>
                    <th className="px-4 py-3">Tên vật tư</th>
                    <th className="px-4 py-3 text-right">Nhu cầu tổng (Gross)</th>
                    <th className="px-4 py-3 text-right">Tồn khả dụng (Kho PH4)</th>
                    <th className="px-4 py-3 text-right">Thiếu hụt ròng (Net)</th>
                    <th className="px-4 py-3 text-center">Tình trạng</th>
                    <th className="px-4 py-3 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mrpItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                        Chưa có dữ liệu hoạch định nguyên liệu cho các kế hoạch hiện tại
                      </td>
                    </tr>
                  ) : (
                    mrpItems.map((m) => {
                      const shortage = Number(m.so_luong_can_mua) || 0;
                      const isShort = shortage > 0;
                      return (
                        <tr key={m.ma_vat_tu} className={`hover:bg-slate-50/70 transition-colors ${isShort ? 'bg-amber-50/30' : ''}`}>
                          <td className="px-4 py-3 font-mono font-medium text-slate-700">{m.ma_vat_tu_code || m.ma_vat_tu}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{m.ten_vat_tu}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            {new Intl.NumberFormat('vi-VN').format(m.so_luong_can)} {m.don_vi_tinh || 'm'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">
                            {new Intl.NumberFormat('vi-VN').format(m.so_luong_ton_kho)} {m.don_vi_tinh || 'm'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            {isShort ? (
                              <span className="text-amber-600">
                                -{new Intl.NumberFormat('vi-VN').format(shortage)} {m.don_vi_tinh || 'm'}
                              </span>
                            ) : (
                              <span className="text-emerald-600">0 {m.don_vi_tinh || 'm'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isShort ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Thiếu NVL
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Đủ tồn kho
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleViewWarehouseStock(m)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium transition-colors border border-slate-200"
                                title="Xem tồn kho chi tiết theo từng kho của PH4"
                              >
                                <Warehouse className="w-3.5 h-3.5 text-[#0F5FAF]" />
                                <span>Kho</span>
                              </button>
                              {isShort ? (
                                <button
                                  onClick={() => handleCreatePrSingle(m)}
                                  disabled={creatingPr}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium transition-colors border border-amber-200 disabled:opacity-50"
                                  title="Tạo PR sang PH3 cho vật tư này"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  <span>Tạo PR</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal tra cứu tồn kho theo kho từ PH4 (Read-Only) */}
      {stockDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" onClick={() => setStockDetail(null)}>
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-[#0F5FAF]" />
                  <h3 className="font-bold text-slate-900">Tồn kho theo từng kho — PH4</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">Mã VT: <strong>{stockDetail.ma_vat_tu}</strong> · Tổng tồn kho: <strong>{new Intl.NumberFormat('vi-VN').format(stockDetail.tong_ton_kho || 0)}</strong></p>
              </div>
              <button onClick={() => setStockDetail(null)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-5">
              {stockLoading ? (
                <div className="py-10 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0F5FAF]" />
                  <span>Đang lấy dữ liệu tồn kho từ PH4...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left">Mã kho</th>
                        <th className="px-3 py-2 text-left">Tên kho</th>
                        <th className="px-3 py-2 text-right">Số lượng tồn</th>
                        <th className="px-3 py-2 text-left">Ngày cập nhật</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(stockDetail.warehouses || []).map((row) => (
                        <tr key={row.ma_kho}>
                          <td className="px-3 py-2 font-mono font-medium text-slate-700">{row.ma_kho_code || row.ma_kho}</td>
                          <td className="px-3 py-2 font-medium">{row.ten_kho}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">
                            {new Intl.NumberFormat('vi-VN').format(row.so_luong_ton)} {row.don_vi_tinh || ''}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {row.ngay_cap_nhat ? new Date(row.ngay_cap_nhat).toLocaleString('vi-VN') : '—'}
                          </td>
                        </tr>
                      ))}
                      {(stockDetail.warehouses || []).length === 0 && (
                        <tr>
                          <td colSpan="4" className="px-3 py-8 text-center text-slate-400">Chưa có dữ liệu tồn kho cho vật tư này tại PH4.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
              Dữ liệu được đọc trực tiếp (Read-Only) từ bảng <code>ton_kho</code> của Phân hệ Kho (PH4). Phân hệ Sản xuất không tự ý ghi/sửa dữ liệu tồn kho.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
