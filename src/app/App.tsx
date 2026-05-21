import { useState } from "react";
import {
  Upload,
  Briefcase,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Star,
  TrendingUp,
  Award,
  Clock,
  MapPin,
  DollarSign,
  ArrowRight,
  Zap,
  Target,
  BarChart2,
  User,
  Globe,
  Plus,
  X,
  ExternalLink,
  Menu,
} from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, Cell } from "recharts";

type Stage =
  | "landing"
  | "register"
  | "profile"
  | "resume"
  | "matches"
  | "skills"
  | "training"
  | "apply"
  | "tracking";

const STAGES: { id: Stage; label: string; icon: React.ReactNode }[] = [
  { id: "landing", label: "Discover", icon: <Zap size={16} /> },
  { id: "register", label: "Register", icon: <User size={16} /> },
  { id: "profile", label: "Profile", icon: <Target size={16} /> },
  { id: "resume", label: "Resume", icon: <Upload size={16} /> },
  { id: "matches", label: "Matches", icon: <Briefcase size={16} /> },
  { id: "skills", label: "Skills", icon: <BarChart2 size={16} /> },
  { id: "training", label: "Training", icon: <BookOpen size={16} /> },
  { id: "apply", label: "Apply", icon: <CheckCircle size={16} /> },
  { id: "tracking", label: "Track", icon: <TrendingUp size={16} /> },
];

const STAGE_ORDER: Stage[] = [
  "landing", "register", "profile", "resume", "matches",
  "skills", "training", "apply", "tracking",
];

const jobMatches = [
  {
    id: 1, title: "Senior Frontend Engineer", company: "Stripe",
    location: "Remote", salary: "$140k–$175k", score: 91,
    tags: ["React", "TypeScript", "GraphQL"], logo: "S", logoColor: "#635BFF",
    reasons: ["React (5 yrs)", "TypeScript", "Firebase"], applied: false,
  },
  {
    id: 2, title: "Full-Stack Developer", company: "Linear",
    location: "San Francisco", salary: "$120k–$155k", score: 78,
    tags: ["React", "Node.js", "PostgreSQL"], logo: "L", logoColor: "#5E6AD2",
    reasons: ["React", "SQL experience", "REST APIs"], applied: false,
  },
  {
    id: 3, title: "Product Engineer", company: "Vercel",
    location: "Remote", salary: "$130k–$165k", score: 74,
    tags: ["Next.js", "React", "Edge"], logo: "V", logoColor: "#ffffff",
    reasons: ["React expertise", "TypeScript", "CI/CD"], applied: true,
  },
];

const skillGaps = [
  { skill: "GraphQL", impact: 18, hours: "~12 hrs", difficulty: "Medium" },
  { skill: "PostgreSQL", impact: 15, hours: "~8 hrs", difficulty: "Easy" },
  { skill: "Docker", impact: 12, hours: "~10 hrs", difficulty: "Medium" },
  { skill: "System Design", impact: 20, hours: "~20 hrs", difficulty: "Hard" },
];

const currentSkills = [
  { name: "React", level: 95 }, { name: "TypeScript", level: 88 },
  { name: "Firebase", level: 80 }, { name: "Node.js", level: 72 },
  { name: "SQL", level: 60 }, { name: "CSS/Tailwind", level: 90 },
];

const courses = [
  {
    id: 1, title: "GraphQL: From Zero to Production", provider: "Frontend Masters",
    duration: "12 hrs", rating: 4.9, price: "Free with sub",
    badge: "Top Pick", badgeColor: "text-indigo-400 bg-indigo-400/10",
    matchBoost: "+18% match", skills: ["GraphQL", "Apollo Client"],
  },
  {
    id: 2, title: "PostgreSQL for Developers", provider: "Udemy",
    duration: "8 hrs", rating: 4.7, price: "$16.99",
    badge: "Quick Win", badgeColor: "text-emerald-400 bg-emerald-400/10",
    matchBoost: "+15% match", skills: ["PostgreSQL", "SQL"],
  },
  {
    id: 3, title: "System Design Fundamentals", provider: "Educative",
    duration: "20 hrs", rating: 4.8, price: "$29/mo",
    badge: "High Impact", badgeColor: "text-amber-400 bg-amber-400/10",
    matchBoost: "+20% match", skills: ["Architecture", "Scalability"],
  },
];

const mentors = [
  {
    id: 1, name: "Priya Nair", role: "Staff Engineer @ Airbnb",
    skills: ["GraphQL", "System Design"], rate: "$120/hr",
    rating: 4.95, sessions: 142, avatar: "PN", avatarColor: "#6366f1",
  },
  {
    id: 2, name: "Marcus Chen", role: "Eng Manager @ Shopify",
    skills: ["PostgreSQL", "Backend"], rate: "$95/hr",
    rating: 4.88, sessions: 89, avatar: "MC", avatarColor: "#10b981",
  },
];

const applications = [
  {
    id: 1, title: "Product Engineer", company: "Vercel",
    appliedDate: "May 14, 2026", status: "Interview",
    statusColor: "text-indigo-400 bg-indigo-400/10",
    updates: [
      { label: "Applied", done: true, date: "May 14" },
      { label: "Reviewed", done: true, date: "May 16" },
      { label: "Shortlisted", done: true, date: "May 18" },
      { label: "Interview", done: true, date: "May 21" },
      { label: "Offer", done: false, date: "" },
    ],
  },
  {
    id: 2, title: "Sr. Frontend Eng.", company: "Stripe",
    appliedDate: "May 19, 2026", status: "Reviewed",
    statusColor: "text-amber-400 bg-amber-400/10",
    updates: [
      { label: "Applied", done: true, date: "May 19" },
      { label: "Reviewed", done: true, date: "May 21" },
      { label: "Shortlisted", done: false, date: "" },
      { label: "Interview", done: false, date: "" },
      { label: "Offer", done: false, date: "" },
    ],
  },
  {
    id: 3, title: "Full-Stack Dev", company: "Linear",
    appliedDate: "May 20, 2026", status: "Applied",
    statusColor: "text-sky-400 bg-sky-400/10",
    updates: [
      { label: "Applied", done: true, date: "May 20" },
      { label: "Reviewed", done: false, date: "" },
      { label: "Shortlisted", done: false, date: "" },
      { label: "Interview", done: false, date: "" },
      { label: "Offer", done: false, date: "" },
    ],
  },
];

// ── Shared sub-components ─────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const data = [{ value: score }, { value: 100 - score }];
  const color = score >= 85 ? "#6366f1" : score >= 70 ? "#10b981" : "#f59e0b";
  return (
    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
      <ResponsiveContainer width={56} height={56}>
        <RadialBarChart cx="50%" cy="50%" innerRadius={18} outerRadius={26}
          startAngle={90} endAngle={-270} data={data} barSize={5}>
          <RadialBar dataKey="value" cornerRadius={5} background={{ fill: "rgba(255,255,255,0.06)" }}>
            <Cell fill={color} />
            <Cell fill="transparent" />
          </RadialBar>
        </RadialBarChart>
      </ResponsiveContainer>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-medium" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

function SkillBar({ name, level }: { name: string; level: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground font-mono w-20 shrink-0">{name}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${level}%`, background: "linear-gradient(90deg,#6366f1,#818cf8)" }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">{level}%</span>
    </div>
  );
}

function StageProgress({ current }: { current: Stage }) {
  const idx = STAGE_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-1 mb-6">
      {STAGE_ORDER.map((s, i) => (
        <div key={s} className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${i <= idx ? "bg-primary" : "bg-white/10"}`} />
      ))}
    </div>
  );
}

// ── Stages ────────────────────────────────────────────────────────────────────

function LandingStage({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-xs font-mono text-primary mb-6 w-fit">
        <Zap size={11} /> AI-Powered Career Platform
      </div>
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>
        Find jobs, close skill gaps,{" "}
        <span className="text-primary">accelerate</span> your career.
      </h1>
      <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
        Upload your resume. Our AI extracts your skills, matches you to the best jobs, and shows you exactly what to learn — with courses and mentors tailored to your goals.
      </p>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-10">
        <button onClick={onNext} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto justify-center">
          Get Started <ArrowRight size={16} />
        </button>
        <button className="text-muted-foreground text-sm hover:text-foreground transition-colors">
          See how it works →
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Briefcase size={16} />, stat: "12,400+", label: "Active Jobs" },
          { icon: <Award size={16} />, stat: "3,200+", label: "Expert Mentors" },
          { icon: <Target size={16} />, stat: "94%", label: "Match Accuracy" },
        ].map((item) => (
          <div key={item.label} className="bg-card border border-border rounded-xl p-3 sm:p-4">
            <div className="text-primary mb-2">{item.icon}</div>
            <div className="text-lg sm:text-xl font-bold font-mono">{item.stat}</div>
            <div className="text-[11px] sm:text-xs text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegisterStage({ onNext }: { onNext: () => void }) {
  const [role, setRole] = useState<"applicant" | "employer" | null>(null);
  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
        Create your account
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">Join 48,000+ professionals already on the platform.</p>

      <button className="w-full flex items-center justify-center gap-3 py-3 border border-border rounded-lg bg-secondary hover:bg-secondary/80 transition-colors mb-4 text-sm font-medium">
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-mono">OR</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="space-y-3 mb-5">
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="First name" className="px-3 py-2.5 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 transition-colors" />
          <input placeholder="Last name" className="px-3 py-2.5 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 transition-colors" />
        </div>
        <input placeholder="Email address" type="email" className="w-full px-3 py-2.5 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 transition-colors" />
        <input placeholder="Password" type="password" className="w-full px-3 py-2.5 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 transition-colors" />
      </div>

      <p className="text-sm text-muted-foreground mb-3">I am joining as a:</p>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {(["applicant", "employer"] as const).map((r) => (
          <button key={r} onClick={() => setRole(r)}
            className={`py-3 border rounded-lg text-sm font-medium capitalize transition-all ${role === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
            {r === "applicant" ? "👤 Job Seeker" : "🏢 Employer"}
          </button>
        ))}
      </div>

      <button onClick={onNext} disabled={!role}
        className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        Create Account
      </button>
    </div>
  );
}

function ProfileStage({ onNext }: { onNext: () => void }) {
  const [skills, setSkills] = useState(["React", "TypeScript", "Firebase", "Node.js"]);
  const [input, setInput] = useState("");
  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
        Build your profile
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">Tell us about yourself so we can personalise your matches.</p>

      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-lg sm:text-xl font-bold text-primary shrink-0">
            AK
          </div>
          <div>
            <p className="font-medium text-sm">Aarav Kumar</p>
            <p className="text-xs text-muted-foreground">aarav.kumar@gmail.com</p>
            <button className="text-xs text-primary mt-1 hover:underline">Upload photo</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: <Briefcase size={14} />, label: "JOB TITLE", value: "Frontend Engineer" },
            { icon: <MapPin size={14} />, label: "LOCATION", value: "Austin, TX" },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-xs text-muted-foreground font-mono mb-1.5 block">{f.label}</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-input-background border border-border rounded-lg">
                <span className="text-muted-foreground shrink-0">{f.icon}</span>
                <input defaultValue={f.value} className="bg-transparent text-sm flex-1 focus:outline-none min-w-0" />
              </div>
            </div>
          ))}
        </div>

        {[
          { icon: <User size={14} />, label: "EMAIL", value: "aarav.kumar@gmail.com" },
          { icon: <Globe size={14} />, label: "PORTFOLIO", value: "aaravkumar.dev" },
        ].map((f) => (
          <div key={f.label}>
            <label className="text-xs text-muted-foreground font-mono mb-1.5 block">{f.label}</label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-input-background border border-border rounded-lg">
              <span className="text-muted-foreground shrink-0">{f.icon}</span>
              <input defaultValue={f.value} className="bg-transparent text-sm flex-1 focus:outline-none min-w-0" />
            </div>
          </div>
        ))}

        <div>
          <label className="text-xs text-muted-foreground font-mono mb-1.5 block">SKILLS</label>
          <div className="min-h-12 flex flex-wrap gap-2 p-3 bg-input-background border border-border rounded-lg">
            {skills.map((s) => (
              <span key={s} className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 text-primary rounded-full text-xs font-mono">
                {s}
                <button onClick={() => setSkills(skills.filter((x) => x !== s))}><X size={10} /></button>
              </span>
            ))}
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { setSkills([...skills, input.trim()]); setInput(""); } }}
              placeholder="Add skill…" className="bg-transparent text-xs focus:outline-none flex-1 min-w-16 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Press Enter to add</p>
        </div>
      </div>

      <button onClick={onNext} className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
        Save Profile <ChevronRight size={16} />
      </button>
    </div>
  );
}

function ResumeStage({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<"upload" | "parsing" | "review">("upload");
  const [progress, setProgress] = useState(0);

  function startParse() {
    setPhase("parsing");
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18 + 5;
      if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => setPhase("review"), 400); }
      setProgress(Math.min(p, 100));
    }, 200);
  }

  const extractedSkills = ["React", "TypeScript", "Firebase", "Node.js", "REST APIs", "Git", "CSS", "Jest"];
  const extractedExp = [
    { title: "Frontend Engineer", company: "Growlytics", period: "2022–Present", yrs: "3 yrs" },
    { title: "Junior Developer", company: "ByteStack", period: "2020–2022", yrs: "2 yrs" },
  ];

  if (phase === "upload") return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Upload your resume</h2>
      <p className="text-muted-foreground mb-6 text-sm">Our AI will extract your skills and experience automatically.</p>
      <div onClick={startParse} className="border-2 border-dashed border-primary/30 rounded-2xl p-8 sm:p-12 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all group">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
          <Upload size={22} className="text-primary" />
        </div>
        <p className="font-medium mb-1 text-sm sm:text-base">Drop your CV here</p>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4">PDF, DOCX, or TXT — up to 5 MB</p>
        <span className="text-xs font-mono text-primary border border-primary/30 px-3 py-1.5 rounded-full">Browse files</span>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">OR PASTE LINKEDIN URL</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="flex gap-2 mt-4">
        <input placeholder="https://linkedin.com/in/aarav-kumar" className="flex-1 px-3 py-2.5 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 min-w-0" />
        <button onClick={startParse} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">Import</button>
      </div>
    </div>
  );

  if (phase === "parsing") return (
    <div className="max-w-md mx-auto text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
        <Zap size={28} className="text-primary animate-pulse" />
      </div>
      <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Analysing your resume…</h2>
      <p className="text-muted-foreground mb-8 text-sm">Extracting skills, experience, and education</p>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-primary rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs font-mono text-muted-foreground">{Math.round(progress)}% complete</p>
      <div className="mt-6 space-y-2 text-left">
        {[
          { label: "Parsing document structure", done: progress > 20 },
          { label: "Identifying skills & technologies", done: progress > 50 },
          { label: "Extracting work history", done: progress > 75 },
          { label: "Building your profile", done: progress >= 100 },
        ].map((step) => (
          <div key={step.label} className={`flex items-center gap-2 text-xs transition-all ${step.done ? "text-foreground" : "text-muted-foreground/40"}`}>
            <CheckCircle size={12} className={step.done ? "text-primary" : "text-muted-foreground/20"} />
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle size={16} className="text-emerald-400" />
        <span className="text-xs font-mono text-emerald-400">EXTRACTION COMPLETE</span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Review extracted data</h2>
      <p className="text-muted-foreground mb-6 text-sm">Confirm or edit what our AI found in your resume.</p>
      <div className="space-y-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-muted-foreground">EXTRACTED SKILLS</span>
            <button className="text-xs text-primary hover:underline">Edit</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {extractedSkills.map((s) => (
              <span key={s} className="px-2.5 py-1 bg-primary/15 text-primary rounded-full text-xs font-mono">{s}</span>
            ))}
            <button className="px-2.5 py-1 border border-dashed border-border rounded-full text-xs text-muted-foreground hover:border-primary/40 flex items-center gap-1">
              <Plus size={10} /> Add
            </button>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-muted-foreground">WORK EXPERIENCE</span>
            <button className="text-xs text-primary hover:underline">Edit</button>
          </div>
          <div className="space-y-3">
            {extractedExp.map((e) => (
              <div key={e.title} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.company} · {e.period}</p>
                </div>
                <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded shrink-0">{e.yrs}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <button onClick={onNext} className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
        Confirm & Find Matches <ArrowRight size={16} />
      </button>
    </div>
  );
}

function MatchesStage({ onNext }: { onNext: () => void }) {
  const [saved, setSaved] = useState<number[]>([]);
  return (
    <div>
      <div className="flex items-start justify-between mb-2 gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>AI job matches</h2>
          <p className="text-muted-foreground mt-1 text-sm">Matched to your skills and goals.</p>
        </div>
        <span className="font-mono text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full shrink-0">{jobMatches.length} results</span>
      </div>
      <div className="mt-5 space-y-4">
        {jobMatches.map((job) => (
          <div key={job.id} className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: `${job.logoColor}20`, color: job.logoColor }}>
                {job.logo}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                      <span>{job.company}</span>
                      <span className="flex items-center gap-0.5"><MapPin size={10} />{job.location}</span>
                      <span className="flex items-center gap-0.5 hidden sm:flex"><DollarSign size={10} />{job.salary}</span>
                    </div>
                  </div>
                  <ScoreRing score={job.score} />
                </div>
                <p className="text-xs text-muted-foreground sm:hidden mt-0.5 flex items-center gap-0.5">
                  <DollarSign size={10} />{job.salary}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {job.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-secondary text-xs font-mono text-muted-foreground rounded">{t}</span>
                  ))}
                </div>
                <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Zap size={11} className="text-primary mt-0.5 shrink-0" />
                  <span>Matched because of <span className="text-foreground">{job.reasons.join(", ")}</span></span>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <button onClick={onNext} className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
                    View & Apply
                  </button>
                  <button onClick={() => setSaved(saved.includes(job.id) ? saved.filter((x) => x !== job.id) : [...saved, job.id])}
                    className={`px-4 py-1.5 border rounded-lg text-xs font-medium transition-colors ${saved.includes(job.id) ? "border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                    {saved.includes(job.id) ? "Saved" : "Save"}
                  </button>
                  <button className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillsStage({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Your skill gaps</h2>
      <p className="text-muted-foreground mb-6 text-sm">Learn these skills to unlock higher-matched jobs.</p>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <p className="text-xs font-mono text-muted-foreground mb-3">CURRENT STRENGTHS</p>
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-3">
            {currentSkills.map((s) => <SkillBar key={s.name} {...s} />)}
          </div>
        </div>
        <div>
          <p className="text-xs font-mono text-muted-foreground mb-3">GAPS TO CLOSE</p>
          <div className="space-y-3">
            {skillGaps.map((g) => (
              <div key={g.skill} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{g.skill}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${g.difficulty === "Easy" ? "text-emerald-400 bg-emerald-400/10" : g.difficulty === "Medium" ? "text-amber-400 bg-amber-400/10" : "text-rose-400 bg-rose-400/10"}`}>
                    {g.difficulty}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock size={10} />{g.hours} to learn</span>
                  <span className="flex items-center gap-1 text-primary font-mono"><TrendingUp size={10} />+{g.impact}% match boost</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-xl">
            <p className="text-sm font-medium text-primary mb-1">💡 Quick win</p>
            <p className="text-xs text-muted-foreground">
              Learn <strong className="text-foreground">PostgreSQL</strong> in ~8 hours and boost your average match score by{" "}
              <strong className="text-primary">15%</strong>.
            </p>
          </div>
        </div>
      </div>
      <button onClick={onNext} className="mt-5 w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
        View Recommended Training <ArrowRight size={16} />
      </button>
    </div>
  );
}

function TrainingStage({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Recommended for you</h2>
      <p className="text-muted-foreground mb-6 text-sm">Top 3 courses and 2 mentors based on your skill gaps.</p>

      <p className="text-xs font-mono text-muted-foreground mb-3">COURSES</p>
      <div className="space-y-3 mb-7">
        {courses.map((c) => (
          <div key={c.id} className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${c.badgeColor}`}>{c.badge}</span>
                  <span className="text-xs font-mono text-primary">{c.matchBoost}</span>
                </div>
                <h3 className="font-semibold text-sm leading-snug">{c.title}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                  <span>{c.provider}</span>
                  <span className="flex items-center gap-1"><Clock size={10} />{c.duration}</span>
                  <span className="flex items-center gap-1"><Star size={10} className="text-amber-400" />{c.rating}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono text-muted-foreground">{c.price}</p>
                <button className="mt-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">Enroll</button>
              </div>
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {c.skills.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-secondary text-xs font-mono text-muted-foreground rounded">{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs font-mono text-muted-foreground mb-3">MENTORS</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
        {mentors.map((m) => (
          <div key={m.id} className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: `${m.avatarColor}25`, color: m.avatarColor }}>
                {m.avatar}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.role}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {m.skills.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-secondary text-xs font-mono text-muted-foreground rounded">{s}</span>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1"><Star size={10} className="text-amber-400" />{m.rating} · {m.sessions} sessions</span>
              <span className="font-mono text-foreground">{m.rate}</span>
            </div>
            <button onClick={onNext} className="w-full py-2 border border-primary/30 text-primary rounded-lg text-xs font-medium hover:bg-primary/10 transition-colors">
              Book Session
            </button>
          </div>
        ))}
      </div>

      <button onClick={onNext} className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
        Continue to Apply <ArrowRight size={16} />
      </button>
    </div>
  );
}

function ApplyStage({ onNext }: { onNext: () => void }) {
  const job = jobMatches[0];
  const [applied, setApplied] = useState(false);
  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Apply in one click</h2>
      <p className="text-muted-foreground mb-6 text-sm">Your profile data fills the form automatically.</p>
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-sm font-bold bg-[#635BFF]/20 text-[#635BFF] shrink-0">S</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{job.title}</p>
            <p className="text-xs text-muted-foreground">{job.company} · {job.location}</p>
            <p className="text-xs text-muted-foreground">{job.salary}</p>
          </div>
          <ScoreRing score={job.score} />
        </div>
        <div className="space-y-2 text-sm">
          {[
            { label: "Full Name", value: "Aarav Kumar" },
            { label: "Email", value: "aarav.kumar@gmail.com" },
            { label: "Phone", value: "+1 512-843-9021" },
            { label: "Portfolio", value: "aaravkumar.dev" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3 px-3 py-2 sm:py-2.5 bg-secondary/50 rounded-lg">
              <span className="text-xs font-mono text-muted-foreground w-16 sm:w-20 shrink-0">{f.label}</span>
              <span className="text-sm text-foreground truncate">{f.value}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 px-3 py-2 sm:py-2.5 bg-secondary/50 rounded-lg">
            <span className="text-xs font-mono text-muted-foreground w-16 sm:w-20 shrink-0">Resume</span>
            <span className="text-sm text-foreground flex items-center gap-1.5 truncate">
              <CheckCircle size={13} className="text-emerald-400 shrink-0" />
              Aarav_Kumar_Resume.pdf
            </span>
          </div>
        </div>
      </div>
      {!applied ? (
        <button onClick={() => { setApplied(true); setTimeout(onNext, 1200); }}
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
          <Zap size={16} /> One-Click Apply
        </button>
      ) : (
        <div className="w-full py-3.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl font-semibold text-emerald-400 flex items-center justify-center gap-2">
          <CheckCircle size={16} /> Application Submitted!
        </div>
      )}
      <p className="text-xs text-center text-muted-foreground mt-3">Your profile data pre-fills all fields. Review before submitting.</p>
    </div>
  );
}

function TrackingStage() {
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Application tracker</h2>
      <p className="text-muted-foreground mb-6 text-sm">Stay on top of every application — no more ghosting.</p>
      <div className="space-y-4">
        {applications.map((app) => (
          <div key={app.id} className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-all">
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <h3 className="font-semibold text-sm">{app.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{app.company} · Applied {app.appliedDate}</p>
              </div>
              <span className={`text-xs font-mono px-2.5 py-1 rounded-full shrink-0 ${app.statusColor}`}>{app.status}</span>
            </div>
            {/* Pipeline — scrollable on very small screens */}
            <div className="overflow-x-auto -mx-1 px-1">
              <div className="flex items-start min-w-[280px]">
                {app.updates.map((step, i) => (
                  <div key={step.label} className="flex items-center flex-1">
                    <div className="flex flex-col items-center min-w-[40px]">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${step.done ? "bg-primary" : "bg-secondary border border-border"}`}>
                        {step.done && <CheckCircle size={11} className="text-white" />}
                      </div>
                      <span className={`text-[9px] sm:text-[10px] font-mono mt-1 text-center leading-tight ${step.done ? "text-foreground" : "text-muted-foreground/40"}`}>
                        {step.label}
                      </span>
                      {step.date && <span className="text-[8px] sm:text-[9px] text-muted-foreground font-mono">{step.date}</span>}
                    </div>
                    {i < app.updates.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-5 ${step.done && app.updates[i + 1].done ? "bg-primary" : "bg-white/5"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { label: "Total Applied", value: "3", color: "text-foreground" },
          { label: "In Progress", value: "2", color: "text-primary" },
          { label: "Interviews", value: "1", color: "text-emerald-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
            <div className={`text-xl sm:text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [stage, setStage] = useState<Stage>("landing");
  const [menuOpen, setMenuOpen] = useState(false);
  const currentIdx = STAGE_ORDER.indexOf(stage);

  function goNext() {
    if (currentIdx < STAGE_ORDER.length - 1) setStage(STAGE_ORDER[currentIdx + 1]);
  }
  function goTo(s: Stage, i: number) {
    if (i <= currentIdx) { setStage(s); setMenuOpen(false); }
  }

  function renderStage() {
    switch (stage) {
      case "landing":   return <LandingStage onNext={goNext} />;
      case "register":  return <RegisterStage onNext={goNext} />;
      case "profile":   return <ProfileStage onNext={goNext} />;
      case "resume":    return <ResumeStage onNext={goNext} />;
      case "matches":   return <MatchesStage onNext={goNext} />;
      case "skills":    return <SkillsStage onNext={goNext} />;
      case "training":  return <TrainingStage onNext={goNext} />;
      case "apply":     return <ApplyStage onNext={goNext} />;
      case "tracking":  return <TrackingStage />;
    }
  }

  const activeStage = STAGES.find((s) => s.id === stage)!;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-border flex-col py-6 px-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">CareerAI</span>
        </div>
        <nav className="space-y-0.5 flex-1">
          {STAGES.map((s, i) => {
            const isActive = s.id === stage;
            const isDone = i < currentIdx;
            return (
              <button key={s.id} onClick={() => goTo(s.id, i)} disabled={i > currentIdx}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${isActive ? "bg-primary/15 text-primary font-medium" : isDone ? "text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer" : "text-muted-foreground/30 cursor-not-allowed"}`}>
                <span className={isActive ? "text-primary" : isDone ? "text-muted-foreground" : "text-muted-foreground/30"}>
                  {isDone ? <CheckCircle size={14} /> : s.icon}
                </span>
                {s.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">AK</div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">Aarav Kumar</p>
              <p className="text-[10px] text-muted-foreground truncate">Job Seeker</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-background z-30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <Zap size={12} className="text-white" />
          </div>
          <span className="font-bold text-sm">CareerAI</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">{currentIdx + 1}/{STAGE_ORDER.length}</span>
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* ── Mobile slide-down menu ── */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-bold text-sm">Navigation</span>
            <button onClick={() => setMenuOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
              <X size={20} />
            </button>
          </div>
          <nav className="p-4 space-y-1 overflow-y-auto flex-1">
            {STAGES.map((s, i) => {
              const isActive = s.id === stage;
              const isDone = i < currentIdx;
              return (
                <button key={s.id} onClick={() => goTo(s.id, i)} disabled={i > currentIdx}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all text-left ${isActive ? "bg-primary/15 text-primary font-medium" : isDone ? "text-muted-foreground hover:text-foreground hover:bg-secondary/50" : "text-muted-foreground/30 cursor-not-allowed"}`}>
                  <span className={isActive ? "text-primary" : isDone ? "text-muted-foreground" : "text-muted-foreground/30"}>
                    {isDone ? <CheckCircle size={16} /> : s.icon}
                  </span>
                  {s.label}
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">AK</div>
              <div>
                <p className="text-sm font-medium">Aarav Kumar</p>
                <p className="text-xs text-muted-foreground">Job Seeker</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10 pb-10">
          <StageProgress current={stage} />
          {renderStage()}
        </div>
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="flex items-center">
          {/* Show a sliding window of 5 tabs centred on the active one */}
          {(() => {
            const half = 2;
            let start = Math.max(0, currentIdx - half);
            const end = Math.min(STAGES.length, start + 5);
            start = Math.max(0, end - 5);
            return STAGES.slice(start, end).map((s, localI) => {
              const globalI = start + localI;
              const isActive = s.id === stage;
              const isDone = globalI < currentIdx;
              return (
                <button key={s.id} onClick={() => goTo(s.id, globalI)} disabled={globalI > currentIdx}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all ${isActive ? "text-primary" : isDone ? "text-muted-foreground" : "text-muted-foreground/30"}`}>
                  <span>{isDone && !isActive ? <CheckCircle size={18} /> : s.icon}</span>
                  <span className="text-[9px] font-mono leading-none">{s.label}</span>
                </button>
              );
            });
          })()}
        </div>
        <div className="h-safe-area-inset-bottom" />
      </nav>
    </div>
  );
}
