export const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW:'dashboard.view',DOCUMENT_VIEW:'document.view',DOCUMENT_CREATE:'document.create',DOCUMENT_EDIT:'document.edit',DOCUMENT_DELETE:'document.delete',
  JOURNAL_VIEW:'journal.view',JOURNAL_CREATE:'journal.create',JOURNAL_EDIT:'journal.edit',JOURNAL_DELETE:'journal.delete',LEDGER_VIEW:'ledger.view',DEBT_VIEW:'debt.view',
  COST_VIEW:'cost.view',COSTING_VIEW:'costing.view',ORDER_EFFICIENCY_VIEW:'orderEfficiency.view',REPORT_VIEW:'report.view',CHIEF_DASHBOARD_VIEW:'chiefDashboard.view',MONITORING_VIEW:'monitoring.view'
});
const accountant=[PERMISSIONS.DASHBOARD_VIEW,PERMISSIONS.DOCUMENT_VIEW,PERMISSIONS.DOCUMENT_CREATE,PERMISSIONS.DOCUMENT_EDIT,PERMISSIONS.JOURNAL_VIEW,PERMISSIONS.JOURNAL_CREATE,PERMISSIONS.JOURNAL_EDIT,PERMISSIONS.LEDGER_VIEW,PERMISSIONS.DEBT_VIEW,PERMISSIONS.COST_VIEW,PERMISSIONS.COSTING_VIEW];
const chiefAccountant=[...accountant,PERMISSIONS.ORDER_EFFICIENCY_VIEW,PERMISSIONS.REPORT_VIEW,PERMISSIONS.CHIEF_DASHBOARD_VIEW,PERMISSIONS.MONITORING_VIEW];
export const ROLE_PERMISSIONS=Object.freeze({ke_toan:Object.freeze(accountant),ke_toan_truong:Object.freeze(chiefAccountant)});
export const ROUTE_PERMISSIONS=Object.freeze({'/dashboard':PERMISSIONS.DASHBOARD_VIEW,'/tong-quan-ke-toan':PERMISSIONS.DASHBOARD_VIEW,'/tong-quan-ke-toan-truong':PERMISSIONS.CHIEF_DASHBOARD_VIEW,'/chung-tu':PERMISSIONS.DOCUMENT_VIEW,'/hach-toan':PERMISSIONS.JOURNAL_VIEW,'/so-cai':PERMISSIONS.LEDGER_VIEW,'/cong-no':PERMISSIONS.DEBT_VIEW,'/chi-phi':PERMISSIONS.COST_VIEW,'/gia-thanh':PERMISSIONS.COSTING_VIEW,'/hieu-qua-don-hang':PERMISSIONS.ORDER_EFFICIENCY_VIEW,'/bao-cao-tai-chinh':PERMISSIONS.REPORT_VIEW});
export function hasPermission(user,permission){if(!permission)return true;const role=user?.vai_tro||user?.role;if(role==='admin')return true;return(ROLE_PERMISSIONS[role]||[]).includes(permission);}
export function permissionForPath(path){if(path.startsWith('/bao-cao-tai-chinh/'))return PERMISSIONS.REPORT_VIEW;return ROUTE_PERMISSIONS[path]||null;}
export function homePathForUser(user){return hasPermission(user,PERMISSIONS.CHIEF_DASHBOARD_VIEW)?'/tong-quan-ke-toan-truong':'/tong-quan-ke-toan';}