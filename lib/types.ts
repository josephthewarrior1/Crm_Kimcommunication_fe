export interface ProjectRole {
    id: number;
    name: string;      // "ADMIN", "EDITOR"
    description: string;
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    jobTitle: string; // Global job title (e.g. "Senior Dev")
}

export interface Permissions {
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    projectRoleName?: string | null;
    isSystemAdmin?: boolean;
}

export interface ProjectMember {
    id: number;
    user: User;       // The person
    role: ProjectRole;// The permission level
    jobTitle: string; // Their specific role in this project (e.g. "Lead Backend")
    joinedAt: string;
    managerId?: number | null;
    teamType?: string; // 'ADMINISTRATION' | 'ON_FIELD'
    teamId?: number | null;
    teamName?: string | null;
}

export interface ProjectTeam {
    id: number;
    name: string;
    sortOrder: number;
    memberCount: number;
}