import { fmtDateTime, PageTitle, Table } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/auth/admin';
import { createClient } from '@/lib/supabase/server';

export default async function AdminAuditPage() {
  await requireAdmin({ adminOnly: true });
  const supabase = await createClient();
  const { data, error } = await supabase.from('audit_log').select('id, actor, action, entity, entity_id, details, created_at').order('created_at', { ascending: false }).limit(200);
  if (error) throw new Error(`audit_log: ${error.message}`);

  return (
    <>
      <PageTitle title="Audit jurnali" />
      <p className="text-[15px] font-semibold text-muted">Admin amallari (kirish, nashr, arxiv, import). Oxirgi 200 ta yozuv.</p>
      <Table head={['Vaqt', 'Amal', "Obyekt", 'Tafsilot', 'Kim']} empty={(data ?? []).length === 0 ? "Yozuv yo'q" : undefined}>
        {(data ?? []).map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
            <td className="font-extrabold">{r.action}</td>
            <td className="max-w-[220px] truncate">{[r.entity, r.entity_id].filter(Boolean).join(' ')}</td>
            <td className="max-w-[320px] truncate font-mono text-[12px]">{JSON.stringify(r.details)}</td>
            <td className="font-mono text-[12px]">{r.actor?.slice(0, 8) ?? '—'}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
