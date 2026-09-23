const db = require('../config/database');
const { normalizeRole, CANONICAL_ROLES, ROLE_PERMISSIONS } = require('../config/roleMapping');

// Seed demo users cached for fast auth verification
const DEMO_USERS = {
  1: { id: 1, ho_ten: 'Quản Trị Viên Hệ Thống', email: 'admin@may10.vn', vai_tro: 'admin', canonicalRole: 'ADMIN', phong_ban: 'Công Nghệ Thông Tin' },
  2: { id: 2, ho_ten: 'Nguyễn Văn Bán', email: 'banhang@may10.vn', vai_tro: 'ban_hang', canonicalRole: 'SALES', phong_ban: 'Phòng Kinh Doanh' },
  3: { id: 3, ho_ten: 'Trần Văn Xuất', email: 'sanxuat@may10.vn', vai_tro: 'san_xuat', canonicalRole: 'PRODUCTION', phong_ban: 'Phòng Kỹ Thuật Sản Xuất' },
  4: { id: 4, ho_ten: 'Lê Thị Mua', email: 'muahang@may10.vn', vai_tro: 'mua_hang', canonicalRole: 'PURCHASING', phong_ban: 'Phòng Cung Ứng' },
  5: { id: 5, ho_ten: 'Phạm Văn Kho', email: 'kho@may10.vn', vai_tro: 'kho', canonicalRole: 'WAREHOUSE', phong_ban: 'Bộ Phận Kho Vận' },
  6: { id: 6, ho_ten: 'Hoàng Thị Toán', email: 'ketoan@may10.vn', vai_tro: 'ke_toan', canonicalRole: 'ACCOUNTING', phong_ban: 'Phòng Tài Chính Kế Toán' },
  7: { id: 7, ho_ten: 'Nguyễn Văn Trưởng', email: 'ketoantruong@may10.vn', vai_tro: 'ke_toan_truong', canonicalRole: 'KE_TOAN_TRUONG', phong_ban: 'Phòng Tài Chính Kế Toán' },
};

const DEMO_USERS_BY_ROLE = {
  'admin': DEMO_USERS[1],
  'ADMIN': DEMO_USERS[1],
  'ban_hang': DEMO_USERS[2],
  'sales': DEMO_USERS[2],
  'SALES': DEMO_USERS[2],
  'san_xuat': DEMO_USERS[3],
  'production': DEMO_USERS[3],
  'PRODUCTION': DEMO_USERS[3],
  'mua_hang': DEMO_USERS[4],
  'purchasing': DEMO_USERS[4],
  'PURCHASING': DEMO_USERS[4],
  'kho': DEMO_USERS[5],
  'warehouse': DEMO_USERS[5],
  'WAREHOUSE': DEMO_USERS[5],
  'ke_toan': DEMO_USERS[6],
  'accounting': DEMO_USERS[6],
  'ACCOUNTING': DEMO_USERS[6],
  'ke_toan_truong': DEMO_USERS[7],
  'KE_TOAN_TRUONG': DEMO_USERS[7],
  'chief_accountant': DEMO_USERS[7],
  'CHIEF_ACCOUNTANT': DEMO_USERS[7],
};

const crypto = require('crypto');

// Khóa bí mật ký token máy chủ nội bộ (chỉ lưu trên backend environment)
const TOKEN_SECRET = process.env.ERP_AUTH_SECRET || 'may10-erp-auth-internal-secure-signing-key-2026';

/**
 * Ký và phát hành token xác thực bảo mật (HMAC-SHA256)
 * Định dạng: erp_token_{userId}_{timestamp}.{signature}
 * @param {number|string} userId
 * @param {number} [timestamp]
 * @returns {string}
 */
function signToken(userId, timestamp = Date.now()) {
  const payload = `erp_token_${userId}_${timestamp}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

/**
 * Xác minh tính hợp lệ và chữ ký số mật mã học của token
 * @param {string} token
 * @returns {{ userId: number, timestamp: number } | null}
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;

  // Cấu trúc bắt buộc: erp_token_{userId}_{timestamp}.{64-hex HMAC signature}
  const match = token.match(/^erp_token_(\d+)_(\d+)\.([a-f0-9]{64})$/);
  if (!match) return null;

  const userId = parseInt(match[1], 10);
  const timestamp = parseInt(match[2], 10);
  const signature = match[3];

  const payload = `erp_token_${userId}_${timestamp}`;
  const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');

  // So sánh constant-time ngăn chặn tấn công Timing Attack
  try {
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  // Xác thực thời hạn sống của token (Tối đa 24 giờ)
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;
  if (timestamp > now + 60000 || (now - timestamp) > maxAge) {
    return null; // Token hết hạn hoặc timestamp tương lai bất thường
  }

  return { userId, timestamp };
}

/**
 * Xử lý xác thực người dùng từ Token (HMAC-SHA256 Cryptographic Authentication)
 * Bảo đảm NGUYÊN TẮC:
 * 1. Không nhận diện nặc danh: Không tự động gán vai trò khi thiếu token hợp lệ.
 * 2. Header 'x-role' và 'x-user-id' KHÔNG ĐƯỢC TIN CẬY. Danh tính chỉ lấy từ Token đã ký số.
 * 3. Chống Token Forgery: Mọi token không có chữ ký số hợp lệ đều bị từ chối 100%.
 */
async function resolveUserIdentity(req) {
  const authHeader = req.headers['authorization'] || '';
  const authToken = req.headers['x-auth-token'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authToken.trim();

  if (!token) {
    return null;
  }

  // BẢO MẬT: Bắt buộc xác minh chữ ký số HMAC-SHA256 (Khắc phục triệt để RBAC-F01)
  const verified = verifyToken(token);
  if (!verified) {
    return null; // Token giả mạo, không có chữ ký hoặc sai chữ ký số
  }

  const matchedUserId = verified.userId;

  // Tra cứu User từ DB erp_may10 để lấy vai_tro THỰC TẾ
  try {
    const res = await db.query(
      'SELECT id, ho_ten, email, vai_tro, phong_ban, trang_thai FROM nguoi_dung WHERE id = $1',
      [matchedUserId]
    );
    if (res.rows.length > 0) {
      const dbUser = res.rows[0];

      // Kiểm tra trạng thái tài khoản: bắt buộc phải đang hoạt động
      if (dbUser.trang_thai !== 'hoat_dong') {
        return null;
      }

      const canonical = normalizeRole(dbUser.vai_tro) || 'kho';
      return {
        id: dbUser.id,
        name: dbUser.ho_ten,
        email: dbUser.email,
        dbRole: dbUser.vai_tro,
        role: canonical, // Canonical role tiếng Việt ('kho', 'admin', 'ban_hang', ...)
        rawRole: dbUser.vai_tro,
        phong_ban: dbUser.phong_ban,
        trang_thai: dbUser.trang_thai,
      };
    }
  } catch (err) {
    console.warn('[RBAC Middleware DB Lookup Warning]:', err.message);
  }

  return null;
}

// Middleware xác thực RBAC cốt lõi cho ERP May 10
async function authMiddleware(req, res, next) {
  try {
    const user = await resolveUserIdentity(req);

    if (user) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware bắt buộc phải đăng nhập (Enforce Authentication)
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Yêu cầu không hợp lệ. Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.',
    });
  }
  next();
}

/**
 * Middleware kiểm tra vai trò người dùng (Bảo đảm tương thích ngược với PH4)
 * Cho phép truyền vào cả mã tiếng Việt ('kho', 'ban_hang', 'admin') hoặc mã CANONICAL ('WAREHOUSE', 'SALES', 'ADMIN')
 * @param {...string} allowedRoles
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Bạn chưa đăng nhập hoặc không có phiên làm việc hợp lệ.',
      });
    }

    // Luôn ưu tiên toàn quyền cho ADMIN
    if (req.user.role === CANONICAL_ROLES.ADMIN || req.user.role === 'admin' || req.user.role === 'ADMIN') {
      return next();
    }

    // Chuẩn hóa danh sách các vai trò được phép về CANONICAL ROLES
    const normalizedAllowed = allowedRoles
      .map(r => normalizeRole(r))
      .filter(Boolean);

    // Kiểm tra xem vai trò canonical của user có nằm trong danh sách hay không
    if (normalizedAllowed.includes(req.user.role) || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN',
      message: `Vai trò [${req.user.role}] không có quyền thực hiện thao tác này. Cần một trong các vai trò: ${allowedRoles.join(', ')}`,
    });
  };
}

/**
 * Middleware kiểm tra đặc quyền chi tiết (Permission-based Access Control)
 * @param {...string} requiredPermissions
 */
function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Bạn chưa đăng nhập hoặc không có phiên làm việc hợp lệ.',
      });
    }

    // ADMIN luôn có toàn quyền
    if (req.user.role === CANONICAL_ROLES.ADMIN || req.user.role === 'admin' || req.user.role === 'ADMIN') {
      return next();
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || ROLE_PERMISSIONS[normalizeRole(req.user.role)] || [];
    const hasAll = requiredPermissions.every(p => userPermissions.includes(p));

    if (hasAll) {
      return next();
    }

    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN',
      message: `Bạn không có đặc quyền cần thiết: [${requiredPermissions.join(', ')}].`,
    });
  };
}

module.exports = {
  authMiddleware,
  requireAuth,
  requireRoles,
  requirePermission,
  resolveUserIdentity,
  signToken,
  verifyToken,
};
