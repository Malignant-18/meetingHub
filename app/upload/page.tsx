// app/upload/page.tsx
import UploadForm from '@/components/UploadForm'

export default function UploadPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Upload Transcript</h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload .txt or .vtt meeting transcript files to start extracting insights
        </p>
      </div>
      <UploadForm />
    </div>
  )
}
