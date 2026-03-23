// ============================================================
// Memory Parser - Reads One Piece contextual memory (.md)
// ============================================================

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import type { MemoryEntry, MemoryResponse, ConfidenceLevel, ResultStatus } from '../../shared/types.js';

const MEMORY_FILE = path.join(homedir(), '.mugiwara', 'one_piece_memory.md');

function extractField(block: string, label: string): string {
  const regex = new RegExp(`\\*\\*${label}\\*\\*\\s*:\\s*(.+)`, 'i');
  const match = block.match(regex);
  return match?.[1]?.trim() ?? '';
}

function parseBlock(block: string): MemoryEntry | null {
  const dateMatch = block.match(/###\s*\[(.+?)\]/);
  if (!dateMatch) return null;

  const date = dateMatch[1]!.trim();
  const demande = extractField(block, 'Demande');
  const routeRaw = extractField(block, 'Route');
  const confianceRaw = extractField(block, 'Confiance').toLowerCase();
  const sujet = extractField(block, 'Sujet');
  const projet = extractField(block, 'Projet');
  const resultatRaw = extractField(block, 'Resultat');
  const contexte = extractField(block, 'Contexte pour la suite');

  if (!demande) return null;

  // Extract agent name from route: "brook (Technical Writer)" -> "brook"
  const routeAgent = routeRaw.split(/\s*[\(—\-]/)[0]?.trim() ?? routeRaw;

  // Parse result status and detail
  const resultatMatch = resultatRaw.match(/^(succes|echec|en-cours)\s*[—\-]?\s*(.*)/i);
  const resultat: ResultStatus = (resultatMatch?.[1]?.toLowerCase() as ResultStatus) ?? 'en-cours';
  const resultatDetail = resultatMatch?.[2]?.trim() ?? resultatRaw;

  const confiance: ConfidenceLevel =
    confianceRaw === 'haute' || confianceRaw === 'moyenne' || confianceRaw === 'basse'
      ? confianceRaw
      : 'moyenne';

  return {
    date,
    demande,
    route: routeRaw,
    routeAgent,
    confiance,
    sujet,
    projet,
    resultat,
    resultatDetail,
    contexte,
  };
}

export function parseMemoryFile(): MemoryResponse {
  if (!existsSync(MEMORY_FILE)) {
    return { entries: [], total: 0, fileExists: false };
  }

  const content = readFileSync(MEMORY_FILE, 'utf-8');
  const blocks = content.split(/^---$/m).filter((b) => b.trim().length > 0);

  const entries: MemoryEntry[] = [];
  for (const block of blocks) {
    const entry = parseBlock(block);
    if (entry) entries.push(entry);
  }

  // Newest first
  entries.reverse();

  return { entries, total: entries.length, fileExists: true };
}
