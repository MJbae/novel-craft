import { spawn } from 'child_process';
import type { CodexOptions, CodexResult } from '@/types';

const CODEX_PATH = process.env.CODEX_PATH || 'codex';

const ANSI_REGEX = /\x1b\[[0-9;]*m/g;
const DEBUG_LINE_REGEX = /^(debug|warn|info):.*$/gm;

export type CodexErrorCode =
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'EMPTY_RESPONSE'
  | 'PARSE_ERROR'
  | 'SPAWN_ERROR'
  | 'EXIT_ERROR';

export class CodexError extends Error {
  constructor(
    message: string,
    public readonly code: CodexErrorCode,
    public readonly exitCode?: number,
  ) {
    super(message);
    this.name = 'CodexError';
  }
}

function normalizeOutput(raw: string): string {
  return raw.replace(ANSI_REGEX, '').replace(DEBUG_LINE_REGEX, '').trim();
}

export function codexExec(
  prompt: string,
  options: CodexOptions = {},
): Promise<CodexResult> {
  const {
    model = 'gpt-5.2',
    timeout = 180_000,
    json = false,
  } = options;

  return new Promise((resolve, reject) => {
    const args = ['exec', '-m', model, '--stdin'];
    if (json) args.push('--json');

    const child = spawn(CODEX_PATH, args, {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const start = Date.now();

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new CodexError(`Codex exec timed out after ${timeout}ms`, 'TIMEOUT'));
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 && code !== null) {
        const stderrMsg = stderr.trim();
        const isRateLimit = stderrMsg.includes('429') || stderrMsg.toLowerCase().includes('rate');
        if (isRateLimit) {
          reject(new CodexError(`Rate limited: ${stderrMsg}`, 'RATE_LIMIT', code));
        } else {
          reject(new CodexError(`Codex exec failed with code ${code}: ${stderrMsg}`, 'EXIT_ERROR', code));
        }
        return;
      }
      resolve({
        content: normalizeOutput(stdout),
        exitCode: code ?? 0,
        duration: Date.now() - start,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new CodexError(`Codex exec spawn failed: ${err.message}`, 'SPAWN_ERROR'));
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

export async function codexExecWithRetry(
  prompt: string,
  options: CodexOptions = {},
  maxRetries = 2,
): Promise<CodexResult> {
  let lastError: CodexError | null = null;
  let currentTimeout = options.timeout ?? 180_000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await codexExec(prompt, { ...options, timeout: currentTimeout });

      if (!result.content) {
        throw new CodexError('Empty response from Codex', 'EMPTY_RESPONSE');
      }

      return result;
    } catch (err) {
      lastError = err instanceof CodexError
        ? err
        : new CodexError((err as Error).message, 'EXIT_ERROR');

      if (lastError.code === 'SPAWN_ERROR') {
        throw lastError;
      }

      if (attempt < maxRetries) {
        let delay: number;
        switch (lastError.code) {
          case 'RATE_LIMIT':
            delay = 60_000;
            break;
          case 'TIMEOUT':
            delay = 10_000;
            currentTimeout = Math.round(currentTimeout * 1.5);
            break;
          case 'EMPTY_RESPONSE':
            delay = 0;
            break;
          default:
            delay = 5_000 * (attempt + 1);
            break;
        }
        if (delay > 0) {
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
  }

  throw lastError!;
}

export function parseJsonResponse<T>(raw: string): T {
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/);
  const toParse = jsonMatch ? jsonMatch[1].trim() : raw.trim();

  const startIdx = toParse.indexOf('{');
  const arrayStartIdx = toParse.indexOf('[');

  let cleanJson: string;
  if (arrayStartIdx !== -1 && (startIdx === -1 || arrayStartIdx < startIdx)) {
    cleanJson = toParse.slice(arrayStartIdx, toParse.lastIndexOf(']') + 1);
  } else if (startIdx !== -1) {
    cleanJson = toParse.slice(startIdx, toParse.lastIndexOf('}') + 1);
  } else {
    cleanJson = toParse;
  }

  return JSON.parse(cleanJson) as T;
}
