'use strict';

const { v } = require('../../utils/sales/validate');
const { NotFoundError, ValidationError, ConflictError } = require('../../utils/sales/errors');
const {
  INVALID_BODY_MESSAGE,
  INVALID_QUERY_MESSAGE,
  fieldIssues,
} = require('../../utils/sales/request');
const customerRepository = require('../../repositories/sales/customer.repository');

/**
 * Customer service (ported from PH1 `services/customer.service.ts`).
 *
 * Behaviour preserved: request validation, the `KH-<year>-<6 digits>` code
 * generation with collision retry, trimming/normalisation of every text field,
 * and the 404/409/422 error mapping. Validation was migrated from `zod` to the
 * module-local validator (`utils/sales/validate.js`) because the frozen Core
 * backend has no `zod` dependency.
 */

const customerTypeEnum = v.enum(['ca_nhan', 'to_chuc', 'dai_ly', 'xuat_khau']);
const customerStatusEnum = v.enum(['hoat_dong', 'tam_khoa', 'ngung_giao_dich']);

/**
 * Vietnamese tax id: 10 digits, optionally followed by a 3-digit branch
 * (`0100109106` or `0100109106-001`).
 */
const TAX_CODE_RE = /^\d{10}(-\d{3})?$/;
const TAX_CODE_MESSAGE = 'Mã số thuế không đúng định dạng (10 số hoặc 10 số-3 số)';
const TAX_CODE_DUPLICATE_MESSAGE = 'Mã số thuế đã được sử dụng bởi khách hàng khác.';

/** PostgreSQL unique-violation code, used to map the DB guard onto a 409. */
const PG_UNIQUE_VIOLATION = '23505';

const createCustomerSchema = v
  .object({
    ten_khach_hang: v
      .string()
      .trim()
      .min(1, 'Tên khách hàng không được để trống')
      .max(200, 'Tên khách hàng tối đa 200 ký tự'),
    loai_khach_hang: customerTypeEnum,
    ma_so_thue: v
      .string()
      .trim()
      .max(20, 'Mã số thuế tối đa 20 ký tự')
      .regex(TAX_CODE_RE, TAX_CODE_MESSAGE)
      .optional()
      .nullable()
      .or(v.literal('')),
    so_dien_thoai: v
      .phone()
      .trim()
      .min(8, 'Số điện thoại phải từ 8 ký tự')
      .max(20, 'Số điện thoại tối đa 20 ký tự'),
    email: v
      .string()
      .trim()
      .max(100, 'Email tối đa 100 ký tự')
      .email('Email không đúng định dạng')
      .optional()
      .nullable()
      .or(v.literal('')),
    dia_chi: v.string().trim().min(1, 'Địa chỉ không được để trống').max(500, 'Địa chỉ tối đa 500 ký tự'),
    tinh_thanh_pho: v
      .string()
      .trim()
      .min(1, 'Tỉnh/thành phố không được để trống')
      .max(100, 'Tỉnh/thành phố tối đa 100 ký tự'),
    nguoi_lien_he: v.string().trim().max(150, 'Người liên hệ tối đa 150 ký tự').optional().nullable(),
    han_muc_cong_no: v.coerce
      .number()
      .min(0, 'Hạn mức công nợ phải lớn hơn hoặc bằng 0')
      .max(1e15, 'Hạn mức công nợ quá lớn')
      .default(0),
    so_ngay_cong_no: v.coerce
      .number()
      .int('Số ngày công nợ phải là số nguyên')
      .min(0, 'Số ngày công nợ phải lớn hơn hoặc bằng 0')
      .max(3650, 'Số ngày công nợ tối đa 3650 ngày')
      .default(0),
    ghi_chu: v.string().trim().max(2000, 'Ghi chú tối đa 2000 ký tự').optional().nullable(),
  })

const updateCustomerSchema = createCustomerSchema.partial();

const updateCustomerStatusSchema = v
  .object({
    trang_thai: customerStatusEnum,
    ly_do: v.string().trim().max(500, 'Lý do tối đa 500 ký tự').optional(),
  })

const customerQuerySchema = v
  .object({
    page: v.coerce.number().int('Số trang phải là số nguyên').min(1, 'Số trang tối thiểu là 1').default(1),
    pageSize: v.coerce
      .number()
      .int('Kích thước trang phải là số nguyên')
      .min(1, 'Kích thước trang tối thiểu là 1')
      .max(100, 'Kích thước trang tối đa là 100')
      .default(20),
    search: v.string().trim().max(100, 'Từ khóa tìm kiếm tối đa 100 ký tự').optional(),
    loai_khach_hang: customerTypeEnum.optional(),
    tinh_thanh_pho: v.string().trim().max(100, 'Tỉnh/thành phố tối đa 100 ký tự').optional(),
    trang_thai: customerStatusEnum.optional(),
    sortBy: v.string().trim().max(64, 'Cột sắp xếp không hợp lệ').optional(),
    sortOrder: v.enum(['ASC', 'DESC'], 'Thứ tự sắp xếp không hợp lệ').default('DESC'),
  })

function createCustomerService(repository = customerRepository) {
  /**
   * Rejects a tax id already used by another customer. The check answers the
   * friendly 409; the partial unique index guard is mapped below from PG error.
   */
  async function assertTaxCodeAvailable(taxCode, excludeId = null) {
    if (!taxCode) return;
    const duplicate = await repository.findByTaxCode(taxCode, excludeId);
    if (!duplicate) return;
    throw new ConflictError(
      'CUSTOMER_TAX_CODE_EXISTS',
      `Mã số thuế "${taxCode}" đã được sử dụng bởi khách hàng ${duplicate.ma_khach_hang}.`,
      [{ field: 'ma_so_thue', message: TAX_CODE_DUPLICATE_MESSAGE }]
    );
  }

  /** Maps the DB uniqueness guard onto the same 409 the pre-check raises. */
  function toConflictIfTaxCodeTaken(error) {
    const constraint = error && error.constraint ? String(error.constraint) : '';
    if (error && error.code === PG_UNIQUE_VIOLATION && constraint.includes('ma_so_thue')) {
      return new ConflictError('CUSTOMER_TAX_CODE_EXISTS', TAX_CODE_DUPLICATE_MESSAGE, [
        { field: 'ma_so_thue', message: TAX_CODE_DUPLICATE_MESSAGE },
      ]);
    }
    return null;
  }

  async function listCustomers(queryFilters) {
    const parseResult = customerQuerySchema.safeParse(queryFilters);
    if (!parseResult.success) {
      throw new ValidationError(INVALID_QUERY_MESSAGE, fieldIssues(parseResult.error.errors));
    }
    return repository.list(parseResult.data);
  }

  async function getCustomerById(id) {
    const customer = await repository.findById(id);
    if (!customer) {
      throw new NotFoundError('CUSTOMER_NOT_FOUND', `Không tìm thấy khách hàng có ID ${id}.`);
    }
    return customer;
  }

  async function createCustomer(rawInput, creatorId) {
    const parseResult = createCustomerSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        INVALID_BODY_MESSAGE,
        fieldIssues(parseResult.error.errors)
      );
    }
    const validated = parseResult.data;

    // Generate unique customer code with retry on collision
    let maKhachHang = '';
    let isUnique = false;
    let attempts = 0;
    const year = new Date().getFullYear();

    while (!isUnique && attempts < 5) {
      attempts += 1;
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      maKhachHang = `KH-${year}-${randomSuffix}`;
      const existing = await repository.findByCode(maKhachHang);
      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      throw new ConflictError('DATABASE_CONFLICT', 'Không thể tạo mã khách hàng duy nhất. Vui lòng thử lại.');
    }

    const taxCode = validated.ma_so_thue ? validated.ma_so_thue.trim() : null;
    await assertTaxCodeAvailable(taxCode);

    try {
      return await repository.create({
        ma_khach_hang: maKhachHang,
        ten_khach_hang: validated.ten_khach_hang.trim(),
        loai_khach_hang: validated.loai_khach_hang,
        ma_so_thue: taxCode,
        so_dien_thoai: validated.so_dien_thoai.trim(),
        email: validated.email ? validated.email.trim().toLowerCase() : null,
        dia_chi: validated.dia_chi.trim(),
        tinh_thanh_pho: validated.tinh_thanh_pho.trim(),
        nguoi_lien_he: validated.nguoi_lien_he ? validated.nguoi_lien_he.trim() : null,
        han_muc_cong_no: validated.han_muc_cong_no,
        so_ngay_cong_no: validated.so_ngay_cong_no,
        ghi_chu: validated.ghi_chu ? validated.ghi_chu.trim() : null,
        trang_thai: 'hoat_dong',
        nguoi_tao: creatorId,
        nguoi_cap_nhat: creatorId,
      });
    } catch (error) {
      throw toConflictIfTaxCodeTaken(error) || error;
    }
  }

  async function updateCustomer(id, rawInput, updaterId) {
    await getCustomerById(id); // Throws if not found

    const parseResult = updateCustomerSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        INVALID_BODY_MESSAGE,
        fieldIssues(parseResult.error.errors)
      );
    }
    const validated = parseResult.data;

    // Prepare clean update payload
    const updatePayload = {};
    if (validated.ten_khach_hang !== undefined) updatePayload.ten_khach_hang = validated.ten_khach_hang.trim();
    if (validated.loai_khach_hang !== undefined) updatePayload.loai_khach_hang = validated.loai_khach_hang;
    if (validated.ma_so_thue !== undefined) updatePayload.ma_so_thue = validated.ma_so_thue ? validated.ma_so_thue.trim() : null;
    if (validated.so_dien_thoai !== undefined) updatePayload.so_dien_thoai = validated.so_dien_thoai.trim();
    if (validated.email !== undefined) updatePayload.email = validated.email ? validated.email.trim().toLowerCase() : null;
    if (validated.dia_chi !== undefined) updatePayload.dia_chi = validated.dia_chi.trim();
    if (validated.tinh_thanh_pho !== undefined) updatePayload.tinh_thanh_pho = validated.tinh_thanh_pho.trim();
    if (validated.nguoi_lien_he !== undefined) updatePayload.nguoi_lien_he = validated.nguoi_lien_he ? validated.nguoi_lien_he.trim() : null;
    if (validated.han_muc_cong_no !== undefined) updatePayload.han_muc_cong_no = validated.han_muc_cong_no;
    if (validated.so_ngay_cong_no !== undefined) updatePayload.so_ngay_cong_no = validated.so_ngay_cong_no;
    if (validated.ghi_chu !== undefined) updatePayload.ghi_chu = validated.ghi_chu ? validated.ghi_chu.trim() : null;

    // A tax id may be re-sent unchanged; only a value taken by another customer is a conflict
    if (updatePayload.ma_so_thue) {
      await assertTaxCodeAvailable(updatePayload.ma_so_thue, id);
    }

    let updated;
    try {
      updated = await repository.update(id, updatePayload, updaterId);
    } catch (error) {
      throw toConflictIfTaxCodeTaken(error) || error;
    }
    if (!updated) {
      throw new NotFoundError('CUSTOMER_NOT_FOUND', `Không tìm thấy khách hàng có ID ${id}.`);
    }
    return updated;
  }

  async function updateCustomerStatus(id, rawInput, updaterId) {
    await getCustomerById(id); // Throws if not found

    const parseResult = updateCustomerStatusSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        INVALID_BODY_MESSAGE,
        fieldIssues(parseResult.error.errors)
      );
    }
    const validated = parseResult.data;

    const updated = await repository.updateStatus(id, validated.trang_thai, updaterId);
    if (!updated) {
      throw new NotFoundError('CUSTOMER_NOT_FOUND', `Không tìm thấy khách hàng có ID ${id}.`);
    }
    return updated;
  }

  async function getCustomerSummary(id) {
    await getCustomerById(id); // Throws if not found
    return repository.getSummary(id);
  }

  return {
    listCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    updateCustomerStatus,
    getCustomerSummary,
  };
}

const customerService = createCustomerService();

module.exports = {
  createCustomerService,
  customerService,
  customerTypeEnum,
  customerStatusEnum,
  createCustomerSchema,
  updateCustomerSchema,
  updateCustomerStatusSchema,
  customerQuerySchema,
};
