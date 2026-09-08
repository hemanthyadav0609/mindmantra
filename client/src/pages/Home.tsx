import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Crosshair,
  Flame,
  Gamepad2,
  Gauge,
  HeartPulse,
  Lightbulb,
  ListFilter,
  LockKeyhole,
  Menu,
  Mic,
  MoreHorizontal,
  NotebookPen,
  Play,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  Timer,
  Trash2,
  Trophy,
  UserRound,
  UsersRound,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { generateAIRecommendation } from "../aiRecommendation";
import { getAdaptiveDifficulty, getDailyChallenge, getDashboardMetrics, getTrainingPlan, makeId, makeSafeDate, normalizeProfile } from "../centralEngine";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type Page = "dashboard" | "exercises" | "memories" | "memorybank" | "family" | "reminiscence" | "voice" | "progress" | "profile";
type Difficulty = "Easy" | "Medium" | "Hard";
type GameType = "memory" | "attention" | "wordsearch";

type Profile = {
  name: string;
  age: string;
  goals: string[];
  difficulty: Difficulty;
};

type Result = {
  id: string;
  game: GameType;
  difficulty: Difficulty;
  score: number;
  accuracy: number;
  duration: number;
  label: string;
  createdAt: string;
};

type Note = {
  id: string;
  title: string;
  body: string;
  tag: "Reminder" | "Idea" | "Personal";
  completed: boolean;
  createdAt: string;
};

type SavedMemory = { id: string; title: string; description: string; category: string; date: string; pinned: boolean; createdAt: string };
type FamilyMemory = SavedMemory & { relationship?: string };

type MemoryCard = { id: number; value: string };

const iconForGame: Record<GameType, typeof Brain> = {
  memory: Brain,
  attention: Crosshair,
  wordsearch: NotebookPen,
};

const gameMeta: Record<GameType, { name: string; color: string; soft: string }> = {
  memory: { name: "Memory match", color: "#2c6e5b", soft: "#e7f2eb" },
  attention: { name: "Focus tap", color: "#d7873c", soft: "#fff0dd" },
  wordsearch: { name: "Word search", color: "#8068a7", soft: "#f0eafa" },
};

const seedResults: Result[] = [
  { id: "r1", game: "memory", difficulty: "Medium", score: 820, accuracy: 88, duration: 96, label: "Memory match", createdAt: "2026-09-02T08:30:00" },
  { id: "r2", game: "attention", difficulty: "Medium", score: 780, accuracy: 84, duration: 64, label: "Focus tap", createdAt: "2026-09-03T08:30:00" },
  { id: "r3", game: "wordsearch", difficulty: "Easy", score: 710, accuracy: 91, duration: 108, label: "Word search", createdAt: "2026-09-04T08:30:00" },
  { id: "r4", game: "memory", difficulty: "Medium", score: 860, accuracy: 90, duration: 89, label: "Memory match", createdAt: "2026-09-05T08:30:00" },
  { id: "r5", game: "attention", difficulty: "Hard", score: 805, accuracy: 87, duration: 58, label: "Focus tap", createdAt: "2026-09-06T08:30:00" },
  { id: "r6", game: "memory", difficulty: "Hard", score: 900, accuracy: 93, duration: 122, label: "Memory match", createdAt: "2026-09-07T08:30:00" },
];

const seedNotes: Note[] = [
  { id: "n1", title: "Call Mum on Sunday", body: "Ask how the garden project is going.", tag: "Reminder", completed: false, createdAt: "2026-09-07T09:00:00" },
  { id: "n2", title: "Try the new walking route", body: "The riverside loop is about 35 minutes and has benches.", tag: "Personal", completed: false, createdAt: "2026-09-06T12:00:00" },
  { id: "n3", title: "A calmer morning ritual", body: "Tea first, then five minutes of focus practice before opening messages.", tag: "Idea", completed: true, createdAt: "2026-09-05T07:30:00" },
];

const seedMemories: SavedMemory[] = [
  { id: "m1", title: "Family trip to Kerala", description: "A warm week by the water with long lunches and evening walks.", category: "Place", date: "2024-11-03", pinned: true, createdAt: "2026-09-01T09:00:00" },
  { id: "m2", title: "My grandson Arjun", description: "Arjun loves trains and always asks for the blue storybook.", category: "Person", date: "2025-08-18", pinned: true, createdAt: "2026-09-02T09:00:00" },
  { id: "m3", title: "Favourite morning tea", description: "Cardamom tea in the sunny kitchen before the day begins.", category: "Favorite", date: "2026-01-12", pinned: false, createdAt: "2026-09-03T09:00:00" },
];

const seedFamily: FamilyMemory[] = [
  { id: "f1", title: "Family reunion", description: "Everyone gathered for a long lunch and old stories.", category: "Family Event", date: "2020-12-20", pinned: true, createdAt: "2026-09-01T10:00:00", relationship: "Everyone" },
  { id: "f2", title: "Grandmother's 70th birthday", description: "A garden celebration with marigolds, music, and cake.", category: "Special Moment", date: "2025-05-14", pinned: false, createdAt: "2026-09-02T10:00:00", relationship: "Family" },
];

const memoryEmojis = ["☕", "✦", "◒", "❋", "◍", "♢", "☼", "⌁", "✺", "◉"];
const wordBank = ["BREATHE", "RIVER", "MORNING", "FOCUS", "GARDEN", "ORBIT", "PAUSE", "CANDLE", "WARMTH", "NOTICE"];
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const saved = window.localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Local persistence is a progressive enhancement; the app stays usable if storage is blocked.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.max(0, seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeMemoryCards(level: Difficulty): MemoryCard[] {
  const count = level === "Easy" ? 6 : level === "Medium" ? 8 : 10;
  return shuffle([...memoryEmojis.slice(0, count), ...memoryEmojis.slice(0, count)]).map((value, id) => ({ id, value }));
}

function makeWordGrid(size: number, words: string[]) {
  const cells = Array.from({ length: size * size }, () => alphabet[Math.floor(Math.random() * alphabet.length)]);
  words.slice(0, Math.min(words.length, 4)).forEach((word, index) => {
    const row = index * 2 % size;
    const start = Math.min(size - word.length, (index * 3 + 1) % Math.max(1, size - word.length + 1));
    word.split("").forEach((letter, offset) => {
      cells[row * size + start + offset] = letter;
    });
  });
  return cells;
}

export default function Home() {
  const [page, setPage] = useState<Page>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profile, setProfile] = useLocalStorage<Profile>("mindmateProfile", {
    name: "Maya",
    age: "32",
    goals: ["Memory", "Focus"],
    difficulty: "Medium",
  });
  const [results, setResults] = useLocalStorage<Result[]>("mindmateGameHistory", seedResults);
  const [notes, setNotes] = useLocalStorage<Note[]>("mindspring-notes", seedNotes);
  const [personalMemories, setPersonalMemories] = useLocalStorage<SavedMemory[]>("mindmatePersonalMemoryBank", seedMemories);
  const [familyMemories, setFamilyMemories] = useLocalStorage<FamilyMemory[]>("mindmateFamilyMemoryVault", seedFamily);
  const [selectedGame, setSelectedGame] = useState<GameType>("memory");
  const [fontScale, setFontScale] = useLocalStorage<number>("mindmateFontScale", 1);
  const averageScore = average(results.map((result) => result.score));
  const averageAccuracy = average(results.map((result) => result.accuracy));
  const dashboardMetrics = getDashboardMetrics(results);
  const streak = dashboardMetrics.streak;
  const completedNotes = notes.filter((note) => note.completed).length;
  const recommendation = useMemo(() => generateAIRecommendation({ history: results, profile: normalizeProfile(profile) }), [results, profile]);
  const dailyChallenge = useMemo(() => getDailyChallenge(results), [results]);
  const trainingPlan = useMemo(() => getTrainingPlan(results, profile.difficulty), [results, profile.difficulty]);
  const recordResult = (result: Omit<Result, "id" | "createdAt">) => {
    setResults((current) => [...current, { ...result, id: uid("result"), createdAt: new Date().toISOString() }]);
  };

  const recommendedDifficulty = recommendation.difficulty as Difficulty;

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}em`;
  }, [fontScale]);

  useEffect(() => {
    try {
      window.localStorage.setItem("mindmateAdaptiveDifficulty", JSON.stringify(recommendedDifficulty));
      window.localStorage.setItem("mindmateTrainingPlan", JSON.stringify(trainingPlan));
      window.localStorage.setItem("mindmateDailyChallenge", JSON.stringify(dailyChallenge));
      window.localStorage.setItem("mindmateStreak", JSON.stringify(streak));
    } catch { /* local persistence is best effort */ }
  }, [recommendedDifficulty, trainingPlan, dailyChallenge, streak]);

  const goTo = (nextPage: Page) => {
    setPage(nextPage);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navItems: Array<{ id: Page; label: string; icon: typeof Brain }> = [
    { id: "dashboard", label: "Home", icon: Activity },
    { id: "exercises", label: "Games", icon: Gamepad2 },
    { id: "memories", label: "Memory help", icon: NotebookPen },
    { id: "memorybank", label: "My memories", icon: HeartPulse },
    { id: "reminiscence", label: "Reminiscence", icon: Sparkles },
    { id: "family", label: "Family vault", icon: UserRound },
    { id: "voice", label: "Voice mode", icon: Mic },
    { id: "progress", label: "Progress", icon: Trophy },
  ];

  return (
    <div className="app-shell flex min-h-screen">
      <aside className={`${mobileNavOpen ? "flex" : "hidden"} md:flex w-[238px] shrink-0 flex-col border-r border-[#dfe8e0] bg-[#f7faf6]/90 px-4 py-5 backdrop-blur-xl`}>
        <div className="flex items-center gap-3 px-3 pb-8">
          <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#2c6e5b] text-white shadow-[0_8px_18px_rgba(44,110,91,.23)]">
            <span className="display-font text-[22px]">M</span>
          </div>
          <div>
            <div className="display-font text-[19px] font-bold leading-none text-[#203b32]">MindMitra AI</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[.17em] text-[#88a094]">Cognitive wellness companion</div>
          </div>
        </div>

        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#9aaa9f]">Your space</div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => goTo(item.id)} className={`nav-item flex w-full items-center gap-3 rounded-[13px] px-3 py-3 text-left text-[13px] font-semibold ${active ? "bg-[#deede4] text-[#2c6e5b] shadow-sm" : "text-[#718278] hover:bg-[#edf4ef] hover:text-[#2c6e5b]"}`}>
                <Icon size={17} strokeWidth={active ? 2.3 : 1.8} />
                <span className="sidebar-label">{item.label}</span>
                {item.id === "memories" && notes.filter((note) => !note.completed).length > 0 && <span className="ml-auto sidebar-label rounded-full bg-[#e4b15f]/20 px-2 py-0.5 text-[10px] text-[#9b6b26]">{notes.filter((note) => !note.completed).length}</span>}
              </button>
            );
          })}
        </nav>
        <div className="mt-8 mb-3 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#9aaa9f]">Personal</div>
        <button onClick={() => goTo("profile")} className={`nav-item flex w-full items-center gap-3 rounded-[13px] px-3 py-3 text-left text-[13px] font-semibold ${page === "profile" ? "bg-[#deede4] text-[#2c6e5b]" : "text-[#718278] hover:bg-[#edf4ef] hover:text-[#2c6e5b]"}`}>
          <UserRound size={17} strokeWidth={1.8} /><span className="sidebar-label">My profile</span>
        </button>
        <div className="mt-auto rounded-[18px] bg-[#eef6ef] p-4">
          <div className="mb-3 flex items-center justify-between"><span className="eyebrow text-[#6f8f7d]">Weekly rhythm</span><Flame size={17} className="text-[#d48b38]" /></div>
          <div className="mb-2 flex items-end justify-between"><span className="display-font text-3xl font-bold text-[#285844]">{streak}</span><span className="pb-1 text-[11px] font-semibold text-[#6f8f7d]">day streak</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#73ad8e]" style={{ width: `${Math.min(100, streak / 14 * 100)}%` }} /></div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#6f8f7d]">Small, regular practice makes the biggest difference.</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex h-[74px] items-center justify-between border-b border-[#e2eae2]/80 bg-[#f7faf6]/55 px-5 backdrop-blur-xl md:px-9">
          <div className="flex items-center gap-3">
            <button className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#577065] shadow-sm md:hidden" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Open navigation"><Menu size={18} /></button>
            <div className="hidden items-center gap-2 text-[12px] text-[#8a9a90] sm:flex"><CalendarDays size={15} /> Tuesday, September 8, 2026</div>
            <div className="text-[12px] text-[#8a9a90] sm:hidden">Tuesday, Sep 8</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1 rounded-xl bg-white p-1 text-[10px] font-bold text-[#718278] shadow-sm sm:flex" aria-label="Text size controls"><button onClick={() => setFontScale(Math.max(.9, Number((fontScale - .05).toFixed(2))))} className="rounded-lg px-2 py-1 hover:bg-[#eef6ef]">A−</button><button onClick={() => setFontScale(1)} className="rounded-lg px-2 py-1 hover:bg-[#eef6ef]">A</button><button onClick={() => setFontScale(Math.min(1.15, Number((fontScale + .05).toFixed(2))))} className="rounded-lg px-2 py-1 hover:bg-[#eef6ef]">A+</button></div>
            <button className="relative grid h-9 w-9 place-items-center rounded-xl bg-white text-[#799087] shadow-sm hover:text-[#2c6e5b]" aria-label="Notifications"><Bell size={16} /><span className="pulse-dot absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-[#d58c43]" /></button>
            <button onClick={() => goTo("profile")} className="flex items-center gap-2 rounded-xl bg-white py-1.5 pl-1.5 pr-3 shadow-sm hover:bg-[#eef6ef]">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#dceee3] text-[11px] font-bold text-[#2c6e5b]">{(profile.name || "M").slice(0, 1).toUpperCase()}</div>
              <span className="hidden text-[12px] font-semibold text-[#53695e] sm:block">{profile.name || "Your profile"}</span><ChevronRight size={14} className="text-[#9aaa9f]" />
            </button>
          </div>
        </header>

        <div className="page-content px-5 py-7 pb-24 md:px-9 md:py-9 md:pb-9">
          {page === "dashboard" && <DashboardPage profile={profile} averageScore={averageScore} averageAccuracy={averageAccuracy} streak={streak} notes={notes} results={results} recommendedDifficulty={recommendedDifficulty} recommendation={recommendation} trainingPlan={trainingPlan} dailyChallenge={dailyChallenge} personalMemories={personalMemories} familyMemories={familyMemories} onNavigate={goTo} onSelectGame={(game) => { setSelectedGame(game); goTo("exercises"); }} />}
          {page === "exercises" && <ExercisesPage selectedGame={selectedGame} setSelectedGame={setSelectedGame} recommendedDifficulty={recommendedDifficulty} recordResult={recordResult} results={results} />}
          {page === "memories" && <MemoriesPage notes={notes} setNotes={setNotes} completedNotes={completedNotes} />}
          {page === "memorybank" && <MemoryBankPage memories={personalMemories} setMemories={setPersonalMemories} />}
          {page === "family" && <FamilyVaultPage memories={familyMemories} setMemories={setFamilyMemories} />}
          {page === "reminiscence" && <ReminiscencePage memories={[...personalMemories, ...familyMemories]} onNavigate={goTo} />}
          {page === "voice" && <VoicePage onNavigate={goTo} memories={[...personalMemories, ...familyMemories]} setMemories={setPersonalMemories} />}
          {page === "progress" && <ProgressPage results={results} averageScore={averageScore} averageAccuracy={averageAccuracy} />}
          {page === "profile" && <ProfilePage profile={profile} setProfile={setProfile} />}
          <footer className="mt-12 flex flex-col gap-2 border-t border-[#dfe8e0] pt-5 text-[11px] text-[#91a097] sm:flex-row sm:items-center sm:justify-between"><span>MindMitra AI · Cognitive Wellness Companion</span><span className="flex items-center gap-1"><LockKeyhole size={12} /> Your memories are stored locally on this device.</span></footer>
        </div>
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-[#dfe8e0] bg-[#f8fbf7]/95 px-2 py-2 shadow-[0_-8px_24px_rgba(47,79,64,.08)] backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
          {[{ id: "dashboard" as Page, label: "Home", icon: Activity }, { id: "exercises" as Page, label: "Games", icon: Gamepad2 }, { id: "memorybank" as Page, label: "Memories", icon: HeartPulse }, { id: "voice" as Page, label: "Voice", icon: Mic }, { id: "progress" as Page, label: "Progress", icon: Trophy }, { id: "profile" as Page, label: "Profile", icon: UserRound }].map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => goTo(item.id)} className={`flex min-w-[50px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold ${page === item.id ? "bg-[#deede4] text-[#2c6e5b]" : "text-[#83938a]"}`} aria-label={item.label}><Icon size={17} /><span>{item.label}</span></button>; })}
        </nav>
      </main>
    </div>
  );
}

function DashboardPage({ profile, averageScore, averageAccuracy, streak, notes, results, recommendedDifficulty, recommendation, trainingPlan, dailyChallenge, personalMemories, familyMemories, onNavigate, onSelectGame }: { profile: Profile; averageScore: number; averageAccuracy: number; streak: number; notes: Note[]; results: Result[]; recommendedDifficulty: Difficulty; recommendation: any; trainingPlan: any[]; dailyChallenge: any; personalMemories: SavedMemory[]; familyMemories: FamilyMemory[]; onNavigate: (page: Page) => void; onSelectGame: (game: GameType) => void }) {
  const name = profile.name || "there";
  const openNotes = notes.filter((note) => !note.completed);
  const latest = results[results.length - 1];
  return <div className="mx-auto max-w-[1180px]">
    <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div className="stagger-in"><div className="eyebrow mb-2 text-[#75a28b]">Your morning check-in</div><h1 className="display-font text-[38px] font-bold tracking-[-.04em] text-[#23463a] sm:text-[44px]">Good morning, {name}.</h1><p className="mt-2 max-w-[540px] text-[14px] leading-relaxed text-[#73847a]">A little practice today keeps your attention clear and your memories close.</p></div>
      <button onClick={() => onSelectGame("memory")} className="flex w-fit items-center gap-2 rounded-[13px] bg-[#2c6e5b] px-4 py-3 text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(44,110,91,.2)] transition hover:bg-[#245d4d]"><Play size={14} fill="currentColor" /> Start today’s practice <ArrowRight size={14} /></button>
    </div>

    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={<Gauge size={17} />} label="Cognitive score" value={averageScore || 0} suffix=" / 1000" trend="+6.4%" tone="green" />
      <StatCard icon={<Activity size={17} />} label="Activities this week" value={results.length} suffix=" sessions" trend="On track" tone="amber" />
      <StatCard icon={<Flame size={17} />} label="Current streak" value={streak} suffix=" days" trend="Best: 14" tone="orange" />
      <StatCard icon={<Target size={17} />} label="Average accuracy" value={`${averageAccuracy}%`} suffix="" trend="+3.1%" tone="purple" />
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.4fr_.9fr]">
      <section className="dark-card grain relative overflow-hidden p-6 sm:p-7">
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="relative z-10 flex flex-col justify-between gap-7 md:flex-row">
          <div className="max-w-[410px]"><div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#a8cbb4]"><span className="h-2 w-2 rounded-full bg-[#8bc49d]" /> Today at a glance</div><h2 className="display-font text-[30px] leading-tight text-white">Make space for<br /><em className="font-semibold text-[#b9dfbd]">good focus.</em></h2><p className="mt-3 text-[13px] leading-relaxed text-[#bed0c3]">Three short exercises, one calmer mind. You’re already <strong className="text-white">{Math.min(100, Math.round(results.length / 8 * 100))}%</strong> through your weekly plan.</p></div>
          <div className="flex items-center gap-6 self-start md:self-center"><div className="relative grid h-[128px] w-[128px] place-items-center rounded-full" style={{ background: `conic-gradient(#9bd1a5 ${Math.min(100, Math.round(results.length / 8 * 100))}%, rgba(255,255,255,.12) 0)` }}><div className="grid h-[103px] w-[103px] place-items-center rounded-full bg-[#1f3430] text-center"><span className="display-font text-[31px] font-bold text-white">{Math.min(100, Math.round(results.length / 8 * 100))}%</span><span className="text-[10px] text-[#adccb7]">complete</span></div></div></div>
        </div>
        <div className="relative z-10 mt-8 flex flex-wrap gap-2 border-t border-white/10 pt-5"><Pill icon={<Brain size={13} />} text="Memory" done={latest?.game === "memory"} /><Pill icon={<Crosshair size={13} />} text="Attention" done={results.length > 4} /><Pill icon={<NotebookPen size={13} />} text="Words" done={results.some((result) => result.game === "wordsearch")} /></div>
      </section>

      <section className="soft-card p-6 sm:p-7"><div className="mb-5 flex items-center justify-between"><div><div className="eyebrow mb-1 text-[#90a49a]">Your goals</div><h2 className="display-font text-[23px] font-bold text-[#2a4a3d]">Keep it personal</h2></div><button onClick={() => onNavigate("profile")} className="grid h-8 w-8 place-items-center rounded-lg bg-[#eef5ef] text-[#6b927b] hover:bg-[#deede4]"><SlidersHorizontal size={14} /></button></div><div className="space-y-4">{["Memory recall", "Sustained focus", "Daily consistency"].map((goal, index) => { const values = [74, 61, Math.min(100, streak / 14 * 100)]; return <div key={goal}><div className="mb-1.5 flex justify-between text-[11px] font-semibold text-[#6d7e73]"><span>{goal}</span><span className="text-[#2c6e5b]">{Math.round(values[index])}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#edf3ee]"><div className={`h-full rounded-full ${index === 1 ? "bg-[#e1ad5d]" : "bg-[#73ad8e]"}`} style={{ width: `${values[index]}%` }} /></div></div> })}</div><button onClick={() => onNavigate("profile")} className="mt-6 flex items-center gap-1 text-[11px] font-bold text-[#2c6e5b] hover:gap-2">Edit goals <ArrowRight size={13} /></button></section>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.9fr]">
      <section className="soft-card p-6 sm:p-7"><div className="mb-5 flex items-center justify-between"><div><div className="eyebrow mb-1 text-[#90a49a]">Today’s practice</div><h2 className="display-font text-[23px] font-bold text-[#2a4a3d]">Choose your exercise</h2></div><button onClick={() => onNavigate("exercises")} className="text-[11px] font-bold text-[#2c6e5b]">See all</button></div><div className="grid gap-3 sm:grid-cols-3"><ExerciseTeaser icon={<Brain size={19} />} title="Memory match" subtitle="Pair the patterns" meta="6 min" tone="green" onClick={() => onSelectGame("memory")} /><ExerciseTeaser icon={<Crosshair size={19} />} title="Focus tap" subtitle="Find the signal" meta="4 min" tone="amber" onClick={() => onSelectGame("attention")} /><ExerciseTeaser icon={<NotebookPen size={19} />} title="Word search" subtitle="Spot hidden words" meta="8 min" tone="purple" onClick={() => onSelectGame("wordsearch")} /></div></section>
      <section className="soft-card p-6 sm:p-7"><div className="mb-4 flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff0d9] text-[#c88437]"><Lightbulb size={16} /></div><div><div className="eyebrow text-[#90a49a]">Adaptive nudge</div><h2 className="display-font text-[20px] font-bold text-[#2a4a3d]">A good next step</h2></div></div><p className="text-[13px] leading-relaxed text-[#6d7e73]">Your recent accuracy is strong. Try a <strong className="text-[#2c6e5b]">{recommendedDifficulty.toLowerCase()}</strong> focus round next to stretch your response speed.</p><button onClick={() => onSelectGame("attention")} className="mt-5 flex items-center gap-1 text-[11px] font-bold text-[#2c6e5b] hover:gap-2">Try focus tap <ArrowRight size={13} /></button></section>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.9fr]">
      <section className="soft-card border-[#d8e9dc] bg-[#f9fdf9] p-6 sm:p-7"><div className="mb-4 flex items-start justify-between gap-4"><div><div className="eyebrow mb-1 text-[#6f9a7c]">MindMitra AI recommendation</div><h2 className="display-font text-[24px] font-bold text-[#2a4a3d]">Focus on {recommendation.focusLabel}</h2></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e4f1e7] text-[#2c6e5b]"><Sparkles size={18} /></div></div><p className="text-[13px] leading-relaxed text-[#647a6b]">{recommendation.reason}</p><div className="mt-5 grid grid-cols-3 gap-2"><div className="rounded-xl bg-white p-3"><div className="text-[10px] text-[#96a49b]">Recommended</div><div className="mt-1 text-[12px] font-bold text-[#416653]">{recommendation.focusLabel} Game</div></div><div className="rounded-xl bg-white p-3"><div className="text-[10px] text-[#96a49b]">Difficulty</div><div className="mt-1 text-[12px] font-bold text-[#416653]">{recommendation.difficulty}</div></div><div className="rounded-xl bg-white p-3"><div className="text-[10px] text-[#96a49b]">Duration</div><div className="mt-1 text-[12px] font-bold text-[#416653]">{recommendation.duration} min</div></div></div><button onClick={() => onSelectGame(recommendation.game)} className="mt-5 flex items-center gap-2 rounded-xl bg-[#2c6e5b] px-4 py-3 text-[12px] font-bold text-white">Start recommended training <ArrowRight size={14} /></button></section>
      <section className="soft-card p-6 sm:p-7"><div className="mb-4 flex items-center justify-between"><div><div className="eyebrow mb-1 text-[#b58443]">Daily challenge</div><h2 className="display-font text-[22px] font-bold text-[#2a4a3d]">One small win</h2></div><Star size={18} className="text-[#d79b4f]" /></div><p className="text-[13px] leading-relaxed text-[#6d7e73]">{dailyChallenge.title}</p><div className="mt-5 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f1eadf]"><div className="h-full rounded-full bg-[#dda45a]" style={{ width: `${dailyChallenge.progress * 100}%` }} /></div><span className="text-[11px] font-bold text-[#ae7e3c]">{dailyChallenge.progress} / {dailyChallenge.target}</span></div><div className="mt-4 text-[11px] font-bold text-[#7c8b82]">{dailyChallenge.completed ? "Completed today — lovely work." : "Complete it through your Memory Game."}</div></section>
    </div>

    <section className="soft-card mt-5 p-6 sm:p-7"><div className="mb-5 flex items-center justify-between"><div><div className="eyebrow mb-1 text-[#90a49a]">Today's cognitive plan</div><h2 className="display-font text-[23px] font-bold text-[#2a4a3d]">A gentle rhythm</h2></div><span className="rounded-full bg-[#e4f1e7] px-2.5 py-1.5 text-[10px] font-bold text-[#4f8e67]">{trainingPlan.filter((item) => item.completed).length} / {trainingPlan.length} complete</span></div><div className="grid gap-3 md:grid-cols-3">{trainingPlan.map((item) => <button key={item.game} onClick={() => item.game === "memory" || item.game === "attention" ? onSelectGame(item.game) : onNavigate("exercises")} className="flex items-center gap-3 rounded-[15px] border border-[#e5eee7] bg-[#fbfdfb] p-4 text-left hover:border-[#bfd8c5]"><div className={`grid h-10 w-10 place-items-center rounded-xl ${item.game === "memory" ? "bg-[#e4f1e7] text-[#4f9167]" : item.game === "attention" ? "bg-[#fff0da] text-[#c4843a]" : "bg-[#eee9f8] text-[#8068a7]"}`}>{item.game === "memory" ? <Brain size={18} /> : item.game === "attention" ? <Crosshair size={18} /> : <NotebookPen size={18} />}</div><div className="min-w-0 flex-1"><div className="text-[12px] font-bold text-[#536d5e]">{item.label}</div><div className="mt-1 text-[10px] text-[#94a199]">{item.difficulty} · {item.duration} min</div></div>{item.completed ? <Check size={16} className="text-[#5a9a6d]" /> : <ChevronRight size={15} className="text-[#a1afa5]" />}</button>)}</div></section>

    <section className="mt-5 grid gap-5 lg:grid-cols-3"><DashboardFeatureCard icon={<HeartPulse size={19} />} title="Personal Memory Bank" description={`${personalMemories.length} memories · ${personalMemories.filter((memory) => memory.pinned).length} pinned`} button="Open memories" onClick={() => onNavigate("memorybank")} tone="green" /><DashboardFeatureCard icon={<UsersRound size={19} />} title="Family Memory Vault" description={`${familyMemories.length} shared moments · local prototype`} button="Open vault" onClick={() => onNavigate("family")} tone="amber" /><DashboardFeatureCard icon={<Mic size={19} />} title="Talk to MindMitra" description="Ask to open a game or read your memories aloud." button="Start voice mode" onClick={() => onNavigate("voice")} tone="purple" /></section>

    <section className="soft-card mt-5 p-6 sm:p-7"><div className="mb-4 flex items-center justify-between"><div><div className="eyebrow mb-1 text-[#90a49a]">Memory assistance</div><h2 className="display-font text-[23px] font-bold text-[#2a4a3d]">Keep what matters close</h2></div><button onClick={() => onNavigate("memories")} className="flex items-center gap-1 text-[11px] font-bold text-[#2c6e5b]">Open notes <ArrowRight size={13} /></button></div>{openNotes.length ? <div className="grid gap-3 md:grid-cols-2">{openNotes.slice(0, 2).map((note) => <div key={note.id} className="flex items-start gap-3 rounded-[14px] border border-[#e5eee7] bg-[#fbfdfb] p-3"><div className="mt-0.5 h-2 w-2 rounded-full bg-[#e3ad58]" /><div><div className="text-[12px] font-bold text-[#496558]">{note.title}</div><div className="mt-1 text-[11px] text-[#8b9a91]">{note.body}</div></div><MoreHorizontal size={15} className="ml-auto text-[#a5b2aa]" /></div>)}</div> : <div className="rounded-xl bg-[#f0f6f1] p-4 text-[12px] text-[#6d7e73]">You’re all caught up. Add a note whenever you want a little extra help remembering.</div>}</section>
    <div className="mt-5 rounded-[16px] border border-[#e4ebe5] bg-[#fbfdfb] p-4 text-[11px] leading-relaxed text-[#89988f]"><strong className="text-[#5e7567]">Wellness note:</strong> MindMitra AI supports cognitive wellness, memory assistance, and personalized cognitive training. It does not diagnose or treat medical conditions.</div>
  </div>;
}

function StatCard({ icon, label, value, suffix, trend, tone }: { icon: React.ReactNode; label: string; value: string | number; suffix: string; trend: string; tone: "green" | "amber" | "orange" | "purple" }) {
  const tones = { green: "bg-[#e5f2e8] text-[#4f8d69]", amber: "bg-[#fff0da] text-[#c78436]", orange: "bg-[#ffeadf] text-[#c76f4d]", purple: "bg-[#eee9f8] text-[#8069a2]" };
  return <div className="soft-card p-4"><div className="mb-4 flex items-center justify-between"><div className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone]}`}>{icon}</div><span className="rounded-full bg-[#f0f6f1] px-2 py-1 text-[10px] font-bold text-[#77a086]">{trend}</span></div><div className="text-[11px] font-semibold text-[#85948b]">{label}</div><div className="mt-1 flex items-baseline gap-1"><span className="display-font text-[26px] font-bold text-[#2a4a3d]">{value}</span><span className="text-[11px] text-[#8b9a91]">{suffix}</span></div></div>;
}

function DashboardFeatureCard({ icon, title, description, button, onClick, tone }: { icon: React.ReactNode; title: string; description: string; button: string; onClick: () => void; tone: "green" | "amber" | "purple" }) {
  const styles = { green: "bg-[#e4f1e7] text-[#4f9167]", amber: "bg-[#fff0da] text-[#c4843a]", purple: "bg-[#eee9f8] text-[#8068a7]" };
  return <section className="soft-card p-5"><div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${styles[tone]}`}>{icon}</div><h3 className="display-font text-[20px] font-bold text-[#2a4a3d]">{title}</h3><p className="mt-2 min-h-[36px] text-[12px] leading-relaxed text-[#7c8d83]">{description}</p><button onClick={onClick} className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#2c6e5b]">{button} <ArrowRight size={13} /></button></section>;
}

function Pill({ icon, text, done }: { icon: React.ReactNode; text: string; done: boolean }) { return <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] ${done ? "border-[#78b589]/40 bg-[#78b589]/15 text-[#d4f0d4]" : "border-white/10 bg-white/5 text-[#b4c8ba]"}`}><span className={done ? "text-[#9ed8a8]" : "text-[#9fb0a4]"}>{done ? <Check size={13} /> : icon}</span>{text}{done && <span className="text-[10px] text-[#9ed8a8]">done</span>}</div>; }
function ExerciseTeaser({ icon, title, subtitle, meta, tone, onClick }: { icon: React.ReactNode; title: string; subtitle: string; meta: string; tone: "green" | "amber" | "purple"; onClick: () => void }) { const palette = { green: "bg-[#e5f2e8] text-[#4f8d69]", amber: "bg-[#fff0da] text-[#c78436]", purple: "bg-[#eee9f8] text-[#8069a2]" }; return <button onClick={onClick} className="group flex items-center gap-3 rounded-[15px] border border-[#e5eee7] bg-[#fbfdfb] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#c6ddcc] hover:shadow-sm"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${palette[tone]}`}>{icon}</div><div className="min-w-0"><div className="truncate text-[12px] font-bold text-[#4a6256]">{title}</div><div className="mt-0.5 text-[10px] text-[#96a39b]">{subtitle}</div></div><span className="ml-auto text-[10px] font-bold text-[#91a097]">{meta}</span></button>; }

function ExercisesPage({ selectedGame, setSelectedGame, recommendedDifficulty, recordResult, results }: { selectedGame: GameType; setSelectedGame: (game: GameType) => void; recommendedDifficulty: Difficulty; recordResult: (result: Omit<Result, "id" | "createdAt">) => void; results: Result[] }) {
  return <div className="mx-auto max-w-[1180px]"><div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="eyebrow mb-2 text-[#75a28b]">Practice lab</div><h1 className="display-font text-[38px] font-bold tracking-[-.04em] text-[#23463a]">Exercises</h1><p className="mt-2 text-[14px] text-[#73847a]">Train gently, notice patterns, and let the next step adapt to you.</p></div><div className="flex items-center gap-2 rounded-full bg-[#fff0da] px-3 py-2 text-[11px] font-bold text-[#a96f26]"><Sparkles size={14} /> Suggested level: {recommendedDifficulty}</div></div><div className="mb-5 flex gap-2 overflow-x-auto pb-1">{(["memory", "attention", "wordsearch"] as GameType[]).map((game) => { const Icon = iconForGame[game]; const active = selectedGame === game; return <button key={game} onClick={() => setSelectedGame(game)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold transition ${active ? "bg-[#2c6e5b] text-white shadow-[0_7px_16px_rgba(44,110,91,.18)]" : "bg-white text-[#708278] shadow-sm hover:bg-[#eef6ef]"}`}><Icon size={15} /> {gameMeta[game].name}</button>; })}</div>{selectedGame === "memory" && <MemoryGame recordResult={recordResult} />}{selectedGame === "attention" && <AttentionGame recordResult={recordResult} />}{selectedGame === "wordsearch" && <WordSearchGame recordResult={recordResult} />}</div>;
}

function DifficultyPicker({ value, onChange }: { value: Difficulty; onChange: (value: Difficulty) => void }) { return <div className="flex gap-1.5 rounded-xl bg-[#f0f5f1] p-1">{(["Easy", "Medium", "Hard"] as Difficulty[]).map((level) => <button key={level} onClick={() => onChange(level)} className={`rounded-lg px-3 py-2 text-[11px] font-bold ${value === level ? "bg-white text-[#2c6e5b] shadow-sm" : "text-[#87978d] hover:text-[#4c6659]"}`}>{level}</button>)}</div>; }

function GameShell({ eyebrow, title, description, icon, children, right }: { eyebrow: string; title: string; description: string; icon: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) { return <section className="soft-card overflow-hidden"><div className="flex flex-col justify-between gap-5 border-b border-[#e7eee8] p-6 sm:flex-row sm:items-start sm:p-8"><div className="flex gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e3f0e7] text-[#2c6e5b]">{icon}</div><div><div className="eyebrow mb-1 text-[#90a49a]">{eyebrow}</div><h2 className="display-font text-[28px] font-bold text-[#2a4a3d]">{title}</h2><p className="mt-1 max-w-[500px] text-[13px] leading-relaxed text-[#7c8c83]">{description}</p></div></div>{right}</div>{children}</section>; }

function MemoryGame({ recordResult }: { recordResult: (result: Omit<Result, "id" | "createdAt">) => void }) {
  const [level, setLevel] = useState<Difficulty>("Medium");
  const [cards, setCards] = useState<MemoryCard[]>(() => makeMemoryCards("Medium"));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [status, setStatus] = useState<"idle" | "playing" | "done">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState(0);

  useEffect(() => { if (status !== "playing") return; const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000); return () => window.clearInterval(timer); }, [status, startedAt]);
  useEffect(() => { if (flipped.length !== 2 || status !== "playing") return; const timeout = window.setTimeout(() => { const [first, second] = flipped; const pair = cards[first]?.value === cards[second]?.value; const nextMoves = moves + 1; setMoves(nextMoves); if (pair) { const nextMatched = [...matched, first, second]; setMatched(nextMatched); if (nextMatched.length === cards.length) { const finalElapsed = Math.max(1, Math.floor((Date.now() - startedAt) / 1000)); const accuracy = Math.round(((nextMatched.length / 2) / nextMoves) * 100); const score = Math.max(100, Math.round(1000 + (level === "Hard" ? 90 : level === "Medium" ? 45 : 0) - nextMoves * 18 - finalElapsed * 1.5)); recordResult({ game: "memory", difficulty: level, score, accuracy: Math.min(100, accuracy), duration: finalElapsed, label: "Memory match" }); setElapsed(finalElapsed); setStatus("done"); } } setFlipped([]); }, 550); return () => window.clearTimeout(timeout); }, [flipped, status, cards, matched, moves, startedAt, level, recordResult]);

  const start = () => { setCards(makeMemoryCards(level)); setFlipped([]); setMatched([]); setMoves(0); setElapsed(0); setStartedAt(Date.now()); setStatus("playing"); };
  const flip = (index: number) => { if (status !== "playing" || flipped.length >= 2 || flipped.includes(index) || matched.includes(index)) return; setFlipped((current) => [...current, index]); };
  const pairs = cards.length / 2;
  return <GameShell eyebrow="Memory training" title="Memory match" description="Find every pair with as few moves as possible. Your score blends accuracy, pace, and the challenge level." icon={<Brain size={23} />} right={<div className="flex flex-col items-end gap-2"><div className="text-[10px] font-bold uppercase tracking-[.12em] text-[#94a49b]">Difficulty</div><DifficultyPicker value={level} onChange={(next) => { setLevel(next); if (status !== "playing") setCards(makeMemoryCards(next)); }} /></div>}>
    <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[1fr_240px]">
      <div><div className={`mx-auto grid max-w-[570px] gap-3 ${cards.length > 16 ? "grid-cols-5" : "grid-cols-4"}`}>{cards.map((card, index) => { const visible = status === "idle" || flipped.includes(index) || matched.includes(index); return <button key={card.id} onClick={() => flip(index)} aria-label={visible ? `Card ${card.value}` : "Hidden memory card"} className={`relative aspect-square rounded-[14px] text-2xl transition duration-200 sm:rounded-[17px] sm:text-3xl ${visible ? "bg-[#e7f3e9] text-[#2c6e5b] shadow-inner" : "bg-[#2c6e5b] text-transparent shadow-[0_7px_12px_rgba(44,110,91,.14)] hover:-translate-y-0.5 hover:bg-[#347861]"}`}>{visible ? card.value : <span className="absolute inset-0 m-auto h-6 w-6 rounded-full border border-white/25" />}</button>; })}</div><div className="mt-5 flex flex-wrap items-center justify-center gap-3"><button onClick={start} className="flex items-center gap-2 rounded-xl bg-[#2c6e5b] px-4 py-2.5 text-[12px] font-bold text-white hover:bg-[#245d4d]">{status === "playing" ? <RotateCcw size={14} /> : <Play size={14} fill="currentColor" />} {status === "playing" ? "Restart round" : status === "done" ? "Play again" : "Start round"}</button>{status === "idle" && <span className="text-[11px] text-[#97a49b]">Cards reveal as a preview until you begin.</span>}{status === "done" && <span className="flex items-center gap-1 text-[12px] font-bold text-[#4d9266]"><Check size={14} /> Round saved to progress</span>}</div></div>
      <div className="rounded-[18px] bg-[#f2f7f2] p-5"><div className="eyebrow mb-4 text-[#8da196]">Round stats</div><div className="grid grid-cols-2 gap-3 lg:grid-cols-1"><GameMetric label="Pairs" value={`${matched.length / 2} / ${pairs}`} icon={<Sparkles size={14} />} /><GameMetric label="Moves" value={moves} icon={<Activity size={14} />} /><GameMetric label="Time" value={formatDuration(elapsed)} icon={<Clock3 size={14} />} /></div><div className="mt-5 border-t border-[#dce9df] pt-4"><div className="flex items-center justify-between text-[11px] text-[#819087]"><span>Accuracy</span><strong className="text-[#2c6e5b]">{moves ? Math.round((matched.length / 2 / moves) * 100) : 0}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#77b28c] transition-all" style={{ width: `${moves ? Math.min(100, matched.length / 2 / moves * 100) : 0}%` }} /></div></div></div>
    </div>
  </GameShell>;
}

function GameMetric({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) { return <div className="flex items-center justify-between rounded-xl bg-white px-3 py-3"><div className="flex items-center gap-2 text-[11px] text-[#89988f]"><span className="text-[#73a686]">{icon}</span>{label}</div><strong className="text-[13px] text-[#496457]">{value}</strong></div>; }

function AttentionGame({ recordResult }: { recordResult: (result: Omit<Result, "id" | "createdAt">) => void }) {
  const [level, setLevel] = useState<Difficulty>("Medium");
  const [status, setStatus] = useState<"idle" | "playing" | "done">("idle");
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [roundStarted, setRoundStarted] = useState(0);
  const totalRounds = level === "Easy" ? 6 : level === "Medium" ? 8 : 10;

  const nextRound = () => { setRound((current) => current + 1); setTarget(Math.floor(Math.random() * 9)); setRoundStarted(Date.now()); };
  const start = () => { setHits(0); setMisses(0); setTimes([]); setStatus("playing"); setRound(0); window.setTimeout(nextRound, 80); };
  const tap = (index: number) => { if (status !== "playing" || target === null) return; if (index !== target) { setMisses((current) => current + 1); return; } const time = Date.now() - roundStarted; const nextHits = hits + 1; const nextTimes = [...times, time]; setHits(nextHits); setTimes(nextTimes); if (round >= totalRounds) { const speed = Math.round(average(nextTimes) / 10); const accuracy = Math.round((nextHits / (nextHits + misses)) * 100); recordResult({ game: "attention", difficulty: level, score: Math.max(100, Math.round(1000 - speed * 2 + accuracy * 2)), accuracy: Math.min(100, accuracy), duration: Math.round(nextTimes.reduce((a, b) => a + b, 0) / 1000), label: "Focus tap" }); setTarget(null); setStatus("done"); } else { window.setTimeout(nextRound, 260); } };
  const avgResponse = times.length ? average(times) : 0;
  return <GameShell eyebrow="Attention training" title="Focus tap" description="A signal appears in a new place each round. Tap it quickly without chasing distractions." icon={<Crosshair size={23} />} right={<div className="flex flex-col items-end gap-2"><div className="text-[10px] font-bold uppercase tracking-[.12em] text-[#94a49b]">Difficulty</div><DifficultyPicker value={level} onChange={setLevel} /></div>}>
    <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[1fr_240px]">
      <div><div className="mx-auto grid max-w-[510px] grid-cols-3 gap-3 rounded-[22px] bg-[#f0f5f1] p-4 sm:gap-4 sm:p-6">{Array.from({ length: 9 }, (_, index) => <button key={index} onClick={() => tap(index)} className={`aspect-square rounded-[16px] border-2 transition ${target === index ? "scale-95 border-[#e0a24e] bg-[#ffc66d] shadow-[0_0_0_7px_rgba(224,162,78,.13)]" : "border-[#e2ece3] bg-white hover:border-[#bdd7c3]"}`} aria-label={`Focus tile ${index + 1}`} />)}</div><div className="mt-5 flex items-center justify-center gap-3"><button onClick={start} className="flex items-center gap-2 rounded-xl bg-[#d4873d] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_7px_16px_rgba(212,135,61,.2)] hover:bg-[#bf7431]">{status === "playing" ? <RotateCcw size={14} /> : <Play size={14} fill="currentColor" />} {status === "playing" ? "Restart round" : status === "done" ? "Play again" : "Start focus test"}</button>{status === "idle" && <span className="text-[11px] text-[#97a49b]">Stay ready. The signal moves every round.</span>}{status === "done" && <span className="flex items-center gap-1 text-[12px] font-bold text-[#4d9266]"><Check size={14} /> Performance saved</span>}</div></div>
      <div className="rounded-[18px] bg-[#fff8ee] p-5"><div className="eyebrow mb-4 text-[#c39158]">Performance</div><div className="grid grid-cols-2 gap-3 lg:grid-cols-1"><GameMetric label="Round" value={status === "idle" ? `0 / ${totalRounds}` : `${Math.min(round, totalRounds)} / ${totalRounds}`} icon={<Target size={14} />} /><GameMetric label="Hits" value={hits} icon={<Check size={14} />} /><GameMetric label="Avg response" value={avgResponse ? `${avgResponse}ms` : "—"} icon={<Zap size={14} />} /></div><div className="mt-5 border-t border-[#f1dfc7] pt-4"><div className="mb-2 flex justify-between text-[11px] text-[#9a855f]"><span>Rounds complete</span><strong className="text-[#bd7934]">{Math.round(Math.min(100, round / totalRounds * 100))}%</strong></div><div className="flex gap-1">{Array.from({ length: totalRounds }, (_, index) => <div key={index} className={`h-2 flex-1 rounded-full ${index < hits ? "bg-[#e2a65a]" : "bg-white"}`} />)}</div></div></div>
    </div>
  </GameShell>;
}

function WordSearchGame({ recordResult }: { recordResult: (result: Omit<Result, "id" | "createdAt">) => void }) {
  const [level, setLevel] = useState<Difficulty>("Easy");
  const size = level === "Easy" ? 8 : level === "Medium" ? 10 : 12;
  const wordCount = level === "Easy" ? 5 : level === "Medium" ? 7 : 9;
  const [words, setWords] = useState(() => wordBank.slice(0, 5));
  const [grid, setGrid] = useState(() => makeWordGrid(8, wordBank.slice(0, 5)));
  const [found, setFound] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "playing" | "done">("idle");
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { if (status !== "playing") return; const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000); return () => window.clearInterval(timer); }, [status, startedAt]);
  const updateLevel = (next: Difficulty) => { setLevel(next); const nextWords = wordBank.slice(0, next === "Easy" ? 5 : next === "Medium" ? 7 : 9); setWords(nextWords); setGrid(makeWordGrid(next === "Easy" ? 8 : next === "Medium" ? 10 : 12, nextWords)); setFound([]); setStatus("idle"); setElapsed(0); };
  const start = () => { setGrid(makeWordGrid(size, words)); setFound([]); setElapsed(0); setStartedAt(Date.now()); setStatus("playing"); };
  const markWord = (word: string) => { if (status !== "playing" || found.includes(word)) return; const nextFound = [...found, word]; setFound(nextFound); if (nextFound.length === words.length) { const finalElapsed = Math.max(1, Math.floor((Date.now() - startedAt) / 1000)); recordResult({ game: "wordsearch", difficulty: level, score: Math.max(100, 1000 - finalElapsed * 3 + (level === "Hard" ? 45 : 0)), accuracy: 100, duration: finalElapsed, label: "Word search" }); setElapsed(finalElapsed); setStatus("done"); } };
  return <GameShell eyebrow="Language + memory" title="Word search" description="Scan, spot, and mark the hidden words. The challenge scales the grid and the number of words to find." icon={<NotebookPen size={23} />} right={<div className="flex flex-col items-end gap-2"><div className="text-[10px] font-bold uppercase tracking-[.12em] text-[#94a49b]">Grid size</div><DifficultyPicker value={level} onChange={updateLevel} /></div>}>
    <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[1fr_280px]">
      <div><div className="mx-auto grid max-w-[540px] gap-1.5 rounded-[20px] bg-[#f0ebf8] p-3 sm:gap-2 sm:p-5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>{grid.map((letter, index) => <button key={`${letter}-${index}`} onClick={() => {}} className="grid aspect-square place-items-center rounded-[7px] bg-white text-[11px] font-bold text-[#705d91] shadow-[0_1px_1px_rgba(90,65,120,.06)] transition hover:-translate-y-0.5 hover:bg-[#fff9ef] sm:text-[13px]">{letter}</button>)}</div><div className="mt-5 flex flex-wrap items-center justify-center gap-3"><button onClick={start} className="flex items-center gap-2 rounded-xl bg-[#8068a7] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_7px_16px_rgba(128,104,167,.2)] hover:bg-[#6d5791]"><Play size={14} fill="currentColor" /> {status === "playing" ? "New challenge" : status === "done" ? "Play again" : "Start challenge"}</button>{status === "idle" && <span className="text-[11px] text-[#97a49b]">Tap a word when you’ve found it in the grid.</span>}{status === "done" && <span className="flex items-center gap-1 text-[12px] font-bold text-[#4d9266]"><Check size={14} /> Challenge saved</span>}</div></div>
      <div className="rounded-[18px] bg-[#f7f3fb] p-5"><div className="mb-4 flex items-center justify-between"><div><div className="eyebrow text-[#9e8db6]">Find these</div><div className="mt-1 text-[11px] text-[#8d7ea2]">{found.length} of {words.length} marked</div></div><div className="flex items-center gap-1 text-[12px] font-bold text-[#8068a7]"><Timer size={14} /> {formatDuration(elapsed)}</div></div><div className="space-y-2">{words.map((word) => <button key={word} onClick={() => markWord(word)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-[12px] font-bold transition ${found.includes(word) ? "border-[#cfe8d5] bg-[#e6f3e8] text-[#4e9468] line-through" : "border-[#e9e0f1] bg-white text-[#67577d] hover:border-[#c9b9dd]"}`}><span>{word}</span>{found.includes(word) ? <Check size={14} /> : <CircleHelp size={14} className="text-[#b5a8c5]" />}</button>)}</div><div className="mt-5 border-t border-[#e9e0f1] pt-4 text-[11px] leading-relaxed text-[#968ba2]">Words can run across the rows in this practice grid. Use the list as a gentle memory cue.</div></div>
    </div>
  </GameShell>;
}

function MemoriesPage({ notes, setNotes, completedNotes }: { notes: Note[]; setNotes: React.Dispatch<React.SetStateAction<Note[]>>; completedNotes: number }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | "Open" | "Done">("All");
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "", tag: "Reminder" as Note["tag"] });
  const filtered = notes.filter((note) => { const matchesQuery = `${note.title} ${note.body}`.toLowerCase().includes(query.toLowerCase()); const matchesFilter = filter === "All" || (filter === "Done" ? note.completed : !note.completed); return matchesQuery && matchesFilter; });
  const addNote = () => { if (!draft.title.trim()) return; setNotes((current) => [{ ...draft, id: uid("note"), completed: false, createdAt: new Date().toISOString() }, ...current]); setDraft({ title: "", body: "", tag: "Reminder" }); setShowComposer(false); };
  return <div className="mx-auto max-w-[980px]"><div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="eyebrow mb-2 text-[#75a28b]">Memory assistance</div><h1 className="display-font text-[38px] font-bold tracking-[-.04em] text-[#23463a]">Keep it close</h1><p className="mt-2 text-[14px] text-[#73847a]">A private little shelf for reminders, ideas, and things worth returning to.</p></div><button onClick={() => setShowComposer((current) => !current)} className="flex w-fit items-center gap-2 rounded-[13px] bg-[#2c6e5b] px-4 py-3 text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(44,110,91,.2)]"><Plus size={15} /> New memory</button></div>
    {showComposer && <div className="soft-card mb-5 p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="display-font text-[22px] font-bold text-[#2a4a3d]">Save something for later</h2><button onClick={() => setShowComposer(false)} className="text-[#9aaba0]"><X size={18} /></button></div><div className="grid gap-3"><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="A short title" className="rounded-xl border border-[#dfe9e0] bg-[#fbfdfb] px-3.5 py-3 text-[13px] text-[#405a4d] outline-none placeholder:text-[#a9b5ad] focus:border-[#8dbba0]" /><textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Add a detail, context, or gentle prompt..." rows={3} className="resize-none rounded-xl border border-[#dfe9e0] bg-[#fbfdfb] px-3.5 py-3 text-[13px] text-[#405a4d] outline-none placeholder:text-[#a9b5ad] focus:border-[#8dbba0]" /><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2">{(["Reminder", "Idea", "Personal"] as Note["tag"][]).map((tag) => <button key={tag} onClick={() => setDraft({ ...draft, tag })} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${draft.tag === tag ? "bg-[#deede4] text-[#2c6e5b]" : "bg-[#f1f5f1] text-[#829188]"}`}>{tag}</button>)}</div><button onClick={addNote} className="rounded-xl bg-[#2c6e5b] px-4 py-2.5 text-[12px] font-bold text-white">Save memory</button></div></div></div>}
    <section className="soft-card p-5 sm:p-7"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><div className="eyebrow mb-1 text-[#90a49a]">Your collection</div><h2 className="display-font text-[23px] font-bold text-[#2a4a3d]">{notes.length} saved memories</h2></div><div className="flex gap-2 rounded-xl bg-[#f1f5f1] p-1">{(["All", "Open", "Done"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${filter === item ? "bg-white text-[#2c6e5b] shadow-sm" : "text-[#87978d]"}`}>{item}{item === "Done" && <span className="ml-1 text-[10px] opacity-70">{completedNotes}</span>}</button>)}</div></div><div className="mb-5 flex items-center gap-2 rounded-xl border border-[#e2ebe3] bg-[#fbfdfb] px-3 py-2.5"><Search size={15} className="text-[#9cad9f]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your memories..." className="min-w-0 flex-1 bg-transparent text-[12px] text-[#4e6759] outline-none placeholder:text-[#aab6ad]" /><ListFilter size={15} className="text-[#9cad9f]" /></div><div className="space-y-3">{filtered.length ? filtered.map((note) => <NoteCard key={note.id} note={note} onToggle={() => setNotes((current) => current.map((item) => item.id === note.id ? { ...item, completed: !item.completed } : item))} onDelete={() => setNotes((current) => current.filter((item) => item.id !== note.id))} />) : <div className="rounded-xl bg-[#f1f6f1] p-8 text-center text-[13px] text-[#7e9184]">No memories match this view yet.</div>}</div></section>
  </div>;
}

function NoteCard({ note, onToggle, onDelete }: { note: Note; onToggle: () => void; onDelete: () => void }) { const tagStyles = { Reminder: "bg-[#fff0da] text-[#b27831]", Idea: "bg-[#eee9f8] text-[#8068a7]", Personal: "bg-[#e4f1e7] text-[#4f8e67]" }; return <div className={`group flex items-start gap-3 rounded-[16px] border p-4 transition hover:shadow-sm ${note.completed ? "border-[#e4eee5] bg-[#fafcf9]" : "border-[#e3ece4] bg-white"}`}><button onClick={onToggle} className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${note.completed ? "border-[#71ad87] bg-[#71ad87] text-white" : "border-[#c9d9cc] text-transparent hover:border-[#71ad87]"}`} aria-label={note.completed ? "Mark as open" : "Mark as complete"}><Check size={12} /></button><div className="min-w-0 flex-1"><div className={`text-[13px] font-bold ${note.completed ? "text-[#8b9b91] line-through" : "text-[#405c4e]"}`}>{note.title}</div><div className={`mt-1 text-[12px] leading-relaxed ${note.completed ? "text-[#a4afa7]" : "text-[#819188]"}`}>{note.body || "No extra detail"}</div><span className={`mt-3 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${tagStyles[note.tag]}`}>{note.tag}</span></div><button onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-lg text-[#b1bdb4] opacity-0 transition hover:bg-[#fff0ee] hover:text-[#c75c52] group-hover:opacity-100" aria-label="Delete note"><Trash2 size={14} /></button></div>; }

function ProgressPage({ results, averageScore, averageAccuracy }: { results: Result[]; averageScore: number; averageAccuracy: number }) {
  const chartData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => ({ day, score: [68, 71, 69, 76, 74, 81, Math.min(100, Math.round(averageScore / 10))][index] }));
  const gameAverages = (["memory", "attention", "wordsearch"] as GameType[]).map((game) => ({ game, count: results.filter((result) => result.game === game).length, score: average(results.filter((result) => result.game === game).map((result) => result.score)), accuracy: average(results.filter((result) => result.game === game).map((result) => result.accuracy)) }));
  return <div className="mx-auto max-w-[1180px]"><div className="mb-7"><div className="eyebrow mb-2 text-[#75a28b]">Progress journal</div><h1 className="display-font text-[38px] font-bold tracking-[-.04em] text-[#23463a]">See the shape of your practice</h1><p className="mt-2 text-[14px] text-[#73847a]">Trends are here to help you notice, not judge. Consistency is the real win.</p></div><div className="mb-5 grid gap-4 sm:grid-cols-3"><StatCard icon={<Trophy size={17} />} label="Overall score" value={averageScore} suffix=" / 1000" trend="Growing" tone="green" /><StatCard icon={<HeartPulse size={17} />} label="Average accuracy" value={`${averageAccuracy}%`} suffix="" trend="Steady" tone="purple" /><StatCard icon={<Clock3 size={17} />} label="Practice time" value={Math.round(results.reduce((sum, result) => sum + result.duration, 0) / 60)} suffix=" min" trend="This month" tone="amber" /></div><div className="grid gap-5 xl:grid-cols-[1.4fr_.9fr]"><section className="soft-card p-6 sm:p-7"><div className="mb-5 flex items-start justify-between"><div><div className="eyebrow mb-1 text-[#90a49a]">Weekly trend</div><h2 className="display-font text-[23px] font-bold text-[#2a4a3d]">A little more each day</h2></div><div className="rounded-full bg-[#e4f1e7] px-2.5 py-1.5 text-[10px] font-bold text-[#4d9166]">+12% this week</div></div><div className="h-[250px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 4, left: -22, bottom: 0 }}><defs><linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#78b58f" stopOpacity={.35} /><stop offset="100%" stopColor="#78b58f" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf2ee" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#92a197", fontSize: 11 }} /><Tooltip cursor={{ stroke: "#c9dfce" }} contentStyle={{ borderRadius: 12, border: "1px solid #e1ece3", boxShadow: "0 8px 22px rgba(44,84,58,.08)", fontSize: 11 }} /><Area type="monotone" dataKey="score" stroke="#5c9f75" strokeWidth={3} fill="url(#scoreFill)" dot={{ r: 3, fill: "#5c9f75", strokeWidth: 2, stroke: "#fff" }} /></AreaChart></ResponsiveContainer></div></section><section className="soft-card p-6 sm:p-7"><div className="eyebrow mb-1 text-[#90a49a]">By exercise</div><h2 className="display-font text-[23px] font-bold text-[#2a4a3d]">Where you’re growing</h2><div className="mt-5 space-y-4">{gameAverages.map(({ game, count, score, accuracy }) => { const meta = gameMeta[game]; const Icon = iconForGame[game]; return <div key={game} className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundColor: meta.soft, color: meta.color }}><Icon size={16} /></div><div className="min-w-0 flex-1"><div className="flex justify-between text-[11px] font-bold text-[#546c5e]"><span>{meta.name}</span><span>{count ? `${accuracy}%` : "Ready"}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#edf3ee]"><div className="h-full rounded-full" style={{ width: `${count ? Math.min(100, accuracy) : 12}%`, backgroundColor: meta.color }} /></div></div></div>; })}</div></section></div><section className="soft-card mt-5 p-6 sm:p-7"><div className="mb-5 flex items-center justify-between"><div><div className="eyebrow mb-1 text-[#90a49a]">Recent sessions</div><h2 className="display-font text-[23px] font-bold text-[#2a4a3d]">Your practice log</h2></div><span className="flex items-center gap-1 text-[11px] text-[#829188]"><Activity size={13} /> {results.length} total</span></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead><tr className="border-b border-[#e8eee8] text-[10px] uppercase tracking-[.1em] text-[#9aa9a0]"><th className="pb-3 font-bold">Exercise</th><th className="pb-3 font-bold">Level</th><th className="pb-3 font-bold">Score</th><th className="pb-3 font-bold">Accuracy</th><th className="pb-3 font-bold">Time</th></tr></thead><tbody>{results.slice().reverse().slice(0, 6).map((result) => { const Icon = iconForGame[result.game]; return <tr key={result.id} className="border-b border-[#eff3ef] last:border-0"><td className="py-3 text-[12px] font-bold text-[#526a5c]"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#eef5ef] text-[#4d9167]"><Icon size={14} /></span>{result.label}</td><td className="py-3 text-[11px] text-[#819188]">{result.difficulty}</td><td className="py-3 text-[12px] font-bold text-[#2c6e5b]">{result.score}</td><td className="py-3 text-[12px] text-[#6f8276]">{result.accuracy}%</td><td className="py-3 text-[11px] text-[#8b9a91]">{formatDuration(result.duration)}</td></tr>; })}</tbody></table></div></section></div>;
}

function ProfilePage({ profile, setProfile }: { profile: Profile; setProfile: React.Dispatch<React.SetStateAction<Profile>> }) {
  const [saved, setSaved] = useState(false);
  const goals = ["Memory", "Focus", "Language", "Consistency"];
  const save = () => { setSaved(true); window.setTimeout(() => setSaved(false), 1800); };
  return <div className="mx-auto max-w-[850px]"><div className="mb-7"><div className="eyebrow mb-2 text-[#75a28b]">Personal settings</div><h1 className="display-font text-[38px] font-bold tracking-[-.04em] text-[#23463a]">Your practice, your way</h1><p className="mt-2 text-[14px] text-[#73847a]">Tune your profile so recommendations feel useful, not noisy.</p></div><section className="soft-card overflow-hidden"><div className="flex items-center gap-4 bg-[#eef6ef] p-6 sm:p-8"><div className="grid h-[68px] w-[68px] place-items-center rounded-[22px] bg-[#2c6e5b] text-white shadow-[0_10px_20px_rgba(44,110,91,.18)]"><span className="display-font text-3xl">{(profile.name || "M").slice(0, 1).toUpperCase()}</span></div><div><div className="eyebrow mb-1 text-[#6c907a]">Member profile</div><div className="display-font text-[26px] font-bold text-[#2a4e40]">{profile.name || "Your name"}</div><div className="mt-1 text-[12px] text-[#759181]">Everything is saved only in this browser.</div></div></div><div className="grid gap-7 p-6 sm:p-8"><div className="grid gap-4 sm:grid-cols-2"><Field label="Your name"><input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className="profile-input" placeholder="e.g. Maya" /></Field><Field label="Age"><input value={profile.age} onChange={(event) => setProfile({ ...profile, age: event.target.value })} className="profile-input" placeholder="Optional" /></Field></div><div><div className="mb-2 text-[12px] font-bold text-[#536d5e]">What would you like to strengthen?</div><div className="flex flex-wrap gap-2">{goals.map((goal) => { const active = profile.goals.includes(goal); return <button key={goal} onClick={() => setProfile({ ...profile, goals: active ? profile.goals.filter((item) => item !== goal) : [...profile.goals, goal] })} className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-bold ${active ? "bg-[#deede4] text-[#2c6e5b]" : "bg-[#f1f5f1] text-[#89988e]"}`}>{active && <Check size={13} />}{goal}</button>; })}</div></div><div><div className="mb-2 text-[12px] font-bold text-[#536d5e]">Preferred starting difficulty</div><div className="flex gap-2">{(["Easy", "Medium", "Hard"] as Difficulty[]).map((level) => <button key={level} onClick={() => setProfile({ ...profile, difficulty: level })} className={`rounded-xl border px-4 py-2.5 text-[11px] font-bold ${profile.difficulty === level ? "border-[#9cc5a7] bg-[#e5f2e8] text-[#2c6e5b]" : "border-[#e3ece4] bg-white text-[#89988e]"}`}>{level}</button>)}</div><p className="mt-2 text-[11px] text-[#97a49b]">MindMitra will still adjust this gently as your recent results change.</p></div><div className="flex items-center justify-between border-t border-[#e9efea] pt-5"><div className="flex items-center gap-2 text-[11px] text-[#92a097]"><LockKeyhole size={14} /> Local-only profile</div><button onClick={save} className="flex items-center gap-2 rounded-xl bg-[#2c6e5b] px-4 py-2.5 text-[12px] font-bold text-white">{saved ? <Check size={14} /> : <UserRound size={14} />} {saved ? "Saved" : "Save profile"}</button></div></div></section></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><div className="mb-2 text-[12px] font-bold text-[#536d5e]">{label}</div>{children}</label>; }


function ReadAloudButton({ text }: { text: string }) {
  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };
  return <button onClick={speak} className="flex items-center gap-1.5 rounded-lg bg-[#eef5ef] px-3 py-2 text-[11px] font-bold text-[#2c6e5b] hover:bg-[#deede4]" aria-label="Read aloud"><Volume2 size={14} /> Read aloud</button>;
}

function MemoryBankPage({ memories, setMemories }: { memories: SavedMemory[]; setMemories: React.Dispatch<React.SetStateAction<SavedMemory[]>> }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", category: "Person", date: new Date().toISOString().slice(0, 10) });
  const categories = ["All", "Person", "Place", "Favorite", "Event", "Personal Memory", "Important"];
  const filtered = memories.filter((memory) => `${memory.title} ${memory.description}`.toLowerCase().includes(query.toLowerCase()) && (category === "All" || memory.category === category));
  const saveMemory = () => { if (!draft.title.trim()) return; setMemories((current) => [{ ...draft, id: makeId("memory"), pinned: false, createdAt: new Date().toISOString() }, ...current]); setDraft({ title: "", description: "", category: "Person", date: new Date().toISOString().slice(0, 10) }); setShowComposer(false); };
  return <CollectionPage eyebrow="Private memory bank" title="My memories" description="Save people, places, favourite moments, and personal details you want to keep close." accent="green" actionLabel="Add memory" onAction={() => setShowComposer((value) => !value)}>
    <div className="mb-5 grid gap-3 sm:grid-cols-4"><MiniStat label="Total memories" value={memories.length} /><MiniStat label="People" value={memories.filter((memory) => memory.category === "Person").length} /><MiniStat label="Places" value={memories.filter((memory) => memory.category === "Place").length} /><MiniStat label="Pinned" value={memories.filter((memory) => memory.pinned).length} /></div>
    {showComposer && <MemoryComposer draft={draft} setDraft={setDraft} onSave={saveMemory} onCancel={() => setShowComposer(false)} />}
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><div className="flex flex-1 items-center gap-2 rounded-xl border border-[#e0eae1] bg-white px-3 py-3"><Search size={16} className="text-[#9aa9a0]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search personal memories" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#aab6ad]" /></div><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-[#e0eae1] bg-white px-3 text-[12px] text-[#5c7466] outline-none">{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
    <div className="grid gap-4 lg:grid-cols-2">{filtered.map((memory) => <MemoryCard key={memory.id} memory={memory} onPin={() => setMemories((current) => current.map((item) => item.id === memory.id ? { ...item, pinned: !item.pinned } : item))} onDelete={() => setMemories((current) => current.filter((item) => item.id !== memory.id))} />)}</div>
    {!filtered.length && <EmptyState title="No personal memories yet." description="Save a special moment, person, or place." onAdd={() => setShowComposer(true)} />}
    <Timeline memories={memories} />
  </CollectionPage>;
}

function FamilyVaultPage({ memories, setMemories }: { memories: FamilyMemory[]; setMemories: React.Dispatch<React.SetStateAction<FamilyMemory[]>> }) {
  const [showComposer, setShowComposer] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState({ title: "", description: "", category: "Family Event", date: new Date().toISOString().slice(0, 10) });
  const filtered = memories.filter((memory) => `${memory.title} ${memory.description}`.toLowerCase().includes(query.toLowerCase()));
  const saveMemory = () => { if (!draft.title.trim()) return; setMemories((current) => [{ ...draft, id: makeId("family"), pinned: false, createdAt: new Date().toISOString(), relationship: "Family" }, ...current]); setDraft({ title: "", description: "", category: "Family Event", date: new Date().toISOString().slice(0, 10) }); setShowComposer(false); };
  return <CollectionPage eyebrow="Shared family memories" title="Family Memory Vault" description="Keep your family's people, events, stories, and special moments together. Local prototype — not synced between devices." accent="amber" actionLabel="Add family memory" onAction={() => setShowComposer((value) => !value)}>
    <div className="mb-5 rounded-[18px] border border-[#f0dfc0] bg-[#fff7e9] p-4 text-[12px] leading-relaxed text-[#8e6f40]"><strong>Family Memory Vault — Local Prototype.</strong> This information is stored only in this browser until a future synced version is added.</div>
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><MiniStat label="Family memories" value={memories.length} /><MiniStat label="Family members" value={3} /><MiniStat label="Pinned moments" value={memories.filter((memory) => memory.pinned).length} /></div>
    {showComposer && <MemoryComposer draft={draft} setDraft={setDraft} onSave={saveMemory} onCancel={() => setShowComposer(false)} family />}
    <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#e7dfcf] bg-white px-3 py-3"><Search size={16} className="text-[#b29b72]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the family vault" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#b5a78e]" /></div>
    <div className="grid gap-4 lg:grid-cols-2">{filtered.map((memory) => <MemoryCard key={memory.id} memory={memory} family onPin={() => setMemories((current) => current.map((item) => item.id === memory.id ? { ...item, pinned: !item.pinned } : item))} onDelete={() => setMemories((current) => current.filter((item) => item.id !== memory.id))} />)}</div>
    {!filtered.length && <EmptyState title="No family memories yet." description="Start building your family memory collection." onAdd={() => setShowComposer(true)} />}
    <Timeline memories={memories} family />
  </CollectionPage>;
}

function CollectionPage({ eyebrow, title, description, accent, actionLabel, onAction, children }: { eyebrow: string; title: string; description: string; accent: "green" | "amber"; actionLabel: string; onAction: () => void; children: React.ReactNode }) { const isAmber = accent === "amber"; return <div className="mx-auto max-w-[1060px]"><div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className={`eyebrow mb-2 ${isAmber ? "text-[#b5894b]" : "text-[#75a28b]"}`}>{eyebrow}</div><h1 className="display-font text-[38px] font-bold tracking-[-.04em] text-[#23463a]">{title}</h1><p className="mt-2 max-w-[660px] text-[14px] leading-relaxed text-[#73847a]">{description}</p></div><button onClick={onAction} className={`flex w-fit items-center gap-2 rounded-[13px] px-4 py-3 text-[12px] font-bold text-white shadow-sm ${isAmber ? "bg-[#c88740] hover:bg-[#b87733]" : "bg-[#2c6e5b] hover:bg-[#245d4d]"}`}><Plus size={15} /> {actionLabel}</button></div><section className="soft-card p-5 sm:p-7">{children}</section></div>; }
function MiniStat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-[15px] bg-[#f5f8f5] p-4"><div className="text-[11px] font-semibold text-[#8c9d92]">{label}</div><div className="display-font mt-1 text-2xl font-bold text-[#315b49]">{value}</div></div>; }
function MemoryComposer({ draft, setDraft, onSave, onCancel, family = false }: { draft: { title: string; description: string; category: string; date: string }; setDraft: (value: any) => void; onSave: () => void; onCancel: () => void; family?: boolean }) { const options = family ? ["Family Member", "Birthday", "Anniversary", "Family Event", "Trip", "Special Moment", "Family Story"] : ["Person", "Place", "Favorite", "Event", "Personal Memory", "Important"]; return <div className="mb-5 rounded-[18px] bg-[#f1f7f2] p-5"><div className="mb-4 flex items-center justify-between"><h2 className="display-font text-[22px] font-bold text-[#2a4a3d]">Save a memory</h2><button onClick={onCancel}><X size={18} className="text-[#93a299]" /></button></div><div className="grid gap-3 sm:grid-cols-2"><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Title" className="profile-input" /><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className="profile-input" /><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="profile-input sm:col-span-2">{options.map((option) => <option key={option}>{option}</option>)}</select><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={3} placeholder="Describe the memory in your own words..." className="profile-input resize-none sm:col-span-2" /></div><div className="mt-4 flex justify-end gap-2"><button onClick={onCancel} className="rounded-xl px-4 py-2.5 text-[12px] font-bold text-[#809087]">Cancel</button><button onClick={onSave} className="rounded-xl bg-[#2c6e5b] px-4 py-2.5 text-[12px] font-bold text-white">Save memory</button></div></div>; }
function MemoryCard({ memory, onPin, onDelete, family = false }: { memory: SavedMemory | FamilyMemory; onPin: () => void; onDelete: () => void; family?: boolean }) { return <article className="group rounded-[18px] border border-[#e4ece5] bg-[#fbfdfb] p-5 transition hover:-translate-y-0.5 hover:shadow-sm"><div className="mb-3 flex items-start justify-between gap-3"><div className={`grid h-10 w-10 place-items-center rounded-xl ${family ? "bg-[#fff0da] text-[#c8863d]" : "bg-[#e4f1e7] text-[#4d9167]"}`}>{family ? <UsersRound size={18} /> : <HeartPulse size={18} />}</div><div className="flex gap-1"><button onClick={onPin} className={`grid h-8 w-8 place-items-center rounded-lg ${memory.pinned ? "bg-[#fff0da] text-[#c8863d]" : "text-[#aab6ad] hover:bg-[#f0f5f1]"}`} aria-label="Pin memory"><Star size={15} fill={memory.pinned ? "currentColor" : "none"} /></button><button onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-lg text-[#aab6ad] hover:bg-[#fff0ee] hover:text-[#c75c52]" aria-label="Delete memory"><Trash2 size={14} /></button></div></div><h3 className="text-[15px] font-bold text-[#405b4e]">{memory.title}</h3><p className="mt-2 min-h-[44px] text-[12px] leading-relaxed text-[#7f9086]">{memory.description}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[#eef5ef] px-2.5 py-1 text-[10px] font-bold text-[#5b806a]">{memory.category}</span><div className="flex items-center gap-2 text-[10px] text-[#97a49b]"><span>{makeSafeDate(memory.date)}</span><ReadAloudButton text={`${memory.title}. ${memory.description}`} /></div></div></article>; }
function Timeline({ memories, family = false }: { memories: SavedMemory[]; family?: boolean }) { const sorted = [...memories].sort((a, b) => String(a.date).localeCompare(String(b.date))); return <div className="mt-8 border-t border-[#e8eee8] pt-6"><div className="eyebrow mb-1 text-[#90a49a]">Timeline</div><h2 className="display-font text-[22px] font-bold text-[#2a4a3d]">Moments over time</h2><div className="mt-5 space-y-4">{sorted.map((memory) => <div key={memory.id} className="flex gap-4"><div className={`w-16 shrink-0 text-[11px] font-bold ${family ? "text-[#b58340]" : "text-[#5d8e6d]"}`}>{String(memory.date).slice(0, 4)}</div><div className="relative flex-1 border-l border-[#dfe9e0] pb-3 pl-5"><div className={`absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full ${family ? "bg-[#dfa45c]" : "bg-[#72ab85]"}`} /><div className="text-[12px] font-bold text-[#557061]">{memory.title}</div><div className="mt-1 text-[11px] text-[#8a998f]">{memory.category}</div></div></div>)}</div></div>; }
function EmptyState({ title, description, onAdd }: { title: string; description: string; onAdd: () => void }) { return <div className="rounded-[18px] bg-[#f1f6f1] p-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#78a887]"><HeartPulse size={20} /></div><h3 className="display-font mt-4 text-[22px] font-bold text-[#416552]">{title}</h3><p className="mt-2 text-[12px] text-[#829188]">{description}</p><button onClick={onAdd} className="mt-5 rounded-xl bg-[#2c6e5b] px-4 py-2.5 text-[12px] font-bold text-white">+ Add memory</button></div>; }

function ReminiscencePage({ memories, onNavigate }: { memories: Array<SavedMemory | FamilyMemory>; onNavigate: (page: Page) => void }) {
  const [index, setIndex] = useState(0);
  const memory = memories[index % Math.max(1, memories.length)];
  const prompt = memory ? `Would you like to talk about ${memory.title}?` : "I don't have enough saved memories to start a personalized reminiscence session.";
  const speak = () => { if (memory && "speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${prompt} ${memory.description}`)); };
  return <div className="mx-auto max-w-[820px]"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="eyebrow mb-2 text-[#8068a7]">Gentle conversation mode</div><h1 className="display-font text-[38px] font-bold tracking-[-.04em] text-[#23463a]">AI Reminiscence</h1><p className="mt-2 text-[14px] text-[#73847a]">Let's revisit a special memory, using only memories you have saved.</p></div><button onClick={() => onNavigate("dashboard")} className="flex w-fit items-center gap-2 rounded-xl border border-[#dfe8e1] bg-white px-4 py-2.5 text-[12px] font-bold text-[#5f7568] shadow-sm transition hover:bg-[#eef6ef] hover:text-[#2c6e5b]" aria-label="Exit AI Reminiscence and return home"><X size={15} /> Exit</button></div><section className="dark-card grid-pattern relative overflow-hidden p-7 sm:p-10"><div className="relative z-10"><div className="mb-7 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#c5addd]"><Sparkles size={15} /> MindMitra reminiscence</div>{memory ? <><div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-[#d8c7e5]"><HeartPulse size={13} /> {memory.category}</div><h2 className="display-font max-w-[560px] text-[34px] leading-tight text-white">{prompt}</h2><p className="mt-5 max-w-[560px] text-[15px] leading-relaxed text-[#c6d8ca]">{memory.description}</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={speak} className="flex items-center gap-2 rounded-xl bg-[#f7f1fb] px-4 py-3 text-[12px] font-bold text-[#6e5791]"><Volume2 size={16} /> Read aloud</button><button onClick={() => setIndex((value) => value + 1)} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-[12px] font-bold text-white"><ArrowRight size={16} /> Next memory</button></div></> : <><h2 className="display-font text-[31px] text-white">I don't have enough saved memories yet.</h2><button onClick={() => onNavigate("memorybank")} className="mt-6 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-[#2c6e5b]">Add a memory</button></>}</div></section><div className="mt-5 rounded-[18px] border border-[#e3d9ed] bg-[#f8f4fb] p-5 text-[12px] leading-relaxed text-[#756783]"><strong>Memory safety:</strong> MindMitra never invents personal memories. This prompt is based only on information saved in your Personal Memory Bank or Family Memory Vault.</div></div>;
}

function VoicePage({ onNavigate, memories, setMemories }: { onNavigate: (page: Page) => void; memories: Array<SavedMemory | FamilyMemory>; setMemories: React.Dispatch<React.SetStateAction<SavedMemory[]>> }) {
  type VoiceLanguage = "en-IN" | "hi-IN" | "te-IN";
  const languages: Array<{ code: VoiceLanguage; label: string; native: string; prompt: string }> = [
    { code: "en-IN", label: "English", native: "English", prompt: "Speak your memory or reminder" },
    { code: "hi-IN", label: "Hindi", native: "हिन्दी", prompt: "अपनी याद या रिमाइंडर बोलें" },
    { code: "te-IN", label: "Telugu", native: "తెలుగు", prompt: "మీ జ్ఞాపకం లేదా రిమైండర్ చెప్పండి" },
  ];
  const [language, setLanguage] = useState<VoiceLanguage>(() => (window.localStorage.getItem("mindmateVoiceSettings") || "en-IN") as VoiceLanguage);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [supported, setSupported] = useState(true);
  const [savedMemory, setSavedMemory] = useState<SavedMemory | null>(null);
  const [status, setStatus] = useState("");
  const selected = languages.find((item) => item.code === language) || languages[0];
  const speak = (message: string) => { if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(message); utterance.lang = language; window.speechSynthesis.speak(utterance); };
  const detectLanguage = (text: string): VoiceLanguage => { if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN"; if (/[\u0900-\u097F]/.test(text)) return "hi-IN"; return language; };
  const understandMemory = (text: string, detected: VoiceLanguage): SavedMemory => {
    const lower = text.toLowerCase();
    const isReminder = detected === "en-IN" ? /(remind|remember|appointment|medicine|call|buy|meet)/.test(lower) : /(?:याद|दवा|कॉल|मिलना|अपॉइंटमेंट|रिमाइंडर|గుర్తు|మందు|కాల్|కలవాలి|రిమైండర్)/.test(text);
    const category = isReminder ? "Important" : /(family|परिवार|కుటుంబ)/i.test(text) ? "Family" : "Personal Memory";
    const dateMatch = text.match(/(?:on|at|date|दिन|तारीख|తేదీ)\s+([^,.]+)/i);
    const date = dateMatch?.[1]?.trim() || new Date().toISOString().slice(0, 10);
    const title = isReminder ? (detected === "hi-IN" ? "बोलकर बनाया रिमाइंडर" : detected === "te-IN" ? "వాయిస్ రిమైండర్" : "Voice reminder") : (detected === "hi-IN" ? "मेरी आवाज़ की याद" : detected === "te-IN" ? "నా వాయిస్ జ్ఞాపకం" : "Voice memory");
    return { id: makeId("voice-memory"), title, description: text.trim(), category, date, pinned: false, createdAt: new Date().toISOString() };
  };
  const saveVoiceMemory = (text: string) => { const detected = detectLanguage(text); const item = understandMemory(text, detected); setMemories((current) => [item, ...current]); setSavedMemory(item); const confirmation = detected === "hi-IN" ? `ठीक है। मैंने आपकी याद सेव कर ली है। ${item.description}` : detected === "te-IN" ? `సరే. మీ జ్ఞాపకాన్ని సేవ్ చేశాను. ${item.description}` : `Okay. I saved your memory. ${item.description}`; setStatus(confirmation); speak(confirmation); };
  const startListening = () => { const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!SpeechRecognition) { setSupported(false); return; } setHeard(""); setSavedMemory(null); setStatus(""); const recognition = new SpeechRecognition(); recognition.lang = language; recognition.interimResults = false; recognition.continuous = false; recognition.onstart = () => setListening(true); recognition.onerror = () => { setListening(false); setStatus(language === "hi-IN" ? "कृपया फिर से बोलें।" : language === "te-IN" ? "దయచేసి మళ్లీ చెప్పండి." : "Please try again."); }; recognition.onend = () => setListening(false); recognition.onresult = (event: any) => { const text = Array.from(event.results).map((result: any) => result[0].transcript).join(""); setHeard(text); saveVoiceMemory(text); }; recognition.start(); };
  const readMemories = () => { const message = memories.length ? memories.slice(0, 4).map((memory) => `${memory.title}. ${memory.description}`).join(". ") : (language === "hi-IN" ? "अभी कोई याद सेव नहीं है।" : language === "te-IN" ? "ఇంకా జ్ఞాపకాలు సేవ్ కాలేదు." : "You have no saved memories yet."); speak(message); };
  const changeLanguage = (code: VoiceLanguage) => { setLanguage(code); window.localStorage.setItem("mindmateVoiceSettings", code); setHeard(""); setStatus(""); setSavedMemory(null); };
  return <div className="mx-auto max-w-[900px]"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="eyebrow mb-2 text-[#d4873d]">Voice memory assistant</div><h1 className="display-font text-[38px] font-bold tracking-[-.04em] text-[#23463a]">Speak, and I’ll remember.</h1><p className="mt-2 max-w-[620px] text-[15px] leading-relaxed text-[#73847a]">Choose your language, tap the large microphone, and speak naturally. No typing needed.</p></div><button onClick={() => onNavigate("dashboard")} className="flex w-fit items-center gap-2 rounded-xl border border-[#dfe8e1] bg-white px-4 py-3 text-[13px] font-bold text-[#5f7568] shadow-sm hover:bg-[#eef6ef]"><X size={16} /> Exit</button></div><section className="soft-card p-5 sm:p-8"><div className="mb-6"><div className="mb-3 text-left text-[15px] font-bold text-[#405c4d]">1. Choose your language</div><div className="grid gap-3 sm:grid-cols-3">{languages.map((item) => <button key={item.code} onClick={() => changeLanguage(item.code)} className={`min-h-[74px] rounded-[16px] border-2 px-4 py-3 text-left transition ${language === item.code ? "border-[#2c6e5b] bg-[#e5f2e8] text-[#2c6e5b]" : "border-[#e2ebe3] bg-white text-[#718278] hover:border-[#b8d5bf]"}`}><div className="text-[16px] font-bold">{item.native}</div><div className="mt-1 text-[12px] font-semibold">{item.label}</div></button>)}</div></div><div className="border-t border-[#e7eee8] pt-7 text-center"><div className="mb-3 text-left text-[15px] font-bold text-[#405c4d]">2. Tap and speak</div><button onClick={startListening} className={`mx-auto grid h-44 w-44 place-items-center rounded-full border-[12px] transition active:scale-95 ${listening ? "border-[#f4bf83] bg-[#d17731] text-white shadow-[0_0_0_18px_rgba(212,135,61,.16)]" : "border-[#cfe7d4] bg-[#2c6e5b] text-white shadow-[0_12px_30px_rgba(44,110,91,.22)] hover:bg-[#245d4d]"}`} aria-label={`Tap microphone to speak in ${selected.label}`}><span className="flex flex-col items-center gap-2"><Mic size={54} strokeWidth={2.3} /><span className="text-[14px] font-bold">{listening ? "Listening" : "Tap to speak"}</span></span></button><p className="mt-5 text-[18px] font-bold text-[#405c4d]">{listening ? (language === "hi-IN" ? "सुन रहा हूँ..." : language === "te-IN" ? "వింటున్నాను..." : "I’m listening...") : selected.prompt}</p><p className="mt-2 text-[13px] text-[#87968c]">Try: “Remind me to call my daughter tomorrow.”</p></div>{heard && <div className="mt-7 rounded-[18px] border border-[#dfeae1] bg-[#f7fbf7] p-5 text-left"><div className="eyebrow mb-2 text-[#8a9c90]">I heard</div><p className="text-[17px] font-semibold leading-relaxed text-[#486253]">“{heard}”</p></div>}{savedMemory && <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-[#b9ddc1] bg-[#e8f6eb] p-5 text-left"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#2c6e5b] text-white"><Check size={22} /></div><div><div className="text-[15px] font-bold text-[#2c6e5b]">Saved to your memories</div><div className="mt-1 text-[13px] leading-relaxed text-[#5d7566]">{savedMemory.description}</div><div className="mt-2 text-[11px] font-bold text-[#71907a]">{savedMemory.category} · {makeSafeDate(savedMemory.date)}</div></div></div>}{status && !savedMemory && <div className="mt-4 rounded-[16px] bg-[#fff6e8] p-4 text-[14px] font-semibold text-[#8b6d42]">{status}</div>}{!supported && <div className="mt-5 rounded-[16px] bg-[#fff4e5] p-4 text-[13px] leading-relaxed text-[#8e6f40]">Voice recognition is not supported in this browser. Try Chrome or Edge on a device with a microphone.</div>}<div className="mt-8 grid gap-3 sm:grid-cols-3"><VoiceAction icon={<Volume2 size={22} />} title="Read my memories" onClick={readMemories} /><VoiceAction icon={<NotebookPen size={22} />} title="Open memory bank" onClick={() => onNavigate("memorybank")} /><VoiceAction icon={<Sparkles size={22} />} title="Tell me a memory" onClick={() => onNavigate("reminiscence")} /></div></section><div className="mt-5 rounded-[18px] border border-[#e5dfcf] bg-[#fff9ef] p-5 text-[13px] leading-relaxed text-[#806b4c]"><strong>Simple and private:</strong> Your voice is converted to text by your browser. MindMitra saves only the memory text and date to this device. Spoken confirmations use the same language you selected.</div></div>;
}

function VoiceAction({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) { return <button onClick={onClick} className="flex min-h-[68px] items-center gap-3 rounded-[15px] border-2 border-[#e4ece5] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#b8d5bf] hover:shadow-sm"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef5ef] text-[#2c6e5b]">{icon}</div><span className="text-[14px] font-bold text-[#557061]">{title}</span></button>; }
