import { Button } from "@/components/ui/button"

function MetaWordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/meta-logo.png" alt="Meta" className="h-7 w-auto" />
      <span className="text-lg font-semibold tracking-tight text-foreground">
        Meta Careers
      </span>
    </div>
  )
}

export function SiteHeader({ onBook }: { onBook: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <MetaWordmark />
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#why" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Why Meta
          </a>
          <a href="#recruiters" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Recruiters
          </a>
          <a href="#faq" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            FAQ
          </a>
        </nav>
        <Button onClick={onBook} className="rounded-full font-semibold">
          Book a meeting
        </Button>
      </div>
    </header>
  )
}
