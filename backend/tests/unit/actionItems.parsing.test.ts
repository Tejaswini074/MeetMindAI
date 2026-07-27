import { parseActionItemsResponse } from '@modules/ai/services/gpt.service';

const teamMembers = [
  { id: 'user-1', name: 'Alice Smith' },
  { id: 'user-2', name: 'Bob Jones' },
];

describe('parseActionItemsResponse', () => {
  it('parses a well-formed response and resolves assignee by name', () => {
    const raw = JSON.stringify({
      actionItems: [
        {
          title: 'Draft the Q3 roadmap',
          assigneeName: 'Alice Smith',
          priority: 'HIGH',
          dueDate: '2026-08-01',
          confidence: 0.9,
        },
      ],
    });

    const result = parseActionItemsResponse(raw, teamMembers);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: 'Draft the Q3 roadmap',
      assigneeId: 'user-1',
      priority: 'HIGH',
      confidence: 0.9,
    });
    expect(result[0].dueDate?.toISOString().slice(0, 10)).toBe('2026-08-01');
  });

  it('matches assignee names case-insensitively', () => {
    const raw = JSON.stringify({
      actionItems: [{ title: 'Ship it', assigneeName: 'bob jones', priority: 'MEDIUM' }],
    });

    const result = parseActionItemsResponse(raw, teamMembers);
    expect(result[0].assigneeId).toBe('user-2');
  });

  it('leaves assigneeId null when the name does not match any known member', () => {
    const raw = JSON.stringify({
      actionItems: [{ title: 'Unassigned task', assigneeName: 'Someone Else', priority: 'LOW' }],
    });

    const result = parseActionItemsResponse(raw, teamMembers);
    expect(result[0].assigneeId).toBeNull();
  });

  it('defaults dueDate to null when absent or unparsable', () => {
    const raw = JSON.stringify({
      actionItems: [
        { title: 'No due date', priority: 'LOW' },
        { title: 'Garbage due date', priority: 'LOW', dueDate: 'not-a-date' },
      ],
    });

    const result = parseActionItemsResponse(raw, teamMembers);
    expect(result[0].dueDate).toBeNull();
    expect(result[1].dueDate).toBeNull();
  });

  it('returns an empty array for an empty actionItems list', () => {
    const result = parseActionItemsResponse(JSON.stringify({ actionItems: [] }), teamMembers);
    expect(result).toEqual([]);
  });

  it('returns an empty array for malformed JSON rather than throwing', () => {
    expect(parseActionItemsResponse('{not valid json', teamMembers)).toEqual([]);
  });

  it('returns an empty array when the JSON does not match the expected schema', () => {
    const raw = JSON.stringify({ somethingElse: true });
    expect(parseActionItemsResponse(raw, teamMembers)).toEqual([]);
  });

  it('rejects entries with an invalid priority enum instead of guessing', () => {
    const raw = JSON.stringify({
      actionItems: [{ title: 'Bad priority', priority: 'SUPER_URGENT' }],
    });
    expect(parseActionItemsResponse(raw, teamMembers)).toEqual([]);
  });
});
