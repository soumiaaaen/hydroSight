import { getTranslations } from 'next-intl/server';
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from '@/i18n/routing';
import { isAdminRole } from '@/lib/roles';
import Link from 'next/link';

type AdminPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  const t = await getTranslations('Admin');

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: '/login', locale });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single();

  if (!isAdminRole(profile?.role)) redirect({ href: '/dashboard', locale });

  const cards = [
    {
      title: t('users'),
      description: t('users_desc'),
      href: `/${locale}/admin/users`,
      label: t('users_label'),
    },
    {
      title: t('contracts'),
      description: t('contracts_desc'),
      href: `/${locale}/admin/contracts`,
      label: t('contracts_label'),
    },
    {
      title: t('analytics'),
      description: t('analytics_desc'),
      href: `/${locale}/admin/analytics`,
      label: t('analytics_label'),
    },
  ];

  return (
    <main className="min-h-screen bg-[#04080f] text-white p-8">
      <h1 className="text-3xl font-bold mb-6 text-sky-400">{t('title')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.href} className="p-6 rounded-xl border border-white/10 bg-white/5">
            <h2 className="text-xl font-semibold mb-2">{card.title}</h2>
            <p className="text-white/50 text-sm">{card.description}</p>
            <Link
              href={card.href}
              className="mt-4 inline-block px-4 py-2 bg-sky-500 rounded text-sm font-medium hover:bg-sky-400 transition"
            >
              {card.label}
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}