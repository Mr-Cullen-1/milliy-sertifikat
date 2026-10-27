import 'server-only';
import { createAdminClient } from '../supabase/admin';
import type { Json } from '../supabase/database.types';

/** Admin amallarini audit_log ga yozadi. Yozilmasa asosiy amal buzilmaydi (faqat xato logga tushadi). */
export async function audit(actor: string | null, action: string, entity?: string, entityId?: string, details: Json = {}): Promise<void> {
  try {
    const { error } = await createAdminClient().rpc('log_audit', {
      p_actor: actor as string,
      p_action: action,
      p_entity: entity,
      p_entity_id: entityId,
      p_details: details,
    });
    if (error) throw error;
  } catch (e) {
    console.error('audit xatosi:', e instanceof Error ? e.message : e);
  }
}
