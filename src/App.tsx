import { useState } from "react"
import { Switch, Route } from "wouter"
import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { ValueProps } from "@/components/value-props"
import { RecruiterGrid } from "@/components/recruiter-grid"
import { FaqSection, SiteFooter } from "@/components/faq-footer"
import { BookingDialog } from "@/components/booking-dialog"
import type { Recruiter } from "@/lib/recruiters"
import { SecretPage } from "@/pages/secret"

function MainApp() {
  const [open, setOpen] = useState(false)
  const [recruiter, setRecruiter] = useState<Recruiter | null>(null)

  function openGeneric() {
    setRecruiter(null)
    setOpen(true)
  }

  function openForRecruiter(r: Recruiter) {
    setRecruiter(r)
    setOpen(true)
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader onBook={openGeneric} />
      <Hero onBook={openGeneric} />
      <ValueProps />
      <RecruiterGrid onBook={openForRecruiter} />
      <FaqSection onBook={openGeneric} />
      <SiteFooter />
      <BookingDialog open={open} onOpenChange={setOpen} recruiter={recruiter} />
    </main>
  )
}

export default function App() {
  return (
    <Switch>
      <Route path="/" component={MainApp} />
      <Route path="/secret" component={SecretPage} />
    </Switch>
  )
}
