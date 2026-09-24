'use strict';

/**
 * Module-local schema validator for the Sales module.
 *
 * Why this exists: the standalone PH1 services validated every request body/query
 * with `zod`. The frozen Core backend has no `zod` dependency and its
 * `backend/package.json` is not an approved extension point
 * (docs/ph1-remediation/BASELINE.md §4.4 - adding a dependency there would be a
 * frozen-file modification), so the module brings its own validator instead.
 *
 * This reproduces the subset of `zod` behaviour the Sales services rely on:
 *   v.string().min(1,'msg').max(200)     v.number().int().positive('msg')
 *   v.enum([...])                        v.object({...})
 *   v.array(item).min(1,'msg')           v.literal('') / .or(v.literal(''))
 *   .optional() .nullable() .default(x) .partial() .email('msg')
 *   .refine(fn,{message,path}) .superRefine(fn) .transform(fn)
 *
 * Semantics kept from zod: modifiers return a derived schema (shared schemas are
 * never mutated), unknown object keys are stripped, `.default()` fills missing
 * (undefined) values, `.optional()` allows undefined, `.nullable()` allows null,
 * numbers are coerced with JavaScript `Number(value)`, and `safeParse` returns
 * `{ success, data }` or `{ success:false, error:{ errors:[{path, message}] } }`.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** ISO calendar date, `YYYY-MM-DD`. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Vietnamese phone number: domestic 10 digits (mobile 0xxxxxxxxx) OR 11 digits
 * (landline 02xxxxxxxx) OR E.164 (+ + country code 1-9 + up to 14 more digits).
 * Separators are stripped by normalizePhone before this test.
 */
const PHONE_RE = /^(?:0\d{9,10}|\+[1-9]\d{7,14})$/;

/**
 * Strips the separators a phone number may be typed with (spaces and `-`) so
 * `024 3768 9999` and `02437689999` or `+84 91 234-5678` are normalized.
 */
function normalizePhone(value) {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/[\s-]+/g, '');
}

/** True when an ISO date names a real calendar day (`2026-02-30` is not one). */
function isRealDate(value) {
  // Non-strings reach this helper whenever a sibling field failed validation, so
  // the guard has to come before `.split()` — a TypeError here escapes as a 500.
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Parses a coerced boolean. `Boolean('false')` is `true`, so query flags are
 * read explicitly: `true`/`false`, `1`/`0` only — anything else is a 422 rather
 * than a silently inverted filter.
 */
function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (normalised === 'true') return true;
    if (normalised === 'false') return false;
  }
  return INVALID;
}

const INVALID = Symbol('invalid');

const MESSAGES = {
  required: 'Trường này là bắt buộc.',
  string: 'Giá trị phải là chuỗi ký tự.',
  number: 'Giá trị phải là số.',
  boolean: 'Giá trị phải là true hoặc false.',
  enum: 'Giá trị không nằm trong danh sách cho phép.',
  literal: 'Giá trị không hợp lệ.',
  array: 'Giá trị phải là một mảng.',
  object: 'Dữ liệu không hợp lệ.',
  int: 'Giá trị phải là số nguyên.',
  positive: 'Giá trị phải lớn hơn 0.',
  email: 'Email không đúng định dạng.',
  phone: 'Số điện thoại không đúng định dạng.',
  finite: 'Giá trị phải là số hữu hạn.',
  pattern: 'Giá trị không đúng định dạng.',
  unknownKey: 'Trường này không được phép gửi lên.',
  date: 'Ngày phải theo định dạng YYYY-MM-DD.',
  dateInvalid: 'Ngày không tồn tại.',
};

function makeIssue(path, message) {
  return { path: path.slice(), message };
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class Schema {
  constructor(kind, config = {}) {
    this.kind = kind;
    this.config = config;
    this.isOptional = false;
    this.isNullable = false;
    this.hasDefault = false;
    this.defaultValue = undefined;
    this.minValue = null;
    this.minMessage = null;
    this.maxValue = null;
    this.maxMessage = null;
    this.isInt = false;
    this.intMessage = null;
    this.isPositive = false;
    this.positiveMessage = null;
    this.emailMessage = null;
    this.enumMessage = null;
    this.patternRegex = null;
    this.patternMessage = null;
    this.isTrimmed = false;
    this.normalizer = null;
    this.isDateISO = false;
    this.dateMessage = null;
    this.isStrict = false;
    this.refinements = [];
    this.transformFn = null;
    this.alternatives = [];
  }

  derive(mutate) {
    const copy = Object.create(Object.getPrototypeOf(this));
    Object.assign(copy, this);
    copy.refinements = this.refinements.slice();
    copy.alternatives = this.alternatives.slice();
    mutate(copy);
    return copy;
  }

  // ---- chainable modifiers (each returns a derived schema) ----

  optional() {
    return this.derive((s) => {
      s.isOptional = true;
      // zod parity: the outermost wrapper wins, so a later `.optional()`
      // short-circuits `undefined` instead of letting `.default()` fill it.
      // Without this, `.partial()` would re-apply defaults and a PATCH could
      // silently zero untouched columns.
      s.hasDefault = false;
      s.defaultValue = undefined;
    });
  }

  nullable() {
    return this.derive((s) => {
      s.isNullable = true;
    });
  }

  default(value) {
    return this.derive((s) => {
      s.hasDefault = true;
      s.defaultValue = value;
    });
  }

  min(value, message = null) {
    return this.derive((s) => {
      s.minValue = value;
      s.minMessage = message;
    });
  }

  max(value, message = null) {
    return this.derive((s) => {
      s.maxValue = value;
      s.maxMessage = message;
    });
  }

  int(message = null) {
    return this.derive((s) => {
      s.isInt = true;
      s.intMessage = message;
    });
  }

  positive(message = null) {
    return this.derive((s) => {
      s.isPositive = true;
      s.positiveMessage = message;
    });
  }

  email(message = null) {
    return this.derive((s) => {
      s.emailMessage = message || MESSAGES.email;
    });
  }

  trim() {
    return this.derive((s) => {
      s.isTrimmed = true;
    });
  }

  normalize(fn) {
    return this.derive((s) => {
      s.normalizer = fn;
    });
  }

  regex(pattern, message = null) {
    return this.derive((s) => {
      s.patternRegex = pattern;
      s.patternMessage = message || MESSAGES.pattern;
    });
  }

  /**
   * Requires an ISO calendar date (`YYYY-MM-DD`) that actually exists:
   * `2026-02-30` and `2026-13-01` are rejected, not silently rolled over.
   */
  dateISO(message = null) {
    return this.derive((s) => {
      s.isDateISO = true;
      s.dateMessage = message || MESSAGES.date;
    });
  }

  /**
   * Rejects unknown keys instead of stripping them (zod's `.strict()`). Applied
   * to every request-body and query schema so a client cannot probe or smuggle
   * fields the module does not accept.
   */
  strict() {
    if (this.kind !== 'object') {
      throw new Error('strict() is only supported on object schemas');
    }
    return this.derive((s) => {
      s.isStrict = true;
    });
  }

  partial() {
    if (this.kind !== 'object') {
      throw new Error('partial() is only supported on object schemas');
    }
    const shape = {};
    for (const [key, field] of Object.entries(this.config.shape)) {
      shape[key] = field.optional();
    }
    return this.derive((s) => {
      s.config = { ...s.config, shape };
    });
  }

  or(alternative) {
    return this.derive((s) => {
      s.alternatives = s.alternatives.concat([alternative]);
    });
  }

  refine(predicate, options = {}) {
    const message = typeof options === 'string' ? options : options.message;
    const path = typeof options === 'string' ? [] : options.path || [];
    return this.derive((s) => {
      s.refinements = s.refinements.concat([{ type: 'refine', fn: predicate, message, path }]);
    });
  }

  superRefine(fn) {
    return this.derive((s) => {
      s.refinements = s.refinements.concat([{ type: 'superRefine', fn }]);
    });
  }

  transform(fn) {
    return this.derive((s) => {
      s.transformFn = fn;
    });
  }

  // ---- parsing ----

  safeParse(input) {
    const issues = [];
    const data = this.parsePrimary(input, [], issues);
    if (issues.length > 0) {
      return { success: false, error: { errors: issues, issues } };
    }
    return { success: true, data };
  }

  parse(input) {
    const result = this.safeParse(input);
    if (!result.success) {
      const error = new Error(
        result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
      error.issues = result.error.errors;
      throw error;
    }
    return result.data;
  }

  parsePrimary(input, path, issues) {
    if (input === undefined) {
      if (this.hasDefault) return this.defaultValue;
      if (this.isOptional) return undefined;
      issues.push(makeIssue(path, MESSAGES.required));
      return undefined;
    }

    if (input === null) {
      if (this.isNullable) return null;
      issues.push(makeIssue(path, this.typeMessage(input)));
      return undefined;
    }

    const localIssues = [];
    const parsed = this.parseKind(input, path, localIssues);

    if (localIssues.length > 0) {
      if (this.alternatives.length > 0) {
        for (const alternative of this.alternatives) {
          const altIssues = [];
          const altValue = alternative.parsePrimary(input, path, altIssues);
          if (altIssues.length === 0) return altValue;
        }
      }
      for (const issue of localIssues) issues.push(issue);
      return undefined;
    }

    const before = issues.length;
    let value = parsed;

    for (const refinement of this.refinements) {
      if (refinement.type === 'refine') {
        if (!refinement.fn(value)) {
          issues.push(makeIssue(path.concat(refinement.path), refinement.message));
        }
      } else {
        const ctx = {
          addIssue: (issue) => {
            issues.push(makeIssue(path.concat(issue.path || []), issue.message));
          },
        };
        refinement.fn(value, ctx);
      }
    }

    if (issues.length > before) return value;
    if (this.transformFn) value = this.transformFn(value);
    return value;
  }

  parseKind(input, path, issues) {
    switch (this.kind) {
      case 'string':
        return this.parseString(input, path, issues);
      case 'number':
        return this.parseNumber(input, path, issues);
      case 'boolean':
        if (this.config.coerce) {
          const coerced = coerceBoolean(input);
          if (coerced === INVALID) {
            issues.push(makeIssue(path, MESSAGES.boolean));
            return undefined;
          }
          return coerced;
        }
        if (typeof input !== 'boolean') {
          issues.push(makeIssue(path, MESSAGES.boolean));
          return undefined;
        }
        return input;
      case 'enum':
        if (!this.config.values.includes(input)) {
          issues.push(makeIssue(path, this.enumMessage || MESSAGES.enum));
          return undefined;
        }
        return input;
      case 'literal':
        if (input !== this.config.value) {
          issues.push(makeIssue(path, this.config.message || MESSAGES.literal));
          return undefined;
        }
        return input;
      case 'array':
        return this.parseArray(input, path, issues);
      case 'object':
        return this.parseObject(input, path, issues);
      default:
        throw new Error(`Unsupported schema kind: ${this.kind}`);
    }
  }

  parseString(input, path, issues) {
    let value = input;
    if (this.config.coerce && typeof value !== 'string') {
      value = String(value);
    }
    if (typeof value !== 'string') {
      issues.push(makeIssue(path, MESSAGES.string));
      return undefined;
    }
    if (this.isTrimmed) {
      value = value.trim();
    }
    if (this.normalizer) {
      value = this.normalizer(value);
    }
    if (this.minValue !== null && value.length < this.minValue) {
      issues.push(
        makeIssue(path, this.minMessage || `Giá trị phải có ít nhất ${this.minValue} ký tự.`)
      );
      return undefined;
    }
    if (this.maxValue !== null && value.length > this.maxValue) {
      issues.push(
        makeIssue(path, this.maxMessage || `Giá trị không được vượt quá ${this.maxValue} ký tự.`)
      );
      return undefined;
    }
    if (this.patternRegex && !this.patternRegex.test(value)) {
      issues.push(makeIssue(path, this.patternMessage));
      return undefined;
    }
    if (this.emailMessage && !EMAIL_RE.test(value)) {
      issues.push(makeIssue(path, this.emailMessage));
      return undefined;
    }
    if (this.isDateISO) {
      if (!DATE_RE.test(value)) {
        issues.push(makeIssue(path, this.dateMessage));
        return undefined;
      }
      if (!isRealDate(value)) {
        issues.push(makeIssue(path, MESSAGES.dateInvalid));
        return undefined;
      }
    }
    return value;
  }

  parseNumber(input, path, issues) {
    let value = input;
    if (this.config.coerce) {
      if (typeof input === 'string' && input.trim() === '') {
        // `Number('')` is 0: an empty box must not read as a legitimate zero.
        issues.push(makeIssue(path, MESSAGES.number));
        return undefined;
      }
      value = typeof input === 'number' ? input : Number(input);
    }
    if (typeof value !== 'number' || Number.isNaN(value)) {
      issues.push(makeIssue(path, MESSAGES.number));
      return undefined;
    }
    if (!Number.isFinite(value)) {
      // `Number('Infinity')`, `Number('1e999')` and raw Infinity are not usable
      // amounts, quantities or pagination values.
      issues.push(makeIssue(path, MESSAGES.finite));
      return undefined;
    }
    if (this.isInt && !Number.isInteger(value)) {
      issues.push(makeIssue(path, this.intMessage || MESSAGES.int));
      return undefined;
    }
    if (this.isPositive && value <= 0) {
      issues.push(makeIssue(path, this.positiveMessage || MESSAGES.positive));
      return undefined;
    }
    if (this.minValue !== null && value < this.minValue) {
      issues.push(
        makeIssue(path, this.minMessage || `Giá trị phải lớn hơn hoặc bằng ${this.minValue}.`)
      );
      return undefined;
    }
    if (this.maxValue !== null && value > this.maxValue) {
      issues.push(
        makeIssue(path, this.maxMessage || `Giá trị không được vượt quá ${this.maxValue}.`)
      );
      return undefined;
    }
    return value;
  }

  parseArray(input, path, issues) {
    if (!Array.isArray(input)) {
      issues.push(makeIssue(path, MESSAGES.array));
      return undefined;
    }
    if (this.minValue !== null && input.length < this.minValue) {
      issues.push(
        makeIssue(path, this.minMessage || `Cần ít nhất ${this.minValue} phần tử.`)
      );
      return undefined;
    }
    if (this.maxValue !== null && input.length > this.maxValue) {
      issues.push(
        makeIssue(path, this.maxMessage || `Chỉ cho phép tối đa ${this.maxValue} phần tử.`)
      );
      return undefined;
    }
    const items = [];
    for (let index = 0; index < input.length; index += 1) {
      const itemIssues = [];
      const parsed = this.config.items.parsePrimary(input[index], path.concat(index), itemIssues);
      if (itemIssues.length > 0) {
        for (const issue of itemIssues) issues.push(issue);
      } else {
        items.push(parsed);
      }
    }
    return items;
  }

  parseObject(input, path, issues) {
    if (!isPlainObject(input)) {
      issues.push(makeIssue(path, MESSAGES.object));
      return undefined;
    }
    const output = {};
    if (this.isStrict) {
      for (const key of Object.keys(input)) {
        if (!Object.prototype.hasOwnProperty.call(this.config.shape, key)) {
          issues.push(makeIssue(path.concat(key), MESSAGES.unknownKey));
        }
      }
    }
    for (const [key, field] of Object.entries(this.config.shape)) {
      const raw = input[key];
      const childPath = path.concat(key);

      if (raw === undefined && field.hasDefault) {
        output[key] = field.defaultValue;
        continue;
      }

      const fieldIssues = [];
      const parsed = field.parsePrimary(raw, childPath, fieldIssues);
      if (fieldIssues.length > 0) {
        for (const issue of fieldIssues) issues.push(issue);
      } else if (raw === undefined && field.isOptional && !field.hasDefault) {
        // zod omits optional-undefined keys instead of materialising them as undefined
        continue;
      } else {
        output[key] = parsed;
      }
    }
    return output;
  }

  typeMessage(input) {
    if (this.kind === 'string') return MESSAGES.string;
    if (this.kind === 'number') return MESSAGES.number;
    if (this.kind === 'boolean') return MESSAGES.boolean;
    if (this.kind === 'array') return MESSAGES.array;
    if (this.kind === 'object') return MESSAGES.object;
    if (this.kind === 'enum') return this.enumMessage || MESSAGES.enum;
    if (this.kind === 'literal') return this.config.message || MESSAGES.literal;
    return `Giá trị không hợp lệ (${typeof input}).`;
  }
}

const v = {
  string: (config = {}) => new Schema('string', config),
  number: (config = {}) => new Schema('number', config),
  boolean: () => new Schema('boolean'),
  enum: (values, config = {}) => {
    const schema = new Schema('enum', { values, message: config.message || null });
    schema.enumMessage = config.message || null;
    return schema;
  },
  literal: (value, config = {}) => new Schema('literal', { value, message: config.message || null }),
  /** ISO calendar date string (`YYYY-MM-DD`) that must exist on the calendar. */
  dateISO: (message = null) => new Schema('string', {}).dateISO(message),
  /**
   * Vietnamese phone number: separators (spaces, `-`) are stripped, then the
   * value must be domestic 10/11 digits or E.164.
   */
  phone: (message = null) =>
    new Schema('string', {}).normalize(normalizePhone).regex(PHONE_RE, message || MESSAGES.phone),
  array: (items, config = {}) => new Schema('array', { items, ...config }),
  object: (shape) => new Schema('object', { shape }),
  coerce: {
    number: () => new Schema('number', { coerce: true }),
    string: () => new Schema('string', { coerce: true }),
    /**
     * zod parity (`z.coerce.boolean()` applies JavaScript `Boolean()`), which
     * means the string `"false"` coerces to `true`. Kept deliberately so the
     * ported query behaviour matches the validated PH1 behaviour; flagged in the
     * as-built notes as a quirk to revisit with the Integration Owner.
     */
    boolean: () => new Schema('boolean', { coerce: true }),
  },
};

module.exports = { v, MESSAGES, Schema, PHONE_RE, DATE_RE, isRealDate, normalizePhone };
