import Link from "next/link";
import InterviewAgentUI from "../components/InterviewAgentUI";

export default function Page() {
  return (
    <main className="min-h-screen bg-white">
      <InterviewAgentUI />
      <div className="max-w-3xl mx-auto px-6 pb-12">
        <div className="mt-8 p-4 border rounded bg-gray-50">
          <h2 className="font-semibold mb-2">试试 Pipecat + Gemini 语音面试</h2>
          <p className="text-sm text-gray-600 mb-3">基于 Daily 录制，结束后跳转结果页查看录制。</p>
          <Link href="/interview" className="inline-block bg-blue-600 text-white px-4 py-2 rounded">进入语音面试</Link>
        </div>
      </div>
    </main>
  );
}
