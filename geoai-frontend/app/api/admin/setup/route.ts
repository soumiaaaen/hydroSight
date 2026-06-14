import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { USER_ROLE_ADMIN } from '@/lib/roles';

const ADMIN_EMAIL = 'admin@hydrosight.com';

function isSetupAllowed(req: NextRequest): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const setupSecret = process.env.ADMIN_SETUP_SECRET;
  if (!setupSecret) {
    return false;
  }

  return req.headers.get('x-admin-setup-secret') === setupSecret;
}

async function ensureAdminProfile(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: userId,
        role: USER_ROLE_ADMIN,
        contract_type: 'b2b',
        plan: 'premium',
      },
      { onConflict: 'id' },
    )
    .select('role')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.role !== USER_ROLE_ADMIN) {
    throw new Error('Failed to assign admin role');
  }
}

export async function POST(req: NextRequest) {
  if (!isSetupAllowed(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_SERVICE_ROLE_KEY in environment variables' },
      { status: 500 },
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const {
      data: { users },
      error: listError,
    } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const existingAdmin = users.find((u) => u.email === ADMIN_EMAIL);

    if (existingAdmin) {
      await ensureAdminProfile(supabaseAdmin, existingAdmin.id);
      return NextResponse.json({
        message: 'Admin already exists; role verified',
        email: ADMIN_EMAIL,
      });
    }

    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

    const { data: adminUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: tempPassword,
        email_confirm: true,
      });

    if (createError || !adminUser.user) {
      return NextResponse.json(
        { error: createError?.message || 'Failed to create user' },
        { status: 500 },
      );
    }

    await ensureAdminProfile(supabaseAdmin, adminUser.user.id);

    return NextResponse.json({
      message: 'Admin created successfully',
      email: ADMIN_EMAIL,
      password: tempPassword,
      note: 'Development only. Do not use this endpoint in production.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
