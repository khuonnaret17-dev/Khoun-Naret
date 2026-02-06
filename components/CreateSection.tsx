
import * as React from 'react';
import { useState, useMemo, useRef } from 'react';
import { Question, TelegramConfig, Feedback } from '../types';
import { DEFAULT_TG_BOT_TOKEN, TG_CHANNELS } from '../constants';
import html2canvas from 'html2canvas';
import { sendQuizPoll, sendQuestionImage } from '../services/telegramService';

declare var html2pdf: any;
declare var JSZip: any;

interface CreateSectionProps {
  quizData: Question[];
  feedbackList?: Feedback[];
  onDeleteFeedback?: (id: string) => void;
  onAdd: (q: Question) => void;
  onUpdate: (index: number, q: Question) => void;
  onRemove: (index: number) => void;
  onToggleSubject: (subject: string, type: 'mcq' | 'short', active: boolean) => void;
  onUpdateSubject: (subject: string, type: 'mcq' | 'short', newName: string) => void;
  onRemoveSubject: (subject: string, type: 'mcq' | 'short') => void;
  onReorderSubject: (subject: string, type: 'mcq' | 'short', direction: 'up' | 'down') => void;
  onBatchAdd: (qs: Question[]) => void;
  onLogout: () => void;
}

type ExportTemplate = 'classic' | 'royal' | 'vivid';
type TelegramSendMode = 'poll' | 'image' | 'text';

const CreateSection: React.FC<CreateSectionProps> = ({ 
  quizData, feedbackList = [], onDeleteFeedback, onAdd, onUpdate, onRemove, onToggleSubject, onUpdateSubject, onRemoveSubject, onReorderSubject, onBatchAdd
}) => {
  const APP_LOGO_URL = "https://i.postimg.cc/0ygmLdvR/3QCM_Ep4.png";
  const KHMER_PREFIXES = ['ក', 'ខ', 'គ', 'ឃ'];
  const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  const CAMBODIA_TITLE = "ព្រះរាជាណាចក្រកម្ពុជា";
  const CAMBODIA_MOTTO = "ជាតិ សាសនា ព្រះមហាក្សត្រ";
  
  const [entryMode, setEntryMode] = useState<'single' | 'bulk' | 'subjects' | 'feedback'>('single');
  const [qType, setQType] = useState<'mcq' | 'short'>('mcq');
  const [bulkType, setBulkType] = useState<'mcq' | 'short'>('mcq');
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [shortAnswer, setShortAnswer] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [bulkText, setBulkText] = useState('');
  
  const [viewingExport, setViewingExport] = useState<{name: string, type: 'mcq' | 'short', mode: 'pdf' | 'image'} | null>(null);
  const [viewingQuestions, setViewingQuestions] = useState<{name: string, type: 'mcq' | 'short'} | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate>('classic');
  const [includeAnswer, setIncludeAnswer] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessIndex, setCurrentProcessIndex] = useState(0);
  
  const [globalSearch, setGlobalSearch] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');

  const [editingSubject, setEditingSubject] = useState<{oldName: string, type: 'mcq' | 'short', newName: string} | null>(null);

  const [footerLeft, setFooterLeft] = useState('WEB QCM 🇰🇭');
  const [footerRightTop, setFooterRightTop] = useState('t.me/web_qcm_q_and_a');
  const [footerRightBottom, setFooterRightBottom] = useState('ប្រព័ន្ធរៀបចំវិញ្ញាសាដោយស្វ័យប្រវត្តិ');
  
  const [tgConfig, setTgConfig] = useState<TelegramConfig>({ botToken: DEFAULT_TG_BOT_TOKEN, chatId: TG_CHANNELS[0].value });
  const [individualSendMode, setIndividualSendMode] = useState<TelegramSendMode>('poll');
  const [confirmIndividualSend, setConfirmIndividualSend] = useState<{q: Question, idx: number} | null>(null);

  const imageTemplateRef = useRef<HTMLDivElement>(null);
  const posterTemplateRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const [previewQ, setPreviewQ] = useState<Question | null>(null);

  const toKhmerNumeral = (n: number) => n.toString().split('').map(digit => KHMER_DIGITS[parseInt(digit)] || digit).join('');

  const filteredGlobalQuestions = useMemo(() => {
    if (!globalSearch.trim()) return [];
    return quizData
      .map((q, idx) => ({ ...q, originalIndex: idx }))
      .filter(q => 
        q.question.toLowerCase().includes(globalSearch.toLowerCase()) || 
        q.subject.toLowerCase().includes(globalSearch.toLowerCase())
      );
  }, [quizData, globalSearch]);

  const groupedSubjects = useMemo(() => {
    const getList = (type: 'mcq' | 'short') => {
      const seen = new Set<string>();
      const list: any[] = [];
      quizData.filter(q => q.type === type).forEach(q => {
        if (!seen.has(q.subject)) {
          seen.add(q.subject);
          const related = quizData.filter(rq => rq.subject === q.subject && rq.type === type);
          list.push({ name: q.subject, isActive: related.every(rq => rq.isActive !== false), count: related.length, type });
        }
      });
      return list;
    };
    return { mcq: getList('mcq'), short: getList('short') };
  }, [quizData]);

  const activeQuestionsInView = useMemo(() => {
    const target = viewingExport || viewingQuestions;
    if (!target) return [];
    let qs = quizData.filter(q => q.subject === target.name && q.type === target.type);
    if (questionSearch.trim()) {
      qs = qs.filter(q => q.question.toLowerCase().includes(questionSearch.toLowerCase()));
    }
    return qs;
  }, [quizData, viewingExport, viewingQuestions, questionSearch]);

  const captureElementBlob = async (element: HTMLElement | null): Promise<Blob | null> => {
    if (!element) return null;
    try {
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: null, 
        logging: false,
        width: 1080,
      });
      return new Promise(r => canvas.toBlob(r, 'image/png', 1.0));
    } catch (e) { return null; }
  };

  const handleExportPdf = async () => {
    if (!pdfTemplateRef.current || !viewingExport) return;
    setIsProcessing(true);
    try {
      const opt = {
        margin: 10,
        filename: `Vignasa_${viewingExport.name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().from(pdfTemplateRef.current).set(opt).save();
    } catch (e) { alert("កំហុស PDF"); } finally { setIsProcessing(false); }
  };

  const handleExportImageZip = async () => {
    if (!viewingExport) return;
    setIsProcessing(true);
    setCurrentProcessIndex(0);
    const zip = new JSZip();
    try {
      // Step 1: Export Poster first
      const posterBlob = await captureElementBlob(posterTemplateRef.current);
      if (posterBlob) zip.file(`00_Poster_Official.png`, posterBlob);

      // Step 2: Export Questions
      const questions = activeQuestionsInView;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        setPreviewQ(q);
        setCurrentProcessIndex(i + 1);
        await new Promise(r => setTimeout(r, 400)); // Delay for rendering
        const blob = await captureElementBlob(imageTemplateRef.current);
        if (blob) zip.file(`Question_${toKhmerNumeral(i + 1)}.png`, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `Images_${viewingExport.name}_${selectedTemplate}.zip`;
      link.click();
    } catch (e) { alert("កំហុស ZIP"); } finally { setPreviewQ(null); setIsProcessing(false); }
  };

  const handleSendTelegramAction = async (q: Question, idx: number, mode: TelegramSendMode) => {
    try {
      if (mode === 'image') {
        setPreviewQ(q);
        setCurrentProcessIndex(idx + 1);
        await new Promise(r => setTimeout(r, 300));
        const blob = await captureElementBlob(imageTemplateRef.current);
        if (blob) {
          const caption = `📌 *សំណួរទី ${toKhmerNumeral(idx + 1)}*\n\n📋 វិញ្ញាសា៖ ${q.subject}\n✨ ផ្តល់ជូនដោយ Web QCM 🇰🇭`;
          const res = await sendQuestionImage(tgConfig, blob, caption);
          return res.ok;
        }
      } else if (mode === 'poll' && q.type === 'mcq') {
        const res = await sendQuizPoll(tgConfig, q);
        return res.ok;
      } else {
        let text = `📌 *សំណួរ៖* ${q.question}\n\n`;
        if (q.type === 'mcq' && q.options) {
          q.options.forEach((o, i) => { text += `${KHMER_PREFIXES[i]}. ${o}${includeAnswer && i === q.correct ? ' ✅' : ''}\n`; });
        } else {
          text += `✅ *ចម្លើយ៖* ${q.answer}\n`;
        }
        text += `\n📋 វិញ្ញាសា៖ ${q.subject}\n✨ Web QCM 🇰🇭`;
        const response = await fetch(`https://api.telegram.org/bot${tgConfig.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: tgConfig.chatId, text, parse_mode: 'Markdown' })
        });
        const data = await response.json();
        return data.ok;
      }
    } catch (e) { return false; }
    return false;
  };

  const handleEditSubject = (oldName: string, type: 'mcq' | 'short') => {
    setEditingSubject({ oldName, type, newName: oldName });
  };

  const saveSubjectNameUpdate = () => {
    if (editingSubject && editingSubject.newName.trim() && editingSubject.newName.trim() !== editingSubject.oldName) {
      onUpdateSubject(editingSubject.oldName, editingSubject.type, editingSubject.newName.trim());
    }
    setEditingSubject(null);
  };

  const handleSubmitSingle = () => {
    if (!subject.trim() || !question.trim()) return alert("សូមបំពេញព័ត៌មាន!");
    const cleanQ: Question = {
      subject: subject.trim(),
      question: question.trim(),
      type: qType,
      isActive: true,
      ...(qType === 'mcq' ? { options: options.map(o => o.trim()), correct } : { answer: shortAnswer.trim() })
    };
    if (editingIndex !== null) onUpdate(editingIndex, cleanQ); else onAdd(cleanQ);
    setQuestion(''); setOptions(['', '', '', '']); setShortAnswer(''); setEditingIndex(null);
    alert("រក្សាទុកជោគជ័យ!");
  };

  const handleBulkSubmit = () => {
    if (!subject.trim() || !bulkText.trim()) return alert("សូមបំពេញព័ត៌មាន!");
    const parsed: Question[] = [];
    const lines = bulkText.split('\n');
    let current: any = null;
    if (bulkType === 'mcq') {
      lines.forEach(l => {
        const t = l.trim(); if (!t) return;
        const qm = t.match(/^[០-៩0-9]+\.\s*(.*)/);
        if (qm) {
          if (current && current.options?.length >= 2) parsed.push(current);
          current = { type: 'mcq', subject: subject.trim(), question: qm[1].trim(), options: [], correct: 0, isActive: true };
          return;
        }
        const om = t.match(/^[កខគឃ]\.\s*(.*)/);
        if (om && current) {
          let txt = om[1].replace('(ចម្លើយត្រឹមត្រូវ)', '').trim();
          current.options.push(txt);
          if (om[1].includes('(ចម្លើយត្រឹមត្រូវ)')) current.correct = current.options.length - 1;
        }
      });
      if (current && current.options?.length >= 2) parsed.push(current);
    } else {
      let isAnswer = false;
      lines.forEach(l => {
        const t = l.trim(); if (!t) return;
        const qm = t.match(/^[០-៩0-9]+\.\s*(.*)/);
        if (qm) {
          if (current && current.answer) parsed.push(current);
          current = { type: 'short', subject: subject.trim(), question: qm[1].trim(), answer: '', isActive: true };
          isAnswer = false; return;
        }
        const am = t.match(/^ចម្លើយ\s*[៖:]\s*(.*)/);
        if (am && current) { current.answer = am[1].trim(); isAnswer = true; return; }
        if (isAnswer && current) current.answer += (current.answer ? '\n' : '') + l;
      });
      if (current && current.answer) parsed.push(current);
    }
    if (parsed.length) { onBatchAdd(parsed); setBulkText(''); alert(`បាននាំចូល ${parsed.length} សំណួរ!`); }
  };

  const editFromQuestion = (q: any) => {
    const originalIdx = q.originalIndex !== undefined ? q.originalIndex : quizData.findIndex(item => item === q);
    if (originalIdx !== -1) {
      setSubject(q.subject); setQuestion(q.question); setQType(q.type);
      if (q.type === 'mcq') { setOptions(q.options || ['', '', '', '']); setCorrect(q.correct || 0); }
      else setShortAnswer(q.answer || '');
      setEditingIndex(originalIdx); setEntryMode('single'); setViewingQuestions(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-32">
      {/* EXPORT ENGINE (HIDDEN) */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        
        {/* POSTER TEMPLATE ENGINE */}
        <div ref={posterTemplateRef} style={{
          width: '1080px', height: '1080px', padding: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          background: 'linear-gradient(135deg, #800000 0%, #1e1b4b 100%)', color: '#fff'
        }}>
           <div style={{ width: '400px', height: '400px', background: '#fff', borderRadius: '50%', padding: '10px', marginBottom: '50px', border: '15px solid rgba(255,255,255,0.2)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
              <img src={APP_LOGO_URL} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
           </div>
           <h1 style={{ fontSize: '55pt', fontWeight: 'bold', marginBottom: '20px', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>វិញ្ញាសាត្រៀមប្រឡង</h1>
           <div style={{ fontSize: '75pt', fontWeight: '900', color: '#fbbf24', textShadow: '0 4px 20px rgba(0,0,0,0.5)', marginBottom: '40px' }}>{viewingExport?.name || viewingQuestions?.name}</div>
           <div style={{ height: '4px', width: '300px', background: '#fff', opacity: 0.3, marginBottom: '40px' }}></div>
           <div style={{ fontSize: '30pt', fontWeight: '600', opacity: 0.9 }}>រៀបចំ និងចែកចាយដោយ Web QCM 🇰🇭</div>
           <div style={{ fontSize: '24pt', fontWeight: '500', opacity: 0.7, marginTop: '20px' }}>{footerRightTop}</div>
        </div>

        {/* PDF TEMPLATE */}
        <div ref={pdfTemplateRef} style={{ width: '210mm', padding: '20mm', background: '#fff', color: '#000', fontFamily: 'Kantumruy Pro, sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10mm', borderBottom: '3px solid #800000', paddingBottom: '5mm' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8mm' }}>
               <img src={APP_LOGO_URL} style={{ height: '22mm', borderRadius: '50%', border: '2px solid #800000' }} />
               <div>
                  <h1 style={{ fontSize: '18pt', fontWeight: 'bold', margin: 0 }}>វិញ្ញាសា៖ {viewingExport?.name || viewingQuestions?.name}</h1>
                  <p style={{ margin: '1mm 0', opacity: 0.6 }}>ប្រភេទ៖ {viewingExport?.type.toUpperCase() || viewingQuestions?.type.toUpperCase()}</p>
               </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 'bold', margin: 0 }}>Web QCM 🇰🇭</p>
              <p style={{ margin: '1mm 0', fontSize: '10pt' }}>{new Date().toLocaleDateString('km-KH')}</p>
            </div>
          </div>
          {activeQuestionsInView.map((q, i) => (
            <div key={i} style={{ marginBottom: '10mm', pageBreakInside: 'avoid' }}>
              <p style={{ fontWeight: 'bold', fontSize: '13pt', lineHeight: 1.5 }}>សំណួរ {toKhmerNumeral(i + 1)}៖ {q.question}</p>
              {q.type === 'mcq' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', marginTop: '3mm', paddingLeft: '6mm' }}>
                  {q.options?.map((o, oi) => <p key={oi} style={{ margin: 0, color: (includeAnswer && oi === q.correct) ? '#059669' : '#000', fontWeight: (includeAnswer && oi === q.correct) ? 'bold' : 'normal' }}>{KHMER_PREFIXES[oi]}. {o}{(includeAnswer && oi === q.correct) ? ' ✓' : ''}</p>)}
                </div>
              ) : (
                <p style={{ fontStyle: 'italic', opacity: 0.6, marginTop: '2mm', paddingLeft: '6mm' }}>ចម្លើយ៖ .................................................................................</p>
              )}
            </div>
          ))}
        </div>

        {/* IMAGE TEMPLATE ENGINE */}
        <div ref={imageTemplateRef} style={{ 
          width: '1080px', height: 'auto', minHeight: '1080px', padding: '90px', borderRadius: '60px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column',
          ...(selectedTemplate === 'classic' ? { background: '#fff', color: '#000', border: '15px solid #800000' } : 
             selectedTemplate === 'royal' ? { background: 'linear-gradient(135deg, #1e1b4b 0%, #020617 100%)', color: '#fff', border: '10px solid #800000' } :
             { background: 'linear-gradient(135deg, #800000 0%, #5e0000 100%)', color: '#fff', border: '10px solid #fff' })
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '70px' }}>
            <div style={{ 
              width: '180px', height: '180px', borderRadius: '50%', overflow: 'hidden', 
              border: selectedTemplate === 'classic' ? '8px solid #800000' : '8px solid #fff', 
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
                <img src={APP_LOGO_URL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ textAlign: 'center', flex: 1, paddingLeft: '40px' }}>
               <div style={{ fontSize: '32pt', fontWeight: 'bold', marginBottom: '5px' }}>{CAMBODIA_TITLE}</div>
               <div style={{ fontSize: '26pt', fontWeight: '600', marginBottom: '10px' }}>{CAMBODIA_MOTTO}</div>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                  <div style={{ height: '3px', width: '100px', background: selectedTemplate === 'classic' ? '#800000' : '#fff', opacity: 0.5 }}></div>
                  <div style={{ fontSize: '28pt', lineHeight: 1 }}>៚</div>
                  <div style={{ height: '3px', width: '100px', background: selectedTemplate === 'classic' ? '#800000' : '#fff', opacity: 0.5 }}></div>
               </div>
               <div style={{ 
                 marginTop: '25px', padding: '10px 30px', borderRadius: '15px', display: 'inline-block', fontSize: '18pt', fontWeight: 'bold',
                 ...(selectedTemplate === 'classic' ? { background: '#f8fafc', border: '2px solid #e2e8f0', color: '#800000' } : { background: 'rgba(255,255,255,0.1)', color: '#fff' })
               }}>វិញ្ញាសា៖ {viewingExport?.name || viewingQuestions?.name}</div>
            </div>
          </div>

          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingBottom: '100px' }}>
            <h2 style={{ fontSize: '38pt', fontWeight: 'bold', lineHeight: 1.55, marginBottom: '60px', textAlign: 'justify', wordBreak: 'break-word' }}>
               {previewQ?.question}
            </h2>
            
            {previewQ?.type === 'mcq' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }}>
                {previewQ.options?.map((o, i) => (
                  <div key={i} style={{ 
                    padding: '30px 45px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '35px', fontSize: '26pt', fontWeight: '600',
                    ...(includeAnswer && i === previewQ.correct ? 
                       { background: '#ecfdf5', border: '5px solid #10b981', color: '#064e3b' } : 
                       (selectedTemplate === 'classic' ? { background: '#f8fafc', border: '2px solid #e2e8f0' } : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' })
                    )
                  }}>
                    <span style={{ 
                      width: '75px', height: '75px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '28pt',
                      background: (includeAnswer && i === previewQ.correct) ? '#10b981' : (selectedTemplate === 'classic' ? '#800000' : '#fff'),
                      color: (includeAnswer && i === previewQ.correct) ? '#fff' : (selectedTemplate === 'classic' ? '#fff' : '#800000')
                    }}>{KHMER_PREFIXES[i]}</span>
                    <span style={{ flex: 1, lineHeight: 1.4 }}>{o}</span>
                    {includeAnswer && i === previewQ.correct && <span style={{ fontSize: '35pt', marginLeft: '15px' }}>✅</span>}
                  </div>
                ))}
              </div>
            )}
            
            {previewQ?.type === 'short' && includeAnswer && (
               <div style={{ marginTop: '50px', padding: '50px', borderRadius: '35px', background: 'rgba(16, 185, 129, 0.1)', border: '4px dashed #10b981' }}>
                  <p style={{ fontSize: '22pt', fontWeight: 'bold', marginBottom: '15px', color: '#10b981' }}>✅ ចម្លើយត្រឹមត្រូវ៖</p>
                  <p style={{ fontSize: '28pt', fontWeight: '600', lineHeight: 1.5 }}>{previewQ.answer}</p>
               </div>
            )}
          </div>

          <div style={{ borderTop: '3px solid rgba(128,128,128,0.2)', paddingTop: '50px', paddingBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '24pt', fontWeight: 'bold', opacity: 0.7 }}>{footerLeft}</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
               <span style={{ fontSize: '22pt', fontWeight: '600', color: selectedTemplate === 'vivid' ? '#fbbf24' : 'inherit' }}>{footerRightTop}</span>
               <span style={{ fontSize: '16pt', opacity: 0.5, marginTop: '5px' }}>{footerRightBottom}</span>
            </div>
          </div>
        </div>
      </div>

      {/* UI SECTIONS */}
      <div className="glass-card rounded-[2.5rem] shadow-xl p-6 border border-white/50">
        <div className="bg-gray-100/80 p-1.5 rounded-2xl flex flex-wrap md:flex-nowrap gap-1 mb-10 border border-gray-200 shadow-inner">
          {[
            { id: 'single', label: '✍️ បញ្ចូលសំណួរ' },
            { id: 'bulk', label: '🚀 បញ្ចូលទាំងអស់' },
            { id: 'subjects', label: '📚 គ្រប់គ្រងទិន្នន័យ' },
            { id: 'feedback', label: '💬 មតិយោបល់' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setEntryMode(tab.id as any)} className={`flex-1 min-w-[140px] py-3.5 px-4 rounded-xl font-black heading-kh text-[11px] transition-all duration-300 ${entryMode === tab.id ? 'bg-red-700 text-white shadow-lg' : 'text-gray-500 hover:text-red-700'}`}>
              {tab.label}
              {tab.id === 'feedback' && feedbackList.length > 0 && <span className="ml-2 bg-white text-red-700 px-2 py-0.5 rounded-full text-[8px]">{feedbackList.length}</span>}
            </button>
          ))}
        </div>

        <div className="px-2">
          {entryMode === 'single' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <h2 className="text-xl font-black heading-kh text-[#800000]">{editingIndex !== null ? '✏️ កែសម្រួលសំណួរ' : '🆕 បង្កើតសំណួរថ្មី'}</h2>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  {['mcq', 'short'].map(t => (
                    <button key={t} onClick={() => setQType(t as any)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${qType === t ? 'bg-white text-[#800000] shadow-sm' : 'text-gray-400'}`}>{t === 'mcq' ? 'QCM' : 'Q & A'}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5">
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#800000] heading-kh bg-gray-50/50 text-blue-600 font-bold" placeholder="ឈ្មោះមុខវិជ្ជា..." />
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-[#800000] outline-none min-h-[120px] small-kh bg-gray-50/50 text-blue-600" placeholder="សរសេរសំណួរ..." />
                {qType === 'mcq' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <span className="font-black text-[#800000] w-10 h-10 flex items-center justify-center bg-red-50 rounded-xl">{KHMER_PREFIXES[i]}</span>
                        <input type="text" value={opt} onChange={(e) => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} className="flex-1 outline-none small-kh text-sm text-blue-600 font-medium" placeholder={`ចម្លើយទី ${i+1}`} />
                        <button onClick={() => setCorrect(i)} className={`w-8 h-8 rounded-lg flex justify-center items-center border-2 transition-all ${correct === i ? 'bg-green-500 border-green-500 text-white' : 'border-gray-100 text-gray-200'}`}>✓</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <textarea value={shortAnswer} onChange={(e) => setShortAnswer(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#800000] small-kh bg-gray-50/50 min-h-[100px] text-blue-600" placeholder="បញ្ចូលចម្លើយត្រឹមត្រូវ..." />
                )}
              </div>
              <button onClick={handleSubmitSingle} className="w-full bg-[#800000] text-white font-black py-5 rounded-[2rem] shadow-xl hover:brightness-110 transition-all heading-kh text-lg">រក្សាទុកសំណួរ</button>
            </div>
          )}

          {entryMode === 'bulk' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#800000] heading-kh bg-gray-50/50 text-blue-600 font-bold" placeholder="ឈ្មោះមុខវិជ្ជា..." />
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                  <button onClick={() => setBulkType('mcq')} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${bulkType === 'mcq' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-400'}`}>QCM</button>
                  <button onClick={() => setBulkType('short')} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${bulkType === 'short' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-400'}`}>Q & A</button>
                </div>
              </div>
              <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} className="w-full px-6 py-6 rounded-[2rem] border border-gray-100 min-h-[400px] small-kh text-xs bg-gray-50/50 outline-none focus:ring-2 focus:ring-[#800000] text-blue-600" placeholder="ចម្លងកម្រងសំណួរដាក់ទីនេះ..." />
              <button onClick={handleBulkSubmit} className="w-full bg-[#800000] text-white font-black py-5 rounded-[2rem] shadow-xl hover:brightness-110 transition-all heading-kh text-lg">នាំចូលទាំងអស់</button>
            </div>
          )}

          {entryMode === 'subjects' && (
            <div className="animate-fadeIn space-y-8">
              <div className="relative mb-6">
                <input 
                  type="text" 
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="ស្វែងរកសំណួរដោយផ្អែកលើខ្លឹមសារសំណួរ ឬមុខវិជ្ជា..." 
                  className="w-full px-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-900 heading-kh text-sm text-blue-600 font-bold shadow-inner"
                />
                <div className="absolute left-4 top-4 text-gray-400 text-lg">🔍</div>
              </div>

              {globalSearch.trim() ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <h4 className="heading-kh text-[#800000] font-black text-sm">លទ្ធផលស្វែងរកសំណួរ៖ {toKhmerNumeral(filteredGlobalQuestions.length)}</h4>
                    <button onClick={() => setGlobalSearch('')} className="text-[10px] font-black text-gray-400 hover:text-[#800000]">✖ បិទការស្វែងរក</button>
                  </div>
                  {filteredGlobalQuestions.map((q, idx) => (
                    <div key={idx} className="p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-center group hover:border-[#800000]/20 transition-all">
                      <div className="flex flex-col items-center gap-1 shrink-0">
                         <span className="w-12 h-12 bg-gray-50 rounded-2xl shadow-inner flex items-center justify-center font-black text-[#800000] border border-gray-200 group-hover:bg-red-50 transition-colors">{toKhmerNumeral(idx + 1)}</span>
                         <span className="text-[8px] font-black uppercase text-indigo-400">{q.type.toUpperCase()}</span>
                      </div>
                      <div className="flex-1">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded-md uppercase tracking-wider">{q.subject}</span>
                         </div>
                         <p className="heading-kh text-sm text-indigo-950 text-justify leading-relaxed line-clamp-2 md:line-clamp-none">{q.question}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setConfirmIndividualSend({ q, idx: q.originalIndex })} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="ផ្ញើទៅ Telegram">✈️</button>
                        <button onClick={() => editFromQuestion(q)} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="កែសម្រួល">✏️</button>
                        <button onClick={() => { if (confirm('តើអ្នកចង់លុបសំណួរនេះមែនទេ?')) { onRemove(q.originalIndex); } }} className="p-3 bg-red-50 text-red-500 rounded-2xl border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm" title="លុប">🗑️</button>
                      </div>
                    </div>
                  ))}
                  {filteredGlobalQuestions.length === 0 && (
                    <div className="py-24 text-center card-white-elegant bg-gray-50 border-dashed border-2 border-gray-200">
                      <div className="text-6xl mb-4 opacity-10">🔍</div>
                      <h3 className="heading-kh text-gray-400">មិនមានសំណួរត្រូវនឹងការស្វែងរក "{globalSearch}" ឡើយ</h3>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {groupedSubjects.mcq.map((s, i) => (
                    <div key={`m-${i}`} className={`group glass-card p-6 rounded-[2.5rem] border transition-all flex flex-col justify-between ${s.isActive ? 'bg-white border-white shadow-xl' : 'bg-gray-100/50 border-gray-200 opacity-60'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 truncate pr-2">
                           <h3 className="text-lg font-black heading-kh text-[#800000] truncate mb-2">{s.name}</h3>
                           <div className="flex flex-wrap gap-2">
                            <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase">QCM ({s.count})</span>
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${s.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-200 text-gray-500'}`}>{s.isActive ? 'Active' : 'Inactive'}</span>
                           </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => handleEditSubject(s.name, 'mcq')} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-red-50" title="ប្តូរឈ្មោះ">✏️</button>
                          <button onClick={() => onToggleSubject(s.name, 'mcq', !s.isActive)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-200" title="បើក/បិទ">🔄</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <button onClick={() => { setQuestionSearch(''); setViewingQuestions({ name: s.name, type: 'mcq' }); }} className="col-span-2 py-3 bg-indigo-950 text-white rounded-xl font-black text-[11px] shadow-md">👁️ មើលសំណួរ & Telegram</button>
                        <button onClick={() => setViewingExport({ name: s.name, type: 'mcq', mode: 'pdf' })} className="py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] hover:bg-indigo-100 transition-all">📄 PDF</button>
                        <button onClick={() => setViewingExport({ name: s.name, type: 'mcq', mode: 'image' })} className="py-2.5 bg-orange-50 text-orange-600 rounded-xl font-black text-[10px] hover:bg-orange-100 transition-all">🖼️ Images</button>
                        <button onClick={() => { if (confirm('តើអ្នកពិតជាចង់លុបមុខវិជ្ជានេះ និងរាល់សំណួរទាំងអស់មែនទេ?')) onRemoveSubject(s.name, 'mcq') }} className="col-span-2 py-2 bg-red-50 text-red-500 rounded-lg text-[9px] font-bold">🗑️ លុបវិញ្ញាសា</button>
                      </div>
                    </div>
                  ))}
                  {groupedSubjects.short.map((s, i) => (
                    <div key={`s-${i}`} className={`group glass-card p-6 rounded-[2.5rem] border transition-all flex flex-col justify-between ${s.isActive ? 'bg-white border-white shadow-xl' : 'bg-gray-100/50 border-gray-200 opacity-60'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 truncate pr-2">
                           <h3 className="text-lg font-black heading-kh text-[#800000] truncate mb-2">{s.name}</h3>
                           <div className="flex flex-wrap gap-2">
                            <span className="text-[9px] font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full uppercase">Q & A ({s.count})</span>
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${s.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-200 text-gray-500'}`}>{s.isActive ? 'Active' : 'Inactive'}</span>
                           </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => handleEditSubject(s.name, 'short')} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-red-50" title="ប្តូរឈ្មោះ">✏️</button>
                          <button onClick={() => onToggleSubject(s.name, 'short', !s.isActive)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-200" title="បើក/បិទ">🔄</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <button onClick={() => { setQuestionSearch(''); setViewingQuestions({ name: s.name, type: 'short' }); }} className="col-span-2 py-3 bg-indigo-950 text-white rounded-xl font-black text-[11px] shadow-md">👁️ មើលសំណួរ & Telegram</button>
                        <button onClick={() => setViewingExport({ name: s.name, type: 'short', mode: 'pdf' })} className="py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] hover:bg-indigo-100 transition-all">📄 PDF</button>
                        <button onClick={() => setViewingExport({ name: s.name, type: 'short', mode: 'image' })} className="py-2.5 bg-orange-50 text-orange-600 rounded-xl font-black text-[10px] hover:bg-orange-100 transition-all">🖼️ Images</button>
                        <button onClick={() => { if (confirm('តើអ្នកពិតជាចង់លុបមុខវិជ្ជានេះ និងរាល់សំណួរទាំងអស់មែនទេ?')) onRemoveSubject(s.name, 'short') }} className="col-span-2 py-2 bg-red-50 text-red-500 rounded-lg text-[9px] font-bold">🗑️ លុបវិញ្ញាសា</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {entryMode === 'feedback' && (
            <div className="animate-fadeIn space-y-4">
              {feedbackList.map(fb => (
                <div key={fb.id} className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-[#800000] text-sm mb-1">{fb.username} <span className="text-gray-300 text-[9px] ml-2">{new Date(fb.createdAt).toLocaleString()}</span></h4>
                    <p className="text-sm text-gray-600 small-kh">{fb.text}</p>
                  </div>
                  <button onClick={() => fb.id && onDeleteFeedback && onDeleteFeedback(fb.id)} className="p-2 text-red-400 hover:text-red-600">🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {editingSubject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white p-8 rounded-[3rem] max-w-md w-full shadow-2xl relative border border-white/20">
            <h3 className="heading-kh text-xl mb-6 text-indigo-950 text-center font-black">ប្តូរឈ្មោះមុខវិជ្ជា</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-4 mb-2 block tracking-widest">ឈ្មោះថ្មី</label>
                <input 
                  type="text" 
                  autoFocus
                  value={editingSubject.newName}
                  onChange={(e) => setEditingSubject({...editingSubject, newName: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#800000] heading-kh text-blue-600 font-bold"
                  placeholder="វាយឈ្មោះមុខវិជ្ជាថ្មី..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={saveSubjectNameUpdate} className="w-full py-4 bg-indigo-950 text-white rounded-2xl heading-kh font-black shadow-lg">រក្សាទុកការផ្លាស់ប្តូរ</button>
                <button onClick={() => setEditingSubject(null)} className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl heading-kh font-black">បោះបង់</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingQuestions && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white p-8 rounded-[3rem] max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative border border-white/20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pb-4 border-b border-gray-100">
               <div className="flex-1">
                  <h3 className="heading-kh text-2xl font-black text-indigo-950 truncate">{viewingQuestions.name}</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase">លទ្ធផល៖ {toKhmerNumeral(activeQuestionsInView.length)} សំណួរ</p>
               </div>
               <div className="relative w-full md:w-64">
                  <input 
                    type="text" 
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    placeholder="ស្វែងរកក្នុងវិញ្ញាសានេះ..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-950 small-kh text-xs text-blue-600 font-medium"
                  />
                  <span className="absolute left-3 top-2.5 opacity-30 text-sm">🔍</span>
               </div>
               <button onClick={() => setViewingQuestions(null)} className="w-10 h-10 bg-gray-100 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center text-xl">✕</button>
            </div>
            <div className="space-y-4">
              {activeQuestionsInView.map((q, idx) => (
                <div key={idx} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col md:flex-row gap-6 items-center">
                  <span className="w-12 h-12 bg-white rounded-2xl shadow-inner flex items-center justify-center font-black text-[#800000] shrink-0 border border-gray-200">{toKhmerNumeral(idx + 1)}</span>
                  <p className="flex-1 heading-kh text-sm text-indigo-950 text-justify leading-relaxed">{q.question}</p>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setConfirmIndividualSend({ q, idx: quizData.indexOf(q) })} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black shadow-lg">✈️ Telegram</button>
                    <button onClick={() => editFromQuestion(q)} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all" title="កែសម្រួលសំណួរ">✏️</button>
                    <button onClick={() => { if (confirm('តើអ្នកចង់លុបសំណួរនេះមែនទេ?')) { onRemove(quizData.indexOf(q)); } }} className="p-3 bg-red-50 text-red-500 rounded-2xl border border-red-100 hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                  </div>
                </div>
              ))}
              {activeQuestionsInView.length === 0 && (
                <div className="py-20 text-center opacity-30 heading-kh">មិនមានសំណួរត្រូវនឹងការស្វែងរករបស់អ្នកឡើយ</div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmIndividualSend && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white p-8 rounded-[3rem] max-w-md w-full shadow-2xl relative border border-white/20 overflow-hidden custom-scrollbar max-h-[95vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
            <h3 className="heading-kh text-xl mb-6 text-indigo-950 text-center font-black">កំណត់ការផ្ញើទៅ Telegram</h3>
            
            <div className="mb-6">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">១. ជ្រើសរើស Telegram Channel</p>
              <div className="grid grid-cols-1 gap-2 max-h-[140px] overflow-y-auto p-1 custom-scrollbar">
                {TG_CHANNELS.map(c => (
                  <button key={c.value} onClick={() => setTgConfig({...tgConfig, chatId: c.value})} className={`p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${tgConfig.chatId === c.value ? 'border-blue-600 bg-blue-50' : 'border-gray-50 bg-gray-50/50'}`}>
                    <span className={`text-[10px] font-black ${tgConfig.chatId === c.value ? 'text-blue-700' : 'text-gray-500'}`}>{c.label}</span>
                    {tgConfig.chatId === c.value && <span className="text-blue-600">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">២. ទម្រង់ផ្ញើសំណួរ</p>
              <div className="grid grid-cols-3 gap-2">
                {['poll', 'image', 'text'].map(mode => (
                  <button key={mode} onClick={() => setIndividualSendMode(mode as any)} className={`p-3 rounded-xl border-2 text-center transition-all ${individualSendMode === mode ? 'border-[#800000] bg-red-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <p className="font-black text-[10px] text-indigo-950 uppercase">{mode === 'poll' ? '📊 Poll' : mode === 'image' ? '🖼️ Image' : '📝 Text'}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 mb-6">
               <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer group">
                  <div className={`w-10 h-5 rounded-full relative transition-all ${includeAnswer ? 'bg-green-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${includeAnswer ? 'left-5.5' : 'left-0.5'}`}></div>
                  </div>
                  <input type="checkbox" className="hidden" checked={includeAnswer} onChange={(e) => setIncludeAnswer(e.target.checked)} />
                  <span className="text-[10px] font-black text-indigo-950">បង្ហាញចម្លើយត្រឹមត្រូវ</span>
               </label>
               
               {individualSendMode === 'image' && (
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 shadow-inner space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Templates</p>
                      <div className="grid grid-cols-3 gap-1">
                        {['classic', 'royal', 'vivid'].map(t => (
                          <button key={t} onClick={() => setSelectedTemplate(t as any)} className={`py-2 rounded-lg text-[9px] font-black transition-all ${selectedTemplate === t ? 'bg-blue-700 text-white shadow-md' : 'bg-white text-gray-400'}`}>{t.toUpperCase()}</button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-blue-600 uppercase">កំណត់ Footer រូបភាព</p>
                      <input type="text" value={footerLeft} onChange={(e) => setFooterLeft(e.target.value)} placeholder="Footer ខាងឆ្វេង" className="w-full px-3 py-2.5 text-[11px] rounded-xl border border-blue-200 outline-none focus:ring-2 focus:ring-blue-400 bg-white text-blue-600 font-bold small-kh" />
                      <input type="text" value={footerRightTop} onChange={(e) => setFooterRightTop(e.target.value)} placeholder="Footer ខាងស្តាំជួរទី១" className="w-full px-3 py-2.5 text-[11px] rounded-xl border border-blue-200 outline-none focus:ring-2 focus:ring-blue-400 bg-white text-blue-600 font-bold small-kh" />
                      <input type="text" value={footerRightBottom} onChange={(e) => setFooterRightBottom(e.target.value)} placeholder="Footer ខាងស្តាំជួរទី២" className="w-full px-3 py-2.5 text-[11px] rounded-xl border border-blue-200 outline-none focus:ring-2 focus:ring-blue-400 bg-white text-blue-600 font-bold small-kh" />
                    </div>
                  </div>
               )}
            </div>

            <div className="flex flex-col gap-2">
               <button onClick={async () => {
                   setIsProcessing(true);
                   const success = await handleSendTelegramAction(confirmIndividualSend.q, confirmIndividualSend.idx, individualSendMode);
                   setIsProcessing(false);
                   if (success) { setConfirmIndividualSend(null); alert("ផ្ញើរួចរាល់!"); }
                   else alert("កំហុសក្នុងការផ្ញើ!");
                }} disabled={isProcessing} className="w-full py-4 bg-indigo-950 text-white rounded-2xl heading-kh font-black shadow-lg">
                {isProcessing ? 'កំពុងផ្ញើ...' : 'យល់ព្រមផ្ញើ'}
              </button>
              <button onClick={() => setConfirmIndividualSend(null)} disabled={isProcessing} className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl heading-kh font-black">បោះបង់</button>
            </div>
          </div>
        </div>
      )}

      {viewingExport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white p-8 rounded-[3rem] max-w-sm w-full shadow-2xl relative border border-white/20 custom-scrollbar max-h-[90vh] overflow-y-auto">
            <h3 className="heading-kh text-2xl mb-6 text-indigo-950 text-center font-black">នាំចេញ {viewingExport.mode.toUpperCase()}</h3>
            <div className="space-y-6">
               <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer group">
                  <div className={`w-10 h-5 rounded-full relative transition-all ${includeAnswer ? 'bg-green-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${includeAnswer ? 'left-5.5' : 'left-0.5'}`}></div>
                  </div>
                  <input type="checkbox" className="hidden" checked={includeAnswer} onChange={(e) => setIncludeAnswer(e.target.checked)} />
                  <span className="text-[10px] font-black text-indigo-950">ភ្ជាប់ជាមួយចម្លើយត្រឹមត្រូវ</span>
               </label>
               
              {viewingExport.mode === 'image' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {['classic', 'royal', 'vivid'].map(temp => (
                      <button key={temp} onClick={() => setSelectedTemplate(temp as any)} className={`py-3 rounded-xl border-2 transition-all text-[9px] font-black uppercase ${selectedTemplate === temp ? 'border-indigo-950 bg-indigo-50 text-indigo-950' : 'border-gray-100 text-gray-400'}`}>{temp}</button>
                    ))}
                  </div>
                  
                  <div className="space-y-3 p-5 bg-blue-50 rounded-2xl border border-blue-200 shadow-inner">
                    <p className="text-[11px] font-black text-blue-600 uppercase text-center mb-1">កំណត់ Footer រូបភាព</p>
                    <input type="text" value={footerLeft} onChange={(e) => setFooterLeft(e.target.value)} placeholder="Footer ខាងឆ្វេង" className="w-full px-3 py-2.5 text-[10px] rounded-xl border border-blue-200 outline-none focus:ring-2 focus:ring-blue-400 bg-white text-blue-600 font-bold small-kh" />
                    <input type="text" value={footerRightTop} onChange={(e) => setFooterRightTop(e.target.value)} placeholder="Footer ខាងស្តាំជួរទី១" className="w-full px-3 py-2.5 text-[10px] rounded-xl border border-blue-200 outline-none focus:ring-2 focus:ring-blue-400 bg-white text-blue-600 font-bold small-kh" />
                    <input type="text" value={footerRightBottom} onChange={(e) => setFooterRightBottom(e.target.value)} placeholder="Footer ខាងស្តាំជួរទី២" className="w-full px-3 py-2.5 text-[10px] rounded-xl border border-blue-200 outline-none focus:ring-2 focus:ring-blue-400 bg-white text-blue-600 font-bold small-kh" />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button onClick={viewingExport.mode === 'pdf' ? handleExportPdf : handleExportImageZip} disabled={isProcessing} className="w-full py-4 bg-indigo-950 text-white rounded-2xl heading-kh font-black shadow-lg">
                  {isProcessing ? 'កំពុងនាំចេញ...' : 'ទាញយកទាំងអស់'}
                </button>
                <button onClick={() => setViewingExport(null)} disabled={isProcessing} className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl heading-kh font-black">បោះបង់</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateSection;
