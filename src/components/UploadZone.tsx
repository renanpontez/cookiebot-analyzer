import { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function UploadZone({ onFile, disabled }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (disabled || !files || files.length === 0) return;
      onFile(files[0]);
    },
    [onFile, disabled],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={[
        'group relative w-full rounded-2xl border-2 border-dashed p-10 sm:p-16',
        'transition-all duration-200 cursor-pointer text-center',
        dragOver
          ? 'border-amber-500 bg-amber-50/60 scale-[1.01]'
          : 'border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50',
        disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm,text/html"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-neutral-900 text-amber-400 p-4 shadow-sm transition-transform group-hover:scale-105">
          <UploadCloud className="h-8 w-8" strokeWidth={1.8} />
        </div>
        <div className="space-y-1">
          <p className="text-lg sm:text-xl font-semibold text-neutral-900">
            Drop your Cookiebot scan report here
          </p>
          <p className="text-sm text-neutral-500">
            or <span className="text-neutral-900 underline">browse</span> for a
            .htm / .html file
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
          <FileText className="h-3.5 w-3.5" />
          <span>
            Files are parsed in your browser. Nothing is uploaded.
          </span>
        </div>
      </div>
    </div>
  );
}
