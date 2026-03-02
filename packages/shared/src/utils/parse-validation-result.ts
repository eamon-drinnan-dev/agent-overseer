import type { ValidationResult } from '../types/ticket.js';

/**
 * Parse a validation artifact's content into a typed ValidationResult.
 * Handles both valid JSON and malformed output with a string-search fallback.
 */
export function parseValidationResult(content: string): ValidationResult | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed && (parsed.result === 'PASS' || parsed.result === 'FAIL')) {
      return parsed as ValidationResult;
    }
    return null;
  } catch {
    // Fallback: detect result from raw text
    if (content.includes('"result":"PASS"') || content.includes('"result": "PASS"')) {
      return { result: 'PASS', criteria: [], summary: 'Parsed from raw text' };
    }
    if (content.includes('"result":"FAIL"') || content.includes('"result": "FAIL"')) {
      return { result: 'FAIL', criteria: [], summary: 'Parsed from raw text', feedback: 'See raw validation output' };
    }
    return null;
  }
}
