// store.ts
// localStorage-backed persistence for class accommodation lists.
// Anonymous by design: the data model has no field that could hold a name, ID,
// or other student-identifying value, and writes are validated to reject
// PII-shaped free text (see looksLikePersonalData).
//
// Storage is injectable so this module stays testable in Node (which has no
// localStorage) and safe to import during static-export builds. In the browser,
// pass nothing, it resolves globalThis.localStorage lazily at call time.

import {
  ACCOMMODATION_STORAGE_KEY,
  ALL_ACCOMMODATION_IDS,
  MAX_GROUP_LABEL_LENGTH,
  activeAccommodationIds,
  type AccommodationGroup,
  type ClassAccommodationList,
  type NewGroupInput,
} from './types';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function resolveBrowserStorage(): KeyValueStorage {
  const ls =
    typeof globalThis !== 'undefined'
      ? (globalThis as Record<string, unknown>).localStorage
      : undefined;
  if (!ls || typeof (ls as KeyValueStorage).getItem !== 'function') {
    throw new Error(
      'Accommodation store requires a browser localStorage (or an injected KeyValueStorage).',
    );
  }
  return ls as KeyValueStorage;
}

function newId(): string {
  const c = typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Fallback for older environments, still unique enough for client-side ids.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── PII-shape detection ───────────────────────────────────────────────────────
// The model stores no personal data, but free-text labels could smuggle it in.
// These heuristics reject the obvious shapes; they are a guardrail, not a
// guarantee, the UI also carries helper text ("never enter student names").

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/;
const FULL_NAME_RE = /\b[A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20}\b/; // "John Smith"
const LONG_DIGITS_RE = /\b\d{5,}\b/; // student-ID-shaped digit runs

/** True when free text looks like it could identify a student. */
export function looksLikePersonalData(text: string): boolean {
  if (!text) return false;
  return (
    EMAIL_RE.test(text) ||
    PHONE_RE.test(text) ||
    FULL_NAME_RE.test(text) ||
    LONG_DIGITS_RE.test(text)
  );
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/** Validate a group create/update payload. Rejects PII-shaped labels. */
export function validateGroupInput(input: NewGroupInput): ValidationResult {
  const errors: string[] = [];
  const label = (input.label ?? '').trim();

  if (!label) {
    errors.push('Group label is required (e.g. "Group A").');
  } else {
    if (label.length > MAX_GROUP_LABEL_LENGTH) {
      errors.push(`Group label must be ${MAX_GROUP_LABEL_LENGTH} characters or fewer.`);
    }
    if (looksLikePersonalData(label)) {
      errors.push(
        'Group labels must stay anonymous, use "Group A", not a student name or ID.',
      );
    }
  }

  if (!Number.isInteger(input.studentCount) || input.studentCount < 0) {
    errors.push('Student count must be a whole number, 0 or more.');
  }

  const ids = activeAccommodationIds(input.flags ?? ({} as NewGroupInput['flags']));
  if (ids.length === 0) {
    errors.push('Pick at least one accommodation for the group.');
  }
  for (const id of ids) {
    if (!(ALL_ACCOMMODATION_IDS as readonly string[]).includes(id)) {
      errors.push(`Unknown accommodation: ${id}.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/** Validate a class label (free text, but PII-shaped content is rejected). */
export function validateClassLabel(classLabel: string): ValidationResult {
  const errors: string[] = [];
  const label = (classLabel ?? '').trim();
  if (!label) errors.push('Class label is required (e.g. "Algebra 2, Period 3").');
  if (looksLikePersonalData(label)) {
    errors.push('Class labels must stay anonymous, never enter student names.');
  }
  return { ok: errors.length === 0, errors };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export interface AccommodationStore {
  listLists(): ClassAccommodationList[];
  getList(id: string): ClassAccommodationList | null;
  createList(classLabel: string): ClassAccommodationList;
  updateClassLabel(id: string, classLabel: string): ClassAccommodationList;
  deleteList(id: string): void;
  addGroup(listId: string, input: NewGroupInput): AccommodationGroup;
  updateGroup(listId: string, groupId: string, patch: Partial<NewGroupInput>): AccommodationGroup;
  removeGroup(listId: string, groupId: string): void;
  /** Test/utility hook: wipe the namespace (never exposed in UI). */
  clearAll(): void;
}

export function createAccommodationStore(
  storage: KeyValueStorage | null = null,
): AccommodationStore {
  // Resolve lazily so merely importing this module is side-effect free
  // (important for the static-export build, which may import it server-side).
  const store = () => storage ?? resolveBrowserStorage();

  function readAll(): ClassAccommodationList[] {
    const raw = store().getItem(ACCOMMODATION_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Defensive shape check, never trust raw localStorage.
      return parsed.filter(
        (l): l is ClassAccommodationList =>
          !!l &&
          typeof (l as ClassAccommodationList).id === 'string' &&
          Array.isArray((l as ClassAccommodationList).groups),
      );
    } catch {
      return [];
    }
  }

  function writeAll(lists: ClassAccommodationList[]): void {
    store().setItem(ACCOMMODATION_STORAGE_KEY, JSON.stringify(lists));
  }

  function touch(list: ClassAccommodationList): ClassAccommodationList {
    return { ...list, updatedAt: new Date().toISOString() };
  }

  function requireList(lists: ClassAccommodationList[], id: string): ClassAccommodationList {
    const list = lists.find((l) => l.id === id);
    if (!list) throw new Error(`Accommodation list not found: ${id}`);
    return list;
  }

  return {
    listLists() {
      return readAll();
    },

    getList(id: string) {
      return readAll().find((l) => l.id === id) ?? null;
    },

    createList(classLabel: string) {
      const v = validateClassLabel(classLabel);
      if (!v.ok) throw new Error(v.errors.join(' '));
      const lists = readAll();
      const list: ClassAccommodationList = {
        id: newId(),
        classLabel: classLabel.trim(),
        groups: [],
        updatedAt: new Date().toISOString(),
      };
      writeAll([...lists, list]);
      return list;
    },

    updateClassLabel(id: string, classLabel: string) {
      const v = validateClassLabel(classLabel);
      if (!v.ok) throw new Error(v.errors.join(' '));
      const lists = readAll();
      const list = requireList(lists, id);
      const updated = touch({ ...list, classLabel: classLabel.trim() });
      writeAll(lists.map((l) => (l.id === id ? updated : l)));
      return updated;
    },

    deleteList(id: string) {
      writeAll(readAll().filter((l) => l.id !== id));
    },

    addGroup(listId: string, input: NewGroupInput) {
      const v = validateGroupInput(input);
      if (!v.ok) throw new Error(v.errors.join(' '));
      const lists = readAll();
      const list = requireList(lists, listId);
      const group: AccommodationGroup = {
        id: newId(),
        label: input.label.trim(),
        studentCount: input.studentCount,
        flags: { ...input.flags },
      };
      const updated = touch({ ...list, groups: [...list.groups, group] });
      writeAll(lists.map((l) => (l.id === listId ? updated : l)));
      return group;
    },

    updateGroup(listId: string, groupId: string, patch: Partial<NewGroupInput>) {
      const lists = readAll();
      const list = requireList(lists, listId);
      const group = list.groups.find((g) => g.id === groupId);
      if (!group) throw new Error(`Accommodation group not found: ${groupId}`);
      const merged: NewGroupInput = {
        label: patch.label ?? group.label,
        studentCount: patch.studentCount ?? group.studentCount,
        flags: patch.flags ? { ...patch.flags } : { ...group.flags },
      };
      const v = validateGroupInput(merged);
      if (!v.ok) throw new Error(v.errors.join(' '));
      const updatedGroup: AccommodationGroup = {
        ...group,
        label: merged.label.trim(),
        studentCount: merged.studentCount,
        flags: { ...merged.flags },
      };
      const updated = touch({
        ...list,
        groups: list.groups.map((g) => (g.id === groupId ? updatedGroup : g)),
      });
      writeAll(lists.map((l) => (l.id === listId ? updated : l)));
      return updatedGroup;
    },

    removeGroup(listId: string, groupId: string) {
      const lists = readAll();
      const list = requireList(lists, listId);
      const updated = touch({ ...list, groups: list.groups.filter((g) => g.id !== groupId) });
      writeAll(lists.map((l) => (l.id === listId ? updated : l)));
    },

    clearAll() {
      store().removeItem(ACCOMMODATION_STORAGE_KEY);
    },
  };
}
