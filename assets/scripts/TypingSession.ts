export type Phase = 'ready' | 'typing' | 'finished';
export class TypingSession {
  target: string;
  value = '';
  phase: Phase = 'ready';
  startedAt: number | null = null;
  finishedAt: number | null = null;
  constructor(target: string) {
    if (!target) throw new Error('Article must not be empty');
    this.target = target.normalize('NFC');
  }
  start(now: number): void {
    if (this.phase === 'ready') { this.startedAt = now; this.phase = 'typing'; }
  }
  input(value: string, now: number): void {
    if (this.phase === 'finished') return;
    const next = Array.from(value.normalize('NFC')).slice(0, Array.from(this.target).length).join('');
    if (next === this.value) return;
    if (this.startedAt === null && next.length > 0) {
      this.startedAt = now;
      this.phase = 'typing';
    }
    this.value = next;
    if (this.value === this.target) { this.finishedAt = now; this.phase = 'finished'; }
  }
  seconds(now: number): number {
    return this.startedAt === null ? 0 : Math.max(0, ((this.finishedAt ?? now) - this.startedAt) / 1000);
  }
  get cursor(): number { return Array.from(this.value).length; }
  get states(): ('pending' | 'correct' | 'wrong')[] {
    const typed = Array.from(this.value);
    return Array.from(this.target).map((c, i) => i >= typed.length ? 'pending' : c === typed[i] ? 'correct' : 'wrong');
  }
}
export interface Article { id: string; language: 'zh' | 'en'; text: string; }
export function chooseArticle(articles: Article[], previous?: string, random = Math.random): Article {
  if (!articles.length) throw new Error('No articles');
  const pool = articles.filter(a => a.id !== previous);
  const candidates = pool.length ? pool : articles;
  return candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)))];
}
