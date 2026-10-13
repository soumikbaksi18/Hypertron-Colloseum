const KEY = 'hypertron.note_book';

export type BookNote = {
  commitment: string;
  k: string;
  v: string;
  leafIndex: number;
  blob?: string | null;
  status?: 'pending' | 'spendable';
};

function read(): BookNote[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BookNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(notes: BookNote[]): void {
  localStorage.setItem(KEY, JSON.stringify(notes));
}

export function loadNotes(): BookNote[] {
  return read();
}

export function upsertNote(note: BookNote): void {
  const next = read().filter((row) => row.commitment !== note.commitment);
  next.push(note);
  write(next);
}

export function markNoteSpent(commitment: string): void {
  write(read().filter((row) => row.commitment !== commitment));
}

export function unspentNotes(): BookNote[] {
  return read().filter(
    (row) =>
      row.k &&
      BigInt(row.v) > 0n &&
      row.status !== 'pending',
  );
}

export function privateBalance(): bigint {
  return unspentNotes().reduce((sum, note) => sum + BigInt(note.v), 0n);
}

export function pickNotesForAmount(amount: bigint): BookNote[] | null {
  if (amount <= 0n) return null;
  const notes = [...unspentNotes()].sort((a, b) =>
    BigInt(a.v) > BigInt(b.v) ? 1 : -1,
  );
  const one = notes.find((note) => BigInt(note.v) >= amount);
  if (one) return [one];
  for (let i = 0; i < notes.length; i += 1) {
    for (let j = i + 1; j < notes.length; j += 1) {
      if (BigInt(notes[i].v) + BigInt(notes[j].v) >= amount) {
        return [notes[i], notes[j]];
      }
    }
  }
  return null;
}
