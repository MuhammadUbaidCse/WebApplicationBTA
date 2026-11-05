const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_NAME = "BTA PBL Certificates";

let googleIdentityScript;

export function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (googleIdentityScript) return googleIdentityScript;

  googleIdentityScript = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        reject(new Error("Google sign-in could not be initialized."));
      }
    };
    script.onerror = () => reject(new Error("Could not load Google sign-in. Check your internet connection and try again."));
    document.head.appendChild(script);
  }).catch((error) => {
    googleIdentityScript = null;
    throw error;
  });

  return googleIdentityScript;
}

export function requestDriveAccessToken(clientId) {
  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google sign-in is still loading. Wait a moment and try again.");
  }

  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || "Google Drive authorization failed."));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(new Error(error.message || "Google sign-in popup failed. Allow popups and try again."));
      },
    });

    tokenClient.requestAccessToken({ prompt: "" });
  });
}

async function driveRequest(accessToken, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body.error?.message || "";
    } catch {
      detail = response.statusText;
    }

    if (response.status === 401) {
      throw new Error("Google Drive access expired. Disconnect Drive and connect it again.");
    }
    throw new Error(`Google Drive request failed (${response.status}): ${detail || response.statusText}`);
  }

  return response;
}

async function listFiles(accessToken, query) {
  const files = [];
  let pageToken;

  do {
    const params = new URLSearchParams({
      q: query,
      fields: "nextPageToken,files(id,name,mimeType,modifiedTime,appProperties)",
      pageSize: "100",
      spaces: "drive",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await driveRequest(accessToken, `${DRIVE_API}/files?${params}`);
    const result = await response.json();
    files.push(...(result.files || []));
    pageToken = result.nextPageToken;
  } while (pageToken);

  return files;
}

async function getStorageFolder(accessToken) {
  const folders = await listFiles(
    accessToken,
    "mimeType='application/vnd.google-apps.folder' and appProperties has { key='btaPblManaged' and value='folder' } and trashed=false"
  );
  if (folders.length > 0) return folders[0].id;

  const response = await driveRequest(accessToken, `${DRIVE_API}/files?fields=id,name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
      appProperties: { btaPblManaged: "folder" },
    }),
  });
  const folder = await response.json();
  return folder.id;
}

export async function listCertificateFiles(accessToken) {
  const folderId = await getStorageFolder(accessToken);
  const files = await listFiles(
    accessToken,
    `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`
  );
  return files.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));
}

export async function uploadCertificateFile(accessToken, file, fileHash) {
  const folderId = await getStorageFolder(accessToken);
  const hash = fileHash.slice(2).toLowerCase();
  const existing = await listFiles(
    accessToken,
    `'${folderId}' in parents and appProperties has { key='btaPblHash' and value='${hash}' } and trashed=false`
  );
  if (existing.length > 0) {
    return { file: existing[0], alreadyStored: true };
  }

  const boundary = `bta-pbl-${crypto.randomUUID()}`;
  const metadata = {
    name: file.name,
    mimeType: "application/pdf",
    parents: [folderId],
    appProperties: {
      btaPblManaged: "certificate",
      btaPblHash: hash,
    },
  };
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
    file,
    `\r\n--${boundary}--`,
  ], { type: `multipart/related; boundary=${boundary}` });

  const params = new URLSearchParams({ uploadType: "multipart", fields: "id,name,mimeType,modifiedTime,appProperties" });
  const response = await driveRequest(accessToken, `${DRIVE_UPLOAD_API}?${params}`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  return { file: await response.json(), alreadyStored: false };
}

export async function downloadCertificateFile(accessToken, fileId) {
  const params = new URLSearchParams({ alt: "media" });
  return driveRequest(accessToken, `${DRIVE_API}/files/${encodeURIComponent(fileId)}?${params}`);
}
