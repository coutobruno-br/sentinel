import { noDirectMainRule } from '../rules/noDirectMainRule'

interface ExecutionContext {
  event: string
  payload: any
}

export async function executePolicies(ctx: ExecutionContext) {
  const rules = [noDirectMainRule]
  const violations: any[] = []

  for (const rule of rules) {
    if (rule.supports(ctx.event)) {
      const result = await rule.execute(ctx)
      if (result) violations.push(result)
    }
  }

  return violations
}