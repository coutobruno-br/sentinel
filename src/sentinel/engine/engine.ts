// src/engine/engine.ts
import { PolicyRule, ExecutionContext } from './types'


export class PolicyEngine {
constructor(private rules: PolicyRule[]) {}


run(ctx: ExecutionContext) {
return this.rules.map(rule => {
const enabled = ctx.config.policies.find(p => p.id === rule.id)?.enabled ?? true
if (!enabled) return null


const result = rule.evaluate(ctx)
return {
policyId: rule.id,
severity: rule.severity,
...result
}
}).filter(Boolean)
}
}