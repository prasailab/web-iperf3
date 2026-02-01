import { EventEmitter } from 'events';

// In-memory storage for test outputs
interface TestSession {
    output: string[];
    isComplete: boolean;
    error?: string;
}

const sessions = new Map<string, TestSession>();

// Generate unique session ID
export function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Create new session
export function createSession(sessionId: string): void {
    sessions.set(sessionId, {
        output: [],
        isComplete: false
    });
}

// Append output to session
export function appendOutput(sessionId: string, data: string): void {
    const session = sessions.get(sessionId);
    if (session) {
        session.output.push(data);
    }
}

// Mark session as complete
export function completeSession(sessionId: string, error?: string): void {
    const session = sessions.get(sessionId);
    if (session) {
        session.isComplete = true;
        if (error) {
            session.error = error;
        }
    }
}

// Get new output since last index
export function getOutput(sessionId: string, fromIndex: number): { lines: string[]; isComplete: boolean; error?: string } {
    const session = sessions.get(sessionId);
    if (!session) {
        return { lines: [], isComplete: true, error: 'Session not found' };
    }

    const lines = session.output.slice(fromIndex);
    return {
        lines,
        isComplete: session.isComplete,
        error: session.error
    };
}

// Cleanup old sessions (call periodically)
export function cleanupSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (session.isComplete) {
            // Remove completed sessions after 5 minutes
            const sessionTime = parseInt(sessionId.split('_')[1]);
            if (now - sessionTime > 5 * 60 * 1000) {
                sessions.delete(sessionId);
            }
        }
    }
}

// Cleanup every 5 minutes
setInterval(cleanupSessions, 5 * 60 * 1000);
