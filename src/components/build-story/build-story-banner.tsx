import { useTranslate } from "@refinedev/core";
import { Bot, ChevronDown, Clock, Download, Layers, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// "Behind the build" — a pinned strip at the top of an app's home page that
// tells the visitor this portal was built entirely by AI coding agents, which
// models did which part, and how long it effectively took. The expandable view
// is a Gantt-style timeline: tracks that overlap in the same time band were
// built in parallel by concurrent agents, so the total wall-clock is far
// shorter than the sum of the parts. Times are estimates derived from the
// build's git commit bursts. Purely presentational: pass a per-app `story`.
// Display strings resolve through i18n; model names and numbers are literal.
// ---------------------------------------------------------------------------

export type BuildTrack = {
  /** i18n key for the track name. */
  labelKey: string;
  /** One or more model brand strings, e.g. "Opus 4.8". */
  models: string[];
  /** Start offset in minutes from t0 (tracks with the same span ran parallel). */
  start: number;
  /** Effective duration in minutes. */
  minutes: number;
};

export type BuildStory = {
  /** Distinct model brand strings, most-used first (for the summary badges). */
  models: string[];
  /** Headline module/page count for the summary. */
  moduleCount: number;
  /** i18n key for the module-count label, e.g. "9 modules" / "9 个模块". */
  moduleLabelKey: string;
  /** Timeline tracks; overlapping spans render as parallel lanes. */
  tracks: BuildTrack[];
};

// Model brand -> tone (pill). Unknown models fall back to neutral slate.
const MODEL_TONE: Record<string, string> = {
  "Opus 4.8":
    "bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:text-violet-300",
  "Sonnet 5": "bg-sky-500/12 text-sky-700 ring-sky-500/20 dark:text-sky-300",
  "GPT-5.6 sol":
    "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  "GPT-5.6 terra":
    "bg-teal-500/12 text-teal-700 ring-teal-500/20 dark:text-teal-300",
  Qwen: "bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:text-amber-300",
};

// Model brand -> gantt bar fill.
const MODEL_BAR: Record<string, string> = {
  "Opus 4.8": "bg-violet-500/85",
  "Sonnet 5": "bg-sky-500/85",
  "GPT-5.6 sol": "bg-emerald-500/85",
  "GPT-5.6 terra": "bg-teal-500/85",
  Qwen: "bg-amber-500/85",
};

function ModelPill({ model }: { model: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        MODEL_TONE[model] ??
          "bg-slate-500/12 text-slate-700 ring-slate-500/20 dark:text-slate-300"
      )}
    >
      {model}
    </span>
  );
}

// Localized duration: under an hour shows minutes, otherwise hours (one
// decimal only when needed). Unit words come from i18n so zh/en both read well.
function useFmtDuration() {
  const translate = useTranslate();
  return (minutes: number) => {
    if (minutes <= 0) return "";
    if (minutes < 60) {
      return `${Math.round(minutes)}${translate("buildStory.unit.min", " min")}`;
    }
    const h = minutes / 60;
    const hs = Number.isInteger(h) ? `${h}` : h.toFixed(1);
    return `${hs}${translate("buildStory.unit.hour", "h")}`;
  };
}

export function BuildStoryBanner({ story }: { story: BuildStory }) {
  const translate = useTranslate();
  const fmtDuration = useFmtDuration();
  const [open, setOpen] = useState(false);

  const total = Math.max(
    1,
    ...story.tracks.map((t) => t.start + t.minutes)
  );

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/25 p-5",
        "bg-gradient-to-br from-primary/[0.07] via-transparent to-primary/[0.04]"
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight">
                {translate("buildStory.title", "Built by AI agents")}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Bot className="size-3" />
                {translate("buildStory.badge", "100% agent-built")}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              {translate(
                "buildStory.description",
                "This portal was designed and coded end-to-end by AI agents — no hand-written boilerplate. It's an open demo: download it and keep customizing it with your own coding agent."
              )}
            </p>
          </div>
        </div>

        {/* summary chips */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip icon={<Clock className="size-3.5" />}>
            <span className="text-muted-foreground">
              {translate("buildStory.stat.time", "Build time")}
            </span>
            <span className="font-semibold tabular-nums">
              ≈ {fmtDuration(total)}
            </span>
          </Chip>
          <Chip icon={<Layers className="size-3.5" />}>
            <span className="font-semibold tabular-nums">
              {story.moduleCount}
            </span>
            <span className="text-muted-foreground">
              {translate(story.moduleLabelKey, "modules")}
            </span>
          </Chip>
          <div className="flex items-center gap-1.5">
            <Bot className="size-3.5 text-muted-foreground" />
            {story.models.map((m) => (
              <ModelPill key={m} model={m} />
            ))}
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            <Download className="size-3" />
            {translate("buildStory.downloadable", "Downloadable · agent-editable")}
          </span>
        </div>

        {/* expandable gantt timeline */}
        {story.tracks.length > 0 && (
          <div className="border-t border-border/60 pt-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  open && "rotate-180"
                )}
              />
              {open
                ? translate("buildStory.hideTimeline", "Hide build timeline")
                : translate("buildStory.showTimeline", "See how it was built")}
            </button>

            {open && (
              <GanttTimeline
                story={story}
                total={total}
                fmtDuration={fmtDuration}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function GanttTimeline({
  story,
  total,
  fmtDuration,
}: {
  story: BuildStory;
  total: number;
  fmtDuration: (m: number) => string;
}) {
  const translate = useTranslate();
  // Trigger the grow-in animation one frame after mount.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Any two tracks overlapping in time means concurrent agents ran.
  const hasParallel = story.tracks.some((a, i) =>
    story.tracks.some(
      (b, j) =>
        j !== i && a.start < b.start + b.minutes && b.start < a.start + a.minutes
    )
  );

  // Axis ticks every 30 min (at least start + end).
  const ticks: number[] = [];
  for (let t = 0; t <= total + 0.1; t += 30) ticks.push(t);
  if (ticks[ticks.length - 1] < total) ticks.push(total);

  return (
    <div className="mt-3">
      <div className="grid grid-cols-[9.5rem_1fr] gap-x-3">
        {/* axis header */}
        <div />
        <div className="relative mb-1 h-4">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2 text-[10px] tabular-nums text-muted-foreground"
              style={{ left: `${(t / total) * 100}%` }}
            >
              {t === 0 ? "0" : fmtDuration(t)}
            </span>
          ))}
        </div>

        {/* track rows */}
        {story.tracks.map((track, i) => {
          const leftPct = (track.start / total) * 100;
          const widthPct = (track.minutes / total) * 100;
          const bar = MODEL_BAR[track.models[0]] ?? "bg-slate-500/85";
          return (
            <div key={track.labelKey} className="contents">
              <div className="flex min-w-0 flex-col justify-center py-1">
                <span className="truncate text-xs font-medium text-foreground">
                  {translate(track.labelKey)}
                </span>
                <span className="mt-0.5 flex flex-wrap gap-1">
                  {track.models.map((m) => (
                    <ModelPill key={m} model={m} />
                  ))}
                </span>
              </div>
              <div className="relative flex items-center py-1">
                {/* faint gridlines */}
                {ticks.map((t) => (
                  <span
                    key={t}
                    aria-hidden="true"
                    className="absolute top-0 bottom-0 w-px bg-border/40"
                    style={{ left: `${(t / total) * 100}%` }}
                  />
                ))}
                <div
                  className="absolute flex h-6 items-center overflow-hidden rounded-md"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  <div
                    className={cn(
                      "h-full rounded-md shadow-sm transition-[width] duration-700 ease-out",
                      bar
                    )}
                    style={{
                      width: grown ? "100%" : "0%",
                      transitionDelay: `${i * 90}ms`,
                    }}
                  />
                  <span className="absolute right-1.5 text-[10px] font-medium tabular-nums text-white/95 drop-shadow-sm">
                    {fmtDuration(track.minutes)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasParallel && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="inline-block h-2 w-4 rounded-sm bg-primary/70" />
          {translate(
            "buildStory.parallelHint",
            "Bars sharing a time band ran in parallel — concurrent agents compress the wall-clock."
          )}
        </p>
      )}
    </div>
  );
}

function Chip({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background/60 px-2.5 py-1 text-xs">
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </span>
  );
}
