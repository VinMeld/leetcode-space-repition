/**
 * AnkiConnect API client
 * Communicates with local Anki instance via AnkiConnect addon
 */

const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';

interface AnkiResponse<T> {
    result: T;
    error: string | null;
}

interface AnkiNote {
    noteId: number;
    fields: {
        Title?: { value: string };
        Slug?: { value: string };
        URL?: { value: string };
        Difficulty?: { value: string };
        Status?: { value: string };
        Tags?: { value: string };
        FrontNote?: { value: string };
        Notes?: { value: string };
    };
    tags: string[];
}

export interface AnkiCard {
    noteId: number;
    title: string;
    slug: string;
    url: string;
    difficulty: 'easy' | 'medium' | 'hard';
    tags: string[];
    notes: string;
}

async function ankiRequest<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(ANKI_CONNECT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action,
            version: 6,
            params,
        }),
    });

    const data: AnkiResponse<T> = await response.json();

    if (data.error) {
        throw new Error(data.error);
    }

    return data.result;
}

/**
 * Check if AnkiConnect is available
 */
export async function checkAnkiConnection(): Promise<boolean> {
    try {
        await ankiRequest('version');
        return true;
    } catch {
        return false;
    }
}

/**
 * Get list of decks
 */
export async function getDecks(): Promise<string[]> {
    return ankiRequest<string[]>('deckNames');
}

/**
 * Get note IDs from a deck
 */
export async function getNotesFromDeck(deckName: string): Promise<number[]> {
    return ankiRequest<number[]>('findNotes', {
        query: `deck:"${deckName}"`,
    });
}

/**
 * Get note info by IDs
 */
export async function getNotesInfo(noteIds: number[]): Promise<AnkiNote[]> {
    return ankiRequest<AnkiNote[]>('notesInfo', {
        notes: noteIds,
    });
}

/**
 * Convert Anki notes to our card format
 */
function parseDifficulty(value: string | undefined): 'easy' | 'medium' | 'hard' {
    const lower = (value || '').toLowerCase();
    if (lower.includes('easy')) return 'easy';
    if (lower.includes('hard')) return 'hard';
    return 'medium';
}

export function convertAnkiNotes(notes: AnkiNote[]): AnkiCard[] {
    return notes.map(note => {
        const fields = note.fields;
        const title = fields.Title?.value || fields.Slug?.value || `Note ${note.noteId}`;
        const slug = fields.Slug?.value || '';
        const url = fields.URL?.value || (slug ? `https://leetcode.com/problems/${slug}/` : '');

        return {
            noteId: note.noteId,
            title: title.replace(/<[^>]*>/g, ''), // Strip HTML tags
            slug,
            url,
            difficulty: parseDifficulty(fields.Difficulty?.value),
            tags: note.tags,
            notes: [fields.FrontNote?.value, fields.Notes?.value]
                .filter(Boolean)
                .join('\n')
                .replace(/<[^>]*>/g, ''), // Strip HTML
        };
    });
}

/**
 * Import all cards from a LeetCode deck
 */
export async function importFromAnki(deckName: string = 'LeetCode'): Promise<AnkiCard[]> {
    const noteIds = await getNotesFromDeck(deckName);

    if (noteIds.length === 0) {
        return [];
    }

    const notes = await getNotesInfo(noteIds);
    return convertAnkiNotes(notes);
}
