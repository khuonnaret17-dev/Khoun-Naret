
import { TelegramConfig, Question } from '../types';

/**
 * ផ្ទៀងផ្ទាត់ Bot Token តាមរយៈ getMe API
 */
export const validateBot = async (token: string): Promise<{ ok: boolean; name?: string; error?: string }> => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    if (data.ok) {
      return { ok: true, name: data.result.first_name };
    }
    return { ok: false, error: data.description };
  } catch (err) {
    return { ok: false, error: "Network error" };
  }
};

/**
 * ផ្ញើសំណួរពហុចម្លើយ (QCM) ជា Quiz Poll ទៅកាន់ Telegram
 */
export const sendQuizPoll = async (config: TelegramConfig, q: Question): Promise<{ ok: boolean; error?: string }> => {
  if (!config.botToken || !config.chatId) {
    return { ok: false, error: "Missing configuration" };
  }

  const url = `https://api.telegram.org/bot${config.botToken}/sendPoll`;

  const cleanQuestion = q.question.length > 300 ? q.question.substring(0, 297) + "..." : q.question;
  const cleanOptions = (q.options || []).map(opt => opt.length > 100 ? opt.substring(0, 97) + "..." : opt);
  
  let explanation = `វិញ្ញាសា៖ ${q.subject} | Web QCM 🇰🇭`;
  if (explanation.length > 200) explanation = explanation.substring(0, 197) + "...";

  const payload = {
    chat_id: config.chatId.trim(),
    question: cleanQuestion,
    options: cleanOptions,
    is_anonymous: true, 
    type: 'quiz',
    correct_option_id: q.correct || 0,
    explanation: explanation
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.ok) return { ok: true };
    return { ok: false, error: data.description };
  } catch (err) {
    return { ok: false, error: "Network connection failed" };
  }
};

/**
 * ផ្ញើរូបភាពសំណួរទៅកាន់ Telegram
 */
export const sendQuestionImage = async (config: TelegramConfig, imageBlob: Blob, caption: string): Promise<{ ok: boolean; error?: string }> => {
  if (!config.botToken || !config.chatId) {
    return { ok: false, error: "Missing configuration" };
  }

  const url = `https://api.telegram.org/bot${config.botToken}/sendPhoto`;
  
  const formData = new FormData();
  formData.append('chat_id', config.chatId.trim());
  formData.append('photo', imageBlob, 'question.png');
  formData.append('caption', caption);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (data.ok) return { ok: true };
    return { ok: false, error: data.description };
  } catch (err) {
    return { ok: false, error: "Network connection failed" };
  }
};

/**
 * ផ្ញើសារសាកល្បងដើម្បីបញ្ជាក់ថា Chat ID ត្រឹមត្រូវ
 */
export const sendTestMessage = async (config: TelegramConfig): Promise<{ ok: boolean; error?: string }> => {
  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId.trim(),
        text: "🔔 នេះជាសារសាកល្បងពីប្រព័ន្ធ Quiz Master! Bot របស់អ្នកបានភ្ជាប់ដោយជោគជ័យ។"
      })
    });
    const data = await response.json();
    if (data.ok) return { ok: true };
    return { ok: false, error: data.description };
  } catch (err) {
    return { ok: false, error: "Network connection failed" };
  }
};
