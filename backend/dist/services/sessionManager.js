"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSessionId = generateSessionId;
exports.createSession = createSession;
exports.appendOutput = appendOutput;
exports.completeSession = completeSession;
exports.getOutput = getOutput;
exports.cleanupSessions = cleanupSessions;
const sessions = new Map();
// Generate unique session ID
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
// Create new session
function createSession(sessionId) {
    sessions.set(sessionId, {
        output: [],
        isComplete: false
    });
}
// Append output to session
function appendOutput(sessionId, data) {
    const session = sessions.get(sessionId);
    if (session) {
        session.output.push(data);
    }
}
// Mark session as complete
function completeSession(sessionId, error) {
    const session = sessions.get(sessionId);
    if (session) {
        session.isComplete = true;
        if (error) {
            session.error = error;
        }
    }
}
// Get new output since last index
function getOutput(sessionId, fromIndex) {
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
function cleanupSessions() {
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
