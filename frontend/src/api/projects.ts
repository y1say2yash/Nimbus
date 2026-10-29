
import { apiRequest, getData } from './client';
import type {
    CreateProjectInput,
    GitHubBranch,
    GitHubRepository,
    Project,
} from '../types/project';

export async function getProjects(): Promise<Project[]> {
    const projects = await getData<Project[]>('/projects');
    if (!Array.isArray(projects)) {
        throw new Error('The server returned an unexpected projects response.');
    }

    return projects;
}

export async function getAvailableRepositories(): Promise<GitHubRepository[]> {
    const repositories = await getData<GitHubRepository[]>('/projects/repositories');
    if (!Array.isArray(repositories)) {
        throw new Error('The server returned an unexpected repositories response.');
    }

    return repositories;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
    const body = await apiRequest<{ data: Project }>('/projects', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    return body.data;
}

export async function getProject(projectId: string): Promise<Project> {
    return getData<Project>(`/projects/${encodeURIComponent(projectId)}`);
}

export async function getProjectBranches(projectId: string): Promise<GitHubBranch[]> {
    const branches = await getData<GitHubBranch[]>(
        `/projects/${encodeURIComponent(projectId)}/branches`,
    );
    if (!Array.isArray(branches)) {
        throw new Error('The server returned an unexpected branches response.');
    }

    return branches;
}
