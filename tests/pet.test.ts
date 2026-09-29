import { describe, it, expect } from 'vitest';
import { normalizePets, petLabel } from '../src/lib/pet.js';

describe('normalizePets', () => {
  it('maps 犬貓 variants', () => {
    expect(normalizePets('犬貓')).toEqual(['犬', '貓']);
    expect(normalizePets('犬、貓')).toEqual(['犬', '貓']);
    expect(normalizePets('狗')).toEqual(['犬']);
    expect(normalizePets('成貓')).toEqual(['貓']);
    expect(normalizePets('全齡犬')).toEqual(['犬']);
    expect(normalizePets('貓咪')).toEqual(['貓']);
  });

  it('keeps 其他 for non-dog/cat or blank', () => {
    expect(normalizePets('兔')).toEqual(['其他']);
    expect(normalizePets('')).toEqual(['其他']);
    expect(normalizePets(null)).toEqual(['其他']);
  });
});

describe('petLabel', () => {
  it('labels 犬貓 set', () => {
    expect(petLabel(['犬', '貓'])).toBe('犬貓');
    expect(petLabel(['犬'])).toBe('犬');
  });
});
