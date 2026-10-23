import { Button } from "@/components/ui/button"
import { CalendarCheck, Clock, Video } from "lucide-react"

// Build the next N business days starting from tomorrow (skips today, Saturdays & Sundays).
function buildUpcomingDays(count = 4) {
  const days: { day: string; date: string; slots: string }[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  // Start from tomorrow — today is skipped.
  cursor.setDate(cursor.getDate() + 1)

  while (days.length < count) {
    const weekday = cursor.getDay() // 0 = Sunday, 6 = Saturday
    if (weekday !== 0 && weekday !== 6) {
      const dayLabel = cursor.toLocaleDateString("en-US", { weekday: "short" })
      const dateLabel = cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      // Deterministic-ish random slot count between 3 and 8.
      const slots = `${3 + Math.floor(Math.random() * 6)} slots`
      days.push({ day: dayLabel, date: dateLabel, slots })
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function Hero({ onBook }: { onBook: () => void }) {
  const upcomingDays = buildUpcomingDays(4)

  return (
    <section className="relative overflow-hidden border-b border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Now hiring VP & Director-level marketing leaders
          </span>
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
            Explore senior social media & marketing roles at Meta.
          </h1>
          <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
            Skip the cold application. Book a private 30-minute conversation with
            the recruiter who fills VP and Director roles across Social Media,
            Digital Marketing, and Brand — and get straight answers about scope,
            leveling, and what the process looks like.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onBook} size="lg" className="rounded-full px-7 font-semibold">
              Book your meeting
            </Button>
            <a href="#recruiters">
              <Button variant="outline" size="lg" className="rounded-full px-7 font-semibold">
                Meet the recruiters
              </Button>
            </a>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 pt-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Clock className="size-4 text-primary" /> 30 minutes
            </span>
            <span className="inline-flex items-center gap-2">
              <Video className="size-4 text-primary" /> Video call
            </span>
            <span className="inline-flex items-center gap-2">
              <CalendarCheck className="size-4 text-primary" /> Free &amp; no commitment
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Upcoming availability</p>
              <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                This week
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {upcomingDays.map((d) => (
                <div
                  key={d.date}
                  className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 flex-col items-center justify-center rounded-lg bg-background text-center leading-none">
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">
                        {d.day}
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {d.date.split(" ")[1]}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{d.date}</span>
                  </div>
                  <span className="text-sm text-primary">{d.slots}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

