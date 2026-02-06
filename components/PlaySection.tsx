
import * as React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Question } from '../types';
import { ADMIN_CONTACTS } from '../constants';
import { sendFeedback } from '../services/firebaseService';

declare var html2pdf: any;

interface PlaySectionProps {
  username: string;
  quizData: Question[];
  isAdmin?: boolean;
  onStartQuiz: (subject: string, partIndex: number, type: 'mcq' | 'short', customQuestions?: Question[], isMixed?: boolean) => void;
}

const PlaySection: React.FC<PlaySectionProps> = ({ username, quizData, isAdmin, onStartQuiz }) => {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedSubjectForQuiz, setSelectedSubjectForQuiz] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'mcq' | 'short'>('mcq');
  const [searchQuery, setSearchQuery] = useState('');
  const [playMode, setPlayMode] = useState<'by-subject' | 'mixed'>('by-subject');
  
  // Mixed Mode States
  const [mixedCount, setMixedCount] = useState<number>(10);
  const [selectedMixedSubjects, setSelectedMixedSubjects] = useState<string[]>([]);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const pdfRef = useRef<HTMLDivElement>(null);

  const KHMER_PREFIXES = ['ក', 'ខ', 'គ', 'ឃ'];
  const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  const toKhmerNumeral = (n: number) => n.toString().split('').map(digit => KHMER_DIGITS[parseInt(digit)] || digit).join('');
  const APP_LOGO_URL = "https://i.postimg.cc/0ygmLdvR/3QCM_Ep4.png";

  const activeQuestions = useMemo(() => quizData.filter((q: Question) => q.isActive !== false), [quizData]);

  // List of unique subjects for current activeType
  const availableSubjectsForMixed = useMemo(() => {
    return Array.from(new Set(activeQuestions.filter(q => q.type === activeType).map(q => q.subject))) as string[];
  }, [activeQuestions, activeType]);

  // Initialize selectedMixedSubjects with all subjects when availableSubjects change or mode changes to mixed
  useEffect(() => {
    if (playMode === 'mixed' && selectedMixedSubjects.length === 0) {
      setSelectedMixedSubjects(availableSubjectsForMixed);
    }
  }, [playMode, availableSubjectsForMixed]);

  const filteredSubjects: string[] = useMemo(() => {
    let list = Array.from(new Set(activeQuestions.filter(q => q.type === activeType).map((item: Question) => item.subject))) as string[];
    // Original search by subject logic (not used if we search by question)
    return list;
  }, [activeQuestions, activeType]);

  // New logic: Search questions from the whole app
  const searchedQuestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return activeQuestions.filter(q => 
      q.type === activeType && 
      (q.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
       q.subject.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [activeQuestions, searchQuery, activeType]);

  const toggleMixedSubject = (sub: string) => {
    setSelectedMixedSubjects(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const handleSelectAllMixed = () => {
    if (selectedMixedSubjects.length === availableSubjectsForMixed.length) {
      setSelectedMixedSubjects([]);
    } else {
      setSelectedMixedSubjects(availableSubjectsForMixed);
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfRef.current || !selectedSubject || !isAdmin) {
      if (!isAdmin) alert("អ្នកមិនមានសិទ្ធិទាញយកឯកសារនេះទេ!");
      return;
    }
    
    setIsGeneratingPdf(true);
    const element = pdfRef.current;
    const opt = {
      margin: 10,
      filename: `Vignasa_${selectedSubject}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save().then(() => {
      setIsGeneratingPdf(false);
    }).catch(() => {
      setIsGeneratingPdf(false);
      alert("មានបញ្ហាក្នុងការទាញយក PDF");
    });
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    setIsSendingFeedback(true);
    await sendFeedback(username || 'Anonymous', feedbackText);
    setIsSendingFeedback(false);
    setFeedbackText('');
    setShowFeedbackModal(false);
    alert("អរគុណ! មតិរបស់អ្នកត្រូវបានផ្ញើ។");
  };

  const handleStartMixedQuiz = () => {
    if (selectedMixedSubjects.length === 0) return alert("សូមជ្រើសរើសមុខវិជ្ជាយ៉ាងហោចណាស់ ១!");
    
    const filteredQuestions = activeQuestions.filter(q => 
      q.type === activeType && selectedMixedSubjects.includes(q.subject)
    );

    if (filteredQuestions.length === 0) return alert("មិនមានសំណួរសម្រាប់មុខវិជ្ជាដែលបានជ្រើសរើសឡើយ!");
    
    // Shuffle and pick
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, mixedCount);
    
    onStartQuiz("វិញ្ញាសាចម្រុះ", 0, activeType, selectedQuestions, true);
  };

  if (selectedSubjectForQuiz) {
    const subjectQuestions = activeQuestions.filter(q => q.subject === selectedSubjectForQuiz && q.type === activeType);
    const partCount = Math.ceil(subjectQuestions.length / 10);
    const parts = Array.from({ length: partCount }, (_, i) => i);

    return (
      <div className="page-transition space-y-8 px-2 pb-20">
        <div className="flex items-center justify-between gap-4 mb-6">
          <button 
            onClick={() => setSelectedSubjectForQuiz(null)} 
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center gap-2 transition-all font-black heading-kh text-sm"
          >
            ← ត្រឡប់ក្រោយ
          </button>
          <div className="text-right">
             <h2 className="heading-kh text-white text-lg truncate max-w-[200px]">{selectedSubjectForQuiz}</h2>
             <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">សូមជ្រើសរើសភាគដើម្បីធ្វើតេស្ត</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {parts.map(p => {
            const startRange = p * 10 + 1;
            const endRange = Math.min((p + 1) * 10, subjectQuestions.length);
            return (
              <button 
                key={p}
                onClick={() => onStartQuiz(selectedSubjectForQuiz, p, activeType)}
                className="group card-white-elegant p-6 flex items-center justify-between border-l-8 border-red-600 hover:scale-[1.02] transition-all"
              >
                <div className="text-left">
                  <h3 className="heading-kh text-indigo-950 text-xl font-black mb-1">ភាគ {toKhmerNumeral(p + 1)}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">សំណួរទី {toKhmerNumeral(startRange)} ដល់ {toKhmerNumeral(endRange)}</p>
                </div>
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-xl group-hover:bg-red-600 group-hover:text-white transition-all shadow-inner">
                  🚀
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (selectedSubject) {
    const subjectQuestions = activeQuestions.filter((q: Question) => q.subject === selectedSubject && q.type === activeType);
    
    return (
      <div className="page-transition space-y-8 px-2 pb-20">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <button 
            onClick={() => setSelectedSubject(null)} 
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center gap-2 transition-all font-black heading-kh text-sm"
          >
            ← ត្រឡប់ក្រោយ
          </button>
          <div className="flex gap-2">
            {isAdmin && (
              <button 
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="btn-blue-elegant px-8 py-3 text-xs heading-kh shadow-xl"
              >
                {isGeneratingPdf ? '⏳ កំពុងទាញយក...' : '📥 ទាញយក PDF'}
              </button>
            )}
            <button 
              onClick={() => setSelectedSubjectForQuiz(selectedSubject)}
              className="btn-red-elegant px-8 py-3 text-xs heading-kh shadow-xl"
            >
              🚀 ចូលធ្វើតេស្ត
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div 
            ref={pdfRef}
            style={{ backgroundColor: '#fdf6e3' }}
            className="text-indigo-950 p-10 md:p-16 rounded-[2.5rem] shadow-2xl border-t-[12px] border-red-600 overflow-hidden relative"
          >
            <div className="flex flex-col md:flex-row justify-between items-center mb-16 border-b-2 border-indigo-900/10 pb-10 gap-8">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full border-4 border-red-600/20 p-1 bg-white shadow-lg overflow-hidden shrink-0">
                  <img src={APP_LOGO_URL} alt="Logo" className="w-full h-full object-cover rounded-full" />
                </div>
                <div>
                  <h1 className="text-2xl font-black heading-kh text-red-600 mb-1">វិញ្ញាសាត្រៀមប្រឡង</h1>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Master Quiz Platform 🇰🇭</p>
                </div>
              </div>
              <div className="text-center md:text-right">
                <h2 className="text-xl font-black heading-kh text-indigo-950 mb-1">{selectedSubject}</h2>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-900/5 text-indigo-900 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-900/10">
                  ប្រភេទ៖ {activeType === 'mcq' ? 'QCM (ពហុចម្លើយ)' : 'Q & A (សំណួរ-ចម្លើយ)'}
                </div>
              </div>
            </div>

            <div className="space-y-12">
              {subjectQuestions.map((q, idx) => (
                <div key={idx} className="relative pl-14 animate-fadeIn" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="absolute left-0 top-0 w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-md border-b-4 border-red-800">
                    {toKhmerNumeral(idx + 1)}
                  </div>
                  
                  <div className="space-y-5">
                    <h3 className="text-xl font-bold heading-kh leading-relaxed text-justify">
                      {q.question}
                    </h3>
                    
                    {q.type === 'mcq' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {q.options?.map((opt, i) => (
                          <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${i === q.correct ? 'bg-green-600/10 border-green-500 shadow-sm' : 'bg-indigo-900/5 border-indigo-900/10'}`}>
                             <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${i === q.correct ? 'bg-green-600 text-white' : 'bg-white text-indigo-950/40 border border-indigo-900/10'}`}>
                                {KHMER_PREFIXES[i]}
                             </span>
                             <p 
                               className={`text-base leading-relaxed flex-1 ${i === q.correct ? 'text-green-900 font-bold' : 'text-indigo-950 opacity-80'}`}
                               style={{ fontFamily: "'Siemreap', cursive" }}
                             >
                               {opt} {i === q.correct && <span className="ml-2">✓</span>}
                             </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 bg-green-600/5 rounded-2xl border border-green-500/20 relative overflow-hidden">
                        <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-4 opacity-80 heading-kh">
                          ចម្លើយត្រឹមត្រូវ៖
                        </p>
                        <div className="space-y-3">
                          {q.answer?.split('\n').map((line, lineIdx) => (
                            <div key={lineIdx} className="flex items-start">
                               <p 
                                 className="text-indigo-950 font-medium text-lg leading-relaxed whitespace-pre-wrap"
                                 style={{ fontFamily: "'Siemreap', cursive" }}
                               >
                                 {line}
                               </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-20 pt-10 border-t border-indigo-900/10 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">ប្រព័ន្ធរៀបចំវិញ្ញាសាដោយស្វ័យប្រវត្តិតាម Web App</p>
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest font-bold">តេឡេក្រាម៖ t.me/web_qcm_q_and_a</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition space-y-10 pb-24 px-2">
      <div className="flex flex-col items-center gap-6">
        <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-xl flex gap-1 w-full max-w-sm">
          <button onClick={() => setPlayMode('by-subject')} className={`flex-1 py-3 rounded-xl font-black heading-kh text-xs transition-all ${playMode === 'by-subject' ? 'bg-indigo-900 text-white shadow-md' : 'text-white/60'}`}>📚 តាមវិញ្ញាសា</button>
          <button onClick={() => setPlayMode('mixed')} className={`flex-1 py-3 rounded-xl font-black heading-kh text-xs transition-all ${playMode === 'mixed' ? 'bg-indigo-900 text-white shadow-md' : 'text-white/60'}`}>⚡ ចម្រុះ</button>
        </div>
        
        {playMode === 'by-subject' && (
          <div className="w-full max-w-2xl relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកសំណួរដែលអ្នកចង់រៀន..." 
              className="w-full pl-14 pr-6 py-4 bg-white border-2 border-indigo-900 rounded-2xl outline-none shadow-xl heading-kh text-blue-600 text-lg font-black transition-all focus:ring-4 focus:ring-indigo-900/10"
            />
            <div className="absolute left-6 top-4 text-indigo-900/40">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-8">
        <div className="flex justify-center gap-3">
          <button onClick={() => setActiveType('mcq')} className={`px-10 py-3.5 rounded-xl font-black heading-kh text-sm transition-all border-b-4 ${activeType === 'mcq' ? 'bg-red-600 text-white border-red-800 shadow-lg' : 'bg-white text-gray-400 border-gray-200'}`}>📑 QCM</button>
          <button onClick={() => setActiveType('short')} className={`px-10 py-3.5 rounded-xl font-black heading-kh text-sm transition-all border-b-4 ${activeType === 'short' ? 'bg-red-600 text-white border-red-800 shadow-lg' : 'bg-white text-gray-400 border-gray-200'}`}>🖊️ Q & A</button>
        </div>

        {playMode === 'by-subject' ? (
          <>
            {searchQuery.trim() ? (
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="flex justify-between items-center px-4">
                  <h4 className="heading-kh text-white/70 text-xs font-black uppercase">លទ្ធផលស្វែងរកសំណួរ ({toKhmerNumeral(searchedQuestions.length)})</h4>
                  <button onClick={() => setSearchQuery('')} className="text-xs font-black text-red-500">✖ បិទ</button>
                </div>
                {searchedQuestions.map((q, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedSubject(q.subject)}
                    className="p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-center group cursor-pointer hover:border-red-600 transition-all"
                  >
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl shadow-inner flex items-center justify-center font-black text-red-600 border border-gray-200 shrink-0">
                      {toKhmerNumeral(idx + 1)}
                    </div>
                    <div className="flex-1">
                      <span className="inline-block px-3 py-1 bg-red-50 text-red-600 text-[8px] font-black rounded-full uppercase mb-2">វិញ្ញាសា៖ {q.subject}</span>
                      <p className="heading-kh text-sm text-indigo-950 text-justify leading-relaxed line-clamp-2">{q.question}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all">👁️</div>
                  </div>
                ))}
                {searchedQuestions.length === 0 && (
                  <div className="py-20 text-center">
                    <div className="text-6xl mb-4 opacity-10">🔍</div>
                    <p className="heading-kh text-white/50">មិនមានសំណួរត្រូវនឹងការស្វែងរកឡើយ</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredSubjects.map((sub, i) => {
                  const count = activeQuestions.filter(q => q.subject === sub && q.type === activeType).length;
                  return (
                    <div key={i} className="card-white-elegant p-6 flex flex-col group relative transition-all hover:border-red-600">
                      <div onClick={() => setSelectedSubjectForQuiz(sub)} className="cursor-pointer">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-3xl border border-gray-100 group-hover:bg-red-50 transition-colors">
                             {activeType === 'mcq' ? '📑' : '🖊️'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-black heading-kh text-indigo-950 truncate leading-tight">{sub}</h3>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${activeType === 'mcq' ? 'text-indigo-600' : 'text-orange-600'}`}>
                              {toKhmerNumeral(count)} សំណួរ
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-auto flex gap-3 pt-4 border-t border-gray-50">
                        <button onClick={() => setSelectedSubjectForQuiz(sub)} className="btn-red-elegant flex-[3] py-4 text-sm uppercase">ចូលធ្វើតេស្ត 🚀</button>
                        <button onClick={() => setSelectedSubject(sub)} className="flex-1 py-4 bg-gray-100 text-indigo-950 rounded-xl font-black text-2xl border border-gray-200 hover:bg-indigo-900 hover:text-white transition-all">👁️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="max-w-xl mx-auto animate-fadeIn">
             <div className="card-white-elegant p-8 text-center border-t-8 border-red-600">
                <div className="text-6xl mb-6">⚡</div>
                <h2 className="text-2xl font-black heading-kh text-indigo-950 mb-2">ធ្វើតេស្តចម្រុះ</h2>
                <p className="small-kh text-gray-500 text-sm mb-8">កម្មវិធីនឹងជ្រើសរើសសំណួរដោយចៃដន្យពីមុខវិជ្ជាដែលអ្នកបានជ្រើសរើស</p>
                
                {/* Subject Multi-Selection */}
                <div className="mb-10 text-left space-y-4">
                   <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-indigo-950 uppercase tracking-widest ml-2">ជ្រើសរើសមុខវិជ្ជា ({toKhmerNumeral(selectedMixedSubjects.length)})</p>
                      <button 
                        onClick={handleSelectAllMixed}
                        className="text-[10px] font-black text-red-600 uppercase hover:underline"
                      >
                        {selectedMixedSubjects.length === availableSubjectsForMixed.length ? 'ដកចេញទាំងអស់' : 'ជ្រើសរើសទាំងអស់'}
                      </button>
                   </div>
                   <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-2 border border-gray-100 rounded-2xl bg-gray-50/50 custom-scrollbar">
                      {availableSubjectsForMixed.map(sub => (
                        <button 
                          key={sub}
                          onClick={() => toggleMixedSubject(sub)}
                          className={`px-4 py-2.5 rounded-xl text-[10px] font-black heading-kh transition-all border-2 ${selectedMixedSubjects.includes(sub) ? 'bg-indigo-900 border-indigo-950 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'}`}
                        >
                          {sub}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Question Count Selector */}
                <div className="space-y-4 mb-10">
                   <p className="text-[10px] font-black text-indigo-950 uppercase tracking-widest text-left ml-2">ជ្រើសរើសចំនួនសំណួរ</p>
                   <div className="grid grid-cols-5 gap-2">
                      {[10, 20, 30, 50, 100].map(count => (
                        <button 
                          key={count} 
                          onClick={() => setMixedCount(count)}
                          className={`py-3 rounded-xl border-2 font-black heading-kh text-[10px] sm:text-xs transition-all ${mixedCount === count ? 'border-red-600 bg-red-50 text-red-600 shadow-md' : 'border-gray-100 text-gray-400'}`}
                        >
                          {toKhmerNumeral(count)}
                        </button>
                      ))}
                   </div>
                </div>

                <button 
                  onClick={handleStartMixedQuiz}
                  className="btn-red-elegant w-full py-5 text-xl heading-kh shadow-xl hover:brightness-110 active:scale-95 transition-all"
                >
                  ចាប់ផ្តើមតេស្តចម្រុះ 🚀
                </button>
                
                <p className="mt-6 text-[9px] font-bold text-gray-300 uppercase tracking-widest italic">
                  សរុបមាន {toKhmerNumeral(activeQuestions.filter(q => q.type === activeType).length)} សំណួរក្នុងប្រព័ន្ធ
                </p>
             </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-[50]">
        <button 
          onClick={() => setShowFeedbackModal(true)}
          className="w-14 h-14 bg-[#0084FF] text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white animate-bounce hover:scale-110 transition-transform"
        >
          {/* Facebook Messenger SVG Icon */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0C6.268 0 0 5.787 0 12.926C0 17.151 1.996 20.849 5.093 23.235V28L9.619 25.512C11.008 25.895 12.473 26.104 14 26.104C21.732 26.104 28 20.317 28 13.178C28 6.039 21.732 0.352 14 0.352V0ZM15.424 17.561L11.83 13.733L4.819 17.561L12.576 9.33L16.29 13.158L23.181 9.33L15.424 17.561Z" fill="white"/>
          </svg>
        </button>
      </div>

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
           <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-fadeIn">
              <h3 className="heading-kh text-xl text-indigo-950 mb-4 font-black">បញ្ជូនមតិយោបល់</h3>
              <textarea 
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 small-kh text-blue-600"
                placeholder="សរសេរមតិរបស់អ្នកនៅទីនេះ..."
              />
              <div className="flex gap-2 mt-6">
                 <button 
                  onClick={handleSendFeedback}
                  disabled={isSendingFeedback || !feedbackText.trim()}
                  className="flex-1 btn-blue-elegant py-3 rounded-xl heading-kh disabled:opacity-50"
                 >
                    {isSendingFeedback ? 'កំពុងផ្ញើ...' : 'ផ្ញើមតិ'}
                 </button>
                 <button 
                  onClick={() => setShowFeedbackModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl heading-kh"
                 >
                    បោះបង់
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PlaySection;
