export type Phase = 'ready' | 'typing' | 'finished';
export class TypingSession {
  target: string;
  value = '';
  phase: Phase = 'ready';
  startedAt: number | null = null;
  finishedAt: number | null = null;
  allowErrors: boolean;
  constructor(target: string, allowErrors = false) {
    this.allowErrors = allowErrors;
    if (!target) throw new Error('Article must not be empty');
    this.target = target.normalize('NFC');
  }
  start(now: number): void {
    if (this.phase === 'ready') { this.startedAt = now; this.phase = 'typing'; }
  }
  input(value: string, now: number, finalize = true): void {
    if (this.phase === 'finished') return;
    const next = Array.from(value.normalize('NFC')).slice(0, Array.from(this.target).length).join('');
    if (this.startedAt === null && next.length > 0) {
      this.startedAt = now;
      this.phase = 'typing';
    }
    this.value = next;
    if (finalize && (this.value === this.target || (this.allowErrors && this.cursor === Array.from(this.target).length))) { this.finishedAt = now; this.phase = 'finished'; }
  }
  seconds(now: number): number {
    return this.startedAt === null ? 0 : Math.max(0, ((this.finishedAt ?? now) - this.startedAt) / 1000);
  }
  stats(now: number): { characters: number; correct: number; accuracy: number; cpm: number | null; words: number; wpm: number | null } {
    const characters = this.cursor;
    const correct = this.states.filter(state => state === 'correct').length;
    const seconds = this.seconds(now);
    // Count passage words covered by input, not misspelled text with lost spaces.
    const coveredText = Array.from(this.target).slice(0, characters).join('');
    const words = (coveredText.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? []).length;
    return { characters, correct, accuracy: characters ? correct / characters * 100 : 0, cpm: seconds > 0 ? correct * 60 / seconds : (correct ? null : 0), words, wpm: seconds > 0 ? words * 60 / seconds : (words ? null : 0) };
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
