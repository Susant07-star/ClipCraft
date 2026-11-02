import type { FixedClipResult, VideoPackage, WorkflowJob } from "@/lib/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function generatePackage(accessToken: string, language: string, videoStyle: string, genre: string): Promise<{ job_id: string; status: string }> {
  const res = await fetch(`${API_URL}/generate`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ language, video_style: videoStyle, genre }),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to start generation."));
  return res.json();
}

export async function pollJobStatus(accessToken: string, jobId: string): Promise<WorkflowJob> {
  const res = await fetch(`${API_URL}/status/${jobId}`, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(await readError(res, "Failed to fetch job status."));
  return res.json();
}

export async function cancelJob(accessToken: string, jobId: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_URL}/cancel/${jobId}`, { method: "POST", headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(await readError(res, "Failed to cancel generation."));
  return res.json();
}

export async function fetchAllPackages(accessToken: string): Promise<VideoPackage[]> {
  const res = await fetch(`${API_URL}/packages`, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(await readError(res, "Failed to fetch packages."));
  return res.json();
}

export async function fetchPackageById(accessToken: string, id: string): Promise<VideoPackage> {
  const res = await fetch(`${API_URL}/packages/${id}`, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(await readError(res, "Failed to fetch package."));
  return res.json();
}

export async function reviseStory(accessToken: string, packageId: string, story: string, changeRequest: string): Promise<{ job_id: string; status: string; story_version: number }> {
  const res = await fetch(`${API_URL}/packages/${packageId}/revise`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ story, change_request: changeRequest }),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to submit story changes."));
  return res.json();
}

export async function approveStory(accessToken: string, packageId: string): Promise<{ job_id: string; status: string }> {
  const res = await fetch(`${API_URL}/packages/${packageId}/approve`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to approve story."));
  return res.json();
}

export async function fixPrompt(accessToken: string, packageId: string, clipNumber: number, errorDescription: string): Promise<FixedClipResult> {
  const res = await fetch(`${API_URL}/fix-prompt`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ package_id: packageId, clip_number: clipNumber, error_description: errorDescription }),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to fix prompt."));
  return res.json();
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return typeof body.detail === "string" ? body.detail : fallback;
  } catch {
    return fallback;
  }
}
