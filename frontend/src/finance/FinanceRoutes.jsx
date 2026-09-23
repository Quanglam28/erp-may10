import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/rbac/AuthContext';
import Dashboard from './pages/Dashboard.jsx';
import ChiefAccountantDashboard from './pages/ChiefAccountantDashboard.jsx';
import Documents from './pages/Documents.jsx';
import Journals from './pages/Journals.jsx';
import Ledger from './pages/Ledger.jsx';
import Debts from './pages/Debts.jsx';
import Costs from './pages/Costs.jsx';
import Costing from './pages/Costing.jsx';
import OrderEfficiency from './pages/OrderEfficiency.jsx';
import FinancialReports from './pages/FinancialReports.jsx';
import {
  hasPermission,
  homePathForUser,
  permissionForPath,
  PERMISSIONS,
} from './config/permissions.js';
import './finance.css';

const BASE_PATH = '/accounting';

export default function FinanceRoutes() {
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Ưu tiên vai trò thật trong DB để phân biệt ke_toan và ke_toan_truong.
  const currentUser = {
    ...user,
    vai_tro: user?.vai_tro || role,
  };

  let path = location.pathname;

  if (path === BASE_PATH || path === `${BASE_PATH}/`) {
    return (
      <Navigate
        to={`${BASE_PATH}${homePathForUser(currentUser)}`}
        replace
      />
    );
  } else if (path.startsWith(`${BASE_PATH}/`)) {
    path = path.slice(BASE_PATH.length);
  }

  const requiredPermission = permissionForPath(path);

  if (requiredPermission && !hasPermission(currentUser, requiredPermission)) {
    return (
      <Navigate
        to={`${BASE_PATH}${homePathForUser(currentUser)}`}
        replace
      />
    );
  }

  const go = (target) => {
    let next = target || homePathForUser(currentUser);

    if (!next.startsWith('/')) {
      next = `/${next}`;
    }

    if (!next.startsWith(BASE_PATH)) {
      next = `${BASE_PATH}${next}`;
    }

    navigate(next);
    window.scrollTo({ top: 0 });
  };

  let page = null;

  if (path === '/dashboard' || path === '/tong-quan-ke-toan') {
    page = (
      <Dashboard
        navigate={(_, target) => go(target)}
        canViewReports={hasPermission(currentUser, PERMISSIONS.REPORT_VIEW)}
      />
    );
  } else if (path === '/tong-quan-ke-toan-truong') {
    page = (
      <ChiefAccountantDashboard
        navigate={(_, target) => go(target)}
        canViewReports={hasPermission(currentUser, PERMISSIONS.REPORT_VIEW)}
      />
    );
  } else if (path === '/chung-tu') {
    page = (
      <Documents
        canCreate={hasPermission(currentUser, PERMISSIONS.DOCUMENT_CREATE)}
        canEdit={hasPermission(currentUser, PERMISSIONS.DOCUMENT_EDIT)}
        canDelete={hasPermission(currentUser, PERMISSIONS.DOCUMENT_DELETE)}
        canCreateJournal={hasPermission(currentUser, PERMISSIONS.JOURNAL_CREATE)}
        navigateTo={go}
      />
    );
  } else if (path === '/hach-toan') {
    page = (
      <Journals
        canCreate={hasPermission(currentUser, PERMISSIONS.JOURNAL_CREATE)}
        canEdit={hasPermission(currentUser, PERMISSIONS.JOURNAL_EDIT)}
      />
    );
  } else if (path === '/so-cai') {
    page = <Ledger />;
  } else if (path === '/cong-no') {
    page = <Debts />;
  } else if (path === '/chi-phi') {
    page = <Costs />;
  } else if (path === '/gia-thanh') {
    page = <Costing />;
  } else if (path === '/hieu-qua-don-hang') {
    page = <OrderEfficiency />;
  } else if (
    path === '/bao-cao-tai-chinh' ||
    /^\/bao-cao-tai-chinh\/[^/]+$/.test(path)
  ) {
    page = (
      <FinancialReports
        reportId={path.split('/')[2] || null}
        navigate={go}
      />
    );
  } else {
    return (
      <Navigate
        to={`${BASE_PATH}${homePathForUser(currentUser)}`}
        replace
      />
    );
  }

  return <div className="finance-module-content">{page}</div>;
}
