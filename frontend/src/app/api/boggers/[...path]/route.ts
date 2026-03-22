import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const upstream = (process.env.BOGGERS_INTERNAL_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  ""
);
const token = process.env.BOGGERS_DASHBOARD_TOKEN;

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const subPath = path.join("/");
  const url = new URL(`${upstream}/${subPath}`);
  url.search = request.nextUrl.searchParams.toString();

  const headers = new Headers();
  const pass = [
    "content-type",
    "accept",
    "accept-language",
    "x-boggers-session-id",
    "x-boggers-tenant-id",
    "x-tenant-id",
    "cache-control",
  ];
  for (const name of pass) {
    const v = request.headers.get(name);
    if (v) headers.set(name, v);
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }

  const res = await fetch(url, init);
  const out = new NextResponse(res.body, { status: res.status });
  const skip = new Set(["connection", "transfer-encoding", "keep-alive"]);
  res.headers.forEach((value, key) => {
    if (!skip.has(key.toLowerCase())) {
      out.headers.set(key, value);
    }
  });
  return out;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
