/**
 * BAR-251 + BAR-29: Label Generation API
 *
 * POST /api/labels — Generate a label from a template + data
 *
 * Body: { template: 'package' | 'rts' | 'contact' | 'signature', data: {...} }
 * Returns: { html: string, dimensions: { width, height } }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  renderPackageLabel,
  renderRTSLabel,
  renderContactLabel,
  renderSignatureTag,
  getLabelDimensions,
} from '@/lib/labels';
import type {
  LabelTemplate,
  PackageLabelData,
  RTSLabelData,
  ContactLabelData,
  SignatureTagData,
} from '@/lib/labels';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, data } = body as { template: LabelTemplate; data: unknown };

    if (!template || !data) {
      return NextResponse.json(
        { error: 'template and data are required' },
        { status: 400 }
      );
    }

    let html: string;

    switch (template) {
      case 'package':
        html = renderPackageLabel(data as PackageLabelData);
        break;
      case 'rts':
        html = renderRTSLabel(data as RTSLabelData);
        break;
      case 'contact':
        html = renderContactLabel(data as ContactLabelData);
        break;
      case 'signature':
        html = renderSignatureTag(data as SignatureTagData);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown template: ${template}. Valid: package, rts, contact, signature` },
          { status: 400 }
        );
    }

    const dimensions = getLabelDimensions(template);

    return NextResponse.json({ html, dimensions, template });
  } catch (error) {
    console.error('[labels] POST error:', error);
    return NextResponse.json({ error: 'Failed to generate label' }, { status: 500 });
  }
}
