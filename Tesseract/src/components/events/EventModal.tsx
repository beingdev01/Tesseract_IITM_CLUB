"use client";

import { CalendarDays, MapPin, Users, Tag, Zap, Share2 } from "lucide-react";
import toast from "react-hot-toast";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { useRole } from "@/hooks/useRole";
import type { TesseractEvent } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/utils";

export function EventModal({
  event,
  onClose,
  onJoin,
  joining,
}: {
  event: TesseractEvent | null;
  onClose: () => void;
  onJoin: (e: TesseractEvent) => void;
  joining: boolean;
}) {
  const { isMember } = useRole();
  const open = !!event;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={event?.title}
      subtitle={event ? `${formatDate(event.startsAt)} · ${formatTime(event.startsAt)} IST` : ""}
      footer={
        event && (
          <>
            <Button variant="ghost" size="sm" onClick={() => {
              navigator.clipboard?.writeText(`${event.title} — tesseract.iitm.app/events/${event.id}`);
              toast.success("Link copied");
            }} leftIcon={<Share2 className="h-4 w-4" />}>
              Share
            </Button>
            {event.status !== "completed" && (
              <Button
                onClick={() => isMember ? onJoin(event) : toast.error("Sign in to join")}
                loading={joining}
                disabled={event.registered >= event.capacity}
              >
                {event.registered >= event.capacity ? "Waitlist full" : "Join event"}
              </Button>
            )}
          </>
        )
      }
    >
      {event && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="purple">{event.category}</Pill>
            {event.status === "live" && <Pill tone="green" pulse>LIVE</Pill>}
            <Pill tone="yellow">+{event.xpReward} XP</Pill>
            {event.tags.map((t) => (
              <Pill key={t} tone="default" icon={<Tag className="h-3 w-3" />}>
                {t}
              </Pill>
            ))}
          </div>

          <p className="text-sm leading-relaxed text-white/75">
            {event.description}
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Info icon={<CalendarDays className="h-4 w-4" />} label="When" value={`${formatDate(event.startsAt)} · ${formatTime(event.startsAt)} — ${formatTime(event.endsAt)}`} />
            <Info icon={<MapPin className="h-4 w-4" />} label="Where" value={event.location} />
            <Info icon={<Users className="h-4 w-4" />} label="Organizers" value={event.organizers.join(" · ")} />
            <Info icon={<Zap className="h-4 w-4" />} label="Reward" value={`${event.xpReward} XP · Badge on completion`} />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-white/60">
              <span>Registrations</span>
              <span className="tabular-nums">
                {event.registered} / {event.capacity}
              </span>
            </div>
            <Progress value={event.registered} max={event.capacity} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl glass p-3">
      <div className="flex items-center gap-1.5 text-xs text-white/50">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}
