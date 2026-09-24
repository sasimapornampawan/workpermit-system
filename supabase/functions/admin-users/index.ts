// Supabase Edge Function "admin-users": create accounts and reset passwords for the Workpermit app.
// Uses the service-role key, which Supabase injects into Edge Functions and never reaches the browser.
// Only callers whose active profile role is "safety" are allowed.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ROLES = ['safety', 'contractor', 'area_owner', 'manager'];
const MIN_PASSWORD = 8;

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth?.user) return reply(401, { error: 'กรุณาเข้าสู่ระบบใหม่' });

  // Same rule as the database's can('manage_users'): the user's override, else their role's default.
  const { data: me } = await admin.from('profiles').select('role, active').eq('id', auth.user.id).maybeSingle();
  if (!me?.active) return reply(403, { error: 'บัญชีนี้ถูกปิดสิทธิ์' });
  const [{ data: override }, { data: roleDefault }] = await Promise.all([
    admin.from('user_permissions').select('allowed').eq('user_id', auth.user.id).eq('permission', 'manage_users').maybeSingle(),
    admin.from('role_permissions').select('allowed').eq('role', me.role).eq('permission', 'manage_users').maybeSingle(),
  ]);
  if (!(override?.allowed ?? roleDefault?.allowed ?? me.role === 'safety')) {
    return reply(403, { error: 'ไม่มีสิทธิ์จัดการผู้ใช้' });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'ข้อมูลไม่ถูกต้อง' });
  }

  if (body.action === 'create') {
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const fullName = String(body.full_name ?? '').trim();
    const role = String(body.role ?? '');
    const contractorId = role === 'contractor' ? String(body.contractor_id ?? '') : null;

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply(400, { error: 'ชื่อผู้ใช้หรืออีเมลไม่ถูกต้อง' });
    if (password.length < MIN_PASSWORD) return reply(400, { error: `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร` });
    if (!fullName) return reply(400, { error: 'กรุณาใส่ชื่อที่แสดง' });
    if (!ROLES.includes(role)) return reply(400, { error: 'บทบาทไม่ถูกต้อง' });
    if (role === 'contractor' && !contractorId) return reply(400, { error: 'บัญชีผู้รับเหมาต้องเลือกบริษัท' });

    const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (createErr || !created.user) {
      const exists = createErr?.message.toLowerCase().includes('already');
      return reply(400, { error: exists ? 'ชื่อผู้ใช้หรืออีเมลนี้มีบัญชีอยู่แล้ว' : `สร้างบัญชีไม่สำเร็จ: ${createErr?.message}` });
    }

    const { error: profileErr } = await admin
      .from('profiles')
      .insert({ id: created.user.id, full_name: fullName, role, contractor_id: contractorId, active: true });
    if (profileErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return reply(400, { error: `กำหนดบทบาทไม่สำเร็จ: ${profileErr.message}` });
    }
    return reply(200, { id: created.user.id });
  }

  if (body.action === 'update_email') {
    const userId = String(body.user_id ?? '');
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!userId) return reply(400, { error: 'ไม่พบบัญชีผู้ใช้' });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply(400, { error: 'ชื่อผู้ใช้หรืออีเมลไม่ถูกต้อง' });

    const { error } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true });
    if (error) {
      const taken = error.message.toLowerCase().includes('already');
      return reply(400, { error: taken ? 'ชื่อผู้ใช้หรืออีเมลนี้มีบัญชีอื่นใช้อยู่แล้ว' : `เปลี่ยนไม่สำเร็จ: ${error.message}` });
    }
    return reply(200, { ok: true });
  }

  if (body.action === 'delete_user') {
    const userId = String(body.user_id ?? '');
    if (!userId) return reply(400, { error: 'ไม่พบบัญชีผู้ใช้' });
    if (userId === auth.user.id) return reply(400, { error: 'ลบบัญชีของตัวเองไม่ได้' });

    // Deleting would orphan history, so refuse while anything still points at this account.
    const history: [string, string, string][] = [
      ['permits', 'created_by', 'คำขอ Permit'],
      ['permit_approvals', 'decided_by', 'การอนุมัติ Permit'],
      ['permit_events', 'acted_by', 'การเปลี่ยนสถานะงาน'],
      ['permit_attachments', 'uploaded_by', 'เอกสารแนบ'],
      ['badges', 'requested_by', 'คำขอบัตร'],
      ['badges', 'issued_by', 'การออกบัตร'],
      ['findings', 'reported_by', 'ข้อบกพร่องที่บันทึกไว้'],
      ['findings', 'resolved_by', 'การปิดข้อบกพร่อง'],
      ['alerts', 'created_by', 'แจ้งเตือน'],
      ['alerts', 'closed_by', 'การปิดแจ้งเตือน'],
      ['exam_attempts', 'started_by', 'การจัดสอบ'],
      ['user_permissions', 'set_by', 'การตั้งสิทธิ์ให้ผู้ใช้อื่น'],
    ];
    for (const [table, column, label] of history) {
      const { count } = await admin.from(table).select('*', { count: 'exact', head: true }).eq(column, userId);
      if (count) {
        return reply(400, { error: `ลบไม่ได้ เพราะมี${label} ${count} รายการที่บันทึกโดยบัญชีนี้ — ให้ตั้งบทบาทเป็น "ไม่มีสิทธิ์" แทน` });
      }
    }

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return reply(400, { error: `ลบบัญชีไม่สำเร็จ: ${error.message}` });
    return reply(200, { ok: true });
  }

  if (body.action === 'reset_password') {
    const userId = String(body.user_id ?? '');
    const password = String(body.password ?? '');
    if (!userId) return reply(400, { error: 'ไม่พบบัญชีผู้ใช้' });
    if (password.length < MIN_PASSWORD) return reply(400, { error: `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร` });

    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) return reply(400, { error: `ตั้งรหัสผ่านไม่สำเร็จ: ${error.message}` });
    return reply(200, { ok: true });
  }

  return reply(400, { error: 'ไม่รู้จักคำสั่งนี้' });
});
