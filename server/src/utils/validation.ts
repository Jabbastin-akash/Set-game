// Input validation utilities

const MAX_NAME_LENGTH = 20;
const MIN_NAME_LENGTH = 1;
const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;

export function sanitizePlayerName(name: string): string {
    return name
        .trim()
        .slice(0, MAX_NAME_LENGTH)
        .replace(/[<>\"'&]/g, ''); // Remove potentially dangerous characters
}

export function validatePlayerName(name: string): { valid: boolean; error?: string } {
    const sanitized = sanitizePlayerName(name);

    if (sanitized.length < MIN_NAME_LENGTH) {
        return { valid: false, error: 'Name is too short' };
    }

    if (sanitized.length > MAX_NAME_LENGTH) {
        return { valid: false, error: 'Name is too long' };
    }

    return { valid: true };
}

export function validateRoomCode(code: string): { valid: boolean; error?: string } {
    const upperCode = code.toUpperCase().trim();

    if (!ROOM_CODE_REGEX.test(upperCode)) {
        return { valid: false, error: 'Invalid room code format' };
    }

    return { valid: true };
}

export function validateCardId(cardId: string): { valid: boolean; error?: string } {
    if (!cardId || typeof cardId !== 'string') {
        return { valid: false, error: 'Invalid card ID' };
    }

    // UUID v4 format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cardId)) {
        return { valid: false, error: 'Invalid card ID format' };
    }

    return { valid: true };
}

// Rate limiting
interface RateLimitEntry {
    count: number;
    resetTime: number;
}

export class RateLimiter {
    private limits: Map<string, RateLimitEntry> = new Map();
    private maxRequests: number;
    private windowMs: number;

    constructor(maxRequests: number = 10, windowMs: number = 1000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    isAllowed(key: string): boolean {
        const now = Date.now();
        const entry = this.limits.get(key);

        if (!entry || now > entry.resetTime) {
            this.limits.set(key, { count: 1, resetTime: now + this.windowMs });
            return true;
        }

        if (entry.count >= this.maxRequests) {
            return false;
        }

        entry.count++;
        return true;
    }

    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.limits) {
            if (now > entry.resetTime) {
                this.limits.delete(key);
            }
        }
    }
}
