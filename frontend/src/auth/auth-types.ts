export interface AuthUser {
    user_id: string;
    github_id: string;
    github_username: string;
    email: string;
    avatar_url: string | null;
    is_active: boolean;
}

export interface AuthResponse {
    data: {
        user: AuthUser;
    };
}