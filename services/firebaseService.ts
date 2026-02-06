// Fix: Using @firebase/app and @firebase/firestore instead of the top-level firebase/app
// and firebase/firestore to resolve module resolution errors in certain build environments
// where the modular SDK's named exports are not correctly identified.
import { initializeApp, getApps } from "@firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  Firestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  deleteDoc 
} from '@firebase/firestore';
import { Question, Feedback } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyDw5UkwT6ab4rlel-g6KSmaKM9MgjUnIOs",
  authDomain: "quiz-master-kh.firebaseapp.com",
  projectId: "quiz-master-kh",
  storageBucket: "quiz-master-kh.firebasestorage.app",
  messagingSenderId: "1030981971798",
  appId: "1:1030981971798:web:5a7e6e86c0c593dca830f7",
  measurementId: "G-MQJYZ5ME91"
};

let dbInstance: Firestore | null = null;

/**
 * Initializes Firebase and Firestore.
 * Standardizes version usage and ensures proper component registration.
 * Uses long polling to circumvent backend connectivity timeouts.
 */
export const initFirebase = (): Firestore => {
  if (dbInstance) return dbInstance;
  
  try {
    const apps = getApps();
    const app = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];
    
    // Use initializeFirestore as primary to force experimental transport settings
    // which help with connectivity issues ("Backend didn't respond").
    try {
      dbInstance = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
    } catch (err) {
      console.warn("Explicit initialization failed, falling back to getFirestore...");
      dbInstance = getFirestore(app);
    }
    
    return dbInstance!;
  } catch (e: any) {
    console.error("Firebase Critical Error during init:", e?.message);
    throw e;
  }
};

const prepareDataForFirestore = (questions: Question[]): any[] => {
  if (!Array.isArray(questions)) return [];
  return questions.map(q => {
    const type = q.type === 'short' ? 'short' : 'mcq';
    const base = {
      subject: String(q.subject || ''),
      question: String(q.question || ''),
      type: type,
      isActive: q.isActive !== false
    };

    if (type === 'mcq') {
      return {
        ...base,
        options: Array.isArray(q.options) ? q.options.map(o => String(o)) : ["", "", "", ""],
        correct: typeof q.correct === 'number' ? q.correct : 0,
      };
    } else {
      return {
        ...base,
        answer: String(q.answer || ''),
      };
    }
  });
};

export const syncQuestionsToFirebase = async (questions: Question[]) => {
  const database = initFirebase();
  try {
    const quizRef = doc(database, 'config', 'questions_data');
    const dataToSync = prepareDataForFirestore(questions);

    await setDoc(quizRef, { 
      questions: dataToSync, 
      updatedAt: new Date().toISOString() 
    });
  } catch (err: any) {
    console.error("Sync error:", err?.message);
    throw err;
  }
};

export const listenToQuestions = (
  onUpdate: (questions: Question[]) => void, 
  onError: (error: any) => void
) => {
  const database = initFirebase();
  const quizRef = doc(database, 'config', 'questions_data');
  
  return onSnapshot(quizRef, 
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate(data.questions || []);
      } else {
        onUpdate([]);
      }
    },
    (error) => {
      console.error("Firestore Listen error:", error?.message);
      onError(error);
    }
  );
};

export const sendFeedback = async (username: string, text: string) => {
  const database = initFirebase();
  try {
    const feedbackCol = collection(database, 'feedback');
    await addDoc(feedbackCol, {
      username: String(username),
      text: String(text),
      createdAt: new Date().toISOString()
    });
  } catch (e: any) {
    console.error("Feedback error:", e?.message);
  }
};

export const listenToFeedback = (onUpdate: (feedback: Feedback[]) => void) => {
  const database = initFirebase();
  const feedbackCol = collection(database, 'feedback');
  const q = query(feedbackCol, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const fbList = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        username: String(data.username || 'Anonymous'),
        text: String(data.text || ''),
        createdAt: String(data.createdAt || new Date().toISOString())
      };
    }) as Feedback[];
    onUpdate(fbList);
  });
};

export const removeFeedback = async (id: string) => {
  const database = initFirebase();
  try {
    await deleteDoc(doc(database, 'feedback', id));
  } catch (e: any) {
    console.error("Delete error:", e?.message);
  }
};