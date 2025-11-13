"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSort = parseSort;
function parseSort(sort) {
    if (!sort)
        return;
    const [col, dir] = sort.split(':');
    return { column: col, ascending: (dir !== null && dir !== void 0 ? dir : 'asc').toLowerCase() !== 'desc' };
}
