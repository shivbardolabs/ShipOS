import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomBytes, scryptSync } from "crypto";

/* ── helpers ────────────────────────────────────────── */

/** Turn a business name into a URL-safe slug, appending random suffix for uniqueness */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

/** Map planId → trial days */
function trialDays(planId: string | null): number {
  if (planId === "starter") return 7;
  if (planId === "pro" || planId === "enterprise") return 30;
  return 7;
}

/** Map planId → subscriptionTier */
function mapTier(planId: string | null): string {
  if (planId === "starter") return "starter";
  if (planId === "pro") return "pro";
  if (planId === "enterprise") return "enterprise";
  return "starter";
}

/* ── validation ─────────────────────────────────────── */

interface SignupBody {
  businessName: string;
  dba?: string;
  address: string;
  suite?: string;
  city: string;
  state: string;
  zip: string;
  storePhone: string;
  storeEmail: string;
  website?: string;
  firstName: string;
  lastName: string;
  ownerEmail: string;
  ownerPhone: string;
  title: string;
  password: string;
  affiliationType: string;
  franchiseType?: string;
  storeCount: number;
  planId: string;
  promoCode?: string;
}

function validate(body: SignupBody): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!body.businessName?.trim()) errors.businessName = "Business name is required";
  if (!body.address?.trim()) errors.address = "Street address is required";
  if (!body.city?.trim()) errors.city = "City is required";
  if (!body.state?.trim()) errors.state = "State is required";
  if (!body.zip?.trim()) errors.zip = "ZIP code is required";
  else if (!/^\d{5}(-\d{4})?$/.test(body.zip)) errors.zip = "Invalid ZIP code";

  if (!body.storePhone?.trim()) errors.storePhone = "Store phone is required";
  if (!body.storeEmail?.trim()) errors.storeEmail = "Store email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.storeEmail))
    errors.storeEmail = "Invalid email address";

  if (!body.firstName?.trim()) errors.firstName = "First name is required";
  if (!body.lastName?.trim()) errors.lastName = "Last name is required";
  if (!body.ownerEmail?.trim()) errors.ownerEmail = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.ownerEmail))
    errors.ownerEmail = "Invalid email address";

  if (!body.ownerPhone?.trim()) errors.ownerPhone = "Mobile phone is required";
  if (!body.title?.trim()) errors.title = "Title is required";

  if (!body.password) errors.password = "Password is required";
  else if (body.password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (!/[A-Z]/.test(body.password)) errors.password = "Password must include an uppercase letter";
  else if (!/\d/.test(body.password)) errors.password = "Password must include a number";

  if (!body.affiliationType) errors.affiliationType = "Business type is required";
  if (body.affiliationType === "franchise" && !body.franchiseType)
    errors.franchiseType = "Franchise type is required";

  if (!body.planId) errors.planId = "Please select a plan";

  return errors;
}

/* ── POST /api/signup ───────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body: SignupBody = await req.json();

    // 1. Validate fields
    const errors = validate(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ ok: false, errors }, { status: 400 });
    }

    // 2. Duplicate detection
    const [existingTenant, existingUser] = await Promise.all([
      prisma.tenant.findFirst({
        where: {
          OR: [
            { email: body.storeEmail.toLowerCase() },
            { name: { equals: body.businessName, mode: "insensitive" } },
          ],
        },
      }),
      prisma.user.findUnique({ where: { email: body.ownerEmail.toLowerCase() } }),
    ]);

    if (existingTenant) {
      const field = existingTenant.email?.toLowerCase() === body.storeEmail.toLowerCase()
        ? "storeEmail"
        : "businessName";
      return NextResponse.json(
        {
          ok: false,
          errors: {
            [field]:
              field === "storeEmail"
                ? "A store with this email already exists"
                : "A store with this name already exists",
          },
        },
        { status: 409 },
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { ok: false, errors: { ownerEmail: "An account with this email already exists" } },
        { status: 409 },
      );
    }

    // 3. Hash password (scrypt — no external dependency)
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(body.password, salt, 64).toString("hex");
    const hashedPassword = `${salt}:${hash}`;

    // 4. Build full address
    const fullAddress = body.suite
      ? `${body.address}, ${body.suite}`
      : body.address;

    // 5. Create Tenant + Owner in a transaction
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + trialDays(body.planId));

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: body.businessName,
          dba: body.dba || null,
          slug: generateSlug(body.businessName),
          address: fullAddress,
          city: body.city,
          state: body.state,
          zipCode: body.zip,
          phone: body.storePhone,
          email: body.storeEmail.toLowerCase(),
          website: body.website || null,
          status: "pending_approval",
          statusChangedAt: new Date(),
          subscriptionTier: mapTier(body.planId),
          trialEndsAt: trialEnd,
          affiliationType: body.affiliationType,
          franchiseType: body.franchiseType || null,
          storeCount: body.storeCount || 1,
          planId: body.planId,
        },
      });

      const user = await tx.user.create({
        data: {
          name: `${body.firstName} ${body.lastName}`,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.ownerEmail.toLowerCase(),
          phone: body.ownerPhone,
          password: hashedPassword,
          role: "admin",
          title: body.title,
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    // 6. TODO: send verification email (Auth0 / SendGrid)
    // For now, return success — email integration added separately

    return NextResponse.json(
      {
        ok: true,
        tenantId: result.tenant.id,
        userId: result.user.id,
        message: "Account created successfully. Please check your email to verify.",
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[signup] Error:", err);
    return NextResponse.json(
      { ok: false, errors: { _form: "Something went wrong. Please try again." } },
      { status: 500 },
    );
  }
}
