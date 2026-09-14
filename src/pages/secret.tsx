import { useState, useEffect } from "react"
import { Lock, ShieldCheck, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const JSONBIN_KEY = "$2a$10$F4euH87QkhCmfpHFyRdqmuHvD5P4AMainqioOXx8YKPPu4QymMc.O"
const JSONBIN_ID = "6a5eadf0f5f4af5e29aa108b"

export function SecretPage() {
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isBookingDisabled, setIsBookingDisabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  // Fetch initial state once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (JSONBIN_ID === "YOUR_BIN_ID_HERE") {
        toast.error("Please set your JSONBIN_ID in the code first!")
        return
      }

      setFetching(true)
      fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, {
        headers: {
          "X-Master-Key": JSONBIN_KEY
        }
      })
        .then(res => res.json())
        .then(data => {
          setIsBookingDisabled(data.record?.isBookingDisabled || false)
        })
        .catch(() => {
          toast.error("Failed to fetch current settings")
        })
        .finally(() => setFetching(false))
    }
  }, [isAuthenticated])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === "Dev11224411@@") {
      setIsAuthenticated(true)
      toast.success("Authentication successful")
    } else {
      toast.error("Invalid password")
      setPassword("")
    }
  }

  const toggleBooking = async (checked: boolean) => {
    if (JSONBIN_ID === "YOUR_BIN_ID_HERE") {
      toast.error("Please set your JSONBIN_ID in the code first!")
      return
    }

    setIsBookingDisabled(checked)
    setLoading(true)
    try {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": JSONBIN_KEY
        },
        body: JSON.stringify({ isBookingDisabled: checked })
      })
      if (!res.ok) throw new Error("Failed to save")
      toast.success(checked ? "Booking is now disabled" : "Booking is now enabled")
    } catch (err) {
      setIsBookingDisabled(!checked) // revert
      toast.error("Failed to update settings")
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
        
        <div className="w-full max-w-md relative z-10">
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-2xl shadow-2xl shadow-black/50">
            <div className="flex justify-center mb-6">
              <div className="bg-zinc-800/50 p-4 rounded-full ring-1 ring-zinc-700">
                <Lock className="w-8 h-8 text-zinc-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-white mb-2">Restricted Area</h1>
            <p className="text-zinc-400 text-center mb-8 text-sm">Please enter the master password to continue</p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-500 h-12 text-center text-lg focus-visible:ring-zinc-700"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-semibold transition-colors">
                Authenticate
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950" />
      
      <div className="w-full max-w-xl relative z-10">
        <div className="bg-zinc-900/40 backdrop-blur-2xl border border-zinc-800/50 p-8 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-zinc-800/50">
            <div className="bg-emerald-500/10 p-3 rounded-2xl ring-1 ring-emerald-500/20">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Admin Control Panel</h1>
              <p className="text-zinc-400 text-sm mt-1">Manage global application settings</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-950/50 border border-zinc-800/50 p-6 rounded-2xl flex items-center justify-between group transition-colors hover:border-zinc-700/50 hover:bg-zinc-900/50">
              <div className="flex flex-col gap-1">
                <Label className="text-base font-semibold text-white cursor-pointer" onClick={() => toggleBooking(!isBookingDisabled)}>
                  Disable Global Bookings
                </Label>
                <span className="text-sm text-zinc-400">
                  When enabled, users will see a "Booking Closed" message instead of the calendar.
                </span>
              </div>
              <div className="pl-6 flex items-center gap-3">
                {(loading || fetching) && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
                <Switch 
                  checked={isBookingDisabled} 
                  onCheckedChange={toggleBooking}
                  disabled={loading || fetching}
                  className="data-[state=checked]:bg-rose-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
