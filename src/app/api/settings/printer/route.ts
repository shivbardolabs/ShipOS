import { withApiHandler, validateBody, validateQuery, ok, badRequest, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const SavePrinterSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  ipAddress: z.string().nullable().optional(),
  port: z.number().int().nullable().optional(),
  isDefault: z.boolean().optional(),
});

const DeletePrinterQuerySchema = z.object({
  id: z.string().min(1),
});

/**
 * GET /api/settings/printer
 * Returns printer configuration for the current tenant.
 */
export const GET = withApiHandler(async (request, { user }) => {
  if (!user.tenantId) badRequest('No tenant found');

  const printers = await prisma.printerConfig.findMany({
    where: { tenantId: user.tenantId! },
    orderBy: { createdAt: 'desc' },
  });

  return ok({ printers });
});

/**
 * POST /api/settings/printer
 * Creates or updates a printer configuration.
 */
export const POST = withApiHandler(async (request, { user }) => {
  if (!user.tenantId) badRequest('No tenant found');
  if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
    forbidden('Insufficient permissions');
  }

  const body = await validateBody(request, SavePrinterSchema);
  const { id, name, type, ipAddress, port, isDefault } = body;

  if (id) {
    // Update existing
    const printer = await prisma.printerConfig.update({
      where: { id },
      data: {
        name: name || undefined,
        type: type || undefined,
        ipAddress: ipAddress ?? undefined,
        port: port ?? undefined,
        isDefault: isDefault ?? undefined,
      },
    });
    return ok({ printer });
  }

  // Create new
  // If making this default, unset other defaults
  if (isDefault) {
    await prisma.printerConfig.updateMany({
      where: { tenantId: user.tenantId!, isDefault: true },
      data: { isDefault: false },
    });
  }

  const printer = await prisma.printerConfig.create({
    data: {
      tenantId: user.tenantId!,
      name: name || 'ZPL Printer',
      type: type || 'zpl',
      ipAddress: ipAddress || null,
      port: port || 9100,
      isDefault: isDefault ?? true,
    },
  });

  return ok({ printer });
});

/**
 * DELETE /api/settings/printer
 * Deletes a printer configuration.
 */
export const DELETE = withApiHandler(async (request, { user }) => {
  if (!user.tenantId) badRequest('No tenant found');
  if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
    forbidden('Insufficient permissions');
  }

  const { id } = validateQuery(request, DeletePrinterQuerySchema);

  await prisma.printerConfig.delete({
    where: { id },
  });

  return ok({ success: true });
});
