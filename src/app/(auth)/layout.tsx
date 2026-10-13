import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/layout/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto">{children}</div>
        </div>
        <p className="text-xs text-muted">Your data stays private to your workspace. Export it any time.</p>
      </div>
      <div className="hidden lg:flex relative overflow-hidden bg-[#111118] text-white p-12 flex-col justify-between">
        <svg className="absolute inset-0 w-full h-full opacity-60" viewBox="0 0 600 700" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <radialGradient id="g" cx="50%" cy="40%" r="60%"><stop offset="0" stopColor="#5b5bd6" stopOpacity=".35" /><stop offset="1" stopColor="#111118" stopOpacity="0" /></radialGradient>
          </defs>
          <rect width="600" height="700" fill="url(#g)" />
          <g stroke="#7c7cf0" strokeOpacity=".45" strokeWidth="1.5" fill="none">
            <path d="M300 250 C 200 300, 160 360, 140 420" /><path d="M300 250 C 400 300, 440 360, 460 420" /><path d="M300 250 L 300 470" />
            <path d="M140 420 C 180 500, 260 520, 300 470" strokeDasharray="5 6" /><path d="M460 420 C 430 520, 340 540, 300 470" strokeDasharray="5 6" />
            <path d="M300 470 L 300 590" />
          </g>
          {[[300, 250, "#7c7cf0"], [140, 420, "#10b981"], [460, 420, "#f59e0b"], [300, 470, "#3b82f6"], [300, 590, "#ec4899"]].map(([x, y, c], i) => (
            <circle key={i} cx={x as number} cy={y as number} r="9" fill={c as string} />
          ))}
        </svg>
        <div className="relative" />
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight leading-tight">Turn scattered thoughts into connected plans.</h2>
          <p className="mt-4 text-white/70 leading-relaxed">Capture ideas, see how the areas of your life influence each other, and turn what matters into goals, tasks and measurable progress.</p>
          <div className="mt-8 flex gap-6 text-sm text-white/60">
            <span>Thoughts</span><span>→ Connections</span><span>→ Plans</span><span>→ Progress</span>
          </div>
        </div>
      </div>
    </div>
  );
}
