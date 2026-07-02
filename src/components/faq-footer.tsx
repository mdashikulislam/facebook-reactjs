import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"

const faqs = [
  {
    q: "What seniority level are these roles?",
    a: "The roles we're currently filling sit at VP and Director level across Social Media, Digital Marketing, and Brand & Content. Our recruiters work exclusively on senior and executive hiring.",
  },
  {
    q: "Do I need to have an active application first?",
    a: "No. These conversations are open to any qualified marketing leader exploring Meta. If a role is a strong fit, your recruiter will guide you through the application from there.",
  },
  {
    q: "What should I prepare for the call?",
    a: "Just bring your questions. If you'd like role-specific feedback, share a resume link or the titles you're most interested in when you book — your recruiter will review it beforehand.",
  },
  {
    q: "How does the interview process work for senior roles?",
    a: "Your recruiter will walk you through the full process on the call — typically a phone screen, executive interviews, and a case or strategy presentation depending on the function.",
  },
  {
    q: "Can I reschedule or cancel?",
    a: "Of course. Use the link in your calendar invite to reschedule or cancel any time before the meeting.",
  },
]

export function FaqSection({ onBook }: { onBook: () => void }) {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-16 md:py-20">
      <h2 className="text-center text-balance text-3xl font-bold tracking-tight text-foreground">
        Frequently asked questions
      </h2>
      <Accordion type="single" collapsible className="mt-8">
        {faqs.map((item) => (
          <AccordionItem key={item.q} value={item.q}>
            <AccordionTrigger className="text-left text-base font-medium">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-pretty text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-12 rounded-2xl bg-primary px-6 py-10 text-center text-primary-foreground">
        <h3 className="text-balance text-2xl font-bold">Ready to explore a senior role at Meta?</h3>
        <p className="mx-auto mt-2 max-w-md text-pretty text-primary-foreground/85">
          Pick the recruiter who covers your area, choose a time, and have a direct
          conversation about VP and Director opportunities in Social Media and Digital Marketing.
        </p>
        <Button
          onClick={onBook}
          size="lg"
          variant="secondary"
          className="mt-6 rounded-full px-8 font-semibold"
        >
          Book a meeting
        </Button>
      </div>
    </section>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} Meta Careers. For demonstration purposes.</p>
        <nav className="flex gap-6">
          <a href="#" className="transition-colors hover:text-foreground">
            Privacy
          </a>
          <a href="#" className="transition-colors hover:text-foreground">
            Accessibility
          </a>
          <a href="#" className="transition-colors hover:text-foreground">
            Open roles
          </a>
        </nav>
      </div>
    </footer>
  )
}
