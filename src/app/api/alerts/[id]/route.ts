/**
 * BAR-265: Alert System — Single Alert Detail
 *
 * GET /api/alerts/:id → Get a single alert by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

export const GET = withApiHandler(async (request, { params }) => {
  try {
    const { id } = await params;

    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({ alert });
  } catch (error) {
    console.error('[alerts] GET :id error:', error);
    return NextResponse.json({ error: 'Failed to fetch alert' }, { status: 500 });
  }
}, { public: true });
