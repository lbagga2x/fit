import { Flame, Trophy, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getStreakMessage } from "@/lib/utils";

function StreakFlame({ streak }: { streak: number }) {
  if (streak === 0)
    return <Zap className="h-10 w-10 text-muted-foreground" />;
  if (streak >= 7)
    return <Trophy className="h-10 w-10 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]" />;
  return (
    <Flame
      className="h-10 w-10 text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.8)]"
      style={{ animation: streak > 0 ? "pulse-glow 2s ease-in-out infinite" : "none" }}
    />
  );
}

export function StreakCard({ streak }: { streak: number }) {
  const isOnFire = streak >= 3;
  const message = getStreakMessage(streak);

  return (
    <Card
      className={
        isOnFire
          ? "border-orange-500/50 bg-gradient-to-br from-orange-950/40 to-card"
          : streak > 0
          ? "border-primary/30 bg-gradient-to-br from-primary/10 to-card"
          : "border-border"
      }
    >
      <CardContent className="flex items-center gap-5 pt-5 pb-5">
        <div className="shrink-0">
          <StreakFlame streak={streak} />
        </div>

        <div className="min-w-0 flex-1">
          {streak === 0 ? (
            <>
              <p className="text-lg font-bold text-foreground">No streak yet</p>
              <p className="text-sm text-muted-foreground mt-0.5">{message}</p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tabular-nums text-foreground">
                  {streak}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {streak === 1 ? "day" : "days"} consistent
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {message}
              </p>
            </>
          )}
        </div>

        {streak >= 7 && (
          <div className="shrink-0 rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs font-bold text-yellow-400 border border-yellow-500/30">
            WEEK+
          </div>
        )}
      </CardContent>
    </Card>
  );
}
