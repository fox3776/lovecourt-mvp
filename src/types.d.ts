export type ChatMessage = {
  id: string;
  role: 'user' | 'ai' | 'system';
  text: string;
  ts: number;
};

export type CaseSummary = {
  id: string;
  text: string;
  keywords?: string[];
};

export type Verdict = {
  case_id: string;
  title: string;
  charges: { name: string; severity: '轻' | '中' | '重'; evidence?: string[]; keywords?: string[] }[];
  orders: { type: string; content: string; deadline?: string }[];
  humor_penalty?: string;
  tips?: string[];
  share_summary?: string;
};
