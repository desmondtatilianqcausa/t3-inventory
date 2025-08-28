"use client";

export interface TooltipEventItem {
  id: string;
  title: string;
  description?: string;
  startAt?: number;
  endAt?: number;
  color?: string;
}

export interface MapTooltipProps {
  markerTitle?: string;
  events: TooltipEventItem[];
  onSelectEvent?: (id: string) => void;
}

export const MapTooltip = ({
  markerTitle,
  events,
  onSelectEvent,
}: MapTooltipProps) => {
  return (
    <div className="min-w-[240px] max-w-[320px] text-foreground">
      {markerTitle ? (
        <div className="mb-2 text-sm font-semibold">{markerTitle}</div>
      ) : null}
      <div className="space-y-2">
        {events.map((e) => {
          const start = e.startAt ? new Date(e.startAt).toLocaleString() : "";
          const end = e.endAt ? new Date(e.endAt).toLocaleString() : "";
          const when = start && end ? `${start} – ${end}` : start || end || "";
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelectEvent?.(e.id)}
              className="class:hover:bg-accent/60 class:hover:text-accent-foreground w-full rounded-md px-2 py-2 text-left"
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: e.color ?? "#ef4444" }}
                />
                <span className="flex-1">
                  <div className="text-sm font-medium leading-tight">
                    {e.title}
                  </div>
                  {when ? (
                    <div className="text-xs text-muted-foreground">{when}</div>
                  ) : null}
                  {e.description ? (
                    <div className="line-clamp-3 text-xs text-muted-foreground">
                      {e.description}
                    </div>
                  ) : null}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
