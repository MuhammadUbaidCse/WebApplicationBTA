import { useCallback, useEffect, useState } from "react";
import {
  downloadCertificateFile,
  listCertificateFiles,
  loadGoogleIdentity,
  requestDriveAccessToken,
  uploadCertificateFile,
} from "../utils/googleDrive.js";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export function useGoogleDrive() {
  const [accessToken, setAccessToken] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let active = true;
    loadGoogleIdentity()
      .then(() => { if (active) setSdkReady(true); })
      .catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, []);

  const connect = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Google Drive is not configured. Set VITE_GOOGLE_CLIENT_ID in frontend/.env.local and restart the frontend.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const tokenRequest = requestDriveAccessToken(GOOGLE_CLIENT_ID);
      const token = await tokenRequest;
      setAccessToken(token);
      setFiles([]);
    } catch (connectError) {
      setError(connectError.message || "Could not connect Google Drive.");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccessToken(null);
    setFiles([]);
    setError(null);
  }, []);

  const refreshFiles = useCallback(async () => {
    if (!accessToken) return;
    setLoadingFiles(true);
    setError(null);
    try {
      setFiles(await listCertificateFiles(accessToken));
    } catch (listError) {
      setError(listError.message || "Could not load files from Google Drive.");
    } finally {
      setLoadingFiles(false);
    }
  }, [accessToken]);

  const uploadFile = useCallback(async (file, hash) => {
    if (!accessToken) throw new Error("Connect Google Drive before saving a PDF.");
    setError(null);
    try {
      const result = await uploadCertificateFile(accessToken, file, hash);
      await refreshFiles();
      return result;
    } catch (uploadError) {
      setError(uploadError.message || "Could not save the PDF to Google Drive.");
      throw uploadError;
    }
  }, [accessToken, refreshFiles]);

  const downloadFile = useCallback(async (fileId) => {
    if (!accessToken) throw new Error("Connect Google Drive before retrieving a PDF.");
    setError(null);
    try {
      return await downloadCertificateFile(accessToken, fileId);
    } catch (downloadError) {
      setError(downloadError.message || "Could not retrieve the PDF from Google Drive.");
      throw downloadError;
    }
  }, [accessToken]);

  return {
    configured: Boolean(GOOGLE_CLIENT_ID),
    connected: Boolean(accessToken),
    sdkReady,
    connecting,
    loadingFiles,
    files,
    error,
    connect,
    disconnect,
    refreshFiles,
    uploadFile,
    downloadFile,
  };
}
