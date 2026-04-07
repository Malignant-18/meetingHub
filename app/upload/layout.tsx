import Navbar from "@/components/Navbar";

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050a00] text-[#d5f5dc]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(105,255,151,0.18),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(0,228,255,0.12),transparent_24%),radial-gradient(circle_at_bottom,rgba(38,162,105,0.16),transparent_30%),linear-gradient(180deg,#050a00_0%,#071005_55%,#050a00_100%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(38,162,105,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(38,162,105,0.08)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
