'use strict';

const { v, isRealDate } = require('../../utils/sales/validate');
const { salesConfig } = require('../../config/sales');
const {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} = require('../../utils/sales/errors');
const {
  INVALID_BODY_MESSAGE,
  INVALID_QUERY_MESSAGE,
  fieldIssues,
} = require('../../utils/sales/request');
const orderRepository = require('../../repositories/sales/order.repository');

const customerRepository = require('../../repositories/sales/customer.repository');
const productRepository = require('../../repositories/sales/product.repository');
const { calculateOrderTotals } = require('../../utils/sales/pricing');

/**
 * Order service (ported from PH1 `services/order.service.ts`).
 *
 * Business rules preserved: authoritative pricing from the product table,
 * server-side totals, credit-limit policy on confirmation (§5.6), and the
 * cancel-state matrix (confirmed orders are admin-only).
 */

const ORDER_STATUSES = ['cho_xac_nhan', 'da_xac_nhan', 'dang_san_xuat', 'da_giao', 'huy'];

const orderLineInputSchema = v
  .object({
    ma_san_pham: v.coerce.number().int('Mã sản phẩm không hợp lệ').positive('Mã sản phẩm không hợp lệ'),
    so_luong: v.coerce
      .number()
      .positive('Số lượng đặt phải lớn hơn 0')
      .max(1e6, 'Số lượng đặt quá lớn'),
    ty_le_giam_gia: v.coerce
      .number()
      .min(0, 'Chiết khấu không được âm')
      .max(100, 'Chiết khấu tối đa 100%')
      .default(0),
    ghi_chu: v.string().trim().max(500, 'Ghi chú dòng hàng tối đa 500 ký tự').optional().nullable(),
  })

const createOrderSchema = v
  .object({
    ma_khach_hang: v.coerce.number().int('Vui lòng chọn khách hàng').positive('Vui lòng chọn khách hàng'),
    ngay_dat_hang: v.string().trim().min(1, 'Ngày đặt hàng là bắt buộc'),
    ngay_giao_hang_yc: v.string().trim().min(1, 'Ngày giao hàng yêu cầu là bắt buộc'),
    dia_chi_giao_hang: v
      .string()
      .trim()
      .min(1, 'Địa chỉ giao hàng không được để trống')
      .max(500, 'Địa chỉ giao hàng tối đa 500 ký tự'),
    ghi_chu: v.string().trim().max(2000, 'Ghi chú tối đa 2000 ký tự').optional().nullable(),
    lines: v
      .array(orderLineInputSchema)
      .min(1, 'Đơn hàng phải có ít nhất một dòng sản phẩm')
      .max(200, 'Đơn hàng tối đa 200 dòng sản phẩm'),
  })
  .superRefine((data, ctx) => {
    // Only present-but-malformed dates are reported here; a missing or non-string
    // value already produced its own issue at the field level, and a stable
    // ordering keeps the first message per field the actionable one.
    if (typeof data.ngay_dat_hang === 'string' && data.ngay_dat_hang.length > 0 && !isRealDate(data.ngay_dat_hang)) {
      ctx.addIssue({ message: 'Ngày đặt hàng không hợp lệ (YYYY-MM-DD)', path: ['ngay_dat_hang'] });
    }
    if (
      typeof data.ngay_giao_hang_yc === 'string' &&
      data.ngay_giao_hang_yc.length > 0 &&
      !isRealDate(data.ngay_giao_hang_yc)
    ) {
      ctx.addIssue({ message: 'Ngày giao hàng yêu cầu không hợp lệ (YYYY-MM-DD)', path: ['ngay_giao_hang_yc'] });
    }
  })
  .refine(
    (data) =>
      !isRealDate(data.ngay_dat_hang) ||
      !isRealDate(data.ngay_giao_hang_yc) ||
      data.ngay_giao_hang_yc >= data.ngay_dat_hang,
    {
      message: 'Ngày giao hàng yêu cầu không được trước ngày đặt hàng',
      path: ['ngay_giao_hang_yc'],
    }
  );

const updateOrderSchema = v
  .object({
    ngay_giao_hang_yc: v.dateISO('Ngày giao hàng yêu cầu không hợp lệ (YYYY-MM-DD)').optional(),
    dia_chi_giao_hang: v
      .string()
      .trim()
      .min(1, 'Địa chỉ giao hàng không được để trống')
      .max(500, 'Địa chỉ giao hàng tối đa 500 ký tự')
      .optional(),
    ghi_chu: v.string().trim().max(2000, 'Ghi chú tối đa 2000 ký tự').optional().nullable(),
    lines: v
      .array(orderLineInputSchema)
      .min(1, 'Đơn hàng phải có ít nhất một dòng sản phẩm')
      .max(200, 'Đơn hàng tối đa 200 dòng sản phẩm')
      .optional(),
  })

const confirmOrderSchema = v
  .object({
    acknowledgeCreditLimit: v.boolean().optional().default(false),
  })

const cancelOrderSchema = v
  .object({
    ly_do: v
      .string()
      .trim()
      .min(1, 'Lý do hủy đơn hàng là bắt buộc')
      .max(500, 'Lý do hủy tối đa 500 ký tự'),
  })

const orderQuerySchema = v
  .object({
    page: v.coerce.number().int('Số trang phải là số nguyên').min(1, 'Số trang tối thiểu là 1').default(1),
    pageSize: v.coerce
      .number()
      .int('Kích thước trang phải là số nguyên')
      .min(1, 'Kích thước trang tối thiểu là 1')
      .max(100, 'Kích thước trang tối đa là 100')
      .default(20),
    search: v.string().trim().max(100, 'Từ khóa tìm kiếm tối đa 100 ký tự').optional(),
    ma_khach_hang: v.coerce.number().int().positive('Mã khách hàng không hợp lệ').optional(),
    trang_thai: v.enum(ORDER_STATUSES, 'Trạng thái đơn hàng không hợp lệ').optional(),
    // Several statuses at once, comma-separated (`da_xac_nhan,dang_san_xuat`).
    // Used by the pickers that may only offer orders in a set of states.
    trang_thai_in: v
      .string()
      .trim()
      .max(200, 'Danh sách trạng thái không hợp lệ')
      .refine(
        (value) =>
          value
            .split(',')
            .map((token) => token.trim())
            .filter((token) => token.length > 0)
            .every((token) => ORDER_STATUSES.includes(token)),
        { message: 'Trạng thái đơn hàng không hợp lệ' }
      )
      .transform((value) =>
        value
          .split(',')
          .map((token) => token.trim())
          .filter((token) => token.length > 0)
      )
      .optional(),
    nguoi_ban: v.coerce.number().int().positive('Người bán không hợp lệ').optional(),
    fromDate: v.dateISO('Ngày bắt đầu không đúng định dạng (YYYY-MM-DD)').optional(),
    toDate: v.dateISO('Ngày kết thúc không đúng định dạng (YYYY-MM-DD)').optional(),
    sortBy: v.string().trim().max(64, 'Cột sắp xếp không hợp lệ').optional(),
    sortOrder: v.enum(['ASC', 'DESC'], 'Thứ tự sắp xếp không hợp lệ').default('DESC'),
  })
  .refine((data) => !data.fromDate || !data.toDate || data.fromDate <= data.toDate, {
    message: 'Ngày kết thúc không được trước ngày bắt đầu',
    path: ['toDate'],
  });

async function listOrders(queryFilters) {
  const parsed = orderQuerySchema.safeParse(queryFilters);
  if (!parsed.success) {
    throw new ValidationError(
      INVALID_QUERY_MESSAGE,
      fieldIssues(parsed.error.errors)
    );
  }
  return orderRepository.list(parsed.data);
}

async function getOrderById(id) {
  const order = await orderRepository.findById(id);
  if (!order) {
    throw new NotFoundError('ORDER_NOT_FOUND', `Không tìm thấy đơn bán hàng có ID ${id}.`);
  }
  return order;
}

async function createOrder(rawInput, sellerId) {
  const parsed = createOrderSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError(
      INVALID_BODY_MESSAGE,
      fieldIssues(parsed.error.errors)
    );
  }
  const input = parsed.data;

  // 1. Validate Customer
  const customer = await customerRepository.findById(input.ma_khach_hang);
  if (!customer) {
    throw new NotFoundError('CUSTOMER_NOT_FOUND', 'Khách hàng không tồn tại.');
  }
  if (customer.trang_thai !== 'hoat_dong') {
    throw new AppError(
      422,
      'CUSTOMER_INACTIVE',
      'Khách hàng đang ở trạng thái tạm khóa hoặc ngừng giao dịch. Không thể tạo đơn hàng mới.'
    );
  }

  // 2. Validate Products and fetch authoritative prices
  const linePriceInputs = [];

  for (const line of input.lines) {
    const product = await productRepository.findById(line.ma_san_pham);
    if (!product) {
      throw new NotFoundError('PRODUCT_NOT_FOUND', `Sản phẩm có ID ${line.ma_san_pham} không tồn tại.`);
    }
    if (product.trang_thai !== 'dang_ban') {
      throw new AppError(
        422,
        'PRODUCT_NOT_SELLABLE',
        `Sản phẩm "${product.ten_san_pham}" không ở trạng thái sẵn sàng bán.`
      );
    }
    linePriceInputs.push({
      ma_san_pham: product.id,
      so_luong: line.so_luong,
      don_gia: Number(product.gia_ban), // Authoritative price from DB
      ty_le_giam_gia: line.ty_le_giam_gia,
      ghi_chu: line.ghi_chu,
    });
  }

  // 3. Recalculate totals server-side
  const totals = calculateOrderTotals(linePriceInputs, salesConfig.TAX_RATE);

  // 4. Generate unique order code
  let maDonBan = '';
  let isUnique = false;
  let attempts = 0;
  const year = new Date().getFullYear();

  while (!isUnique && attempts < 5) {
    attempts++;
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    maDonBan = `DBH-${year}-${randomSuffix}`;
    const existing = await orderRepository.findByCode(maDonBan);
    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    throw new ConflictError('DATABASE_CONFLICT', 'Không thể tạo mã đơn hàng duy nhất. Vui lòng thử lại.');
  }

  // 5. Insert order and lines atomically
  const order = await orderRepository.create({
    ma_don_ban: maDonBan,
    ma_khach_hang: input.ma_khach_hang,
    ngay_dat_hang: new Date(input.ngay_dat_hang),
    ngay_giao_hang_yc: new Date(input.ngay_giao_hang_yc),
    dia_chi_giao_hang: input.dia_chi_giao_hang.trim(),
    tong_tien_hang: totals.tong_tien_hang,
    tien_thue: totals.tien_thue,
    tien_giam_gia: totals.tien_giam_gia,
    tong_thanh_toan: totals.tong_thanh_toan,
    nguoi_ban: sellerId,
    ghi_chu: input.ghi_chu ? input.ghi_chu.trim() : null,
    creatorId: sellerId,
    lines: totals.lines,
  });

  return order;
}

async function updateOrder(id, rawInput, updaterId) {
  const existingOrder = await getOrderById(id);

  // Only cho_xac_nhan orders can be commercially edited
  if (existingOrder.trang_thai !== 'cho_xac_nhan') {
    throw new AppError(
      422,
      'ORDER_INVALID_STATE',
      `Không thể chỉnh sửa đơn hàng ở trạng thái "${existingOrder.trang_thai}".`
    );
  }

  const parsed = updateOrderSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError(
      INVALID_BODY_MESSAGE,
      fieldIssues(parsed.error.errors)
    );
  }
  const input = parsed.data;

  let calculatedTotals = null;
  if (input.lines && input.lines.length > 0) {
    const linePriceInputs = [];
    for (const line of input.lines) {
      const product = await productRepository.findById(line.ma_san_pham);
      if (!product) {
        throw new NotFoundError('PRODUCT_NOT_FOUND', `Sản phẩm có ID ${line.ma_san_pham} không tồn tại.`);
      }
      if (product.trang_thai !== 'dang_ban') {
        throw new AppError(
          422,
          'PRODUCT_NOT_SELLABLE',
          `Sản phẩm "${product.ten_san_pham}" không ở trạng thái sẵn sàng bán.`
        );
      }
      linePriceInputs.push({
        ma_san_pham: product.id,
        so_luong: line.so_luong,
        don_gia: Number(product.gia_ban),
        ty_le_giam_gia: line.ty_le_giam_gia,
        ghi_chu: line.ghi_chu,
      });
    }
    calculatedTotals = calculateOrderTotals(linePriceInputs, salesConfig.TAX_RATE);
  }

  const headerUpdates = {};
  if (input.ngay_giao_hang_yc) headerUpdates.ngay_giao_hang_yc = new Date(input.ngay_giao_hang_yc);
  if (input.dia_chi_giao_hang) headerUpdates.dia_chi_giao_hang = input.dia_chi_giao_hang.trim();
  if (input.ghi_chu !== undefined) headerUpdates.ghi_chu = input.ghi_chu ? input.ghi_chu.trim() : null;

  if (calculatedTotals) {
    headerUpdates.tong_tien_hang = calculatedTotals.tong_tien_hang;
    headerUpdates.tien_thue = calculatedTotals.tien_thue;
    headerUpdates.tien_giam_gia = calculatedTotals.tien_giam_gia;
    headerUpdates.tong_thanh_toan = calculatedTotals.tong_thanh_toan;
  }

  const updated = await orderRepository.update(
    id,
    headerUpdates,
    calculatedTotals ? calculatedTotals.lines : null,
    updaterId
  );

  if (!updated) {
    throw new NotFoundError('ORDER_NOT_FOUND', `Không tìm thấy đơn bán hàng có ID ${id}.`);
  }

  return updated;
}

async function confirmOrder(id, rawInput, updaterId) {
  const order = await getOrderById(id);

  if (order.trang_thai !== 'cho_xac_nhan') {
    throw new AppError(
      422,
      'ORDER_INVALID_STATE',
      `Chỉ đơn hàng ở trạng thái "Chờ xác nhận" mới có thể xác nhận.`
    );
  }

  const customer = await customerRepository.findById(order.ma_khach_hang);
  if (!customer) {
    throw new NotFoundError('CUSTOMER_NOT_FOUND', 'Khách hàng không tồn tại.');
  }
  if (customer.trang_thai !== 'hoat_dong') {
    throw new AppError(
      422,
      'CUSTOMER_INACTIVE',
      'Khách hàng không ở trạng thái hoạt động. Không thể xác nhận đơn hàng.'
    );
  }

  const parsed = confirmOrderSchema.safeParse(rawInput);
  const input = parsed.success ? parsed.data : { acknowledgeCreditLimit: false };

  // Credit Limit Control Check (Section 5.6)
  const creditLimit = Number(customer.han_muc_cong_no) || 0;
  if (creditLimit > 0) {
    const currentOutstanding = await orderRepository.getCustomerOutstanding(customer.id);
    const projectedExposure = currentOutstanding + Number(order.tong_thanh_toan);

    if (projectedExposure > creditLimit) {
      if (salesConfig.CREDIT_LIMIT_MODE === 'hard_block') {
        throw new AppError(
          422,
          'CUSTOMER_CREDIT_LIMIT_EXCEEDED',
          `Tổng công nợ dự kiến (${projectedExposure.toLocaleString('vi-VN')} VNĐ) vượt quá hạn mức tín dụng (${creditLimit.toLocaleString('vi-VN')} VNĐ). Chính sách yêu cầu chặn xác nhận.`
        );
      } else if (salesConfig.CREDIT_LIMIT_MODE === 'warning' && !input.acknowledgeCreditLimit) {
        throw new AppError(
          422,
          'CUSTOMER_CREDIT_LIMIT_EXCEEDED',
          `Cảnh báo: Đơn hàng vượt hạn mức tín dụng của khách hàng (${creditLimit.toLocaleString('vi-VN')} VNĐ). Cần xác nhận cảnh báo để tiếp tục.`,
          [{ field: 'acknowledgeCreditLimit', message: 'Cần xác nhận vượt hạn mức tín dụng.' }]
        );
      }
    }
  }

  const updated = await orderRepository.updateStatus(id, 'da_xac_nhan', updaterId);
  if (!updated) {
    throw new NotFoundError('ORDER_NOT_FOUND', `Không tìm thấy đơn bán hàng có ID ${id}.`);
  }

  return updated;
}

async function cancelOrder(id, rawInput, updaterId, userRole) {
  const order = await getOrderById(id);

  if (order.trang_thai === 'huy' || order.trang_thai === 'da_giao') {
    throw new AppError(
      422,
      'ORDER_INVALID_STATE',
      `Không thể hủy đơn hàng đã ở trạng thái "${order.trang_thai}".`
    );
  }

  if (order.trang_thai === 'dang_san_xuat') {
    throw new AppError(
      422,
      'ORDER_INVALID_STATE',
      'Đơn hàng đang trong quá trình sản xuất. Không thể thực hiện hủy.'
    );
  }

  if (order.trang_thai === 'da_xac_nhan' && userRole !== 'admin') {
    throw new ForbiddenError(
      'Đơn hàng đã xác nhận chỉ có thể được hủy bởi Quản trị viên (Admin).'
    );
  }

  const parsed = cancelOrderSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError(
      INVALID_BODY_MESSAGE,
      fieldIssues(parsed.error.errors)
    );
  }
  const { ly_do: lyDo } = parsed.data;

  const cancellationNote = order.ghi_chu
    ? `${order.ghi_chu} | [HỦY ĐƠN: ${lyDo.trim()}]`
    : `[HỦY ĐƠN: ${lyDo.trim()}]`;

  const updated = await orderRepository.updateStatus(id, 'huy', updaterId, {
    ghi_chu: cancellationNote,
  });

  if (!updated) {
    throw new NotFoundError('ORDER_NOT_FOUND', `Không tìm thấy đơn bán hàng có ID ${id}.`);
  }

  return updated;
}

module.exports = {
  ORDER_STATUSES,
  orderLineInputSchema,
  createOrderSchema,
  updateOrderSchema,
  confirmOrderSchema,
  cancelOrderSchema,
  orderQuerySchema,
  listOrders,
  getOrderById,
  createOrder,
  updateOrder,
  confirmOrder,
  cancelOrder,
  orderService: {
    listOrders,
    getOrderById,
    createOrder,
    updateOrder,
    confirmOrder,
    cancelOrder,
  },
};
