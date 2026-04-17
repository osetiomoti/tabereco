/**
 * 日付文字列 (YYYY-MM-DD) を日本語表示に変換
 */
export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * 今日の日付を YYYY-MM-DD 形式で返す
 */
export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * クラス名を結合するユーティリティ
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
