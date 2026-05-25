import { NextResponse } from 'next/server';
import { adminWorkerFetch } from '@/lib/admin-worker-api';

export async function GET() {
  const res = await adminWorkerFetch('/admin/nominations');
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
