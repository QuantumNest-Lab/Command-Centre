"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Folder,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
  Sun,
  Video,
  ListTodo,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Palette,
  Eye,
  Monitor,
  Moon,
  RotateCcw,
  Droplets,
  Building2,
  Mail,
  MapPin,
  Phone,
  Link,
  Upload,
  Info,
  Landmark,
  Save,
  Globe2,
  LockKeyhole,
  Smartphone,
  MessageSquare,
  ExternalLink,
  KeyRound,
  Circle,
  Star,
  ImageIcon,
  Clock,
  ArrowRight,
  UserPlus,
  Crown,
  LogOut,
  UserRound,
  UserRoundPen,
  Archive,
  Zap,
  FileSearch,
  Pencil,
  Sparkles,
} from "lucide-react";
import {
  activities,
  clients,
  folders,
  projects,
  type Project,
  type Client,
  type Activity as ActivityRecord,
} from "@/lib/qnl-mock";
import { routes } from "@/lib/routes";
import { navigationItems } from "@/lib/navigation";
import { Modal, FormField } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui/feedback";
import { TeamWorkspace as Team } from "@/components/team-workspace";
import { ClientEditDialog } from "@/components/client-edit-dialog";
import { ClientCreateDialog } from "@/components/client-create-dialog";
import { ProjectCreateDialog } from "@/components/project-create-dialog";
import { RequirementCreateDialog } from "@/components/requirement-create-dialog";
import { TaskCreateDialog } from "@/components/task-create-dialog";
import { CalendarWorkspace } from "@/components/calendar/calendar-workspace";
import { ProjectsWorkspace } from "@/components/projects/projects-workspace";
import { RequirementsWorkspace } from "@/components/requirements/requirements-workspace";
import type { ApiClient } from "@/lib/client";

type View =
  | "dashboard"
  | "clients"
  | "projects"
  | "requirements"
  | "tasks"
  | "activity"
  | "drive"
  | "meetings"
  | "calendar"
  | "documents"
  | "finance"
  | "approvals"
  | "team"
  | "settings";
type ActiveModal =
  | "client"
  | "project"
  | "requirement"
  | "task"
  | "meeting"
  | "document"
  | "payment"
  | "approval"
  | "invite"
  | "upload"
  | null;

type ClientActivity = {
  id: string;
  type: "CREATED" | "UPDATED" | "ARCHIVED" | "STATUS_CHANGED";
  description: string;
  actor: string | null;
  time: string;
};
type ClientRelatedRecord = {
  id: string;
  type: "project" | "requirement" | "task" | "meeting" | "document" | "finance";
  title: string;
  status: string;
  timestamp: string;
};
type Requirement = {
  id: string;
  code?: string;
  title: string;
  client: string;
  project: string;
  status: "Requested" | "Reviewing" | "In Progress" | "Approved";
  priority: "High" | "Medium" | "Low";
  owner: string;
  source?: string;
  updated?: string;
};
const navigationIcons: Record<string, React.ElementType> = { dashboard: LayoutDashboard, clients: Users, projects: BriefcaseBusiness, requirements: ClipboardList, tasks: ListTodo, activity: Activity, drive: Folder, meetings: Video, calendar: CalendarDays, documents: FileText, finance: CreditCard, approvals: ShieldCheck, team: Users, settings: Settings };
const nav = navigationItems.map(item => ({ ...item, icon: navigationIcons[item.id] }));
const viewPermissions: Partial<Record<View, string>> = {
  clients: "clients.view",
  projects: "projects.view",
  requirements: "requirements.view",
  tasks: "tasks.view",
  activity: "activity.view",
  drive: "drive.view",
  meetings: "meetings.view",
  calendar: "tasks.view",
  documents: "documents.view",
  finance: "finance.view",
  approvals: "approvals.view",
  team: "team.view",
  settings: "settings.view",
};
const requirements: Requirement[] = [
  {
    id: "REQ-0041",
    title: "Cash Bill / Regular Bill",
    client: "Mara Coffee",
    project: "QNL Books",
    status: "In Progress",
    priority: "High",
    owner: "Ananya Rao",
  },
  {
    id: "REQ-0038",
    title: "Student attendance export",
    client: "Morning Star Public School",
    project: "QNL Campus Deployment",
    status: "Reviewing",
    priority: "Medium",
    owner: "Vikram Singh",
  },
  {
    id: "REQ-0031",
    title: "Homepage content approval",
    client: "Sri Basaveshwara English High School",
    project: "School Website",
    status: "Requested",
    priority: "High",
    owner: "Ananya Rao",
  },
  {
    id: "REQ-0028",
    title: "Brand asset handoff",
    client: "MS Tuff",
    project: "Corporate Website",
    status: "Approved",
    priority: "Low",
    owner: "Meera Nair",
  },
];
const initialTasks = [
  {
    id: "TASK-0104",
    title: "Implement Cash Bill Mode",
    client: "Mara Coffee",
    project: "QNL Books",
    status: "In Progress",
    owner: "Ananya Rao",
    priority: "High",
    due: "18 Sep 2026",
  },
  {
    id: "TASK-0105",
    title: "Add invoice print template",
    client: "Mara Coffee",
    project: "QNL Books",
    status: "Reviewing",
    owner: "Vikram Singh",
    priority: "Medium",
    due: "20 Sep 2026",
  },
  {
    id: "TASK-0112",
    title: "Verify deployment checklist",
    client: "Morning Star Public School",
    project: "QNL Campus Deployment",
    status: "Done",
    owner: "Ananya Rao",
    priority: "Low",
    due: "12 Sep 2026",
  },
];
const documents = [
  {
    id: "INV-2026-0042",
    type: "Invoice",
    client: "Mara Coffee",
    project: "QNL Books",
    amount: "₹49,560",
    status: "Partially Paid",
  },
  {
    id: "QUO-2026-0018",
    type: "Quotation",
    client: "Morning Star Public School",
    project: "QNL Campus Deployment",
    amount: "₹1,18,500",
    status: "Sent",
  },
  {
    id: "APR-0019",
    type: "Approval",
    client: "Sri Basaveshwara English High School",
    project: "School Website",
    amount: "—",
    status: "Requested",
  },
  {
    id: "BIL-2026-007",
    type: "Bill",
    client: "MS Tuff",
    project: "Corporate Website",
    amount: "₹18,400",
    status: "Draft",
  },
];
const tone = (s: string) =>
  ["Paid", "Done", "Approved", "Active", "Complete"].includes(s)
    ? "green"
    : ["Overdue", "Rejected", "Changes Requested"].includes(s)
      ? "red"
      : ["In Progress", "Reviewing", "Sent"].includes(s)
        ? "blue"
        : "amber";
function Badge({
  children,
  tone: t = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge badge-${t}`}>{children}</span>;
}
type DropdownOption = { value: string; label: string };
function AppDropdown({ value, options, onChange, ariaLabel, className = '' }: { value: string; options: DropdownOption[]; onChange: (value: string) => void; ariaLabel: string; className?: string }) {
  const [open, setOpen] = useState(false), root = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value) || options[0];
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return <div className={`app-dropdown ${className}`} ref={root}>
    <button type="button" className="app-dropdown-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
      <span>{selected.label}</span><ChevronDown size={14} aria-hidden="true" />
    </button>
    {open && <div className="app-dropdown-menu" role="listbox" aria-label={ariaLabel}>
      {options.map(option => <button key={option.value} type="button" role="option" aria-selected={option.value === value} className={option.value === value ? 'selected' : ''} onClick={() => { onChange(option.value); setOpen(false); }}><span>{option.label}</span>{option.value === value && <Check size={13} aria-hidden="true" />}</button>)}
    </div>}
  </div>;
}
function CompanyField({
  label,
  icon: Icon,
  value,
  onChange,
  required = false,
  options,
}: any) {
  return (
    <label className="company-field">
      <span>
        {label}
        {required && <b>*</b>}
      </span>
      <div className="company-input">
        <Icon size={15} />
        {options ? (
          <select value={value} onChange={onChange}>
            {options.map((option: string) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        ) : (
          <input value={value} onChange={onChange} />
        )}
      </div>
    </label>
  );
}
function CompanyPhoneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const countryCodes = [
    "+91 India",
    "+1 United States",
    "+44 United Kingdom",
    "+61 Australia",
    "+971 UAE",
    "+65 Singapore",
  ];
  const match =
    countryCodes.find((item) => value.startsWith(item.split(" ")[0])) ||
    countryCodes[0];
  const code = match.split(" ")[0],
    number = value.replace(/^\+\d+\s*/, "");
  return (
    <label className="company-field">
      <span>Phone</span>
      <div className="company-input company-phone-input">
        <Phone size={15} />
        <AppDropdown
          ariaLabel="Country calling code"
          value={match}
          onChange={(selected) => onChange(`${selected.split(" ")[0]} ${number}`)}
          options={countryCodes.map((item) => ({ value: item, label: item }))}
          className="country-code-dropdown"
        />
        <input
          aria-label="Phone number"
          value={number}
          onChange={(event) => onChange(`${code} ${event.target.value}`)}
        />
      </div>
    </label>
  );
}
function SectionTitle({
  action,
  onAction,
}: {
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}) {
  return action ? (
    <div className="module-actions">
      <button className="button button-primary" onClick={onAction}>
        <Plus size={14} />
        {action}
      </button>
    </div>
  ) : null;
}
function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="search-box">
      <Search size={14} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
function TableEmpty({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}
function Linked({
  records,
  onOpen,
}: {
  records: string[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="linked-records">
      <span>Linked records</span>
      {records.map((r) => (
        <button key={r} onClick={() => onOpen(r)}>
          {r}
          <ArrowUpRight size={11} />
        </button>
      ))}
    </div>
  );
}

function Page() {
  const pathname = usePathname(),
    params = useSearchParams(),
    router = useRouter();
  const sidebarNavRef = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light"),
    [density, setDensity] = useState<"compact" | "comfortable">("compact"),
    [accent, setAccent] = useState("#3195ff"),
    [sidebarWidth, setSidebarWidth] = useState(165),
    [preferencesReady, setPreferencesReady] = useState(false);
  const [palette, setPalette] = useState(false),
    [modal, setModal] = useState<ActiveModal>(null),
    [dialogRecoveryReady, setDialogRecoveryReady] = useState(false),
    [drawer, setDrawer] = useState<string | null>(null),
    [toast, setToast] = useState(""),
    [companyLogo, setCompanyLogo] = useState(""),
    [clientRows, setClientRows] = useState<Client[]>([]),
    [clientStats, setClientStats] = useState({ total: 0, active: 0 }),
    [projectRows, setProjectRows] = useState<Project[]>([]),
    [projectLoading, setProjectLoading] = useState(true),
    [projectError, setProjectError] = useState(""),
    [requirementRows, setRequirementRows] = useState<Requirement[]>([]),
    [requirementLoading, setRequirementLoading] = useState(true),
    [requirementError, setRequirementError] = useState(""),
    [tasks, setTasks] = useState<Array<{ id: string; title: string; client: string; project: string; owner: string; due: string; status: string }>>([]),
    [documentSummary, setDocumentSummary] = useState({ total: 0, drafts: 0, inProgress: 0 }),
    [quickCreateOpen, setQuickCreateOpen] = useState(false),
    [attentionOpen, setAttentionOpen] = useState(false),
    [attention, setAttention] = useState({ overdueTasks: 0, blockedTasks: 0, pendingApprovals: 0 }),
    [accountOpen, setAccountOpen] = useState(false),
    [profileOpen, setProfileOpen] = useState(false),
    [account, setAccount] = useState({ name: "Account", email: "" }),
    [permissions, setPermissions] = useState<string[]>([]),
    [role, setRole] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const pathParts = pathname.split("/").filter(Boolean),
    view = (pathParts[0] || "dashboard") as View,
    sub = pathParts[1] || "";
  const hasContextualToolbar = ["clients", "projects", "requirements", "tasks", "settings"].includes(view);
  const documentsRoot = view === "documents" && !sub;
  useEffect(() => { const update = (event: Event) => { const detail = (event as CustomEvent<{ total: number; drafts: number; inProgress: number }>).detail; if (detail) setDocumentSummary(detail); }; window.addEventListener('qnl:document-summary', update); return () => window.removeEventListener('qnl:document-summary', update); }, []);
  useEffect(() => {
    const activeChild = sidebarNavRef.current?.querySelector<HTMLButtonElement>(".nav-children button.active");
    activeChild?.scrollIntoView({ block: "nearest" });
  }, [pathname]);
  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };
  const openNotifications = useCallback(() => {
    setAttentionOpen(true);
    void fetch("/api/dashboard").then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Unable to load notifications.");
      setAttention(body.attention);
    }).catch((cause) => showToast(cause instanceof Error ? cause.message : "Unable to load notifications."));
  }, [showToast]);
  const syncDashboardAttention = useCallback((nextAttention: { overdueTasks: number; blockedTasks: number; pendingApprovals: number }) => {
    setAttention(nextAttention);
    if (nextAttention.overdueTasks || nextAttention.blockedTasks || nextAttention.pendingApprovals) {
      const sessionKey = "qnl-dashboard-attention-seen";
      if (!window.sessionStorage.getItem(sessionKey)) {
        window.sessionStorage.setItem(sessionKey, "true");
        setAttentionOpen(true);
      }
    }
  }, []);
  const initials =
    account.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "AR";
  const signOut = async () => {
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out.");
      router.replace("/sign-in");
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to sign out.");
    }
  };
  const saveProfile = async (data: { name: string; email: string }) => {
    try {
      const names = data.name.trim().split(/\s+/),
        response = await fetch("/api/account", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            firstName: names[0],
            lastName: names.slice(1).join(" "),
            displayName: data.name,
            email: data.email,
          }),
        });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message || "Unable to save profile.");
      setAccount({ name: body.name, email: body.email });
      setProfileOpen(false);
      showToast("Profile saved");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to save profile.",
      );
    }
  };
  const go = (path: string) => router.push(path);
  const loadClients = async () => {
    try {
      const response = await fetch("/api/clients?limit=100", {
        credentials: "include",
      });
      const body: { items: ApiClient[]; total: number; error?: { message?: string } } =
        await response.json();
      if (!response.ok)
        throw new Error(body.error?.message || "Unable to load clients.");
      const mappedClients: Client[] = body.items.map((client) => ({
          id: client.id,
          name: client.name,
          kind: client.kind === "INDIVIDUAL" ? "Individual" : "Organization",
          owner: client.owner?.name || "Unassigned",
          ownerUserId: client.owner?.id,
          projects: client.project_count || 0,
          openItems: client.open_item_count || 0,
          lastActivity: new Date(client.updated_at).toLocaleDateString(),
          status:
            client.status === "REVIEWING"
              ? "Reviewing"
              : client.status === "INACTIVE"
                ? "Inactive"
                : "Active",
          email: client.email || "",
          phone: client.phone || "",
          website: client.website || "",
          shortName: client.short_name || "",
          industry: client.industry || "",
          description: client.description || "",
          contactName: client.contact_name || "",
          designation: client.designation || "",
          addressLine1: client.address_line1 || "",
          addressLine2: client.address_line2 || "",
          city: client.city || "",
          state: client.state || "",
          postalCode: client.postal_code || "",
          country: client.country || "",
          taxId: client.tax_id || "",
          paymentTerms: client.payment_terms || "",
          currency: client.currency || "",
          createdAt: client.created_at,
        }));
      setClientRows(mappedClients);
      setClientStats({ total: body.total, active: mappedClients.filter(client => client.status === "Active").length });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to load clients.",
      );
    }
  };
  const archiveClient = async (client: Client) => {
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message || "Unable to archive client.");
      }
      await loadClients();
      showToast("Client archived");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to archive client.",
      );
    }
  };
  const loadProjects = async () => {
    setProjectLoading(true);
    setProjectError("");
    try {
      const response = await fetch("/api/projects", { credentials: "include" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Unable to load projects.");
      setProjectRows(body.items.map((project: { id:string; name:string; project_code:string | null; client_name:string; status:string; target_end_date:string; start_date:string; priority:string; owner:{ name:string } | null; updated_at:string; task_count?: number; completed_count?: number }) => {
        const tasks = project.task_count || 0, completed = project.completed_count || 0;
        return ({
          id: project.id, code: project.project_code || "—", name: project.name, client: project.client_name,
          status: project.status === "ON_HOLD" ? "On Hold" : project.status === "COMPLETED" ? "Done" : project.status === "PLANNED" ? "Planned" : project.status === "CANCELLED" ? "Cancelled" : "In Progress",
          progress: tasks ? Math.round((completed / tasks) * 100) : 0, due: new Date(project.target_end_date).toLocaleDateString(), tasks, updatedAt: project.updated_at, dueAt: project.target_end_date, startDate: project.start_date, priority: project.priority.charAt(0) + project.priority.slice(1).toLowerCase() as Project['priority'], owner: project.owner?.name || "Unassigned",
        });
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load projects.";
      setProjectError(message);
      showToast(message);
    } finally { setProjectLoading(false); }
  };
  const loadTasks = async () => {
    try {
      const response = await fetch("/api/tasks", { credentials: "include" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Unable to load tasks.");
      setTasks(body.items.map((task: { id: string; title: string; status: string; due_at: string | null; client_name: string; project_name: string | null }) => ({
        id: task.id, title: task.title, client: task.client_name, project: task.project_name || "No project", owner: "Workspace", due: task.due_at ? new Date(task.due_at).toLocaleDateString() : "No due date",
        status: task.status === "COMPLETED" ? "Done" : task.status === "IN_PROGRESS" ? "In Progress" : task.status === "BLOCKED" ? "Reviewing" : "Requested",
      })));
    } catch (error) { showToast(error instanceof Error ? error.message : "Unable to load tasks."); }
  };
  const loadRequirements = async () => {
    setRequirementLoading(true);
    setRequirementError("");
    try {
      const response = await fetch("/api/requirements", { credentials: "include" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Unable to load requirements.");
      setRequirementRows(body.items.map((requirement: { id: string; requirement_code: string; title: string; status: string; source: string; client_name: string; project_name: string | null; created_at: string; updated_at: string }) => ({
        id: requirement.id, code: requirement.requirement_code, title: requirement.title, client: requirement.client_name, project: requirement.project_name || "No project", owner: "Workspace", updated: new Date(requirement.updated_at).toLocaleDateString(),
        source: requirement.source === "CLIENT_MESSAGE" ? "Client message" : requirement.source.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()), status: requirement.status === "IN_PROGRESS" ? "In Progress" : requirement.status === "COMPLETED" ? "Done" : requirement.status === "APPROVED" ? "Approved" : requirement.status === "REJECTED" ? "Rejected" : requirement.status === "REVIEWING" ? "Reviewing" : "Requested",
      })));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load requirements.";
      setRequirementError(message);
      showToast(message);
    } finally { setRequirementLoading(false); }
  };
  useEffect(() => {
    try {
      const saved = localStorage.getItem("qnl-preferences");
      if (saved) {
        const p = JSON.parse(saved);
        setTheme(p.theme ?? "light");
        setDensity(p.density ?? "compact");
        setAccent(p.accent ?? "#3195ff");
        if (Number.isFinite(p.sidebarWidth))
          setSidebarWidth(Math.min(360, Math.max(150, p.sidebarWidth)));
      }
    } catch {
      localStorage.removeItem("qnl-preferences");
      showToast("Saved browser data was invalid and has been reset.");
    } finally {
      setPreferencesReady(true);
    }
  }, []);
  useEffect(() => {
    const openDialog = window.sessionStorage.getItem("qnl-open-dialog");
    if (openDialog === "client" || openDialog === "project")
      setModal(openDialog);
    setDialogRecoveryReady(true);
  }, []);
  useEffect(() => {
    if (!dialogRecoveryReady) return;
    if (modal === "client" || modal === "project")
      window.sessionStorage.setItem("qnl-open-dialog", modal);
    else window.sessionStorage.removeItem("qnl-open-dialog");
  }, [modal, dialogRecoveryReady]);
  useEffect(() => {
    let active = true;
    const refreshLogo = async () => {
      try {
        const response = await fetch("/api/settings/company");
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "Unable to load company settings.");
        if (active) setCompanyLogo(body.workspace?.logoUrl || "");
      } catch { /* non-fatal */ }
    };
    void refreshLogo();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!preferencesReady) return;
    document.documentElement.classList.toggle(
      "dark",
      theme === "dark" ||
        (theme === "system" &&
          matchMedia("(prefers-color-scheme: dark)").matches),
    );
    localStorage.setItem(
      "qnl-preferences",
      JSON.stringify({ theme, density, accent, sidebarWidth }),
    );
  }, [theme, density, accent, sidebarWidth, preferencesReady]);
  useEffect(() => {
    void loadClients();
    void loadProjects();
    void loadTasks();
    void loadRequirements();
  }, []);
  useEffect(() => {
    void fetch("/api/me")
      .then(async (response) => {
        if (!response.ok) throw new Error("Session unavailable");
        const me = await response.json();
        if (!me.workspace.companySetupComplete) {
          router.replace("/company-setup");
          return;
        }
        setAccount({
          name:
            me.user.displayName ||
            [me.user.firstName, me.user.lastName].filter(Boolean).join(" ") ||
            me.user.email,
          email: me.user.email,
        });
        setPermissions(me.permissions);
        setRole(me.membership.role);
      })
      .catch(() => router.replace("/sign-in"));
  }, [router]);
  useEffect(() => {
    const required = viewPermissions[view];
    if (role && required && !permissions.includes(required)) {
      showToast("You don’t have permission to access this area.");
      router.replace("/dashboard");
    }
  }, [view, role, permissions, router]);
  const saveRecord = async (kind: string, data: any) => {
    if (kind === "client") {
      try {
        const response = await fetch(`/api/clients`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            kind:
              data.clientType === "Individual" ? "INDIVIDUAL" : "ORGANIZATION",
            email: data.email || undefined,
            phone: data.phone || undefined,
            website: data.website || undefined,
          }),
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error?.message || "Unable to create client.");
        await loadClients();
        setModal(null);
        showToast(`Client ${body.name} created`);
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Unable to create client.",
        );
      }
      return;
    }
    setModal(null);
    showToast(`${kind[0].toUpperCase() + kind.slice(1)} creation is not available from this action yet.`);
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setQuickCreateOpen((open) => !open);
      }
      if ((e.metaKey || e.ctrlKey) && e.code === "F1") {
        e.preventDefault();
        openNotifications();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const openRecord = (id: string) => {
    setDrawer(id);
    if (id.startsWith("INV")) go(routes.documentType("invoices"));
    else if (id.startsWith("QUO")) go(routes.documentType("quotations"));
    else if (id.startsWith("BIL")) go(routes.documentType("bills"));
    else if (id.startsWith("APR")) go(routes.approvals());
  };
  const startSidebarResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const startX = event.clientX,
      startWidth = sidebarWidth;
    event.currentTarget.setPointerCapture(event.pointerId);
    const resize = (moveEvent: PointerEvent) =>
      setSidebarWidth(
        Math.min(360, Math.max(150, startWidth + moveEvent.clientX - startX)),
      );
    const stop = () => {
      document.removeEventListener("pointermove", resize);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = "col-resize";
    document.addEventListener("pointermove", resize);
    document.addEventListener("pointerup", stop, { once: true });
  };
  return (
    <div
      className={`app-shell density-${density}`}
      style={
        {
          "--primary": accent,
          "--ring": accent,
          "--sidebar-width": `${sidebarWidth}px`,
        } as React.CSSProperties
      }
    >
      <aside className="sidebar">
        <div className="brand">
          <button
            className="workspace-switch"
            title="Quantum Nest Lab workspace"
          >
            <div className="workspace-avatar">
              {companyLogo ? (
                <img src={companyLogo} alt="Quantum Nest Lab logo" />
              ) : (
                <img src="/qnl-logo-mark.png" alt="Quantum Nest Lab logo" />
              )}
            </div>
            <div className="workspace-copy">
              <strong>Quantum Nest Lab</strong>
              <span>{role || "Loading access…"}</span>
            </div>
          </button>
        </div>
        <nav ref={sidebarNavRef} className="nav">
          {nav
            .filter(
              (item) =>
                !viewPermissions[item.id as View] ||
                permissions.includes(viewPermissions[item.id as View]!),
            )
            .map((item) => (
              <div key={item.id}>
                {item.group && <div className="nav-group">{item.group}</div>}
                <button
                  className={`nav-item ${view === item.id ? "active" : ""}`}
                  onClick={() => go("/" + item.id)}
                  title={item.label}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </button>
                {item.children && view === item.id && (
                  <div className="nav-children">
                    {item.children.map((child: string) => (
                      <button
                        key={child}
                        className={sub === child ? "active" : ""}
                        onClick={() => go("/" + item.id + "/" + child)}
                      >
                        {child[0].toUpperCase() + child.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <SidebarAccount
            account={account}
            initials={initials}
            open={accountOpen}
            onToggle={() => setAccountOpen((open) => !open)}
            onEdit={() => {
              setProfileOpen(true);
              setAccountOpen(false);
            }}
            onSignOut={signOut}
          />
        </div>
        <div
          className="sidebar-resizer"
          role="separator"
          aria-label="Resize sidebar"
          aria-orientation="vertical"
          tabIndex={0}
          onPointerDown={startSidebarResize}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft")
              setSidebarWidth((width) => Math.max(150, width - 16));
            if (event.key === "ArrowRight")
              setSidebarWidth((width) => Math.min(360, width + 16));
          }}
        />
      </aside>
      <main className="main">
        <header className={`topbar ${hasContextualToolbar ? "topbar-contextual" : ""}`}>
          {!documentsRoot && <button className="search-trigger topbar-search" onClick={() => setPalette(true)}>
              <Search size={15} />
              <span>Search anything</span>
              <kbd>⌘ K</kbd>
          </button>}
          {documentsRoot && <div className="documents-top-summary"><span><small>All documents</small><b>{documentSummary.total}</b></span><span><small>Drafts</small><b>{documentSummary.drafts}</b></span><span><small>In progress</small><b>{documentSummary.inProgress}</b></span></div>}
          <div className="top-actions">
            {!documentsRoot && <button type="button" className="notification-shortcut" onClick={openNotifications}>
              Notifications
            </button>}
            {view === "documents" && sub === "quotations" ? <button className="reference-create" type="button" onClick={() => window.dispatchEvent(new Event("qnl:quotation-create"))}><Plus size={16} /> New quotation</button> : view === "documents" && !sub ? <button className="reference-create" type="button" onClick={() => window.dispatchEvent(new Event("qnl:document-create"))}><Plus size={16} /> Create document</button> : <div className="quick-create-menu topbar-quick-create"><button className="reference-create" type="button" aria-haspopup="dialog" aria-expanded={quickCreateOpen} onClick={() => setQuickCreateOpen(true)}><Plus size={16} /> Quick create</button></div>}
            <div className="account-menu-wrap" style={{ position: "relative" }}>
              <button
                className="avatar-button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-label="Open account menu"
                aria-expanded={accountOpen}
              >
                {initials}
              </button>
              {accountOpen && (
                <div
                  className="account-menu"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    zIndex: 90,
                    width: 230,
                    padding: 6,
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "var(--card)",
                    boxShadow: "0 16px 36px rgb(15 23 42 / 16%)",
                  }}
                >
                  <div
                    className="account-menu-identity"
                    style={{
                      display: "flex",
                      gap: 9,
                      alignItems: "center",
                      padding: "8px 9px 10px",
                      borderBottom: "1px solid var(--border)",
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        background: "var(--primary)",
                        color: "var(--primary-foreground)",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {initials}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", fontSize: 11 }}>
                        {account.name}
                      </strong>
                      <small
                        style={{
                          display: "block",
                          marginTop: 2,
                          fontSize: 9,
                          color: "var(--muted-foreground)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {account.email}
                      </small>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setProfileOpen(true);
                      setAccountOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 9px",
                      border: 0,
                      borderRadius: 5,
                      background: "transparent",
                      color: "var(--foreground)",
                      fontSize: 11,
                      textAlign: "left",
                    }}
                  >
                    <UserRound size={15} />
                    Edit profile
                  </button>
                  <button
                    className="account-menu-danger"
                    onClick={signOut}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 9px",
                      border: 0,
                      borderRadius: 5,
                      background: "transparent",
                      color: "var(--destructive)",
                      fontSize: 11,
                      textAlign: "left",
                    }}
                  >
                    <LogOut size={15} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
          <div id="module-toolbar-slot" className="module-toolbar-slot" />
        </header>
        <div className="content">
          <Module
            view={view}
            sub={sub}
            clients={clientRows}
            clientStats={clientStats}
            projects={projectRows}
            projectLoading={projectLoading}
            projectError={projectError}
            requirements={requirementRows}
            requirementLoading={requirementLoading}
            requirementError={requirementError}
            tasks={tasks}
            setTasks={setTasks}
            onOpen={openRecord}
            onModal={setModal}
            onEditClient={setEditingClient}
            onArchiveClient={archiveClient}
            onRefreshProjects={loadProjects}
            onToast={showToast}
            onTheme={setTheme}
            theme={theme}
            density={density}
            setDensity={setDensity}
            accent={accent}
            setAccent={setAccent}
            companyLogo={companyLogo}
            go={go}
            onAttentionChange={syncDashboardAttention}
          />
        </div>
      </main>
      {modal === "client" ? (
        <ClientCreateDialog
          onClose={() => setModal(null)}
          onCreated={async () => {
            await loadClients();
            setModal(null);
            showToast("Client created");
          }}
        />
      ) : modal === "project" ? (
        <ProjectCreateDialog onClose={() => setModal(null)} onCreated={async () => { await loadProjects(); setModal(null); showToast("Project created"); }} />
      ) : modal === "requirement" ? (
        <RequirementCreateDialog onClose={() => setModal(null)} onCreated={async () => { await loadRequirements(); setModal(null); showToast("Requirement created"); }} />
      ) : modal === "task" ? (
        <TaskCreateDialog onClose={() => setModal(null)} onCreated={async () => { await loadTasks(); setModal(null); showToast("Task created"); }} />
      ) : modal ? (
        <CreateModal
          kind={modal}
          onClose={() => setModal(null)}
          onSave={saveRecord}
        />
      ) : null}
      {quickCreateOpen && <QuickCreateDialog permissions={permissions} onClose={() => setQuickCreateOpen(false)} onSelect={(kind) => { setQuickCreateOpen(false); setModal(kind); }} />}
      {attentionOpen && <AttentionDialog attention={attention} onClose={() => setAttentionOpen(false)} onNavigate={go} />}
      {profileOpen && (
        <ProfileModal
          account={account}
          onClose={() => setProfileOpen(false)}
          onSave={saveProfile}
        />
      )}
      {editingClient && (
        <ClientEditDialog
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={async () => {
            await loadClients();
            setEditingClient(null);
            showToast("Client updated");
          }}
        />
      )}
      {drawer && (
        <RecordDrawer
          id={drawer}
          clients={clientRows}
          projects={projectRows}
          requirements={requirementRows}
          onRefreshRequirements={loadRequirements}
          tasks={tasks}
          onRefreshTasks={loadTasks}
          onClose={() => setDrawer(null)}
          onToast={showToast}
          onNavigate={go}
        />
      )}
      {palette && (
        <CommandPalette
          onClose={() => setPalette(false)}
          go={go}
        />
      )}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

export default function PageRoute() {
  return (
    <Suspense fallback={<div className="app-shell" />}>
      <Page />
    </Suspense>
  );
}

function QuickCreateDialog({
  permissions,
  onClose,
  onSelect,
}: {
  permissions: string[];
  onClose: () => void;
  onSelect: (kind: Exclude<ActiveModal, null>) => void;
}) {
  const actions = [
    { icon: Users, label: "New client", description: "Add a client and primary contact", kind: "client", permission: "clients.create" },
    { icon: BriefcaseBusiness, label: "New project", description: "Start a project for an existing client", kind: "project", permission: "projects.create" },
    { icon: ClipboardList, label: "New requirement", description: "Add a project requirement or checklist item", kind: "requirement", permission: "requirements.create" },
    { icon: ListTodo, label: "New task", description: "Create an assigned piece of work", kind: "task", permission: "tasks.create" },
  ] as const;
  return <div className="quick-create-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="quick-create-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-create-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><h2 id="quick-create-title">Quick create</h2></div><button type="button" className="attention-close" aria-label="Close quick create" onClick={onClose}><X size={18} /></button></header>
      <div className="quick-create-dialog-actions">
        {actions.filter((action) => permissions.includes(action.permission)).map(({ icon: Icon, label, description, kind }) => <button type="button" key={kind} onClick={() => onSelect(kind)}><span><Icon size={19} /></span><div><strong>{label}</strong><small>{description}</small></div><ChevronRight size={17} /></button>)}
      </div>
    </section>
  </div>;
}

function AttentionDialog({
  attention,
  onClose,
  onNavigate,
}: {
  attention: { overdueTasks: number; blockedTasks: number; pendingApprovals: number };
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const hasAttention = attention.overdueTasks > 0 || attention.blockedTasks > 0 || attention.pendingApprovals > 0;
  return <div className="attention-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="attention-dialog" role="dialog" aria-modal="true" aria-labelledby="attention-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><h2 id="attention-title">Needs attention</h2><p>{hasAttention ? "Review the work that needs action." : "Your workspace is all caught up."}</p></div><button type="button" className="attention-close" aria-label="Close notifications" onClick={onClose}><X size={18} /></button></header>
      <div className="attention-items">
        <button type="button" onClick={() => { onClose(); onNavigate("/tasks"); }}><strong>{attention.overdueTasks}</strong><span>overdue task{attention.overdueTasks === 1 ? "" : "s"}</span></button>
        <button type="button" onClick={() => { onClose(); onNavigate("/tasks"); }}><strong>{attention.blockedTasks}</strong><span>blocked task{attention.blockedTasks === 1 ? "" : "s"}</span></button>
        <button type="button" onClick={() => { onClose(); onNavigate("/approvals"); }}><strong>{attention.pendingApprovals}</strong><span>pending approval{attention.pendingApprovals === 1 ? "" : "s"}</span></button>
      </div>
    </section>
  </div>;
}

function ProfileModal({
  account,
  onClose,
  onSave,
}: {
  account: { name: string; email: string };
  onClose: () => void;
  onSave: (data: { name: string; email: string }) => Promise<void>;
}) {
  const [name, setName] = useState(account.name),
    [email, setEmail] = useState(account.email),
    [saving, setSaving] = useState(false);
  return (
    <div
      className="profile-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="profile-dialog"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          await onSave({ name, email });
          setSaving(false);
        }}
      >
        <header>
          <div>
            <h2>Edit profile</h2>
            <p>Update the details associated with your account.</p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close profile editor"
          >
            <X size={17} />
          </button>
        </header>
        <label>
          Full name
          <input
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
          />
        </label>
        <label>
          Email address
          <input
            required
            type="email"
            maxLength={255}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>
        <footer>
          <button
            type="button"
            className="button button-subtle"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function SidebarAccount({
  account,
  initials,
  open,
  onToggle,
  onEdit,
  onSignOut,
}: {
  account: { name: string; email: string };
  initials: string;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="sidebar-account-wrap">
      <button
        className="nav-item sidebar-account-button"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="sidebar-account-avatar">{initials}</span>
        <span>Account</span>
      </button>
      {open && (
        <div className="account-menu sidebar-account-menu">
          <div className="account-menu-identity">
            <span>{initials}</span>
            <div>
              <strong>{account.name}</strong>
              <small>{account.email}</small>
            </div>
          </div>
          <button onClick={onEdit}>
            <UserRound size={15} />
            Edit profile
          </button>
          <button className="account-menu-danger" onClick={onSignOut}>
            <LogOut size={15} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function ModuleToolbar({ children }: { children: React.ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById("module-toolbar-slot"));
    return () => setSlot(null);
  }, []);
  return slot ? createPortal(children, slot) : null;
}

function Module({
  view,
  sub,
  clients,
  clientStats,
  projects: projectRows,
  projectLoading,
  projectError,
  requirements: requirementRows,
  requirementLoading,
  requirementError,
  tasks,
  setTasks,
  onOpen,
  onModal,
  onEditClient,
  onArchiveClient,
  onRefreshProjects,
  onRefreshRequirements,
  onToast,
  onTheme,
  theme,
  density,
  setDensity,
  accent,
  setAccent,
  companyLogo,
  go,
  onAttentionChange,
}: any) {
  if (view === "dashboard") return <LiveDashboard go={go} onModal={onModal} onOpen={onOpen} onAttentionChange={onAttentionChange} />;
  if (view === "clients")
    return (
      <Clients
        rows={clients}
        stats={clientStats}
        onOpen={onOpen}
        onModal={onModal}
        onEdit={onEditClient}
        onArchive={onArchiveClient}
      />
    );
  if (view === "projects")
    return <ProjectsWorkspace rows={projectRows} onOpen={onOpen} onCreate={() => onModal("project")} loading={projectLoading} error={projectError} onRetry={onRefreshProjects} />;
  if (view === "requirements")
    return (
      <RequirementsWorkspace
        rows={requirementRows}
        projects={projectRows}
        onOpen={onOpen}
        onCreate={() => onModal("requirement")}
        loading={requirementLoading}
        error={requirementError}
        onRetry={onRefreshRequirements}
      />
    );
  if (view === "tasks")
    return (
      <Tasks
        tasks={tasks}
        setTasks={setTasks}
        onOpen={onOpen}
        onModal={onModal}
      />
    );
  if (view === "documents")
    return <Documents sub={sub} onOpen={onOpen} onModal={onModal} />;
  if (view === "finance")
    return <Finance sub={sub} onModal={onModal} onToast={onToast} />;
  if (view === "settings")
    return (
      <SettingsPage
        sub={sub}
        theme={theme}
        onTheme={onTheme}
        density={density}
        setDensity={setDensity}
        accent={accent}
        setAccent={setAccent}
        onToast={onToast}
        companyLogo={companyLogo}
      />
    );
  if (view === "drive") return <Drive onToast={onToast} />;
  if (view === "meetings")
    return <Meetings onToast={onToast} onOpen={onOpen} />;
  if (view === "calendar") return <CalendarWorkspace />;
  if (view === "approvals")
    return <Approvals onModal={onModal} onOpen={onOpen} />;
  if (view === "team") return <Team />;
  return <ActivityPage onOpen={onOpen} />;
}

function Dashboard({ go, onModal, tasks, setTasks, clients = [] }: any) {
  const taskItems = [
    ...tasks
      .filter((task: any) => task.status !== "Done")
      .slice(0, 5)
      .map((task: any) => [
        task.title,
        [task.client, task.project].filter(Boolean).join(" · "),
        task.due || "No due date",
      ]),
  ];
  const now = new Date(),
    greeting =
      now.getHours() < 12
        ? "Good morning"
        : now.getHours() < 18
          ? "Good afternoon"
          : "Good evening",
    dateLabel = new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now),
    activeClients = clients.filter(
      (client: Client) => client.status === "Active",
    ).length;
  const activityIcons = [ClipboardList, Clock, FileText, Receipt, CheckCircle2];
  const activityTones = ["blue", "green", "purple", "amber", "neutral"];
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  return (
    <div className="reference-dashboard">
      <header className="reference-header">
        <div className="reference-greeting">
          <div>
            <h1>{greeting}, Ananya.</h1>
            <p>Here's your current workspace overview.</p>
          </div>
        </div>
        <div className="reference-actions">
          <div className="reference-date">
            <strong>{dateLabel}</strong>
            <span>Here's what's happening at Quantum Nest Lab.</span>
          </div>
          <div className="quick-create-menu">
            <button
              className="reference-create"
              onClick={() => setQuickCreateOpen((open) => !open)}
            >
              <Plus size={17} />
              Quick create <ChevronDown size={15} />
            </button>
            {quickCreateOpen && (
              <div className="quick-create-options">
                {[
                  [ClipboardList, "New requirement", "requirement"],
                  [ListTodo, "New task", "task"],
                  [Users, "New client", "client"],
                  [Video, "Schedule meeting", "meeting"],
                  [FileText, "New document", "document"],
                ].map(([Icon, label, kind]: any) => (
                  <button
                    key={kind}
                    onClick={() => {
                      onModal(kind);
                      setQuickCreateOpen(false);
                    }}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="reference-stats">
        <ReferenceStat
          label="Open work"
          value={tasks.filter((task: any) => task.status !== "Done").length}
          detail={`${tasks.filter((task: any) => task.status !== "Done").length} active tasks`}
          icon={BriefcaseBusiness}
          tone="green"
          trend="Current"
        />
        <ReferenceStat
          label="Awaiting approval"
          value="6"
          detail="2 need your review"
          icon={ShieldCheck}
          tone="amber"
          trend="↗ 33%"
        />
        <ReferenceStat
          label="Receivables"
          value="₹1.84L"
          detail="₹42,000 overdue"
          icon={CreditCard}
          tone="blue"
          trend="↑ 8%"
        />
        <ReferenceStat
          label="Active clients"
          value={activeClients}
          detail={`${clients.length} total clients`}
          icon={Users}
          tone="purple"
          trend="Current"
        />
      </div>
      <div className="reference-columns">
        <section className="reference-panel">
          <div className="reference-panel-head">
            <div>
              <h2>
                <Clock size={20} />
                Recent activity
              </h2>
              <p>Company activity across all work</p>
            </div>
            <button onClick={() => go("/activity")}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="reference-activity-list">
            {activities.map((a, i) => {
              const Icon = activityIcons[i];
              return (
                <button
                  className="reference-activity"
                  key={a.id}
                  onClick={() => go("/activity")}
                >
                  <span className={`reference-timeline ${activityTones[i]}`} />
                  <span
                    className={`reference-activity-icon ${activityTones[i]}`}
                  >
                    <Icon size={19} />
                  </span>
                  <div className="reference-activity-time">{a.time}</div>
                  <div className="reference-activity-copy">
                    <strong>{a.actor}</strong>
                    <span>{a.description}</span>
                    <small>
                      {a.client} <i /> {a.type}
                    </small>
                  </div>
                  <Badge
                    tone={
                      i === 0
                        ? "blue"
                        : i === 1
                          ? "green"
                          : i === 2
                            ? "purple"
                            : i === 3
                              ? "amber"
                              : "neutral"
                    }
                  >
                    {i === 0
                      ? "In Progress"
                      : i === 1
                        ? "Completed"
                        : i === 2
                          ? "File Added"
                          : i === 3
                            ? "Partially Paid"
                            : "Pending"}
                  </Badge>
                </button>
              );
            })}
          </div>
          <footer className="reference-panel-footer">
            Showing latest 5 activities
          </footer>
        </section>
        <section className="reference-panel">
          <div className="reference-panel-head">
            <div>
              <h2>
                <CheckCircle2 size={20} />
                My tasks
              </h2>
              <p>Next actions across projects</p>
            </div>
            <button onClick={() => go("/tasks?view=my")}>
              Open tasks <ArrowRight size={14} />
            </button>
          </div>
          <div className="reference-task-list">
            {taskItems.map(([title, meta, due], i) => {
              const matchingTask = tasks.find(
                (task: any) => task.title === title,
              );
              const complete = matchingTask?.status === "Done";
              return (
                <div
                  className={`reference-task${complete ? " complete" : ""}`}
                  key={title}
                >
                  <button
                    className="reference-checkbox"
                    aria-label={`Mark ${title} ${complete ? "incomplete" : "complete"}`}
                    aria-pressed={complete}
                    onClick={() =>
                      matchingTask
                        ? setTasks((rows: any[]) =>
                            rows.map((task) =>
                              task.id === matchingTask.id
                                ? {
                                    ...task,
                                    status: complete ? "In Progress" : "Done",
                                  }
                                : task,
                            ),
                          )
                        : go("/tasks")
                    }
                  >
                    {complete && <Check size={11} />}
                  </button>
                  <div>
                    <strong>{title}</strong>
                    <span>{meta}</span>
                  </div>
                  <Badge tone={i === 0 ? "red" : i === 1 ? "amber" : "neutral"}>
                    {due}
                  </Badge>
                  <button
                    className="reference-more"
                    aria-label={`More actions for ${title}`}
                    onClick={() => go("/tasks")}
                  >
                    <MoreHorizontal size={17} />
                  </button>
                </div>
              );
            })}
          </div>
          <button className="reference-view-tasks" onClick={() => go("/tasks")}>
            View all tasks
          </button>
        </section>
      </div>
      <aside className="reference-tip">
        <span>♧</span>
        <div>
          <strong>Pro tip</strong>
          <p>
            Use Quick create to add tasks, upload files, or schedule meetings —
            all in one place.
          </p>
        </div>
        <button aria-label="Dismiss tip">
          <X size={16} />
        </button>
      </aside>
    </div>
  );
}
function LiveDashboard({
  go,
  onModal,
  onOpen,
  onAttentionChange,
}: {
  go: (path: string) => void;
  onModal: (kind: ActiveModal) => void;
  onOpen: (id: string) => void;
  onAttentionChange: (attention: { overdueTasks: number; blockedTasks: number; pendingApprovals: number }) => void;
}) {
  const [data, setData] = useState<{
      name: string;
      workspaceName: string;
      clients: { total: number; active: number };
      metrics: {
        openWork: number;
        awaitingApproval: number;
        receivables: number;
      };
      attention: { overdueTasks: number; blockedTasks: number; pendingApprovals: number };
      activity: { id: string; entityId: string; entityName: string | null; actor: string; summary: string; detail: string; context: string | null; kind: string; createdAt: string }[];
    } | null>(null),
    [error, setError] = useState(""),
    [activityKind, setActivityKind] = useState("all"),
    [activityRange, setActivityRange] = useState("7");
  const loadDashboard = useCallback(() => void fetch("/api/dashboard")
    .then(async (response) => {
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error?.message || "Unable to load workspace overview.",
        );
      setData(body);
      setError("");
    })
    .catch((cause) =>
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load workspace overview.",
      ),
    ), []);
  useEffect(() => {
    loadDashboard();
    const refresh = window.setInterval(loadDashboard, 30_000);
    return () => window.clearInterval(refresh);
  }, [loadDashboard]);
  useEffect(() => {
    if (data) onAttentionChange(data.attention);
  }, [data, onAttentionChange]);
  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  if (!data && !error)
    return <div className="empty-state">Loading workspace overview…</div>;
  if (!data) return <div className="empty-state">{error}</div>;
  const activityFilters = [
    { id: "all", label: "All", icon: Activity },
    { id: "client", label: "Clients", icon: Users },
    { id: "project", label: "Projects", icon: BriefcaseBusiness },
    { id: "requirement", label: "Requirements", icon: ClipboardList },
    { id: "task", label: "Tasks", icon: CheckCircle2 },
    { id: "document", label: "Documents", icon: FileText },
    { id: "finance", label: "Finance", icon: CreditCard },
    { id: "approval", label: "Approvals", icon: ShieldCheck },
  ];
  const visibleActivity = data.activity.filter((item) => {
    const withinRange = Date.now() - new Date(item.createdAt).getTime() <= Number(activityRange) * 86_400_000;
    return withinRange && (activityKind === "all" || item.kind === activityKind);
  }).slice(0, 4);
  const activityDestination = (item: { kind: string; entityName: string | null }) =>
    item.kind === "client"
      ? `/clients?search=${encodeURIComponent(item.entityName || "")}`
      : item.kind === "project"
        ? "/projects"
        : "/activity";
  const openActivity = (item: { kind: string; entityId: string; entityName: string | null }) => {
    if (item.kind === "requirement") onOpen(item.entityId);
    else go(activityDestination(item));
  };
  return (
    <div className="reference-dashboard">
      <header className="reference-header">
        <div className="reference-greeting">
          <div>
            <h1>
              {greeting}, {data?.name || "there"}.
            </h1>
            <p>Live workspace overview.</p>
          </div>
        </div>
        <div className="reference-actions">
          <div className="reference-date">
            <strong>
              {new Intl.DateTimeFormat("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </strong>
            <span>Here’s what’s happening at {data.workspaceName}.</span>
          </div>
        </div>
      </header>
      {error ? (
        <p className="form-error">{error}</p>
      ) : (
        <>
          <div className="reference-stats">
            <ReferenceStat
              label="Total clients"
              value={data.clients.total}
              detail="Live workspace count"
              icon={Users}
              tone="green"
              trend="Live"
            />
            <ReferenceStat
              label="Active clients"
              value={data.clients.active}
              detail={`${data.clients.total} total clients`}
              icon={Users}
              tone="purple"
              trend="Live"
            />
          </div>
          <div className="reference-columns">
            <section className="reference-panel dashboard-recent-activity">
              <div className="reference-panel-head">
                <div className="dashboard-activity-heading">
                  <span className="dashboard-activity-heading-icon"><Clock size={29} /></span>
                  <div>
                  <h2>
                    Recent activity
                  </h2>
                  </div>
                </div>
              </div>
              <div className="reference-activity-list">
                <div className="activity-register-filters" aria-label="Filter recent activity">
                  <div className="activity-register-types">
                    {activityFilters.map(({ id, label, icon: FilterIcon }) => (
                      <button key={id} type="button" className={activityKind === id ? "active" : ""} onClick={() => setActivityKind(id)} aria-pressed={activityKind === id}>
                        <FilterIcon size={13} /> {label}
                      </button>
                    ))}
                  </div>
                  <div className="activity-register-range">
                    <CalendarDays size={13} />
                    <AppDropdown value={activityRange} onChange={setActivityRange} ariaLabel="Activity date range" options={[{ value: '1', label: 'Last 24 hours' }, { value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }]} />
                  </div>
                </div>
                {visibleActivity.map((item) => {
                  const Icon = item.kind === "project" ? Folder : item.kind === "requirement" ? ClipboardList : item.kind === "task" ? ListTodo : item.kind === "membership" ? UserRoundPen : item.summary.startsWith("archived") ? Archive : Users;
                  const activityTone = item.kind === "project" ? "blue" : item.kind === "requirement" ? "purple" : item.kind === "task" ? "green" : item.kind === "client" ? "green" : "neutral";
                  const minutes = Math.round((new Date(item.createdAt).getTime() - Date.now()) / 60_000);
                  const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
                  const time = Math.abs(minutes) < 60 ? relativeTime.format(minutes, "minute") : Math.abs(minutes) < 1_440 ? relativeTime.format(Math.round(minutes / 60), "hour") : relativeTime.format(Math.round(minutes / 1_440), "day");
                  return (
                  <div
                    className="reference-activity"
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openActivity(item)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openActivity(item); } }}
                  >
                    <span className={`reference-timeline ${activityTone}`} />
                    <div className="reference-activity-time"><strong>{time}</strong>
                      <span>{new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                    <span className={`reference-activity-icon ${activityTone}`}>
                      <Icon size={18} />
                    </span>
                    <div className="reference-activity-copy">
                      <strong>{item.summary}</strong>
                      <span>{item.context ? `${item.detail} · ${item.context}` : item.detail}</span>
                    </div>
                    <span className={`activity-register-badge ${item.kind}`}>{item.detail}</span>
                    <span className="activity-register-workspace"><b>{data.workspaceName.slice(0, 2).toUpperCase()}</b>{data.workspaceName}</span>
                  </div>
                  );
                })}
                {!visibleActivity.length && (
                  <div className="empty-state">No activity matches these filters.</div>
                )}
                {visibleActivity.length > 0 && <div className="dashboard-activity-note"><span><Sparkles size={25} /></span><div><strong>Stay updated</strong><p>This shows the latest activity from your workspace across clients, projects, tasks and more.</p></div><aside><Info size={22} /> Activity is updated automatically.</aside></div>}
              </div>
              <footer className="reference-panel-footer">
                <span>Showing latest {visibleActivity.length} activities</span><span className="dashboard-activity-live"><i /> Auto-updating</span>
              </footer>
            </section>
            <DueThisWeek go={go} />
          </div>
        </>
      )}
    </div>
  );
}
type DashboardTask = { id: string; title: string; status: string; due_at: string | null; client_name: string; project_name: string | null; category: "task" | "approval" | "other" };
function DueThisWeek({ go }: { go: (path: string) => void }) {
  const [tasks, setTasks] = useState<DashboardTask[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(""), [filter, setFilter] = useState<"all" | "tasks" | "approvals" | "others">("all");
  useEffect(() => { let active = true; void fetch("/api/dashboard").then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error?.message || "Unable to load due work."); if (active) setTasks((body.dueWork || []).map((item: { id: string; type: string; title: string; status: string; dueAt: string; clientName: string; projectName: string | null }) => ({ id: item.id, title: item.title, status: item.status, due_at: item.dueAt, client_name: item.clientName, project_name: item.projectName, category: item.type === "task" ? "task" : item.type === "approval" ? "approval" : "other" }))); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load due work."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const endOfWeek = new Date(); endOfWeek.setDate(endOfWeek.getDate() + 7); endOfWeek.setHours(23, 59, 59, 999);
  const dueTasks = tasks.filter(task => task.due_at && new Date(task.due_at) >= new Date() && new Date(task.due_at) <= endOfWeek), visibleTasks = dueTasks.filter(task => filter === "all" || filter === "tasks" && task.category === "task" || filter === "approvals" && task.category === "approval" || filter === "others" && task.category === "other").slice(0, 5), counts = { all: dueTasks.length, tasks: dueTasks.filter(task => task.category === "task").length, approvals: dueTasks.filter(task => task.category === "approval").length, others: dueTasks.filter(task => task.category === "other").length }, filters = [{ id: "all", label: "All", icon: CalendarDays }, { id: "tasks", label: "Tasks", icon: ListTodo }, { id: "approvals", label: "Approvals", icon: ShieldCheck }, { id: "others", label: "Others", icon: Circle }] as const;
  const emptyMessage = filter === "approvals" ? "No approvals are due in the next seven days." : filter === "others" ? "No other records are due in the next seven days." : "No tasks are due in the next seven days.";
  return <section className="reference-panel dashboard-due-panel"><div className="reference-panel-head"><div className="dashboard-activity-heading"><span className="dashboard-activity-heading-icon"><CalendarDays size={25} /></span><div><h2>Due this week</h2></div></div></div><div className="dashboard-due-filters" role="tablist" aria-label="Due this week record type">{filters.map(({ id, label, icon: Icon }) => <button type="button" role="tab" aria-selected={filter === id} className={filter === id ? "active" : ""} key={id} onClick={() => setFilter(id)}><Icon size={12} />{label} ({counts[id]})</button>)}</div><div className="dashboard-due-list">{loading ? <div className="empty-state">Loading due work…</div> : error ? <div className="empty-state">{error}</div> : visibleTasks.length ? visibleTasks.map(task => { const due = new Date(task.due_at!); return <button type="button" className="dashboard-due-item" key={task.id} onClick={() => go("/tasks")}><time><strong>{due.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</strong><span>{due.toDateString() === new Date().toDateString() ? "Today" : due.toLocaleDateString("en-IN", { weekday: "short" })}</span></time><span className="dashboard-due-icon"><CheckCircle2 size={20} /></span><span><strong>{task.title}</strong><small>{task.project_name || task.client_name}</small></span><em>{task.status.replaceAll("_", " ")}</em></button>; }) : <div className="empty-state">{emptyMessage}</div>}</div><footer className="reference-panel-footer">Showing {visibleTasks.length} of {counts[filter]} {filter === "all" ? "record" : filter.slice(0, -1)}{counts[filter] === 1 ? "" : "s"} due this week</footer></section>;
}
function ReferenceStat({ label, value, detail, icon: Icon, tone, trend }: any) {
  const card = (
    cardLabel: string,
    cardValue: string | number,
    cardDetail: string,
    CardIcon: any,
    cardTone: string,
  ) => (
    <section className={`reference-stat ${cardTone}`}>
      <span className={`reference-stat-icon ${cardTone}`}>
        <CardIcon size={23} />
      </span>
      <div>
        <small>{cardLabel}</small>
        <strong>{cardValue}</strong>
        <em>{cardDetail}</em>
      </div>
      <aside>
        <b className={cardTone}>Live</b>
        <i className={cardTone} />
      </aside>
    </section>
  );
  if (label === "Total clients")
    return (
      <>
        {card(
          "Open work",
          0,
          "No task records yet",
          BriefcaseBusiness,
          "green",
        )}
        {card(
          "Awaiting approval",
          0,
          "No approval records yet",
          ShieldCheck,
          "amber",
        )}
        {card(
          "Receivables",
          "₹0",
          "No finance records yet",
          CreditCard,
          "blue",
        )}
      </>
    );
  return (
    <section className={`reference-stat ${tone}`}>
      <span className={`reference-stat-icon ${tone}`}>
        <Icon size={23} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {detail && <em>{detail}</em>}
      </div>
      <aside>
        <b className={tone}>{trend}</b>
        <i className={tone} />
      </aside>
    </section>
  );
}
function Stat({ label, value, detail, icon: Icon, color }: any) {
  return (
    <div className="stat">
      <div className={`stat-icon ${color}`}>
        <Icon size={16} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        <div className="stat-detail">{detail}</div>
      </div>
    </div>
  );
}
function ClientMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone: metricTone,
}: any) {
  return (
    <section className={`client-metric ${metricTone}`}>
      <span>
        <Icon size={20} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </div>
    </section>
  );
}
function Clients({ rows, stats, onOpen, onModal, onEdit, onArchive }: any) {
  const searchParams = useSearchParams(),
    [search, setSearch] = useState(() => searchParams.get("search") || ""),
    [type, setType] = useState("all"),
    [actionClient, setActionClient] = useState<Client | null>(null),
    [sort, setSort] = useState<{ key: "name" | "owner" | "projects" | "openItems" | "lastActivity" | "status"; direction: "asc" | "desc" }>({ key: "name", direction: "asc" });
  const filtered = rows.filter(
    (c: Client) =>
      (type === "all" || c.kind.toLowerCase() === type) &&
      Object.values(c).join(" ").toLowerCase().includes(search.toLowerCase()),
  ).sort((left: Client, right: Client) => { const a = left[sort.key], b = right[sort.key], result = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true }); return sort.direction === "asc" ? result : -result; });
  const toggleSort = (key: typeof sort.key) => setSort(current => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  const ownerTone: Record<string, string> = {
    "Ananya Rao": "cyan",
    "Vikram Singh": "violet",
    "Meera Nair": "gold",
  };
  return (
    <div className="clients-workspace">
      <ModuleToolbar>
        <div className="module-toolbar module-toolbar-clients">
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, email, phone..." />
          <div className="clients-segmented">
            {[['all', 'All'], ['organization', 'Organizations'], ['individual', 'Individuals']].map(([value, label]) => <button key={value} className={type === value ? 'selected' : ''} onClick={() => setType(value)}>{label}</button>)}
          </div>
          <div className="module-toolbar-metrics">
            <ClientMetric icon={Users} label="Total clients" value={stats.total} detail="" tone="green" />
            <ClientMetric icon={Folder} label="Active clients" value={stats.active} detail="" tone="blue" />
          </div>
          <button className="clients-create" onClick={() => onModal("client")}><Plus size={17} />New client</button>
        </div>
      </ModuleToolbar>
      <header className="clients-header">
        <div className="clients-heading">
          <span>
            <Users size={25} />
          </span>
          <div>
            <h1>Clients</h1>
            <p>
              Manage your clients, view their projects, and track recent
              activity.
            </p>
          </div>
        </div>
      </header>
      <section className="clients-table-card">
        <div className="clients-table-wrap">
          <table className="clients-table">
            <thead>
              <tr>
                <th>Client ↕</th>
                <th>Owner ↕</th>
                <th>Projects ↕</th>
                <th>Open items ↕</th>
                <th>Last activity ↕</th>
                <th>Status ↕</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: Client) => {
                const initials = c.name
                  .split(" ")
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join("");
                const ownerInitials = c.owner
                  .split(" ")
                  .map((word) => word[0])
                  .join("");
                return (
                  <tr key={c.id} onClick={() => onOpen(c.id)}>
                    <td>
                      <div className="client-identity">
                        <i>{initials}</i>
                        <div>
                          <strong>{c.name}</strong>
                          <small>
                            {c.kind} <b>·</b> {c.email}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="client-owner">
                        <i className={ownerTone[c.owner]}>{ownerInitials}</i>
                        {c.owner}
                      </div>
                    </td>
                    <td>{c.projects}</td>
                    <td>{c.openItems}</td>
                    <td>{c.lastActivity}</td>
                    <td>
                      <span className={`client-status ${tone(c.status)}`}>
                        <b />
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <div className="client-actions-menu">
                        <button className="client-more" onClick={(event) => { event.stopPropagation(); setActionClient(current => current?.id === c.id ? null : c) }} aria-label={`Actions for ${c.name}`} aria-expanded={actionClient?.id === c.id}>
                          <MoreHorizontal size={18} />
                        </button>
                        {actionClient?.id === c.id && <div className="client-action-popover" onClick={event => event.stopPropagation()}>
                          <button onClick={() => { setActionClient(null); onOpen(c.id) }}>View client</button>
                          <button onClick={() => { setActionClient(null); onEdit(c) }}>Edit client</button>
                          <button className="danger" onClick={() => { setActionClient(null); if (window.confirm(`Archive ${c.name}?`)) void onArchive(c) }}>Archive client</button>
                        </div>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && (
            <TableEmpty text="No clients match your search" />
          )}
        </div>
        <footer className="clients-footer">
          <span>
            Showing {filtered.length} of {rows.length} clients
          </span>
          <div>
            <button aria-label="Previous page">‹</button>
            <button className="selected">1</button>
            <button aria-label="Next page">›</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
function Tasks({ tasks, setTasks, onOpen, onModal }: any) {
  const params = useSearchParams(),
    clientFilter = params.get("client") || "",
    view = params.get("view") || "list",
    [search, setSearch] = useState("");
  const rows = tasks.filter(
    (t: any) =>
      (!clientFilter || t.client === clientFilter) &&
      Object.values(t).join(" ").toLowerCase().includes(search.toLowerCase()),
  );
  const updateView = (v: string) =>
    history.pushState(
      {},
      "",
      `/tasks?${new URLSearchParams({ ...(clientFilter ? { client: clientFilter } : {}), view: v })}`,
    );
  return (
    <>
      <SectionTitle
        title={clientFilter ? `${clientFilter} tasks` : "Tasks"}
        description={
          clientFilter
            ? `Tasks for ${clientFilter}.`
            : "A focused list of work that moves projects forward."
        }
      />
      <ModuleToolbar><div className="module-toolbar toolbar tasks-toolbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search task, client, project, owner"
        />
        <div className="projects-view-toggle tasks-view-toggle" aria-label="Task view">
          {[
            { id: "list", label: "List", Icon: ListTodo },
            { id: "board", label: "Board", Icon: LayoutDashboard },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              className={view === id ? "selected" : ""}
              onClick={() => updateView(id)}
              aria-label={`${label} view`}
              title={`${label} view`}
            >
              <Icon size={id === "list" ? 16 : 15} />
            </button>
          ))}
        </div>
        <button className={`tasks-my-view${view === "my" ? " selected" : ""}`} onClick={() => updateView("my")}>My tasks</button>
        <button className="button button-subtle">
          <SlidersHorizontal size={14} />
          Filters
        </button>
      <button className="module-toolbar-create" onClick={() => onModal("task")}><Plus size={16}/> New task</button></div></ModuleToolbar>
      {view === "board" ? (
        <div className="kanban-mini">
          {["Requested", "Reviewing", "In Progress", "Done"].map((s) => (
            <div className="kanban-column" key={s}>
              <div className="column-head">
                {s}
                <span>{rows.filter((t: any) => t.status === s).length}</span>
              </div>
              {rows
                .filter((t: any) => t.status === s)
                .map((t: any) => (
                  <button
                    className="requirement-card"
                    key={t.id}
                    onClick={() => onOpen(t.id)}
                  >
                    <strong>{t.title}</strong>
                    <span>{t.client}</span>
                    <Badge tone={tone(t.status)}>{t.status}</Badge>
                  </button>
                ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="table-panel">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Client / project</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((t: any) => view !== "my" || t.owner === "Ananya Rao")
                .map((t: any) => (
                  <tr key={t.id} onClick={() => onOpen(t.id)}>
                    <td>
                      <div className="task-cell">
                        <button
                          className="check-box"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const response = await fetch(`/api/tasks/${t.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "COMPLETED" }) });
                            if (response.ok) setTasks(tasks.map((x: any) => x.id === t.id ? { ...x, status: "Done" } : x));
                          }}
                        >
                          <Check size={12} />
                        </button>
                        <div>
                          <strong>{t.title}</strong>
                        </div>
                      </div>
                    </td>
                    <td>
                      {t.client}
                      <span className="subline">{t.project}</span>
                    </td>
                    <td>
                      <Badge tone={tone(t.status)}>{t.status}</Badge>
                    </td>
                    <td>{t.owner}</td>
                    <td>{t.due}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
function Documents({ sub, onOpen, onModal }: any) {
  if (!sub) return <DocumentsDashboard />;
  return <PersistedDocuments sub={sub} />;
}
/*
  const [search, setSearch] = useState(""),
    type = sub
      ? (
          {
            quotations: "Quotation",
            invoices: "Invoice",
            bills: "Bill",
            approvals: "Approval",
            proposals: "Proposal",
            contracts: "Contract",
          } as any
        )[sub]
      : "";
  const rows = documents.filter(
    (d) =>
      (!type || d.type === type) &&
      Object.values(d).join(" ").toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="document-main">
      <div className="documents-toolbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search number, client, project"
        />
        <button className="button button-subtle">
          <SlidersHorizontal size={14} />
          Filters
        </button>
        <button
          className="button button-primary"
          onClick={() => onModal("document")}
        >
          <Plus size={14} />
          New document
        </button>
      </div>
      {rows.map((d) => (
        <button
          className="document-row"
          key={d.id}
          onClick={() => onOpen(d.id)}
        >
          <div className="document-icon">
            <FileText size={15} />
          </div>
          <div>
            <strong>
              {d.id} · {d.type}
            </strong>
            <span>
              {d.client} · {d.project}
            </span>
          </div>
          <strong>{d.amount}</strong>
          <Badge tone={tone(d.status)}>{d.status}</Badge>
          <ChevronRight size={15} />
        </button>
      ))}
      {!rows.length && <TableEmpty text="No documents match this view" />}
    </div>
  );
}
*/
type DocumentDashboardItem = PersistedItem & { reference_number?: string | null; total_amount?: number; currency?: string; due_at?: string | null; expires_at?: string | null }
function DocumentsDashboardLegacy() {
  const router = useRouter(), [items, setItems] = useState<DocumentDashboardItem[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [creating, setCreating] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { const response = await fetch('/api/documents'), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load document dashboard.'); setItems(body.items || []); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load document dashboard.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const open = () => setCreating(true); window.addEventListener('qnl:document-create', open); return () => window.removeEventListener('qnl:document-create', open); }, []);
  const groups = [{ key: 'quotations', type: 'QUOTATION', label: 'Quotations', description: 'Scope and price proposed work.', icon: FileText }, { key: 'invoices', type: 'INVOICE', label: 'Invoices', description: 'Bill clients and track amounts due.', icon: Receipt }, { key: 'bills', type: 'BILL', label: 'Bills', description: 'Track supplier documents and costs.', icon: CreditCard }, { key: 'proposals', type: 'PROPOSAL', label: 'Proposals', description: 'Present client-ready solutions.', icon: FileSearch }, { key: 'contracts', type: 'CONTRACT', label: 'Contracts', description: 'Manage agreements and signatures.', icon: ClipboardList }];
  const draft = items.filter(item => item.status === 'DRAFT').length, pending = items.filter(item => ['SENT', 'APPROVED'].includes(item.status || '')).length;
  useEffect(() => { window.dispatchEvent(new CustomEvent('qnl:document-summary', { detail: { total: items.length, drafts: draft, inProgress: pending } })); }, [draft, items.length, pending]);
  useEffect(() => {
    if (!creating) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setCreating(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [creating]);
  return <div className="documents-dashboard"><section className="documents-dashboard-hero"><div><span>Documents</span><h1>Document control centre</h1><p>Create, track, and manage client-facing commercial documents in one place.</p></div><div><strong>{items.length}</strong><small>active documents</small></div></section><div className="documents-dashboard-stats"><section><FileText size={18}/><div><small>All documents</small><strong>{items.length}</strong></div></section><section><Pencil size={18}/><div><small>Drafts</small><strong>{draft}</strong></div></section><section><Clock size={18}/><div><small>In progress</small><strong>{pending}</strong></div></section></div>{creating && <section className="documents-create-choice"><div><h2>Choose a document workflow</h2><p>Select the document type you want to create. Each option opens its dedicated workspace.</p></div><div>{groups.map(group => <button key={group.key} className="button button-primary" onClick={() => router.push(`/documents/${group.key}`)}>{group.label}</button>)}<button className="button button-subtle" onClick={() => setCreating(false)}>Cancel</button></div></section>}<section className="documents-dashboard-grid">{groups.map(group => { const Icon = group.icon, count = items.filter(item => item.document_type === group.type).length; return <button type="button" key={group.key} onClick={() => router.push(`/documents/${group.key}`)}><span><Icon size={19}/></span><div><strong>{group.label}</strong><p>{group.description}</p><small>{count} active</small></div><ChevronRight size={17}/></button>; })}</section><section className="documents-recent"><header><div><h2>Recent documents</h2><p>Latest activity across commercial documents.</p></div></header>{loading ? <TableEmpty text="Loading documents…"/> : error ? <TableEmpty text={error}/> : <div>{items.slice(0, 6).map(item => <button key={item.id} onClick={() => router.push(`/documents/${({ QUOTATION: 'quotations', INVOICE: 'invoices', BILL: 'bills', PROPOSAL: 'proposals', CONTRACT: 'contracts' } as Record<string, string>)[item.document_type || ''] || ''}`)}><FileText size={15}/><span><strong>{item.reference_number || item.title}</strong><small>{item.client_name} · {item.document_type?.toLowerCase()}</small></span><Badge tone={tone(item.status || '')}>{item.status}</Badge><ChevronRight size={15}/></button>)}{!items.length && <TableEmpty text="No documents have been created yet."/>}</div>}</section></div>
}
function DocumentsDashboard() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const workflows = [
    { key: "quotations", title: "New quotation", description: "Scope and price proposed work.", icon: FileText },
    { key: "invoices", title: "New invoice", description: "Bill clients and track amounts due.", icon: Receipt },
    { key: "bills", title: "New bill", description: "Track supplier documents and costs.", icon: CreditCard },
    { key: "proposals", title: "New proposal", description: "Present client-ready solutions.", icon: FileSearch },
    { key: "contracts", title: "New contract", description: "Manage agreements and signatures.", icon: ClipboardList },
  ];
  useEffect(() => {
    const open = () => setCreating(true);
    window.addEventListener("qnl:document-create", open);
    return () => window.removeEventListener("qnl:document-create", open);
  }, []);
  useEffect(() => {
    if (!creating) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setCreating(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [creating]);
  const chooseWorkflow = (key: string) => { setCreating(false); router.push(`/documents/${key}`); };
  return <><DocumentsDashboardLegacy />{creating && <div className="document-quick-create-backdrop" onMouseDown={() => setCreating(false)}><section className="document-quick-create-dialog" role="dialog" aria-modal="true" aria-labelledby="document-quick-create-title" onMouseDown={event => event.stopPropagation()}><header><h2 id="document-quick-create-title">Quick create</h2><button type="button" className="document-quick-create-close" onClick={() => setCreating(false)} aria-label="Close quick create"><X size={23} /></button></header><div className="document-quick-create-list">{workflows.map(workflow => { const Icon = workflow.icon; return <button type="button" key={workflow.key} onClick={() => chooseWorkflow(workflow.key)}><span className="document-quick-create-icon"><Icon size={22} /></span><span><strong>{workflow.title}</strong><small>{workflow.description}</small></span><ChevronRight size={19} /></button>; })}</div></section></div>}</>;
}
function Finance({ sub, onModal, onToast }: any) {
  return <PersistedFinance sub={sub} />;
  const title = sub ? sub[0].toUpperCase() + sub.slice(1) : "Finance";
  return (
    <>
      <SectionTitle
        title={title}
        description="Receivables, payments, and expenses in one view."
        action={sub === "payments" ? "Record payment" : "Add expense"}
        onAction={() => onModal(sub === "payments" ? "payment" : "document")}
      />
      <div className="stats-grid finance-stats">
        <Stat
          label="Outstanding"
          value="₹1.84L"
          detail="6 invoices"
          icon={Receipt}
          color="amber"
        />
        <Stat
          label="Collected this month"
          value="₹2.42L"
          detail="+18% vs August"
          icon={CheckCircle2}
          color="green"
        />
        <Stat
          label="Overdue"
          value="₹42,000"
          detail="2 invoices"
          icon={AlertCircle}
          color="red"
        />
        <Stat
          label="Expenses"
          value="₹68,420"
          detail="This month"
          icon={CreditCard}
          color="blue"
        />
      </div>
      <div className="table-panel">
        <div className="panel-head">
          <div>
            <h2>
              {sub === "expenses"
                ? "Expenses"
                : sub === "payments"
                  ? "Payments"
                  : "Receivables"}
            </h2>
            <p>Track financial activity and payment history.</p>
          </div>
          <button
            className="button button-subtle"
            onClick={() => onToast("Finance record updated")}
          >
            Refresh
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Record</th>
              <th>Client</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {documents
              .filter((d) => d.type === "Invoice" || !sub || sub === "payments")
              .map((d) => (
                <tr key={d.id} onClick={() => onToast(`Opening ${d.id}`)}>
                  <td>
                    <strong>{sub === "payments" ? "PAY-0031" : d.id}</strong>
                  </td>
                  <td>{d.client}</td>
                  <td>12 Sep 2026</td>
                  <td>
                    <strong>{d.amount}</strong>
                  </td>
                  <td>
                    <Badge tone={tone(d.status)}>{d.status}</Badge>
                  </td>
                  <td>
                    <MoreHorizontal size={16} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function SettingsPage({
  sub,
  theme,
  onTheme,
  density,
  setDensity,
  accent,
  setAccent,
  onToast,
  companyLogo,
  refreshCompanyLogo,
}: any) {
  const section = sub || "company";
  const [company, setCompany] = useState({
    name: "Quantum Nest Lab",
    email: "hello@quantumnest.in",
    phone: "+91 98765 43210",
    website: "quantumnest.in",
    address: "Bengaluru, Karnataka, India",
  });
  const [documentInfo, setDocumentInfo] = useState({
    legalName: "Quantum Nest Lab Private Limited",
    tax: "29ABCDE1234F1Z5",
    currency: "INR – Indian Rupee (₹)",
    timezone: "(GMT+05:30) Asia/Kolkata",
  });
  const [logo, setLogo] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void fetch("/api/settings/company").then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Unable to load company settings.");
      return body;
    }).then((body) => {
      if (!active) return;
      const ws = body.workspace;
      setCompany({
        name: ws.name || "Quantum Nest Lab",
        email: ws.email || "hello@quantumnest.in",
        phone: ws.phone || "+91 98765 43210",
        website: ws.website || "quantumnest.in",
        address: ws.address || "Bengaluru, Karnataka, India",
      });
      setDocumentInfo({
        legalName: ws.legalName || "Quantum Nest Lab Private Limited",
        tax: ws.taxId || "29ABCDE1234F1Z5",
        currency: ws.currency || "INR – Indian Rupee (₹)",
        timezone: ws.timezone || "(GMT+05:30) Asia/Kolkata",
      });
      setLogo(ws.logoUrl || "");
    }).catch((cause) => {
      if (active) onToast(cause instanceof Error ? cause.message : "Unable to load company settings.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => { setLogo(companyLogo || ""); }, [companyLogo]);
  const updateCompany = (key: string, value: string) =>
    setCompany((current) => ({ ...current, [key]: value }));
  const updateDocumentInfo = (key: string, value: string) =>
    setDocumentInfo((current: any) => ({ ...current, [key]: value }));
  const save = async () => {
    try {
      const response = await fetch("/api/settings/company", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: company.name,
          legalName: documentInfo.legalName,
          email: company.email,
          phone: company.phone,
          address: company.address,
          website: company.website,
          taxId: documentInfo.tax,
          timezone: documentInfo.timezone,
          currency: documentInfo.currency.split(" – ")[0],
          logoUrl: logo,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Unable to save company settings.");
      onToast("Company settings saved");
    } catch (cause) {
      onToast(cause instanceof Error ? cause.message : "Unable to save company settings.");
    }
  };
  if (section === "appearance")
    return (
      <AppearanceSettings
        theme={theme}
        onTheme={onTheme}
        density={density}
        setDensity={setDensity}
        accent={accent}
        setAccent={setAccent}
        onToast={onToast}
      />
    );
  if (section === "company")
    return (
      <CompanySettings
        company={company}
        updateCompany={updateCompany}
        documentInfo={documentInfo}
        updateDocumentInfo={updateDocumentInfo}
        logo={logo}
        setLogo={setLogo}
        save={save}
        onToast={onToast}
      />
    );
  if (section === "security") return <SecuritySettings onToast={onToast} />;
  if (section === "team") return <Team />;
  if (section === "billing") return <BillingSettings onToast={onToast} />;
  if (section === "storage") return <StorageSettings onToast={onToast} />;
  if (section === "integrations") return <IntegrationSettings onToast={onToast} />;
  const content =
    section === "company" ? (
      <>
        <div className="settings-section-head">
          <h2>Company profile</h2>
          <p>Details displayed on documents and client-facing work.</p>
        </div>
        <div className="settings-form">
          {[
            ["name", "Workspace name"],
            ["email", "Business email"],
            ["phone", "Phone"],
            ["website", "Website"],
            ["address", "Business address"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={(company as any)[key]}
                onChange={(e) => updateCompany(key, e.target.value)}
              />
            </label>
          ))}
        </div>
        <div className="settings-actions">
          <button
            className="button button-primary"
            onClick={() => void save()}
          >
            Save changes
          </button>
        </div>
      </>
    ) : section === "billing" ? (
      <>
        <div className="settings-section-head">
          <h2>Billing</h2>
          <p>Manage your workspace subscription and invoice delivery.</p>
        </div>
        <div className="settings-list">
          <div>
            <strong>Professional plan</strong>
            <span>Up to 15 active team members · Renews 12 Oct 2026</span>
          </div>
          <button
            className="button button-subtle"
            onClick={() => onToast("Billing portal opened")}
          >
            Manage plan
          </button>
        </div>
        <div className="settings-form single">
          <label>
            Billing email
            <input defaultValue="accounts@quantumnest.in" />
          </label>
          <label>
            Invoice reference
            <input defaultValue="QNL-FY26" />
          </label>
        </div>
        <div className="settings-actions">
          <button
            className="button button-primary"
            onClick={() => onToast("Billing preferences saved")}
          >
            Save billing details
          </button>
        </div>
      </>
    ) : section === "storage" ? (
      <>
        <div className="settings-section-head">
          <h2>Storage</h2>
          <p>Track workspace file usage and retention.</p>
        </div>
        <div className="storage-meter">
          <div>
            <strong>12.4 GB of 50 GB used</strong>
            <span>Files, meeting recordings, and generated documents</span>
          </div>
          <div className="progress">
            <i style={{ width: "25%" }} />
          </div>
        </div>
        <div className="settings-list">
          <div>
            <strong>File retention</strong>
            <span>
              Keep deleted files for 30 days before permanent removal.
            </span>
          </div>
          <select defaultValue="30 days">
            <option>7 days</option>
            <option>30 days</option>
            <option>90 days</option>
            <option>Keep indefinitely</option>
          </select>
        </div>
        <div className="settings-actions">
          <button
            className="button button-subtle"
            onClick={() => onToast("Storage cleanup started")}
          >
            Review large files
          </button>
          <button
            className="button button-primary"
            onClick={() => onToast("Storage preferences saved")}
          >
            Save preferences
          </button>
        </div>
      </>
    ) : section === "team" ? (
      <>
        <div className="settings-section-head">
          <h2>Team access</h2>
          <p>Invite people and control workspace permissions.</p>
        </div>
        <div className="settings-list">
          <div>
            <strong>4 active members</strong>
            <span>
              Owners and admins can manage billing, security, and workspace
              settings.
            </span>
          </div>
          <button
            className="button button-primary"
            onClick={() => onToast("Invite form opened")}
          >
            Invite member
          </button>
        </div>
        <div className="settings-list">
          <div>
            <strong>Default role for new members</strong>
            <span>New members can access assigned work and shared files.</span>
          </div>
          <select defaultValue="Member">
            <option>Member</option>
            <option>Manager</option>
            <option>Admin</option>
          </select>
        </div>
      </>
    ) : (
      <>
        <div className="settings-section-head">
          <h2>Appearance</h2>
          <p>Choose how the workspace looks and feels.</p>
        </div>
        <div className="settings-list">
          <div>
            <strong>Color theme</strong>
            <span>Use light, dark, or your device setting.</span>
          </div>
          <div className="segmented">
            {["light", "dark", "system"].map((value: any) => (
              <button
                className={theme === value ? "selected" : ""}
                key={value}
                onClick={() => onTheme(value)}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-list">
          <div>
            <strong>Layout density</strong>
            <span>Choose the amount of space between interface elements.</span>
          </div>
          <div className="segmented">
            {["compact", "comfortable"].map((value) => (
              <button
                className={density === value ? "selected" : ""}
                key={value}
                onClick={() => setDensity(value)}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  return (
    <>
      <SectionTitle
        title="Settings"
        description="Workspace preferences and access controls."
      />
      <div className="settings-content">
        <section className="settings-section">{content}</section>
      </div>
    </>
  );
}
type IntegrationConnection = { id: string; provider: string; status: string; display_name: string; configuration: Record<string, unknown>; connected_at: string | null; last_checked_at: string | null; last_error: string | null };

function IntegrationSettings({ onToast }: { onToast: (message: string) => void }) {
  const [items, setItems] = useState<IntegrationConnection[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(""), [editing, setEditing] = useState<IntegrationConnection | null>(null), [displayName, setDisplayName] = useState(""), [configuration, setConfiguration] = useState("{}"), [saving, setSaving] = useState(false);
  const load = async () => { try { setLoading(true); const response = await fetch("/api/integrations"), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || "Unable to load integrations."); setItems(body.items); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load integrations."); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const startEdit = (item: IntegrationConnection) => { setEditing(item); setDisplayName(item.display_name); setConfiguration(JSON.stringify(item.configuration, null, 2)); setError(""); };
  const save = async (event: React.FormEvent) => { event.preventDefault(); if (!editing) return; let parsed: Record<string, unknown>; try { parsed = JSON.parse(configuration); if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error(); } catch { setError("Configuration must be a valid JSON object."); return; } try { setSaving(true); const response = await fetch("/api/integrations", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: editing.provider, displayName, configuration: parsed }) }), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || "Unable to save integration configuration."); setItems(current => current.map(item => item.provider === body.item.provider ? body.item : item)); setEditing(null); onToast(`${displayName} configuration saved. Connect the provider using its verified OAuth or API-key flow.`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save integration configuration."); } finally { setSaving(false); } };
  const providerCopy: Record<string, { category: string; description: string; icon: typeof Folder }> = { GOOGLE_DRIVE: { category: "Drive", description: "Connect a Google account through OAuth; no credentials are pasted into the browser.", icon: Folder }, GOOGLE_CALENDAR: { category: "Calendar", description: "Connected together with Google Drive using the approved Calendar scope.", icon: CalendarDays }, MICROSOFT_CALENDAR: { category: "Calendar", description: "Microsoft 365 calendar connection configuration.", icon: CalendarDays }, GOOGLE_GMAIL: { category: "Mail", description: "Send and archive client communications from the workspace.", icon: Mail }, WHATSAPP_CLOUD: { category: "Messaging", description: "Use a verified WhatsApp Business sender for client messages.", icon: MessageSquare }, STRIPE: { category: "Billing", description: "Manage subscriptions and payment events securely.", icon: CreditCard }, RAZORPAY: { category: "Billing", description: "Accept local payments and reconcile payment events.", icon: Landmark } };
  if (loading) return <div className="empty-state">Loading integration connections…</div>;
  if (error && !editing) return <div className="empty-state">{error}</div>;
  // eslint-disable-next-line @next/next/no-html-link-for-pages
  return <div className="settings-content"><section className="settings-section"><div className="settings-section-head"><h2>Integrations</h2><p>Connect services only from verified provider accounts. Credentials are never stored in your browser.</p></div><div className="settings-list">{items.map(item => { const copy = providerCopy[item.provider] || { category: "Integration", description: "Configure this workspace integration.", icon: Settings }, Icon = copy.icon; return <div key={item.id}><span className="settings-icon"><Icon size={18} /></span><span><strong>{item.display_name}</strong><small>{copy.category} · {copy.description}</small></span><Badge tone={item.status === "CONNECTED" ? "green" : item.status === "ERROR" ? "red" : item.status === "PENDING" ? "amber" : "neutral"}>{item.status.replaceAll("_", " ")}</Badge>{item.provider === "GOOGLE_DRIVE" ? <a className="button button-primary" href="/api/integrations/google/authorize">{item.status === "CONNECTED" ? "Reconnect Google" : "Connect Google"}</a> : <button className="button button-subtle" onClick={() => startEdit(item)}>{item.status === "NOT_CONFIGURED" ? "Set up" : "Configure"}</button>}</div>; })}</div></section>{editing && <section className="settings-section"><div className="settings-section-head"><h2>Configure {editing.display_name}</h2><p>Save non-secret identifiers and preferences. Complete OAuth/API-key exchange through the verified provider flow.</p></div><form className="settings-form" onSubmit={save}><label>Connection name<input required value={displayName} onChange={event => setDisplayName(event.target.value)} /></label><label>Public configuration (JSON)<textarea value={configuration} onChange={event => setConfiguration(event.target.value)} rows={8} spellCheck={false} /></label>{error && <p className="form-error">{error}</p>}<div className="settings-actions"><button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save configuration"}</button><button type="button" className="button button-subtle" onClick={() => { setEditing(null); setError(""); }}>Cancel</button></div></form></section>}</div>;
}

function StorageSettings({ onToast }: { onToast: (message: string) => void }) {
  const [retention, setRetention] = useState("30 days");
  const [stats, setStats] = useState<{ totalFiles: number; totalBytes: number; images: number; videos: number; documents: number; other: number; usedPercent: number; limitBytes: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch("/api/settings/storage").then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Unable to load storage settings.");
      return body.stats;
    }).then((next) => { if (active) setStats(next); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load storage settings."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  };
  const statItems = stats ? [
    [FileText, "blue", stats.totalFiles.toLocaleString(), "Total files"],
    [ImageIcon, "green", stats.images.toLocaleString(), "Images"],
    [Video, "purple", stats.videos.toLocaleString(), "Videos"],
    [Users, "amber", (stats.documents + stats.other).toLocaleString(), "Documents & other"],
  ] : [];
  return (
    <><ModuleToolbar><div className="module-toolbar settings-toolbar"><div className="settings-toolbar-actions"><button className="button button-subtle" onClick={() => onToast("Large files review opened")}><FileText size={14} />Review large files</button><button className="button button-primary" onClick={() => onToast("Storage preferences saved")}><Settings size={14} />Save preferences</button></div></div></ModuleToolbar><div className="storage-settings-page">
      {loading ? (
        <div className="empty-state">Loading storage usage…</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : stats ? (
        <>
          <section className="storage-usage-card">
            <div className="storage-ring">
              <span>
                <strong>{stats.usedPercent}%</strong>
                <small>used</small>
              </span>
            </div>
            <div className="storage-usage-copy">
              <h2>{formatBytes(stats.totalBytes)} of {formatBytes(stats.limitBytes)} used</h2>
              <p>Files, meeting recordings, and generated documents</p>
              <div className="storage-meter">
                <i style={{ width: `${stats.usedPercent}%` }} />
              </div>
              <div className="storage-key">
                <span>
                  <b />
                  {formatBytes(stats.totalBytes)} used
                </span>
                <span>
                  <b />
                  {formatBytes(stats.limitBytes - stats.totalBytes)} available
                </span>
              </div>
            </div>
          </section>
          <div className="storage-stat-grid">
            {statItems.map(([Icon, color, value, label]: any) => (
              <section key={label} className="storage-stat">
                <span className={`storage-stat-icon ${color}`}>
                  <Icon size={20} />
                </span>
                <div>
                  <strong>{value}</strong>
                  <p>{label}</p>
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}
      <section className="storage-retention-card">
        <span className="storage-stat-icon neutral">
          <Clock size={19} />
        </span>
        <div>
          <h2>File retention</h2>
          <p>Keep deleted files for a set period before permanent removal.</p>
        </div>
        <label>
          <select
            value={retention}
            onChange={(event) => {
              setRetention(event.target.value);
              onToast(`File retention changed to ${event.target.value}`);
            }}
          >
            <option>7 days</option>
            <option>30 days</option>
            <option>90 days</option>
            <option>Keep indefinitely</option>
          </select>
          <ChevronDown size={15} />
        </label>
      </section>
      <section className="storage-upgrade-card">
        <span className="storage-stat-icon blue">
          <Info size={19} />
        </span>
        <div>
          <h2>Need more storage?</h2>
          <p>
            Contact your workspace administrator to upgrade your plan or manage
            storage limits.
          </p>
        </div>
        <button
          className="button button-subtle"
          onClick={() => onToast("Plan details opened")}
        >
          View plan details <ArrowRight size={14} />
        </button>
      </section>
    </div></>
  );
}

function BillingSettings({ onToast }: { onToast: (message: string) => void }) {
  const router = useRouter();
  const [billing, setBilling] = useState({ email: "", reference: "" }), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState("");
  useEffect(() => { let active = true; void fetch("/api/settings/billing").then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error?.message || "Unable to load billing settings."); return body.item; }).then(item => { if (active) setBilling({ email: item.billing_email || "", reference: item.invoice_reference || "" }); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load billing settings."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const save = async () => { setError(""); setSaving(true); try { const response = await fetch("/api/settings/billing", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ billingEmail: billing.email, invoiceReference: billing.reference }) }), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || "Unable to save billing settings."); setBilling({ email: body.item.billing_email, reference: body.item.invoice_reference }); onToast("Billing details saved"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save billing settings."); } finally { setSaving(false); } };
  return (
    <><ModuleToolbar><div className="module-toolbar settings-toolbar"><div className="settings-toolbar-actions"><button className="button button-primary" disabled={loading || saving} onClick={() => void save()}><Save size={14} />{saving ? "Saving…" : "Save billing details"}</button><button className="button button-subtle" onClick={() => router.push("/settings/integrations")}><Settings size={14} />Manage plan</button></div></div></ModuleToolbar><div className="billing-settings-page">
      <section className="billing-settings-card">
        <header className="billing-plan-head">
          <span className="billing-icon orange">
            <CreditCard size={19} />
          </span>
          <div className="billing-plan-copy">
            <h2>Professional plan</h2>
            <p>
              Up to 15 active team members <i /> Renews 12 Oct 2026
            </p>
          </div>
        </header>
        <div className="billing-perks">
          <span>
            <Users size={13} />
            15 team members
          </span>
          <span>
            <AlertCircle size={13} />
            Priority support
          </span>
          <span>
            <Star size={13} />
            Advanced features
          </span>
        </div>
        <div className="billing-content-grid">
          <div className="billing-info">
            <h3>Billing information</h3>
            <p>
              This information will be used for invoices and important billing
              notifications.
            </p>
            <label>
              Billing email
              <span className="billing-input">
                <Mail size={15} />
                <input
                  type="email"
                  value={billing.email}
                  onChange={(event) =>
                    setBilling((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </span>
              <small>
                Invoices, payment reminders, and account updates will be sent to
                this email.
              </small>
            </label>
            <label>
              Invoice reference
              <span className="billing-input">
                <FileText size={15} />
                <input
                  value={billing.reference}
                  onChange={(event) =>
                    setBilling((current) => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                />
              </span>
              <small>This reference will appear on your invoices.</small>
            </label>
          </div>
          <aside className="billing-current-plan">
            <div>
              <h3>Current plan</h3>
              <em>Active</em>
            </div>
            <strong>Professional plan</strong>
            <p>Up to 15 active team members</p>
            <hr />
            <span>
              <RotateCcw size={14} />
              Renews on <b>12 Oct 2026</b>
            </span>
            <span>
              <Users size={14} />
              Team members <b>4 / 15</b>
            </span>
            <span>
              <FileText size={14} />
              Invoice reference <b>{billing.reference || "—"}</b>
            </span>
          </aside>
        </div>
        <footer className="billing-notice">
          <span className="billing-icon blue">
            <Info size={19} />
          </span>
          <div>
            <strong>Need to make changes?</strong>
            <p>
              You can update your plan, billing details, or team size at any
              time. Changes will apply to your next billing cycle.
            </p>
          </div>
        </footer>
        {error && <p className="form-error">{error}</p>}
      </section>
    </div></>
  );
}

function TeamSettings({ onToast }: { onToast: (message: string) => void }) {
  const [role, setRole] = useState("Member");
  return (
    <><ModuleToolbar><div className="module-toolbar settings-toolbar"><div className="settings-toolbar-actions"><button className="button button-primary" onClick={() => onToast("Invite form opened")}><Users size={15} />Invite member</button></div></div></ModuleToolbar><div className="team-settings-page">
      <section className="team-settings-card team-members-card">
        <span className="team-settings-icon orange">
          <Users size={20} />
        </span>
        <div className="team-settings-copy">
          <h2>Team members</h2>
          <p>
            Manage who has access to the workspace. Owners and admins can manage
            billing, security, and workspace settings.
          </p>
        </div>
        <div className="team-member-count">
          <strong>4</strong>
          <span>Active members</span>
        </div>
        <span className="team-divider" />
      </section>
      <section className="team-settings-card team-role-card">
        <span className="team-settings-icon neutral">
          <ShieldCheck size={19} />
        </span>
        <div className="team-settings-copy">
          <h2>Default role for new members</h2>
          <p>New members can access assigned work and shared files.</p>
        </div>
        <label className="team-role-select">
          <Users size={15} />
          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              onToast(`Default role changed to ${event.target.value}`);
            }}
          >
            <option>Member</option>
            <option>Manager</option>
            <option>Admin</option>
          </select>
          <ChevronDown size={15} />
        </label>
      </section>
      <section className="team-settings-card team-permissions-card">
        <span className="team-settings-icon blue">
          <Info size={20} />
        </span>
        <div className="team-settings-copy">
          <h2>Role permissions</h2>
          <p>
            Manage detailed role permissions, access levels, and workspace
            capabilities in the Team section. You can update roles for existing
            members anytime.
          </p>
        </div>
        <button
          className="button button-subtle team-manage-roles"
          onClick={() => onToast("Role permissions opened")}
        >
          {" "}
          <ExternalLink size={15} />
          Manage roles
        </button>
      </section>
    </div></>
  );
}

function SecuritySettings({ onToast }: { onToast: (message: string) => void }) {
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const updatePassword = (
    field: "current" | "next" | "confirm",
    value: string,
  ) => setPasswords((current) => ({ ...current, [field]: value }));
  const requirements = [
    ["At least 8 characters", passwords.next.length >= 8],
    [
      "Include uppercase and lowercase letters",
      /[a-z]/.test(passwords.next) && /[A-Z]/.test(passwords.next),
    ],
    ["Include a number", /\d/.test(passwords.next)],
    [
      "Include a special character (e.g. ! @ # $ % ^ & *)",
      /[^A-Za-z0-9]/.test(passwords.next),
    ],
  ];
  const canUpdate =
    passwords.current.length > 0 &&
    requirements.every(([, valid]) => valid) &&
    passwords.next === passwords.confirm;
  const savePassword = async () => {
    try {
      const response = await fetch('/api/account/password', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.next, confirmPassword: passwords.confirm }) }), body = await response.json()
      if (!response.ok) throw new Error(body.error?.message || 'Unable to update password.')
      setPasswords({ current: '', next: '', confirm: '' })
      onToast('Password updated')
    } catch (cause) { onToast(cause instanceof Error ? cause.message : 'Unable to update password.') }
  }
  return (
    <div className="security-page">
      <div className="security-top-grid">
        <section className="security-card security-auth-card">
          <div className="security-heading">
            <span className="security-icon blue">
              <ShieldCheck size={19} />
            </span>
            <div>
              <h2>Two-factor authentication</h2>
              <p>
                Add an extra verification step when signing in to keep your
                workspace secure.
              </p>
            </div>
          </div>
          <div className="security-2fa-status">
            <span className="security-status-dot">
              <Circle size={8} fill="currentColor" />
            </span>
            <div>
              <strong>Not enabled</strong>
              <span>Two-factor authentication is currently off.</span>
            </div>
            <button
              className="button button-primary"
              onClick={() => onToast("Two-factor authentication setup opened")}
            >
              Set up 2FA
            </button>
          </div>
          <div className="security-methods">
            <div>
              <span className="security-icon blue">
                <Smartphone size={18} />
              </span>
              <strong>Authenticator app</strong>
              <p>Use an app like Google Authenticator or Authy</p>
            </div>
            <div>
              <span className="security-icon blue">
                <MessageSquare size={18} />
              </span>
              <strong>SMS verification</strong>
              <p>Get a code via SMS to your mobile</p>
            </div>
            <div>
              <span className="security-icon blue">
                <Mail size={18} />
              </span>
              <strong>Backup codes</strong>
              <p>Keep recovery codes in a safe place</p>
            </div>
          </div>
        </section>
        <section className="security-card">
          <div className="security-heading">
            <span className="security-icon green">
              <Monitor size={19} />
            </span>
            <div>
              <h2>Active sessions</h2>
              <p>These are the devices currently signed in to your account.</p>
            </div>
          </div>
          <div className="security-session">
            <span className="security-device">
              <Monitor size={17} />
            </span>
            <div>
              <strong>
                Windows · Chrome <em>Current session</em>
              </strong>
              <span>
                DESKTOP-ABC123 <i /> New Delhi, India
              </span>
            </div>
            <small>Active now</small>
          </div>
          <button
            className="security-review"
            onClick={() => onToast("Session review opened")}
          >
            Review sessions <ExternalLink size={14} />
          </button>
        </section>
      </div>
      <section className="security-card security-password-card">
        <div className="security-heading">
          <span className="security-icon purple">
            <LockKeyhole size={19} />
          </span>
          <div>
            <h2>Change password</h2>
            <p>Use a strong password to keep your account secure.</p>
          </div>
        </div>
        <div className="security-password-grid">
          <div className="security-password-fields">
            {[
              ["current", "Current password", "Enter your current password"],
              ["next", "New password", "Enter your new password"],
              ["confirm", "Confirm new password", "Confirm your new password"],
            ].map(([field, label, placeholder]) => (
              <label key={field}>
                {label}
                <span className="security-password-input">
                  <KeyRound size={14} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwords[field as "current" | "next" | "confirm"]}
                    onChange={(event) =>
                      updatePassword(
                        field as "current" | "next" | "confirm",
                        event.target.value,
                      )
                    }
                    placeholder={placeholder}
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide passwords" : "Show passwords"
                    }
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    <Eye size={15} />
                  </button>
                </span>
              </label>
            ))}
            <button
              className="button button-primary security-update"
              disabled={!canUpdate}
              onClick={() => void savePassword()}
            >
              Update password
            </button>
          </div>
          <aside className="security-requirements">
            <strong>
              <Info size={15} />
              Password requirements
            </strong>
            {requirements.map(([label, valid]) => (
              <span key={label as string} className={valid ? "met" : ""}>
                <CheckCircle2 size={14} />
                {label}
              </span>
            ))}
          </aside>
        </div>
      </section>
    </div>
  );
}

function CompanySettings({ company, updateCompany, documentInfo, updateDocumentInfo, logo, setLogo, save, onToast }: any) {
  const [clientPreview, setClientPreview] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const changeLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onToast("Please choose a PNG or JPG image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onToast("Logo must be smaller than 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const nextLogo = String(reader.result);
      setLogo(nextLogo);
      onToast("Logo updated — save changes to persist");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  const Logo = ({ className = "company-logo" }: { className?: string }) => (
    <span className={className}>
      <img src={logo || "/qnl-logo-mark.png"} alt="Company logo" />
    </span>
  );
  return (
    <div className="company-page">
      <ModuleToolbar>
        <div className="module-toolbar company-toolbar">
          <div className="company-page-actions">
          <button
            className="button button-subtle"
            onClick={() => setClientPreview(true)}
          >
            <Eye size={15} />
            View as client
          </button>
          <button className="button button-primary" onClick={() => void save()}>
            <Save size={14} />
            Save changes
          </button>
          </div>
        </div>
      </ModuleToolbar>
      <section className="company-profile-card">
        <div className="company-card-title">
          <span className="company-title-icon">
            <Building2 size={17} />
          </span>
          <div>
            <h2>Company profile</h2>
            <p>Details displayed on documents and client-facing work.</p>
          </div>
        </div>
        <div className="company-profile-body">
          <div className="company-identity">
            <Logo />
            <div>
              <h3>{company.name}</h3>
              <p>Turning ideas into intelligent solutions.</p>
              <input
                ref={logoInput}
                className="company-logo-input"
                type="file"
                accept="image/png,image/jpeg"
                onChange={changeLogo}
              />
              <button
                className="button button-subtle company-logo-button"
                onClick={() => logoInput.current?.click()}
              >
                <Upload size={14} />
                Change logo
              </button>
              <small>Recommended: 400 × 400px, PNG or JPG.</small>
            </div>
          </div>
          <div className="company-fields">
            <CompanyField
              label="Workspace name"
              required
              icon={Building2}
              value={company.name}
              onChange={(e: any) => updateCompany("name", e.target.value)}
            />
            <CompanyField
              label="Business email"
              required
              icon={Mail}
              value={company.email}
              onChange={(e: any) => updateCompany("email", e.target.value)}
            />
            <CompanyPhoneField
              value={company.phone}
              onChange={(value: string) => updateCompany("phone", value)}
            />
            <CompanyField
              label="Website"
              icon={Link}
              value={company.website}
              onChange={(e: any) => updateCompany("website", e.target.value)}
            />
            <CompanyField
              label="Business address"
              icon={MapPin}
              value={company.address}
              onChange={(e: any) => updateCompany("address", e.target.value)}
            />
          </div>
        </div>
      </section>
      <div className="company-bottom-grid">
        <section className="company-document-card">
          <div className="company-card-title">
            <span className="company-title-icon">
              <FileText size={17} />
            </span>
            <div>
              <h2>Document information</h2>
              <p>
                This information appears on invoices, proposals and other
                client-facing documents.
              </p>
            </div>
          </div>
          <div className="document-fields">
            <CompanyField
              label="Legal business name"
              icon={Building2}
              value={documentInfo.legalName}
              onChange={(e: any) =>
                updateDocumentInfo("legalName", e.target.value)
              }
            />
            <CompanyField
              label="Default currency"
              icon={Landmark}
              value={documentInfo.currency}
              options={[
                "INR – Indian Rupee (₹)",
                "USD – US Dollar ($)",
                "EUR – Euro (€)",
                "GBP – British Pound (£)",
                "AED – UAE Dirham (د.إ)",
              ]}
              onChange={(e: any) =>
                updateDocumentInfo("currency", e.target.value)
              }
            />
            <CompanyField
              label="Tax / GST number"
              icon={Receipt}
              value={documentInfo.tax}
              onChange={(e: any) => updateDocumentInfo("tax", e.target.value)}
            />
            <CompanyField
              label="Time zone"
              icon={Globe2}
              value={documentInfo.timezone}
              options={[
                "(GMT+05:30) Asia/Kolkata",
                "(GMT+00:00) Europe/London",
                "(GMT-05:00) America/New_York",
                "(GMT-08:00) America/Los_Angeles",
                "(GMT+04:00) Asia/Dubai",
                "(GMT+08:00) Asia/Singapore",
              ]}
              onChange={(e: any) =>
                updateDocumentInfo("timezone", e.target.value)
              }
            />
          </div>
        </section>
        <section className="company-preview-card">
          <div className="company-card-title">
            <span className="company-title-icon">
              <Eye size={17} />
            </span>
            <div>
              <h2>Branding preview</h2>
              <p>This is how your company details may appear on documents.</p>
            </div>
          </div>
          <div className="brand-preview">
            <div className="brand-preview-top">
              <Logo className="brand-preview-logo" />
              <div>
                <strong>{company.name}</strong>
                <small>Turning ideas into intelligent solutions.</small>
              </div>
            </div>
            <div className="brand-preview-details">
              <span>
                <Phone size={13} />
                {company.phone}
              </span>
              <span>
                <Link size={13} />
                {company.website}
              </span>
              <span>
                <Mail size={13} />
                {company.email}
              </span>
              <span>
                <MapPin size={13} />
                {company.address}
              </span>
            </div>
          </div>
        </section>
      </div>
      <footer className="company-save-bar">
        <span className="company-title-icon">
          <Info size={17} />
        </span>
        <div>
          <strong>Keep your information up to date</strong>
          <p>
            This information is used across invoices, proposals and client
            communications. Changes will apply immediately.
          </p>
        </div>
      </footer>
      {clientPreview && (
        <div
          className="company-client-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Client branding preview"
          onMouseDown={() => setClientPreview(false)}
        >
          <section
            className="company-client-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="icon-button company-preview-close"
              aria-label="Close preview"
              onClick={() => setClientPreview(false)}
            >
              <X size={17} />
            </button>
            <div className="eyebrow">Client view</div>
            <div className="company-client-brand">
              <Logo />
              <div>
                <h2>{company.name}</h2>
                <p>Turning ideas into intelligent solutions.</p>
              </div>
            </div>
            <hr />
            <p className="company-client-copy">
              This is the company information your clients see on invoices,
              proposals, and shared documents.
            </p>
            <div className="company-client-contact">
              <span>
                <Mail size={14} />
                {company.email}
              </span>
              <span>
                <Phone size={14} />
                {company.phone}
              </span>
              <span>
                <Link size={14} />
                {company.website}
              </span>
              <span>
                <MapPin size={14} />
                {company.address}
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function AppearanceSettings({
  theme,
  onTheme,
  density,
  setDensity,
  accent,
  setAccent,
  onToast,
}: any) {
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [draftTheme, setDraftTheme] = useState(theme),
    [draftDensity, setDraftDensity] = useState(density),
    [draftAccent, setDraftAccent] = useState(accent);
  useEffect(() => {
    const stored = localStorage.getItem("qnl-custom-accent-colors");
    if (stored) setCustomColors(JSON.parse(stored).slice(-1));
  }, []);
  useEffect(() => {
    setDraftTheme(theme);
    setDraftDensity(density);
    setDraftAccent(accent);
  }, [theme, density, accent]);
  const reset = () => {
    setDraftTheme("dark");
    setDraftDensity("compact");
    setDraftAccent("#3195ff");
  };
  const saveAppearance = () => {
    onTheme(draftTheme);
    setDensity(draftDensity);
    setAccent(draftAccent);
    const isPreset = [
      "#3195ff",
      "#9a6cff",
      "#2fc77c",
      "#f2b72a",
      "#f35d6d",
      "#778aa1",
    ].includes(draftAccent);
    if (!isPreset) {
      const next = [draftAccent];
      setCustomColors(next);
      localStorage.setItem("qnl-custom-accent-colors", JSON.stringify(next));
    }
    onToast("Appearance changes saved");
  };
  const chooseCustomColor = (color: string) => setDraftAccent(color);
  const themes = [
    {
      id: "light",
      label: "Light",
      text: "Clean and bright interface",
      icon: Sun,
    },
    { id: "dark", label: "Dark", text: "Easy on the eyes", icon: Moon },
    {
      id: "system",
      label: "System",
      text: "Follow your device settings",
      icon: Monitor,
    },
  ];
  return (
    <><ModuleToolbar><div className="module-toolbar settings-toolbar"><div className="settings-toolbar-actions"><button className="button button-subtle appearance-reset" onClick={reset}><RotateCcw size={15} />Reset to defaults</button><button className="button button-primary appearance-save" onClick={saveAppearance}><Check size={15} />Save changes</button></div></div></ModuleToolbar><div
      className="appearance-page"
      style={{ "--appearance-accent": draftAccent } as React.CSSProperties}
    >
      <div className="appearance-grid">
        <div className="appearance-controls">
          <section className="appearance-card">
            <div className="appearance-card-head">
              <Palette />
              <div>
                <h2>Color theme</h2>
                <p>
                  Choose your preferred color theme. This will update the look
                  and feel across the workspace.
                </p>
              </div>
            </div>
            <div className="theme-choices">
              {themes.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`theme-choice ${draftTheme === item.id ? "selected" : ""} ${item.id}`}
                    onClick={() => setDraftTheme(item.id)}
                  >
                    <div className="theme-choice-head">
                      <Icon size={18} />
                      <strong>{item.label}</strong>
                      {draftTheme === item.id && <Check size={17} />}
                    </div>
                    <div className="theme-thumbnail">
                      <span />
                      <i />
                      <b />
                      <em />
                    </div>
                    <strong className="theme-label">{item.label}</strong>
                    <small>{item.text}</small>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="appearance-card density-card">
            <div className="appearance-card-head">
              <SlidersHorizontal />
              <div>
                <h2>Layout density</h2>
                <p>Choose the amount of space between interface elements.</p>
              </div>
            </div>
            <div className="density-choices">
              {[
                ["compact", "Compact", "More content on screen"],
                ["comfortable", "Comfortable", "More breathing room"],
              ].map(([id, label, desc]) => (
                <button
                  key={id}
                  className={`density-choice ${draftDensity === id ? "selected" : ""}`}
                  onClick={() => setDraftDensity(id)}
                >
                  <span className="density-icon">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>
                    <strong>{label}</strong>
                    <small>{desc}</small>
                  </span>
                  {draftDensity === id && <Check size={17} />}
                </button>
              ))}
            </div>
          </section>
          <section className="appearance-card accent-card">
            <div className="appearance-card-head">
              <Droplets />
              <div>
                <h2>Accent color</h2>
                <p>Choose a highlight color for interactive elements.</p>
              </div>
            </div>
            <div className="accent-swatches">
              {[
                "#3195ff",
                "#9a6cff",
                "#2fc77c",
                "#f2b72a",
                "#f35d6d",
                "#778aa1",
                ...customColors,
              ].map((color) => (
                <button
                  aria-label={`Use ${color} accent`}
                  key={color}
                  onClick={() => setDraftAccent(color)}
                  className={draftAccent === color ? "selected" : ""}
                  style={{ backgroundColor: color }}
                >
                  {draftAccent === color && <Check size={15} />}
                </button>
              ))}
              <label
                className="custom-color"
                title="Choose a custom accent color"
                style={{ "--custom-color": draftAccent } as React.CSSProperties}
              >
                <input
                  type="color"
                  value={draftAccent}
                  onChange={(event) => chooseCustomColor(event.target.value)}
                  aria-label="Choose a custom accent color"
                />
                <Plus size={15} />
              </label>
            </div>
            {customColors.length > 0 && (
              <small className="custom-colors-note">
                Your custom color is saved to the palette.
              </small>
            )}
          </section>
        </div>
        <section className="live-preview">
          <div className="appearance-card-head">
            <Eye />
            <div>
              <h2>Live preview</h2>
              <p>
                This is how the workspace will look with your current settings.
              </p>
            </div>
          </div>
          <div className="preview-window">
            <aside>
              <b>Q</b>
              {Array.from({ length: 6 }).map((_, i) => (
                <i key={i} className={i === 4 ? "active" : ""} />
              ))}
            </aside>
            <main>
              <header>
                <b />
                <i />
                <span />
                <em />
              </header>
              <div className="preview-stats">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <b />
                    <i />
                    <i />
                  </div>
                ))}
              </div>
              <div className="preview-columns">
                <section>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>
                      <b />
                      <i />
                      <em />
                    </div>
                  ))}
                </section>
                <section>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>
                      <b>✓</b>
                      <i />
                      <i />
                    </div>
                  ))}
                </section>
              </div>
            </main>
          </div>
        </section>
      </div>
    </div></>
  );
}
function Drive({ onToast }: any) {
  return <DriveManager />;
  const [search, setSearch] = useState(""),
    [folder, setFolder] = useState("Organizations");
  const files = [
    {
      name: "QNL Books v1.6.2.zip",
      type: "ZIP",
      folder: "09 - Deliverables",
      modified: "Today, 10:24 AM",
      size: "48.2 MB",
    },
    {
      name: "product-review-transcript.txt",
      type: "TXT",
      folder: "04 - Meetings",
      modified: "Yesterday, 4:18 PM",
      size: "18 KB",
    },
    {
      name: "cash-bill-specification.pdf",
      type: "PDF",
      folder: "02 - Requirements",
      modified: "12 Sep 2026, 2:11 PM",
      size: "2.4 MB",
    },
  ].filter(
    (f) =>
      Object.values(f).join(" ").toLowerCase().includes(search.toLowerCase()) &&
      (folder === "Organizations" || f.folder === folder),
  );
  return (
    <div className="drive-page">
      <header className="drive-page-head">
        <button
          className="button button-primary"
          onClick={() => onToast("Upload file opened")}
        >
          <Upload size={15} />
          Upload file
        </button>
      </header>
      <div className="drive-layout">
        <aside className="folder-tree">
          <div className="tree-head">
            Folders{" "}
            <button className="icon-button">
              <Plus size={15} />
            </button>
          </div>
          {folders.map((f) => (
            <button
              key={f}
              className={folder === f ? "selected" : ""}
              onClick={() => setFolder(f)}
            >
              <Folder size={14} />
              {f}
              <ChevronRight size={13} />
            </button>
          ))}
        </aside>
        <section className="file-area">
          <div className="file-toolbar">
            <div className="drive-breadcrumb">
              <Folder size={19} />
              {folder}
            </div>
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search files in this folder..."
            />
            <button className="icon-button">
              <ListTodo size={15} />
            </button>
          </div>
          <div className="file-head">
            <span /> <span>Name　↕</span>
            <span>Folder　↕</span>
            <span>Last modified　↕</span>
            <span>Size　↕</span>
            <span>Actions</span>
          </div>
          {files.map((f) => (
            <button
              className="file-row"
              key={f.name}
              onClick={() => onToast(`Previewing ${f.name}`)}
            >
              <span className="check-box" />
              <div className={`file-name ${f.type.toLowerCase()}`}>
                <span className="file-icon">{f.type}</span>
                <div>
                  <strong>{f.name}</strong>
                  <small>
                    {f.type === "ZIP"
                      ? "Compressed Archive"
                      : f.type === "TXT"
                        ? "Text Document"
                        : "PDF Document"}
                  </small>
                </div>
              </div>
              <span>{f.folder}</span>
              <span>{f.modified}</span>
              <span>{f.size}</span>
              <MoreHorizontal size={15} />
            </button>
          ))}
          <footer className="drive-footer">
            {files.length} files{" "}
            <span>
              <button>‹</button>
              <button className="selected">1</button>
              <button>›</button>
            </span>
          </footer>
        </section>
      </div>
    </div>
  );
}
function Meetings({ onToast, onOpen }: any) {
  return <MeetingsManager />;
  const [tab, setTab] = useState("Summary"),
    [selected, setSelected] = useState(0);
  const meetings = [
      {
        title: "Mara Coffee Product Review Meeting",
        client: "Mara Coffee · QNL Books",
        status: "Not Processed",
      },
      {
        title: "Campus Deployment Check-in",
        client: "Morning Star Public School",
        status: "Complete",
      },
      {
        title: "Website Content Review",
        client: "Morning Star Public School",
        status: "Complete",
      },
    ],
    current = meetings[selected];
  return (
    <div className="meetings-workspace">
      <div className="meetings-page-actions">
        <button
          className="button button-primary"
          onClick={() => onToast("New meeting form opened")}
        >
          <Plus size={14} />
          New meeting
        </button>
      </div>
      <div className="meetings-page">
        <div className="meetings-list-pane">
          <div className="meetings-list-tools">
            <SearchBox
              value=""
              onChange={() => {}}
              placeholder="Search meetings..."
            />
            <button className="meeting-sort">
              Upcoming first <ChevronDown size={14} />
            </button>
            <button className="icon-button">
              <SlidersHorizontal size={15} />
            </button>
          </div>
          <div className="meeting-list">
            {meetings.map((meeting, index) => (
              <button
                className={`meeting-row ${selected === index ? "selected" : ""}`}
                key={meeting.title}
                onClick={() => setSelected(index)}
              >
                <span className="meeting-icon">
                  <Video size={17} />
                </span>
                <div>
                  <strong>{meeting.title}</strong>
                  <span>{meeting.client}</span>
                  <small>▣ 12 Sep 2026　◷ 42 min</small>
                </div>
                <Badge tone={meeting.status === "Complete" ? "green" : "amber"}>
                  {meeting.status}
                </Badge>
                <MoreHorizontal size={16} />
              </button>
            ))}
          </div>
        </div>
        <section className="meeting-detail">
          <header>
            <div>
              <span className="meeting-selected-label">Selected meeting</span>
              <h2>{current.title}</h2>
              <p>
                <Video size={14} /> {current.client}
              </p>
              <p>▣　12 Sep 2026　　◷　42 min</p>
            </div>
            <div className="meeting-detail-actions">
              <Badge tone={current.status === "Complete" ? "green" : "amber"}>
                {current.status}
              </Badge>
              <button className="button button-subtle">
                <MoreHorizontal size={15} />
              </button>
              <button
                className="button button-subtle"
                onClick={() => onToast("Joining meeting")}
              >
                <Video size={14} />
                Join meeting
              </button>
            </div>
          </header>
          <div className="tabs">
            {[
              "Summary",
              "Transcript",
              "Decisions",
              "Requirements",
              "Tasks",
              "Files",
            ].map((item) => (
              <button
                className={tab === item ? "active" : ""}
                key={item}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <section className="meeting-summary">
            <span>
              <FileText size={20} />
            </span>
            <div>
              <strong>Meeting summary</strong>
              <p>
                {tab === "Summary"
                  ? "The team reviewed billing workflows for the upcoming release."
                  : `${tab} content for this meeting is ready to review.`}
              </p>
            </div>
            <button
              className="button button-primary"
              onClick={() => onToast("Draft review opened")}
            >
              <FileText size={13} />
              Review drafts
            </button>
          </section>
          <section className="meeting-linked">
            <span>
              <Link size={18} />
            </span>
            <div>
              <strong>Linked records</strong>
              <div>
                <button onClick={() => onOpen("MTG-0088")}>MTG-0088 ↗</button>
                <button onClick={() => onOpen("REQ-0041")}>REQ-0041 ↗</button>
                <button onClick={() => onOpen("TASK-0104")}>
                  TASK-0104 ↗
                </button>
              </div>
            </div>
          </section>
          <footer className="meeting-meta">
            <div>
              <Users size={15} />
              <span>Attendees</span>
              <b>AR　VS　MN　SR　+2</b>
            </div>
            <div>
              <Folder size={15} />
              <span>Related project</span>
              <b>
                QNL Books
                <br />
                <small>Mara Coffee</small>
              </b>
            </div>
            <div>
              <Video size={15} />
              <span>Meeting type</span>
              <b>
                Video call
                <br />
                <small>Google Meet</small>
              </b>
            </div>
            <div>
              <Users size={15} />
              <span>Created by</span>
              <b>
                Ananya Rao
                <br />
                <small>2 days ago</small>
              </b>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
function ActivityPage({ onOpen }: any) {
  return <ActivityFeedFilters />;
  const [filter, setFilter] = useState("All activity"),
    [day, setDay] = useState("All dates"),
    [filterOpen, setFilterOpen] = useState(false),
    [dateOpen, setDateOpen] = useState(false);
  const visible = activities.filter(
    (activity: ActivityRecord, index) =>
      (filter === "All activity" || activity.type === filter) &&
      (day === "All dates" || (day === "Today" ? index < 2 : index >= 2)),
  );
  const filters = [
    "All activity",
    ...Array.from(
      new Set(activities.map((activity: ActivityRecord) => activity.type)),
    ),
  ];
  return (
    <div className="activity-workspace">
      <header className="activity-page-head">
        <div className="activity-filter">
          <button
            className="button button-subtle"
            onClick={() => {
              setFilterOpen((open) => !open);
              setDateOpen(false);
            }}
          >
            <SlidersHorizontal size={14} />
            {filter} <ChevronDown size={13} />
          </button>
          {filterOpen && (
            <div className="activity-filter-menu">
              {filters.map((option) => (
                <button
                  key={option}
                  className={filter === option ? "selected" : ""}
                  onClick={() => {
                    setFilter(option);
                    setFilterOpen(false);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="activity-filter">
          <button
            className="button button-subtle"
            onClick={() => {
              setDateOpen((open) => !open);
              setFilterOpen(false);
            }}
          >
            <Activity size={14} />
            {day} <ChevronDown size={13} />
          </button>
          {dateOpen && (
            <div className="activity-filter-menu">
              {["All dates", "Today", "Yesterday"].map((option) => (
                <button
                  key={option}
                  className={day === option ? "selected" : ""}
                  onClick={() => {
                    setDay(option);
                    setDateOpen(false);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      <div className="activity-timeline">
        {visible.map((a: ActivityRecord, index) => (
          <div className="activity-timeline-item" key={a.id}>
            {(index === 0 || (index === 2 && visible.length > 2)) && (
              <h2>
                {index === 0 ? "Today" : "Yesterday"}{" "}
                <small>
                  {index === 0
                    ? "2 activities"
                    : `${visible.length - 2} activities`}
                </small>
              </h2>
            )}
            <i />
            <div
              className="activity-card"
              role="button"
              tabIndex={0}
              onClick={() => onOpen(a.linked[0])}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ")
                  onOpen(a.linked[0]);
              }}
            >
              <div className="activity-date">
                <strong>{a.time}</strong>
                <span>{a.type}</span>
              </div>
              <div className="activity-card-body">
                <div className="activity-avatar">{a.actor[0]}</div>
                <div>
                  <strong>{a.actor}</strong>
                  <p>{a.description}</p>
                  <span>
                    {a.client} · {a.project}
                  </span>
                  <Linked records={a.linked} onOpen={onOpen} />
                </div>
              </div>
              <MoreHorizontal size={16} />
            </div>
          </div>
        ))}
        {!visible.length && (
          <div className="empty-state">No activity matches this filter.</div>
        )}
      </div>
    </div>
  );
}
function Approvals({ onModal, onOpen }: any) {
  return <PersistedApprovals />;
  return (
    <>
      <SectionTitle
        title="Approvals"
        description="Evidence-led decisions with a clear audit trail."
        action="Request approval"
        onAction={() => onModal("approval")}
      />
      <div className="approval-list">
        {[
          ["APR-0019", "QNL Books v1.6.2", "Mara Coffee", "Requested"],
          [
            "APR-0016",
            "School Website homepage",
            "Sri Basaveshwara English High School",
            "Changes Requested",
          ],
          [
            "APR-0013",
            "Campus deployment checklist",
            "Morning Star Public School",
            "Approved",
          ],
        ].map((a) => (
          <div className="approval-row" key={a[0]}>
            <div className="approval-icon">
              <ShieldCheck size={16} />
            </div>
            <div className="approval-copy">
              <strong>
                {a[0]} · {a[1]}
              </strong>
              <span>{a[2]} · Requested by Ananya Rao</span>
              <Linked records={["REQ-0041", "TASK-0104"]} onOpen={onOpen} />
            </div>
            <Badge tone={tone(a[3])}>{a[3]}</Badge>
            <button
              className="button button-subtle"
              onClick={() => onOpen(a[0])}
            >
              Review
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function CreateModal({ kind, onClose, onSave }: any) {
  const labels: any = {
    client: "Client",
    project: "Project",
    requirement: "Requirement",
    task: "Task",
    meeting: "Meeting",
    document: "Document",
    payment: "Payment",
    approval: "Approval",
    invite: "Team member",
    upload: "File",
  };
  const label = labels[kind];
  const [form, setForm] = useState<Record<string, string>>({
    status: kind === "client" ? "Lead" : kind === "task" ? "To Do" : "Draft",
    priority: "Normal",
    clientType: "Organization",
  });
  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const field = (
    key: string,
    title: string,
    required = false,
    type = "text",
  ) => (
    <label key={key}>
      {title}
      {required && " *"}
      <input
        autoFocus={key === "name"}
        type={type}
        value={form[key] || ""}
        onChange={(e) => set(key, e.target.value)}
        required={required}
      />
    </label>
  );
  const select = (key: string, title: string, values: string[]) => (
    <label key={key}>
      {title}
      <select
        value={form[key] || values[0]}
        onChange={(e) => set(key, e.target.value)}
      >
        {values.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </label>
  );
  const fields: React.ReactNode[] =
    kind === "client"
      ? [
          select("clientType", "Client type", ["Organization", "Individual"]),
          field(
            "name",
            form.clientType === "Individual"
              ? "Full name"
              : "Organization name",
            true,
          ),
          select("organizationType", "Organization type", [
            "Company",
            "School",
            "Cafe / Restaurant",
            "Institution",
            "Vendor",
            "NGO",
            "Other",
          ]),
          field("email", "Email", false, "email"),
          field("phone", "Phone"),
          field("website", "Website"),
          field("address", "Address"),
          field("city", "City"),
          field("owner", "Owner"),
        ]
      : kind === "project"
        ? [
            field("name", "Project name", true),
            field("client", "Client", true),
            field("description", "Description"),
            select("status", "Status", [
              "Planned",
              "Active",
              "On Hold",
              "Completed",
              "Cancelled",
              "Archived",
            ]),
            field("startDate", "Start date", false, "date"),
            field("targetDate", "Target date", false, "date"),
            field("owner", "Owner", true),
            select("priority", "Priority", ["Low", "Normal", "High", "Urgent"]),
          ]
        : kind === "requirement"
          ? [
              field("title", "Requirement title", true),
              field("description", "Description", true),
              field("client", "Client", true),
              field("project", "Project"),
              select("source", "Source type", [
                "Meeting",
                "Call",
                "Email",
                "WhatsApp",
                "Client Message",
                "Internal",
                "Other",
              ]),
              select("priority", "Priority", [
                "Low",
                "Normal",
                "High",
                "Urgent",
              ]),
              select("status", "Status", [
                "Requested",
                "Reviewing",
                "Accepted",
                "In Progress",
                "Done",
                "Approved",
                "Rejected",
                "Cancelled",
              ]),
              field("owner", "Owner"),
            ]
          : kind === "task"
            ? [
                field("title", "Task title", true),
                field("description", "Description"),
                field("client", "Client"),
                field("project", "Project"),
                field("requirement", "Requirement"),
                field("assignee", "Assignee", true),
                select("priority", "Priority", [
                  "Low",
                  "Normal",
                  "High",
                  "Urgent",
                ]),
                select("status", "Status", [
                  "To Do",
                  "In Progress",
                  "Blocked",
                  "Review",
                  "Done",
                ]),
                field("due", "Due date", false, "date"),
              ]
            : kind === "payment"
              ? [
                  field("invoice", "Invoice", true),
                  field("amount", "Amount", true, "number"),
                  field("paymentDate", "Payment date", true, "date"),
                  select("method", "Method", [
                    "Bank Transfer",
                    "UPI",
                    "Cash",
                    "Card",
                    "Cheque",
                    "Other",
                  ]),
                  field("reference", "Reference"),
                ]
              : kind === "approval"
                ? [
                    field("subject", "Approval subject", true),
                    field("client", "Client", true),
                    field("project", "Project"),
                    field("requestedFrom", "Requested from"),
                    field("description", "Description", true),
                    field("dueDate", "Due date", false, "date"),
                    select("status", "Status", [
                      "Draft",
                      "Requested",
                      "Approved",
                      "Rejected",
                      "Changes Requested",
                      "Cancelled",
                    ]),
                  ]
                : kind === "document"
                  ? [
                      select("type", "Document type", [
                        "Quotation",
                        "Invoice",
                        "Bill",
                        "Receipt",
                        "Credit Note",
                        "Delivery Note",
                        "Work Completion",
                        "Proposal",
                        "Contract",
                        "Approval Document",
                      ]),
                      field("number", "Document number", true),
                      field("client", "Client", true),
                      field("project", "Project"),
                      field("issueDate", "Issue date", true, "date"),
                      field("dueDate", "Due date", false, "date"),
                      field("amount", "Grand total", false, "number"),
                    ]
                  : [field("name", `${label} name`, true)];
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal domain-form"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          const name =
            form.name ||
            form.title ||
            form.subject ||
            form.number ||
            form.invoice;
          if (name || kind === "payment") onSave(kind, { ...form, name });
        }}
      >
        <div className="drawer-head">
          <div>
            <div className="eyebrow">Create record</div>
            <h2>New {label}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="form-grid">{fields}</div>
        <label>
          Notes
          <textarea
            value={form.notes || ""}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Add context"
            rows={3}
          />
        </label>
        <div className="modal-actions">
          <button
            type="button"
            className="button button-subtle"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="button button-primary">
            {kind === "document" ? "Save draft" : `Create ${label}`}
          </button>
        </div>
      </form>
    </div>
  );
}
function ClientQuickView({
  client,
  onClose,
  onToast,
  onNavigate,
}: {
  client: Client;
  onClose: () => void;
  onToast: (message: string) => void;
  onNavigate: (path: string) => void;
}) {
  const [tab, setTab] = useState("Overview"),
    [editingNotes, setEditingNotes] = useState(false),
    [notes, setNotes] = useState(""),
    [clientActivities, setClientActivities] = useState<ClientActivity[]>([]),
    [activitiesLoaded, setActivitiesLoaded] = useState(false),
    [clientRelated, setClientRelated] = useState<ClientRelatedRecord[]>([]),
    [relatedLoaded, setRelatedLoaded] = useState(false),
    initials = client.name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("");
  useEffect(() => {
    let active = true;
    setActivitiesLoaded(false);
    void fetch(`/api/clients/${client.id}/activities`, {
      credentials: "include",
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((body) => {
        if (active) setClientActivities(body.items || []);
      })
      .catch(() => {
        if (active) setClientActivities([]);
      })
      .finally(() => {
        if (active) setActivitiesLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [client.id]);
  useEffect(() => {
    let active = true;
    setRelatedLoaded(false);
    void fetch(`/api/clients/${client.id}/related`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((body) => { if (active) setClientRelated(body.items || []); })
      .catch(() => { if (active) setClientRelated([]); })
      .finally(() => { if (active) setRelatedLoaded(true); });
    return () => { active = false; };
  }, [client.id]);
  const relatedSummary = useMemo(() => {
    const closedStatuses = new Set(["COMPLETED", "APPROVED", "REJECTED", "CANCELLED"]);
    return {
      projects: clientRelated.filter((item) => item.type === "project").length,
      openItems: clientRelated.filter(
        (item) =>
          (item.type === "requirement" || item.type === "task") &&
          !closedStatuses.has(item.status),
      ).length,
      tasks: clientRelated.filter((item) => item.type === "task").length,
    };
  }, [clientRelated]);
  const website = client.website || "",
    websiteLabel = website.replace(/^https?:\/\//, "");
  const copyPhone = async () => {
    if (!client.phone) return;
    try {
      await navigator.clipboard.writeText(client.phone);
      onToast("Phone number copied");
    } catch {
      onToast(`Phone: ${client.phone}`);
    }
  };
  const go = (path: string) => {
    const destination = ["/projects", "/requirements", "/tasks"].includes(path)
      ? `${path}?client=${encodeURIComponent(client.name)}`
      : path;
    onClose();
    onNavigate(destination);
  };
  const relatedGroups = [
    { type: "project", label: "Projects", icon: BriefcaseBusiness, path: "/projects" },
    { type: "requirement", label: "Requirements", icon: ClipboardList, path: "/requirements" },
    { type: "task", label: "Tasks", icon: ListTodo, path: "/tasks" },
    { type: "meeting", label: "Meetings", icon: Video, path: "/meetings" },
    { type: "document", label: "Documents", icon: FileText, path: "/documents" },
    { type: "finance", label: "Finance", icon: Receipt, path: "/finance" },
  ] as const;
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="drawer client-quick-view"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="quick-view-head">
          <div>
            <span>Quick view</span>
            <div className="quick-client">
              <b>{initials}</b>
              <div>
                <h2>{client.name}</h2>
                <p>
                  {client.kind} <i>·</i>{" "}
                  <em className={tone(client.status)}>{client.status}</em>
                </p>
              </div>
            </div>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close quick view"
          >
            <X size={17} />
          </button>
        </header>
        <p className="quick-description">Client contact and connected work.</p>
        <div className="quick-contact">
          {client.email ? (
            <a href={`mailto:${client.email}`}>
              <Mail size={15} />
              {client.email}
            </a>
          ) : (
            <button disabled>
              <Mail size={15} />
              No email
            </button>
          )}
          {client.phone ? (
            <button onClick={copyPhone} title="Copy phone number">
              <Phone size={15} />
              {client.phone}
            </button>
          ) : (
            <button disabled>
              <Phone size={15} />
              No phone
            </button>
          )}
          {website ? (
            <a href={website} target="_blank" rel="noreferrer">
              <Globe2 size={15} />
              {websiteLabel}
            </a>
          ) : (
            <button disabled>
              <Globe2 size={15} />
              No website
            </button>
          )}
        </div>
        <nav className="quick-tabs">
          {["Overview", "Activity", "Related"].map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
          {tab === "Activity" && activitiesLoaded && clientActivities.length > 0 && (
            <span className="quick-activity-count">{clientActivities.length} recorded</span>
          )}
        </nav>
        {tab === "Overview" ? (
          <>
            <section className="quick-notice">
              <Link size={19} />
              <div>
                <strong>This client is connected to your workspace.</strong>
                <p>Use the cards below to open its related work.</p>
              </div>
            </section>
            <section className="quick-stats">
              <button onClick={() => go("/projects")}>
                <Folder size={19} />
                <strong>{relatedLoaded ? relatedSummary.projects : "—"}</strong>
                <span>Projects</span>
                <ChevronRight size={16} />
              </button>
              <button onClick={() => go("/requirements")}>
                <ClipboardList size={19} />
                <strong>{relatedLoaded ? relatedSummary.openItems : "—"}</strong>
                <span>Open items</span>
                <ChevronRight size={16} />
              </button>
              <button onClick={() => go("/tasks")}>
                <Activity size={19} />
                <strong>{relatedLoaded ? relatedSummary.tasks : "—"}</strong>
                <span>Total tasks</span>
                <ChevronRight size={16} />
              </button>
            </section>
            <section className="quick-details">
              <div>
                <Users size={18} />
                <p>
                  Account owner<strong>{client.owner}</strong>
                  <small>Workspace member</small>
                </p>
              </div>
              <div>
                <Clock size={18} />
                <p>
                  Client since
                  <strong>
                    {client.createdAt
                      ? new Date(client.createdAt).toLocaleDateString()
                      : "Not available"}
                  </strong>
                  <small>{client.lastActivity}</small>
                </p>
              </div>
            </section>
            <section className="quick-notes">
              <FileText size={18} />
              <div>
                <span>Notes</span>
                {editingNotes ? (
                  <textarea
                    aria-label="Client notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add notes about this client"
                  />
                ) : (
                  <p>{notes || "No notes have been added."}</p>
                )}
              </div>
              <button
                onClick={() => {
                  if (editingNotes) onToast("Notes saved for this session");
                  setEditingNotes(!editingNotes);
                }}
              >
                <Palette size={13} />
                {editingNotes ? "Save" : "Edit"}
              </button>
            </section>
          </>
        ) : tab === "Activity" ? (
          <section className="quick-activity" aria-live="polite">
            {!activitiesLoaded ? <div className="quick-activity-state">Loading activity…</div> : (
            <div className="quick-activity-list">
            {clientActivities.length
              ? clientActivities.map((activity) => (
                  <p className="quick-activity-item" key={activity.id}>
                    <strong>{activity.type}</strong> · {activity.description}
                    <br />
                    <small>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(activity.time))}</small>
                  </p>
                ))
              : `No activity for ${client.name} yet.`}
            </div>
            )}
          </section>
        ) : (
          <section className="quick-related" aria-live="polite">
            {!relatedLoaded ? <div className="quick-activity-state">Loading related records…</div> : clientRelated.length ? (
              relatedGroups.filter((group) => clientRelated.some((item) => item.type === group.type)).map((group) => {
                const Icon = group.icon, records = clientRelated.filter((item) => item.type === group.type);
                return <div className="quick-related-group" key={group.type}>
                  <div className="quick-related-group-head">
                    <span><Icon size={14} aria-hidden="true" />{group.label}</span><small>{records.length}</small><ChevronRight size={14} aria-hidden="true" />
                  </div>
                  {records.map((record) => <div className="quick-related-item" key={`${record.type}-${record.id}`}>
                    <span><strong>{record.title}</strong><small>{record.status.replaceAll("_", " ")}</small></span><ChevronRight size={13} aria-hidden="true" />
                  </div>)}
                </div>;
              })
            ) : <div className="quick-activity-state">No linked records for {client.name} yet.</div>}
          </section>
        )}
      </aside>
    </div>
  );
}
type ProjectDetail = {
  id: string; name: string; project_code: string | null; client_name: string; description: string | null;
  status: string; priority: string; start_date: string; target_end_date: string; owner: { name: string } | null;
  task_count: number; progress: number; task_stats: { total: number; completed: number; in_progress: number; overdue: number }; activity: { id: string; action: string; event: string | null; actor: string | null; created_at: string }[]; related: { id: string; type: string; title: string; status: string; updated_at: string }[];
};

type RequirementDetail = { id: string; requirement_code: string; title: string; status: string; client_name: string; project_name: string | null; created_at: string; updated_at: string };
function RequirementQuickView({ id, onClose, onUpdated }: { id: string; onClose: () => void; onUpdated: () => Promise<void> }) {
  const [requirement, setRequirement] = useState<RequirementDetail | null>(null), [error, setError] = useState(''), [tab, setTab] = useState<'Overview' | 'Activity' | 'Related'>('Overview'), [updating, setUpdating] = useState(false)
  const load = async () => { try { const response = await fetch(`/api/requirements/${id}`), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load requirement.'); setRequirement(body) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load requirement.') } }
  useEffect(() => { void load() }, [id])
  const complete = async () => { setUpdating(true); try { const response = await fetch(`/api/requirements/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'COMPLETED' }) }), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to complete requirement.'); await load(); await onUpdated() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to complete requirement.') } finally { setUpdating(false) } }
  const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="drawer project-quick-view" onMouseDown={event => event.stopPropagation()}><div className="drawer-head"><div><div className="eyebrow">Quick view</div><h2>{requirement?.title || 'Loading requirement…'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close requirement quick view"><X size={16}/></button></div>{error ? <p className="large-copy">{error}</p> : !requirement ? <p className="large-copy">Loading requirement details…</p> : <><nav className="quick-tabs project-quick-tabs">{(['Overview', 'Activity', 'Related'] as const).map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav>{tab === 'Overview' ? <><section className="quick-notice project-quick-notice"><ClipboardList size={17}/><div><strong>This requirement is connected to your workspace.</strong><p>Information is loaded from its persisted requirement record.</p></div></section><section className="project-info"><div className="project-info-head"><h3>Requirement Information</h3></div><dl><dt>Requirement</dt><dd>{requirement.title}</dd><dt>Reference</dt><dd>{requirement.requirement_code}</dd><dt>Client</dt><dd>{requirement.client_name}</dd><dt>Project</dt><dd>{requirement.project_name || 'No project'}</dd><dt>Status</dt><dd><Badge tone={tone(label(requirement.status))}>{label(requirement.status)}</Badge></dd><dt>Created</dt><dd>{new Date(requirement.created_at).toLocaleDateString()}</dd><dt>Last updated</dt><dd>{new Date(requirement.updated_at).toLocaleDateString()}</dd></dl></section>{requirement.status !== 'COMPLETED' && <button className="button button-primary" disabled={updating} onClick={() => void complete()}>{updating ? 'Updating…' : 'Mark complete'}</button>}</> : <section className="project-quick-empty"><Clock size={20}/><strong>No {tab.toLowerCase()} records yet</strong><p>{tab} will appear here as related work is recorded.</p></section>}</>}</aside></div>
}

function EditableQuickView({ kind, id, onClose, onUpdated }: { kind: 'requirement' | 'task'; id: string; onClose: () => void; onUpdated: () => Promise<void> }) {
  const [item, setItem] = useState<{ title: string; status: string; requirement_code?: string; client_name: string; project_name: string | null; due_at?: string | null; created_at: string; updated_at: string } | null>(null), [draft, setDraft] = useState({ title: '', status: '', dueDate: '' }), [editing, setEditing] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('')
  const load = async () => { try { const response = await fetch(`/api/${kind === 'requirement' ? 'requirements' : 'tasks'}/${id}`), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || `Unable to load ${kind}.`); setItem(body); setDraft({ title: body.title, status: body.status, dueDate: body.due_at ? new Date(body.due_at).toISOString().slice(0, 10) : '' }) } catch (cause) { setError(cause instanceof Error ? cause.message : `Unable to load ${kind}.`) } }
  useEffect(() => { void load() }, [id, kind])
  const save = async () => { if (draft.title.trim().length < 2) { setError(`${kind === 'task' ? 'Task' : 'Requirement'} title must contain at least 2 characters.`); return } setSaving(true); try { const payload = kind === 'task' ? { title: draft.title.trim(), status: draft.status, dueAt: draft.dueDate ? new Date(`${draft.dueDate}T00:00:00.000Z`).toISOString() : null } : { title: draft.title.trim(), status: draft.status }, response = await fetch(`/api/${kind === 'requirement' ? 'requirements' : 'tasks'}/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || `Unable to update ${kind}.`); setEditing(false); await load(); await onUpdated() } catch (cause) { setError(cause instanceof Error ? cause.message : `Unable to update ${kind}.`) } finally { setSaving(false) } }
  const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
  const statuses = kind === 'task' ? ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'] : ['REQUESTED', 'REVIEWING', 'IN_PROGRESS', 'APPROVED', 'COMPLETED', 'REJECTED']
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="drawer project-quick-view" onMouseDown={event => event.stopPropagation()}><div className="drawer-head"><div><div className="eyebrow">Quick view</div><h2>{item?.title || `Loading ${kind}…`}</h2></div><div className="quick-view-head-actions">{item && <button type="button" className="icon-button quick-edit-icon" title={editing ? 'Cancel editing' : `Edit ${kind}`} aria-label={editing ? 'Cancel editing' : `Edit ${kind}`} onClick={() => { setError(''); setEditing(value => !value) }}>{editing ? <X size={16}/> : <Pencil size={15}/>}</button>}<button className="icon-button" onClick={onClose} aria-label={`Close ${kind} quick view`}><X size={16}/></button></div></div>{error && <p className="large-copy">{error}</p>}{!item ? !error && <p className="large-copy">Loading {kind} details…</p> : <><nav className="quick-tabs project-quick-tabs"><button className="active">Overview</button></nav><section className="quick-notice project-quick-notice"><ClipboardList size={17}/><div><strong>This {kind} is connected to your workspace.</strong><p>Changes save directly to its persisted record.</p></div></section><section className="project-info"><div className="project-info-head"><h3>{kind === 'task' ? 'Task' : 'Requirement'} Information</h3></div>{editing ? <div className="quick-edit-form"><label>Title<input value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}/></label><label>Status<select value={draft.status} onChange={event => setDraft(current => ({ ...current, status: event.target.value }))}>{statuses.map(status => <option key={status} value={status}>{label(status)}</option>)}</select></label>{kind === 'task' && <label>Due date<input type="date" value={draft.dueDate} onChange={event => setDraft(current => ({ ...current, dueDate: event.target.value }))}/></label>}<button className="button button-primary" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save changes'}</button></div> : <dl><dt>{kind === 'task' ? 'Task' : 'Requirement'}</dt><dd>{item.title}</dd>{kind === 'requirement' && <><dt>Reference</dt><dd>{item.requirement_code}</dd></>}<dt>Client</dt><dd>{item.client_name}</dd><dt>Project</dt><dd>{item.project_name || 'No project'}</dd><dt>Status</dt><dd><Badge tone={tone(label(item.status))}>{label(item.status)}</Badge></dd>{kind === 'task' && <><dt>Due date</dt><dd>{item.due_at ? new Date(item.due_at).toLocaleDateString() : 'No due date'}</dd></>}<dt>Last updated</dt><dd>{new Date(item.updated_at).toLocaleDateString()}</dd></dl>}</section></>}</aside></div>
}

function ProjectQuickView({ id, onClose }: { id: string; onClose: () => void }) {
  const [project, setProject] = useState<ProjectDetail | null>(null), [error, setError] = useState(""), [tab, setTab] = useState<"Overview" | "Activity" | "Related">("Overview");
  useEffect(() => {
    let active = true;
    void fetch(`/api/projects/${id}`, { credentials: "include" })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "Unable to load project.");
        if (active) setProject(body);
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load project."); });
    return () => { active = false; };
  }, [id]);
  const formatDate = (value: string) => {
    const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  };
  const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
  const relatedGroups = [{ type: "requirement", label: "Requirements", icon: ClipboardList }, { type: "task", label: "Tasks", icon: ListTodo }, { type: "meeting", label: "Meetings", icon: Video }, { type: "document", label: "Documents", icon: FileText }, { type: "finance", label: "Finance", icon: Receipt }, { type: "approval", label: "Approvals", icon: ShieldCheck }] as const;
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="drawer project-quick-view" onMouseDown={event => event.stopPropagation()}>
    <div className="drawer-head"><div><div className="eyebrow">Quick view</div><h2>{project?.name || "Loading project…"}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close project quick view"><X size={16}/></button></div>
    {error ? <p className="large-copy">{error}</p> : !project ? <p className="large-copy">Loading project details…</p> : <>
      <nav className="quick-tabs project-quick-tabs">{(["Overview", "Activity", "Related"] as const).map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
      {tab === "Overview" ? <>
        <section className="quick-notice project-quick-notice"><Info size={17}/><div><strong>This project is connected to your workspace.</strong><p>Information is loaded from its persisted project record.</p></div></section>
        <section className="project-info"><div className="project-info-head"><h3>Project Information</h3></div><dl><dt>Name</dt><dd>{project.name}</dd><dt>Client</dt><dd>{project.client_name}</dd><dt>Project Code</dt><dd>{project.project_code || "—"}</dd><dt>Status</dt><dd><Badge tone={tone(project.status === "ACTIVE" ? "In Progress" : label(project.status))}>{label(project.status)}</Badge></dd><dt>Priority</dt><dd><span className="project-priority">⚑ {label(project.priority)}</span></dd><dt>Start Date</dt><dd>{formatDate(project.start_date)}</dd><dt>Due Date</dt><dd>{formatDate(project.target_end_date)}</dd><dt>Owner</dt><dd>{project.owner?.name || "Unassigned"}</dd><dt>Description</dt><dd>{project.description || "No description available."}</dd></dl></section>
        <section className="project-quick-progress"><h3>Progress</h3><div className="project-progress-line"><i style={{ width: `${project.progress}%` }}/><b>{project.progress}%</b></div><div className="project-progress-stats"><div><Circle size={12}/><strong>{project.task_stats.total}</strong><small>Total Tasks</small></div><div><Circle size={12}/><strong>{project.task_stats.completed}</strong><small>Completed</small></div><div><Circle size={12}/><strong>{project.task_stats.in_progress}</strong><small>In Progress</small></div><div><Circle size={12}/><strong>{project.task_stats.overdue}</strong><small>Overdue</small></div></div></section>
      </> : tab === "Activity" ? <section className="project-activity-timeline">{project.activity.length ? project.activity.map(item => <article key={item.id}><i/><div><strong>{item.actor} {item.action.toLowerCase()} this project</strong><time>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</time></div></article>) : <div className="quick-activity-state">No project activity yet.</div>}</section> : <section className="quick-related">{project.related.length ? relatedGroups.filter(group => project.related.some(record => record.type === group.type)).map(group => { const Icon = group.icon, records = project.related.filter(record => record.type === group.type); return <div className="quick-related-group" key={group.type}><div className="quick-related-group-head"><span><Icon size={14}/>{group.label}</span><small>{records.length}</small><ChevronRight size={14}/></div>{records.map(record => <div className="quick-related-item" key={`${record.type}-${record.id}`}><span><strong>{record.title}</strong><small>{record.status.replaceAll("_", " ")}</small></span><ChevronRight size={13}/></div>)}</div> }) : <div className="quick-activity-state">No related records yet.</div>}</section>}
    </>}
  </aside></div>;
}

function RecordDrawer({
  id,
  clients: clientRows = clients,
  projects: projectRows = projects,
  requirements: requirementRows = [],
  onRefreshRequirements = async () => {},
  tasks: taskRows = [],
  onRefreshTasks = async () => {},
  onClose,
  onToast,
  onNavigate,
}: any) {
  const client = clientRows.find((item: Client) => item.id === id);
  if (client)
    return (
      <ClientQuickView
        client={client}
        onClose={onClose}
        onToast={onToast}
        onNavigate={onNavigate}
      />
    );
  if (projectRows.some((item: Project) => item.id === id)) return <ProjectQuickView id={id} onClose={onClose} />;
  if (requirementRows.some((item: Requirement) => item.id === id)) return <EditableQuickView kind="requirement" id={id} onClose={onClose} onUpdated={onRefreshRequirements} />;
  if (taskRows.some((item: { id: string }) => item.id === id)) return <EditableQuickView kind="task" id={id} onClose={onClose} onUpdated={onRefreshTasks} />;
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <div className="eyebrow">Quick view</div>
            <h2>{id}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="drawer-tabs">
          <button className="active">Overview</button>
          <button onClick={() => onToast("Activity tab opened")}>
            Activity
          </button>
          <button onClick={() => onToast("Related records opened")}>
            Related
          </button>
        </div>
        <p className="large-copy">
          This mock record is connected to the workspace and can be updated from
          its contextual actions.
        </p>
        <button
          className="button button-primary"
          onClick={() => onToast(`${id} updated`)}
        >
          Mark complete
        </button>
      </aside>
    </div>
  );
}
function CommandPalette({ onClose, go }: { onClose: () => void; go: (path: string) => void }) {
  const [q, setQ] = useState(""),
    [remoteEntities, setRemoteEntities] = useState<{ id: string; label: string; type: string; path: string }[]>([]),
    [searching, setSearching] = useState(false),
    term = q.trim().toLowerCase(),
    navItems = [
      ["Go to Clients", "/clients"],
      ["Go to Projects", "/projects"],
      ["Go to Requirements", "/requirements"],
      ["Go to Tasks", "/tasks"],
      ["Go to Drive", "/drive"],
      ["Go to Meetings", "/meetings"],
      ["Go to Invoices", "/documents/invoices"],
      ["Go to Settings", "/settings/appearance"],
    ],
    navigation = navItems.filter(([label]) =>
      label.toLowerCase().includes(term),
    ),
    entities = remoteEntities,
    select = (path: string) => {
      go(path);
      onClose();
    };
  useEffect(() => {
    if (term.length < 2) {
      setRemoteEntities([]);
      setSearching(false);
      return;
    }
    let current = true,
      timer = window.setTimeout(() => {
        setSearching(true);
        void fetch(`/api/search?q=${encodeURIComponent(term)}`)
          .then((response) =>
            response.ok ? response.json() : Promise.reject(),
          )
          .then((body) => {
            if (current)
              setRemoteEntities(body.items || []);
          })
          .catch(() => {
            if (current) setRemoteEntities([]);
          })
          .finally(() => {
            if (current) setSearching(false);
          });
      }, 180);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [term]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="command-search">
          <Search size={16} />
          <input
            autoFocus
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search navigation and records"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="command-results">
          {navigation.length > 0 && (
            <>
              <h2>Navigation</h2>
              {navigation.map(([label, path]) => (
                <button key={path} onClick={() => select(path)}>
                  <span>{label}</span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </>
          )}
          {entities.length > 0 && (
            <>
              <h2>Records</h2>
              {entities.map((item) => (
                <button key={`${item.type}-${item.id}`} onClick={() => select(item.path)}>
                  <span><strong>{item.label}</strong><small>{item.type}</small></span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </>
          )}
          {searching && <p className="command-empty">Searching clients…</p>}
          {!searching && navigation.length + entities.length === 0 && (
            <p className="command-empty">
              No matching navigation items or records.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatExtra({ label, value, detail, icon: Icon, color }: any) {
  return (
    <div className="stat">
      <div className={`stat-icon ${color}`}>
        <Icon size={16} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        <div className="stat-detail">{detail}</div>
      </div>
    </div>
  );
}

type PersistedItem = { id: string; title?: string; name?: string; status?: string; client_name?: string; project_name?: string | null; document_type?: string; record_type?: string; starts_at?: string | null; created_at?: string; entity_type?: string; action?: string; label?: string; actor?: string; requested_by?: string; is_folder?: boolean; size_bytes?: number | null; updated_at?: string }
function usePersistedItems(endpoint: string) {
  const [items, setItems] = useState<PersistedItem[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const load = async () => { setLoading(true); try { const response = await fetch(endpoint), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load records.'); setItems(body.items || []); setError('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load records.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [endpoint])
  return { items, error, loading, load }
}
function PersistedDocuments({ sub }: { sub: string }) {
  const type = ({ quotations: 'QUOTATION', invoices: 'INVOICE', bills: 'BILL', proposals: 'PROPOSAL', contracts: 'CONTRACT' } as Record<string, string>)[sub] || '', { items, error, loading } = usePersistedItems(`/api/documents${type ? `?type=${type}` : ''}`)
  if (sub === 'quotations') return <QuotationWorkspace />
  if (sub === 'invoices') return <InvoiceWorkspace />
  if (loading) return <TableEmpty text="Loading documents…" />; if (error) return <TableEmpty text={error} />
  return <div className="document-main">{items.map(item => <div className="document-row" key={item.id}><div className="document-icon"><FileText size={15}/></div><div><strong>{item.title}</strong><span>{item.client_name}{item.project_name ? ` · ${item.project_name}` : ''}</span></div><strong>{item.document_type?.replaceAll('_',' ')}</strong><Badge tone={tone(item.status || '')}>{item.status}</Badge></div>)}{!items.length && <TableEmpty text="No documents in this view." />}</div>
}
type QuotationRow = PersistedItem & { client_id: string; reference_number?: string | null; total_amount?: number; currency?: string; expires_at?: string | null }
function QuotationWorkspace() {
  const [items, setItems] = useState<QuotationRow[]>([]), [clients, setClients] = useState<{ id: string; name: string }[]>([]), [search, setSearch] = useState(''), [status, setStatus] = useState(''), [clientId, setClientId] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState(''), [open, setOpen] = useState(false), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [form, setForm] = useState({ title: '', clientId: '', referenceNumber: `QNL-${new Date().getFullYear()}-001`, expiresAt: '' });
  const load = useCallback(async () => { setLoading(true); try { const response = await fetch('/api/documents?type=QUOTATION'), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load quotations.'); setItems(body.items || []); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load quotations.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); void fetch('/api/clients?limit=100').then(response => response.json()).then(body => setClients(body.items || [])).catch(() => undefined); }, [load]);
  useEffect(() => { const openForm = () => setOpen(true); window.addEventListener('qnl:quotation-create', openForm); return () => window.removeEventListener('qnl:quotation-create', openForm); }, []);
  const create = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); try { const expiresAt = form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null, response = await fetch('/api/documents', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: form.title, clientId: form.clientId, documentType: 'QUOTATION', referenceNumber: form.referenceNumber, issueAt: new Date().toISOString() }) }), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to create quotation.'); if (expiresAt) { const update = await fetch(`/api/documents/${body.item.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expiresAt }) }); if (!update.ok) throw new Error('Quotation created but its validity date could not be saved.'); } setOpen(false); setForm(current => ({ ...current, title: '', clientId: '', expiresAt: '' })); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create quotation.'); } finally { setSaving(false); } };
  const filtered = items.filter(item => { const haystack = [item.title, item.client_name, item.reference_number].join(' ').toLowerCase(), stamp = new Date(item.created_at || '').getTime(); return (!search || haystack.includes(search.toLowerCase())) && (!status || item.status === status) && (!clientId || item.client_id === clientId) && (!from || stamp >= new Date(`${from}T00:00:00`).getTime()) && (!to || stamp <= new Date(`${to}T23:59:59`).getTime()); });
  const stats = { total: items.length, sent: items.filter(item => item.status === 'SENT').length, accepted: items.filter(item => item.status === 'APPROVED').length, rejected: items.filter(item => item.status === 'REJECTED').length };
  const label = (value?: string) => value === 'APPROVED' ? 'Accepted' : (value || 'Draft').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
  const money = (item: QuotationRow) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: item.currency || 'INR', maximumFractionDigits: 0 }).format(Number(item.total_amount || 0));
  return <div className="quotation-workspace"><header className="quotation-head"><div><span className="quotation-head-icon"><FileText size={19}/></span><div><h1>Quotations</h1><p>Create, manage and track all your quotations.</p></div></div><button className="button button-primary" onClick={() => setOpen(value => !value)}><Plus size={15}/>{open ? 'Close form' : 'New quotation'}</button></header><div className="quotation-stats">{[[FileText, 'Total quotations', stats.total, 'neutral'], [ArrowUpRight, 'Sent', stats.sent, 'blue'], [CheckCircle2, 'Accepted', stats.accepted, 'green'], [X, 'Rejected', stats.rejected, 'red']].map(([Icon, text, value, color]) => { const Glyph = Icon as typeof FileText; return <section key={text as string}><span className={color as string}><Glyph size={17}/></span><div><small>{text as string}</small><strong>{value as number}</strong></div></section>; })}</div>{open && <form className="quotation-create" onSubmit={create}><h2>Create quotation draft</h2><div className="form-grid"><label>Subject<input required value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="e.g. QNL Books implementation"/></label><label>Client<select required value={form.clientId} onChange={event => setForm(current => ({ ...current, clientId: event.target.value }))}><option value="">Choose a client</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label>Quotation number<input required value={form.referenceNumber} onChange={event => setForm(current => ({ ...current, referenceNumber: event.target.value }))}/></label><label>Valid till<input type="date" value={form.expiresAt} onChange={event => setForm(current => ({ ...current, expiresAt: event.target.value }))}/></label></div><div className="builder-actions"><button type="button" className="button button-subtle" onClick={() => setOpen(false)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Creating…' : 'Create draft'}</button></div></form>}<section className="quotation-register"><div className="quotation-filters"><SearchBox value={search} onChange={setSearch} placeholder="Search quotations (client, subject, number...)"/><select aria-label="Filter quotations by status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'VOID'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select><select aria-label="Filter quotations by client" value={clientId} onChange={event => setClientId(event.target.value)}><option value="">All clients</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select><input aria-label="Created from" type="date" value={from} onChange={event => setFrom(event.target.value)}/><input aria-label="Created to" type="date" value={to} onChange={event => setTo(event.target.value)}/></div>{error && <p className="form-error">{error}</p>}<div className="quotation-table-wrap"><table><thead><tr><th>#</th><th>Quotation no.</th><th>Client</th><th>Subject</th><th>Amount</th><th>Valid till</th><th>Status</th><th>Created</th></tr></thead><tbody>{loading ? <tr><td colSpan={8}><TableEmpty text="Loading quotations…"/></td></tr> : filtered.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td><strong>{item.reference_number || 'Not assigned'}</strong></td><td>{item.client_name}</td><td>{item.title}</td><td><strong>{money(item)}</strong></td><td>{item.expires_at ? new Date(item.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}</td><td><Badge tone={tone(label(item.status))}>{label(item.status)}</Badge></td><td>{item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td></tr>)}{!loading && !filtered.length && <tr><td colSpan={8}><TableEmpty text="No quotations match these filters."/></td></tr>}</tbody></table></div><footer>Showing {filtered.length} of {items.length} quotations</footer></section></div>
}
type InvoiceSheet = InvoiceDetail & { workspace_name?: string; legal_name?: string | null; business_email?: string | null; business_phone?: string | null; business_address?: string | null; business_city?: string | null; business_state?: string | null; website?: string | null; workspace_tax_id?: string | null; client_address_line1?: string | null; client_address_line2?: string | null; client_city?: string | null; client_state?: string | null; client_country?: string | null; client_tax_id?: string | null; notes?: string | null; terms?: string | null }
function InvoiceWorkspace() {
  const [items, setItems] = useState<PersistedItem[]>([]), [selected, setSelected] = useState<InvoiceSheet | null>(null), [lines, setLines] = useState<{ id: string; description: string; quantity: number; unit_price: number; line_total: number }[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); try { const response = await fetch('/api/documents?type=INVOICE'), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load invoices.'); setItems(body.items || []); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load invoices.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const show = async (id: string) => { try { const response = await fetch(`/api/documents/${id}`), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load invoice.'); setSelected(body.item); setLines(body.lineItems || []); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load invoice.'); } };
  const date = (value?: string | null) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Not set';
  const money = (value?: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: selected?.currency || 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
  const clientAddress = selected ? [selected.client_address_line1, selected.client_address_line2, [selected.client_city, selected.client_state, selected.client_country].filter(Boolean).join(', ')].filter(Boolean).join(', ') : '';
  return <div className="invoice-document-workspace"><header className="invoice-document-toolbar"><div><span>Documents / Invoices</span><h2>Invoice register</h2></div><p>Select an invoice to view its live document layout.</p></header>{error && <p className="form-error">{error}</p>}<div className="invoice-document-layout"><aside className="invoice-document-list"><strong>Invoices <small>{items.length}</small></strong>{loading ? <TableEmpty text="Loading invoices…"/> : items.map(item => <button type="button" key={item.id} className={item.id === selected?.id ? 'active' : ''} onClick={() => void show(item.id)}><FileText size={15}/><span><b>{item.title}</b><small>{item.client_name} · {item.status}</small></span></button>)}{!loading && !items.length && <TableEmpty text="Create an invoice to populate this register."/>}</aside><main className="invoice-sheet">{selected ? <><header className="invoice-sheet-head"><div className="invoice-brand"><div className="invoice-brand-mark">QNL</div><div><h1>{selected.legal_name || selected.workspace_name || 'Workspace'}</h1><span>BUILD · AUTOMATE · GROW</span><p>{[selected.business_phone, selected.business_email, selected.website].filter(Boolean).join('  |  ') || 'Company contact details not set'}</p></div></div><div className="invoice-title"><strong>INVOICE</strong><b>{selected.reference_number || selected.title}</b><span>Date: {date(selected.issue_at)}</span></div></header><div className="invoice-rule"/><section className="invoice-bill-grid"><div><span>BILL TO</span><h2>{selected.client_name}</h2><p>{clientAddress || 'Client address not set'}</p><p>GST: {selected.client_tax_id || 'Not applicable / not set'}</p></div><dl><dt>Invoice Date</dt><dd>{date(selected.issue_at)}</dd><dt>Currency</dt><dd>{selected.currency || 'INR'} (₹)</dd><dt>Place of Supply</dt><dd>{selected.client_state || selected.business_state || 'Not set'}</dd></dl></section><section className="invoice-table"><header><span>#</span><span>Particulars</span><span>Qty</span><span>Rate (₹)</span><span>Amount (₹)</span></header>{lines.length ? lines.map((line, index) => <div key={line.id}><span>{index + 1}</span><strong>{line.description}</strong><span>{line.quantity}</span><span>{money(line.unit_price)}</span><span>{money(line.line_total)}</span></div>) : <div className="invoice-no-lines">No line items have been added to this invoice.</div>}</section><section className="invoice-summary"><div className="invoice-note"><strong>{selected.notes ? 'Notes' : 'Payment note'}</strong><p>{selected.notes || `Payment is due by ${date(selected.due_at)}.`}</p></div><dl><dt>Subtotal</dt><dd>{money(selected.subtotal)}</dd><dt>Tax</dt><dd>{money(selected.tax_amount)}</dd><dt>Total Amount Due</dt><dd>{money(selected.total_amount)}</dd></dl></section><section className="invoice-words"><span>Amount in Words</span><strong>{money(selected.total_amount)} only</strong></section><div className="invoice-rule"/><footer className="invoice-terms"><div><h3>Terms & Conditions</h3><p>{selected.terms || 'No payment terms have been recorded for this invoice.'}</p></div><div><span>For {selected.legal_name || selected.workspace_name}</span><i>Authorized signatory</i><b>{selected.workspace_name || 'Workspace'}</b></div></footer></> : <div className="invoice-sheet-empty"><FileText size={36}/><h2>Invoice document preview</h2><p>Select an invoice from the register. The layout will populate only with its persisted workspace, client, and line-item data.</p></div>}</main></div></div>
}
type InvoiceDetail = { id: string; title: string; status: string; reference_number?: string | null; issue_at?: string | null; due_at?: string | null; currency?: string; subtotal?: number; tax_amount?: number; total_amount?: number; client_name: string; project_name?: string | null }
function InvoiceWorkspaceLegacy() {
  const [items, setItems] = useState<PersistedItem[]>([]), [clients, setClients] = useState<{ id: string; name: string }[]>([]), [selected, setSelected] = useState<InvoiceDetail | null>(null), [lines, setLines] = useState<{ description: string; quantity: number; unit_price: number; line_total: number }[]>([]), [open, setOpen] = useState(false), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [form, setForm] = useState({ title: '', clientId: '', dueAt: '', reference: `INV-${new Date().getFullYear()}-001`, description: '', quantity: '1', unitPrice: '0', taxRate: '0' });
  const load = useCallback(async () => { setLoading(true); try { const response = await fetch('/api/documents?type=INVOICE'), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load invoices.'); setItems(body.items || []); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load invoices.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); void fetch('/api/clients?limit=100').then(response => response.json()).then(body => setClients(body.items || [])).catch(() => undefined); }, [load]);
  const show = async (id: string) => { try { const response = await fetch(`/api/documents/${id}`), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load invoice.'); setSelected(body.item); setLines(body.lineItems || []); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load invoice.'); } };
  const create = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); try { const dueAt = form.dueAt ? new Date(`${form.dueAt}T00:00:00`).toISOString() : null, response = await fetch('/api/documents', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: form.title, clientId: form.clientId, documentType: 'INVOICE', referenceNumber: form.reference, issueAt: new Date().toISOString(), dueAt }) }), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to create invoice.'); if (form.description.trim()) { const lineResponse = await fetch(`/api/documents/${body.item.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lineItems: [{ description: form.description, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice), taxRate: Number(form.taxRate), discountAmount: 0 }] }) }), lineBody = await lineResponse.json(); if (!lineResponse.ok) throw new Error(lineBody.error?.message || 'Invoice was created but its line item could not be saved.'); } setOpen(false); setForm(current => ({ ...current, title: '', clientId: '', dueAt: '', description: '', quantity: '1', unitPrice: '0', taxRate: '0' })); await load(); await show(body.item.id); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create invoice.'); } finally { setSaving(false); } };
  const money = (value: number | undefined) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: selected?.currency || 'INR' }).format(Number(value || 0));
  return <div className="invoice-workspace"><ModuleToolbar><div className="module-toolbar toolbar"><div className="search-box"><Search size={14}/><span>Persisted client invoices and calculated totals.</span></div><button className="button button-primary" onClick={() => setOpen(value => !value)}><Plus size={15}/>{open ? 'Close form' : 'New invoice'}</button></div></ModuleToolbar>{open && <form className="invoice-create-card" onSubmit={create}><h2>Create draft invoice</h2><div className="form-grid"><label>Invoice title<input required value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))}/></label><label>Client<select required value={form.clientId} onChange={event => setForm(current => ({ ...current, clientId: event.target.value }))}><option value="">Choose a client</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label>Invoice number<input required value={form.reference} onChange={event => setForm(current => ({ ...current, reference: event.target.value }))}/></label><label>Due date<input type="date" value={form.dueAt} onChange={event => setForm(current => ({ ...current, dueAt: event.target.value }))}/></label><label>Item / service<input value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))}/></label><label>Quantity<input min="0.001" step="0.001" type="number" value={form.quantity} onChange={event => setForm(current => ({ ...current, quantity: event.target.value }))}/></label><label>Unit price<input min="0" step="0.01" type="number" value={form.unitPrice} onChange={event => setForm(current => ({ ...current, unitPrice: event.target.value }))}/></label><label>Tax %<input min="0" max="100" step="0.01" type="number" value={form.taxRate} onChange={event => setForm(current => ({ ...current, taxRate: event.target.value }))}/></label></div><div className="builder-actions"><button type="button" className="button button-subtle" onClick={() => setOpen(false)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Creating…' : 'Create invoice'}</button></div></form>}{error && <p className="form-error">{error}</p>}<div className="invoice-layout"><section className="invoice-list"><header><h2>Invoices</h2><span>{items.length}</span></header>{loading ? <TableEmpty text="Loading invoices…"/> : items.map(item => <button key={item.id} className={selected?.id === item.id ? 'active' : ''} onClick={() => void show(item.id)}><FileText size={16}/><span><strong>{item.title}</strong><small>{item.client_name} · {item.status}</small></span><ChevronRight size={15}/></button>)}{!loading && !items.length && <TableEmpty text="No invoices yet."/>}</section><section className="invoice-preview">{selected ? <><header><div><span>Invoice</span><h1>{selected.reference_number || 'Draft invoice'}</h1></div><Badge tone={tone(selected.status)}>{selected.status}</Badge></header><div className="invoice-parties"><div><small>Bill to</small><strong>{selected.client_name}</strong><span>{selected.project_name || 'Client account'}</span></div><div><small>Issue date</small><strong>{selected.issue_at ? new Date(selected.issue_at).toLocaleDateString() : '—'}</strong><small>Due {selected.due_at ? new Date(selected.due_at).toLocaleDateString() : 'on receipt'}</small></div></div><div className="invoice-lines"><div><span>Description</span><span>Qty</span><span>Rate</span><span>Amount</span></div>{lines.map((line, index) => <div key={index}><strong>{line.description}</strong><span>{line.quantity}</span><span>{money(line.unit_price)}</span><span>{money(line.line_total)}</span></div>)}</div><dl><dt>Subtotal</dt><dd>{money(selected.subtotal)}</dd><dt>Tax</dt><dd>{money(selected.tax_amount)}</dd><dt>Total</dt><dd>{money(selected.total_amount)}</dd></dl><footer>Thank you for your business.</footer></> : <div className="invoice-placeholder"><Receipt size={28}/><strong>Select an invoice</strong><p>Persisted line items and calculated totals will appear here.</p></div>}</section></div></div>
}
type FinanceItem = { id: string; title: string; record_type: 'RECEIVABLE' | 'PAYMENT' | 'EXPENSE'; status: 'DRAFT' | 'PENDING' | 'SENT' | 'PAID' | 'OVERDUE' | 'VOID'; amount: number; currency: string; due_at: string | null; paid_at: string | null; client_id: string; client_name: string; project_id: string | null; project_name: string | null }
function PersistedFinance({ sub }: { sub: string }) {
  const recordType = sub === 'payments' ? 'PAYMENT' : sub === 'expenses' ? 'EXPENSE' : 'RECEIVABLE', title = recordType === 'PAYMENT' ? 'Payments' : recordType === 'EXPENSE' ? 'Expenses' : 'Receivables'
  const [items, setItems] = useState<FinanceItem[]>([]), [clients, setClients] = useState<{ id: string; name: string }[]>([]), [projects, setProjects] = useState<{ id: string; name: string; client_id: string }[]>([]), [search, setSearch] = useState(''), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [formOpen, setFormOpen] = useState(false), [editing, setEditing] = useState<FinanceItem | null>(null), [form, setForm] = useState({ title: '', clientId: '', projectId: '', amount: '', currency: 'INR', status: 'DRAFT', dueAt: '', paidAt: '' })
  const load = useCallback(async () => { setLoading(true); try { const response = await fetch(`/api/finance?type=${recordType}`), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load finance records.'); setItems(body.items || []); setError('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load finance records.') } finally { setLoading(false) } }, [recordType])
  useEffect(() => { void load() }, [load])
  useEffect(() => { void Promise.all([fetch('/api/clients?limit=100'), fetch('/api/projects')]).then(async ([clientResponse, projectResponse]) => { const [clientBody, projectBody] = await Promise.all([clientResponse.json(), projectResponse.json()]); if (clientResponse.ok) setClients(clientBody.items || []); if (projectResponse.ok) setProjects(projectBody.items || []) }).catch(() => undefined) }, [])
  const reset = () => setForm({ title: '', clientId: '', projectId: '', amount: '', currency: 'INR', status: 'DRAFT', dueAt: '', paidAt: '' })
  const begin = (item?: FinanceItem) => { setError(''); setEditing(item || null); if (item) setForm({ title: item.title, clientId: item.client_id, projectId: item.project_id || '', amount: String(item.amount || 0), currency: item.currency || 'INR', status: item.status, dueAt: item.due_at?.slice(0, 10) || '', paidAt: item.paid_at?.slice(0, 10) || '' }); else reset(); setFormOpen(true) }
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const amount = Number(form.amount); if (!Number.isFinite(amount) || amount < 0) { setError('Enter a valid non-negative amount.'); return } setSaving(true); try { const payload = { title: form.title.trim(), ...(editing ? {} : { clientId: form.clientId, recordType }), projectId: form.projectId || null, amount, currency: form.currency, status: form.status, dueAt: form.dueAt ? new Date(`${form.dueAt}T00:00:00.000Z`).toISOString() : null, paidAt: form.paidAt ? new Date(`${form.paidAt}T00:00:00.000Z`).toISOString() : null }, response = await fetch(editing ? `/api/finance/${editing.id}` : '/api/finance', { method: editing ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to save finance record.'); setFormOpen(false); setEditing(null); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save finance record.') } finally { setSaving(false) } }
  const archive = async (item: FinanceItem) => { if (!window.confirm(`Archive ${item.title}?`)) return; try { const response = await fetch(`/api/finance/${item.id}`, { method: 'DELETE' }), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to archive finance record.'); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to archive finance record.') } }
  const visible = items.filter(item => [item.title, item.client_name, item.project_name || ''].join(' ').toLowerCase().includes(search.toLowerCase())), total = visible.reduce((sum, item) => sum + Number(item.amount || 0), 0), paid = visible.filter(item => item.status === 'PAID').reduce((sum, item) => sum + Number(item.amount || 0), 0), money = (value: number, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value), compatibleProjects = projects.filter(project => project.client_id === form.clientId)
  return <div className="finance-workspace"><ModuleToolbar><div className="module-toolbar toolbar"><SearchBox value={search} onChange={setSearch} placeholder={`Search ${title.toLowerCase()}...`} /><button type="button" className="button button-primary" onClick={() => begin()}><Plus size={15} />New record</button></div></ModuleToolbar><header className="persisted-view-head"><div><h2>{title}</h2><p>Persisted workspace records with amounts, dates, and payment state.</p></div><div><strong>{money(total)}</strong><small>{money(paid)} paid</small></div></header>{error && <ErrorState detail={error} onRetry={() => void load()} />}{formOpen && <Modal title={editing ? 'Edit finance record' : `New ${title.slice(0, -1).toLowerCase()}`} onClose={() => !saving && setFormOpen(false)}><form onSubmit={submit}><FormField label="Title"><input autoFocus required minLength={2} maxLength={240} value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} /></FormField>{!editing && <FormField label="Client"><select required value={form.clientId} onChange={event => setForm(current => ({ ...current, clientId: event.target.value, projectId: '' }))}><option value="">Choose client</option>{clients.map(client => <option value={client.id} key={client.id}>{client.name}</option>)}</select></FormField>}<FormField label="Project"><select value={form.projectId} disabled={!form.clientId} onChange={event => setForm(current => ({ ...current, projectId: event.target.value }))}><option value="">No project</option>{compatibleProjects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}</select></FormField><FormField label="Amount"><input required min="0" step="0.01" type="number" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} /></FormField><FormField label="Currency"><input required minLength={3} maxLength={3} value={form.currency} onChange={event => setForm(current => ({ ...current, currency: event.target.value.toUpperCase() }))} /></FormField><FormField label="Status"><select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}>{['DRAFT', 'PENDING', 'SENT', 'PAID', 'OVERDUE', 'VOID'].map(value => <option key={value}>{value}</option>)}</select></FormField><FormField label="Due date"><input type="date" value={form.dueAt} onChange={event => setForm(current => ({ ...current, dueAt: event.target.value }))} /></FormField><FormField label="Paid date"><input type="date" value={form.paidAt} onChange={event => setForm(current => ({ ...current, paidAt: event.target.value }))} /></FormField><div className="modal-actions"><button type="button" className="button button-subtle" disabled={saving} onClick={() => setFormOpen(false)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save record'}</button></div></form></Modal>}{loading ? <LoadingSkeleton label={`Loading ${title.toLowerCase()}`} /> : <div className="table-panel"><table><thead><tr><th>Record</th><th>Client</th><th>Project</th><th>Amount</th><th>Due / paid</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map(item => <tr key={item.id}><td><strong>{item.title}</strong></td><td>{item.client_name}</td><td>{item.project_name || '—'}</td><td>{money(Number(item.amount || 0), item.currency || 'INR')}</td><td>{item.paid_at ? `Paid ${new Date(item.paid_at).toLocaleDateString()}` : item.due_at ? `Due ${new Date(item.due_at).toLocaleDateString()}` : '—'}</td><td><Badge tone={tone(item.status)}>{item.status}</Badge></td><td><button type="button" className="button button-subtle" onClick={() => begin(item)}>Edit</button><button type="button" className="button button-subtle" onClick={() => void archive(item)}>Archive</button></td></tr>)}</tbody></table>{!visible.length && <EmptyState title={`No ${title.toLowerCase()} found`} detail={search ? 'Clear the search or use a different term.' : 'Create a record to begin tracking it.'} action={search ? undefined : { label: 'New record', onClick: () => begin() }} />}</div>}</div>
}
type MeetingItem = { id: string; title: string; status: string; starts_at: string | null; duration_minutes: number | null; provider: string; meeting_url: string | null; client_id: string; client_name: string; project_id: string | null; project_name: string | null; agenda: string | null; sync_state: string }
function MeetingsManager() {
  const [items, setItems] = useState<MeetingItem[]>([]), [clients, setClients] = useState<{ id: string; name: string }[]>([]), [projects, setProjects] = useState<{ id: string; name: string; client_id: string }[]>([]), [search, setSearch] = useState(''), [status, setStatus] = useState(''), [provider, setProvider] = useState(''), [formOpen, setFormOpen] = useState(false), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [busy, setBusy] = useState(''), [error, setError] = useState(''), [form, setForm] = useState({ title: '', clientId: '', projectId: '', startsAt: '', durationMinutes: '30', provider: 'MANUAL', meetingUrl: '', agenda: '' })
  const load = useCallback(async () => { setLoading(true); try { const query = new URLSearchParams(); if (search) query.set('search', search); if (status) query.set('status', status); if (provider) query.set('provider', provider); const response = await fetch(`/api/meetings?${query}`), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load meetings.'); setItems(body.items || []); setError('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load meetings.') } finally { setLoading(false) } }, [provider, search, status])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer) }, [load])
  useEffect(() => { void Promise.all([fetch('/api/clients?limit=100'), fetch('/api/projects')]).then(async ([clientResponse, projectResponse]) => { const [clientBody, projectBody] = await Promise.all([clientResponse.json(), projectResponse.json()]); if (clientResponse.ok) setClients((clientBody.items || []).map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }))); if (projectResponse.ok) setProjects(projectBody.items || []) }).catch(() => undefined) }, [])
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); try { const response = await fetch('/api/meetings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: form.title, clientId: form.clientId, projectId: form.projectId || null, startsAt: new Date(form.startsAt).toISOString(), durationMinutes: Number(form.durationMinutes), provider: form.provider, meetingUrl: form.meetingUrl || null, agenda: form.agenda || null }) }), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to schedule meeting.'); setForm({ title: '', clientId: '', projectId: '', startsAt: '', durationMinutes: '30', provider: 'MANUAL', meetingUrl: '', agenda: '' }); setFormOpen(false); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to schedule meeting.') } finally { setSaving(false) } }
  const transition = async (id: string, nextStatus: 'COMPLETED' | 'CANCELED' | 'NO_SHOW') => { setBusy(id); try { const response = await fetch(`/api/meetings/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) }), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to update meeting.'); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update meeting.') } finally { setBusy('') } }
  const compatibleProjects = projects.filter(project => project.client_id === form.clientId)
  return <div className="meetings-workspace persisted-meetings"><ModuleToolbar><div className="module-toolbar toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search meetings or clients..." /><select aria-label="Filter meetings by status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{['SCHEDULED', 'COMPLETED', 'CANCELED', 'NO_SHOW'].map(value => <option value={value} key={value}>{value.replaceAll('_', ' ')}</option>)}</select><select aria-label="Filter meetings by provider" value={provider} onChange={event => setProvider(event.target.value)}><option value="">All providers</option>{['MANUAL', 'GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS', 'EXTERNAL'].map(value => <option value={value} key={value}>{value.replaceAll('_', ' ')}</option>)}</select><button className="button button-primary" onClick={() => setFormOpen(value => !value)}><Plus size={15} />Schedule meeting</button></div></ModuleToolbar>{formOpen && <form className="settings-form" onSubmit={submit}><h2>Schedule meeting</h2><label>Title<input required value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} /></label><label>Client<select required value={form.clientId} onChange={event => setForm(current => ({ ...current, clientId: event.target.value, projectId: '' }))}><option value="">Choose client</option>{clients.map(client => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label><label>Project<select value={form.projectId} onChange={event => setForm(current => ({ ...current, projectId: event.target.value }))}><option value="">No project</option>{compatibleProjects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label><label>Start<input required type="datetime-local" value={form.startsAt} onChange={event => setForm(current => ({ ...current, startsAt: event.target.value }))} /></label><label>Duration (minutes)<input required min="1" max="1440" type="number" value={form.durationMinutes} onChange={event => setForm(current => ({ ...current, durationMinutes: event.target.value }))} /></label><label>Provider<select value={form.provider} onChange={event => setForm(current => ({ ...current, provider: event.target.value }))}>{['MANUAL', 'GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS', 'EXTERNAL'].map(value => <option value={value} key={value}>{value.replaceAll('_', ' ')}</option>)}</select></label><label>Meeting URL<input type="url" value={form.meetingUrl} onChange={event => setForm(current => ({ ...current, meetingUrl: event.target.value }))} /></label><label>Agenda<textarea value={form.agenda} onChange={event => setForm(current => ({ ...current, agenda: event.target.value }))} /></label><div className="settings-actions"><button type="button" className="button button-subtle" onClick={() => setFormOpen(false)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Scheduling...' : 'Schedule meeting'}</button></div></form>}<header className="persisted-view-head"><div><h2>Meetings</h2><p>Scheduled meetings and their recorded outcomes.</p></div></header>{loading ? <TableEmpty text="Loading meetings..." /> : error ? <TableEmpty text={error} /> : <div className="meeting-list">{items.map(item => <div className="meeting-row" key={item.id}><span className="meeting-icon"><Video size={17} /></span><div><strong>{item.title}</strong><span>{item.client_name}{item.project_name ? ` / ${item.project_name}` : ''} / {item.provider.replaceAll('_', ' ')}</span><small>{item.starts_at ? new Date(item.starts_at).toLocaleString() : 'No start time'}{item.duration_minutes ? ` / ${item.duration_minutes} min` : ''}</small>{item.meeting_url && <a href={item.meeting_url} target="_blank" rel="noreferrer">Open meeting</a>}</div><Badge tone={tone(item.status)}>{item.status.replaceAll('_', ' ')}</Badge>{item.status === 'SCHEDULED' && <div className="settings-actions"><button className="button button-primary" disabled={busy === item.id} onClick={() => void transition(item.id, 'COMPLETED')}>Complete</button><button className="button button-subtle" disabled={busy === item.id} onClick={() => void transition(item.id, 'NO_SHOW')}>No-show</button><button className="button button-subtle" disabled={busy === item.id} onClick={() => void transition(item.id, 'CANCELED')}>Cancel</button></div>}</div>)}{!items.length && <TableEmpty text="No meetings match these filters." />}</div>}</div>
}
function PersistedMeetings() {
  const { items, error, loading } = usePersistedItems('/api/meetings')
  if (loading) return <TableEmpty text="Loading meetings…" />; if (error) return <TableEmpty text={error} />
  return <div className="meetings-workspace persisted-meetings"><header className="persisted-view-head"><div><h2>Scheduled meetings</h2><p>Meetings linked to clients and projects in this workspace.</p></div></header><div className="meeting-list">{items.map(item => <div className="meeting-row" key={item.id}><span className="meeting-icon"><Video size={17}/></span><div><strong>{item.title}</strong><span>{item.client_name}{item.project_name ? ` · ${item.project_name}` : ''}</span><small>{item.starts_at ? new Date(item.starts_at).toLocaleString() : 'No start time set'}</small></div><Badge tone={tone(item.status || '')}>{item.status}</Badge></div>)}{!items.length && <div className="persisted-empty"><Video size={22}/><strong>No meetings scheduled</strong><p>Meetings will appear here once they are created for a client or project.</p></div>}</div></div>
}
type DriveItem = { id: string; name: string; is_folder: boolean; parent_file_id: string | null; media_type: string | null; size_bytes: number | null; external_url: string | null; updated_at: string }
function DriveManager() {
  const [items, setItems] = useState<DriveItem[]>([]), [parent, setParent] = useState<string | null>(null), [crumbs, setCrumbs] = useState<{ id: string; name: string }[]>([]), [search, setSearch] = useState(''), [archived, setArchived] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(''), [error, setError] = useState(''), [dialog, setDialog] = useState<{ mode: 'create' | 'rename' | 'archive'; item?: DriveItem } | null>(null), [name, setName] = useState('')
  const load = useCallback(async () => { setLoading(true); try { const query = new URLSearchParams(); if (parent && !archived) query.set('parent', parent); if (search) query.set('search', search); if (archived) query.set('archived', 'true'); const response = await fetch(`/api/drive?${query}`), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load Drive.'); setItems(body.items || []); setError('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load Drive.') } finally { setLoading(false) } }, [archived, parent, search])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer) }, [load])
  const createFolder = async () => { if (!name.trim()) return; setBusy('create'); try { const response = await fetch('/api/drive', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: name.trim(), isFolder: true, parentFileId: parent }) }), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to create folder.'); setDialog(null); setName(''); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create folder.') } finally { setBusy('') } }
  const update = async (item: DriveItem, payload: Record<string, unknown>) => { setBusy(item.id); try { const response = await fetch(`/api/drive/${item.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to update Drive record.'); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update Drive record.') } finally { setBusy('') } }
  const archive = async (item: DriveItem) => { setBusy(item.id); try { const response = await fetch(`/api/drive/${item.id}`, { method: 'DELETE' }); if (!response.ok) { const body = await response.json(); throw new Error(body.error?.message || 'Unable to archive Drive record.') } setDialog(null); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to archive Drive record.') } finally { setBusy('') } }
  const openFolder = (item: DriveItem) => { setParent(item.id); setCrumbs(current => [...current, { id: item.id, name: item.name }]); setSearch('') }
  const openCrumb = (index: number) => { const next = crumbs.slice(0, index + 1); setCrumbs(next); setParent(next.at(-1)?.id || null); setSearch('') }
  return <div className="drive-page"><ModuleToolbar><div className="module-toolbar toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search files and folders..." /><button className="button button-subtle" onClick={() => { setArchived(value => !value); setParent(null); setCrumbs([]) }}>{archived ? 'Active files' : 'Archived files'}</button><button className="button button-primary" disabled={busy === 'create' || archived} onClick={() => { setName(''); setDialog({ mode: 'create' }) }}><Plus size={15} />New folder</button></div></ModuleToolbar><header className="drive-page-head"><div className="drive-breadcrumb"><button onClick={() => { setParent(null); setCrumbs([]) }}>Drive</button>{!archived && crumbs.map((crumb, index) => <React.Fragment key={crumb.id}><span>/</span><button onClick={() => openCrumb(index)}>{crumb.name}</button></React.Fragment>)}</div><p>{archived ? 'Archived records can be restored.' : 'Folders and files in this workspace.'}</p></header>{loading ? <LoadingSkeleton label="Loading Drive" /> : error ? <ErrorState detail={error} onRetry={() => void load()} /> : <section className="file-area">{items.map(item => <div className="file-row" key={item.id}><button className="file-name" onClick={() => item.is_folder ? openFolder(item) : item.external_url && window.open(item.external_url, '_blank', 'noopener,noreferrer')}><span className="file-icon">{item.is_folder ? 'DIR' : 'FILE'}</span><div><strong>{item.name}</strong><small>{item.is_folder ? 'Folder' : item.media_type || 'File'}{item.size_bytes ? ` / ${item.size_bytes.toLocaleString()} bytes` : ''}</small></div></button><span>{new Date(item.updated_at).toLocaleString()}</span><div className="settings-actions">{archived ? <button className="button button-subtle" disabled={busy === item.id} onClick={() => void update(item, { restore: true })}>Restore</button> : <><button className="button button-subtle" disabled={busy === item.id} onClick={() => { setName(item.name); setDialog({ mode: 'rename', item }) }}>Rename</button>{parent && <button className="button button-subtle" disabled={busy === item.id} onClick={() => void update(item, { parentFileId: null })}>Move to root</button>}<button className="button button-subtle" disabled={busy === item.id} onClick={() => setDialog({ mode: 'archive', item })}>Archive</button></>}</div></div>)}{!items.length && <EmptyState title={archived ? 'No archived Drive records' : 'No files or folders here yet'} detail={archived ? 'Archived records will appear here.' : 'Create a folder to start organising workspace files.'} action={archived ? undefined : { label: 'New folder', onClick: () => { setName(''); setDialog({ mode: 'create' }) } }} />}</section>}{dialog && <Modal title={dialog.mode === 'create' ? 'Create folder' : dialog.mode === 'rename' ? 'Rename item' : 'Archive item'} onClose={() => setDialog(null)}>{dialog.mode === 'archive' ? <><p>Archive “{dialog.item?.name}”? You can restore it later from Archived files.</p><div className="modal-actions"><button type="button" className="button button-subtle" onClick={() => setDialog(null)}>Cancel</button><button type="button" className="button button-primary" disabled={busy === dialog.item?.id} onClick={() => dialog.item && void archive(dialog.item)}>Archive</button></div></> : <form onSubmit={event => { event.preventDefault(); if (dialog.mode === 'create') void createFolder(); else if (dialog.item && name.trim() && name.trim() !== dialog.item.name) void update(dialog.item, { name: name.trim() }).then(() => setDialog(null)) }}><FormField label={dialog.mode === 'create' ? 'Folder name' : 'New name'}><input autoFocus required maxLength={255} value={name} onChange={event => setName(event.target.value)} /></FormField><div className="modal-actions"><button type="button" className="button button-subtle" onClick={() => setDialog(null)}>Cancel</button><button className="button button-primary" disabled={!name.trim() || busy === 'create' || busy === dialog.item?.id}>{dialog.mode === 'create' ? 'Create folder' : 'Save name'}</button></div></form>}</Modal>}</div>
}
function PersistedDrive() {
  const { items, error, loading, load } = usePersistedItems('/api/drive'), [creating, setCreating] = useState(false), [name, setName] = useState('')
  const createFolder = async (event: React.FormEvent) => { event.preventDefault(); if (!name.trim()) return; setCreating(true); try { const response=await fetch('/api/drive',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:name.trim(),isFolder:true})}),body=await response.json();if(!response.ok)throw new Error(body.error?.message||'Unable to create folder.');setName('');await load() } finally { setCreating(false) } }
  if (loading) return <TableEmpty text="Loading Drive…" />; if (error) return <TableEmpty text={error} />
  return <div className="drive-page"><header className="drive-page-head"><form onSubmit={createFolder} className="settings-actions"><input value={name} onChange={event=>setName(event.target.value)} placeholder="New folder name" aria-label="New folder name"/><button className="button button-primary" disabled={creating}><Plus size={15}/>New folder</button></form></header><section className="file-area">{items.map(item=><div className="file-row" key={item.id}><span className="check-box"/><div className="file-name"><span className="file-icon">{item.is_folder ? 'DIR' : 'FILE'}</span><div><strong>{item.name}</strong><small>{item.is_folder ? 'Folder' : item.size_bytes ? `${item.size_bytes} bytes` : 'File'}</small></div></div><span>{item.updated_at ? new Date(item.updated_at).toLocaleString() : ''}</span></div>)}{!items.length&&<TableEmpty text="No files or folders yet."/>}</section></div>
}
type ActivityFeedItem = PersistedItem & { entity_id: string; title: string; actor_id: string | null; client_id: string | null; project_id: string | null }
function ActivityFeed() {
  const router = useRouter(), [items, setItems] = useState<ActivityFeedItem[]>([]), [loading, setLoading] = useState(true), [loadingMore, setLoadingMore] = useState(false), [error, setError] = useState(''), [nextCursor, setNextCursor] = useState<string | null>(null), [hasMore, setHasMore] = useState(false), [entityType, setEntityType] = useState(''), [action, setAction] = useState(''), [actorId, setActorId] = useState(''), [clientId, setClientId] = useState(''), [projectId, setProjectId] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState(''), [actors, setActors] = useState<{ id: string; name: string }[]>([]), [clients, setClients] = useState<{ id: string; name: string }[]>([]), [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const load = useCallback(async (cursor?: string) => { const query = new URLSearchParams({ limit: '25' }); if (entityType) query.set('entityType', entityType); if (action) query.set('action', action); if (actorId) query.set('actorId', actorId); if (clientId) query.set('clientId', clientId); if (projectId) query.set('projectId', projectId); if (from) query.set('from', new Date(`${from}T00:00:00`).toISOString()); if (to) query.set('to', new Date(`${to}T23:59:59`).toISOString()); if (cursor) query.set('cursor', cursor); cursor ? setLoadingMore(true) : setLoading(true); try { const response = await fetch(`/api/activity?${query}`), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load activity.'); setItems(current => cursor ? [...current, ...body.items] : body.items); setHasMore(Boolean(body.page?.hasMore)); setNextCursor(body.page?.nextCursor || null); setError('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load activity.') } finally { setLoading(false); setLoadingMore(false) } }, [action, actorId, clientId, entityType, from, projectId, to])
  useEffect(() => { void load() }, [load])
  useEffect(() => { void Promise.all([fetch('/api/team'), fetch('/api/clients?limit=100'), fetch('/api/projects')]).then(async ([team, clientList, projectList]) => { const [teamBody, clientBody, projectBody] = await Promise.all([team.json(), clientList.json(), projectList.json()]); if (team.ok) setActors((teamBody.items || []).map((item: { user_id: string; display_name?: string | null; name: string }) => ({ id: item.user_id, name: item.display_name || item.name }))); if (clientList.ok) setClients((clientBody.items || []).map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }))); if (projectList.ok) setProjects((projectBody.items || []).map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }))) }).catch(() => undefined) }, [])
  const destinations: Record<string, string> = { client: '/clients', project: '/projects', requirement: '/requirements', task: '/tasks', meeting: '/meetings', document: '/documents', finance: '/finance', approval: '/approvals', file: '/drive' }
  return <div className="activity-workspace"><ModuleToolbar><div className="module-toolbar toolbar"><select aria-label="Filter activity by record type" value={entityType} onChange={event => setEntityType(event.target.value)}><option value="">All record types</option>{['client','project','requirement','task','meeting','document','finance','approval','file'].map(value => <option value={value} key={value}>{value[0].toUpperCase() + value.slice(1)}s</option>)}</select><select aria-label="Filter activity by action" value={action} onChange={event => setAction(event.target.value)}><option value="">All actions</option>{['CREATED','UPDATED','STATUS_CHANGED','ARCHIVED'].map(value => <option value={value} key={value}>{value.replaceAll('_',' ')}</option>)}</select><input aria-label="Activity start date" type="date" value={from} onChange={event => setFrom(event.target.value)} /><input aria-label="Activity end date" type="date" value={to} onChange={event => setTo(event.target.value)} /></div></ModuleToolbar><header className="activity-page-head"><span><Activity size={20}/></span><div><h1>Workspace activity</h1><p>{items.length} recorded {items.length === 1 ? 'event' : 'events'} in this view.</p></div></header>{loading ? <TableEmpty text="Loading activity…" /> : error ? <TableEmpty text={error} /> : <div className="activity-timeline">{items.map(item => <button type="button" className="activity-timeline-item" key={item.id} onClick={() => router.push(destinations[item.entity_type || ''] || '/activity')}><i/><div className="activity-card"><div className="activity-date"><strong>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</strong><span>{item.entity_type}</span></div><div className="activity-card-body"><div className="activity-avatar">{item.actor?.[0] || 'S'}</div><div><strong>{item.actor}</strong><p>{item.action?.toLowerCase().replaceAll('_',' ')} {item.title}</p><small>{[item.client_name, item.project_name].filter(Boolean).join(' · ') || 'Workspace record'}</small></div></div></div></button>)}{!items.length && <TableEmpty text="No recorded activity matches these filters." />}{hasMore && <button className="button button-subtle" disabled={loadingMore} onClick={() => nextCursor && void load(nextCursor)}>{loadingMore ? 'Loading…' : 'Load more activity'}</button>}</div>}</div>
}
function ActivityFeedFilters() {
  const router = useRouter(), [items, setItems] = useState<ActivityFeedItem[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [nextCursor, setNextCursor] = useState<string | null>(null), [hasMore, setHasMore] = useState(false), [busy, setBusy] = useState(false), [entityType, setEntityType] = useState(''), [action, setAction] = useState(''), [actorId, setActorId] = useState(''), [clientId, setClientId] = useState(''), [projectId, setProjectId] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState(''), [actors, setActors] = useState<{ id: string; name: string }[]>([]), [clients, setClients] = useState<{ id: string; name: string }[]>([]), [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const load = useCallback(async (cursor?: string) => { const query = new URLSearchParams({ limit: '25' }); for (const [key, value] of Object.entries({ entityType, action, actorId, clientId, projectId })) if (value) query.set(key, value); if (from) query.set('from', new Date(`${from}T00:00:00`).toISOString()); if (to) query.set('to', new Date(`${to}T23:59:59`).toISOString()); if (cursor) query.set('cursor', cursor); cursor ? setBusy(true) : setLoading(true); try { const response = await fetch(`/api/activity?${query}`), body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load activity.'); setItems(current => cursor ? [...current, ...body.items] : body.items); setHasMore(Boolean(body.page?.hasMore)); setNextCursor(body.page?.nextCursor || null); setError('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load activity.') } finally { setLoading(false); setBusy(false) } }, [action, actorId, clientId, entityType, from, projectId, to])
  useEffect(() => { void load() }, [load])
  useEffect(() => { void Promise.all([fetch('/api/team'), fetch('/api/clients?limit=100'), fetch('/api/projects')]).then(async ([team, clientList, projectList]) => { const [teamBody, clientBody, projectBody] = await Promise.all([team.json(), clientList.json(), projectList.json()]); if (team.ok) setActors((teamBody.items || []).map((item: { user_id: string; display_name?: string | null; name: string }) => ({ id: item.user_id, name: item.display_name || item.name }))); if (clientList.ok) setClients((clientBody.items || []).map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }))); if (projectList.ok) setProjects((projectBody.items || []).map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }))) }).catch(() => undefined) }, [])
  const routes: Record<string, string> = { client: '/clients', project: '/projects', requirement: '/requirements', task: '/tasks', meeting: '/meetings', document: '/documents', finance: '/finance', approval: '/approvals', file: '/drive' }
  return <div className="activity-workspace"><ModuleToolbar><div className="module-toolbar toolbar"><select aria-label="Filter by record type" value={entityType} onChange={event => setEntityType(event.target.value)}><option value="">All types</option>{['client', 'project', 'requirement', 'task', 'meeting', 'document', 'finance', 'approval', 'file'].map(value => <option key={value} value={value}>{value}</option>)}</select><select aria-label="Filter by action" value={action} onChange={event => setAction(event.target.value)}><option value="">All actions</option>{['CREATED', 'UPDATED', 'STATUS_CHANGED', 'ARCHIVED'].map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select><select aria-label="Filter by actor" value={actorId} onChange={event => setActorId(event.target.value)}><option value="">All actors</option>{actors.map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select><select aria-label="Filter by client" value={clientId} onChange={event => setClientId(event.target.value)}><option value="">All clients</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select><select aria-label="Filter by project" value={projectId} onChange={event => setProjectId(event.target.value)}><option value="">All projects</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select><input aria-label="Start date" type="date" value={from} onChange={event => setFrom(event.target.value)} /><input aria-label="End date" type="date" value={to} onChange={event => setTo(event.target.value)} /></div></ModuleToolbar><header className="activity-page-head"><span><Activity size={20} /></span><div><h1>Workspace activity</h1><p>{items.length} recorded {items.length === 1 ? 'event' : 'events'} in this view.</p></div></header>{loading ? <TableEmpty text="Loading activity..." /> : error ? <TableEmpty text={error} /> : <div className="activity-timeline">{items.map(item => <button type="button" className="activity-timeline-item" key={item.id} onClick={() => router.push(routes[item.entity_type || ''] || '/activity')}><i /><div className="activity-card"><div className="activity-date"><strong>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</strong><span>{item.entity_type}</span></div><div className="activity-card-body"><div className="activity-avatar">{item.actor?.[0] || 'S'}</div><div><strong>{item.actor}</strong><p>{item.action?.toLowerCase().replaceAll('_', ' ')} {item.title}</p><small>{[item.client_name, item.project_name].filter(Boolean).join(' / ') || 'Workspace record'}</small></div></div></div></button>)}{!items.length && <TableEmpty text="No recorded activity matches these filters." />}{hasMore && <button className="button button-subtle" disabled={busy} onClick={() => nextCursor && void load(nextCursor)}>{busy ? 'Loading...' : 'Load more activity'}</button>}</div>}</div>
}
function PersistedActivity() {
  const { items, error, loading } = usePersistedItems('/api/activity')
  if (loading) return <TableEmpty text="Loading activity…" />; if (error) return <TableEmpty text={error} />
  return <div className="activity-workspace"><header className="activity-page-head"><span><Activity size={20}/></span><div><h1>Workspace activity</h1><p>Changes recorded across your workspace.</p></div></header><div className="activity-timeline">{items.map(item=><div className="activity-timeline-item" key={item.id}><i/><div className="activity-card"><div className="activity-date"><strong>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</strong><span>{item.entity_type}</span></div><div className="activity-card-body"><div className="activity-avatar">{item.actor?.[0] || 'S'}</div><div><strong>{item.actor}</strong><p>{item.action?.toLowerCase()} {item.label}</p></div></div></div></div>)}{!items.length&&<TableEmpty text="No recorded activity yet."/>}</div></div>
}
function PersistedApprovals() {
  const { items, error, loading, load } = usePersistedItems('/api/approvals'), [busy, setBusy] = useState('')
  const decide = async (id:string,status:'APPROVED'|'REJECTED') => { setBusy(id); try { const response=await fetch(`/api/approvals/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status})}),body=await response.json();if(!response.ok)throw new Error(body.error?.message||'Unable to update approval.');await load() } finally { setBusy('') } }
  if (loading) return <TableEmpty text="Loading approvals…" />; if (error) return <TableEmpty text={error} />
  return <div className="approval-list">{items.map(item=><div className="approval-row" key={item.id}><div className="approval-icon"><ShieldCheck size={16}/></div><div className="approval-copy"><strong>{item.title}</strong><span>{item.client_name}{item.project_name ? ` · ${item.project_name}` : ''} · Requested by {item.requested_by}</span></div><Badge tone={tone(item.status || '')}>{item.status?.replaceAll('_',' ')}</Badge>{item.status==='REQUESTED'&&<div className="settings-actions"><button className="button button-primary" disabled={busy===item.id} onClick={()=>void decide(item.id,'APPROVED')}>Approve</button><button className="button button-subtle" disabled={busy===item.id} onClick={()=>void decide(item.id,'REJECTED')}>Reject</button></div>}</div>)}{!items.length&&<TableEmpty text="No approvals are waiting for review."/>}</div>
}
