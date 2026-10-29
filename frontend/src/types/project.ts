
export interface Project {
    project_id: string;
    github_repository_id?: number;
    project_name: string;
    repository_url: string;
    default_branch: string;
    container_port: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    default_branch: string;
    private: boolean;
    owner: {
        login: string;
    };
}

export interface GitHubBranch {
    name: string;
}

export interface CreateProjectInput {
    project_name: string;
    repository_url: string;
    github_repository_id: number;
    default_branch: string;
    container_port: number;
}

export interface ApiError {
    error?: {
        code?: string;
        message?: string;
    };
}
