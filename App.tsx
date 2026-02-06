import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Question, AppMode, SelectedQuizInfo, UserRole, Feedback } from './types';
import { SECRET_CODE } from './constants';
import Header from './components/Header';
import AuthSection from './components/AuthSection';
import CreateSection from './components/CreateSection';
import PlaySection from './components/PlaySection';
import QuizGame from './components/QuizGame';
import { initFirebase, syncQuestionsToFirebase, listenToQuestions, listenToFeedback, removeFeedback } from './services/firebaseService';

const App: React.FC = () => {
  const [quizData, setQuizData] = useState<Question[]>([]);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [mode, setMode] = useState<AppMode>('play');
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [username, setUsername] = useState<string>('');
  const [activeQuiz, setActiveQuiz] = useState<SelectedQuizInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean | 'error'>(false);
  const isListeningRef = useRef(false);

  const APP_LOGO_URL = "https://i.postimg.cc/0ygmLdvR/3QCM_Ep4.png";

  /**
   * Strictly reconstructs objects to ensure they are plain POJOs
   * by aggressively casting all properties to primitives.
   * This prevents circular structure errors from hidden Firestore class properties.
   */
  const sanitizeQuestions = useCallback((data: any[]): Question[] => {
    if (!Array.isArray(data)) return [];
    
    return data.filter(q => q && typeof q === 'object').map(q => {
      const type = q.type === 'short' ? 'short' : 'mcq';
      const cleanObj: Question = {
        subject: String(q.subject || 'មិនមានមុខវិជ្ជា'),
        question: String(q.question || ''),
        type: type,
        isActive: q.isActive !== false
      };

      if (type === 'mcq') {
        cleanObj.options = Array.isArray(q.options) 
          ? q.options.map((o: any) => String(o || '')) 
          : ['', '', '', ''];
        cleanObj.correct = typeof q.correct === 'number' ? q.correct : 0;
      } else {
        cleanObj.answer = String(q.answer || '');
      }

      return cleanObj;
    });
  }, []);

  const saveToLocal = useCallback((data: Question[]) => {
    try {
      // Create a completely fresh array of fresh objects to be absolutely safe
      const cleanData = data.map(q => {
        const base = {
          subject: String(q.subject),
          question: String(q.question),
          type: q.type,
          isActive: Boolean(q.isActive)
        };
        if (q.type === 'mcq') {
          return {
            ...base,
            options: Array.isArray(q.options) ? q.options.map(o => String(o)) : [],
            correct: Number(q.correct)
          };
        }
        return {
          ...base,
          answer: String(q.answer)
        };
      });
      localStorage.setItem('quiz_data', JSON.stringify(cleanData));
    } catch (e: any) { 
      console.error("Storage error:", e?.message); 
    }
  }, []);

  useEffect(() => {
    if (isListeningRef.current) return;
    isListeningRef.current = true;
    
    // Core initialization
    initFirebase();
    
    const saved = localStorage.getItem('quiz_data');
    if (saved) { 
      try { 
        setQuizData(sanitizeQuestions(JSON.parse(saved))); 
      } catch(e){} 
    }

    const unsubscribeQuestions = listenToQuestions((remoteData) => {
      const cleaned = sanitizeQuestions(remoteData);
      setQuizData(cleaned);
      saveToLocal(cleaned);
      setIsCloudConnected(true);
      setIsInitialized(true);
    }, (error) => {
      // Avoid circular error in logs by only printing message
      console.warn("Cloud connection error:", error?.message || "Unknown error");
      setIsCloudConnected('error');
      setIsInitialized(true);
    });

    return () => { 
      unsubscribeQuestions(); 
      isListeningRef.current = false; 
    };
  }, [sanitizeQuestions, saveToLocal]);

  useEffect(() => {
    let unsubscribeFeedback = () => {};
    if (userRole === 'admin') {
      unsubscribeFeedback = listenToFeedback((fbs) => setFeedbackList(fbs)) || (() => {});
    }
    return () => unsubscribeFeedback();
  }, [userRole]);

  const handleSyncData = (newData: Question[]) => {
    const cleaned = sanitizeQuestions(newData);
    setQuizData(cleaned);
    saveToLocal(cleaned);
    if (userRole === 'admin') {
      syncQuestionsToFirebase(cleaned)
        .then(() => setIsCloudConnected(true))
        .catch((e) => {
          console.error("Firebase sync failed:", e?.message);
          setIsCloudConnected('error');
        });
    }
  };

  const handleReorderSubject = (subject: string, type: 'mcq' | 'short', direction: 'up' | 'down') => {
    const subjects = Array.from(new Set(quizData.filter(q => q.type === type).map(q => q.subject)));
    const index = subjects.indexOf(subject);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= subjects.length) return;

    const newSubjects = [...subjects];
    [newSubjects[index], newSubjects[newIndex]] = [newSubjects[newIndex], newSubjects[index]];

    const reorderedData: Question[] = [];
    newSubjects.forEach(s => {
      reorderedData.push(...quizData.filter(q => q.subject === s && q.type === type));
    });
    reorderedData.push(...quizData.filter(q => q.type !== type));
    handleSyncData(reorderedData);
  };

  const handleStartNextPart = (newPartIndex: number) => {
    if (activeQuiz) {
      setActiveQuiz({
        ...activeQuiz,
        partIndex: newPartIndex
      });
    }
  };

  if (!isInitialized) return null;

  if (!userRole) {
    return (
      <div className="min-h-screen py-12 px-4 flex flex-col items-center justify-center page-transition bg-slate-950">
        <div className="mb-12 relative group">
          <div className="absolute inset-0 bg-red-600/30 blur-[60px] rounded-full animate-pulse"></div>
          <div className="relative w-40 h-40 md:w-48 md:h-48 bg-white p-1 rounded-full shadow-2xl border-[3px] border-red-500 transform transition-transform hover:scale-105 duration-500 animate-[bounce_3s_infinite]">
            <img src={APP_LOGO_URL} alt="Logo" className="w-full h-full object-cover rounded-full" />
          </div>
        </div>
        <div className="text-center mb-16">
          <h1 className="font-black heading-kh">
            <span className="block text-3xl md:text-4xl text-white opacity-80 mb-8 uppercase tracking-[0.25em]">ត្រៀមប្រឡង</span>
            <span className="block text-6xl md:text-8xl bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 bg-clip-text text-transparent py-4">ក្របខ័ណ្ឌរដ្ឋ</span>
          </h1>
        </div>
        <AuthSection onLogin={(role, uName) => { setUserRole(role); if(uName) setUsername(uName); }} secretCode={SECRET_CODE} />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 page-transition">
      <div className="max-w-4xl mx-auto">
        <Header 
          mode={mode} 
          role={userRole} 
          totalQuestions={quizData.length} 
          cloudStatus={isCloudConnected} 
          setMode={(m) => { setMode(m); setActiveQuiz(null); }} 
          onLogout={() => { setUserRole(null); setUsername(''); }} 
        />
        <main className="mt-6">
          {mode === 'play' ? (
            activeQuiz ? (
              <QuizGame 
                subject={activeQuiz.subject} 
                partIndex={activeQuiz.partIndex} 
                type={activeQuiz.type} 
                allSubjectQuestions={activeQuiz.customQuestions || quizData.filter(q => q.subject === activeQuiz.subject && q.type === activeQuiz.type)} 
                onExit={() => setActiveQuiz(null)} 
                onStartNextPart={handleStartNextPart}
              />
            ) : (
              <PlaySection 
                isAdmin={userRole === 'admin'} 
                username={username} 
                quizData={quizData} 
                onStartQuiz={(subject, partIndex, type, q) => setActiveQuiz({ subject, partIndex, type, customQuestions: q })} 
              />
            )
          ) : (
            <CreateSection 
              quizData={quizData} 
              feedbackList={feedbackList} 
              onDeleteFeedback={removeFeedback} 
              onAdd={(q) => handleSyncData([...quizData, q])} 
              onUpdate={(i, q) => handleSyncData(quizData.map((old, idx) => idx === i ? q : old))} 
              onRemove={(i) => handleSyncData(quizData.filter((_, idx) => idx !== i))} 
              onToggleSubject={(sub, type, act) => handleSyncData(quizData.map(q => (q.subject === sub && q.type === type) ? { ...q, isActive: act } : q))} 
              onUpdateSubject={(old, type, newName) => handleSyncData(quizData.map(q => (q.subject === old && q.type === type) ? { ...q, subject: newName.trim() } : q))} 
              onRemoveSubject={(sub, type) => handleSyncData(quizData.filter(q => !(q.subject === sub && q.type === type)))} 
              onReorderSubject={handleReorderSubject}
              onBatchAdd={(qs) => handleSyncData([...quizData, ...qs])} 
              onLogout={() => { setUserRole(null); setUsername(''); }} 
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;