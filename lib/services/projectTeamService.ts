const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081';

const getHeaders = () => {
    const token = localStorage.getItem('session');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
};

export const projectTeamService = {
    // Get all members for a project
    // getTeam: async (projectId: string) => {
    //     const res = await fetch(`${API_BASE}/api/projects/${projectId}/team`, { headers: getHeaders() });
    //     return res.json();
    // },
    getTeam: async (projectId: string, teamType?: string) => {
        const params = teamType ? `?teamType=${teamType}` : '';
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/team${params}`, { headers: getHeaders() });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(errorData.message || `Failed to fetch team: ${res.status}`);
        }

        return res.json();
    },

    // Get all available roles (to populate dropdown)
    getRoles: async () => {
        const res = await fetch(`${API_BASE}/api/roles`, { headers: getHeaders() });
        // ^ Ensure you create a simple Controller for this: @GetMapping("/api/roles") -> return roleRepository.findAll()
        return res.json();
    },

    // Add a member
    addMember: async (projectId: string, userId: number, roleId: number, jobTitle: string, managerId: number | null, teamType: string = 'ADMINISTRATION', teamId: number | null = null) => {
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/team`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId, roleId, jobTitle, managerId, teamType, teamId })
        });
        if (!res.ok) throw new Error('Failed to add member');
        return res.json();
    },

    // Remove a member
    removeMember: async (projectId: string, memberId: number) => {
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/team/${memberId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to remove member');
    },

    // --- Project Team Groups (grouping members into teams) ---

    getTeamGroups: async (projectId: string) => {
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/teams`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch teams');
        return res.json();
    },

    createTeamGroup: async (projectId: string, name: string) => {
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/teams`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name })
        });
        if (!res.ok) throw new Error('Failed to create team');
        return res.json();
    },

    updateTeamGroup: async (projectId: string, teamId: number, name: string) => {
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/teams/${teamId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ name })
        });
        if (!res.ok) throw new Error('Failed to update team');
        return res.json();
    },

    deleteTeamGroup: async (projectId: string, teamId: number) => {
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/teams/${teamId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to delete team');
    },

    // Get current user's permissions for a project
    getMyPermissions: async (projectId: string) => {
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/my-permissions`, {
            headers: getHeaders()
        });
        if (!res.ok) {
            console.log("[my-permissions] Response NOT OK, status:", res.status);
            return { canCreate: false, canRead: true, canUpdate: false, canDelete: false, projectRoleName: null, isSystemAdmin: false };
        }
        // Parse body ONCE, store in variable, then log and return
        const data = await res.json();
        console.log("[my-permissions] Raw response body:", JSON.stringify(data));
        console.log("[my-permissions] canCreate:", data.canCreate, "canRead:", data.canRead, "canUpdate:", data.canUpdate, "canDelete:", data.canDelete);
        return data;
    }
};