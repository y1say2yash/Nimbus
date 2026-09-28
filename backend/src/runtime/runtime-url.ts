export function getDeploymentUrl(
    projectName: string,
): string {
    const baseUrl =
        process.env.NIMBUS_BASE_URL ||
        'http://localhost';

    return `${baseUrl}/apps/${encodeURIComponent(projectName)}/`;
}