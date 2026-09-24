/**
 * Module validation helpers shared by the sales dialogs.
 *
 * The backend is the authoritative validator: every write endpoint re-checks the
 * payload and answers `422` with `details: [{ field, message }]`. These helpers
 * keep the client on the same contract - identical rules where the form can
 * check locally, and the server's field messages rendered next to the matching
 * input instead of a generic banner.
 */

/**
 * Builds the `status` prop a module control expects from a field-error map.
 *
 * @param {Record<string, string>} fieldErrors
 * @param {string} field
 * @returns {{ type: 'error', message: string } | undefined}
 */
export function fieldStatus(fieldErrors, field) {
  const message = fieldErrors ? fieldErrors[field] : null;
  return message ? { type: 'error', message } : undefined;
}

/** Trims a value for validation without mutating what the user typed. */
export function trimmed(value) {
  return typeof value === 'string' ? value.trim() : value;
}

/** True when a value is empty once trimmed; null/undefined/blank count as empty. */
export function isBlank(value) {
  const text = trimmed(value);
  return text === null || text === undefined || text.length === 0;
}

/**
 * Maps an `ApiError`'s `details` onto form fields.
 *
 * @param {unknown} error Error thrown by a module service (`ApiError`).
 * @param {string[]} [knownFields] Field names the form renders; unknown paths are
 *   reduced to their first segment (`lines.0.so_luong` -> `lines`) and dropped
 *   when that segment is not a form field either. Omit to accept every path.
 * @returns {Record<string, string>} One message per field, first message wins.
 */
export function serverFieldErrors(error, knownFields) {
  const details = error && Array.isArray(error.details) ? error.details : [];
  const allowed = Array.isArray(knownFields) ? knownFields : null;
  const out = {};

  for (const detail of details) {
    const rawField = detail && typeof detail.field === 'string' ? detail.field : '';
    const message = detail && typeof detail.message === 'string' ? detail.message : '';
    if (!rawField || !message) continue;

    const candidates = allowed && !allowed.includes(rawField) ? [rawField.split('.')[0], rawField] : [rawField];
    const field = candidates.find((candidate) => !allowed || allowed.includes(candidate));
    if (!field) continue;
    if (out[field]) continue;

    out[field] = message;
  }

  return out;
}

/* ------------------------------------------------------------------------- *
 * Local rules
 *
 * Every message below is copied from the backend schema it mirrors
 * (`backend/src/services/sales/*.service.js`), so a value that passes the form
 * fails the same way on the server, and a value that fails shows the same text
 * wherever the check ran. Message parity is asserted in `validation.test.js`.
 * ------------------------------------------------------------------------- */

/**
 * Mirrors `PHONE_RE` in `backend/src/utils/sales/validate.js`: a Vietnamese
 * number is either domestic (0 + 9-10 digits) or E.164 (+ + country code 1-9,
 * at most 15 digits). Separators are stripped first by `normalizePhone`.
 */
export const PHONE_PATTERN = /^(?:0\d{9,10}|\+[1-9]\d{7,14})$/;

/** Mirrors `normalizePhone`: spaces and `-` separate digits, they are not content. */
export function normalizePhone(value) {
  return typeof value === 'string' ? value.trim().replace(/[\s-]+/g, '') : value;
}

/** Mirrors `TAX_CODE_RE` in `customer.service.js`: 10 digits or 10 digits-3 digits. */
export const TAX_CODE_PATTERN = /^\d{10}(-\d{3})?$/;

/** `MESSAGES.required` — the answer for a missing field with no default. */
export const GENERIC_REQUIRED = 'Trường này là bắt buộc.';

/** Field bounds mirrored from the backend schemas. */
export const LIMITS = {
  customerName: 200,
  taxCode: 20,
  customerAddress: 500,
  city: 100,
  contact: 150,
  email: 100,
  note: 2000,
  phoneMin: 8,
  phoneMax: 20,
  creditLimit: 1e15,
  creditDays: 3650,
  lineNote: 500,
  quantity: 1e6,
  maxLines: 200,
  receiverName: 150,
  transport: 100,
  reason: 500,
};

/**
 * True when the value is a `YYYY-MM-DD` string naming a real calendar day.
 * Mirrors `isRealDate` in `backend/src/utils/sales/validate.js`: `2026-02-30`
 * passes the shape check but is not a day the server accepts.
 */
export function isRealDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Shape check for `YYYY-MM-DD`, the format `dateISO` accepts before existence. */
export function isDateShape(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Message for a `v.dateISO(message)` field, mirroring the backend's two tiers:
 * a wrong shape answers `formatMessage`, a shape that names no real day answers
 * the shared "Ngày không tồn tại." that `MESSAGES.dateInvalid` carries.
 */
export function isoDateError(value, formatMessage) {
  if (value === undefined) return null; // `.optional()` — the key is absent
  if (typeof value !== 'string') return 'Giá trị phải là chuỗi ký tự.'; // null/number: `parseString` type check
  if (!isDateShape(value)) return formatMessage; // '' and whitespace never match `DATE_RE`
  return isRealDate(value) ? null : 'Ngày không tồn tại.';
}

/**
 * Mirrors `parseNumber` for a `v.coerce.number()` field: a blank string, `NaN`
 * and a non-finite value fail *before* any `int`/`min`/`max` check serves its
 * message (`Number('')` is 0, which the backend refuses to read as a zero).
 * Absent (`undefined`/`null`) values return `null` — `.default()`/`.optional()`
 * decide those, and the caller's range checks skip `NaN` anyway.
 */
export function coerceNumberError(value) {
  if (value === undefined) return null; // absent: `.default()`/`.optional()` decide
  if (value === null) return 'Giá trị phải là số.'; // present but not nullable -> type message
  if (typeof value === 'string' && value.trim() === '') return 'Giá trị phải là số.';
  const amount = Number(value);
  if (Number.isNaN(amount)) return 'Giá trị phải là số.';
  if (!Number.isFinite(amount)) return 'Giá trị phải là số hữu hạn.';
  return null;
}

/**
 * The dialogs' amount normaliser, exported so the payload and the rule read the
 * same value: `Number(value) || 0` (a cleared or unreadable field is the
 * schema's own default 0, which the API accepts).
 */
export const toWireAmount = (value) => Number(value) || 0;

/**
 * The dialogs' quantity normaliser: `Number(value)` with no default, so `null`
 * reaches the API as 0 and an absent value reaches it as `null`.
 */
export const toWireQuantity = (value) => Number(value);

/** Message when `value` is longer than `max`; `null` when it fits. */
export function maxLengthError(value, max, message) {
  return typeof value === 'string' && value.trim().length > max ? message : null;
}

/** Message when a required text field is empty; `null` when it has content. */
export function requiredError(value, message) {
  return isBlank(value) ? message : null;
}

/** First message of an ordered field-error map, as `{ field, message }`. */
export function firstFieldError(fieldErrors) {
  for (const [field, message] of Object.entries(fieldErrors || {})) {
    if (message) return { field, message };
  }
  return null;
}

/**
 * Mirrors `v.phone().trim().min(8).max(20)`: the validator runs length before the
 * pattern, so a short or long value answers the length message and only a value
 * of the right length is tested against `PHONE_RE`. A missing field (no
 * `.optional()`) answers the generic required message; the form always sends a
 * string, where a blank one is simply too short.
 */
function phoneFieldError(value) {
  if (value === undefined || value === null) return GENERIC_REQUIRED;
  const phone = normalizePhone(value);
  if (phone.length < LIMITS.phoneMin) return 'Số điện thoại phải từ 8 ký tự';
  if (phone.length > LIMITS.phoneMax) return 'Số điện thoại tối đa 20 ký tự';
  return PHONE_PATTERN.test(phone) ? null : 'Số điện thoại không đúng định dạng.';
}

const CUSTOMER_TYPE_VALUES = ['ca_nhan', 'to_chuc', 'dai_ly', 'xuat_khau'];

/** Customer type enum values, for pickers that must not drift from the schema. */
export const CUSTOMER_TYPES = CUSTOMER_TYPE_VALUES;

const CUSTOMER_RULES = [
  ['ten_khach_hang', (v) => requiredError(v, 'Tên khách hàng không được để trống') ||
    maxLengthError(v, LIMITS.customerName, 'Tên khách hàng tối đa 200 ký tự')],
  ['loai_khach_hang', (v) => ([...CUSTOMER_TYPE_VALUES].includes(v) ? null : 'Giá trị không nằm trong danh sách cho phép.')],
  ['ma_so_thue', (v) => {
    if (v === undefined || v === null || v === '') return null;
    const taxCode = trimmed(v);
    if (taxCode.length > LIMITS.taxCode) return 'Mã số thuế tối đa 20 ký tự';
    return TAX_CODE_PATTERN.test(taxCode) ? null : 'Mã số thuế không đúng định dạng (10 số hoặc 10 số-3 số)';
  }],
  ['so_dien_thoai', phoneFieldError],
  ['email', (v) => {
    // `parseString` trims before `.email()`, and `.or(v.literal(''))` only accepts
    // an exact empty string — whitespace is a format failure, not an absent field.
    if (v === undefined || v === null || v === '') return null;
    const email = trimmed(v);
    if (email.length > LIMITS.email) return 'Email tối đa 100 ký tự';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'Email không đúng định dạng';
  }],
  ['dia_chi', (v) => requiredError(v, 'Địa chỉ không được để trống') ||
    maxLengthError(v, LIMITS.customerAddress, 'Địa chỉ tối đa 500 ký tự')],
  ['tinh_thanh_pho', (v) => requiredError(v, 'Tỉnh/thành phố không được để trống') ||
    maxLengthError(v, LIMITS.city, 'Tỉnh/thành phố tối đa 100 ký tự')],
  ['nguoi_lien_he', (v) => maxLengthError(v, LIMITS.contact, 'Người liên hệ tối đa 150 ký tự')],
  ['han_muc_cong_no', (v) => {
    // The dialog sends `toWireAmount(v)`, so a cleared field is 0 — never a
    // number failure; only the schema's range checks can fire.
    const amount = toWireAmount(v);
    if (!Number.isFinite(amount)) return 'Giá trị phải là số.';
    if (amount < 0) return 'Hạn mức công nợ phải lớn hơn hoặc bằng 0';
    return amount > LIMITS.creditLimit ? 'Hạn mức công nợ quá lớn' : null;
  }],
  ['so_ngay_cong_no', (v) => {
    const days = toWireAmount(v);
    if (!Number.isFinite(days)) return 'Giá trị phải là số.';
    if (!Number.isInteger(days)) return 'Số ngày công nợ phải là số nguyên';
    if (days < 0) return 'Số ngày công nợ phải lớn hơn hoặc bằng 0';
    return days > LIMITS.creditDays ? 'Số ngày công nợ tối đa 3650 ngày' : null;
  }],
  ['ghi_chu', (v) => maxLengthError(v, LIMITS.note, 'Ghi chú tối đa 2000 ký tự')],
];

/** Every field the customer form can send, in form order. */
export const CUSTOMER_FIELDS = CUSTOMER_RULES.map(([field]) => field);

/** Message for one customer field, or `null` when it is valid. */
export function customerFieldError(values, field) {
  const rule = CUSTOMER_RULES.find(([name]) => name === field);
  return rule ? rule[1](values[field]) : null;
}

/** Customer form errors, one message per field (empty object when valid). */
export function customerFieldErrors(values) {
  const out = {};
  for (const field of CUSTOMER_FIELDS) {
    const message = customerFieldError(values, field);
    if (message) out[field] = message;
  }
  return out;
}

/** Order line errors, keyed `lines`, `lines.<index>.<field>` for the form to place. */
function orderLineErrors(lines) {
  const out = {};
  for (let index = 0; index < (lines || []).length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    const rawProductId = line.product && line.product.id;
    const productId = Number(rawProductId);
    // `v.coerce.number().int(...).positive(...)`: a blank string fails the number
    // check first, an absent key answers the generic required message, and every
    // other bad value (0, negative, fractional) answers the invalid-product one.
    const productProblem =
      rawProductId === undefined || rawProductId === null
        ? GENERIC_REQUIRED
        : coerceNumberError(rawProductId);
    if (productProblem) out[`lines.${index}.ma_san_pham`] = productProblem;
    else if (!Number.isInteger(productId) || productId <= 0) out[`lines.${index}.ma_san_pham`] = 'Mã sản phẩm không hợp lệ';
    // The dialog sends `toWireQuantity(line.quantity)`: a cleared field is 0, an
    // absent one serialises to `null`, and both answer a message before the range.
    const quantity = toWireQuantity(line.quantity);
    if (!Number.isFinite(quantity)) out[`lines.${index}.so_luong`] = 'Giá trị phải là số.';
    else if (quantity <= 0) out[`lines.${index}.so_luong`] = 'Số lượng đặt phải lớn hơn 0';
    else if (quantity > LIMITS.quantity) out[`lines.${index}.so_luong`] = 'Số lượng đặt quá lớn';
    const discount = toWireAmount(line.discountRate);
    if (!Number.isFinite(discount)) out[`lines.${index}.ty_le_giam_gia`] = 'Giá trị phải là số.';
    else if (discount < 0) out[`lines.${index}.ty_le_giam_gia`] = 'Chiết khấu không được âm';
    else if (discount > 100) out[`lines.${index}.ty_le_giam_gia`] = 'Chiết khấu tối đa 100%';
  }
  return out;
}

/** Order form errors mirroring `createOrderSchema` (+ `orderLineInputSchema`). */
export function orderFieldErrors({ customerId, orderDate, requestedDeliveryDate, deliveryAddress, notes, lines } = {}) {
  const out = {};
  if (!Number(customerId)) out.ma_khach_hang = 'Vui lòng chọn khách hàng';
  if (isBlank(orderDate)) out.ngay_dat_hang = 'Ngày đặt hàng là bắt buộc';
  else if (!isRealDate(orderDate)) out.ngay_dat_hang = 'Ngày đặt hàng không hợp lệ (YYYY-MM-DD)';
  if (isBlank(requestedDeliveryDate)) out.ngay_giao_hang_yc = 'Ngày giao hàng yêu cầu là bắt buộc';
  else if (!isRealDate(requestedDeliveryDate)) {
    out.ngay_giao_hang_yc = 'Ngày giao hàng yêu cầu không hợp lệ (YYYY-MM-DD)';
  } else if (isRealDate(orderDate) && requestedDeliveryDate < orderDate) {
    out.ngay_giao_hang_yc = 'Ngày giao hàng yêu cầu không được trước ngày đặt hàng';
  }
  if (isBlank(deliveryAddress)) out.dia_chi_giao_hang = 'Địa chỉ giao hàng không được để trống';
  else if (trimmed(deliveryAddress).length > LIMITS.customerAddress) {
    out.dia_chi_giao_hang = 'Địa chỉ giao hàng tối đa 500 ký tự';
  }
  if (maxLengthError(notes, LIMITS.note, 'Ghi chú tối đa 2000 ký tự')) out.ghi_chu = 'Ghi chú tối đa 2000 ký tự';
  const lineCount = (lines || []).length;
  if (lineCount === 0) out.lines = 'Đơn hàng phải có ít nhất một dòng sản phẩm';
  else if (lineCount > LIMITS.maxLines) out.lines = 'Đơn hàng tối đa 200 dòng sản phẩm';
  else Object.assign(out, orderLineErrors(lines));
  return out;
}

/** Delivery form errors mirroring `createDeliverySchema` (+ `failDeliverySchema`). */
export function deliveryFieldErrors({ orderId, warehouseId, deliveryDate, receiverName, deliveryAddress, transportMethod, notes } = {}) {
  const out = {};
  const order = Number(orderId);
  if (orderId === null || orderId === undefined || trimmed(orderId) === '') out.ma_don_ban_hang = 'Mã đơn hàng là bắt buộc';
  else if (!Number.isInteger(order) || order <= 0) out.ma_don_ban_hang = 'Mã đơn hàng không hợp lệ';
  const warehouse = Number(warehouseId);
  if (warehouseId === null || warehouseId === undefined || trimmed(warehouseId) === '') out.ma_kho = 'Kho xuất hàng là bắt buộc';
  else if (!Number.isInteger(warehouse) || warehouse <= 0) out.ma_kho = 'Mã kho không hợp lệ';
  if (isBlank(deliveryDate)) out.ngay_giao = 'Ngày giao hàng là bắt buộc';
  else if (!isRealDate(deliveryDate)) out.ngay_giao = 'Ngày giao hàng không hợp lệ (YYYY-MM-DD)';
  if (isBlank(receiverName)) out.ten_nguoi_nhan = 'Tên người nhận là bắt buộc';
  else if (trimmed(receiverName).length > LIMITS.receiverName) out.ten_nguoi_nhan = 'Tên người nhận tối đa 150 ký tự';
  if (isBlank(deliveryAddress)) out.dia_chi_giao = 'Địa chỉ giao hàng là bắt buộc';
  else if (trimmed(deliveryAddress).length > LIMITS.customerAddress) out.dia_chi_giao = 'Địa chỉ giao hàng tối đa 500 ký tự';
  if (maxLengthError(transportMethod, LIMITS.transport, 'Phương tiện vận chuyển tối đa 100 ký tự')) {
    out.phuong_tien_van_chuyen = 'Phương tiện vận chuyển tối đa 100 ký tự';
  }
  if (maxLengthError(notes, LIMITS.note, 'Ghi chú tối đa 2000 ký tự')) out.ghi_chu = 'Ghi chú tối đa 2000 ký tự';
  return out;
}

/** Invoice form errors mirroring `createInvoiceSchema`. */
export function invoiceFieldErrors({ orderId, issueDate, paidAmount, notes } = {}) {
  const out = {};
  const order = Number(orderId);
  if (orderId === null || orderId === undefined || trimmed(orderId) === '') out.ma_don_ban_hang = 'Mã đơn hàng là bắt buộc';
  else if (!Number.isInteger(order) || order <= 0) out.ma_don_ban_hang = 'Mã đơn hàng không hợp lệ';
  // The field is `.optional()`, so only an omitted value defaults to today; the
  // dialog always sends `ngay_xuat_hoa_don`, and a cleared input is a submitted
  // empty string that `dateISO` rejects with the format message.
  const issueDateError = isoDateError(
    issueDate,
    'Ngày xuất hóa đơn không đúng định dạng (YYYY-MM-DD)'
  );
  if (issueDateError) out.ngay_xuat_hoa_don = issueDateError;
  const paid = toWireAmount(paidAmount);
  if (!Number.isFinite(paid)) out.so_tien_da_thu = 'Giá trị phải là số.';
  else if (paid < 0) out.so_tien_da_thu = 'Số tiền đã thu không được âm';
  if (maxLengthError(notes, LIMITS.note, 'Ghi chú tối đa 2000 ký tự')) out.ghi_chu = 'Ghi chú tối đa 2000 ký tự';
  return out;
}
