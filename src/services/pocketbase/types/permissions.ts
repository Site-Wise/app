export type UserRole = 'owner' | 'supervisor' | 'accountant';

export interface Permissions {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canExport: boolean;
  canViewFinancials: boolean;
}

export const calculatePermissions = (role: UserRole | null): Permissions => {
  if (!role) {
    return {
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
      canManageUsers: false,
      canManageRoles: false,
      canExport: false,
      canViewFinancials: false
    };
  }

  switch (role) {
    case 'owner':
      return {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
        canManageUsers: true,
        canManageRoles: true,
        canExport: true,
        canViewFinancials: true
      };

    case 'supervisor':
      return {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false, // Cannot delete
        canManageUsers: false,
        canManageRoles: false,
        canExport: true,
        canViewFinancials: true
      };

    case 'accountant':
      return {
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDelete: false,
        canManageUsers: false,
        canManageRoles: false,
        canExport: true, // Can export financial reports
        canViewFinancials: true
      };

    default:
      return {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canManageUsers: false,
        canManageRoles: false,
        canExport: false,
        canViewFinancials: false
      };
  }
};
