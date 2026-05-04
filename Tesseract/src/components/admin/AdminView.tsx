"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Calendar, Users, Wifi, Gauge, Plus, Trash2, Pencil, Gamepad2 } from "lucide-react";
import toast from "react-hot-toast";

import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Avatar } from "@/components/ui/Avatar";

import { useApi, useAsyncAction } from "@/hooks/useApi";
import { adminApi, eventsApi, gamesApi } from "@/lib/api/services";
import { formatDate, formatNumber, cn } from "@/lib/utils";
import type { Game, Role, TesseractEvent, User } from "@/lib/types";
import type { ApiError } from "@/lib/api/client";

type Tab = "overview" | "events" | "games" | "users";

export function AdminView() {
  const [tab, setTab] = useState<Tab>("overview");
  const analytics = useApi(() => adminApi.analytics(), []);
  const users = useApi(() => adminApi.users(), []);
  const events = useApi(() => eventsApi.list(), []);
  const games = useApi(() => gamesApi.list(), []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-neon-pink">
            / admin
          </p>
          <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">
            Control panel.
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Run events, manage people, watch the pulse.
          </p>
        </div>
        <Pill tone="red" pulse>Elevated access</Pill>
      </header>

      <Tabs
        value={tab}
        onChange={(id) => setTab(id as Tab)}
        items={[
          { id: "overview", label: "Overview", icon: <Gauge className="h-3.5 w-3.5" /> },
          { id: "events", label: "Events", icon: <Calendar className="h-3.5 w-3.5" />, count: events.data?.length },
          { id: "games", label: "Games", icon: <Gamepad2 className="h-3.5 w-3.5" />, count: games.data?.length },
          { id: "users", label: "Users", icon: <Users className="h-3.5 w-3.5" />, count: users.data?.length },
        ]}
      />

      {tab === "overview" && (
        <section className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {analytics.loading || !analytics.data ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))
            ) : (
              <>
                <StatCard label="DAU" value={analytics.data.dau} icon={<Activity className="h-5 w-5 text-neon-cyan" />} tone="cyan" delta={`WAU ${formatNumber(analytics.data.wau)}`} />
                <StatCard label="MAU" value={analytics.data.mau} icon={<Users className="h-5 w-5 text-neon-purple" />} tone="purple" delta="+8.4% MoM" />
                <StatCard label="Live now" value={analytics.data.liveNow} icon={<Wifi className="h-5 w-5 text-neon-green" />} tone="green" delta="realtime" />
                <StatCard label="Events" value={analytics.data.events} icon={<Calendar className="h-5 w-5 text-neon-yellow" />} tone="yellow" delta={`${analytics.data.games} games`} />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Engagement (7d)" subtitle="% of WAU with ≥1 action." />
              {analytics.data ? (
                <Bars data={analytics.data.engagement.map((e) => ({ label: e.label, value: e.value }))} />
              ) : (
                <Skeleton className="h-40" />
              )}
            </Card>
            <Card>
              <CardHeader title="Activation funnel" subtitle="From signup to WAU." />
              {analytics.data ? (
                <Funnel stages={analytics.data.funnel} />
              ) : (
                <Skeleton className="h-40" />
              )}
            </Card>
          </div>
        </section>
      )}

      {tab === "events" && <EventsAdmin events={events.data ?? []} loading={events.loading} refetch={events.refetch} />}

      {tab === "games" && <GamesAdmin games={games.data ?? []} loading={games.loading} refetch={games.refetch} />}

      {tab === "users" && <UsersAdmin users={users.data ?? []} loading={users.loading} refetch={users.refetch} setData={users.setData} />}
    </div>
  );
}

function Bars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="mt-2 flex h-40 items-end gap-4">
      {data.map((d, i) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <motion.div
            className="w-full rounded-t-lg bg-gradient-to-t from-neon-purple via-neon-cyan to-neon-green shadow-glow-sm"
            initial={{ height: 0 }}
            animate={{ height: `${(d.value / max) * 100}%` }}
            transition={{ delay: i * 0.06, duration: 0.6 }}
          />
          <span className="text-[10px] font-mono text-white/50">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function Funnel({ stages }: { stages: { stage: string; count: number }[] }) {
  const max = stages[0]?.count ?? 1;
  return (
    <ul className="mt-2 space-y-3">
      {stages.map((s, i) => {
        const pct = (s.count / max) * 100;
        return (
          <li key={s.stage}>
            <div className="flex justify-between text-xs text-white/60">
              <span>{s.stage}</span>
              <span className="tabular-nums">{formatNumber(s.count)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-green"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function EventsAdmin({
  events,
  loading,
  refetch,
}: {
  events: TesseractEvent[];
  loading: boolean;
  refetch: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TesseractEvent | null>(null);
  const create = useAsyncAction(eventsApi.create);
  const update = useAsyncAction(eventsApi.update);
  const remove = useAsyncAction(eventsApi.remove);

  const save = async (payload: Partial<TesseractEvent>) => {
    try {
      if (editing) {
        await update.run(editing.id, payload);
        toast.success("Event updated");
      } else {
        await create.run(payload);
        toast.success("Event created");
      }
      setOpen(false);
      setEditing(null);
      refetch();
    } catch (error) {
      toast.error((error as ApiError)?.message ?? "Save failed");
    }
  };

  const del = async (e: TesseractEvent) => {
    if (!confirm(`Delete "${e.title}"?`)) return;
    try {
      await remove.run(e.id);
      toast.success("Deleted");
      refetch();
    } catch (error) {
      toast.error((error as ApiError)?.message ?? "Delete failed");
    }
  };

  return (
    <Card>
      <CardHeader
        title="Events"
        subtitle="Create, update, and delete events."
        action={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            New event
          </Button>
        }
      />
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 font-display text-sm text-white/80">
                {e.title.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{e.title}</p>
                <p className="truncate text-xs text-white/50">
                  {formatDate(e.startsAt)} · {e.registered}/{e.capacity} · {e.category}
                </p>
              </div>
              <Pill tone={e.status === "live" ? "green" : e.status === "upcoming" ? "cyan" : "default"}>
                {e.status}
              </Pill>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditing(e);
                  setOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-neon-red hover:bg-neon-red/10"
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => del(e)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
      <EventForm
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        initial={editing}
        onSave={save}
        saving={create.loading || update.loading}
      />
    </Card>
  );
}

function EventForm({
  open,
  onClose,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  initial: TesseractEvent | null;
  onSave: (p: Partial<TesseractEvent>) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<TesseractEvent>>({});

  useEffect(() => {
    if (open) setForm(initial ? { ...initial } : {});
  }, [open, initial]);

  const update = (patch: Partial<TesseractEvent>) => setForm((f) => ({ ...f, ...patch }));

  const toLocalInput = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  };

  const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : "");

  const validate = () => {
    const requiredText: Array<keyof TesseractEvent> = ["title", "description", "location"];
    for (const key of requiredText) {
      const value = form[key];
      if (typeof value !== "string" || value.trim().length === 0) {
        return `Please complete ${key}.`;
      }
    }
    if (!form.startsAt || !form.endsAt) return "Start and end time are required.";
    if (new Date(form.startsAt).getTime() >= new Date(form.endsAt).getTime()) {
      return "End time must be after start time.";
    }
    if (!form.capacity || form.capacity < 1) return "Capacity must be at least 1.";
    if ((form.xpReward ?? 0) < 0) return "XP reward cannot be negative.";
    return null;
  };

  const onSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    await onSave(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={initial ? "Edit event" : "Create event"}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={onSubmit}>
            {initial ? "Save changes" : "Create event"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Title"
          value={form.title ?? ""}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Paradox 4.0 — Flagship Hackathon"
        />
        <Textarea
          label="Description"
          value={form.description ?? ""}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="What this event is, who it's for, and why they shouldn't miss it."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            value={form.category ?? "meetup"}
            onChange={(e) => update({ category: e.target.value as TesseractEvent["category"] })}
            options={[
              { value: "hackathon", label: "Hackathon" },
              { value: "quiz", label: "Quiz" },
              { value: "meetup", label: "Meetup" },
              { value: "workshop", label: "Workshop" },
              { value: "tournament", label: "Tournament" },
              { value: "social", label: "Social" },
            ]}
          />
          <Input
            label="Location"
            value={form.location ?? ""}
            onChange={(e) => update({ location: e.target.value })}
            placeholder="Zoom, Discord, Campus…"
          />
          <Input
            label="Starts at"
            type="datetime-local"
            value={toLocalInput(form.startsAt)}
            onChange={(e) => update({ startsAt: fromLocalInput(e.target.value) })}
          />
          <Input
            label="Ends at"
            type="datetime-local"
            value={toLocalInput(form.endsAt)}
            onChange={(e) => update({ endsAt: fromLocalInput(e.target.value) })}
          />
          <Input
            label="Capacity"
            type="number"
            value={form.capacity ?? 100}
            onChange={(e) => update({ capacity: Number(e.target.value) })}
          />
          <Input
            label="XP reward"
            type="number"
            value={form.xpReward ?? 100}
            onChange={(e) => update({ xpReward: Number(e.target.value) })}
          />
        </div>
      </div>
    </Modal>
  );
}

function GamesAdmin({
  games,
  loading,
  refetch,
}: {
  games: Game[];
  loading: boolean;
  refetch: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const create = useAsyncAction(gamesApi.create);
  const update = useAsyncAction(gamesApi.update);
  const remove = useAsyncAction(gamesApi.remove);

  const save = async (payload: Partial<Game>) => {
    try {
      if (editing) {
        await update.run(editing.id, payload);
        toast.success("Game updated");
      } else {
        await create.run(payload);
        toast.success("Game created");
      }
      setOpen(false);
      setEditing(null);
      refetch();
    } catch (error) {
      toast.error((error as ApiError)?.message ?? "Save failed");
    }
  };

  const del = async (game: Game) => {
    if (!confirm(`Delete "${game.name}"?`)) return;
    try {
      await remove.run(game.id);
      toast.success("Deleted");
      refetch();
    } catch (error) {
      toast.error((error as ApiError)?.message ?? "Delete failed");
    }
  };

  return (
    <Card>
      <CardHeader
        title="Games"
        subtitle="Create, update, and delete game catalog entries."
        action={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            New game
          </Button>
        }
      />
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {games.map((game) => (
            <li key={game.id} className="flex items-center gap-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lg">
                {game.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{game.name}</p>
                <p className="truncate text-xs text-white/50">
                  {game.category} · {game.difficulty} · +{game.xpReward} XP
                </p>
              </div>
              <Pill tone="default">{formatNumber(game.playersOnline)} online</Pill>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditing(game);
                  setOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-neon-red hover:bg-neon-red/10"
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => del(game)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
      <GameForm
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        initial={editing}
        onSave={save}
        saving={create.loading || update.loading}
      />
    </Card>
  );
}

function GameForm({
  open,
  onClose,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  initial: Game | null;
  onSave: (p: Partial<Game>) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<Game>>({});
  const [howToPlayText, setHowToPlayText] = useState("");
  const [rulesText, setRulesText] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({ ...initial });
      setHowToPlayText((initial.howToPlay ?? []).join("\n"));
      setRulesText((initial.rules ?? []).join("\n"));
    } else {
      setForm({
        emoji: "🎮",
        difficulty: "easy",
        playersOnline: 0,
        xpReward: 100,
      });
      setHowToPlayText("");
      setRulesText("");
    }
  }, [open, initial]);

  const update = (patch: Partial<Game>) => setForm((f) => ({ ...f, ...patch }));

  const normalizeLines = (text: string) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const handleSave = async () => {
    const payload: Partial<Game> = {
      ...form,
      howToPlay: normalizeLines(howToPlayText),
      rules: normalizeLines(rulesText),
    };
    const required: Array<keyof Game> = [
      "name",
      "tagline",
      "emoji",
      "category",
      "difficulty",
      "description",
    ];
    const missing = required.find((key) => {
      const value = payload[key];
      return typeof value !== "string" || value.trim().length === 0;
    });

    if (missing) {
      toast.error(`Please complete ${missing}.`);
      return;
    }

    await onSave(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={initial ? "Edit game" : "Create game"}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSave}>
            {initial ? "Save changes" : "Create game"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={form.name ?? ""}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Cipher Run"
          />
          <Input
            label="Emoji"
            value={form.emoji ?? "🎮"}
            onChange={(e) => update({ emoji: e.target.value })}
            placeholder="🎮"
          />
          <Input
            label="Tagline"
            value={form.tagline ?? ""}
            onChange={(e) => update({ tagline: e.target.value })}
            placeholder="Decode. Run. Don't think."
          />
          <Input
            label="Category"
            value={form.category ?? ""}
            onChange={(e) => update({ category: e.target.value })}
            placeholder="Puzzle"
          />
          <Select
            label="Difficulty"
            value={form.difficulty ?? "easy"}
            onChange={(e) => update({ difficulty: e.target.value as Game["difficulty"] })}
            options={[
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
              { value: "nightmare", label: "Nightmare" },
            ]}
          />
          <Input
            label="Players online"
            type="number"
            value={form.playersOnline ?? 0}
            onChange={(e) => update({ playersOnline: Number(e.target.value) })}
          />
          <Input
            label="XP reward"
            type="number"
            value={form.xpReward ?? 100}
            onChange={(e) => update({ xpReward: Number(e.target.value) })}
          />
          <Input
            label="Cover URL (optional)"
            value={form.cover ?? ""}
            onChange={(e) => update({ cover: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <Textarea
          label="Description"
          value={form.description ?? ""}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="What players do in this game and how scoring works."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Textarea
            label="How to play (one step per line)"
            value={howToPlayText}
            onChange={(e) => setHowToPlayText(e.target.value)}
            placeholder={"Start a run\nSolve quickly\nSubmit your score"}
          />
          <Textarea
            label="Rules (one rule per line)"
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            placeholder={"No external tools\nWeekly reset"}
          />
        </div>
      </div>
    </Modal>
  );
}

function UsersAdmin({
  users,
  loading,
  refetch,
  setData,
}: {
  users: User[];
  loading: boolean;
  refetch: () => Promise<void>;
  setData: (u: User[] | null) => void;
}) {
  const setRole = useAsyncAction(adminApi.setRole);
  const [query, setQuery] = useState("");

  const filtered = users.filter((u) =>
    [u.name, u.email].join(" ").toLowerCase().includes(query.toLowerCase()),
  );

  const change = async (u: User, role: Role) => {
    try {
      const updated = await setRole.run(u.id, role);
      setData(users.map((x) => (x.id === u.id ? updated : x)));
      toast.success(`${u.name} is now ${role}`);
    } catch (error) {
      toast.error((error as ApiError)?.message ?? "Failed");
      refetch();
    }
  };

  return (
    <Card>
      <CardHeader
        title="Users"
        subtitle="Assign roles, view signups, audit activity."
        action={
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        }
      />
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {filtered.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar name={u.name} src={u.avatar} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{u.name}</p>
                <p className="truncate text-xs text-white/50">{u.email}</p>
              </div>
              <Pill tone="default">{formatNumber(u.xp)} XP</Pill>
              <Select
                className={cn("min-w-[120px]", setRole.loading && "opacity-60")}
                value={u.role}
                onChange={(e) => change(u, e.target.value as Role)}
                options={[
                  { value: "guest", label: "Guest" },
                  { value: "member", label: "Member" },
                  { value: "core", label: "Core" },
                  { value: "admin", label: "Admin" },
                ]}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
