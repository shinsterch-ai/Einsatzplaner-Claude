import { Database } from '@/lib/supabase/types'

export type AppRole = Database['public']['Enums']['app_role']

const has = (roles: AppRole[], any: AppRole[]) =>
  any.some((r) => roles.includes(r))

export const can = {
  viewSidebarUsers: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  viewSidebarSettings: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  viewSidebarEmployees: (r: AppRole[]) => has(r, ['admin', 'planer', 'superadmin']),
  viewSidebarPatients: (r: AppRole[]) => has(r, ['admin', 'planer', 'superadmin']),
  viewSidebarAssignments: (r: AppRole[]) => has(r, ['admin', 'planer', 'superadmin']),
  viewSidebarWorkingHours: (r: AppRole[]) => has(r, ['admin', 'planer', 'mitarbeiter', 'superadmin']),
  viewSidebarMyAssignments: (r: AppRole[]) => has(r, ['mitarbeiter']),
  viewSidebarSuperadmin: (r: AppRole[]) => has(r, ['superadmin']),

  viewAllAssignments: (r: AppRole[]) => has(r, ['admin', 'planer', 'superadmin']),
  viewOwnAssignments: (r: AppRole[]) => has(r, ['mitarbeiter']),
  createAssignment: (r: AppRole[]) => has(r, ['admin', 'planer', 'superadmin']),
  editAssignment: (r: AppRole[]) => has(r, ['admin', 'planer', 'superadmin']),
  deleteAssignment: (r: AppRole[]) => has(r, ['admin', 'planer', 'superadmin']),
  updateOwnAssignmentStatus: (r: AppRole[]) => has(r, ['mitarbeiter', 'admin', 'planer', 'superadmin']),

  viewAllPatients: (r: AppRole[]) => has(r, ['admin', 'planer', 'superadmin']),
  viewAssignedPatients: (r: AppRole[]) => has(r, ['mitarbeiter']),
  createPatient: (r: AppRole[]) => has(r, ['admin', 'planer', 'superadmin']),
  editPatient: (r: AppRole[]) => has(r, ['admin', 'planer', 'superadmin']),
  deletePatient: (r: AppRole[]) => has(r, ['admin', 'superadmin']),

  viewEmployees: (r: AppRole[]) => has(r, ['admin', 'planer', 'superadmin']),
  manageEmployees: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  manageEmployeeAvailability: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  manageEmployeeQualifications: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  manageEmployeeVacations: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  viewOwnEmployeeData: (r: AppRole[]) => has(r, ['mitarbeiter']),

  viewUsers: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  manageUsers: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  assignSuperadminRole: (r: AppRole[]) => has(r, ['superadmin']),

  manageOrgSettings: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  manageWorktimeSettings: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  manageAssignmentTypes: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  manageSchedulingRules: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  manageNotificationSettings: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  uploadOrgLogo: (r: AppRole[]) => has(r, ['admin', 'superadmin']),

  viewAllWorkingHours: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  viewOwnWorkingHours: (r: AppRole[]) => has(r, ['admin', 'planer', 'mitarbeiter', 'superadmin']),

  viewAdminDashboard: (r: AppRole[]) => has(r, ['admin', 'planer', 'superadmin']),

  manageOrganizations: (r: AppRole[]) => has(r, ['superadmin']),
  viewSystemHealth: (r: AppRole[]) => has(r, ['admin', 'superadmin']),
  toggleDemoMode: (r: AppRole[]) => has(r, ['superadmin']),
}

export type Permission = keyof typeof can
