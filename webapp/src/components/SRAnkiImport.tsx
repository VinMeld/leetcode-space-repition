import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
    checkAnkiConnection,
    getDecks,
    importFromAnki,
    type AnkiCard
} from '../lib/ankiApi';
import { Download, AlertCircle, Check, Loader2, RefreshCw } from 'lucide-react';
import './SRAnkiImport.css';

interface SRAnkiImportProps {
    onImport: (cards: Array<{
        title: string;
        leetcodeUrl: string;
        difficulty: 'easy' | 'medium' | 'hard';
        notes?: string;
    }>) => Promise<void>;
    onClose?: () => void;
}

export function SRAnkiImport({ onImport, onClose }: SRAnkiImportProps) {
    const [connected, setConnected] = useState<boolean | null>(null);
    const [decks, setDecks] = useState<string[]>([]);
    const [selectedDeck, setSelectedDeck] = useState('LeetCode');
    const [cards, setCards] = useState<AnkiCard[]>([]);
    const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importedCount, setImportedCount] = useState(0);

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        setLoading(true);
        setError(null);
        try {
            const isConnected = await checkAnkiConnection();
            setConnected(isConnected);
            if (isConnected) {
                const deckList = await getDecks();
                setDecks(deckList);
                if (deckList.includes('LeetCode')) {
                    setSelectedDeck('LeetCode');
                }
            }
        } catch {
            setConnected(false);
            setError('Failed to connect to AnkiConnect');
        } finally {
            setLoading(false);
        }
    };

    const loadCards = async () => {
        if (!selectedDeck) return;

        setLoading(true);
        setError(null);
        try {
            const ankiCards = await importFromAnki(selectedDeck);
            setCards(ankiCards);
            // Select all by default
            setSelectedCards(new Set(ankiCards.map(c => c.noteId)));
        } catch (err) {
            setError(`Failed to load cards: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleCard = (noteId: number) => {
        setSelectedCards(prev => {
            const next = new Set(prev);
            if (next.has(noteId)) {
                next.delete(noteId);
            } else {
                next.add(noteId);
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedCards.size === cards.length) {
            setSelectedCards(new Set());
        } else {
            setSelectedCards(new Set(cards.map(c => c.noteId)));
        }
    };

    const handleImport = async () => {
        const cardsToImport = cards
            .filter(c => selectedCards.has(c.noteId))
            .map(c => ({
                title: c.title,
                leetcodeUrl: c.url,
                difficulty: c.difficulty,
                notes: c.notes || undefined,
            }));

        if (cardsToImport.length === 0) return;

        setImporting(true);
        setError(null);
        try {
            await onImport(cardsToImport);
            setImportedCount(cardsToImport.length);
            setCards([]);
            setSelectedCards(new Set());
        } catch (err) {
            setError(`Failed to import: ${err}`);
        } finally {
            setImporting(false);
        }
    };

    if (connected === null || loading) {
        return (
            <div className="sr-anki-import">
                <div className="sr-anki-loading">
                    <Loader2 className="sr-anki-spinner" />
                    <span>Connecting to Anki...</span>
                </div>
            </div>
        );
    }

    if (!connected) {
        return (
            <div className="sr-anki-import">
                <div className="sr-anki-header">
                    <h2>Import from Anki</h2>
                    {onClose && <button className="sr-anki-close" onClick={onClose}>×</button>}
                </div>

                <div className="sr-anki-error-box">
                    <AlertCircle size={48} />
                    <h3>AnkiConnect not available</h3>
                    <p>Make sure:</p>
                    <ol>
                        <li>Anki is running</li>
                        <li>AnkiConnect addon is installed (code: 2055492159)</li>
                        <li>AnkiConnect is configured to accept connections</li>
                    </ol>
                    <Button onClick={checkConnection} leftIcon={<RefreshCw size={16} />}>
                        Retry Connection
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="sr-anki-import">
            <div className="sr-anki-header">
                <h2>Import from Anki</h2>
                {onClose && <button className="sr-anki-close" onClick={onClose}>×</button>}
            </div>

            {error && (
                <div className="sr-anki-error">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {importedCount > 0 && (
                <div className="sr-anki-success">
                    <Check size={16} />
                    Successfully imported {importedCount} problems!
                </div>
            )}

            <div className="sr-anki-deck-select">
                <label>Select Deck:</label>
                <select
                    value={selectedDeck}
                    onChange={(e) => setSelectedDeck(e.target.value)}
                >
                    {decks.map(deck => (
                        <option key={deck} value={deck}>{deck}</option>
                    ))}
                </select>
                <Button onClick={loadCards} disabled={loading}>
                    Load Cards
                </Button>
            </div>

            {cards.length > 0 && (
                <>
                    <div className="sr-anki-cards-header">
                        <label className="sr-anki-select-all">
                            <input
                                type="checkbox"
                                checked={selectedCards.size === cards.length}
                                onChange={toggleAll}
                            />
                            Select All ({selectedCards.size}/{cards.length})
                        </label>
                    </div>

                    <div className="sr-anki-cards-list">
                        {cards.map(card => (
                            <div
                                key={card.noteId}
                                className={`sr-anki-card ${selectedCards.has(card.noteId) ? 'selected' : ''}`}
                                onClick={() => toggleCard(card.noteId)}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedCards.has(card.noteId)}
                                    onChange={() => toggleCard(card.noteId)}
                                />
                                <div className="sr-anki-card-info">
                                    <span className="sr-anki-card-title">{card.title}</span>
                                    <Badge variant={card.difficulty}>{card.difficulty}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="sr-anki-actions">
                        <Button
                            variant="primary"
                            onClick={handleImport}
                            disabled={selectedCards.size === 0 || importing}
                            isLoading={importing}
                            leftIcon={<Download size={16} />}
                        >
                            Import {selectedCards.size} Problems
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
