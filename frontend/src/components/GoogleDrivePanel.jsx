import { useEffect, useState } from "react";
import { sha256File } from "../utils/sha256.js";

export default function GoogleDrivePanel({ drive, selectedFile, fileHash, onFileSelected }) {
  const [uploading, setUploading] = useState(false);
  const [retrievingId, setRetrievingId] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setStatus(null);
  }, [fileHash]);

  const handleSave = async () => {
    if (!selectedFile || !fileHash) return;
    setUploading(true);
    setStatus(null);
    try {
      const { file, alreadyStored } = await drive.uploadFile(selectedFile, fileHash);
      setStatus({
        kind: "success",
        message: alreadyStored
          ? `${file.name} is already saved in your Google Drive.`
          : `${file.name} was saved to your Google Drive.`,
      });
    } catch (error) {
      setStatus({ kind: "error", message: error.message || "Could not save this PDF to Google Drive." });
    } finally {
      setUploading(false);
    }
  };

  const handleRetrieve = async (driveFile) => {
    setRetrievingId(driveFile.id);
    setStatus(null);
    try {
      const response = await drive.downloadFile(driveFile.id);
      const blob = await response.blob();
      const file = new File([blob], driveFile.name, { type: "application/pdf" });
      const fileHash = await sha256File(file);
      const storedHash = driveFile.appProperties?.btaPblHash;
      if (storedHash && fileHash.slice(2).toLowerCase() !== storedHash.toLowerCase()) {
        throw new Error("The retrieved PDF does not match its saved SHA-256 hash. It may have been modified in Drive.");
      }
      await onFileSelected(file);
      setStatus({ kind: "success", message: `${driveFile.name} is ready to issue or verify.` });
    } catch (error) {
      setStatus({ kind: "error", message: error.message || "Could not retrieve this PDF from Google Drive." });
    } finally {
      setRetrievingId(null);
    }
  };

  return (
    <section className="card mb-6" aria-labelledby="google-drive-heading">
      <h2 id="google-drive-heading" className="text-lg font-semibold text-navy-500 mb-2">
        Google Drive Storage
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Store certificate PDFs in your Google Drive or retrieve previously saved files.
        Only this app&apos;s certificate folder is accessed; Drive files are not written to the blockchain.
      </p>

      {!drive.configured ? (
        <p className="alert-warning">
          Google Drive needs setup first. Add a Google OAuth web client ID as
          <code className="font-mono mx-1">VITE_GOOGLE_CLIENT_ID</code> in
          <code className="font-mono mx-1">frontend/.env.local</code>, then restart the frontend.
          See the README for setup steps.
        </p>
      ) : !drive.connected ? (
        <div>
          <button
            type="button"
            className="btn-secondary"
            onClick={drive.connect}
            disabled={!drive.sdkReady || drive.connecting}
          >
            {drive.connecting ? "Connecting…" : drive.sdkReady ? "Connect Google Drive" : "Loading Google sign-in…"}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Google will ask you to grant this app access to files it creates.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-valid">Google Drive connected</span>
            <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={drive.disconnect}>
              Disconnect Drive
            </button>
            <button
              type="button"
              className="btn-secondary text-xs px-3 py-1.5"
              onClick={drive.refreshFiles}
              disabled={drive.loadingFiles}
            >
              {drive.loadingFiles ? "Loading files…" : "Refresh saved PDFs"}
            </button>
          </div>

          {selectedFile && fileHash && (
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-sm font-medium break-all">Selected: {selectedFile.name}</p>
              <p className="text-xs text-gray-500 mt-1">The PDF uploads only when you choose this button.</p>
              <button
                type="button"
                className="btn-secondary mt-3"
                onClick={handleSave}
                disabled={uploading}
              >
                {uploading ? "Saving to Google Drive…" : "Save selected PDF to Google Drive"}
              </button>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Saved certificate PDFs</h3>
            {drive.files.length === 0 ? (
              <p className="text-sm text-gray-500">
                No saved PDFs loaded yet. Choose “Refresh saved PDFs” to browse your app folder.
              </p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {drive.files.map((file) => (
                  <li key={file.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-all">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        Saved {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : "date unavailable"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0"
                      onClick={() => handleRetrieve(file)}
                      disabled={retrievingId !== null}
                    >
                      {retrievingId === file.id ? "Retrieving…" : "Retrieve PDF"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {drive.error && <p className="alert-error mt-3" role="alert">{drive.error}</p>}
      {status && (
        <p className={`${status.kind === "error" ? "alert-error" : "alert-success"} mt-3`} role={status.kind === "error" ? "alert" : "status"}>
          {status.message}
        </p>
      )}
    </section>
  );
}
