
import { Question } from './types';

export const SECRET_CODE = "168";

export const INITIAL_QUESTIONS: Question[] = [];

export const DEFAULT_TG_BOT_TOKEN = "8301052612:AAE4QDXA2GMi2nMBxfLe2_v-wQSpd-JrML0";

export const TG_CHANNELS = [
  { label: "Web QCM Q & A (@web_qcm_q_and_a)", value: "@web_qcm_q_and_a" },
  { label: "Naret26 (@Naret26)", value: "@Naret26" },
  { label: "TheAdvisor26 (@theAdvisor26)", value: "@theAdvisor26" },
  { label: "Family of Law (@familyoflaw)", value: "@familyoflaw" },
  { label: "Khmer Family of Law (@khmerfamilyoflaw)", value: "@khmerfamilyoflaw" },
  { label: "ID: 700259660", value: "700259660" }
];

export const ABA_PAYMENT_LINK = "https://aba.onelink.me/oRF8/5eyaceds";

// តំណភ្ជាប់ទំនាក់ទំនង
export const ADMIN_CONTACTS = {
  admin1: "https://t.me/Naret26?direct",
  admin2: "https://t.me/qcm_and_q_a"
};

export const ADMIN_TELEGRAM_LINK = ADMIN_CONTACTS.admin2; // រក្សានាមករណ៍ចាស់ដើម្បីកុំឱ្យ Error កូដផ្សេងៗ
