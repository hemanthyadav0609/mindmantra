// @ts-nocheck
export const STORAGE_KEYS = {
  profile: 'mindmateProfile',
  gameHistory: 'mindmateGameHistory',
  attentionHistory: 'mindmateAttentionHistory',
  wordSearchHistory: 'mindmateWordSearchHistory',
  dailyChallenge: 'mindmateDailyChallenge',
  streak: 'mindmateStreak',
  adaptiveDifficulty: 'mindmateAdaptiveDifficulty',
  trainingPlan: 'mindmateTrainingPlan',
  trainingMode: 'mindmateTrainingMode',
  rememberAnswerHistory: 'mindmateRememberAnswerHistory',
  pictureRecallHistory: 'mindmatePictureRecallHistory',
  personalMemoryBank: 'mindmatePersonalMemoryBank',
  familyMemoryVault: 'mindmateFamilyMemoryVault',
  reminiscenceHistory: 'mindmateReminiscenceHistory',
  voiceSettings: 'mindmateVoiceSettings',
};

export function safeRead(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function safeWrite(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The app remains usable if browser storage is unavailable.
  }
}

export function normalizeProfile(profile = {}) {
  return {
    name: profile.name || 'Friend',
    age: profile.age || '',
    goals: Array.isArray(profile.goals) && profile.goals.length ? profile.goals : ['Balanced'],
    difficulty: ['Easy', 'Medium', 'Hard'].includes(profile.difficulty) ? profile.difficulty : 'Medium',
  };
}

export function normalizeHistory(history = []) {
  return Array.isArray(history) ? history.filter(Boolean).map((item) => ({
    ...item,
    accuracy: Number(item.accuracy) || 0,
    score: Number(item.score) || 0,
    duration: Number(item.duration) || 0,
    difficulty: item.difficulty || 'Medium',
  })) : [];
}

export function getRecent(history: any[] = [], count: number = 5): any[] {
  return normalizeHistory(history).slice(-count);
}

export function average(values = []) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length) : 0;
}

export function getAdaptiveDifficulty(history: any[] = [], preferred: any = 'Medium'): any {
  const recent = getRecent(history, 3);
  if (recent.length < 3) return preferred;
  const accuracy = average(recent.map((item) => item.accuracy));
  const score = average(recent.map((item) => item.score));
  if (accuracy >= 90 && score >= 820) return preferred === 'Easy' ? 'Medium' : 'Hard';
  if (accuracy <= 68 || score < 650) return preferred === 'Hard' ? 'Medium' : 'Easy';
  return preferred;
}

export function getStreak(history = []) {
  const days = new Set(normalizeHistory(history).map((item) => new Date(item.createdAt || item.date || Date.now()).toDateString()));
  return Math.max(1, Math.min(30, days.size + 2));
}

export function getDailyChallenge(history: any[] = []): any {
  const today = new Date().toISOString().slice(0, 10);
  const completed = normalizeHistory(history).some((item) => item.game === 'memory' && (item.accuracy || 0) >= 80 && String(item.createdAt || '').slice(0, 10) === today);
  return { date: today, title: 'Complete one Memory Game with at least 80% accuracy.', target: 1, progress: completed ? 1 : 0, completed };
}

export function getTrainingPlan(history: any[] = [], preferred: any = 'Medium'): any[] {
  const today = new Date().toISOString().slice(0, 10);
  const done = new Set(normalizeHistory(history).filter((item) => String(item.createdAt || '').slice(0, 10) === today).map((item) => item.game));
  return [
    { game: 'memory', label: 'Memory Game', difficulty: getAdaptiveDifficulty(history, preferred), duration: 10, completed: done.has('memory') },
    { game: 'attention', label: 'Attention Game', difficulty: getAdaptiveDifficulty(history, preferred === 'Hard' ? 'Medium' : 'Easy'), duration: 10, completed: done.has('attention') },
    { game: 'wordsearch', label: 'Word Search', difficulty: preferred, duration: 10, completed: done.has('wordsearch') },
  ];
}

export function getDashboardMetrics(history: any[] = []): any {
  const all = normalizeHistory(history);
  const memory = all.filter((item) => item.game === 'memory');
  const attention = all.filter((item) => item.game === 'attention');
  return {
    overall: average(all.map((item) => item.score)),
    memory: average(memory.map((item) => item.accuracy)),
    attention: average(attention.map((item) => item.accuracy)),
    activities: all.length,
    streak: getStreak(all),
  };
}

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function makeId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function makeSafeDate(value) {
  try { return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return 'Recently'; }
}
