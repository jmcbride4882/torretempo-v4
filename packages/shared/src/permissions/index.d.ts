export declare const roles: {
    readonly employee: "employee";
    readonly manager: "manager";
    readonly tenantAdmin: "tenantAdmin";
    readonly owner: "owner";
};
export type Role = typeof roles[keyof typeof roles];
export declare const resources: readonly ["organization", "member", "invitation", "location", "skill", "shift", "roster", "swap", "timeEntry", "report", "billing"];
export type Resource = typeof resources[number];
export declare const rolePermissions: Record<Role, Record<Resource, string[]>>;
export declare const ac: {
    can: (role: Role, resource: Resource, action: string) => boolean;
    hasRole: (role: Role) => boolean;
};
export declare const ROLES: {
    readonly EMPLOYEE: "employee";
    readonly MANAGER: "manager";
    readonly TENANT_ADMIN: "tenantAdmin";
    readonly OWNER: "owner";
};
//# sourceMappingURL=index.d.ts.map