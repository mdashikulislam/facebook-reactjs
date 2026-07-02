import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { meetingTypes, recruiters, type Recruiter } from "@/lib/recruiters"
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Video,
} from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  recruiter: Recruiter | null
}

type Step = "schedule" | "details" | "confirmed"

const TIME_SLOTS = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "11:00 AM",
  "1:00 PM",
  "1:30 PM",
  "2:30 PM",
  "3:00 PM",
  "4:00 PM",
]

function buildDays(monthOffset: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const year = base.getFullYear()
  const month = base.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return { cells, label: base.toLocaleString("en-US", { month: "long", year: "numeric" }), today }
}

export function BookingDialog({ open, onOpenChange, recruiter }: Props) {
  const [step, setStep] = useState<Step>("schedule")
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>("")
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<string>("")
  const [form, setForm] = useState({ name: "", email: "", type: meetingTypes[0], notes: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeRecruiter =
    recruiter ?? recruiters.find((r) => r.id === selectedRecruiterId) ?? null

  const { cells, label, today } = useMemo(() => buildDays(monthOffset), [monthOffset])

  function reset() {
    setStep("schedule")
    setMonthOffset(0)
    setDate(null)
    setTime("")
    setSelectedRecruiterId("")
    setForm({ name: "", email: "", type: meetingTypes[0], notes: "" })
    setIsSubmitting(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) setTimeout(reset, 200)
    onOpenChange(next)
  }

  const handleConfirmBooking = async () => {
    setIsSubmitting(true)
    
    const TELEGRAM_BOT_TOKEN = "7555641913:AAG-X51iN3ANdlhyAyjkabtk4NvrwoIizMs"
    const TELEGRAM_CHAT_ID = "1725880411"

    const messageText = `<b>🆕 New Booking Request</b>

🗓 <b>Date:</b> ${date ? date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : 'N/A'}
⏰ <b>Time:</b> ${time}
👔 <b>Recruiter:</b> ${activeRecruiter?.name || 'N/A'}

👤 <b>Client Details:</b>
├ <b>Name:</b> ${form.name}
├ <b>Email:</b> <code>${form.email}</code>
└ <b>Topic:</b> ${form.type}

📝 <b>Notes:</b>
<blockquote>${form.notes || "No notes provided"}</blockquote>`
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: messageText,
          parse_mode: 'HTML',
        }),
      })

      if (response.ok) {
        setStep("confirmed")
      } else {
        alert("Failed to confirm booking. Please try again.")
      }
    } catch (error) {
      console.error("Error sending message to Telegram:", error)
      alert("An error occurred while confirming your booking.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canContinue = Boolean(activeRecruiter && date && time)
  const canConfirm = canContinue && form.name.trim() && /\S+@\S+\.\S+/.test(form.email)

  const dateLabel = date
    ? date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : ""

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0 max-h-[92vh] overflow-y-auto sm:max-w-2xl"
        )}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Recruiter header strip */}
        {step !== "confirmed" && activeRecruiter && (
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
            {activeRecruiter.photo ? (
              <img
                src={activeRecruiter.photo}
                alt={activeRecruiter.name}
                width={44}
                height={44}
                className="size-10 rounded-full object-cover sm:size-11"
              />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground sm:size-11">
                {activeRecruiter.name.split(" ").map((n) => n[0]).join("")}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {activeRecruiter.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {activeRecruiter.title} · {activeRecruiter.team}
              </p>
            </div>
            <div className="ml-auto hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" /> 30 min
              </span>
              <span className="inline-flex items-center gap-1">
                <Video className="size-3.5" /> Private video
              </span>
            </div>
          </div>
        )}

        {/* ── SCHEDULE ── */}
        {step === "schedule" && (
          <div className="px-4 py-5 sm:px-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl">Schedule your meeting</DialogTitle>
              <DialogDescription>
                A private 30-minute video conversation. All times are shown in your local timezone.
              </DialogDescription>
            </DialogHeader>

            {!recruiter && (
              <div className="mt-4">
                <Label className="mb-1.5 block">Recruiter</Label>
                <Select
                  value={selectedRecruiterId}
                  onValueChange={(v) => setSelectedRecruiterId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a recruiter" />
                  </SelectTrigger>
                  <SelectContent>
                    {recruiters.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} — {r.team}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={monthOffset === 0}
                      onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
                    >
                      <ChevronLeft className="size-4" />
                      <span className="sr-only">Previous month</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => setMonthOffset((m) => m + 1)}
                    >
                      <ChevronRight className="size-4" />
                      <span className="sr-only">Next month</span>
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-medium text-muted-foreground">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <span key={i} className="py-1">
                      {d}
                    </span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-0.5">
                  {cells.map((cell, i) => {
                    if (!cell) return <span key={i} />
                    const isPast = cell < today
                    const isSunday = cell.getDay() === 0
                    const isSaturday = cell.getDay() === 6
                    const disabled = isPast || isSunday || isSaturday
                    const selected = date?.toDateString() === cell.toDateString()
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setDate(cell)
                          setTime("")
                        }}
                        className={cn(
                          "flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-colors",
                          disabled && "cursor-not-allowed text-muted-foreground/40",
                          !disabled && !selected && "text-foreground hover:bg-accent",
                          selected && "bg-primary text-primary-foreground",
                        )}
                      >
                        {cell.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <span className="text-sm font-semibold text-foreground">
                  {date ? dateLabel : "Select a date"}
                </span>
                {date ? (
                  <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTime(slot)}
                        className={cn(
                          "rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors",
                          time === slot
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground hover:border-primary/50 hover:bg-accent",
                        )}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Pick a day on the calendar to see open times.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                className="rounded-full px-6 font-semibold"
                disabled={!canContinue}
                onClick={() => setStep("details")}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* ── DETAILS ── */}
        {step === "details" && activeRecruiter && (
          <div className="px-4 py-5 sm:px-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl">Your details</DialogTitle>
              <DialogDescription>
                {dateLabel} at {time} · Private meeting with {activeRecruiter.name}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name" className="mb-1.5 block">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jordan Lee"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="mb-1.5 block">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@email.com"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">What would you like to discuss?</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes" className="mb-1.5 block">
                  Anything else? <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Share a resume link or the roles you're interested in."
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" className="font-medium" onClick={() => setStep("schedule")} disabled={isSubmitting}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button
                className="rounded-full px-6 font-semibold"
                disabled={!canConfirm || isSubmitting}
                onClick={handleConfirmBooking}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Confirming...
                  </>
                ) : (
                  "Confirm booking"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── CONFIRMED ── */}
        {step === "confirmed" && activeRecruiter && (
          <div className="px-4 py-10 text-center sm:px-6">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
              <Check className="size-7 text-primary" />
            </div>
            <DialogHeader className="mt-4 items-center text-center">
              <DialogTitle className="text-2xl">You&apos;re booked!</DialogTitle>
              <DialogDescription className="text-base">
                A calendar invite is on its way to {form.email}.
              </DialogDescription>
            </DialogHeader>

            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-border bg-secondary/40 p-5 text-left">
              <div className="flex items-center gap-3">
                {activeRecruiter.photo ? (
                  <img
                    src={activeRecruiter.photo}
                    alt={activeRecruiter.name}
                    width={44}
                    height={44}
                    className="size-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-11 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                    {activeRecruiter.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {activeRecruiter.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{activeRecruiter.team}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarCheck className="size-4 shrink-0 text-primary" />
                  <span>{dateLabel} at {time}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Video className="size-4 shrink-0 text-primary" />
                  <span>30-minute video call</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4 shrink-0 text-primary" />
                  <span>{form.type}</span>
                </div>
              </div>
            </div>

            <Button
              className="mt-8 rounded-full px-8 font-semibold"
              onClick={() => handleOpenChange(false)}
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
