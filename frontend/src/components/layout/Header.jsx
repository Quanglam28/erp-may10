import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Search,
  User,
  LogOut,
  Shield,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowRight,
  Home,
} from 'lucide-react';
import { useAuth } from '../rbac/AuthContext';
import { DEMO_ACCOUNTS } from '../../config/roles';
import portalService from '../../services/portalService';

// Module top-nav definitions: 7 primary enterprise modules
const TOP_NAV_SECTIONS = [
  {
    id: 'home',
    title: 'Trang chủ',
    path: '/',
    exact: true,
  },
  {
    id: 'sales',
    title: 'Kinh doanh',
    path: '/sales',
    permission: 'sales.view',
    items: [
      { title: 'Bán hàng & Đơn hàng', path: '/sales' },
      { title: 'Quản lý Khách hàng', path: '/sales' },
    ],
  },
  {
    id: 'production',
    title: 'Sản xuất',
    path: '/production',
    permission: 'production.view',
    items: [
      { title: 'Kế hoạch sản xuất', path: '/production' },
      { title: 'Lệnh sản xuất (LSX)', path: '/production' },
    ],
  },
  {
    id: 'purchasing',
    title: 'Mua hàng',
    path: '/purchasing',
    permission: 'purchasing.view',
    items: [
      { title: 'Tổng quan', path: '/purchasing' },
      { title: 'Đơn mua hàng (PO)', path: '/purchasing/purchase-orders' },
      { title: 'Quản lý Nhà cung cấp', path: '/purchasing/suppliers' },
    ],
  },
  {
    id: 'warehouse',
    title: 'Kho & Vật tư',
    path: '/warehouse?tab=dashboard',
    permission: 'warehouse.view',
    items: [
      { title: 'Tổng quan kho', path: '/warehouse?tab=dashboard' },
      { title: 'Tồn kho & Thẻ kho', path: '/warehouse?tab=ton-kho' },
      { title: 'Vị trí kho & Kệ', path: '/warehouse?tab=vi-tri' },
      { title: 'Lô vật tư & Cây vải', path: '/warehouse?tab=lo-vat-tu' },
      { title: 'Phiếu nhập kho', path: '/warehouse?tab=phieu-nhap' },
      { title: 'Phiếu xuất kho', path: '/warehouse?tab=phieu-xuat' },
      { title: 'Điều chuyển kho', path: '/warehouse?tab=phieu-chuyen' },
      { title: 'Kiểm kê kho', path: '/warehouse?tab=kiem-ke' },
    ],
  },
  {
    id: 'accounting',
    title: 'Tài chính',
    path: '/accounting',
    permission: 'accounting.view',
    items: [
      { title: 'Kế toán & Sổ cái', path: '/accounting' },
      { title: 'Quản lý Công nợ', path: '/accounting' },
      { title: 'Giá thành sản phẩm', path: '/accounting' },
    ],
  },
  {
    id: 'admin',
    title: 'Quản trị',
    path: '/admin/users',
    permission: 'admin.users',
    items: [
      { title: 'Quản lý Người dùng', path: '/admin/users' },
      { title: 'Vai trò & Phân quyền', path: '/admin/permissions' },
    ],
  },
];

export default function Header({ onToggleSidebar, isSidebarOpen }) {
  const { user, role, roleMeta, hasPermission, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === '/';

  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Track window scroll on homepage for transparent-to-floating-glass transition
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);
  const navContainerRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  // Clear timeout helper
  const cancelCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  // Hover enter: cancel any pending close and immediately show dropdown
  const handleDropdownEnter = (sectionId) => {
    cancelCloseTimeout();
    setActiveDropdown(sectionId);
  };

  // Hover leave: schedule close with a small 180ms delay (hover bridge)
  const handleDropdownLeave = () => {
    cancelCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      cancelCloseTimeout();
    };
  }, []);

  // Fetch notifications
  useEffect(() => {
    let isMounted = true;
    const fetchNotifs = async () => {
      try {
        const notifs = await portalService.getNotifications();
        if (isMounted) {
          setNotifications(notifs);
          setUnreadCount(notifs.filter((n) => !n.read).length);
        }
      } catch (err) {
        console.warn('Lỗi lấy thông báo header:', err);
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
      if (navContainerRef.current && !navContainerRef.current.contains(e.target)) {
        cancelCloseTimeout();
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu & active dropdown on route change
  useEffect(() => {
    cancelCloseTimeout();
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname, location.search]);

  const handleRoleChange = (newRoleCode) => {
    switchRole(newRoleCode);
    setShowUserMenu(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter sections by role and RBAC permission
  const authorizedSections = TOP_NAV_SECTIONS.filter((section) => {
    if (!section.permission) return true;
    if (role === 'admin') return true;
    return hasPermission(section.permission);
  }).map((section) => {
    if (!section.items) return section;
    const filteredItems = section.items.filter((item) => {
      if (!item.permission) return true;
      if (role === 'admin') return true;
      return hasPermission(item.permission);
    });
    return { ...section, items: filteredItems };
  });

  const isNavActive = (section) => {
    if (section.exact) {
      return location.pathname === '/';
    }
    const cleanPath = section.path.split('?')[0];
    return location.pathname.startsWith(cleanPath);
  };

  // Header appearance state:
  // On Homepage:
  // - When at top (!isScrolled): sits directly over the sky hero with transparent white glass, white text/icons.
  // - When scrolled (isScrolled): transforms smoothly into a floating light-blue glass pill container.
  // On Module pages:
  // - Stays as a crisp sticky top navigation bar with light blue glass / white backdrop.
  const isTransparentOnHero = isHomePage && !isScrolled;

  return (
    <header
      className={`z-40 transition-all duration-300 ${
        isHomePage
          ? isScrolled
            ? 'fixed top-2.5 inset-x-3 sm:inset-x-6 max-w-[1540px] mx-auto rounded-2xl bg-[#EBF5FF]/92 backdrop-blur-xl border border-white/60 shadow-lg'
            : 'absolute top-3 inset-x-3 sm:inset-x-6 max-w-[1540px] mx-auto rounded-2xl bg-white/12 backdrop-blur-md border border-white/25 shadow-none'
          : 'sticky top-0 w-full bg-white/95 backdrop-blur-md border-b border-[#DCEAF4] shadow-2xs'
      }`}
    >
      <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3 max-w-[1540px] mx-auto">
        {/* LEFT: Mobile Sidebar Toggle (on Module pages) + Brand Presentation */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {!isHomePage && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 -ml-1 rounded-lg text-[#0F5FAF] hover:text-[#0b4885] hover:bg-[#EAF5FC] lg:hidden transition-colors"
              aria-label="Mở danh mục phân hệ"
              title="Danh mục phân hệ"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none"
            aria-label="May 10 ERP Trang chủ"
          >
            <div className="relative flex items-center">
              <img
                src="/images/garco10-logo.svg"
                alt="Logo May 10"
                className={`h-7 w-auto object-contain transition-all duration-200 group-hover:scale-105 ${
                  isTransparentOnHero ? 'brightness-0 invert drop-shadow-xs' : ''
                }`}
              />
            </div>
            <div className="hidden sm:block">
              <div
                className={`font-bold text-xs tracking-tight leading-tight flex items-center gap-1.5 transition-colors ${
                  isTransparentOnHero ? 'text-white' : 'text-[#0F4C81]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    isTransparentOnHero ? 'bg-white' : 'bg-[#0F5FAF]'
                  }`}
                />
                TỔNG CÔNG TY MAY 10
              </div>
              <div
                className={`text-[9.5px] font-semibold tracking-wider uppercase transition-colors ${
                  isTransparentOnHero ? 'text-white/80' : 'text-[#164E78]/75'
                }`}
              >
                HỆ THỐNG QUẢN TRỊ ERP
              </div>
            </div>
          </Link>
        </div>

        {/* CENTER: Unified 7-Module Navigation (Always available on Desktop) */}
        <nav
          ref={navContainerRef}
          className="hidden xl:flex items-center gap-1 text-xs font-medium"
          aria-label="Thanh điều hướng phân hệ ERP"
        >
          {authorizedSections.map((section) => {
            const active = isNavActive(section);
            const hasSub = section.items && section.items.length > 0;
            const isOpen = activeDropdown === section.id;

            return (
              <div
                key={section.id}
                className="relative"
                onMouseEnter={() => hasSub && handleDropdownEnter(section.id)}
                onMouseLeave={() => hasSub && handleDropdownLeave()}
              >
                <Link
                  to={section.path}
                  onClick={() => {
                    cancelCloseTimeout();
                    setActiveDropdown(null);
                  }}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 ${
                    active
                      ? isTransparentOnHero
                        ? 'bg-[#0B63CE]/85 text-white font-semibold rounded-full px-3.5 py-1.5 shadow-sm border border-white/30 backdrop-blur-sm'
                        : 'bg-[#0F5FAF] text-white font-semibold rounded-full px-3.5 py-1.5 shadow-xs'
                      : isTransparentOnHero
                      ? 'text-white/95 hover:text-white hover:bg-white/20 rounded-full px-3 py-1.5'
                      : 'text-[#164E78] hover:text-[#0F5FAF] hover:bg-[#F0F7FC] rounded-full px-3 py-1.5'
                  }`}
                >
                  {section.id === 'home' && (
                    <Home className="w-3.5 h-3.5 text-current flex-shrink-0" />
                  )}
                  <span className="whitespace-nowrap">{section.title}</span>
                  {section.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ml-0.5 whitespace-nowrap ${
                        active
                          ? 'bg-white text-[#0F5FAF]'
                          : isTransparentOnHero
                          ? 'bg-white/30 text-white border border-white/40'
                          : 'bg-[#0F5FAF] text-white'
                      }`}
                    >
                      {section.badge}
                    </span>
                  )}
                  {hasSub && (
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        isOpen
                          ? 'rotate-180 text-current'
                          : active
                          ? 'text-white/80'
                          : isTransparentOnHero
                          ? 'text-white/75'
                          : 'text-[#628DAE]'
                      }`}
                    />
                  )}
                </Link>

                {/* Submenu Dropdown Container with Hover Bridge */}
                {hasSub && isOpen && (
                  <div
                    className={`absolute top-full pt-1.5 z-50 animate-in fade-in duration-150 ${
                      section.id === 'admin' ? 'right-0' : 'left-0'
                    }`}
                    onMouseEnter={() => handleDropdownEnter(section.id)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    {/* Invisible Hover Bridge: Seamless bridge overlapping the parent button bottom edge */}
                    <div className="absolute -top-2 left-0 right-0 h-3.5 pointer-events-auto" />

                    {/* Dropdown Floating Card */}
                    <div
                      className="min-w-[215px] rounded-xl py-1.5 bg-white/95 backdrop-blur-md border border-[#DCEAF4] shadow-md"
                      style={{
                        boxShadow: '0 8px 24px rgba(15, 76, 129, 0.10)',
                      }}
                    >
                      <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5F6F82] border-b border-[#DCEAF4] mb-1">
                        {section.title}
                      </div>
                      <div className="space-y-0.5 px-1">
                        {section.items.map((subItem, idx) => {
                          const isSubActive =
                            location.pathname + location.search === subItem.path;
                          return (
                            <Link
                              key={idx}
                              to={subItem.path}
                              onClick={() => {
                                cancelCloseTimeout();
                                setActiveDropdown(null);
                              }}
                              className={`block px-3 py-1.5 text-xs whitespace-nowrap rounded-lg transition-colors ${
                                isSubActive
                                  ? 'bg-[#EAF5FC] text-[#0F5FAF] font-semibold'
                                  : 'text-[#172033] hover:bg-[#EAF5FC] hover:text-[#0F5FAF]'
                              }`}
                            >
                              {subItem.title}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* RIGHT: Quick Search, Notifications, User Profile & Mobile Nav Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Quick Search */}
          <div className="hidden md:block w-40 lg:w-48 xl:w-52 relative">
            <div
              className={`absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none transition-colors ${
                isTransparentOnHero ? 'text-white/80' : 'text-[#5A8CAE]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm nhanh..."
              className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-full focus:outline-none transition-all ${
                isTransparentOnHero
                  ? 'bg-white/18 text-white placeholder-white/75 border border-white/35 focus:bg-white/30 focus:border-white'
                  : 'bg-white/70 hover:bg-white focus:bg-white border border-[#DCEAF4] text-[#172033] placeholder-[#5A8CAE] focus:ring-1 focus:ring-[#0F5FAF] focus:border-[#0F5FAF] shadow-2xs'
              }`}
            />
          </div>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className={`relative p-2 rounded-full transition-colors ${
                isTransparentOnHero
                  ? 'text-white hover:bg-white/20'
                  : 'text-[#0F3B66] hover:text-[#0F5FAF] hover:bg-[#EAF5FC]'
              }`}
              title="Thông báo vận hành"
              aria-label="Thông báo"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>

            {showNotifMenu && (
              <div
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl py-2 z-50 animate-in fade-in duration-150"
                style={{
                  backgroundColor: 'rgba(245, 250, 255, 0.98)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(160, 205, 235, 0.6)',
                  boxShadow: '0 12px 30px rgba(25, 75, 120, 0.15)',
                }}
              >
                <div className="px-3.5 py-2 border-b border-[#D6EDFF] flex items-center justify-between">
                  <span className="font-bold text-xs text-[#0F3B66]">
                    Thông báo vận hành ({notifications.length})
                  </span>
                  <Link
                    to={hasPermission('warehouse.view') ? '/warehouse?tab=ton-kho' : '/'}
                    onClick={() => setShowNotifMenu(false)}
                    className="text-[11px] text-[#0F5FAF] hover:underline font-medium"
                  >
                    Xem tất cả
                  </Link>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#EAF4FB]">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#6C98B8]">
                      Không có thông báo mới
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 hover:bg-white/80 text-xs transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-[#0F3B66] leading-tight">
                              {n.title}
                            </div>
                            <p className="text-[11px] text-[#4A7D9D] mt-0.5">{n.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Role Switcher */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-full transition-colors ${
                isTransparentOnHero ? 'hover:bg-white/20' : 'hover:bg-[#EAF5FC]'
              }`}
              aria-label="Menu tài khoản"
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs transition-colors ${
                  isTransparentOnHero
                    ? 'bg-white text-[#0B63CE]'
                    : 'bg-[#0F5FAF] text-white'
                }`}
              >
                {user?.ho_ten ? user.ho_ten.charAt(0) : 'M'}
              </div>
              <div className="hidden md:block text-left">
                <div
                  className={`text-xs font-semibold leading-none truncate max-w-[120px] transition-colors ${
                    isTransparentOnHero ? 'text-white' : 'text-[#0F3B66]'
                  }`}
                >
                  {user?.ho_ten || 'Người dùng'}
                </div>
                <div
                  className={`text-[10px] mt-0.5 leading-none transition-colors ${
                    isTransparentOnHero ? 'text-white/80' : 'text-[#4A7D9D]'
                  }`}
                >
                  {roleMeta?.shortName}
                </div>
              </div>
              <ChevronDown
                className={`w-3 h-3 transition-colors ${
                  isTransparentOnHero ? 'text-white/85' : 'text-[#5A8CAE]'
                }`}
              />
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-xl py-1 z-50 animate-in fade-in duration-150"
                style={{
                  backgroundColor: 'rgba(245, 250, 255, 0.98)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(160, 205, 235, 0.6)',
                  boxShadow: '0 12px 30px rgba(25, 75, 120, 0.15)',
                }}
              >
                <div className="px-3.5 py-2 border-b border-[#D6EDFF]">
                  <p className="text-xs font-bold text-[#0F3B66]">{user?.ho_ten}</p>
                  <p className="text-[11px] text-[#4A7D9D] truncate">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-[#D6EDFF] text-[#0F5FAF] font-medium">
                    {roleMeta?.department || 'Tổng Công ty May 10'}
                  </span>
                </div>

                {/* Role Switcher Menu */}
                <div className="px-3.5 py-2 border-b border-[#D6EDFF]">
                  <p className="text-[10px] font-bold text-[#628DAE] uppercase tracking-wider mb-1">
                    Vai trò tài khoản:
                  </p>
                  <div className="space-y-0.5">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.code}
                        onClick={() => handleRoleChange(acc.code)}
                        className={`w-full text-left px-2 py-1 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          acc.code === role
                            ? 'bg-[#0F5FAF] text-white font-bold'
                            : 'text-[#0F3B66] hover:bg-white/80'
                        }`}
                      >
                        <span>{acc.shortName}</span>
                        <span
                          className={`text-[10px] font-mono ${
                            acc.code === role ? 'text-white/80' : 'text-[#628DAE]'
                          }`}
                        >
                          {acc.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full px-3.5 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium transition-colors rounded-b-xl"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Navigation Drawer Toggle (for the 7 Modules) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-full xl:hidden transition-colors ${
              isTransparentOnHero
                ? 'text-white hover:bg-white/20'
                : 'text-[#0F3B66] hover:text-[#0F5FAF] hover:bg-[#EAF5FC]'
            }`}
            aria-label="Mở danh sách phân hệ"
            title="Danh sách phân hệ"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Panel (Responsive 7-Module Access) */}
      {mobileMenuOpen && (
        <div
          className="xl:hidden px-4 py-3 border-t border-[#CBE5F7] animate-in slide-in-from-top duration-200"
          style={{
            backgroundColor: 'rgba(240, 248, 255, 0.98)',
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#4A7D9D] mb-2">
            Điều hướng phân hệ ERP May 10
          </div>
          <div className="grid grid-cols-2 gap-2">
            {authorizedSections.map((sec) => (
              <Link
                key={sec.id}
                to={sec.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium border whitespace-nowrap transition-colors ${
                  isNavActive(sec)
                    ? 'bg-[#0F5FAF] text-white border-[#0F5FAF] font-bold shadow-xs'
                    : 'bg-white/80 text-[#0F3B66] border-[#D6EDFF] hover:bg-white'
                }`}
              >
                <span className="truncate">{sec.title}</span>
                {sec.badge && (
                  <span
                    className={`text-[9px] font-bold px-1 rounded-full ${
                      isNavActive(sec)
                        ? 'bg-white text-[#0F5FAF]'
                        : 'bg-[#0F5FAF] text-white'
                    }`}
                  >
                    {sec.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
