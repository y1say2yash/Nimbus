import net from 'node:net';

const DEFAULT_START_PORT = 10000;
const DEFAULT_END_PORT = 20000;

function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', () => {
            resolve(false);
        });

        server.once('listening', () => {
            server.close(() => {
                resolve(true);
            });
        });

        server.listen(port, '0.0.0.0');
    });
}

export async function findAvailableHostPort(
    startPort = DEFAULT_START_PORT,
    endPort = DEFAULT_END_PORT,
): Promise<number> {
    if (
        !Number.isInteger(startPort) ||
        !Number.isInteger(endPort) ||
        startPort < 1 ||
        endPort > 65535 ||
        startPort > endPort
    ) {
        throw new Error('Invalid host port range.');
    }

    for (let port = startPort; port <= endPort; port += 1) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }

    throw new Error(
        `No available host port found between ${startPort} and ${endPort}.`,
    );
}