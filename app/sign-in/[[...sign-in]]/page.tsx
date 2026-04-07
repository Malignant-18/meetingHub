import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050a00] px-4 py-10 text-[#d5f5dc]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(105,255,151,0.18),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(0,228,255,0.12),transparent_24%),radial-gradient(circle_at_bottom,rgba(38,162,105,0.16),transparent_30%),linear-gradient(180deg,#050a00_0%,#071005_55%,#050a00_100%)]" />

      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(38,162,105,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(38,162,105,0.08)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#26a269]/20 bg-[#0c1507]/75 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#9fd8ad] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[#26a269]" />
            Welcome back
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-[#f6fff7]">
            Sign in to Mr.Minutes
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#a4c9ac]">
            Continue from your dashboard and pick up the next meeting right
            where you left off.
          </p>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full",
              main: "gap-0",
              card: "rounded-[28px] border border-[#26a269]/20 bg-[#081004]/80 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl",
              headerTitle: "text-[#f6fff7]",
              headerSubtitle: "text-[#8fb79a]",
              socialButtonsBlockButton:
                "border border-[#26a269]/20 bg-[#101b0d] text-[#f6fff7] hover:bg-[#152313] shadow-none",
              socialButtonsBlockButtonText: "text-[#f6fff7]",
              dividerLine: "bg-[#26a269]/12",
              dividerText: "text-[#70907a]",
              formFieldLabel: "text-[#b8dbbf]",
              formFieldInput:
                "bg-[#0d1808] border-[#26a269]/18 text-[#f6fff7] placeholder:text-[#5f7c68] focus:border-[#26a269] focus:ring-[#26a269]/30",
              formButtonPrimary:
                "plasma-button plasma-button-secondary text-[#041102] hover:scale-[1.01]",
              footerActionText: "text-[#8fb79a]",
              footerActionLink: "text-[#69FF97] hover:text-[#9affba]",
              footer:
                "border-t border-[#26a269]/10 bg-[#0a1406]/75 rounded-b-[28px]",
              footerPages: "text-[#6f8b78]",
              footerPageLink: "text-[#8fb79a] hover:text-[#d5f5dc]",
              formFieldHintText: "text-[#70907a]",
              formFieldErrorText: "text-[#ff9f9f]",
              identityPreviewText: "text-[#f6fff7]",
              identityPreviewEditButton: "text-[#69FF97]",
            },
          }}
        />
      </div>
    </main>
  );
}
