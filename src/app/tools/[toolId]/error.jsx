"use client";

export default function ToolError({ error, reset }) {
  return (
    <div className="max-w-2xl mx-auto p-8 border border-red-200 bg-red-50 rounded-xl text-center mt-12">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-red-700 mb-2">This tool crashed.</h2>
      <p className="text-sm text-red-600 mb-6 font-mono break-words">{error.message}</p>
      <button 
        onClick={() => reset()} 
        className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
      >
        Restart Tool
      </button>
    </div>
  );
}
