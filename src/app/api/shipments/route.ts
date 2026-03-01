import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, validateBody, ok, created, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { onShipmentCreated } from '@/lib/charge-event-service';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const GetShipmentsQuerySchema = z.object({
  search: z.string().optional(),
  customerId: z.string().optional(),
  status: z.string().optional(),
  carrier: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const CreateShipmentBodySchema = z.object({
  customerId: z.string().min(1),
  carrier: z.string().min(1),
  service: z.string().min(1),
  trackingNumber: z.string().optional(),
  weight: z.number().optional(),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
  toName: z.string().min(1),
  toAddress: z.string().min(1),
  toCity: z.string().min(1),
  toState: z.string().min(1),
  toZip: z.string().min(1),
  toCountry: z.string().optional().default('US'),
  retailPrice: z.number().min(0),
  cost: z.number().min(0).optional(),
  declared_value: z.number().optional(),
  insurance: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

/**
 * GET /api/shipments
 * List shipments with search, filtering, and pagination.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  const query = validateQuery(request, GetShipmentsQuerySchema);
  const tenantId = user.tenantId!;
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.ShipmentWhereInput = {
    customer: { tenantId },
  };

  if (query.search) {
    where.OR = [
      { trackingNumber: { contains: query.search, mode: 'insensitive' } },
      { customer: { tenantId, firstName: { contains: query.search, mode: 'insensitive' } } },
      { customer: { tenantId, lastName: { contains: query.search, mode: 'insensitive' } } },
      { customer: { tenantId, pmbNumber: { contains: query.search, mode: 'insensitive' } } },
    ];
  }
  if (query.customerId) where.customerId = query.customerId;
  if (query.status) where.status = query.status;
  if (query.carrier) where.carrier = query.carrier;

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.limit,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, pmbNumber: true },
        },
      },
    }),
    prisma.shipment.count({ where }),
  ]);

  return ok({ shipments, total, page: query.page, limit: query.limit });
});

/**
 * POST /api/shipments
 * Create a new shipment. Auto-generates a charge event (BAR-308).
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  const body = await validateBody(request, CreateShipmentBodySchema);
  const tenantId = user.tenantId!;

  // Verify customer belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: { id: body.customerId, tenantId },
  });
  if (!customer) return badRequest('Customer not found');

  const shipment = await prisma.shipment.create({
    data: {
      customerId: body.customerId,
      carrier: body.carrier,
      service: body.service,
      trackingNumber: body.trackingNumber ?? null,
      weight: body.weight ?? null,
      length: body.dimensions?.length ?? null,
      width: body.dimensions?.width ?? null,
      height: body.dimensions?.height ?? null,
      toName: body.toName,
      toAddress: body.toAddress,
      toCity: body.toCity,
      toState: body.toState,
      toZip: body.toZip,
      toCountry: body.toCountry,
      retailPrice: body.retailPrice,
      cost: body.cost ?? null,
      declaredValue: body.declared_value ?? null,
      insured: body.insurance,
      notes: body.notes ?? null,
      status: 'pending',
      createdById: user.id,
    },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, pmbNumber: true },
      },
    },
  });

  // BAR-308: Auto-generate charge event for the shipment
  try {
    await onShipmentCreated({
      tenantId,
      shipmentId: shipment.id,
      customerId: body.customerId,
      retailPrice: body.retailPrice,
      carrier: body.carrier,
      service: body.service,
      createdById: user.id,
    });
  } catch (err) {
    console.error('[shipments] Charge event generation failed:', err);
  }

  return created({ shipment });
});
