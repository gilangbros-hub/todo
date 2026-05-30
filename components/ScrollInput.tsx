'use client';

import { useState, useRef } from 'react';

interface ScrollInputProps {
  onSubmit: (text: string, title: string, fileName: string | null, model: string) => void;
  isLoading: boolean;
}

const DEEPSEEK_MODELS = [
  { id: 'deepseek-v4-pro', label: 'V4 Pro', description: 'Most capable — deep reasoning' },
  { id: 'deepseek-v4-flash', label: 'V4 Flash', description: 'Fast & cheap' },
  { id: 'deepseek-chat', label: 'Chat (legacy)', description: 'V4 Flash non-thinking mode' },
  { id: 'deepseek-reasoner', label: 'Reasoner (legacy)', description: 'V4 Flash thinking mode' },
] as const;

export default function ScrollInput({ onSubmit, isLoading }: ScrollInputProps) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [model, setModel] = useState('deepseek-v4-pro');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    const validTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
    ];

    // Also accept by extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['pdf', 'txt', 'md'];

    if (!validTypes.includes(file.type) && !validExts.includes(ext || '')) {
      alert('Unsupported file type. Please upload PDF, TXT, or MD files.');
      return;
    }

    setFileName(file.name);
    setTitle(file.name.replace(/\.[^.]+$/, ''));

    if (file.type === 'application/pdf' || ext === 'pdf') {
      // Read as base64 and send to parse endpoint
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      try {
        const res = await fetch('/api/brd/parse-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, fileName: file.name }),
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Failed to parse PDF');
          return;
        }

        const { text: pdfText } = await res.json();
        setText(pdfText);
      } catch {
        alert('Failed to parse PDF. Please try pasting the text directly.');
      }
    } else {
      // Plain text / markdown
      const content = await file.text();
      setText(content);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = () => {
    if (!text.trim() || !title.trim()) return;
    onSubmit(text.trim(), title.trim(), fileName, model);
  };

  return (
    <div className="space-y-4">
      {/* Title Input */}
      <div>
        <label className="block font-pixel text-[10px] text-rpg-rare mb-2">
          Scroll Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name this scroll..."
          maxLength={200}
          className="w-full bg-rpg-dark text-white font-retro text-sm px-3 py-2 pixel-border focus:outline-none focus:shadow-rare"
          aria-label="Document title"
        />
      </div>

      {/* File Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          rpg-card p-6 text-center cursor-pointer transition-all
          ${dragOver ? 'border-rpg-legendary shadow-legendary' : 'hover:border-rpg-rare hover:shadow-rare'}
        `}
        role="button"
        tabIndex={0}
        aria-label="Upload BRD file"
      >
        <p className="font-pixel text-[10px] text-rpg-legendary mb-2">
          Drop Scroll Here
        </p>
        <p className="font-retro text-sm text-gray-400">
          PDF, TXT, or MD files accepted
        </p>
        {fileName && (
          <p className="font-retro text-sm text-rpg-rare mt-2">
            📜 {fileName}
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {/* Text Area (paste or auto-filled from file) */}
      <div>
        <label className="block font-pixel text-[10px] text-rpg-rare mb-2">
          Scroll Contents
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your BRD text here, or upload a file above..."
          rows={10}
          className="w-full bg-rpg-dark text-white font-retro text-sm px-3 py-2 pixel-border focus:outline-none focus:shadow-rare resize-y"
          aria-label="BRD document text"
        />
        <p className="mt-1 text-xs font-retro text-gray-500">
          {text.length.toLocaleString()} characters
        </p>
      </div>

      {/* Model Selector */}
      <div>
        <label className="block font-pixel text-[10px] text-rpg-rare mb-2">
          Oracle Model
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DEEPSEEK_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModel(m.id)}
              className={`px-3 py-2 text-left pixel-border transition-all cursor-pointer ${
                model === m.id
                  ? 'border-rpg-legendary shadow-legendary'
                  : 'border-rpg-border hover:border-rpg-rare'
              }`}
            >
              <p className={`font-pixel text-[8px] ${model === m.id ? 'text-rpg-legendary' : 'text-white'}`}>
                {m.label}
              </p>
              <p className="font-retro text-[11px] text-gray-400">{m.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading || !text.trim() || !title.trim()}
        className="w-full px-4 py-3 font-pixel text-xs bg-rpg-legendary text-rpg-dark pixel-border border-rpg-legendary hover:shadow-legendary transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isLoading ? '🔮 The Oracle is reading...' : '🔮 Consult the Oracle'}
      </button>
    </div>
  );
}
