const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data as T;
}
export async function waitForJob<T>(
  id: string,
  onProgress: (message: string) => void,
): Promise<T> {
  for (;;) {
    const job = await api<{ status: string; message: string; data: T }>(
      `/jobs/${id}`,
    );
    onProgress(`${job.status === "queued" ? "Waiting: " : ""}${job.message}`);
    if (job.status === "completed") return job.data;
    if (job.status === "failed") throw new Error(job.message);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
