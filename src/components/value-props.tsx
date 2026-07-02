import { Compass, MessageSquareHeart, ShieldCheck } from "lucide-react"

const items = [
  {
    icon: Compass,
    title: "Understand the role before you apply",
    body: "Get direct answers on scope, team size, reporting structure, and what the first 90 days look like — straight from the recruiter who owns the search.",
  },
  {
    icon: MessageSquareHeart,
    title: "Know how to position yourself",
    body: "Ask anything about leveling, compensation bands, and how to frame your social media or marketing leadership experience for Meta's hiring bar.",
  },
  {
    icon: ShieldCheck,
    title: "Walk in confident",
    body: "Leave with a clear picture of the interview process, who you'll meet, and tailored advice on how to put your strongest candidacy forward.",
  },
]

export function ValueProps() {
  return (
    <section id="why" className="mx-auto max-w-6xl px-5 py-16 md:py-20">
      <div className="max-w-2xl">
        <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground">
          A real conversation beats another cold application
        </h2>
        <p className="mt-3 text-pretty text-muted-foreground">
          Every meeting is with the recruiter who actively fills VP and Director roles
          in Social Media and Digital Marketing at Meta. Here&apos;s what 30 minutes gets you.
        </p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-sm"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <item.icon className="size-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
