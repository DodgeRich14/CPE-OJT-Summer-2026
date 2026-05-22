import { useState, useEffect, useRef } from "react";
import {
  Upload, Briefcase, BookOpen, CheckCircle, Star, TrendingUp, Award,
  Clock, MapPin, DollarSign, ArrowRight, Zap, Target, BarChart2,
  User, Globe, Plus, X, Menu, ChevronDown, ChevronRight,
  Flag, Layers, GraduationCap, CalendarDays, UserCircle,
  Users, BadgeCheck, ExternalLink, ShieldCheck, Brain,
  FlaskConical, PlayCircle, ClipboardList, Activity,
  BarChart, AlertCircle, Settings, Edit, Trash2, Eye,
  Ban, UserCheck, DollarSign as Revenue, FileText, TrendingDown,
  Moon, Sun, Heart, Search,
} from "lucide-react";
import { RadialBarChart, RadialBar, Cell } from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage =
  | "landing"
  | "applications"
  | "progress"
  | "roadmap"
  | "mentorship"
  | "certifications"
  | "admin";

type UserRole = "student" | "job-seeker" | "mentor" | "employer" | "admin";

type JobType = "ojt" | "internship" | "full-time" | "volunteer";

const STAGES: { id: Stage; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: "landing",        label: "Discover",       icon: <Zap size={15} /> },
  { id: "applications",   label: "Applications",   icon: <Briefcase size={15} /> },
  { id: "progress",       label: "Progress",       icon: <Activity size={15} /> },
  { id: "roadmap",        label: "Roadmap",        icon: <Flag size={15} /> },
  { id: "mentorship",     label: "Mentorship",     icon: <Users size={15} /> },
  { id: "certifications", label: "Certifications", icon: <BadgeCheck size={15} /> },
  { id: "admin",          label: "Admin Panel",    icon: <Settings size={15} />, adminOnly: true },
];

const STAGE_ORDER: Stage[] = [
  "landing", "applications", "progress", "roadmap", "mentorship", "certifications",
];

// ── Data ──────────────────────────────────────────────────────────────────────

const mySkills: Record<string, number> = {
  React: 95, TypeScript: 88, Firebase: 80, "Node.js": 72,
  SQL: 60, "CSS/Tailwind": 90, Git: 85, Jest: 70,
};

const jobListings = [
  {
    id: 1, title: "Sr. Frontend Engineer", company: "Stripe",
    location: "Remote", salary: "$140k–$175k", score: 91, type: "Full-time", jobType: "full-time" as JobType,
    logo: "S", logoColor: "#635BFF",
    posted: "2 days ago", applicants: 48,
    description: "Stripe is looking for a Senior Frontend Engineer to join our Payments team. You'll be building the interfaces that millions of businesses around the world use to run their payment operations. This is a high-impact role where your work ships to production constantly and reaches global scale immediately.",
    responsibilities: [
      "Architect and build complex, high-performance React applications for Stripe's core payments dashboard",
      "Collaborate closely with product and design to translate requirements into polished, accessible UIs",
      "Own frontend performance — loading times, rendering efficiency, and bundle optimization",
      "Mentor mid-level engineers and establish frontend best practices across the team",
      "Drive technical decisions on component architecture and state management patterns",
    ],
    requirements: [
      "5+ years of professional frontend engineering experience",
      "Deep expertise in React and TypeScript — you can reason about rendering behavior and performance",
      "Experience with GraphQL APIs and data-fetching patterns",
      "Strong understanding of browser internals, accessibility, and web standards",
      "Comfortable working in a fast-paced, globally distributed team",
    ],
    benefits: ["Equity package", "Fully remote", "Health, dental & vision", "401(k) match", "$2,000 home office stipend"],
    requiredSkills: [
      { name: "React",        required: 90 },
      { name: "TypeScript",   required: 85 },
      { name: "GraphQL",      required: 70 },
      { name: "PostgreSQL",   required: 60 },
      { name: "Node.js",      required: 75 },
      { name: "Docker",       required: 50 },
    ],
  },
  {
    id: 2, title: "Full-Stack Developer", company: "Linear",
    location: "San Francisco", salary: "$120k–$155k", score: 78, type: "Full-time", jobType: "full-time" as JobType,
    logo: "L", logoColor: "#5E6AD2",
    posted: "5 days ago", applicants: 31,
    description: "Linear is building the next-generation project management tool for high-performance software teams. As a Full-Stack Developer, you'll be part of the small, highly effective engineering team that keeps Linear fast, reliable, and continuously improving. You'll touch everything from database queries to React UI.",
    responsibilities: [
      "Build and maintain product features end-to-end across the React frontend and Node.js backend",
      "Design and optimize PostgreSQL schemas and queries for performance at scale",
      "Participate in architecture discussions and help shape how Linear evolves technically",
      "Write clean, well-tested code with an obsessive focus on quality and performance",
      "Work closely with the founders and product team to ship features users love",
    ],
    requirements: [
      "3+ years of full-stack development experience in a product environment",
      "Proficiency in React, TypeScript, and modern Node.js",
      "Strong PostgreSQL skills — schema design, query optimization, and migrations",
      "Experience with Docker and containerized deployments",
      "Passion for developer tooling and high-quality software",
    ],
    benefits: ["Competitive equity", "SF office + remote hybrid", "Top-tier health coverage", "Annual team offsites"],
    requiredSkills: [
      { name: "React",         required: 80 },
      { name: "TypeScript",    required: 75 },
      { name: "PostgreSQL",    required: 80 },
      { name: "Node.js",       required: 80 },
      { name: "System Design", required: 65 },
      { name: "Docker",        required: 60 },
    ],
  },
  {
    id: 3, title: "Product Engineer", company: "Vercel",
    location: "Remote", salary: "$130k–$165k", score: 74, type: "Full-time", jobType: "full-time" as JobType,
    logo: "V", logoColor: "#ffffff",
    posted: "1 week ago", applicants: 112,
    description: "Vercel is the platform for frontend developers, providing the speed and reliability innovators need to create at the moment of inspiration. As a Product Engineer, you'll work at the intersection of product and engineering — owning features from idea to launch, building the UI, APIs, and CI/CD integrations that make Vercel indispensable for frontend teams worldwide.",
    responsibilities: [
      "Own complete product features — from design review to backend API to polished frontend UI",
      "Contribute to Vercel's developer experience tooling, CLI, and dashboard",
      "Build with Next.js and ship to a platform used by millions of developers daily",
      "Collaborate with design and PMs to define what to build and how to ship it well",
      "Improve CI/CD pipelines, deployment tooling, and developer-facing integrations",
    ],
    requirements: [
      "Strong proficiency in React, TypeScript, and Node.js",
      "Experience building and consuming REST/GraphQL APIs",
      "Solid CSS and Tailwind skills — pixel-level attention to UI quality",
      "Familiarity with CI/CD, Git workflows, and modern deployment practices",
      "Bonus: prior experience with Next.js, edge functions, or serverless",
    ],
    benefits: ["Fully remote", "Equity", "Unlimited PTO", "Home office setup budget", "Annual retreat"],
    requiredSkills: [
      { name: "React",       required: 85 },
      { name: "TypeScript",  required: 80 },
      { name: "Node.js",     required: 70 },
      { name: "GraphQL",     required: 65 },
      { name: "CSS/Tailwind",required: 85 },
      { name: "CI/CD",       required: 60 },
    ],
  },
  {
    id: 4, title: "Frontend Engineer", company: "Notion",
    location: "NYC / Remote", salary: "$115k–$145k", score: 69, type: "Full-time", jobType: "full-time" as JobType,
    logo: "N", logoColor: "#e8e8e8",
    posted: "3 days ago", applicants: 76,
    description: "Notion is on a mission to make it possible for every person, team, and company to tailor their tools to their needs. As a Frontend Engineer, you'll help build the product that 30 million people use to think, write, and collaborate. You'll work on core product surfaces — the editor, databases, and sidebar — with an obsessive focus on performance and polish.",
    responsibilities: [
      "Build highly interactive, accessible UI components for Notion's core product surfaces",
      "Optimize rendering performance for Notion's rich-text editor and block-based architecture",
      "Implement pixel-perfect designs with meticulous attention to animation and detail",
      "Write robust frontend tests and maintain high code quality standards",
      "Partner with design to push the quality bar on UX and interaction design",
    ],
    requirements: [
      "3+ years of frontend engineering experience in a product company",
      "Expert-level React and TypeScript — deep understanding of rendering and performance",
      "Strong CSS skills with experience in complex layout systems",
      "Experience profiling and optimizing frontend performance at scale",
      "Interest in rich-text editing, collaborative tools, or real-time systems is a plus",
    ],
    benefits: ["Equity", "Hybrid NYC or remote", "Comprehensive health benefits", "Catered lunches (NYC)", "Learning budget"],
    requiredSkills: [
      { name: "React",        required: 85 },
      { name: "TypeScript",   required: 80 },
      { name: "CSS/Tailwind", required: 90 },
      { name: "GraphQL",      required: 55 },
      { name: "Performance",  required: 70 },
    ],
  },
  {
    id: 5, title: "Software Engineering Intern", company: "Meta",
    location: "Menlo Park, CA", salary: "$8k/month", score: 82, type: "Internship", jobType: "internship" as JobType,
    logo: "M", logoColor: "#0081FB",
    posted: "1 day ago", applicants: 203,
    description: "Meta is seeking talented software engineering interns to join our teams for Summer 2026. You'll work on real projects that impact billions of users, collaborating with experienced engineers across Facebook, Instagram, WhatsApp, or Reality Labs.",
    responsibilities: [
      "Contribute to production code for core Meta platforms or infrastructure",
      "Work alongside mentors and team members on meaningful engineering challenges",
      "Participate in code reviews and engineering discussions",
      "Learn Meta's development practices, tooling, and culture",
      "Present your project and learnings at the end of the internship",
    ],
    requirements: [
      "Currently pursuing a degree in Computer Science or related field",
      "Strong foundation in data structures and algorithms",
      "Proficiency in at least one programming language (Python, JavaScript, Java, C++)",
      "Basic understanding of web development or mobile development",
      "Passion for building products that connect people",
    ],
    benefits: ["Competitive stipend", "Housing assistance", "Intern events & networking", "Mentorship program", "Conversion opportunities"],
    requiredSkills: [
      { name: "React",       required: 60 },
      { name: "TypeScript",  required: 50 },
      { name: "Node.js",     required: 55 },
      { name: "Git",         required: 65 },
      { name: "SQL",         required: 40 },
    ],
  },
  {
    id: 6, title: "Frontend Developer Intern", company: "Shopify",
    location: "Remote", salary: "$6.5k/month", score: 85, type: "Internship", jobType: "internship" as JobType,
    logo: "S", logoColor: "#7AB55C",
    posted: "4 days ago", applicants: 142,
    description: "Shopify is looking for frontend developer interns to help build the future of commerce. As an intern, you'll work on Shopify's merchant-facing products, learning from senior engineers while shipping code that merchants around the world depend on.",
    responsibilities: [
      "Build and improve UI components for Shopify's admin dashboard",
      "Collaborate with designers to implement pixel-perfect interfaces",
      "Write tests and ensure high code quality standards",
      "Participate in pair programming and design reviews",
      "Learn about e-commerce at scale",
    ],
    requirements: [
      "Enrolled in a Computer Science or related program",
      "Experience with React or similar frontend frameworks",
      "Understanding of HTML, CSS, and JavaScript fundamentals",
      "Familiarity with version control (Git)",
      "Strong communication and teamwork skills",
    ],
    benefits: ["Fully remote", "Learning stipend", "Health benefits", "Intern community", "Mentorship"],
    requiredSkills: [
      { name: "React",        required: 65 },
      { name: "TypeScript",   required: 55 },
      { name: "CSS/Tailwind", required: 70 },
      { name: "Git",          required: 60 },
    ],
  },
  {
    id: 7, title: "IT Support OJT", company: "TechStart Solutions",
    location: "Manila, Philippines", salary: "₱8k/month", score: 88, type: "OJT", jobType: "ojt" as JobType,
    logo: "T", logoColor: "#FF6B6B",
    posted: "3 days ago", applicants: 34,
    description: "TechStart Solutions is offering an On-the-Job Training opportunity for IT students. You'll gain hands-on experience in technical support, network administration, and system maintenance while working with our IT team.",
    responsibilities: [
      "Assist with troubleshooting hardware and software issues",
      "Help maintain company computer systems and networks",
      "Support end-users with technical questions and problems",
      "Document technical procedures and create user guides",
      "Shadow senior IT staff on system upgrades and installations",
    ],
    requirements: [
      "Currently enrolled in IT, Computer Science, or related program",
      "Basic knowledge of Windows and networking concepts",
      "Good communication and customer service skills",
      "Willingness to learn and take on new challenges",
      "Minimum 300 hours OJT requirement from school",
    ],
    benefits: ["OJT certificate", "Hands-on training", "Potential job offer after graduation", "Transportation allowance"],
    requiredSkills: [
      { name: "Windows",      required: 50 },
      { name: "Networking",   required: 45 },
      { name: "Office Suite", required: 60 },
      { name: "Customer Service", required: 55 },
    ],
  },
  {
    id: 8, title: "Web Development OJT", company: "Digital Creative Agency",
    location: "Quezon City, Philippines", salary: "₱10k/month", score: 92, type: "OJT", jobType: "ojt" as JobType,
    logo: "D", logoColor: "#9B59B6",
    posted: "1 week ago", applicants: 67,
    description: "Digital Creative Agency is accepting OJT students interested in web development. You'll work with our development team to create websites and web applications for local businesses, learning industry-standard practices and tools.",
    responsibilities: [
      "Assist in developing responsive websites using HTML, CSS, and JavaScript",
      "Help maintain and update client websites",
      "Participate in team meetings and project planning sessions",
      "Learn to work with WordPress and other CMS platforms",
      "Contribute to testing and quality assurance processes",
    ],
    requirements: [
      "Currently pursuing a degree in IT, Computer Science, or Web Development",
      "Basic knowledge of HTML, CSS, and JavaScript",
      "Familiarity with responsive web design principles",
      "Portfolio of school projects (if available)",
      "Minimum 400 hours OJT requirement",
    ],
    benefits: ["OJT certificate", "Real project experience", "Mentorship from senior developers", "Meal allowance", "Possible regularization"],
    requiredSkills: [
      { name: "HTML/CSS",     required: 60 },
      { name: "JavaScript",   required: 55 },
      { name: "React",        required: 40 },
      { name: "Git",          required: 50 },
    ],
  },
  {
    id: 9, title: "Open Source Frontend Contributor", company: "freeCodeCamp",
    location: "Remote", salary: "Unpaid", score: 87, type: "Volunteer", jobType: "volunteer" as JobType,
    logo: "F", logoColor: "#0A0A23",
    posted: "1 week ago", applicants: 58,
    description: "freeCodeCamp is a nonprofit helping millions of people learn to code for free. As a volunteer contributor, you'll work on the open-source curriculum platform, fix bugs, and build features that directly impact learners worldwide.",
    responsibilities: [
      "Contribute code to the freeCodeCamp open-source repository on GitHub",
      "Fix reported bugs and implement feature requests from the community",
      "Review pull requests from other contributors",
      "Write and improve documentation for curriculum and tooling",
      "Participate in community discussions and planning issues",
    ],
    requirements: [
      "Familiarity with React and JavaScript",
      "Comfortable with Git and GitHub workflows",
      "Self-motivated and able to work asynchronously",
      "Passion for education and open-source communities",
    ],
    benefits: ["Open source experience", "Public GitHub contributions", "Community recognition", "Letter of recommendation available", "Network with global contributors"],
    requiredSkills: [
      { name: "React",       required: 60 },
      { name: "JavaScript",  required: 65 },
      { name: "Git",         required: 70 },
      { name: "HTML/CSS",    required: 55 },
    ],
  },
  {
    id: 10, title: "Tech Mentor – Youth Coding Program", company: "Code.org",
    location: "Remote / Local", salary: "Unpaid", score: 79, type: "Volunteer", jobType: "volunteer" as JobType,
    logo: "C", logoColor: "#0075B4",
    posted: "3 days ago", applicants: 23,
    description: "Code.org is expanding its volunteer mentor network to support K-12 students learning computer science. You'll guide students through coding challenges, answer questions during virtual sessions, and help inspire the next generation of developers.",
    responsibilities: [
      "Facilitate 1-hour weekly virtual coding sessions with students aged 10–18",
      "Help students debug code and understand programming fundamentals",
      "Share your career journey to inspire interest in tech",
      "Provide feedback on student projects",
      "Coordinate with program coordinators on session schedules",
    ],
    requirements: [
      "At least 1 year of programming experience in any language",
      "Patience and strong communication skills",
      "Reliable internet connection and 2+ hours per week availability",
      "Background check required for working with minors",
    ],
    benefits: ["Teaching experience", "Volunteer certificate", "Community impact", "Add to LinkedIn profile", "Flexible schedule"],
    requiredSkills: [
      { name: "JavaScript",      required: 50 },
      { name: "HTML/CSS",        required: 50 },
      { name: "Customer Service",required: 65 },
    ],
  },
  {
    id: 11, title: "NGO Website Rebuild Volunteer", company: "Habitat for Humanity",
    location: "Hybrid – Metro Manila", salary: "Unpaid", score: 83, type: "Volunteer", jobType: "volunteer" as JobType,
    logo: "H", logoColor: "#009A44",
    posted: "5 days ago", applicants: 19,
    description: "Habitat for Humanity Philippines is looking for volunteer web developers to redesign and rebuild their local chapter website. You'll work in a small team, own deliverables end-to-end, and leave a lasting digital footprint for a cause that matters.",
    responsibilities: [
      "Audit and redesign the existing chapter website for usability and accessibility",
      "Build responsive pages using HTML, CSS, and a modern JS framework",
      "Integrate a donation form and event calendar with third-party services",
      "Handoff the project with documentation so staff can manage content",
      "Attend bi-weekly check-ins with the chapter communications team",
    ],
    requirements: [
      "Proficiency in HTML, CSS, and at least one JS framework (React preferred)",
      "Experience with CMS platforms (WordPress or similar) a plus",
      "Portfolio or GitHub profile with at least one live project",
      "Commitment of 6–8 hours per week for 2 months",
    ],
    benefits: ["Portfolio project", "Reference letter", "Certificate of completion", "Networking with NGO community", "Real-world client experience"],
    requiredSkills: [
      { name: "React",       required: 55 },
      { name: "HTML/CSS",    required: 70 },
      { name: "JavaScript",  required: 60 },
      { name: "Git",         required: 55 },
    ],
  },
];

const appliedJobs = [
  {
    id: 1, title: "Product Engineer", company: "Vercel",
    location: "Remote", salary: "$130k–$165k", score: 74,
    logo: "V", logoColor: "#ffffff", appliedDate: "May 14, 2026",
    status: "Interview", statusColor: "text-indigo-400 bg-indigo-400/10",
    pipeline: [
      { label: "Applied",     done: true,  date: "May 14" },
      { label: "Reviewed",    done: true,  date: "May 16" },
      { label: "Shortlisted", done: true,  date: "May 18" },
      { label: "Interview",   done: true,  date: "May 21" },
      { label: "Offer",       done: false, date: "" },
    ],
  },
  {
    id: 2, title: "Sr. Frontend Engineer", company: "Stripe",
    location: "Remote", salary: "$140k–$175k", score: 91,
    logo: "S", logoColor: "#635BFF", appliedDate: "May 19, 2026",
    status: "Reviewed", statusColor: "text-amber-400 bg-amber-400/10",
    pipeline: [
      { label: "Applied",     done: true,  date: "May 19" },
      { label: "Reviewed",    done: true,  date: "May 21" },
      { label: "Shortlisted", done: false, date: "" },
      { label: "Interview",   done: false, date: "" },
      { label: "Offer",       done: false, date: "" },
    ],
  },
  {
    id: 3, title: "Full-Stack Developer", company: "Linear",
    location: "San Francisco", salary: "$120k–$155k", score: 78,
    logo: "L", logoColor: "#5E6AD2", appliedDate: "May 20, 2026",
    status: "Applied", statusColor: "text-sky-400 bg-sky-400/10",
    pipeline: [
      { label: "Applied",     done: true,  date: "May 20" },
      { label: "Reviewed",    done: false, date: "" },
      { label: "Shortlisted", done: false, date: "" },
      { label: "Interview",   done: false, date: "" },
      { label: "Offer",       done: false, date: "" },
    ],
  },
];

const mentorCourses = [
  {
    id: 1,
    mentor: { name: "Priya Nair", role: "Staff Engineer @ Airbnb", avatar: "PN", color: "#6366f1", rating: 4.95, students: 1240 },
    title: "GraphQL Mastery: From Basics to Production",
    description: "Build real-world GraphQL APIs with Apollo Server, subscriptions, and caching strategies used at scale.",
    duration: "8 weeks", price: "$299", level: "Intermediate",
    skills: ["GraphQL", "Apollo Client", "Schema Design", "Subscriptions"],
    sessions: "2×/week live + recordings", badge: "Most Popular",
    badgeColor: "text-indigo-400 bg-indigo-400/10",
    enrolled: 847, spots: 20, nextStart: "Jun 2, 2026",
  },
  {
    id: 2,
    mentor: { name: "Marcus Chen", role: "Eng Manager @ Shopify", avatar: "MC", color: "#10b981", rating: 4.88, students: 890 },
    title: "System Design for Senior Engineers",
    description: "Crack system design interviews and architect scalable distributed systems from scratch.",
    duration: "6 weeks", price: "$249", level: "Advanced",
    skills: ["System Design", "Scalability", "Databases", "Microservices"],
    sessions: "1×/week live + office hours", badge: "High Demand",
    badgeColor: "text-amber-400 bg-amber-400/10",
    enrolled: 612, spots: 15, nextStart: "Jun 9, 2026",
  },
  {
    id: 3,
    mentor: { name: "Sarah Rodriguez", role: "Senior Engineer @ Airbnb", avatar: "SR", color: "#ec4899", rating: 4.92, students: 560 },
    title: "React Performance Optimization",
    description: "Profile and fix real performance bottlenecks. Cover memo, lazy loading, bundle splitting and Core Web Vitals.",
    duration: "4 weeks", price: "$199", level: "Intermediate",
    skills: ["React", "Performance", "Webpack", "Core Web Vitals"],
    sessions: "3×/week async + 1 live Q&A", badge: "New",
    badgeColor: "text-emerald-400 bg-emerald-400/10",
    enrolled: 203, spots: 30, nextStart: "May 28, 2026",
  },
  {
    id: 4,
    mentor: { name: "David Kim", role: "Principal DB Architect @ Snowflake", avatar: "DK", color: "#f59e0b", rating: 4.90, students: 730 },
    title: "PostgreSQL Deep Dive for Developers",
    description: "Go beyond basic queries: indexing strategies, query optimisation, partitioning, and pg_stat tooling.",
    duration: "5 weeks", price: "$179", level: "Beginner–Mid",
    skills: ["PostgreSQL", "SQL", "Query Optimisation", "Indexing"],
    sessions: "2×/week live + lab exercises", badge: "Quick Win",
    badgeColor: "text-sky-400 bg-sky-400/10",
    enrolled: 451, spots: 25, nextStart: "Jun 2, 2026",
  },
];

const certifications = [
  {
    id: 1, provider: "AWS", logo: "AWS", logoColor: "#FF9900", logoBackground: "#FF990015",
    name: "AWS Certified Developer – Associate",
    category: "Cloud", level: "Associate", cost: "$150",
    skills: ["AWS Lambda", "DynamoDB", "S3", "CloudFormation", "API Gateway"],
    relevance: 88,
    practiceUrl: "#", examUrl: "#",
    description: "Validates ability to develop and deploy cloud-native applications on AWS.",
    partnerBadge: "Official Partner",
  },
  {
    id: 2, provider: "Google", logo: "GCP", logoColor: "#4285F4", logoBackground: "#4285F415",
    name: "Google Professional Cloud Developer",
    category: "Cloud", level: "Professional", cost: "$200",
    skills: ["GCP", "Kubernetes", "Cloud Run", "BigQuery", "Pub/Sub"],
    relevance: 76,
    practiceUrl: "#", examUrl: "#",
    description: "Demonstrates the ability to build scalable and highly available applications using Google Cloud.",
    partnerBadge: "Official Partner",
  },
  {
    id: 3, provider: "Meta", logo: "Meta", logoColor: "#0866FF", logoBackground: "#0866FF15",
    name: "Meta Front-End Developer Certificate",
    category: "Frontend", level: "Professional", cost: "Free (Coursera)",
    skills: ["React", "HTML/CSS", "JavaScript", "UI/UX", "Testing"],
    relevance: 95,
    practiceUrl: "#", examUrl: "#",
    description: "Industry-recognized credential for front-end development skills, issued by Meta.",
    partnerBadge: "Featured",
  },
  {
    id: 4, provider: "MongoDB", logo: "MDB", logoColor: "#00ED64", logoBackground: "#00ED6415",
    name: "MongoDB Certified Developer",
    category: "Database", level: "Associate", cost: "$150",
    skills: ["MongoDB", "Aggregation", "Indexes", "Atlas", "Schema Design"],
    relevance: 70,
    practiceUrl: "#", examUrl: "#",
    description: "Validates skills in MongoDB schema design, querying, and application development.",
    partnerBadge: "Official Partner",
  },
  {
    id: 5, provider: "CKAD", logo: "K8s", logoColor: "#326CE5", logoBackground: "#326CE515",
    name: "Certified Kubernetes Application Developer",
    category: "DevOps", level: "Professional", cost: "$395",
    skills: ["Kubernetes", "Docker", "Pods", "Deployments", "ConfigMaps"],
    relevance: 62,
    practiceUrl: "#", examUrl: "#",
    description: "Hands-on performance-based exam proving competency in deploying applications on Kubernetes.",
    partnerBadge: "Official Partner",
  },
  {
    id: 6, provider: "Microsoft", logo: "AZ", logoColor: "#00A4EF", logoBackground: "#00A4EF15",
    name: "Azure Developer Associate (AZ-204)",
    category: "Cloud", level: "Associate", cost: "$165",
    skills: ["Azure Functions", "Cosmos DB", "Azure DevOps", "Service Bus", "API Management"],
    relevance: 58,
    practiceUrl: "#", examUrl: "#",
    description: "Proves expertise in building Azure solutions including compute, storage, security, and messaging.",
    partnerBadge: "Official Partner",
  },
];

const roadmapPhases = [
  {
    id: 1, phase: "Now", range: "Current", color: "#6366f1", status: "complete",
    title: "React & TypeScript Foundation",
    skills: ["React 95%", "TypeScript 88%", "Firebase 80%", "Node.js 72%"],
    actions: ["Profile complete", "Resume uploaded", "3 applications active"],
  },
  {
    id: 2, phase: "Phase 1", range: "Weeks 1–6", color: "#10b981", status: "active",
    title: "Close Critical Skill Gaps",
    skills: ["GraphQL", "PostgreSQL"],
    actions: ["Enroll: GraphQL Zero to Production", "Enroll: PostgreSQL for Developers", "Build a GraphQL API side project"],
  },
  {
    id: 3, phase: "Phase 2", range: "Weeks 7–14", color: "#f59e0b", status: "upcoming",
    title: "Infrastructure & Architecture",
    skills: ["Docker", "System Design"],
    actions: ["Complete System Design course", "Dockerize a personal project", "Mock system design interview"],
  },
  {
    id: 4, phase: "Target", range: "Month 4+", color: "#ec4899", status: "upcoming",
    title: "Senior Full-Stack Engineer",
    skills: ["Lead interviews", "Receive offers"],
    actions: ["Apply to 10+ senior roles", "Aim for 85%+ match scores", "Negotiate offer"],
  },
];

const currentSkills = Object.entries(mySkills).map(([name, level]) => ({ name, level }));

// ── Admin Data ────────────────────────────────────────────────────────────────

const adminUsers = [
  { id: 1, name: "Aarav Kumar", email: "aarav.kumar@gmail.com", role: "job-seeker", status: "active", joined: "Jan 15, 2026", applications: 12 },
  { id: 2, name: "Sarah Chen", email: "sarah.chen@outlook.com", role: "student", status: "active", joined: "Feb 3, 2026", applications: 5 },
  { id: 3, name: "Marcus Rodriguez", email: "m.rodriguez@gmail.com", role: "mentor", status: "pending", joined: "Mar 10, 2026", applications: 0 },
  { id: 4, name: "Tech Solutions Inc", email: "hr@techsolutions.com", role: "employer", status: "active", joined: "Dec 1, 2025", applications: 0 },
  { id: 5, name: "Emma Wilson", email: "emma.w@yahoo.com", role: "job-seeker", status: "suspended", joined: "Jan 20, 2026", applications: 8 },
  { id: 6, name: "Digital Agency Co", email: "jobs@digitalagency.ph", role: "employer", status: "pending", joined: "May 10, 2026", applications: 0 },
];

const adminCourses = [
  { id: 1, title: "GraphQL Zero to Production", mentor: "Priya Nair", students: 1240, revenue: "$62,000", status: "active", rating: 4.95 },
  { id: 2, title: "React Performance Deep Dive", mentor: "Marcus Chen", students: 890, revenue: "$44,500", status: "active", rating: 4.88 },
  { id: 3, title: "System Design Masterclass", mentor: "Sarah Rodriguez", students: 560, revenue: "$28,000", status: "active", rating: 4.92 },
  { id: 4, title: "Advanced TypeScript Patterns", mentor: "David Kim", students: 320, revenue: "$16,000", status: "pending", rating: 0 },
];

const adminCertApprovals = [
  { id: 1, userName: "Alex Thompson", certName: "AWS Certified Developer", provider: "AWS", submittedDate: "May 20, 2026", status: "pending", proof: "certificate.pdf" },
  { id: 2, userName: "Jamie Lee", certName: "Google Cloud Professional", provider: "Google", submittedDate: "May 19, 2026", status: "pending", proof: "gcp_cert.pdf" },
  { id: 3, userName: "Taylor Martinez", certName: "Azure Solutions Architect", provider: "Microsoft", submittedDate: "May 18, 2026", status: "approved", proof: "azure_cert.pdf" },
];

const adminMentorVerifications = [
  { id: 1, name: "Dr. Lisa Wang", email: "lisa.wang@university.edu", expertise: "Machine Learning, AI", experience: "15 years", status: "pending", applied: "May 21, 2026" },
  { id: 2, name: "John Stevens", email: "john.s@techcorp.com", expertise: "DevOps, Cloud Architecture", experience: "10 years", status: "pending", applied: "May 20, 2026" },
  { id: 3, name: "Maria Garcia", email: "m.garcia@consulting.com", expertise: "Product Management", experience: "8 years", status: "approved", applied: "May 15, 2026" },
];

const adminEmployerVerifications = [
  { id: 1, company: "StartupXYZ Inc", contact: "hr@startupxyz.com", industry: "FinTech", size: "50-200", status: "pending", applied: "May 22, 2026" },
  { id: 2, company: "Global Tech Solutions", contact: "recruitment@globaltech.com", industry: "IT Services", size: "500+", status: "pending", applied: "May 21, 2026" },
  { id: 3, company: "Creative Digital Agency", contact: "jobs@creativedigital.com", industry: "Marketing", size: "10-50", status: "approved", applied: "May 18, 2026" },
];

const adminRevenueData = [
  { month: "Jan", subscriptions: 45000, courses: 32000, certifications: 8000, total: 85000 },
  { month: "Feb", subscriptions: 48000, courses: 35000, certifications: 9500, total: 92500 },
  { month: "Mar", subscriptions: 52000, courses: 41000, certifications: 11000, total: 104000 },
  { month: "Apr", subscriptions: 55000, courses: 44500, certifications: 12500, total: 112000 },
  { month: "May", subscriptions: 58000, courses: 48000, certifications: 14000, total: 120000 },
];

const adminAnalytics = {
  totalUsers: 48234,
  activeUsers: 32156,
  newUsers: 2341,
  totalRevenue: 513500,
  activeCourses: 24,
  pendingApprovals: 15,
  avgSessionTime: "23m 45s",
  conversionRate: "3.4%",
};

// ── Shared components ─────────────────────────────────────────────────────────

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const data = [{ value: score }, { value: 100 - score }];
  const color = score >= 85 ? "#6366f1" : score >= 70 ? "#10b981" : "#f59e0b";
  const inner = Math.round(size * 0.32);
  const outer = Math.round(size * 0.46);
  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <RadialBarChart width={size} height={size} cx="50%" cy="50%" innerRadius={inner} outerRadius={outer}
          startAngle={90} endAngle={-270} data={data} barSize={5}>
          <RadialBar dataKey="value" cornerRadius={5} background={{ fill: "rgba(255,255,255,0.06)" }}>
            <Cell fill={color} /><Cell fill="transparent" />
          </RadialBar>
        </RadialBarChart>
      <span className="absolute inset-0 flex items-center justify-center font-mono font-medium"
        style={{ color, fontSize: size * 0.21 }}>{score}</span>
    </div>
  );
}

function SkillBar({ name, level }: { name: string; level: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground font-mono w-24 shrink-0">{name}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${level}%`, background: "linear-gradient(90deg,#6366f1,#818cf8)" }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">{level}%</span>
    </div>
  );
}

function NavProgress({ current }: { current: Stage }) {
  const idx = STAGE_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-1 mb-6">
      {STAGE_ORDER.map((s, i) => (
        <div key={s} className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${i === idx ? "bg-primary" : i < idx ? "bg-primary/50" : "bg-white/10"}`} />
      ))}
    </div>
  );
}

// ── Auth Panel ────────────────────────────────────────────────────────────────

function AuthPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"register" | "resume">("register");
  const [role, setRole] = useState<UserRole | null>(null);
  const [phase, setPhase] = useState<"upload" | "parsing" | "review">("upload");
  const [progress, setProgress] = useState(0);

  function startParse() {
    setPhase("parsing"); let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18 + 5;
      if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => setPhase("review"), 400); }
      setProgress(Math.min(p, 100));
    }, 200);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-card border-l border-border flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex gap-1 bg-secondary rounded-lg p-1">
            {(["register", "resume"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "resume" ? "Upload Resume" : "Register"}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "register" && (
            <div>
              <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Create your account</h3>
              <p className="text-xs text-muted-foreground mb-5">Join 48,000+ professionals on CareerAI.</p>
              <button className="w-full flex items-center justify-center gap-2.5 py-2.5 border border-border rounded-lg bg-secondary hover:bg-secondary/80 mb-4 text-sm font-medium transition-colors">
                <svg width="16" height="16" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </button>
              <div className="flex items-center gap-3 mb-4"><div className="flex-1 h-px bg-border"/><span className="text-[10px] text-muted-foreground font-mono">OR</span><div className="flex-1 h-px bg-border"/></div>
              <div className="space-y-2.5 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="First name" className="px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"/>
                  <input placeholder="Last name" className="px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"/>
                </div>
                <input placeholder="Email address" type="email" className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"/>
                <input placeholder="Password" type="password" className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"/>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Joining as:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                {(["student", "job-seeker", "mentor", "employer", "admin"] as const).map((r) => (
                  <button key={r} onClick={() => setRole(r)}
                    className={`py-2.5 border rounded-lg text-xs font-medium transition-all ${role === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    {r === "student" ? "🎓 Student" : r === "job-seeker" ? "💼 Job Seeker" : r === "mentor" ? "👨‍🏫 Mentor" : r === "employer" ? "🏢 Employer" : "⚙️ Admin"}
                  </button>
                ))}
              </div>
              <button disabled={!role} onClick={onClose} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Create Account
              </button>
              <p className="text-center text-xs text-muted-foreground mt-4">Already have an account? <button className="text-primary hover:underline">Sign in</button></p>
            </div>
          )}

          {tab === "resume" && phase === "upload" && (
            <div>
              <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Upload your resume</h3>
              <p className="text-xs text-muted-foreground mb-5">AI extracts your skills automatically.</p>
              <div onClick={startParse} className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all group mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                  <Upload size={22} className="text-primary"/>
                </div>
                <p className="font-medium text-sm mb-1">Drop your CV here</p>
                <p className="text-xs text-muted-foreground mb-3">PDF, DOCX, TXT — up to 5 MB</p>
                <span className="text-xs font-mono text-primary border border-primary/30 px-3 py-1 rounded-full">Browse files</span>
              </div>
              <div className="flex items-center gap-3 mb-3"><div className="flex-1 h-px bg-border"/><span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">OR LINKEDIN URL</span><div className="flex-1 h-px bg-border"/></div>
              <div className="flex gap-2">
                <input placeholder="linkedin.com/in/your-name" className="flex-1 px-3 py-2 bg-input-background border border-border rounded-lg text-xs focus:outline-none focus:border-primary/50 min-w-0"/>
                <button onClick={startParse} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors shrink-0">Import</button>
              </div>
            </div>
          )}

          {tab === "resume" && phase === "parsing" && (
            <div className="text-center pt-8">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap size={24} className="text-primary animate-pulse"/>
              </div>
              <h3 className="font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Analysing resume…</h3>
              <p className="text-xs text-muted-foreground mb-6">Extracting skills and experience</p>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-primary rounded-full transition-all duration-200" style={{ width: `${progress}%` }}/>
              </div>
              <p className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</p>
              <div className="mt-6 space-y-2 text-left">
                {[{l:"Parsing document",d:progress>20},{l:"Identifying skills",d:progress>50},{l:"Extracting experience",d:progress>75},{l:"Finalising profile",d:progress>=100}].map((s) => (
                  <div key={s.l} className={`flex items-center gap-2 text-xs ${s.d ? "text-foreground" : "text-muted-foreground/40"}`}>
                    <CheckCircle size={11} className={s.d ? "text-primary" : "text-muted-foreground/20"}/>{s.l}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "resume" && phase === "review" && (
            <div>
              <div className="flex items-center gap-1.5 mb-2"><CheckCircle size={14} className="text-emerald-400"/><span className="text-xs font-mono text-emerald-400">EXTRACTION COMPLETE</span></div>
              <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Review extracted data</h3>
              <p className="text-xs text-muted-foreground mb-4">Confirm what our AI found.</p>
              <div className="bg-secondary/50 rounded-xl p-4 mb-3">
                <p className="text-xs font-mono text-muted-foreground mb-2">SKILLS FOUND</p>
                <div className="flex flex-wrap gap-1.5">
                  {["React","TypeScript","Firebase","Node.js","REST APIs","Git","CSS","Jest"].map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-primary/15 text-primary rounded-full text-xs font-mono">{s}</span>
                  ))}
                </div>
              </div>
              <div className="bg-secondary/50 rounded-xl p-4 mb-4">
                <p className="text-xs font-mono text-muted-foreground mb-2">EXPERIENCE</p>
                <div className="space-y-2">
                  {[{t:"Frontend Engineer",c:"Growlytics",y:"3 yrs"},{t:"Junior Developer",c:"ByteStack",y:"2 yrs"}].map((e) => (
                    <div key={e.t} className="flex items-center justify-between">
                      <div><p className="text-xs font-medium">{e.t}</p><p className="text-[10px] text-muted-foreground">{e.c}</p></div>
                      <span className="text-[10px] font-mono text-muted-foreground bg-card px-2 py-0.5 rounded">{e.y}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={onClose} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                Confirm & Save <CheckCircle size={14}/>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Announcements data ────────────────────────────────────────────────────────

const announcements = [
  {
    id: 1,
    pinned: true,
    tag: "Certification",
    tagBg: "bg-violet-500/10",
    tagColor: "text-violet-400",
    icon: <BadgeCheck size={15} className="text-violet-400"/>,
    iconBg: "bg-violet-500/10",
    title: "AWS Certified Developer – Associate: New Exam Guide Released",
    body: "AWS has updated the DVA-C02 exam guide effective June 2025. Key changes include expanded coverage of serverless architectures and container-based deployments. All enrolled candidates should review the updated blueprint.",
    date: "May 20, 2025",
    cta: "View Exam Guide",
  },
  {
    id: 2,
    pinned: false,
    tag: "Deadline",
    tagBg: "bg-rose-500/10",
    tagColor: "text-rose-400",
    icon: <CalendarDays size={15} className="text-rose-400"/>,
    iconBg: "bg-rose-500/10",
    title: "Meta Front-End Developer Certificate – Cohort 7 Enrollment Closes May 31",
    body: "Enrollment for the next cohort closes at the end of this month. Seats are limited. Applicants must complete the skills assessment before submitting their application.",
    date: "May 18, 2025",
    cta: "Apply Now",
  },
  {
    id: 3,
    pinned: false,
    tag: "Opportunity",
    tagBg: "bg-emerald-500/10",
    tagColor: "text-emerald-400",
    icon: <Award size={15} className="text-emerald-400"/>,
    iconBg: "bg-emerald-500/10",
    title: "Google UX Design Certificate – Scholarship Slots Open",
    body: "Ten merit-based scholarships are available for the Google UX Design Certificate program. Eligible candidates must have completed at least one certification module and maintain an 80%+ assessment score.",
    date: "May 15, 2025",
    cta: "Check Eligibility",
  },
  {
    id: 4,
    pinned: false,
    tag: "Platform",
    tagBg: "bg-blue-500/10",
    tagColor: "text-blue-400",
    icon: <Zap size={15} className="text-blue-400"/>,
    iconBg: "bg-blue-500/10",
    title: "New Mentorship Matching Algorithm Live",
    body: "We've improved how mentors are matched to learners. The new model factors in your current skill gaps, preferred learning pace, and target certification track to surface the most relevant mentors.",
    date: "May 12, 2025",
    cta: null,
  },
];

// ── Stage: Discover (jobs + per-job skill gap) ────────────────────────────────

function AnnouncementCarousel() {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startTimer() {
    timerRef.current = setTimeout(() => {
      setActive((i) => (i + 1) % announcements.length);
    }, 4000);
  }

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active]);

  const a = announcements[active];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList size={13} className="text-primary"/>
        <span className="text-[10px] font-mono font-bold text-primary tracking-widest">ANNOUNCEMENTS</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-primary/15 text-primary ml-0.5">{announcements.length}</span>
      </div>

      {/* Card — fixed height so there's no layout shift */}
      <div className={`bg-card border rounded-xl p-4 transition-all ${a.pinned ? "border-primary/40" : "border-border"}`}
        style={{ minHeight: 112 }}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.iconBg}`}>
            {a.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              {a.pinned && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wider">Pinned</span>
              )}
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${a.tagBg} ${a.tagColor}`}>{a.tag}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{a.date}</span>
            </div>
            <p className="text-xs font-semibold leading-snug mb-1">{a.title}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{a.body}</p>
            {a.cta && (
              <button className="mt-1.5 flex items-center gap-1 text-[11px] text-primary font-medium hover:underline">
                {a.cta} <ArrowRight size={10}/>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center gap-1.5 mt-2.5 justify-center">
        {announcements.map((_, i) => (
          <button
            key={i}
            onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); setActive(i); }}
            className={`rounded-full transition-all ${i === active ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border hover:bg-muted-foreground"}`}
          />
        ))}
      </div>
    </div>
  );
}

function JobModal({ job, onClose, appliedIds, onApply, applyingId }: {
  job: typeof jobListings[0];
  onClose: () => void;
  appliedIds: number[];
  onApply: (job: typeof jobListings[0]) => void;
  applyingId: number | null;
}) {
  const isApplied = appliedIds.includes(job.id);
  const isApplying = applyingId === job.id;

  function getGap(skill: string, required: number) {
    const have = mySkills[skill] ?? 0;
    return { have, required, gap: Math.max(0, required - have), meets: have >= required };
  }

  const gaps = job.requiredSkills.filter((r) => (mySkills[r.name] ?? 0) < r.required);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>

      {/* Modal */}
      <div className="relative z-10 bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ animation: "slideUp 0.2s ease-out" }}>
        <style>{`@keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-start gap-3 z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: `${job.logoColor}18`, color: job.logoColor }}>
            {job.logo}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{job.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span>{job.company}</span>
              <span className="flex items-center gap-0.5"><MapPin size={9}/>{job.location}</span>
              <span className="flex items-center gap-0.5"><DollarSign size={9}/>{job.salary}</span>
              <span>{job.type}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-mono">
              <span>{job.posted}</span><span>·</span><span>{job.applicants} applicants</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ScoreRing score={job.score} size={40}/>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
              <X size={16} className="text-muted-foreground"/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed">{job.description}</p>

          {/* Responsibilities */}
          <div>
            <p className="text-[10px] font-mono font-bold text-muted-foreground mb-2 tracking-widest">RESPONSIBILITIES</p>
            <ul className="space-y-1.5">
              {job.responsibilities.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-primary mt-0.5 shrink-0">›</span>{r}
                </li>
              ))}
            </ul>
          </div>

          {/* Requirements */}
          <div>
            <p className="text-[10px] font-mono font-bold text-muted-foreground mb-2 tracking-widest">REQUIREMENTS</p>
            <ul className="space-y-1.5">
              {job.requirements.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle size={10} className="text-emerald-400 mt-0.5 shrink-0"/>{r}
                </li>
              ))}
            </ul>
          </div>

          {/* Benefits */}
          <div>
            <p className="text-[10px] font-mono font-bold text-muted-foreground mb-2 tracking-widest">BENEFITS</p>
            <div className="flex flex-wrap gap-1.5">
              {job.benefits.map((b) => (
                <span key={b} className="text-[10px] font-mono px-2 py-0.5 bg-secondary border border-border rounded-full text-muted-foreground">{b}</span>
              ))}
            </div>
          </div>

          {/* Skill fit */}
          <div className="p-3 bg-secondary/40 rounded-xl border border-border/50">
            <p className="text-[10px] font-mono font-bold text-muted-foreground mb-2.5 tracking-widest">YOUR SKILL FIT</p>
            <div className="space-y-2">
              {job.requiredSkills.map((req) => {
                const { have, required, gap, meets } = getGap(req.name, req.required);
                return (
                  <div key={req.name} className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono w-20 shrink-0 ${meets ? "text-emerald-400" : "text-muted-foreground"}`}>{req.name}</span>
                    <div className="flex-1 relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="absolute h-full rounded-full opacity-20" style={{ width: `${required}%`, background: "#818cf8" }}/>
                      <div className="absolute h-full rounded-full transition-all"
                        style={{ width: `${have}%`, background: meets ? "linear-gradient(90deg,#10b981,#34d399)" : "linear-gradient(90deg,#6366f1,#818cf8)" }}/>
                    </div>
                    <span className={`text-[10px] font-mono w-24 text-right shrink-0 ${meets ? "text-emerald-400" : "text-rose-400"}`}>
                      {meets ? `✓ ${have}%` : `${have}% / need ${required}%`}
                    </span>
                  </div>
                );
              })}
            </div>
            {gaps.length > 0 ? (
              <div className="mt-2.5 flex items-center gap-2 p-2 bg-rose-500/8 border border-rose-500/15 rounded-lg">
                <BarChart2 size={11} className="text-rose-400 shrink-0"/>
                <p className="text-[11px] text-muted-foreground">Missing: <span className="text-foreground">{gaps.map((g) => g.name).join(", ")}</span></p>
              </div>
            ) : (
              <div className="mt-2.5 flex items-center gap-2 p-2 bg-emerald-500/8 border border-emerald-500/15 rounded-lg">
                <CheckCircle size={11} className="text-emerald-400 shrink-0"/>
                <p className="text-[11px] text-emerald-400">You meet all skill requirements for this role!</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer — apply */}
        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-4">
          <button
            onClick={() => !isApplied && onApply(job)}
            disabled={isApplied || isApplying}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              isApplied
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default"
                : isApplying
                ? "bg-primary/60 text-primary-foreground cursor-wait"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isApplied ? <><CheckCircle size={14}/> Application Submitted</>
              : isApplying ? "Submitting…"
              : <>Apply Now <ArrowRight size={14}/></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function DiscoverStage({ onOpenAuth, userRole, savedIds, onSave }: {
  onOpenAuth: () => void;
  userRole: UserRole;
  savedIds: number[];
  onSave: (id: number) => void;
}) {
  const [modalJob, setModalJob] = useState<typeof jobListings[0] | null>(null);
  const [appliedIds, setAppliedIds] = useState<number[]>([]);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [discoverTab, setDiscoverTab] = useState<"jobs" | "internships" | "volunteer">("jobs");
  const [searchQuery, setSearchQuery] = useState("");

  function getGap(skill: string, required: number) {
    const have = mySkills[skill] ?? 0;
    return { have, required, gap: Math.max(0, required - have), meets: have >= required };
  }

  function handleApply(job: typeof jobListings[0]) {
    setApplyingId(job.id);
    setTimeout(() => {
      setAppliedIds((prev) => [...prev, job.id]);
      setApplyingId(null);
    }, 1200);
  }

  function getTabJobs() {
    if (discoverTab === "jobs") {
      return jobListings.filter((job) => job.jobType === "full-time");
    } else if (discoverTab === "internships") {
      // OJT and internship both live here; students only see OJT
      if (userRole === "student") {
        return jobListings.filter((job) => job.jobType === "ojt");
      }
      return jobListings.filter((job) => job.jobType === "internship" || job.jobType === "ojt");
    } else {
      return jobListings.filter((job) => job.jobType === "volunteer");
    }
  }

  const tabJobs = getTabJobs();
  const filteredJobs = searchQuery.trim()
    ? tabJobs.filter((job) => {
        const q = searchQuery.toLowerCase();
        return job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q) || job.location.toLowerCase().includes(q);
      })
    : tabJobs;

  return (
    <div>
      <AnnouncementCarousel />

      {/* Jobs + Skill Gap */}
      <div>
        {/* Search bar */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs, companies, locations…"
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X size={14}/>
            </button>
          )}
        </div>

        {/* Three-tab selector */}
        <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-4">
          {([
            { id: "jobs",        label: "Jobs",         icon: <Briefcase size={12}/>,     count: jobListings.filter(j => j.jobType === "full-time").length },
            { id: "internships", label: "Internships",  icon: <GraduationCap size={12}/>, count: jobListings.filter(j => j.jobType === "internship" || j.jobType === "ojt").length },
            { id: "volunteer",   label: "Volunteer",    icon: <Users size={12}/>,         count: jobListings.filter(j => j.jobType === "volunteer").length },
          ] as const).map((tab) => (
            <button key={tab.id} onClick={() => { setDiscoverTab(tab.id); setSearchQuery(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                discoverTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              <span className={discoverTab === tab.id ? "text-primary" : ""}>{tab.icon}</span>
              {tab.label}
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full transition-all ${
                discoverTab === tab.id ? "bg-primary/15 text-primary" : "bg-border/60 text-muted-foreground"
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono text-muted-foreground">
            {discoverTab === "jobs" ? "FULL-TIME POSITIONS" : discoverTab === "internships" ? (userRole === "student" ? "OJT POSITIONS" : "INTERNSHIP POSITIONS") : "VOLUNTEER OPPORTUNITIES"}
            {searchQuery ? ` — ${filteredJobs.length} result${filteredJobs.length !== 1 ? "s" : ""}` : " — click a listing for details"}
          </p>
        </div>
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Job list */}
          <div className="flex-1 space-y-3 min-w-0">
            {filteredJobs.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Briefcase size={20} className="text-primary"/>
                </div>
                <p className="font-medium text-sm mb-1">No positions available</p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery
                    ? `No ${discoverTab === "jobs" ? "jobs" : discoverTab === "internships" ? "internships" : "volunteer opportunities"} match "${searchQuery}".`
                    : discoverTab === "jobs" ? "No full-time positions available right now."
                    : discoverTab === "internships" ? (userRole === "student" ? "No OJT positions available right now." : "No internship positions available right now.")
                    : "No volunteer opportunities available right now."}
                </p>
              </div>
            ) : (
              filteredJobs.map((job) => {
                const isApplied = appliedIds.includes(job.id);
                const isApplying = applyingId === job.id;
                const isSaved = savedIds.includes(job.id);
                const gaps = job.requiredSkills.filter((r) => (mySkills[r.name] ?? 0) < r.required);
                return (
                  <div key={job.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => setModalJob(job)}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: `${job.logoColor}18`, color: job.logoColor }}>
                        {job.logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{job.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span>{job.company}</span>
                          <span className="flex items-center gap-0.5"><MapPin size={9}/>{job.location}</span>
                          <span className="hidden sm:flex items-center gap-0.5"><DollarSign size={9}/>{job.salary}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ScoreRing score={job.score} size={42}/>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground font-mono">
                      <span>{job.posted}</span><span>·</span>
                      <span>{job.applicants} applicants</span><span>·</span>
                      <span className={gaps.length === 0 ? "text-emerald-400" : "text-rose-400"}>
                        {gaps.length === 0 ? "All skills met" : `${gaps.length} gap${gaps.length > 1 ? "s" : ""}`}
                      </span>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                      <button
                        onClick={(e) => { e.stopPropagation(); if (!isApplied && !isApplying) handleApply(job); }}
                        disabled={isApplied || isApplying}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                          isApplied ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 cursor-default"
                          : isApplying ? "bg-primary/50 text-primary-foreground cursor-wait"
                          : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground"
                        }`}>
                        {isApplied ? <><CheckCircle size={11}/> Applied</> : isApplying ? "Applying…" : <><ArrowRight size={11}/> Apply Now</>}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onSave(job.id); }}
                        className={`p-2 rounded-lg border transition-all ${isSaved ? "bg-rose-500/15 border-rose-500/30 text-rose-400" : "border-border text-muted-foreground hover:border-rose-400/40 hover:text-rose-400"}`}
                        title={isSaved ? "Remove from saved" : "Save job"}>
                        <Heart size={14} className={isSaved ? "fill-rose-400" : ""}/>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Skill gap panel — shows for hovered/last-viewed job (desktop) */}
          {modalJob && (
            <div className="hidden lg:block w-60 shrink-0">
              <div className="sticky top-6 bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wide">SKILL GAP — {modalJob.company}</p>
                <div className="space-y-3">
                  {modalJob.requiredSkills.map((req) => {
                    const { have, required, gap, meets } = getGap(req.name, req.required);
                    return (
                      <div key={req.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-mono text-muted-foreground">{req.name}</span>
                          {meets
                            ? <span className="text-[10px] font-mono text-emerald-400">✓ met</span>
                            : <span className="text-[10px] font-mono text-rose-400">–{gap}%</span>}
                        </div>
                        <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="absolute h-full rounded-full opacity-20" style={{ width: `${required}%`, background: "#818cf8" }}/>
                          <div className="absolute h-full rounded-full"
                            style={{ width: `${have}%`, background: meets ? "linear-gradient(90deg,#10b981,#34d399)" : "linear-gradient(90deg,#6366f1,#818cf8)" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const gaps = modalJob.requiredSkills.filter((r) => (mySkills[r.name] ?? 0) < r.required);
                  return gaps.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border">
                      <p className="text-[10px] font-mono text-muted-foreground mb-2 tracking-wide">TO CLOSE GAPS</p>
                      <div className="space-y-1.5">
                        {gaps.slice(0, 3).map((g) => (
                          <div key={g.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TrendingUp size={10} className="text-primary shrink-0"/>Learn {g.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Job modal popup */}
      {modalJob && (
        <JobModal
          job={modalJob}
          onClose={() => setModalJob(null)}
          appliedIds={appliedIds}
          onApply={handleApply}
          applyingId={applyingId}
        />
      )}
    </div>
  );
}

// ── Profile Panel (slide-in from name click) ──────────────────────────────────

function ProfilePanel({ onClose, userRole, setUserRole }: { onClose: () => void; userRole: UserRole; setUserRole: (role: UserRole) => void }) {
  const [skills, setSkills] = useState(Object.keys(mySkills));
  const [input, setInput] = useState("");
  const [section, setSection] = useState<"info" | "skills" | "resume">("info");

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-card border-l border-border flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">AK</div>
            <div>
              <p className="font-semibold text-sm">Aarav Kumar</p>
              <p className="text-[10px] text-muted-foreground">aarav.kumar@gmail.com</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 transition-colors"><X size={18}/></button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1 mx-5 mt-4">
          {(["info", "skills", "resume"] as const).map((t) => (
            <button key={t} onClick={() => setSection(t)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${section === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 mt-2">
          {section === "info" && (
            <>
              <div>
                <label className="text-[9px] text-muted-foreground font-mono mb-1.5 block">USER ROLE</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(["student", "job-seeker", "mentor", "employer", "admin"] as const).map((role) => (
                    <button key={role} onClick={() => setUserRole(role)}
                      className={`py-2 px-3 border rounded-lg text-xs font-medium transition-all ${userRole === role ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      {role === "student" ? "🎓 Student" : role === "job-seeker" ? "💼 Job Seeker" : role === "mentor" ? "👨‍🏫 Mentor" : role === "employer" ? "🏢 Employer" : "⚙️ Admin"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <User size={12}/>,     label: "FIRST NAME", val: "Aarav" },
                  { icon: <User size={12}/>,     label: "LAST NAME",  val: "Kumar" },
                  { icon: <Briefcase size={12}/>,label: "JOB TITLE",  val: "Frontend Engineer" },
                  { icon: <MapPin size={12}/>,   label: "LOCATION",   val: "Austin, TX" },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="text-[9px] text-muted-foreground font-mono mb-1 block">{f.label}</label>
                    <div className="flex items-center gap-1.5 px-2.5 py-2 bg-input-background border border-border rounded-lg">
                      <span className="text-muted-foreground shrink-0">{f.icon}</span>
                      <input defaultValue={f.val} className="bg-transparent text-xs flex-1 focus:outline-none min-w-0"/>
                    </div>
                  </div>
                ))}
              </div>
              {[
                { icon: <User size={12}/>,  label: "EMAIL",     val: "aarav.kumar@gmail.com" },
                { icon: <Globe size={12}/>, label: "PORTFOLIO", val: "aaravkumar.dev" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-[9px] text-muted-foreground font-mono mb-1 block">{f.label}</label>
                  <div className="flex items-center gap-1.5 px-2.5 py-2 bg-input-background border border-border rounded-lg">
                    <span className="text-muted-foreground shrink-0">{f.icon}</span>
                    <input defaultValue={f.val} className="bg-transparent text-xs flex-1 focus:outline-none min-w-0"/>
                  </div>
                </div>
              ))}
              <div>
                <label className="text-[9px] text-muted-foreground font-mono mb-1 block">ABOUT</label>
                <textarea rows={3} defaultValue="Frontend engineer with 5 years building React applications. Passionate about UI/UX and performance."
                  className="w-full px-2.5 py-2 bg-input-background border border-border rounded-lg text-xs focus:outline-none focus:border-primary/50 resize-none"/>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground font-mono mb-2 block">EXPERIENCE</label>
                <div className="space-y-2">
                  {[
                    { title: "Frontend Engineer", company: "Growlytics", period: "2022–Present", yrs: "3 yrs" },
                    { title: "Junior Developer",  company: "ByteStack",  period: "2020–2022",    yrs: "2 yrs" },
                  ].map((e) => (
                    <div key={e.title} className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-lg">
                      <div><p className="text-xs font-medium">{e.title}</p><p className="text-[10px] text-muted-foreground">{e.company} · {e.period}</p></div>
                      <span className="text-[10px] font-mono text-muted-foreground bg-card px-1.5 py-0.5 rounded shrink-0">{e.yrs}</span>
                    </div>
                  ))}
                  <button className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1">
                    <Plus size={11}/> Add Experience
                  </button>
                </div>
              </div>
              <button onClick={onClose} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Save Changes</button>
            </>
          )}

          {section === "skills" && (
            <>
              <div>
                <label className="text-[9px] text-muted-foreground font-mono mb-1.5 block">MY SKILLS</label>
                <div className="min-h-14 flex flex-wrap gap-1.5 p-2.5 bg-input-background border border-border rounded-xl mb-1">
                  {skills.map((s) => (
                    <span key={s} className="flex items-center gap-1 px-2 py-0.5 bg-primary/15 text-primary rounded-full text-[10px] font-mono">
                      {s}<button onClick={() => setSkills(skills.filter((x) => x !== s))} className="hover:text-primary/60"><X size={9}/></button>
                    </span>
                  ))}
                  <input value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { setSkills([...skills, input.trim()]); setInput(""); }}}
                    placeholder="Add skill…" className="bg-transparent text-[10px] focus:outline-none flex-1 min-w-16 text-muted-foreground"/>
                </div>
                <p className="text-[10px] text-muted-foreground">Press Enter to add</p>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground font-mono mb-2 block">COMPLETED CERTIFICATES</label>
                <div className="space-y-2">
                  {[
                    { name: "Meta Front-End Developer Certificate", provider: "Meta", completedDate: "Apr 10, 2026", color: "#0866FF" },
                    { name: "React Performance Optimization", provider: "Coursera / Airbnb", completedDate: "Mar 22, 2026", color: "#6366f1" },
                  ].map((cert) => (
                    <div key={cert.name} className="flex items-start gap-2.5 p-2.5 bg-secondary/50 rounded-lg">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cert.color}18` }}>
                        <BadgeCheck size={13} style={{ color: cert.color }}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-snug">{cert.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{cert.provider} · Completed {cert.completedDate}</p>
                      </div>
                    </div>
                  ))}
                  <button className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1">
                    <Plus size={11}/> Add Certificate
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground font-mono mb-2 block">VOLUNTEER ACTIVITIES</label>
                <div className="space-y-2">
                  {[
                    { org: "Code for Philippines", role: "Web Dev Volunteer", active: true, lastActivity: "May 18, 2026" },
                    { org: "Teaching Kids Coding", role: "Instructor Volunteer", active: false, lastActivity: "Mar 5, 2026" },
                  ].map((vol) => (
                    <div key={vol.org} className="flex items-start gap-2.5 p-2.5 bg-secondary/50 rounded-lg">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${vol.active ? "bg-emerald-500/10" : "bg-secondary"}`}>
                        <Users size={13} className={vol.active ? "text-emerald-400" : "text-muted-foreground"}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-medium">{vol.org}</p>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${vol.active ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
                            {vol.active ? "● Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{vol.role}</p>
                        <p className="text-[10px] text-muted-foreground">Last activity: {vol.lastActivity}</p>
                      </div>
                    </div>
                  ))}
                  <button className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1">
                    <Plus size={11}/> Add Volunteer Activity
                  </button>
                </div>
              </div>
            </>
          )}

          {section === "resume" && (
            <>
              <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2.5 group-hover:bg-primary/20 transition-colors">
                  <Upload size={18} className="text-primary"/>
                </div>
                <p className="text-sm font-medium mb-1">Drop your CV here</p>
                <p className="text-xs text-muted-foreground mb-2.5">PDF, DOCX, TXT — up to 5 MB</p>
                <span className="text-[10px] font-mono text-primary border border-primary/30 px-2.5 py-1 rounded-full">Browse files</span>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5">
                <CheckCircle size={14} className="text-emerald-400 shrink-0"/>
                <div>
                  <p className="text-xs font-medium text-emerald-400">Current resume</p>
                  <p className="text-[10px] text-muted-foreground">Aarav_Kumar_Resume.pdf · Uploaded May 12, 2026</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-px bg-border"/><span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">OR IMPORT FROM</span><div className="flex-1 h-px bg-border"/>
              </div>
              <div className="flex gap-2">
                <input placeholder="linkedin.com/in/your-name" className="flex-1 px-2.5 py-2 bg-input-background border border-border rounded-lg text-xs focus:outline-none focus:border-primary/50 min-w-0"/>
                <button className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors shrink-0">Import</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Stage: Applications ───────────────────────────────────────────────────────

function ApplicationsStage({ savedIds, onSave }: { savedIds: number[]; onSave: (id: number) => void }) {
  const [expanded, setExpanded] = useState<number | null>(1);
  const [activeTab, setActiveTab] = useState<"applied" | "saved">("applied");

  const savedJobs = jobListings.filter((j) => savedIds.includes(j.id));

  const stats = [
    { label: "Applied",    value: appliedJobs.length, color: "text-foreground" },
    { label: "In Progress",value: appliedJobs.filter((j) => j.status !== "Applied").length, color: "text-primary" },
    { label: "Interviews", value: appliedJobs.filter((j) => j.status === "Interview").length, color: "text-emerald-400" },
  ];
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Applications</h2>
          <p className="text-muted-foreground text-sm mt-1">Track every application in one place.</p>
        </div>
        <button className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors">
          <Plus size={13}/> Add
        </button>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-5">
        <button onClick={() => setActiveTab("applied")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${activeTab === "applied" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          <Briefcase size={12}/> Applied
          <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{appliedJobs.length}</span>
        </button>
        <button onClick={() => setActiveTab("saved")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${activeTab === "saved" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          <Heart size={12} className={activeTab === "saved" ? "fill-rose-400 text-rose-400" : ""}/> Saved
          {savedJobs.length > 0 && (
            <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400">{savedJobs.length}</span>
          )}
        </button>
      </div>

      {activeTab === "applied" && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {stats.map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
                <div className={`text-xl sm:text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {appliedJobs.map((job) => (
              <div key={job.id} className={`bg-card border rounded-xl transition-all ${expanded === job.id ? "border-primary/30" : "border-border hover:border-border/60"}`}>
                <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setExpanded(expanded === job.id ? null : job.id)}>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: `${job.logoColor}20`, color: job.logoColor }}>{job.logo}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{job.title}</p>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${job.statusColor}`}>{job.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{job.company}</span>
                      <span className="hidden sm:flex items-center gap-0.5"><CalendarDays size={10}/>{job.appliedDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <ScoreRing score={job.score} size={44}/>
                    <ChevronDown size={14} className={`text-muted-foreground transition-transform ${expanded === job.id ? "rotate-180" : ""}`}/>
                  </div>
                </button>
                {expanded === job.id && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign size={12} className="text-muted-foreground"/>
                      <span className="text-xs text-muted-foreground">{job.salary}</span>
                      <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1"><CalendarDays size={10}/>Applied {job.appliedDate}</span>
                    </div>
                    <div className="overflow-x-auto -mx-1 px-1">
                      <div className="flex items-start min-w-[280px]">
                        {job.pipeline.map((step, i) => (
                          <div key={step.label} className="flex items-center flex-1">
                            <div className="flex flex-col items-center min-w-[44px]">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${step.done ? "bg-primary shadow-[0_0_8px_rgba(99,102,241,0.4)]" : "bg-secondary border border-border"}`}>
                                {step.done && <CheckCircle size={12} className="text-white"/>}
                              </div>
                              <span className={`text-[9px] sm:text-[10px] font-mono mt-1 text-center leading-tight ${step.done ? "text-foreground" : "text-muted-foreground/40"}`}>{step.label}</span>
                              {step.date && <span className="text-[8px] text-muted-foreground font-mono">{step.date}</span>}
                            </div>
                            {i < job.pipeline.length - 1 && (
                              <div className={`flex-1 h-0.5 mb-5 transition-all ${step.done && job.pipeline[i+1].done ? "bg-primary" : "bg-white/5"}`}/>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button className="flex-1 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors">Update Status</button>
                      <button className="flex-1 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:border-rose-500/30 hover:text-rose-400 transition-colors">Withdraw</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === "saved" && (
        <div>
          {savedJobs.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-3">
                <Heart size={20} className="text-rose-400"/>
              </div>
              <p className="font-medium text-sm mb-1">No saved jobs yet</p>
              <p className="text-xs text-muted-foreground">Tap the heart icon on any job in Discover to save it here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedJobs.map((job) => {
                const gaps = job.requiredSkills.filter((r) => (mySkills[r.name] ?? 0) < r.required);
                return (
                  <div key={job.id} className="bg-card border border-border rounded-xl p-4 hover:border-rose-400/25 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: `${job.logoColor}18`, color: job.logoColor }}>{job.logo}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{job.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span>{job.company}</span>
                          <span className="flex items-center gap-0.5"><MapPin size={9}/>{job.location}</span>
                          <span className="hidden sm:flex items-center gap-0.5"><DollarSign size={9}/>{job.salary}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ScoreRing score={job.score} size={40}/>
                        <button onClick={() => onSave(job.id)} className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 transition-all" title="Remove from saved">
                          <Heart size={13} className="fill-rose-400"/>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground font-mono">
                      <span>{job.posted}</span><span>·</span>
                      <span>{job.applicants} applicants</span><span>·</span>
                      <span className={gaps.length === 0 ? "text-emerald-400" : "text-rose-400"}>
                        {gaps.length === 0 ? "All skills met" : `${gaps.length} gap${gaps.length > 1 ? "s" : ""}`}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-all">
                        <ArrowRight size={11}/> Apply Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Stage: Progress & Assessment ──────────────────────────────────────────────

const enrolledCourses = [
  {
    id: 1,
    mentor: "Priya Nair", mentorRole: "Staff Engineer @ Airbnb", avatar: "PN", color: "#6366f1",
    title: "GraphQL Mastery: From Basics to Production",
    totalWeeks: 8, completedWeeks: 3,
    nextSession: "Jun 4, 2026",
    scores: [{ label: "Week 1 Quiz", score: 88 }, { label: "Week 2 Quiz", score: 91 }, { label: "Week 3 Assignment", score: 79 }],
    skills: ["GraphQL", "Apollo Client", "Schema Design"],
    status: "In Progress",
  },
  {
    id: 2,
    mentor: "Sarah Rodriguez", mentorRole: "Senior Engineer @ Airbnb", avatar: "SR", color: "#ec4899",
    title: "React Performance Optimization",
    totalWeeks: 4, completedWeeks: 4,
    nextSession: null,
    scores: [{ label: "Week 1 Quiz", score: 95 }, { label: "Week 2 Assignment", score: 88 }, { label: "Final Project", score: 92 }],
    skills: ["React", "Performance", "Core Web Vitals"],
    status: "Completed",
  },
];

const certProgress = [
  {
    id: 1, provider: "Meta", logo: "Meta", logoColor: "#0866FF", logoBackground: "#0866FF15",
    name: "Meta Front-End Developer Certificate",
    practiceScore: 82, targetScore: 80, passThreshold: 70,
    practiceAttempts: 3, nextExamDate: "Jun 15, 2026",
    topicsReady: ["React", "HTML/CSS", "JavaScript"],
    topicsNeeding: ["Testing", "UI/UX Principles"],
    status: "Ready to Book",
  },
  {
    id: 2, provider: "AWS", logo: "AWS", logoColor: "#FF9900", logoBackground: "#FF990015",
    name: "AWS Certified Developer – Associate",
    practiceScore: 61, targetScore: 72, passThreshold: 72,
    practiceAttempts: 1, nextExamDate: null,
    topicsReady: ["S3", "API Gateway"],
    topicsNeeding: ["Lambda", "DynamoDB", "CloudFormation"],
    status: "Studying",
  },
];

function ProgressStage() {
  const [section, setSection] = useState<"mentorship" | "certifications">("mentorship");

  const overallMentorPct = Math.round(
    enrolledCourses.reduce((sum, c) => sum + (c.completedWeeks / c.totalWeeks) * 100, 0) / enrolledCourses.length
  );
  const certReadyCount = certProgress.filter((c) => c.practiceScore >= c.passThreshold).length;

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Progress & Assessment</h2>
      <p className="text-muted-foreground mb-5 text-sm">Track your mentorship courses and certification exam readiness.</p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: <Users size={14}/>, stat: `${enrolledCourses.length}`, label: "Enrolled Courses", color: "text-primary" },
          { icon: <Activity size={14}/>, stat: `${overallMentorPct}%`, label: "Avg Completion", color: "text-emerald-400" },
          { icon: <BadgeCheck size={14}/>, stat: `${certReadyCount}/${certProgress.length}`, label: "Certs Ready", color: "text-amber-400" },
        ].map((item) => (
          <div key={item.label} className="bg-card border border-border rounded-xl p-3 sm:p-4">
            <div className={`mb-1 ${item.color}`}>{item.icon}</div>
            <div className={`text-xl sm:text-2xl font-bold font-mono ${item.color}`}>{item.stat}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6">
        {(["mentorship", "certifications"] as const).map((t) => (
          <button key={t} onClick={() => setSection(t)}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition-all capitalize ${section === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "mentorship" ? "Mentorship Courses" : "Certification Prep"}
          </button>
        ))}
      </div>

      {section === "mentorship" && (
        <div className="space-y-4">
          {enrolledCourses.map((course) => {
            const pct = Math.round((course.completedWeeks / course.totalWeeks) * 100);
            const avgScore = Math.round(course.scores.reduce((s, q) => s + q.score, 0) / course.scores.length);
            const isComplete = course.status === "Completed";
            return (
              <div key={course.id} className={`bg-card border rounded-xl p-4 sm:p-5 transition-all ${isComplete ? "border-emerald-500/25" : "border-border hover:border-primary/25"}`}>
                {/* Mentor + status */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: `${course.color}25`, color: course.color }}>{course.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{course.mentor}</p>
                    <p className="text-xs text-muted-foreground truncate">{course.mentorRole}</p>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${isComplete ? "text-emerald-400 bg-emerald-400/10" : "text-primary bg-primary/10"}`}>
                    {course.status}
                  </span>
                </div>

                <h3 className="font-semibold text-sm leading-snug mb-3">{course.title}</h3>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground font-mono">{course.completedWeeks}/{course.totalWeeks} weeks</span>
                    <span className="font-mono" style={{ color: course.color }}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: isComplete ? "linear-gradient(90deg,#10b981,#34d399)" : `linear-gradient(90deg,${course.color},#818cf8)` }}/>
                  </div>
                </div>

                {/* Assessment scores */}
                <div className="mb-4">
                  <p className="text-[10px] font-mono text-muted-foreground mb-2">ASSESSMENT SCORES</p>
                  <div className="space-y-1.5">
                    {course.scores.map((q) => (
                      <div key={q.label} className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground flex-1 truncate">{q.label}</span>
                        <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${q.score}%`, background: q.score >= 85 ? "#10b981" : q.score >= 70 ? "#6366f1" : "#f59e0b" }}/>
                        </div>
                        <span className={`text-[10px] font-mono w-8 text-right ${q.score >= 85 ? "text-emerald-400" : q.score >= 70 ? "text-primary" : "text-amber-400"}`}>{q.score}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <BarChart size={11} className="text-muted-foreground"/>
                    <span className="text-xs text-muted-foreground">Average: <span className="text-foreground font-mono">{avgScore}%</span></span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {course.skills.map((s) => <span key={s} className="px-2 py-0.5 bg-secondary text-[10px] font-mono text-muted-foreground rounded">{s}</span>)}
                  </div>
                  {course.nextSession && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                      <CalendarDays size={11}/>
                      <span>Next: {course.nextSession}</span>
                    </div>
                  )}
                  {isComplete && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <CheckCircle size={12}/>
                      <span>Certificate earned</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {section === "certifications" && (
        <div className="space-y-4">
          {certProgress.map((cert) => {
            const isReady = cert.practiceScore >= cert.passThreshold;
            const gap = Math.max(0, cert.targetScore - cert.practiceScore);
            return (
              <div key={cert.id} className={`bg-card border rounded-xl p-4 sm:p-5 transition-all ${isReady ? "border-emerald-500/25" : "border-border hover:border-primary/25"}`}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: cert.logoBackground, color: cert.logoColor }}>{cert.logo}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-snug">{cert.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{cert.provider}</p>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${isReady ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"}`}>
                    {cert.status}
                  </span>
                </div>

                {/* Practice score vs threshold */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground font-mono">Practice Score</span>
                    <span className={`font-mono ${isReady ? "text-emerald-400" : "text-amber-400"}`}>
                      {cert.practiceScore}% {isReady ? "✓" : `(need ${cert.passThreshold}%)`}
                    </span>
                  </div>
                  <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="absolute h-full rounded-full opacity-20" style={{ left: `${cert.passThreshold}%`, width: "2px", background: "#ffffff" }}/>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${cert.practiceScore}%`, background: isReady ? "linear-gradient(90deg,#10b981,#34d399)" : "linear-gradient(90deg,#f59e0b,#fbbf24)" }}/>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{cert.practiceAttempts} practice attempt{cert.practiceAttempts !== 1 ? "s" : ""}</span>
                    {!isReady && <span className="text-[10px] text-muted-foreground">Gap: <span className="text-rose-400">–{gap}%</span></span>}
                  </div>
                </div>

                {/* Topic readiness */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground mb-1.5">TOPICS READY</p>
                    <div className="flex flex-wrap gap-1">
                      {cert.topicsReady.map((t) => (
                        <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono rounded-full">
                          <CheckCircle size={8}/>{t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground mb-1.5">NEEDS WORK</p>
                    <div className="flex flex-wrap gap-1">
                      {cert.topicsNeeding.map((t) => (
                        <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[10px] font-mono rounded-full">
                          <AlertCircle size={8}/>{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-col sm:flex-row">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors">
                    <FlaskConical size={12}/> Practice Again
                  </button>
                  {isReady ? (
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-colors">
                      <ExternalLink size={12}/> Book Exam {cert.nextExamDate && `· ${cert.nextExamDate}`}
                    </button>
                  ) : (
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-secondary border border-border rounded-lg text-xs font-medium text-muted-foreground cursor-not-allowed opacity-60">
                      <ExternalLink size={12}/> Book Exam (not ready yet)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Stage: Roadmap ────────────────────────────────────────────────────────────

function RoadmapStage() {
  const [expanded, setExpanded] = useState<number | null>(2);
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Career Roadmap</h2>
      <p className="text-muted-foreground mb-2 text-sm">Your personalised path to Senior Full-Stack Engineer.</p>
      <div className="flex items-center gap-2 mb-7">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400/10 border border-emerald-400/20 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
          <span className="text-xs font-mono text-emerald-400">Phase 1 Active</span>
        </div>
        <span className="text-xs text-muted-foreground">Est. completion: Oct 2026</span>
      </div>
      <div className="relative">
        <div className="absolute left-5 top-6 bottom-6 w-px bg-border hidden sm:block"/>
        <div className="space-y-4">
          {roadmapPhases.map((phase) => {
            const isExpanded = expanded === phase.id;
            const isComplete = phase.status === "complete";
            const isActive = phase.status === "active";
            return (
              <div key={phase.id} className="relative sm:pl-14">
                <div className="hidden sm:flex absolute left-0 top-4 w-10 h-10 rounded-full items-center justify-center border-2 transition-all"
                  style={{ borderColor: isComplete ? "#10b981" : isActive ? phase.color : "rgba(255,255,255,0.1)", background: isComplete ? "#10b98120" : isActive ? `${phase.color}20` : "transparent" }}>
                  {isComplete ? <CheckCircle size={16} className="text-emerald-400"/> : isActive ? <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: phase.color }}/> : <div className="w-2.5 h-2.5 rounded-full bg-white/10"/>}
                </div>
                <div className={`bg-card border rounded-xl transition-all ${isActive ? "border-primary/30" : isComplete ? "border-emerald-500/20" : "border-border"}`}>
                  <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setExpanded(isExpanded ? null : phase.id)}>
                    <div className="sm:hidden w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
                      style={{ borderColor: isComplete ? "#10b981" : isActive ? phase.color : "rgba(255,255,255,0.1)", background: `${phase.color}15` }}>
                      {isComplete ? <CheckCircle size={14} className="text-emerald-400"/> : <GraduationCap size={13} style={{ color: phase.color }}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs font-mono shrink-0" style={{ color: phase.color }}>{phase.phase}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{phase.range}</span>
                        {isActive && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary">Active</span>}
                        {isComplete && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Complete</span>}
                      </div>
                      <p className="font-semibold text-sm">{phase.title}</p>
                    </div>
                    <ChevronDown size={14} className={`text-muted-foreground transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}/>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border/50 pt-4 space-y-4">
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground mb-2">SKILLS</p>
                        <div className="flex flex-wrap gap-1.5">
                          {phase.skills.map((s) => (
                            <span key={s} className="px-2.5 py-1 rounded-full text-xs font-mono border"
                              style={{ borderColor: `${phase.color}40`, color: phase.color, background: `${phase.color}10` }}>{s}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground mb-2">ACTIONS</p>
                        <div className="space-y-2">
                          {phase.actions.map((a, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <ChevronRight size={12} className="mt-0.5 shrink-0" style={{ color: isComplete ? "#10b981" : phase.color }}/>
                              <span className={isComplete ? "line-through text-muted-foreground" : "text-foreground"}>{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {isActive && (
                        <button className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
                          <Layers size={12}/> View Recommended Courses
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Stage: Mentorship ─────────────────────────────────────────────────────────

function MentorshipStage() {
  const [applied, setApplied] = useState<number[]>([]);

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Mentorship</h2>
      <p className="text-muted-foreground mb-2 text-sm">Courses created and taught by industry mentors. Apply to join a cohort.</p>
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
          <Brain size={11} className="text-primary"/>
          <span className="text-xs font-mono text-primary">Mentor-led · Live sessions</span>
        </div>
        <span className="text-xs text-muted-foreground">{mentorCourses.length} courses available</span>
      </div>

      <div className="space-y-4">
        {mentorCourses.map((course) => {
          const isApplied = applied.includes(course.id);
          return (
            <div key={course.id} className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-primary/20 transition-all">
              {/* Mentor header */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: `${course.mentor.color}25`, color: course.mentor.color }}>
                  {course.mentor.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{course.mentor.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{course.mentor.role}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                    <Star size={10} className="text-amber-400"/>{course.mentor.rating}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{course.mentor.students.toLocaleString()} students</p>
                </div>
              </div>

              {/* Course info */}
              <div className="mb-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${course.badgeColor}`}>{course.badge}</span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">{course.level}</span>
                    </div>
                    <h3 className="font-semibold text-sm leading-snug">{course.title}</h3>
                  </div>
                  <p className="text-sm font-bold font-mono text-foreground shrink-0">{course.price}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{course.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {course.skills.map((s) => <span key={s} className="px-2 py-0.5 bg-secondary text-xs font-mono text-muted-foreground rounded">{s}</span>)}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { icon: <Clock size={10}/>, label: course.duration },
                    { icon: <PlayCircle size={10}/>, label: course.sessions },
                    { icon: <CalendarDays size={10}/>, label: `Starts ${course.nextStart}` },
                    { icon: <Users size={10}/>, label: `${course.spots} spots left` },
                  ].map((m) => (
                    <div key={m.label} className="flex items-start gap-1.5 text-muted-foreground">
                      <span className="mt-0.5 shrink-0">{m.icon}</span>
                      <span className="leading-tight">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress bar: spots filling up */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{course.enrolled} enrolled</span>
                  <span>{course.spots} spots left</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min(100, (course.enrolled / (course.enrolled + course.spots)) * 100)}%` }}/>
                </div>
              </div>

              <button
                onClick={() => setApplied(isApplied ? applied.filter((x) => x !== course.id) : [...applied, course.id])}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${isApplied ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
                {isApplied ? "✓ Application Submitted" : "Apply for This Course"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stage: Certifications ─────────────────────────────────────────────────────

const CERT_CATEGORIES = ["All", "Cloud", "Frontend", "Database", "DevOps"];

function CertificationsStage() {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? certifications : certifications.filter((c) => c.category === filter);

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Certifications</h2>
      <p className="text-muted-foreground mb-2 text-sm">Industry certifications sourced from official partner websites.</p>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400/10 border border-emerald-400/20 rounded-full">
          <ShieldCheck size={11} className="text-emerald-400"/>
          <span className="text-xs font-mono text-emerald-400">Official Partners</span>
        </div>
        <span className="text-xs text-muted-foreground">Links to practice exams + official exam portals</span>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CERT_CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((cert) => (
          <div key={cert.id} className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-primary/20 transition-all">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: cert.logoBackground, color: cert.logoColor }}>
                {cert.logo}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">{cert.level}</span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">{cert.category}</span>
                      {cert.partnerBadge === "Featured" && (
                        <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">Featured</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm leading-snug">{cert.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{cert.provider} · {cert.cost}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-mono text-muted-foreground mb-1">Relevance</p>
                    <div className="flex items-center gap-1 justify-end">
                      <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${cert.relevance}%` }}/>
                      </div>
                      <span className="text-[10px] font-mono text-primary">{cert.relevance}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-3">{cert.description}</p>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {cert.skills.map((s) => <span key={s} className="px-2 py-0.5 bg-secondary text-xs font-mono text-muted-foreground rounded">{s}</span>)}
            </div>

            <div className="flex gap-2 flex-col sm:flex-row">
              <a href={cert.practiceUrl}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors">
                <FlaskConical size={13}/> Practice Exam
              </a>
              <a href={cert.examUrl}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
                <ExternalLink size={13}/> Official Exam Portal
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-secondary/50 border border-border rounded-xl">
        <div className="flex items-start gap-3">
          <ShieldCheck size={16} className="text-muted-foreground mt-0.5 shrink-0"/>
          <div>
            <p className="text-xs font-medium mb-1">Partner data note</p>
            <p className="text-xs text-muted-foreground">Certification details, pricing, and exam links are sourced from official partner websites. Prices may vary. Always verify on the provider's official portal before purchasing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin Panel ───────────────────────────────────────────────────────────────

function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"users" | "courses" | "certifications" | "mentors" | "employers" | "revenue" | "cms" | "analytics">("analytics");

  const tabs = [
    { id: "analytics" as const, label: "Analytics", icon: <BarChart2 size={13}/> },
    { id: "users" as const, label: "Users", icon: <Users size={13}/> },
    { id: "courses" as const, label: "Courses", icon: <BookOpen size={13}/> },
    { id: "certifications" as const, label: "Certifications", icon: <BadgeCheck size={13}/> },
    { id: "mentors" as const, label: "Mentors", icon: <UserCheck size={13}/> },
    { id: "employers" as const, label: "Employers", icon: <Briefcase size={13}/> },
    { id: "revenue" as const, label: "Revenue", icon: <DollarSign size={13}/> },
    { id: "cms" as const, label: "CMS", icon: <FileText size={13}/> },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings size={20} className="text-primary"/>
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Admin Panel</h2>
          <p className="text-muted-foreground text-sm">Platform management and analytics</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Users", value: adminAnalytics.totalUsers.toLocaleString(), icon: <Users size={16}/>, color: "text-primary" },
              { label: "Active Users", value: adminAnalytics.activeUsers.toLocaleString(), icon: <Activity size={16}/>, color: "text-emerald-400" },
              { label: "Total Revenue", value: `$${adminAnalytics.totalRevenue.toLocaleString()}`, icon: <DollarSign size={16}/>, color: "text-amber-400" },
              { label: "Active Courses", value: adminAnalytics.activeCourses, icon: <BookOpen size={16}/>, color: "text-sky-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                  <span className={stat.color}>{stat.icon}</span>
                </div>
                <p className="text-xl font-bold font-mono">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-4">Platform Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">New Users (30d)</p>
                <p className="text-lg font-bold font-mono">{adminAnalytics.newUsers.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pending Approvals</p>
                <p className="text-lg font-bold font-mono text-amber-400">{adminAnalytics.pendingApprovals}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Avg Session Time</p>
                <p className="text-lg font-bold font-mono">{adminAnalytics.avgSessionTime}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Conversion Rate</p>
                <p className="text-lg font-bold font-mono text-emerald-400">{adminAnalytics.conversionRate}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-4">Revenue Trend (Last 5 Months)</h3>
            <div className="space-y-2">
              {adminRevenueData.map((data) => (
                <div key={data.month} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-8">{data.month}</span>
                  <div className="flex-1 h-8 bg-secondary rounded-lg overflow-hidden relative">
                    <div className="absolute h-full bg-primary/20" style={{ width: `${(data.total / 120000) * 100}%` }}/>
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono">${data.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{adminUsers.length} total users</p>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors">
              <Plus size={12}/> Add User
            </button>
          </div>
          <div className="space-y-2">
            {adminUsers.map((user) => (
              <div key={user.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary">{user.role}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      user.status === "active" ? "bg-emerald-500/15 text-emerald-400" :
                      user.status === "pending" ? "bg-amber-400/15 text-amber-400" :
                      "bg-rose-500/15 text-rose-400"
                    }`}>{user.status}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors"><Eye size={14} className="text-muted-foreground"/></button>
                    <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors"><Edit size={14} className="text-muted-foreground"/></button>
                    <button className="p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"><Ban size={14} className="text-rose-400"/></button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Joined {user.joined}</span>
                  <span>·</span>
                  <span>{user.applications} applications</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Courses Tab */}
      {activeTab === "courses" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{adminCourses.length} courses</p>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors">
              <Plus size={12}/> Add Course
            </button>
          </div>
          <div className="space-y-3">
            {adminCourses.map((course) => (
              <div key={course.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{course.title}</h3>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        course.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-400/15 text-amber-400"
                      }`}>{course.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">by {course.mentor}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users size={11}/>{course.students} students</span>
                      <span className="flex items-center gap-1"><DollarSign size={11}/>{course.revenue}</span>
                      {course.rating > 0 && <span className="flex items-center gap-1"><Star size={11} className="fill-amber-400 text-amber-400"/>{course.rating}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors"><Edit size={14} className="text-muted-foreground"/></button>
                    <button className="p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 size={14} className="text-rose-400"/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications Tab */}
      {activeTab === "certifications" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{adminCertApprovals.length} pending approvals</p>
          </div>
          <div className="space-y-3">
            {adminCertApprovals.map((cert) => (
              <div key={cert.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm mb-0.5">{cert.userName}</p>
                    <p className="text-xs text-muted-foreground mb-1">{cert.certName} · {cert.provider}</p>
                    <p className="text-xs text-muted-foreground">Submitted {cert.submittedDate}</p>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
                    cert.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-400/15 text-amber-400"
                  }`}>{cert.status}</span>
                </div>
                {cert.status === "pending" && (
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors">
                      Approve
                    </button>
                    <button className="flex-1 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-medium hover:bg-rose-500/20 transition-colors">
                      Reject
                    </button>
                    <button className="px-3 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                      <Eye size={14}/>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mentors Tab */}
      {activeTab === "mentors" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{adminMentorVerifications.filter(m => m.status === "pending").length} pending verifications</p>
          </div>
          <div className="space-y-3">
            {adminMentorVerifications.map((mentor) => (
              <div key={mentor.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm mb-0.5">{mentor.name}</p>
                    <p className="text-xs text-muted-foreground mb-1">{mentor.email}</p>
                    <p className="text-xs text-muted-foreground mb-1">Expertise: {mentor.expertise}</p>
                    <p className="text-xs text-muted-foreground">Experience: {mentor.experience}</p>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
                    mentor.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-400/15 text-amber-400"
                  }`}>{mentor.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Applied {mentor.applied}</p>
                {mentor.status === "pending" && (
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors">
                      Approve
                    </button>
                    <button className="flex-1 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-medium hover:bg-rose-500/20 transition-colors">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employers Tab */}
      {activeTab === "employers" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{adminEmployerVerifications.filter(e => e.status === "pending").length} pending verifications</p>
          </div>
          <div className="space-y-3">
            {adminEmployerVerifications.map((employer) => (
              <div key={employer.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm mb-0.5">{employer.company}</p>
                    <p className="text-xs text-muted-foreground mb-1">{employer.contact}</p>
                    <p className="text-xs text-muted-foreground mb-1">Industry: {employer.industry}</p>
                    <p className="text-xs text-muted-foreground">Company Size: {employer.size} employees</p>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
                    employer.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-400/15 text-amber-400"
                  }`}>{employer.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Applied {employer.applied}</p>
                {employer.status === "pending" && (
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors">
                      Approve
                    </button>
                    <button className="flex-1 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-medium hover:bg-rose-500/20 transition-colors">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">This Month</p>
              <p className="text-2xl font-bold font-mono text-emerald-400">$120k</p>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <TrendingUp size={10}/> +7.1% from last month
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Avg per User</p>
              <p className="text-2xl font-bold font-mono">$3.73</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">YTD Revenue</p>
              <p className="text-2xl font-bold font-mono">$513k</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-4">Revenue by Source</h3>
            <div className="space-y-3">
              {[
                { source: "Subscriptions", amount: 58000, percent: 48.3, color: "bg-primary" },
                { source: "Course Sales", amount: 48000, percent: 40.0, color: "bg-emerald-400" },
                { source: "Certifications", amount: 14000, percent: 11.7, color: "bg-amber-400" },
              ].map((item) => (
                <div key={item.source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{item.source}</span>
                    <span className="text-xs font-mono">${item.amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-4">Monthly Breakdown</h3>
            <div className="space-y-2">
              {adminRevenueData.map((data) => (
                <div key={data.month} className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded-lg transition-colors">
                  <span className="text-xs font-mono text-muted-foreground">{data.month}</span>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-primary">${data.subscriptions.toLocaleString()}</span>
                    <span className="text-emerald-400">${data.courses.toLocaleString()}</span>
                    <span className="text-amber-400">${data.certifications.toLocaleString()}</span>
                    <span className="font-bold">${data.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CMS Tab */}
      {activeTab === "cms" && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "Job Listings", count: jobListings.length, icon: <Briefcase size={16}/> },
              { title: "Mentor Courses", count: 4, icon: <BookOpen size={16}/> },
              { title: "Certifications", count: certifications.length, icon: <BadgeCheck size={16}/> },
              { title: "Announcements", count: 3, icon: <Flag size={16}/> },
            ].map((item) => (
              <div key={item.title} className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {item.icon}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{item.count} items</span>
                </div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <button className="text-xs text-primary hover:underline">Manage →</button>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-4">Recent Content Updates</h3>
            <div className="space-y-3">
              {[
                { action: "Added new job", item: "Sr. Frontend Engineer at Stripe", time: "2 hours ago" },
                { action: "Updated course", item: "GraphQL Zero to Production", time: "5 hours ago" },
                { action: "Published announcement", item: "New AI Matching Algorithm", time: "1 day ago" },
              ].map((update, i) => (
                <div key={i} className="flex items-center gap-3 p-2 hover:bg-secondary/50 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-primary"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{update.action}</p>
                    <p className="text-xs text-muted-foreground truncate">{update.item}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{update.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────

export default function App() {
  const [stage, setStage] = useState<Stage>("landing");
  const [visited, setVisited] = useState<Set<Stage>>(new Set(["landing"]));
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("admin"); // Default to admin to showcase admin panel
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [savedIds, setSavedIds] = useState<number[]>([]);

  function toggleSave(id: number) {
    setSavedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function navigate(s: Stage) {
    setStage(s); setVisited((p) => new Set([...p, s]));
    setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openProfile() {
    setMenuOpen(false);
    setProfileOpen(true);
  }

  function getRoleLabel(role: UserRole): string {
    switch (role) {
      case "student": return "Student";
      case "job-seeker": return "Job Seeker";
      case "mentor": return "Mentor";
      case "employer": return "Employer";
      case "admin": return "Admin";
    }
  }

  // Filter stages based on user role
  const visibleStages = STAGES.filter(s => !s.adminOnly || userRole === "admin");

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  function renderStage() {
    switch (stage) {
      case "landing":        return <DiscoverStage onOpenAuth={() => setAuthOpen(true)} userRole={userRole} savedIds={savedIds} onSave={toggleSave}/>;
      case "applications":   return <ApplicationsStage savedIds={savedIds} onSave={toggleSave}/>;
      case "progress":       return <ProgressStage/>;
      case "roadmap":        return <RoadmapStage/>;
      case "mentorship":     return <MentorshipStage/>;
      case "certifications": return <CertificationsStage/>;
      case "admin":          return <AdminPanel/>;
    }
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${theme === "dark" ? "dark" : ""}`} style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row flex-1">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-border flex-col py-6 px-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center"><Zap size={14} className="text-white"/></div>
          <span className="font-bold text-sm tracking-tight">CareerAI</span>
        </div>
        <nav className="space-y-0.5 flex-1 overflow-y-auto">
          {visibleStages.map((s) => {
            const isActive = s.id === stage;
            const wasVisited = visited.has(s.id) && !isActive;
            return (
              <button key={s.id} onClick={() => navigate(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left group ${isActive ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
                <span className={`transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}>
                  {s.icon}
                </span>
                {s.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border pt-4 mt-4 space-y-2">
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors group">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
              {theme === "dark" ? <Sun size={14} className="text-muted-foreground group-hover:text-foreground transition-colors"/> : <Moon size={14} className="text-muted-foreground group-hover:text-foreground transition-colors"/>}
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          </button>
          <button onClick={openProfile}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors group text-left">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">AK</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">Aarav Kumar</p>
              <p className="text-[10px] text-muted-foreground truncate">{getRoleLabel(userRole)}</p>
            </div>
            <UserCircle size={13} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0"/>
          </button>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-background z-30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center"><Zap size={12} className="text-white"/></div>
          <span className="font-bold text-sm">CareerAI</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            {theme === "dark" ? <Sun size={16} className="text-muted-foreground"/> : <Moon size={16} className="text-muted-foreground"/>}
          </button>
          <button onClick={() => setAuthOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-primary/30 text-primary rounded-lg text-xs font-medium hover:bg-primary/10 transition-colors">
            <User size={12}/> Sign Up
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-muted-foreground hover:text-foreground transition-colors p-1"><Menu size={20}/></button>
        </div>
      </header>

      {/* ── Mobile slide menu ── */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-bold text-sm">Navigation</span>
            <button onClick={() => setMenuOpen(false)} className="text-muted-foreground hover:text-foreground p-1"><X size={20}/></button>
          </div>
          <nav className="p-4 space-y-1 overflow-y-auto flex-1">
            {visibleStages.map((s) => {
              const isActive = s.id === stage;
              const wasVisited = visited.has(s.id) && !isActive;
              return (
                <button key={s.id} onClick={() => navigate(s.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all text-left ${isActive ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
                  <span className={isActive ? "text-primary" : "text-muted-foreground"}>
                    {s.icon}
                  </span>
                  <span className="flex-1">{s.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary"/>}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-border p-4 space-y-2">
            <button onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors group">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                {theme === "dark" ? <Sun size={18} className="text-muted-foreground group-hover:text-foreground transition-colors"/> : <Moon size={18} className="text-muted-foreground group-hover:text-foreground transition-colors"/>}
              </div>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              </span>
            </button>
            <button onClick={openProfile}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors group text-left">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">AK</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Aarav Kumar</p>
                <p className="text-xs text-muted-foreground">{getRoleLabel(userRole)} · tap to edit profile</p>
              </div>
              <UserCircle size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0"/>
            </button>
          </div>
        </div>
      )}

      {/* ── Auth panel ── */}
      {authOpen && <AuthPanel onClose={() => setAuthOpen(false)}/>}

      {/* ── Profile panel ── */}
      {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} userRole={userRole} setUserRole={setUserRole}/>}

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 pb-24 md:pb-10">
          <NavProgress current={stage}/>
          {renderStage()}
        </div>
      </main>

      {/* ── Mobile bottom tabs ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="flex items-center overflow-x-auto">
          {visibleStages.map((s) => {
            const isActive = s.id === stage;
            const wasVisited = visited.has(s.id) && !isActive;
            return (
              <button key={s.id} onClick={() => navigate(s.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 min-w-[52px] transition-all active:scale-95 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                <span>{s.icon}</span>
                <span className="text-[8px] font-mono leading-none whitespace-nowrap">{s.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </nav>
      </div>
    </div>
  );
}
