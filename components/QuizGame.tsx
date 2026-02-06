
import * as React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Question, QuizState } from '../types';

interface QuizGameProps {
  subject: string;
  partIndex: number;
  type: 'mcq' | 'short';
  allSubjectQuestions: Question[];
  onExit: () => void;
  onStartNextPart?: (newPartIndex: number) => void;
}

const QuizGame: React.FC<QuizGameProps> = ({ subject, partIndex, type, allSubjectQuestions, onExit, onStartNextPart }) => {
  const KHMER_PREFIXES = ['ក', 'ខ', 'គ', 'ឃ'];
  const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  const toKhmerNumeral = (n: number) => n.toString().split('').map(digit => KHMER_DIGITS[parseInt(digit)] || digit).join('');

  const [isMuted, setIsMuted] = useState(false);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const wrongAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    correctAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3');
    wrongAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
    return () => { correctAudioRef.current?.pause(); wrongAudioRef.current?.pause(); };
  }, []);

  // Use a ref to store shuffled questions for the session to avoid re-shuffling during review
  const partQuestions = useMemo(() => {
    const start = partIndex * 10;
    const subset = allSubjectQuestions.slice(start, start + 10);
    if (type === 'mcq') {
      return subset.map(q => {
        if (!q.options) return q;
        const opts = q.options.map((opt, idx) => ({ text: opt, isCorrect: idx === q.correct }));
        const shuffled = [...opts].sort(() => Math.random() - 0.5);
        return { ...q, options: shuffled.map(o => o.text), correct: shuffled.findIndex(o => o.isCorrect) };
      });
    }
    return subset;
  }, [allSubjectQuestions, partIndex, type]);

  const [state, setState] = useState<QuizState>({
    currentQuestionIndex: 0, score: 0, isFinished: false, selectedAnswer: null, userInput: '', showCorrect: false, userAnswers: [], isReviewing: false
  });

  const handleMCQSelect = (idx: number) => {
    if (state.selectedAnswer !== null || state.isFinished) return;
    const isCorrect = idx === partQuestions[state.currentQuestionIndex].correct;
    if (!isMuted) {
      const audio = isCorrect ? correctAudioRef.current : wrongAudioRef.current;
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
    }
    setState(prev => ({
      ...prev, selectedAnswer: idx, showCorrect: true, score: isCorrect ? prev.score + 1 : prev.score, userAnswers: [...prev.userAnswers, idx]
    }));
  };

  const handleShowShortAnswer = () => {
    if (!isMuted && correctAudioRef.current) {
      correctAudioRef.current.currentTime = 0;
      correctAudioRef.current.play().catch(() => {});
    }
    setState(prev => ({ ...prev, showCorrect: true, score: prev.score + 1, userAnswers: [...prev.userAnswers, 'VIEWED'] }));
  };

  const handleNext = () => {
    if (state.currentQuestionIndex + 1 < partQuestions.length) {
      setState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1, selectedAnswer: null, showCorrect: false, userInput: '' }));
    } else setState(prev => ({ ...prev, isFinished: true }));
  };

  const hasNextPart = useMemo(() => {
    const totalParts = Math.ceil(allSubjectQuestions.length / 10);
    return partIndex + 1 < totalParts;
  }, [allSubjectQuestions, partIndex]);

  const handleNextPartClick = () => {
    if (onStartNextPart && hasNextPart) {
      onStartNextPart(partIndex + 1);
      // Reset state for new quiz
      setState({
        currentQuestionIndex: 0, score: 0, isFinished: false, selectedAnswer: null, userInput: '', showCorrect: false, userAnswers: [], isReviewing: false
      });
    }
  };

  // Review Answers Screen
  if (state.isReviewing) {
    return (
      <div className="page-transition max-w-2xl mx-auto py-6 px-2 pb-24">
        <div className="flex items-center justify-between mb-8">
           <button onClick={() => setState(prev => ({ ...prev, isReviewing: false }))} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl heading-kh text-xs flex items-center gap-2">← ត្រឡប់ក្រោយ</button>
           <h2 className="heading-kh text-white text-xl">ពិនិត្យចម្លើយឡើងវិញ</h2>
        </div>
        
        <div className="space-y-6">
          {partQuestions.map((q, qIdx) => {
            const userAnswer = state.userAnswers[qIdx];
            const isCorrect = q.type === 'mcq' ? userAnswer === q.correct : userAnswer === 'VIEWED';
            
            return (
              <div key={qIdx} className={`card-white-elegant p-6 border-l-8 ${isCorrect ? 'border-emerald-500' : 'border-red-500'}`}>
                <div className="flex gap-4 mb-4">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-white shrink-0 ${isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}>{toKhmerNumeral(qIdx + 1)}</span>
                  <h3 className="heading-kh font-bold text-lg text-indigo-950 leading-relaxed">{q.question}</h3>
                </div>
                
                {q.type === 'mcq' ? (
                  <div className="grid grid-cols-1 gap-2 pl-12">
                    {q.options?.map((opt, oIdx) => {
                      let style = "bg-gray-50 border-gray-100 text-gray-500 opacity-60";
                      if (oIdx === q.correct) style = "bg-emerald-50 border-emerald-500 text-emerald-900 opacity-100 font-bold border-2";
                      else if (oIdx === userAnswer && oIdx !== q.correct) style = "bg-red-50 border-red-500 text-red-900 opacity-100 font-bold border-2";
                      
                      return (
                        <div key={oIdx} className={`p-3 rounded-xl border flex items-center gap-3 text-sm ${style}`}>
                          <span className="w-6 h-6 rounded flex items-center justify-center font-black text-xs bg-white/50">{KHMER_PREFIXES[oIdx]}</span>
                          {opt}
                          {oIdx === q.correct && <span className="ml-auto text-emerald-600">✓</span>}
                          {oIdx === userAnswer && oIdx !== q.correct && <span className="ml-auto text-red-600">✕</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="pl-12 space-y-2">
                    <div className="p-4 bg-emerald-50 border border-emerald-500 rounded-xl">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">ចម្លើយត្រឹមត្រូវ៖</p>
                      <p className="text-emerald-950 text-sm whitespace-pre-wrap">{q.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-10">
           <button onClick={() => setState(prev => ({ ...prev, isReviewing: false }))} className="btn-blue-elegant w-full py-4 heading-kh">យល់ព្រម</button>
        </div>
      </div>
    );
  }

  // Final Results Screen
  if (state.isFinished) {
    const percentage = Math.round((state.score / partQuestions.length) * 100);
    return (
      <div className="page-transition max-w-md mx-auto py-10 px-2">
        <div className="card-white-elegant p-10 text-center border-t-8 border-indigo-900 overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-900 via-blue-500 to-indigo-900"></div>
          <div className="text-7xl mb-6">🏆</div>
          <h2 className="text-2xl font-black mb-2 heading-kh text-indigo-950">បញ្ចប់ការធ្វើតេស្ត</h2>
          <div className="text-7xl font-black text-indigo-900 my-8 drop-shadow-sm">{toKhmerNumeral(percentage)}%</div>
          
          <div className="flex justify-center gap-8 mb-10">
            <div className="text-center">
              <p className="text-[10px] uppercase font-black text-gray-400 mb-1">ត្រឹមត្រូវ</p>
              <p className="text-2xl font-black text-emerald-600">{toKhmerNumeral(state.score)}</p>
            </div>
            <div className="h-10 w-[1px] bg-gray-100"></div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-black text-gray-400 mb-1">សំណួរសរុប</p>
              <p className="text-2xl font-black text-indigo-950">{toKhmerNumeral(partQuestions.length)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => setState(prev => ({ ...prev, isReviewing: true }))}
              className="w-full py-4 bg-emerald-50 text-emerald-700 rounded-2xl border-2 border-emerald-100 font-black heading-kh shadow-sm hover:bg-emerald-100 transition-all"
            >
              👁️ ពិនិត្យចម្លើយឡើងវិញ
            </button>
            
            {hasNextPart && (
              <button 
                onClick={handleNextPartClick}
                className="btn-red-elegant w-full py-5 text-lg heading-kh shadow-xl hover:brightness-110"
              >
                ភាគបន្ទាប់ ✨ 🚀
              </button>
            )}
            
            <button 
              onClick={onExit} 
              className="btn-blue-elegant w-full py-5 text-lg heading-kh shadow-xl hover:brightness-110 active:scale-95 transition-all"
            >
              ត្រឡប់ទៅមឺនុយដើម 🏠
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = partQuestions[state.currentQuestionIndex];
  const progress = ((state.currentQuestionIndex + 1) / partQuestions.length) * 100;

  return (
    <div className="card-white-elegant p-6 md:p-12 page-transition flex flex-col min-h-[600px] relative border-b-8 border-indigo-900 shadow-2xl overflow-hidden">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gray-100">
        <div 
          className="h-full bg-gradient-to-r from-indigo-600 to-blue-400 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="flex justify-between items-start mb-10 mt-2">
        <div className="flex flex-col">
          <div className="flex gap-2 mb-3">
            <button 
              onClick={onExit}
              className="px-3 py-1 bg-indigo-50 text-indigo-900 rounded-lg text-[10px] font-black heading-kh hover:bg-indigo-900 hover:text-white transition-all shadow-sm"
            >
              ← ត្រឡប់ក្រោយ
            </button>
            <span className="text-indigo-900 font-black text-[9px] uppercase tracking-[0.2em] bg-indigo-50 px-4 py-1.5 rounded-full w-fit border border-indigo-100">
              {subject} - ភាគ {toKhmerNumeral(partIndex + 1)}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
             <span className="text-5xl font-black text-indigo-950 leading-none">{toKhmerNumeral(state.currentQuestionIndex + 1)}</span>
             <span className="text-xl font-black text-gray-300">/ {toKhmerNumeral(partQuestions.length)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border transition-all ${isMuted ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-indigo-100 text-indigo-900 shadow-sm hover:bg-indigo-50'}`}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <div className="bg-indigo-950 text-white px-6 py-3 rounded-2xl font-black text-xl shadow-lg flex items-center gap-3">
            <span className="text-xs opacity-50 font-medium">ពិន្ទុ</span>
            <span>{toKhmerNumeral(state.score)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="mb-10">
          <h2 className="text-xl md:text-3xl font-black heading-kh text-indigo-950 leading-[1.6] text-justify">
            {currentQ?.question}
          </h2>
        </div>

        {currentQ?.type === 'mcq' ? (
          <div className="grid grid-cols-1 gap-4">
            {currentQ?.options?.map((opt, i) => {
              let containerStyle = "bg-white border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 text-indigo-950 shadow-sm";
              let prefixStyle = "bg-indigo-900 text-white shadow-md"; 

              if (state.showCorrect) {
                if (i === currentQ.correct) {
                  containerStyle = "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-lg scale-[1.02] ring-4 ring-emerald-500/10";
                  prefixStyle = "bg-emerald-600 text-white";
                } else if (i === state.selectedAnswer) {
                  containerStyle = "bg-red-50 border-red-500 text-red-900 opacity-100";
                  prefixStyle = "bg-red-600 text-white";
                } else {
                  containerStyle = "opacity-40 grayscale-[0.5] border-gray-100";
                  prefixStyle = "bg-gray-400 text-white";
                }
              }

              return (
                <button 
                  key={i} 
                  onClick={() => handleMCQSelect(i)} 
                  disabled={state.showCorrect} 
                  className={`text-left p-4.5 md:p-5 rounded-2xl transition-all duration-300 font-bold text-base md:text-lg flex items-center gap-5 small-kh group ${containerStyle}`}
                >
                  <span className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-lg md:text-xl shrink-0 transition-transform group-active:scale-90 ${prefixStyle}`}>
                    {KHMER_PREFIXES[i]}
                  </span>
                  <span className="flex-1 leading-relaxed">{opt}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            {!state.showCorrect ? (
              <button 
                onClick={handleShowShortAnswer}
                className="w-full py-10 bg-indigo-50 border-4 border-dashed border-indigo-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 group hover:bg-indigo-100 hover:border-indigo-300 transition-all"
              >
                <div className="text-5xl animate-bounce">🤔</div>
                <span className="heading-kh text-indigo-900 font-black text-xl">ចុចដើម្បីបង្ហាញចម្លើយ</span>
              </button>
            ) : (
              <div className="p-8 md:p-10 bg-emerald-50 border-2 border-emerald-500 rounded-[2.5rem] animate-fadeIn shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-[4rem] flex items-center justify-center text-4xl">
                  ✅
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase small-kh shadow-md">ចម្លើយត្រឹមត្រូវ</span>
                </div>
                <p className="small-kh text-emerald-950 text-xl md:text-2xl font-bold leading-relaxed whitespace-pre-wrap">
                  {currentQ.answer}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {state.showCorrect && (
        <div className="mt-12 animate-fadeIn">
          <button 
            onClick={handleNext} 
            className="w-full btn-blue-elegant py-5 text-xl heading-kh uppercase tracking-wider shadow-[0_10px_30px_rgba(30,27,75,0.3)] hover:brightness-110 active:scale-[0.98] transition-all"
          >
            {state.currentQuestionIndex + 1 === partQuestions.length ? "បញ្ចប់ និងមើលលទ្ធផល 🏁" : "សំណួរបន្ទាប់ ✨"}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizGame;
