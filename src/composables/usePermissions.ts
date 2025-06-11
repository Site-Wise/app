import { computed } from 'vue';
import { getCurrentUserRole, calculatePermissions } from '../services/pocketbase';

export function usePermissions() {
  const userRole = computed(() => getCurrentUserRole());
  
  const permissions = computed(() => {
    return calculatePermissions(userRole.value);
  });

  const canCreate = computed(() => permissions.value.canCreate);
  const canRead = computed(() => permissions.value.canRead);
  const canUpdate = computed(() => permissions.value.canUpdate);
  const canDelete = computed(() => permissions.value.canDelete);
  const canManageUsers = computed(() => permissions.value.canManageUsers);
  const canManageRoles = computed(() => permissions.value.canManageRoles);
  const canExport = computed(() => permissions.value.canExport);
  const canViewFinancials = computed(() => permissions.value.canViewFinancials);

  const hasPermission = (permission: keyof typeof permissions.value) => {
    return permissions.value[permission];
  };

  const requirePermission = (permission: keyof typeof permissions.value, errorMessage?: string) => {
    if (!permissions.value[permission]) {
      throw new Error(errorMessage || `Permission denied: ${permission} not allowed`);
    }
  };

  return {
    userRole,
    permissions,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canManageUsers,
    canManageRoles,
    canExport,
    canViewFinancials,
    hasPermission,
    requirePermission
  };
}