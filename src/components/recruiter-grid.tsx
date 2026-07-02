import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Linkedin, MapPin } from "lucide-react"
import { recruiters, teams, type Recruiter } from "@/lib/recruiters"

export function RecruiterGrid({ onBook }: { onBook: (r: Recruiter) => void }) {
  const [activeTeam, setActiveTeam] = useState<string>("All teams")

  const filtered =
    activeTeam === "All teams"
      ? recruiters
      : recruiters.filter((r) => r.team === activeTeam)

  return (
    <section id="recruiters" className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="max-w-2xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground">
            Meet the recruiters
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            Filter by team to find the recruiter who hires for the roles
            you&apos;re after, then book a time that works for you.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {teams.map((team) => (
            <button
              key={team}
              onClick={() => setActiveTeam(team)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                activeTeam === team
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/50",
              )}
            >
              {team}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <article
              key={r.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                {r.photo ? (
                  <img
                    src={r.photo}
                    alt={`Portrait of ${r.name}`}
                    width={64}
                    height={64}
                    className="size-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground">
                    {r.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-semibold text-foreground">{r.name}</h3>
                  <p className="text-sm text-muted-foreground">{r.title}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {r.location}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground">
                {r.bio}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {r.focus.map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
                  >
                    {f}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex gap-2">
                {r.linkedin && (
                  <a
                    href={r.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-[#0A66C2] transition-colors hover:border-[#0A66C2]/40 hover:bg-[#0A66C2]/5"
                  >
                    <Linkedin className="size-4" />
                  </a>
                )}
                <Button
                  onClick={() => onBook(r)}
                  className="flex-1 rounded-full font-semibold"
                >
                  Book with {r.name.split(" ")[0]}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
