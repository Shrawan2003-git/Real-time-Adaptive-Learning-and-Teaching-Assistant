import { LessonData } from '../types';
import { db } from './firebase';
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    addDoc,
    updateDoc,
    getDocs
} from "firebase/firestore";

export interface Doubt {
    id: string; // Used as doc ID in firestore now optionally, but keeping string
    sessionId: string;
    studentName: string;
    question: string;
    timestamp: any; // Firestore Timestamp
    status: 'pending' | 'resolved';
    reply?: string;
}

export interface SharedMaterial {
    id: string;
    sessionId: string;
    title: string;
    url?: string;
    text?: string;
    type: 'link' | 'note';
    timestamp: any;
}

export interface ActiveSession {
    sessionId: string;
    teacherName: string;
    topic: string;
    lesson: LessonData;
    startedAt: string;
}

export interface SessionRecord {
    id: string; // timestamp of broadcast
    lesson: LessonData;
    viewedAt: string;
}

export interface StudentActivity {
    studentId: string;
    studentName: string;
    sessionId: string;
    currentTab: 'learn' | 'quiz' | 'resources' | 'drafts' | 'exam';
    attentionStatus?: 'focused' | 'distracted' | 'confused' | 'away';
    lastActive: any; // Firestore Timestamp
}

const STORAGE_KEY_HISTORY = 'vta_session_history';

// --- Multi-Session Management (Firestore) ---

export const startBroadcast = async (lesson: LessonData, teacherName: string): Promise<string> => {
    const sessionId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionRef = doc(db, "sessions", sessionId);

    let sessionData: ActiveSession = {
        sessionId,
        teacherName,
        topic: lesson.topic,
        lesson,
        startedAt: new Date().toISOString()
    };

    // Firestore throws error on `undefined`. This simple trick strips undefined keys.
    const cleanSessionData = JSON.parse(JSON.stringify(sessionData));

    await setDoc(sessionRef, cleanSessionData);

    // Also save to local history for the teacher
    saveSessionToHistory(lesson, sessionData.startedAt);
    return sessionId;
};

export const endBroadcast = async (sessionId: string) => {
    try {
        const sessionRef = doc(db, "sessions", sessionId);

        // In a real app, you might want to also delete subcollections (doubts, activity) 
        // to save space, but for a demo, just deleting the main session is often enough 
        // to hide it from the active lists.
        await deleteDoc(sessionRef);
    } catch (e) {
        console.error("Error ending broadcast:", e);
    }
};

// Listen for Any Sessions Changing (for Landing Page Dashboard)
export const subscribeToActiveSessions = (callback: (sessions: ActiveSession[]) => void) => {
    const sessionsCol = collection(db, "sessions");
    const unsubscribe = onSnapshot(sessionsCol, (snapshot) => {
        const activeSessions: ActiveSession[] = [];
        snapshot.forEach((doc) => {
            activeSessions.push(doc.data() as ActiveSession);
        });
        callback(activeSessions);
    }, (error) => {
        console.error("Error listening to sessions:", error);
    });

    return unsubscribe;
};

// Listen for a SPECIFIC Session (for Student / Teacher Live View)
export const subscribeToSession = (sessionId: string, callback: (session: ActiveSession | null) => void) => {
    const sessionRef = doc(db, "sessions", sessionId);
    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as ActiveSession);
        } else {
            callback(null); // Session was deleted
        }
    }, (error) => {
        console.error("Error listening to session:", error);
    });

    return unsubscribe;
};


// --- Doubts Management (Firestore Subcollection) ---

export const raiseDoubt = async (doubtReq: Omit<Doubt, 'status' | 'id'>) => {
    const doubtsCol = collection(db, "sessions", doubtReq.sessionId, "doubts");
    await addDoc(doubtsCol, {
        ...doubtReq,
        status: 'pending',
        timestamp: serverTimestamp() // Better sorting
    });
};

export const replyToDoubt = async (sessionId: string, doubtId: string, replyText: string) => {
    const doubtRef = doc(db, "sessions", sessionId, "doubts", doubtId);
    await updateDoc(doubtRef, {
        reply: replyText,
        status: 'resolved'
    });
};

// Listen for doubts for a SPECIFIC session
export const subscribeToDoubts = (sessionId: string, callback: (doubts: Doubt[]) => void) => {
    const doubtsCol = collection(db, "sessions", sessionId, "doubts");
    const q = query(doubtsCol, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const doubtsList: Doubt[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            doubtsList.push({
                ...data,
                id: doc.id,
                // Handle case where timestamp might be null initially before server returns it
                timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
            } as Doubt);
        });
        callback(doubtsList);
    }, (error) => {
        console.error("Error listening to doubts:", error);
    });

    return unsubscribe;
};

// --- Custom Materials Management (Firestore Subcollection) ---

export const shareMaterial = async (sessionId: string, material: Omit<SharedMaterial, 'id' | 'timestamp' | 'sessionId'>) => {
    const colRef = collection(db, "sessions", sessionId, "materials");
    await addDoc(colRef, {
        ...material,
        sessionId,
        timestamp: serverTimestamp()
    });
};

export const deleteSharedMaterial = async (sessionId: string, materialId: string) => {
    const docRef = doc(db, "sessions", sessionId, "materials", materialId);
    await deleteDoc(docRef);
};

export const subscribeToMaterials = (sessionId: string, callback: (mats: SharedMaterial[]) => void) => {
    const colRef = collection(db, "sessions", sessionId, "materials");
    const q = query(colRef, orderBy("timestamp", "desc")); // newest first

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const matsList: SharedMaterial[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            matsList.push({
                ...data,
                id: doc.id,
                timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
            } as SharedMaterial);
        });
        callback(matsList);
    }, (error) => {
        console.error("Error listening to materials:", error);
    });

    return unsubscribe;
};


// --- Student Activity Management (Firestore Subcollection) ---

export const updateStudentActivity = async (
    sessionId: string,
    studentId: string,
    studentName: string,
    currentTab: StudentActivity['currentTab'],
    attentionStatus?: StudentActivity['attentionStatus']
) => {
    const activityRef = doc(db, "sessions", sessionId, "activity", studentId);

    await setDoc(activityRef, {
        studentId,
        studentName,
        sessionId,
        currentTab,
        attentionStatus: attentionStatus || 'focused',
        lastActive: serverTimestamp()
    }, { merge: true }); // Merge updates existing or creates new
};

export const removeStudentActivity = async (sessionId: string, studentId: string) => {
    try {
        const activityRef = doc(db, "sessions", sessionId, "activity", studentId);
        await deleteDoc(activityRef);
    } catch (e) {
        console.error("Error removing student activity:", e);
    }
};

export const subscribeToStudentActivity = (sessionId: string, callback: (activities: StudentActivity[]) => void) => {
    const activityCol = collection(db, "sessions", sessionId, "activity");
    const unsubscribe = onSnapshot(activityCol, (snapshot) => {
        const activitiesList: StudentActivity[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            activitiesList.push({
                ...data,
                lastActive: data.lastActive ? data.lastActive.toDate() : new Date()
            } as StudentActivity);
        });
        callback(activitiesList);
    }, (error) => {
        console.error("Error listening to activities:", error);
    });

    return unsubscribe;
};

// --- History Management (Keeping Local for now, as it's personal) ---

export const saveSessionToHistory = (lesson: LessonData, originalTimestamp: string) => {
    try {
        const history = getSessionHistory();
        const exists = history.some(h => h.id === originalTimestamp);
        if (!exists) {
            const newRecord: SessionRecord = {
                id: originalTimestamp,
                lesson,
                viewedAt: new Date().toISOString()
            };
            history.unshift(newRecord);
            if (history.length > 50) history.pop();
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
        }
    } catch (e) {
        console.error("Failed to save session history", e);
    }
};

export const getSessionHistory = (): SessionRecord[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
};

// --- Legacy Handlers (to be replaced, keeping temporarily to avoid breaking everything instantly) ---
export const broadcastLesson = (lesson: LessonData) => { /* Disabled */ };
export const subscribeToLesson = (cb: any) => { return () => { }; };
export const endLesson = () => { /* Disabled */ };
export const clearSession = () => { };
