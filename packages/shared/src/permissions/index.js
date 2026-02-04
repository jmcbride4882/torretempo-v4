// Define roles
export const roles = {
    employee: 'employee',
    manager: 'manager',
    tenantAdmin: 'tenantAdmin',
    owner: 'owner',
};
// Define resources
export const resources = [
    'organization',
    'member',
    'invitation',
    'location',
    'skill',
    'shift',
    'roster',
    'swap',
    'timeEntry',
    'report',
    'billing',
];
// Role-based permission matrix
export const rolePermissions = {
    employee: {
        organization: [],
        member: ['read:own'],
        invitation: [],
        location: [],
        skill: [],
        shift: ['read:own'],
        roster: [],
        swap: ['create:own', 'read:own'],
        timeEntry: ['create:own', 'read:own', 'update:own'],
        report: ['read:own'],
        billing: [],
    },
    manager: {
        organization: [],
        member: ['read:any', 'update:any'],
        invitation: [],
        location: ['read:any'],
        skill: ['read:any'],
        shift: ['create:any', 'read:any', 'update:any', 'delete:any'],
        roster: ['create:any', 'read:any', 'update:any'],
        swap: ['read:any', 'update:any'],
        timeEntry: ['read:any', 'update:any'],
        report: ['read:any'],
        billing: [],
    },
    tenantAdmin: {
        organization: ['read:any', 'update:any'],
        member: ['create:any', 'read:any', 'update:any', 'delete:any'],
        invitation: ['create:any', 'read:any', 'delete:any'],
        location: ['create:any', 'read:any', 'update:any', 'delete:any'],
        skill: ['create:any', 'read:any', 'update:any', 'delete:any'],
        shift: ['create:any', 'read:any', 'update:any', 'delete:any'],
        roster: ['create:any', 'read:any', 'update:any', 'delete:any'],
        swap: ['read:any', 'update:any'],
        timeEntry: ['read:any', 'update:any'],
        report: ['create:any', 'read:any'],
        billing: ['read:any', 'update:any'],
    },
    owner: {
        organization: ['create:any', 'read:any', 'update:any', 'delete:any'],
        member: ['create:any', 'read:any', 'update:any', 'delete:any'],
        invitation: ['create:any', 'read:any', 'update:any', 'delete:any'],
        location: ['create:any', 'read:any', 'update:any', 'delete:any'],
        skill: ['create:any', 'read:any', 'update:any', 'delete:any'],
        shift: ['create:any', 'read:any', 'update:any', 'delete:any'],
        roster: ['create:any', 'read:any', 'update:any', 'delete:any'],
        swap: ['create:any', 'read:any', 'update:any', 'delete:any'],
        timeEntry: ['create:any', 'read:any', 'update:any', 'delete:any'],
        report: ['create:any', 'read:any', 'update:any', 'delete:any'],
        billing: ['create:any', 'read:any', 'update:any', 'delete:any'],
    },
};
// Access control helper
export const ac = {
    can: (role, resource, action) => {
        const permissions = rolePermissions[role][resource];
        return permissions.includes(action) || permissions.includes('*');
    },
    hasRole: (role) => {
        return Object.values(roles).includes(role);
    },
};
export const ROLES = {
    EMPLOYEE: roles.employee,
    MANAGER: roles.manager,
    TENANT_ADMIN: roles.tenantAdmin,
    OWNER: roles.owner,
};
//# sourceMappingURL=index.js.map