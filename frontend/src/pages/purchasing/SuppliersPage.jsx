import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Eye,
  Star,
  Phone,
  Mail,
  MapPin,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  FileText,
  Award,
  Calendar,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import {
  getSuppliers,
  getSupplierDetail,
  createSupplier,
  updateSupplier,
  getSupplierEvaluations,
  createSupplierEvaluation,
} from '../../services/purchasingService';

export default function SuppliersPage({ showToast }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierDetailData, setSupplierDetailData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);

  // Detail Modal Tab state: 'info', 'orders', 'evaluations'
  const [detailTab, setDetailTab] = useState('info');
  const [evaluations, setEvaluations] = useState([]);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [evalSubmitting, setEvalSubmitting] = useState(false);
  const [evalErrors, setEvalErrors] = useState([]);
  const [evalFormData, setEvalFormData] = useState({
    diem_chat_luong: 8.5,
    diem_tien_do: 9.0,
    diem_gia_ca: 8.0,
    nhan_xet: '',
    khuyen_nghi: 'tiep_tuc_hop_tac',
  });

  // Supplier Form state
  const [formData, setFormData] = useState({
    ma_nha_cung_cap: '',
    ten_nha_cung_cap: '',
    ma_so_thue: '',
    so_gpkd: '',
    dia_chi: '',
    quoc_gia: 'Viet Nam',
    nguoi_lien_he: '',
    so_dien_thoai: '',
    email: '',
    so_tai_khoan_ngan_hang: '',
    ten_ngan_hang: '',
    chi_nhanh_ngan_hang: '',
    loai_hang_cung_cap: '',
    han_muc_tin_dung: 0,
    so_ngay_gia_han: 30,
    diem_danh_gia: 0,
    trang_thai: 'hoat_dong',
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await getSuppliers({
        search: searchTerm || undefined,
        trang_thai: statusFilter || undefined,
      });
      setSuppliers(res.data || []);
    } catch (err) {
      console.error('Lỗi nạp danh sách nhà cung cấp:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: 'Không thể tải danh sách nhà cung cấp.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSuppliers();
  };

  const handleOpenCreateModal = () => {
    setFormData({
      ma_nha_cung_cap: '',
      ten_nha_cung_cap: '',
      ma_so_thue: '',
      so_gpkd: '',
      dia_chi: '',
      quoc_gia: 'Viet Nam',
      nguoi_lien_he: '',
      so_dien_thoai: '',
      email: '',
      so_tai_khoan_ngan_hang: '',
      ten_ngan_hang: '',
      chi_nhanh_ngan_hang: '',
      loai_hang_cung_cap: '',
      han_muc_tin_dung: 100000000,
      so_ngay_gia_han: 30,
      diem_danh_gia: 8.5,
      trang_thai: 'hoat_dong',
    });
    setFormErrors([]);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      ten_nha_cung_cap: supplier.ten_nha_cung_cap || '',
      ma_so_thue: supplier.ma_so_thue || '',
      so_gpkd: supplier.so_gpkd || '',
      dia_chi: supplier.dia_chi || '',
      quoc_gia: supplier.quoc_gia || 'Viet Nam',
      nguoi_lien_he: supplier.nguoi_lien_he || '',
      so_dien_thoai: supplier.so_dien_thoai || '',
      email: supplier.email || '',
      so_tai_khoan_ngan_hang: supplier.so_tai_khoan_ngan_hang || '',
      ten_ngan_hang: supplier.ten_ngan_hang || '',
      chi_nhanh_ngan_hang: supplier.chi_nhanh_ngan_hang || '',
      loai_hang_cung_cap: supplier.loai_hang_cung_cap || '',
      han_muc_tin_dung: supplier.han_muc_tin_dung || 0,
      so_ngay_gia_han: supplier.so_ngay_gia_han || 30,
      diem_danh_gia: supplier.diem_danh_gia || 0,
      trang_thai: supplier.trang_thai || 'hoat_dong',
    });
    setFormErrors([]);
    setIsEditModalOpen(true);
  };

  const loadEvaluations = async (supplierId) => {
    try {
      setLoadingEvaluations(true);
      const data = await getSupplierEvaluations(supplierId);
      setEvaluations(data || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách đánh giá NCC:', err);
    } finally {
      setLoadingEvaluations(false);
    }
  };

  const handleOpenDetailModal = async (supplier) => {
    setSelectedSupplier(supplier);
    setDetailTab('info');
    setIsDetailModalOpen(true);
    try {
      const detail = await getSupplierDetail(supplier.id);
      setSupplierDetailData(detail);
      loadEvaluations(supplier.id);
    } catch (err) {
      console.error('Lỗi lấy chi tiết nhà cung cấp:', err);
    }
  };

  const validateSupplierForm = () => {
    const errors = [];
    const cleanTax = (formData.ma_so_thue || '').trim();
    if (!cleanTax) {
      errors.push('Mã số thuế là bắt buộc.');
    } else if (!/^[0-9]{10}(-[0-9]{3})?$|^[0-9]{13}$/.test(cleanTax)) {
      errors.push('Mã số thuế không đúng định dạng (chuẩn 10 số hoặc 13 số, VD: 0101234567 hoặc 0101234567-001).');
    }

    const cleanGpkd = (formData.so_gpkd || '').trim();
    if (!cleanGpkd) {
      errors.push('Số GPKD / ĐKKD là bắt buộc.');
    } else if (!/^[A-Za-z0-9\-_]{5,30}$/.test(cleanGpkd)) {
      errors.push('Số GPKD / ĐKKD phải từ 5-30 ký tự (chữ cái, chữ số, gạch nối).');
    }

    const cleanPhone = (formData.so_dien_thoai || '').trim().replace(/[\s.-]/g, '');
    if (!cleanPhone) {
      errors.push('Số điện thoại là bắt buộc.');
    } else if (!/^(0|\+84)(2[0-9]{8,9}|[35789][0-9]{8})$/.test(cleanPhone)) {
      errors.push('Số điện thoại không đúng định dạng Việt Nam hợp lệ (VD: 0912345678, 0283896012).');
    }

    if (!formData.ten_nha_cung_cap?.trim()) {
      errors.push('Tên nhà cung cấp là bắt buộc.');
    }
    if (!formData.dia_chi?.trim()) {
      errors.push('Địa chỉ trụ sở là bắt buộc.');
    }
    if (!formData.nguoi_lien_he?.trim()) {
      errors.push('Người đại diện liên hệ là bắt buộc.');
    }
    if (!formData.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.push('Email giao dịch không đúng định dạng hợp lệ.');
    }

    return errors;
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    const clientErrors = validateSupplierForm();
    if (clientErrors.length > 0) {
      setFormErrors(clientErrors);
      return;
    }
    setSubmitting(true);
    setFormErrors([]);
    try {
      await createSupplier(formData);
      setIsCreateModalOpen(false);
      if (showToast) {
        showToast({
          type: 'success',
          message: `Đã tạo mới nhà cung cấp "${formData.ten_nha_cung_cap}" thành công.`,
        });
      }
      fetchSuppliers();
    } catch (err) {
      const errRes = err.response?.data;
      if (errRes?.errors) {
        setFormErrors(errRes.errors);
      } else {
        setFormErrors([errRes?.message || 'Lỗi tạo nhà cung cấp.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    const clientErrors = validateSupplierForm();
    if (clientErrors.length > 0) {
      setFormErrors(clientErrors);
      return;
    }
    setSubmitting(true);
    setFormErrors([]);
    try {
      await updateSupplier(selectedSupplier.id, formData);
      setIsEditModalOpen(false);
      if (showToast) {
        showToast({
          type: 'success',
          message: `Đã cập nhật thông tin nhà cung cấp thành công.`,
        });
      }
      fetchSuppliers();
    } catch (err) {
      const errRes = err.response?.data;
      if (errRes?.errors) {
        setFormErrors(errRes.errors);
      } else {
        setFormErrors([errRes?.message || 'Lỗi cập nhật nhà cung cấp.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    setEvalSubmitting(true);
    setEvalErrors([]);
    try {
      await createSupplierEvaluation(selectedSupplier.id, {
        ...evalFormData,
        diem_chat_luong: parseFloat(evalFormData.diem_chat_luong),
        diem_tien_do: parseFloat(evalFormData.diem_tien_do),
        diem_gia_ca: parseFloat(evalFormData.diem_gia_ca),
      });
      if (showToast) {
        showToast({
          type: 'success',
          message: 'Đã lưu đánh giá nhà cung cấp thành công.',
        });
      }
      setIsEvalModalOpen(false);
      loadEvaluations(selectedSupplier.id);
      fetchSuppliers();
    } catch (err) {
      const errRes = err.response?.data;
      if (errRes?.errors) {
        setEvalErrors(errRes.errors);
      } else {
        setEvalErrors([errRes?.message || 'Lỗi gửi đánh giá NCC.']);
      }
    } finally {
      setEvalSubmitting(false);
    }
  };

  const formatCurrency = (num) => {
    if (!num && num !== 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Bar */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã NCC, email, SĐT, ngân hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#0F5FAF]"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-[#F4FAFE] text-[#0F5FAF] rounded-xl text-xs font-semibold hover:bg-[#EAF5FC] border border-[#DCEAF4] transition-colors"
          >
            Tìm
          </button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white text-[#172033] focus:outline-none focus:border-[#0F5FAF]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="hoat_dong">Đang hoạt động</option>
            <option value="tam_ngung">Tạm ngưng</option>
            <option value="ngung_giao_dich">Ngừng giao dịch</option>
          </select>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0F5FAF] text-white rounded-xl text-xs font-semibold hover:bg-[#0A2540] transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm nhà cung cấp</span>
          </button>
        </div>
      </div>

      {/* Table of Suppliers */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-[#0F5FAF] animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#5F6F82]">Đang tải dữ liệu nhà cung cấp...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5F6F82]">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            Chưa có dữ liệu nhà cung cấp
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F4FAFE] text-[#5F6F82]">
                  <th className="py-3 px-3.5 font-semibold">Mã NCC</th>
                  <th className="py-3 px-3.5 font-semibold">Tên công ty</th>
                  <th className="py-3 px-3.5 font-semibold">Liên hệ</th>
                  <th className="py-3 px-3.5 font-semibold">Tài khoản ngân hàng</th>
                  <th className="py-3 px-3.5 font-semibold">Mặt hàng</th>
                  <th className="py-3 px-3.5 font-semibold">Hạn mức tín dụng</th>
                  <th className="py-3 px-3.5 font-semibold">Đánh giá</th>
                  <th className="py-3 px-3.5 font-semibold">Trạng thái</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((ncc) => (
                  <tr key={ncc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-[#0F5FAF]">
                      {ncc.ma_nha_cung_cap}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-[#172033]">{ncc.ten_nha_cung_cap}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-xs">{ncc.dia_chi}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700">
                      <div className="font-medium text-[#172033]">{ncc.nguoi_lien_he}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {ncc.so_dien_thoai}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {ncc.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700">
                      {ncc.so_tai_khoan_ngan_hang ? (
                        <div>
                          <span className="font-mono font-bold text-slate-800">{ncc.so_tai_khoan_ngan_hang}</span>
                          <div className="text-[11px] text-slate-500">{ncc.ten_ngan_hang}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa cập nhật</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 max-w-[140px] truncate">
                      {ncc.loai_hang_cung_cap || '—'}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-[#172033]">
                      <div>{formatCurrency(ncc.han_muc_tin_dung)}</div>
                      <div className="text-[11px] text-slate-400">{ncc.so_ngay_gia_han} ngày nợ</div>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-1 text-amber-600 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{parseFloat(ncc.diem_danh_gia || 0).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      {ncc.trang_thai === 'hoat_dong' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Hoạt động
                        </span>
                      ) : ncc.trang_thai === 'tam_ngung' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Tạm ngưng
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          Ngừng GD
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetailModal(ncc)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#0F5FAF] hover:bg-[#EAF5FC] transition-colors"
                          title="Xem chi tiết & Đánh giá"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(ncc)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#0F5FAF] hover:bg-[#EAF5FC] transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Tạo mới / Chỉnh sửa Nhà cung cấp */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#172033]">
                {isCreateModalOpen ? 'Thêm mới Nhà cung cấp' : 'Chỉnh sửa thông tin Nhà cung cấp'}
              </h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={isCreateModalOpen ? handleCreateSupplier : handleUpdateSupplier} className="p-5 space-y-4">
              {formErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Vui lòng kiểm tra lại thông tin:</span>
                  </div>
                  <ul className="list-disc list-inside pl-1 space-y-0.5">
                    {formErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Nhóm 1: Thông tin cơ bản */}
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-[#0F5FAF] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>1. Thông tin doanh nghiệp & Liên hệ</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {isCreateModalOpen && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Mã NCC (tự sinh nếu trống)</label>
                      <input
                        type="text"
                        placeholder="NCC-2026-..."
                        value={formData.ma_nha_cung_cap}
                        onChange={(e) => setFormData({ ...formData, ma_nha_cung_cap: e.target.value })}
                        className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                      />
                    </div>
                  )}

                  <div className={isCreateModalOpen ? '' : 'sm:col-span-2'}>
                    <label className="block font-semibold text-slate-700 mb-1">Tên nhà cung cấp *</label>
                    <input
                      type="text"
                      required
                      placeholder="Công ty Cổ phần / TNHH..."
                      value={formData.ten_nha_cung_cap}
                      onChange={(e) => setFormData({ ...formData, ten_nha_cung_cap: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mã số thuế *</label>
                    <input
                      type="text"
                      required
                      placeholder="0101234567"
                      pattern="[0-9]{10}(-[0-9]{3})?|[0-9]{13}"
                      title="Mã số thuế gồm 10 số (doanh nghiệp) hoặc 13 số (chi nhánh). Ví dụ: 0101234567 hoặc 0101234567-001"
                      value={formData.ma_so_thue}
                      onChange={(e) => setFormData({ ...formData, ma_so_thue: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">10 hoặc 13 chữ số (VD: 0101234567, 0101234567-001)</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Số GPKD / ĐKKD *</label>
                    <input
                      type="text"
                      required
                      placeholder="0101234567-GP"
                      pattern="[A-Za-z0-9\-_]{5,30}"
                      title="Số giấy phép kinh doanh / ĐKKD từ 5-30 ký tự"
                      value={formData.so_gpkd}
                      onChange={(e) => setFormData({ ...formData, so_gpkd: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Chữ, số, gạch nối (VD: 0101234567-GP)</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Người đại diện liên hệ *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={formData.nguoi_lien_he}
                      onChange={(e) => setFormData({ ...formData, nguoi_lien_he: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Số điện thoại *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0912345678"
                      pattern="^(0|\+84)(2[0-9]{8,9}|[35789][0-9]{8})$"
                      title="Số điện thoại di động (10 số, đầu 03, 05, 07, 08, 09) hoặc cố định (đầu 02)"
                      value={formData.so_dien_thoai}
                      onChange={(e) => setFormData({ ...formData, so_dien_thoai: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Định dạng VN 10 số (VD: 0912345678, 0283896012)</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email giao dịch *</label>
                    <input
                      type="email"
                      required
                      placeholder="contact@supplier.vn"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mặt hàng cung cấp</label>
                    <input
                      type="text"
                      placeholder="Vải dệt thoi, phụ liệu may mặc..."
                      value={formData.loai_hang_cung_cap}
                      onChange={(e) => setFormData({ ...formData, loai_hang_cung_cap: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Địa chỉ trụ sở *</label>
                    <input
                      type="text"
                      required
                      placeholder="Số 10, Đường ABC, TP. Hà Nội"
                      value={formData.dia_chi}
                      onChange={(e) => setFormData({ ...formData, dia_chi: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                    />
                  </div>
                </div>
              </div>

              {/* Nhóm 2: Thông tin tài khoản ngân hàng */}
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-[#0F5FAF] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>2. Thông tin thanh toán & Ngân hàng</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Số tài khoản ngân hàng</label>
                    <input
                      type="text"
                      placeholder="19038291823901"
                      value={formData.so_tai_khoan_ngan_hang}
                      onChange={(e) => setFormData({ ...formData, so_tai_khoan_ngan_hang: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tên ngân hàng</label>
                    <input
                      type="text"
                      placeholder="Vietcombank / Techcombank / BIDV"
                      value={formData.ten_ngan_hang}
                      onChange={(e) => setFormData({ ...formData, ten_ngan_hang: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Chi nhánh</label>
                    <input
                      type="text"
                      placeholder="Chi nhánh Hoàn Kiếm, Hà Nội"
                      value={formData.chi_nhanh_ngan_hang}
                      onChange={(e) => setFormData({ ...formData, chi_nhanh_ngan_hang: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                    />
                  </div>
                </div>
              </div>

              {/* Nhóm 3: Hạn mức công nợ & Trạng thái */}
              <div>
                <h4 className="text-xs font-bold text-[#0F5FAF] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>3. Điều kiện thương mại & Trạng thái</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Hạn mức tín dụng (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000000"
                      value={formData.han_muc_tin_dung}
                      onChange={(e) => setFormData({ ...formData, han_muc_tin_dung: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Thời hạn công nợ (ngày)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.so_ngay_gia_han}
                      onChange={(e) => setFormData({ ...formData, so_ngay_gia_han: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Trạng thái hợp tác</label>
                    <select
                      value={formData.trang_thai}
                      onChange={(e) => setFormData({ ...formData, trang_thai: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0F5FAF]"
                    >
                      <option value="hoat_dong">Đang hoạt động</option>
                      <option value="tam_ngung">Tạm ngưng</option>
                      <option value="ngung_giao_dich">Ngừng giao dịch</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#0F5FAF] text-white text-xs font-semibold hover:bg-[#0A2540] transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : isCreateModalOpen ? 'Tạo nhà cung cấp' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem chi tiết & Đánh giá Nhà cung cấp */}
      {isDetailModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EAF5FC] text-[#0F5FAF]">
                  {selectedSupplier.ma_nha_cung_cap}
                </span>
                <h3 className="text-base font-bold text-[#172033] mt-1">
                  {selectedSupplier.ten_nha_cung_cap}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSupplierDetailData(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-5 pt-2 bg-slate-50">
              <button
                onClick={() => setDetailTab('info')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
                  detailTab === 'info'
                    ? 'border-[#0F5FAF] text-[#0F5FAF]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Thông tin chung & Pháp lý
              </button>
              <button
                onClick={() => setDetailTab('orders')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
                  detailTab === 'orders'
                    ? 'border-[#0F5FAF] text-[#0F5FAF]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Lịch sử đơn mua (PO)
              </button>
              <button
                onClick={() => setDetailTab('evaluations')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  detailTab === 'evaluations'
                    ? 'border-[#0F5FAF] text-[#0F5FAF]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>Đánh giá chất lượng NCC</span>
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full font-bold">
                  {evaluations.length}
                </span>
              </button>
            </div>

            <div className="p-5 text-xs">
              {/* TAB 1: THÔNG TIN CHUNG */}
              {detailTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl">
                    <div>
                      <span className="text-slate-500">Mã số thuế:</span>{' '}
                      <div className="font-semibold text-slate-800">{selectedSupplier.ma_so_thue || '—'}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Số GPKD / ĐKKD:</span>{' '}
                      <div className="font-semibold text-slate-800">{selectedSupplier.so_gpkd || '—'}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Điểm đánh giá:</span>{' '}
                      <div className="font-bold text-amber-600 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{parseFloat(selectedSupplier.diem_danh_gia || 0).toFixed(1)} / 10</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Người liên hệ:</span>{' '}
                      <div className="font-semibold text-slate-800">{selectedSupplier.nguoi_lien_he}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Điện thoại:</span>{' '}
                      <div className="font-semibold text-slate-800">{selectedSupplier.so_dien_thoai}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Email:</span>{' '}
                      <div className="font-semibold text-slate-800">{selectedSupplier.email}</div>
                    </div>
                    <div className="sm:col-span-3">
                      <span className="text-slate-500">Địa chỉ trụ sở:</span>{' '}
                      <div className="font-semibold text-slate-800">{selectedSupplier.dia_chi}</div>
                    </div>
                  </div>

                  {/* Thông tin ngân hàng */}
                  <div className="bg-[#F4FAFE] p-4 rounded-xl border border-[#DCEAF4]">
                    <h4 className="font-bold text-[#0F5FAF] mb-2 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      <span>Thông tin tài khoản ngân hàng</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-slate-500">Số tài khoản:</span>
                        <div className="font-mono font-bold text-slate-800">
                          {selectedSupplier.so_tai_khoan_ngan_hang || '—'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Ngân hàng:</span>
                        <div className="font-semibold text-slate-800">
                          {selectedSupplier.ten_ngan_hang || '—'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Chi nhánh:</span>
                        <div className="font-semibold text-slate-800">
                          {selectedSupplier.chi_nhanh_ngan_hang || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Điều khoản thương mại */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl">
                    <div>
                      <span className="text-slate-500">Hạn mức công nợ:</span>{' '}
                      <span className="font-bold text-[#0F5FAF]">{formatCurrency(selectedSupplier.han_muc_tin_dung)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Thời hạn cho nợ:</span>{' '}
                      <span className="font-semibold text-slate-800">{selectedSupplier.so_ngay_gia_han} ngày</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Loại mặt hàng:</span>{' '}
                      <span className="font-semibold text-slate-800">{selectedSupplier.loai_hang_cung_cap || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Trạng thái:</span>{' '}
                      <span className="font-semibold text-slate-800 capitalize">{selectedSupplier.trang_thai}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LỊCH SỬ PO */}
              {detailTab === 'orders' && (
                <div>
                  <h4 className="font-bold text-[#172033] mb-2">Đơn mua hàng gần nhất từ NCC</h4>
                  {!supplierDetailData?.donMuaHang || supplierDetailData.donMuaHang.length === 0 ? (
                    <p className="text-slate-500 italic p-6 text-center">Chưa có đơn mua hàng nào</p>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Mã PO</th>
                            <th className="p-2.5">Ngày đặt</th>
                            <th className="p-2.5">Tổng tiền</th>
                            <th className="p-2.5">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {supplierDetailData.donMuaHang.map((po) => (
                            <tr key={po.id}>
                              <td className="p-2.5 font-bold text-[#0F5FAF]">{po.ma_don_mua}</td>
                              <td className="p-2.5 text-slate-600">
                                {new Date(po.ngay_dat_hang).toLocaleDateString('vi-VN')}
                              </td>
                              <td className="p-2.5 font-semibold text-slate-800">{formatCurrency(po.tong_thanh_toan)}</td>
                              <td className="p-2.5">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {po.trang_thai}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ĐÁNH GIÁ CHẤT LƯỢNG NCC */}
              {detailTab === 'evaluations' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-[#172033]">Lịch sử đánh giá định kỳ</h4>
                      <p className="text-[11px] text-slate-500">
                        Chất lượng, tiến độ giao hàng, mức giá và khuyến nghị hợp tác
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEvalFormData({
                          diem_chat_luong: 8.5,
                          diem_tien_do: 9.0,
                          diem_gia_ca: 8.0,
                          nhan_xet: '',
                          khuyen_nghi: 'tiep_tuc_hop_tac',
                        });
                        setEvalErrors([]);
                        setIsEvalModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0F5FAF] text-white rounded-xl font-semibold hover:bg-[#0A2540] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm đánh giá mới</span>
                    </button>
                  </div>

                  {loadingEvaluations ? (
                    <div className="p-8 text-center text-slate-400">Đang tải lịch sử đánh giá...</div>
                  ) : evaluations.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Award className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-slate-500 italic">Chưa có đánh giá nào cho nhà cung cấp này</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {evaluations.map((ev) => (
                        <div key={ev.id} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#172033]">
                                Điểm tổng hợp:{' '}
                                <span className="text-amber-600 text-sm font-black">
                                  {parseFloat(ev.diem_tong_hop).toFixed(1)} / 10
                                </span>
                              </span>
                              <span className="text-[11px] text-slate-400">
                                ({new Date(ev.ngay_danh_gia || ev.created_at).toLocaleDateString('vi-VN')})
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ev.khuyen_nghi === 'uu_tien'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ev.khuyen_nghi === 'tiep_tuc_hop_tac'
                                ? 'bg-blue-100 text-blue-800'
                                : ev.khuyen_nghi === 'can_nhac'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {ev.khuyen_nghi === 'uu_tien'
                                ? 'Ưu tiên đặt hàng'
                                : ev.khuyen_nghi === 'tiep_tuc_hop_tac'
                                ? 'Tiếp tục hợp tác'
                                : ev.khuyen_nghi === 'can_nhac'
                                ? 'Cần cân nhắc'
                                : 'Ngừng hợp tác'}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg text-[11px]">
                            <div>
                              <span className="text-slate-500">Chất lượng:</span>{' '}
                              <span className="font-bold text-slate-800">{ev.diem_chat_luong}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Tiến độ giao:</span>{' '}
                              <span className="font-bold text-slate-800">{ev.diem_tien_do}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Mức giá:</span>{' '}
                              <span className="font-bold text-slate-800">{ev.diem_gia_ca}</span>
                            </div>
                          </div>

                          {ev.nhan_xet && (
                            <div className="text-[11px] text-slate-600 bg-amber-50/50 p-2 rounded border border-amber-100">
                              <span className="font-semibold text-amber-900">Nhận xét:</span> {ev.nhan_xet}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submodal: Tạo đánh giá Nhà cung cấp */}
      {isEvalModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-2xl max-w-md w-full">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#172033] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Đánh giá Nhà cung cấp</span>
              </h3>
              <button onClick={() => setIsEvalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvaluation} className="p-4 space-y-3 text-xs">
              {evalErrors.length > 0 && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                  {evalErrors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chất lượng (0-10)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    required
                    value={evalFormData.diem_chat_luong}
                    onChange={(e) => setEvalFormData({ ...evalFormData, diem_chat_luong: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tiến độ (0-10)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    required
                    value={evalFormData.diem_tien_do}
                    onChange={(e) => setEvalFormData({ ...evalFormData, diem_tien_do: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giá cả (0-10)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    required
                    value={evalFormData.diem_gia_ca}
                    onChange={(e) => setEvalFormData({ ...evalFormData, diem_gia_ca: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Khuyến nghị hợp tác</label>
                <select
                  value={evalFormData.khuyen_nghi}
                  onChange={(e) => setEvalFormData({ ...evalFormData, khuyen_nghi: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0F5FAF]"
                >
                  <option value="uu_tien">Ưu tiên đặt hàng</option>
                  <option value="tiep_tuc_hop_tac">Tiếp tục hợp tác</option>
                  <option value="can_nhac">Cần cân nhắc</option>
                  <option value="ngung_hop_tac">Ngừng hợp tác</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nhận xét chi tiết</label>
                <textarea
                  rows="3"
                  placeholder="Ghi chú về chất lượng lô hàng, tỷ lệ lỗi, thái độ phục vụ..."
                  value={evalFormData.nhan_xet}
                  onChange={(e) => setEvalFormData({ ...evalFormData, nhan_xet: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEvalModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={evalSubmitting}
                  className="px-3 py-1.5 rounded-xl bg-[#0F5FAF] text-white font-semibold hover:bg-[#0A2540] disabled:opacity-50"
                >
                  {evalSubmitting ? 'Đang lưu...' : 'Lưu đánh giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
