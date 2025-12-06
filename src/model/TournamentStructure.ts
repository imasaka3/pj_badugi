import blindsTsv from '../assets/blinds.tsv?raw';

export interface BlindLevel {
    level: number;
    smallBlind: number;
    bigBlind: number;
    durationSec: number;
}

export class TournamentStructure {
    private levels: BlindLevel[] = [];
    private startTime: number = 0;

    constructor() {
        this.parseTsv(blindsTsv);
    }

    private parseTsv(tsv: string) {
        const lines = tsv.trim().split('\n');
        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split('\t');
            if (parts.length >= 4) {
                this.levels.push({
                    level: parseInt(parts[0]),
                    smallBlind: parseInt(parts[1]),
                    bigBlind: parseInt(parts[2]),
                    durationSec: parseInt(parts[3])
                });
            }
        }
    }

    start() {
        this.startTime = Date.now();
    }

    getCurrentLevel(): BlindLevel {
        if (this.startTime === 0 || this.levels.length === 0) {
            // Return default if not started or empty
            return this.levels.length > 0 ? this.levels[0] : { level: 1, smallBlind: 10, bigBlind: 20, durationSec: 300 };
        }

        const elapsedSec = (Date.now() - this.startTime) / 1000;
        let accumulatedTime = 0;

        for (let i = 0; i < this.levels.length; i++) {
            accumulatedTime += this.levels[i].durationSec;
            if (elapsedSec < accumulatedTime) {
                return this.levels[i];
            }
        }

        // If time exceeded all levels, return the last one
        return this.levels[this.levels.length - 1];
    }
    getTimeRemaining(): number {
        if (this.startTime === 0) return 0;

        const elapsedSec = (Date.now() - this.startTime) / 1000;
        let accumulatedTime = 0;

        for (let i = 0; i < this.levels.length; i++) {
            accumulatedTime += this.levels[i].durationSec;
            if (elapsedSec < accumulatedTime) {
                return Math.ceil(accumulatedTime - elapsedSec);
            }
        }
        return 0;
    }

    getNextLevel(): BlindLevel | null {
        const current = this.getCurrentLevel();
        const index = this.levels.indexOf(current);
        if (index >= 0 && index < this.levels.length - 1) {
            return this.levels[index + 1];
        }
        return null;
    }
}
