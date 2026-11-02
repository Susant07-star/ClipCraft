const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export async function generatePackage(language: string, videoStyle: string, genre: string): Promise<{ job_id: string; status: string }> {
  const res = await fetch(`${API_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, video_style: videoStyle, genre }),
  });
  if (!res.ok) throw new Error("Failed to start generation.");
  return res.json();
}

export async function pollJobStatus(jobId: string): Promise<any> {
  const res = await fetch(`${API_URL}/status/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch job status.");
  return res.json();
}

export async function cancelJob(jobId: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_URL}/cancel/${jobId}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to cancel generation.");
  return res.json();
}

export async function fetchAllPackages(): Promise<any[]> {
  const res = await fetch(`${API_URL}/packages`);
  if (!res.ok) throw new Error("Failed to fetch packages.");
  return res.json();
}

export async function fetchPackageById(id: string): Promise<any> {
  const res = await fetch(`${API_URL}/packages/${id}`);
  if (!res.ok) throw new Error("Failed to fetch package.");
  return res.json();
}

export async function fixPrompt(packageId: string, clipNumber: number, errorDescription: string): Promise<any> {
  const res = await fetch(`${API_URL}/fix-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ package_id: packageId, clip_number: clipNumber, error_description: errorDescription }),
  });
  if (!res.ok) throw new Error("Failed to fix prompt.");
  return res.json();
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}
