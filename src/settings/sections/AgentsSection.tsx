import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AGENT_ICONS } from "@/modules/ai/components/AgentSwitcher";
import {
  BUILTIN_AGENTS,
  type Agent,
  type AgentIconId,
} from "@/modules/ai/lib/agents";
import {
  isValidHandle,
  normalizeHandle,
  type Snippet,
} from "@/modules/ai/lib/snippets";
import { newAgentId, useAgentsStore } from "@/modules/ai/store/agentsStore";
import {
  newSnippetId,
  useSnippetsStore,
} from "@/modules/ai/store/snippetsStore";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  setAiAutoApproveKey,
  setCustomInstructions,
  type AiAutoApproveSettings,
} from "@/modules/settings/store";
import {
  Add01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  Edit02Icon,
  FolderAddIcon,
  FileEditIcon,
  FilePlusIcon,
  SparklesIcon,
  TerminalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "../components/SectionHeader";

const ICON_OPTIONS: AgentIconId[] = [
  "coder",
  "architect",
  "reviewer",
  "security",
  "designer",
  "spark",
];

type AutoApproveKey = keyof AiAutoApproveSettings;

type AutoApproveItem = {
  key: AutoApproveKey;
  title: string;
  description: string;
  warning: string;
  icon: typeof SparklesIcon;
};

const AUTO_APPROVE_ITEMS: AutoApproveItem[] = [
  {
    key: "writeFile",
    title: "Write files",
    description:
      "Allow the agent to create or fully overwrite files without a per-action approval.",
    warning:
      "The agent can create new files or replace entire file contents immediately. Secret path guards still apply, but incorrect model output can overwrite important project files.",
    icon: FilePlusIcon,
  },
  {
    key: "edit",
    title: "Edit files",
    description:
      "Allow exact-string edits and multi-edits without a per-action approval.",
    warning:
      "The agent can modify existing files immediately after reading them. Read-before-edit and path guards still apply, but you will not review each diff before it is written.",
    icon: FileEditIcon,
  },
  {
    key: "createDirectory",
    title: "Create directories",
    description:
      "Allow the agent to create folders and missing parent folders automatically.",
    warning:
      "The agent can create directory trees in writable project locations without stopping for confirmation.",
    icon: FolderAddIcon,
  },
  {
    key: "bashRun",
    title: "Run shell commands",
    description:
      "Allow short foreground commands such as tests, builds, and searches to run automatically.",
    warning:
      "The agent can run foreground shell commands without approval. The destructive-command guard still blocks obvious dangerous commands, but commands may change files, install packages, use network, or expose local data in output.",
    icon: TerminalIcon,
  },
  {
    key: "bashBackground",
    title: "Spawn background processes",
    description:
      "Allow long-running commands such as dev servers or watchers to start automatically.",
    warning:
      "The agent can start long-running background processes without approval. These processes may keep running, consume CPU or memory, bind local ports, and write logs until stopped.",
    icon: TerminalIcon,
  },
];

export function AgentsSection() {
  const customInstructions = usePreferencesStore((s) => s.customInstructions);
  const aiAutoApprove = usePreferencesStore((s) => s.aiAutoApprove);
  const customAgents = useAgentsStore((s) => s.customAgents);
  const activeAgentId = useAgentsStore((s) => s.activeId);
  const setActiveAgentId = useAgentsStore((s) => s.setActiveId);
  const upsertAgent = useAgentsStore((s) => s.upsert);
  const removeAgent = useAgentsStore((s) => s.remove);
  const hydrateAgents = useAgentsStore((s) => s.hydrate);

  const snippets = useSnippetsStore((s) => s.snippets);
  const upsertSnippet = useSnippetsStore((s) => s.upsert);
  const removeSnippet = useSnippetsStore((s) => s.remove);
  const hydrateSnippets = useSnippetsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateAgents();
    void hydrateSnippets();
  }, [hydrateAgents, hydrateSnippets]);

  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);

  return (
    <div className="flex flex-col gap-7">
      <SectionHeader
        title="Agents"
        description="Personas and snippets the AI uses. Switch agents from the input bar."
      />

      <CustomInstructionsBlock value={customInstructions} />

      <AutoApproveBlock value={aiAutoApprove} />

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Agents</Label>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 px-2 text-[11px]"
            onClick={() =>
              setEditingAgent({
                id: newAgentId(),
                name: "New agent",
                description: "",
                instructions: "",
                icon: "spark",
                builtIn: false,
              })
            }
          >
            <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
            New agent
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[...BUILTIN_AGENTS, ...customAgents].map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              active={a.id === activeAgentId}
              onActivate={() => setActiveAgentId(a.id)}
              onEdit={a.builtIn ? null : () => setEditingAgent(a)}
              onDelete={a.builtIn ? null : () => removeAgent(a.id)}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <Label>Snippets</Label>
            <span className="text-[10.5px] text-muted-foreground">
              Reusable instructions you can drop into any prompt with{" "}
              <code className="rounded bg-muted/50 px-1 font-mono">
                #handle
              </code>
              .
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 px-2 text-[11px]"
            onClick={() =>
              setEditingSnippet({
                id: newSnippetId(),
                handle: "",
                name: "",
                description: "",
                content: "",
              })
            }
          >
            <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
            New snippet
          </Button>
        </div>

        {snippets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-card/30 px-4 py-6 text-center text-[11px] text-muted-foreground">
            No snippets yet. Create one and insert it with{" "}
            <code className="font-mono">#handle</code> in the AI input.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {snippets.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2"
              >
                <code className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  #{s.handle}
                </code>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[12px] font-medium">
                    {s.name}
                  </span>
                  {s.description ? (
                    <span className="truncate text-[10.5px] text-muted-foreground">
                      {s.description}
                    </span>
                  ) : null}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => setEditingSnippet(s)}
                  title="Edit"
                >
                  <HugeiconsIcon
                    icon={Edit02Icon}
                    size={12}
                    strokeWidth={1.75}
                  />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeSnippet(s.id)}
                  title="Delete"
                >
                  <HugeiconsIcon
                    icon={Delete02Icon}
                    size={12}
                    strokeWidth={1.75}
                  />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AgentEditorDialog
        agent={editingAgent}
        existing={customAgents}
        onClose={() => setEditingAgent(null)}
        onSave={(a) => {
          upsertAgent(a);
          setEditingAgent(null);
        }}
      />
      <SnippetEditorDialog
        snippet={editingSnippet}
        existing={snippets}
        onClose={() => setEditingSnippet(null)}
        onSave={(s) => {
          upsertSnippet(s);
          setEditingSnippet(null);
        }}
      />
    </div>
  );
}

function AutoApproveBlock({ value }: { value: AiAutoApproveSettings }) {
  const [pending, setPending] = useState<AutoApproveItem | null>(null);

  const enabledCount = AUTO_APPROVE_ITEMS.filter(
    (item) => value[item.key],
  ).length;

  const onToggle = (item: AutoApproveItem, next: boolean) => {
    if (!next) {
      void setAiAutoApproveKey(item.key, false);
      return;
    }
    setPending(item);
  };

  const confirm = () => {
    if (!pending) return;
    void setAiAutoApproveKey(pending.key, true);
    setPending(null);
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <Label>Auto approve</Label>
          <span className="text-[10.5px] leading-relaxed text-muted-foreground">
            Dangerous agent actions stay manual by default. Enable only what you
            trust Terax to run without asking each time.
          </span>
        </div>
        <Badge
          variant={enabledCount > 0 ? "destructive" : "outline"}
          className="shrink-0 text-[10px]"
        >
          {enabledCount === 0 ? "Off" : `${enabledCount} enabled`}
        </Badge>
      </div>

      <div className="rounded-lg border border-border/60 bg-card/40 p-1.5">
        <div className="flex flex-col gap-1.5">
          {AUTO_APPROVE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="flex items-start justify-between gap-3 rounded-md px-2.5 py-2 hover:bg-muted/30"
              >
                <div className="flex min-w-0 gap-2.5">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
                    <HugeiconsIcon icon={Icon} size={13} strokeWidth={1.75} />
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[12.5px] font-medium">
                      {item.title}
                    </span>
                    <span className="text-[10.5px] leading-relaxed text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                </div>
                <Switch
                  checked={value[item.key]}
                  onCheckedChange={(next) => onToggle(item, next)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable auto approval?</AlertDialogTitle>
            <AlertDialogDescription className="flex flex-col gap-3 text-left">
              <span>
                You are about to enable auto approval for{" "}
                <strong className="font-medium text-foreground">
                  {pending?.title}
                </strong>
                .
              </span>
              <span>{pending?.warning}</span>
              <span>
                Approval prompts, AI diff review, and per-command confirmation
                will be skipped for this action type while it is enabled. You
                can turn it off here at any time.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Enable Auto Approval
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function AgentCard({
  agent,
  active,
  onActivate,
  onEdit,
  onDelete,
}: {
  agent: Agent;
  active: boolean;
  onActivate: () => void;
  onEdit: (() => void) | null;
  onDelete: (() => void) | null;
}) {
  const Icon = AGENT_ICONS[agent.icon] ?? SparklesIcon;
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-lg border bg-card/60 px-3 py-2.5 transition-colors",
        active
          ? "border-foreground/30 ring-1 ring-foreground/10"
          : "border-border/60 hover:border-border",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/40">
          <HugeiconsIcon icon={Icon} size={14} strokeWidth={1.5} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5 text-[12.5px] font-medium">
            {agent.name}
            {agent.builtIn ? (
              <span className="rounded bg-muted/50 px-1 py-0.5 text-[9px] tracking-wide text-muted-foreground uppercase">
                Built-in
              </span>
            ) : null}
          </span>
          <span className="line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground">
            {agent.description}
          </span>
        </div>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-1">
        <Button
          size="sm"
          variant={active ? "default" : "outline"}
          onClick={onActivate}
          className="h-6 gap-1 px-2 text-[10.5px]"
        >
          {active ? (
            <>
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={10}
                strokeWidth={2}
              />
              Active
            </>
          ) : (
            "Use agent"
          )}
        </Button>
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={onEdit}
              title="Edit"
            >
              <HugeiconsIcon icon={Edit02Icon} size={11} strokeWidth={1.75} />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-6 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              title="Delete"
            >
              <HugeiconsIcon icon={Delete02Icon} size={11} strokeWidth={1.75} />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AgentEditorDialog({
  agent,
  existing,
  onClose,
  onSave,
}: {
  agent: Agent | null;
  existing: Agent[];
  onClose: () => void;
  onSave: (a: Agent) => void;
}) {
  const [draft, setDraft] = useState<Agent | null>(agent);
  useEffect(() => setDraft(agent), [agent]);
  if (!draft) return null;

  const isNew = !existing.some((a) => a.id === draft.id);
  const canSave =
    draft.name.trim().length > 0 && draft.instructions.trim().length > 0;

  return (
    <Dialog open={!!agent} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[14px]">
            {isNew ? "New agent" : "Edit agent"}
          </DialogTitle>
        </DialogHeader>
        <div className="-mx-2 max-h-[calc(100vh-14rem)] overflow-y-auto px-2 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-1">
                {ICON_OPTIONS.map((id) => {
                  const Icon = AGENT_ICONS[id] ?? SparklesIcon;
                  const active = draft.icon === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDraft({ ...draft, icon: id })}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-md border transition-colors",
                        active
                          ? "border-foreground/40 bg-accent"
                          : "border-border/60 hover:bg-accent/40",
                      )}
                    >
                      <HugeiconsIcon icon={Icon} size={13} strokeWidth={1.75} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Label>Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="h-8 text-[12px]"
                placeholder="e.g. Test Engineer"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Description</Label>
            <Input
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              placeholder="One line - shown in the agent picker"
              className="h-8 text-[12px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Instructions</Label>
            <Textarea
              value={draft.instructions}
              onChange={(e) =>
                setDraft({ ...draft, instructions: e.target.value })
              }
              placeholder="Persona & rules. Appended to Terax's core system prompt."
              className="min-h-40 resize-y text-[12px] leading-relaxed"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canSave}
            onClick={() => onSave({ ...draft, builtIn: false })}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SnippetEditorDialog({
  snippet,
  existing,
  onClose,
  onSave,
}: {
  snippet: Snippet | null;
  existing: Snippet[];
  onClose: () => void;
  onSave: (s: Snippet) => void;
}) {
  const [draft, setDraft] = useState<Snippet | null>(snippet);
  useEffect(() => setDraft(snippet), [snippet]);
  if (!draft) return null;

  const handleErr = !draft.handle
    ? "Required."
    : !isValidHandle(draft.handle)
      ? "Lowercase letters, digits, and dashes only."
      : existing.some((s) => s.id !== draft.id && s.handle === draft.handle)
        ? "Already in use."
        : null;
  const canSave =
    !handleErr &&
    draft.name.trim().length > 0 &&
    draft.content.trim().length > 0;

  return (
    <Dialog open={!!snippet} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[14px]">
            {existing.some((s) => s.id === draft.id)
              ? "Edit snippet"
              : "New snippet"}
          </DialogTitle>
        </DialogHeader>
        <div className="-mx-2 max-h-[calc(100vh-14rem)] overflow-y-auto px-2 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex w-32 flex-col gap-1">
              <Label>Handle</Label>
              <div className="relative">
                <span className="absolute top-1/2 left-2 -translate-y-1/2 font-mono text-[11.5px] text-muted-foreground">
                  #
                </span>
                <Input
                  value={draft.handle}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      handle: normalizeHandle(e.target.value),
                    })
                  }
                  placeholder="review"
                  className="h-8 pl-5 font-mono text-[11.5px]"
                />
              </div>
              {handleErr ? (
                <span className="text-[10px] text-destructive">
                  {handleErr}
                </span>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Label>Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Pre-merge review checklist"
                className="h-8 text-[12px]"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Description</Label>
            <Input
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              placeholder="One line - shown in the # picker"
              className="h-8 text-[12px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Content</Label>
            <Textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder="Inserted into the prompt as a <snippet> block when you use #handle."
              className="min-h-40 resize-y font-mono text-[11.5px] leading-relaxed"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!canSave} onClick={() => onSave(draft)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomInstructionsBlock({ value }: { value: string }) {
  const [draft, setDraft] = useState(value);
  const hadFirstSync = useRef(false);

  useEffect(() => {
    if (!hadFirstSync.current) {
      hadFirstSync.current = true;
      setDraft(value);
    }
  }, [value]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>Custom instructions</Label>
        {/* {savedTick > 0 ? (
          <span className="text-[10px] text-muted-foreground">Saved</span>
        ) : null} */}
        {draft && (
          <Button size="xs" onClick={() => void setCustomInstructions(draft)}>
            Save
          </Button>
        )}
      </div>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="e.g. Always reply in concise bullet points. Prefer pnpm over npm. My machine is an M-series Mac."
        className="min-h-[100px] resize-y bg-card/60 font-sans text-[12px] leading-relaxed border border-border"
      />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
      {children}
    </span>
  );
}
