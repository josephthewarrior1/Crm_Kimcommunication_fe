import { proxyCrmRequest } from '@/lib/server/tagtogSso';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = proxyCrmRequest;
export const HEAD = proxyCrmRequest;
export const POST = proxyCrmRequest;
export const PUT = proxyCrmRequest;
export const PATCH = proxyCrmRequest;
export const DELETE = proxyCrmRequest;
