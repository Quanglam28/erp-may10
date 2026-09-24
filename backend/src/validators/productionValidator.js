/**
 * ERP May 10 — Production Module (PH2) Validator
 */

function validatePlanInput(data) {
  const errors = [];

  if (!data.ma_san_pham) {
    errors.push('Vui lòng chọn sản phẩm cần sản xuất.');
  }

  const qty = parseFloat(data.so_luong_ke_hoach);
  if (isNaN(qty) || qty <= 0) {
    errors.push('Số lượng kế hoạch phải lớn hơn 0.');
  }

  if (data.ngay_bat_dau && data.ngay_ket_thuc) {
    const start = new Date(data.ngay_bat_dau);
    const end = new Date(data.ngay_ket_thuc);
    if (end < start) {
      errors.push('Ngày kết thúc phải sau ngày bắt đầu.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateBomInput(data) {
  const errors = [];

  if (!data.ma_san_pham) errors.push('Vui lòng chọn sản phẩm.');
  if (!data.ma_vat_tu) errors.push('Vui lòng chọn nguyên vật liệu.');

  const norm = parseFloat(data.dinh_muc);
  if (isNaN(norm) || norm <= 0) {
    errors.push('Định mức tiêu hao phải lớn hơn 0.');
  }

  const waste = parseFloat(data.ty_le_hao_hut);
  if (isNaN(waste) || waste < 0) {
    errors.push('Tỷ lệ hao hụt không được âm.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateOrderInput(data) {
  const errors = [];

  if (!data.ma_ke_hoach_san_xuat) {
    errors.push('Vui lòng chọn kế hoạch sản xuất để lập lệnh.');
  }

  // Nếu không truyền số lượng, backend dùng toàn bộ số lượng của kế hoạch — đúng luồng ban đầu.
  if (data.so_luong_yeu_cau !== undefined && data.so_luong_yeu_cau !== null && data.so_luong_yeu_cau !== '') {
    const qty = parseFloat(data.so_luong_yeu_cau);
    if (isNaN(qty) || qty <= 0) {
      errors.push('Số lượng yêu cầu của lệnh phải lớn hơn 0.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateResultInput(data) {
  const errors = [];

  if (!data.ma_lenh_san_xuat) {
    errors.push('Vui lòng chỉ định lệnh sản xuất.');
  }

  const completed = parseFloat(data.so_luong_hoan_thanh);
  if (isNaN(completed) || completed < 0) {
    errors.push('Sản lượng hoàn thành không hợp lệ.');
  }

  const failed = parseFloat(data.so_luong_loi || 0);
  if (isNaN(failed) || failed < 0) {
    errors.push('Số lượng lỗi không được âm.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validatePlanInput,
  validateBomInput,
  validateOrderInput,
  validateResultInput,
};
