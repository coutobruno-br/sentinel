
// src/sentinel/rules/noDirectMainRule.ts (updated)
export const noDirectMainRule = {
  id: 'no-direct-main',

  supports(event: string) {
    return event === 'push'
  },

  async execute(ctx: any) {
    const ref = ctx.payload?.ref

    if (ref === 'refs/heads/main') {
      return {
        ruleId: 'no-direct-main',
        message: 'Direct push to main branch detected'
      }
    }

    return null
  }
}