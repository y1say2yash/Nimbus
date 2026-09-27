import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
    const key = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;

    if (!key) {
        throw new Error(
            'GITHUB_TOKEN_ENCRYPTION_KEY is not configured.',
        );
    }

    const buffer = Buffer.from(key, 'hex');

    if (buffer.length !== 32) {
        throw new Error(
            'GITHUB_TOKEN_ENCRYPTION_KEY must be a 32-byte hexadecimal key.',
        );
    }

    return buffer;
}

export function encryptGitHubToken(token: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(token, 'utf8'),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
        iv.toString('hex'),
        authTag.toString('hex'),
        encrypted.toString('hex'),
    ].join(':');
}

export function decryptGitHubToken(encryptedToken: string): string {
    const key = getEncryptionKey();

    const [ivHex, authTagHex, encryptedHex] =
        encryptedToken.split(':');

    if (!ivHex || !authTagHex || !encryptedHex) {
        throw new Error('Invalid encrypted GitHub token format.');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid encrypted GitHub token data.');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);

    return decrypted.toString('utf8');
}