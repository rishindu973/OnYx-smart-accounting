// src/lib/api.ts

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function apiGet<T>(path: string): Promise<T> {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is missing in .env.local");

  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Expected JSON but got: ${contentType}\n\n${text.slice(0, 200)}`);
  }

  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is missing in .env.local");

  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Expected JSON but got: ${contentType}\n\n${text.slice(0, 200)}`);
  }

  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}
