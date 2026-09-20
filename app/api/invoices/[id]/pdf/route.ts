import { NextRequest, NextResponse } from 'next/server';

import { InvoiceService } from '../../../../../lib/services/invoice.service';
import { PaymentService } from '../../../../../lib/services/payment.service';
import { UserService } from '../../../../../lib/services/user.service';
import { supabase } from '../../../../../lib/db/supabase';
import { redis } from '../../../../../lib/db/redis';
import { getSession } from '../../../../../lib/utils/auth';
import { handleError } from '../../../../../lib/utils/error-handler';
import { AppError, UnauthorizedError } from '../../../../../lib/utils/errors';

const paymentService = new PaymentService(supabase, redis);
const invoiceService = new InvoiceService(supabase, redis, paymentService);
const userService = new UserService(supabase, redis);

async function resolveOrCreateUserFromSession(req: NextRequest) {
  const session = await getSession(req);

  const auth0Id: string | undefined = session?.user?.sub;
  const email: string | undefined = session?.user?.email;

  if (!auth0Id || !email) {
    throw new UnauthorizedError('Missing Auth0 session');
  }

  const user = await userService.createUser(auth0Id, email);
  if (!user) {
    throw new AppError(500, 'Failed to resolve user from session');
  }

  return user;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await resolveOrCreateUserFromSession(req);

    const pdfBuffer = await invoiceService.generatePDF(user.id, params.id);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${params.id}.pdf"`,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}


