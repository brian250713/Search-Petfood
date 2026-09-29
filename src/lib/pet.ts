import type { PetKind } from '../types/petfood.js';

/**
 * 適用寵物歸一：自由填寫文字 → 犬 / 貓 子集。
 * 含犬/狗字樣 → 犬；含貓/猫字樣 → 貓；皆無 → 其他。原始文字一律保留。
 */
export function normalizePets(usage: string | null | undefined): PetKind[] {
  const text = (usage ?? '').trim();
  if (!text) return ['其他'];
  const pets: PetKind[] = [];
  if (/[犬狗]/.test(text)) pets.push('犬');
  if (/[貓猫]/.test(text)) pets.push('貓');
  if (pets.length === 0) pets.push('其他');
  return pets;
}

/** 寵物篩選標籤 */
export function petLabel(pets: PetKind[]): string {
  if (pets.includes('犬') && pets.includes('貓')) return '犬貓';
  return pets.join('、');
}
