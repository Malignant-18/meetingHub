import UploadForm from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="bg-[linear-gradient(90deg,#f6fff7_0%,#69FF97_45%,#00E4FF_100%)] bg-clip-text text-4xl font-semibold tracking-[-0.05em] text-transparent sm:text-5xl">
          Upload Transcript
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#8fb79a] sm:text-base">
          Choose a project first and then upload one or more meeting transcripts
          to start.
        </p>
      </div>

      <UploadForm />
    </div>
  );
}
