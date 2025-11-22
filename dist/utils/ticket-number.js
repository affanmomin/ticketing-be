"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildClientTicketPrefix = buildClientTicketPrefix;
exports.formatClientTicketNumber = formatClientTicketNumber;
const FALLBACK_PREFIX = 'XXX';
const PREFIX_LENGTH = 3;
const NUMBER_PAD_LENGTH = 4;
/**
 * Builds a deterministic 3-character prefix from the client name.
 * Non-alphanumeric characters are stripped and the result is uppercased.
 */
function buildClientTicketPrefix(clientName) {
    const normalized = clientName.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const base = normalized || FALLBACK_PREFIX;
    return (base + FALLBACK_PREFIX).slice(0, PREFIX_LENGTH);
}
/**
 * Formats the final ticket number string (e.g. AMA0001).
 */
function formatClientTicketNumber(clientName, sequence) {
    const prefix = buildClientTicketPrefix(clientName);
    const paddedSequence = sequence.toString().padStart(NUMBER_PAD_LENGTH, '0');
    return `${prefix}${paddedSequence}`;
}
