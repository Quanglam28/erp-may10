/**
 * Purchasing Validators for ERP May 10 - PH3: Mua hàng & Nhà cung cấp
 * Standardizing HTTP 400 Bad Request responses with detailed field-level errors
 */

/**
 * Validate input for creating or updating a supplier (nha_cung_cap)
 */
function validateSupplierInput(body, isUpdate = false) {
  const errors = [];
  const { ten_nha_cung_cap, ma_so_thue, so_gpkd, dia_chi, so_dien_thoai, email, nguoi_lien_he, han_muc_tin_dung, so_ngay_gia_han, diem_danh_gia } = body;

  if (!isUpdate || ten_nha_cung_cap !== undefined) {
    if (!ten_nha_cung_cap || typeof ten_nha_cung_cap !== 'string' || !ten_nha_cung_cap.trim()) {
      errors.push('Tên nhà cung cấp (ten_nha_cung_cap) là bắt buộc và không được để trống.');
    }
  }

  if (!isUpdate || ma_so_thue !== undefined) {
    if (!ma_so_thue || typeof ma_so_thue !== 'string' || !ma_so_thue.trim()) {
      errors.push('Mã số thuế (ma_so_thue) là bắt buộc và không được để trống.');
    } else if (!/^[0-9]{10}(-[0-9]{3})?$|^[0-9]{13}$/.test(ma_so_thue.trim())) {
      errors.push('Mã số thuế (ma_so_thue) không đúng định dạng hợp lệ (chuẩn 10 số hoặc 13 số, VD: 0101234567 hoặc 0101234567-001).');
    }
  }

  if (!isUpdate || so_gpkd !== undefined) {
    if (!so_gpkd || typeof so_gpkd !== 'string' || !so_gpkd.trim()) {
      errors.push('Số giấy phép kinh doanh / ĐKKD (so_gpkd) là bắt buộc và không được để trống.');
    } else if (!/^[A-Za-z0-9\-_]{5,30}$/.test(so_gpkd.trim())) {
      errors.push('Số giấy phép kinh doanh / ĐKKD (so_gpkd) phải từ 5-30 ký tự (chỉ bao gồm chữ cái, chữ số, gạch nối).');
    }
  }

  if (!isUpdate || dia_chi !== undefined) {
    if (!dia_chi || typeof dia_chi !== 'string' || !dia_chi.trim()) {
      errors.push('Địa chỉ trụ sở (dia_chi) là bắt buộc và không được để trống.');
    }
  }

  if (!isUpdate || so_dien_thoai !== undefined) {
    if (!so_dien_thoai || typeof so_dien_thoai !== 'string' || !so_dien_thoai.trim()) {
      errors.push('Số điện thoại (so_dien_thoai) là bắt buộc.');
    } else {
      const cleanPhone = so_dien_thoai.trim().replace(/[\s.-]/g, '');
      if (!/^(0|\+84)(2[0-9]{8,9}|[35789][0-9]{8})$/.test(cleanPhone)) {
        errors.push('Số điện thoại (so_dien_thoai) không đúng định dạng số điện thoại Việt Nam hợp lệ (VD: 0912345678, 0283896012).');
      }
    }
  }

  if (!isUpdate || email !== undefined) {
    if (!email || typeof email !== 'string' || !email.trim()) {
      errors.push('Email giao dịch (email) là bắt buộc.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push('Email không đúng định dạng hợp lệ.');
    }
  }

  if (!isUpdate || nguoi_lien_he !== undefined) {
    if (!nguoi_lien_he || typeof nguoi_lien_he !== 'string' || !nguoi_lien_he.trim()) {
      errors.push('Người đại diện liên hệ (nguoi_lien_he) là bắt buộc.');
    }
  }

  if (han_muc_tin_dung !== undefined) {
    const num = parseFloat(han_muc_tin_dung);
    if (isNaN(num) || num < 0) {
      errors.push('Hạn mức tín dụng (han_muc_tin_dung) phải là số >= 0.');
    }
  }

  if (so_ngay_gia_han !== undefined) {
    const num = parseInt(so_ngay_gia_han, 10);
    if (isNaN(num) || num < 0) {
      errors.push('Số ngày gia hạn nợ (so_ngay_gia_han) phải là số nguyên >= 0.');
    }
  }

  if (diem_danh_gia !== undefined) {
    const num = parseFloat(diem_danh_gia);
    if (isNaN(num) || num < 0 || num > 10) {
      errors.push('Điểm đánh giá nhà cung cấp phải từ 0 đến 10.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate input for creating a Purchase Order (don_mua_hang)
 */
function validatePurchaseOrderInput(body) {
  const errors = [];
  const { ma_nha_cung_cap, ngay_giao_hang_yc, chiTiet, ma_kho_nhap } = body;

  if (!ma_nha_cung_cap) {
    errors.push('Mã nhà cung cấp (ma_nha_cung_cap) là bắt buộc.');
  }

  if (!ngay_giao_hang_yc) {
    errors.push('Ngày giao hàng yêu cầu (ngay_giao_hang_yc) là bắt buộc.');
  } else {
    const expectedDate = new Date(ngay_giao_hang_yc);
    if (isNaN(expectedDate.getTime())) {
      errors.push('Ngày giao hàng yêu cầu không phải là ngày giờ hợp lệ.');
    }
  }

  if (!chiTiet || !Array.isArray(chiTiet) || chiTiet.length === 0) {
    errors.push('Danh sách chi tiết mặt hàng mua (chiTiet) phải chứa ít nhất 1 vật tư.');
  } else {
    chiTiet.forEach((item, index) => {
      const idx = index + 1;
      if (!item.ma_vat_tu) {
        errors.push(`Dòng ${idx}: Mã vật tư (ma_vat_tu) là bắt buộc.`);
      }

      const sl = parseFloat(item.so_luong_dat);
      if (isNaN(sl) || sl <= 0) {
        errors.push(`Dòng ${idx}: Số lượng đặt mua (so_luong_dat) phải là số dương lớn hơn 0.`);
      }

      const dg = parseFloat(item.don_gia);
      if (isNaN(dg) || dg < 0) {
        errors.push(`Dòng ${idx}: Đơn giá mua (don_gia) phải là số >= 0.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Allowed State Transitions for Purchase Orders (State Machine)
 * Trạng thái hợp lệ: cho_duyet -> da_gui_ncc -> da_xac_nhan -> dang_giao -> da_nhap_kho
 * Bất kỳ trạng thái nào trước da_nhap_kho đều có thể chuyển sang 'huy'
 */
const VALID_TRANSITIONS = {
  cho_duyet: ['da_gui_ncc', 'huy'],
  da_gui_ncc: ['da_xac_nhan', 'huy'],
  da_xac_nhan: ['dang_giao', 'huy'],
  dang_giao: ['da_nhap_kho'],
  da_nhap_kho: [], // Terminal state
  huy: [],        // Terminal state
};

function isValidStatusTransition(currentStatus, nextStatus) {
  if (!VALID_TRANSITIONS[currentStatus]) {
    return false;
  }
  return VALID_TRANSITIONS[currentStatus].includes(nextStatus);
}

/**
 * Allowed State Transitions for Purchase Requisitions (PR State Machine)
 */
const VALID_PR_TRANSITIONS = {
  cho_duyet: ['da_duyet', 'tu_choi', 'huy'],
  da_duyet: ['da_tao_don', 'huy'],
  da_tao_don: [],
  tu_choi: [],
  huy: [],
};

function isValidPrTransition(currentStatus, nextStatus) {
  if (!VALID_PR_TRANSITIONS[currentStatus]) return false;
  return VALID_PR_TRANSITIONS[currentStatus].includes(nextStatus);
}

/**
 * Validate Purchase Requisition (yeu_cau_mua_hang)
 */
function validatePurchaseRequisitionInput(body) {
  const errors = [];
  const { nguon_yeu_cau, chiTiet } = body;

  if (!nguon_yeu_cau || typeof nguon_yeu_cau !== 'string' || !nguon_yeu_cau.trim()) {
    errors.push('Nguồn yêu cầu (nguon_yeu_cau: san_xuat, kho, noi_bo) là bắt buộc.');
  }

  if (!chiTiet || !Array.isArray(chiTiet) || chiTiet.length === 0) {
    errors.push('Yêu cầu mua sắm phải chứa ít nhất 1 vật tư (chiTiet).');
  } else {
    chiTiet.forEach((item, index) => {
      const idx = index + 1;
      if (!item.ma_vat_tu) {
        errors.push(`Dòng ${idx}: Mã vật tư (ma_vat_tu) là bắt buộc.`);
      }
      const sl = parseFloat(item.so_luong_yeu_cau);
      if (isNaN(sl) || sl <= 0) {
        errors.push(`Dòng ${idx}: Số lượng yêu cầu (so_luong_yeu_cau) phải là số dương lớn hơn 0.`);
      }
      if (item.don_gia_du_kien !== undefined && item.don_gia_du_kien !== null) {
        const dg = parseFloat(item.don_gia_du_kien);
        if (isNaN(dg) || dg < 0) {
          errors.push(`Dòng ${idx}: Đơn giá dự kiến phải >= 0.`);
        }
      }
      if (!item.ngay_can_giao) {
        errors.push(`Dòng ${idx}: Ngày cần giao hàng (ngay_can_giao) là bắt buộc.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Request for Quotation (yeu_cau_bao_gia - RFQ)
 */
function validateRfqInput(body) {
  const errors = [];
  const { tieu_de, han_bao_gia, vatTu } = body;

  if (!tieu_de || typeof tieu_de !== 'string' || !tieu_de.trim()) {
    errors.push('Tiêu đề đợt yêu cầu báo giá (tieu_de) là bắt buộc.');
  }

  if (!han_bao_gia) {
    errors.push('Hạn chót nộp báo giá (han_bao_gia) là bắt buộc.');
  } else {
    const d = new Date(han_bao_gia);
    if (isNaN(d.getTime())) {
      errors.push('Hạn báo giá không phải là định dạng ngày giờ hợp lệ.');
    }
  }

  if (vatTu !== undefined && (!Array.isArray(vatTu) || vatTu.length === 0)) {
    errors.push('Đợt yêu cầu báo giá phải liệt kê ít nhất 1 vật tư cần chào giá nếu có cung cấp.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Supplier Quote Submission (chi_tiet_bao_gia_ncc)
 */
function validateQuoteInput(body) {
  const errors = [];
  const { ma_nha_cung_cap, ma_vat_tu, so_luong_chao, don_gia_chao, thoi_gian_giao_hang_ngay } = body;

  if (!ma_nha_cung_cap) errors.push('Mã nhà cung cấp (ma_nha_cung_cap) là bắt buộc.');
  if (!ma_vat_tu) errors.push('Mã vật tư (ma_vat_tu) là bắt buộc.');

  const sl = parseFloat(so_luong_chao);
  if (isNaN(sl) || sl <= 0) {
    errors.push('Số lượng chào giá (so_luong_chao) phải lớn hơn 0.');
  }

  const dg = parseFloat(don_gia_chao);
  if (isNaN(dg) || dg < 0) {
    errors.push('Đơn giá chào (don_gia_chao) phải là số >= 0.');
  }

  if (thoi_gian_giao_hang_ngay !== undefined) {
    const lt = parseInt(thoi_gian_giao_hang_ngay, 10);
    if (isNaN(lt) || lt < 0) {
      errors.push('Thời gian giao hàng cam kết (lead time tính theo ngày) phải >= 0.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Supplier Evaluation (danh_gia_ncc)
 */
function validateEvaluationInput(body) {
  const errors = [];
  const { ma_nha_cung_cap, ky_danh_gia, diem_chat_luong, diem_giao_hang, diem_tien_do, diem_gia_ca } = body;

  if (!ma_nha_cung_cap) errors.push('Mã nhà cung cấp là bắt buộc.');

  const cl = parseFloat(diem_chat_luong);
  if (isNaN(cl) || cl < 0 || cl > 10) errors.push('Điểm chất lượng phải từ 0 đến 10.');

  const deliveryScore = diem_giao_hang !== undefined ? diem_giao_hang : diem_tien_do;
  const gh = parseFloat(deliveryScore);
  if (isNaN(gh) || gh < 0 || gh > 10) errors.push('Điểm giao hàng/tiến độ phải từ 0 đến 10.');

  const gc = parseFloat(diem_gia_ca);
  if (isNaN(gc) || gc < 0 || gc > 10) errors.push('Điểm giá cả/cạnh tranh phải từ 0 đến 10.');

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate receiving update input with quality inspection
 */
function validateReceiveStatusInput(body) {
  const errors = [];
  const { ma_don_mua_hang, chiTiet } = body;

  if (!ma_don_mua_hang) {
    errors.push('Mã đơn mua hàng (ma_don_mua_hang) là bắt buộc.');
  }

  if (!chiTiet || !Array.isArray(chiTiet) || chiTiet.length === 0) {
    errors.push('Danh sách chi tiết nhận hàng (chiTiet) phải chứa ít nhất 1 dòng.');
  } else {
    chiTiet.forEach((item, index) => {
      const idx = index + 1;
      if (!item.ma_vat_tu && !item.id) {
        errors.push(`Dòng ${idx}: Cần cung cấp mã vật tư hoặc ID dòng chi tiết.`);
      }
      const sl = parseFloat(item.so_luong_nhap);
      if (isNaN(sl) || sl <= 0) {
        errors.push(`Dòng ${idx}: Số lượng nhận (so_luong_nhap) phải lớn hơn 0.`);
      }
      if (item.so_luong_loi_hong !== undefined) {
        const lh = parseFloat(item.so_luong_loi_hong);
        if (isNaN(lh) || lh < 0) {
          errors.push(`Dòng ${idx}: Số lượng lỗi/hỏng phải >= 0.`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateSupplierInput,
  validatePurchaseOrderInput,
  isValidStatusTransition,
  validateReceiveStatusInput,
  validatePurchaseRequisitionInput,
  validateRfqInput,
  validateQuoteInput,
  validateEvaluationInput,
  isValidPrTransition,
  VALID_TRANSITIONS,
  VALID_PR_TRANSITIONS,
};
