import { useRef, useState } from "react";

/**
 * FileDropzone — Drag-and-drop + click-to-select PDF input.
 * IMPORTANT: The file is processed locally. It is never sent to any server.
 */
export default function FileDropzone({
  onFile,
  accept = ".pdf",
  label = "PDF certificate",
  selectedFileName = null,
  privacyMessage = "The PDF is never uploaded. Only its SHA-256 hash is computed locally.",
}) {
  const inputRef    = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName,   setFileName]   = useState(null);
  const displayedFileName = selectedFileName || fileName;

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    onFile(file);
  };

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true);  };
  const handleDragLeave = ()    => setIsDragging(false);
  const handleDrop      = (e)   => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Select ${label} file`}
        className={`dropzone ${isDragging ? "active" : ""}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {displayedFileName ? (
          <div className="text-center">
            <p className="font-medium text-sm">{displayedFileName}</p>
            <p className="text-xs mt-0.5 opacity-70">Click to change file</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-medium text-sm">Drag &amp; drop a PDF here</p>
            <p className="text-xs mt-0.5 opacity-70">or click to browse — file is processed locally only</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-hidden="true"
        onChange={handleChange}
      />
      <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        {privacyMessage}
      </p>
    </div>
  );
}
