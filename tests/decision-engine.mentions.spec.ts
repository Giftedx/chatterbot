import { DecisionEngine } from '../src/services/decision-engine.service.js';

function makeMessage(content: string, opts: Partial<any> = {}): any {
  return {
    content,
    mentions: {
      everyone: opts.everyone || false,
      users: new Map(opts.mentionUserIds?.map((id: string) => [id, { id }]) || []),
      roles: new Map(opts.mentionRoleIds?.map((id: string) => [id, { id }]) || []),
      channels: new Map(opts.mentionChannelIds?.map((id: string) => [id, { id }]) || []),
      ...opts.mentionsOverride
    },
    attachments: new Map(),
    ...opts
  };
}

describe('DecisionEngine mention handling', () => {
  const engine = new DecisionEngine({ cooldownMs: 8000, defaultModelTokenLimit: 8000, maxMentionsAllowed: 3 });

  test('penalizes excessive mixed mentions (users+roles+channels)', () => {
    const msg = makeMessage('@role1 @role2 <#c1> <#c2> <@u1> hey bot', {
      mentionUserIds: ['u1'],
      mentionRoleIds: ['r1','r2'],
      mentionChannelIds: ['c1','c2']
    });
    const res = engine.analyze(msg, { optedIn: true, isDM: false, isPersonalThread: false, mentionedBot: false, repliedToBot: false });
    expect(res.reason).toContain('too-many-mentions');
  });
});
