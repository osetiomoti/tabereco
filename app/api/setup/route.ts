import { createClient } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  // 開発環境のみ許可
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createClient();
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '004_groups.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('--- AUTO MIGRATION TRIGGERED ---');

  // Supabase で exec_sql があれば実行
  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('Migration Error:', error);
    return NextResponse.json({ 
        success: false, 
        message: '自動マイグレーションに失敗しました。RPC (exec_sql) が未定義です。',
        error: error.message,
        sql_to_run: sql // 後で手動で使うためのバックアップ
    });
  }

  return NextResponse.json({ success: true, message: 'マイグレーションが完了しました！' });
}
