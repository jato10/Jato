---
name: skillspector-auditor
description: Audits agent skills for security vulnerabilities, malicious patterns, and policy violations before installation. Use when installing new skills, updating existing ones, or triaging findings in your skill catalog.
---

# SkillSpector Auditor

## Overview

SkillSpector is a security scanner that detects vulnerabilities, prompt injection risks, data exfiltration, privilege escalation, and malicious patterns in agent skills. Use it to **answer "Is this skill safe to install?"** before adding it to your trusted set.

This skill documents the audit workflow: scanning skills, interpreting findings, triaging false positives, and maintaining baseline suppressions for known-safe patterns.

## When to Use

- **Before installing a new skill** — Scan it locally first, understand the findings, document suppressions.
- **Before deploying a skill to production** — Verify it passes security gates and has reviewed baselines.
- **When updating a skill** — Re-scan after edits to surface new issues, not regressions.
- **When triaging findings** — Distinguish real vulnerabilities (require fixes) from false positives (require baselines).
- **When managing a skill catalog** — Audit existing skills periodically; maintain audit trail in baselines.

**When NOT to use:** For skills you do not control (from external sources) unless you plan to fork and maintain them — the audit is your responsibility.

## Process

### 1. Scan a Skill

```bash
# Activate SkillSpector environment
source /home/user/tools/skillspector/.venv/bin/activate

# Run initial scan (static analysis only, no LLM calls)
skillspector scan ./skills/<skill-name> --no-llm

# Output: Terminal report with findings (CRITICAL, HIGH, MEDIUM, LOW, INFO)
```

**What you get:**
- **Risk score** (0-100, with severity label)
- **Finding list** by category (prompt injection, privilege escalation, data exfiltration, etc.)
- **Recommendation** (PASS, REVIEW, REJECT)

### 2. Interpret Findings

Each finding has:
- **Rule ID** (e.g., `YR4`, `PE3`, `SSRF1`) — Category of vulnerability
- **Location** (file path, line number)
- **Description** — What the pattern matched and why it's flagged
- **Severity** — CRITICAL, HIGH, MEDIUM, LOW, INFO

**Example finding:**
```
YR4 (YARA rule: prompt injection) | SKILL.md:21
  "Threat Model First" section heading matched hidden-instructions pattern
  Risk: Could indicate concealed instructions in documentation
```

### 3. Triage: Fix or Suppress?

For each finding, decide:

| Finding Type | Action |
|---|---|
| Real vulnerability (credential access, unsafe eval, command injection) | **FIX** — Update SKILL.md or code, re-scan to verify |
| False positive (documentation explaining a risk, defensive code) | **SUPPRESS** — Add to baseline, document why |
| Uncertain | **INVESTIGATE** — Check context, confirm intent, then fix or suppress |

### 4. Generate a Baseline (Suppress Known Findings)

```bash
# Generate baseline from current scan
skillspector baseline ./skills/<skill-name> \
  -o .skillspector-baseline.yaml \
  --no-llm \
  --reason "Initial triage: YR4 is defensive prompt-injection doc, not exploit"

# Output: Baseline file with suppressed finding hashes/rules
```

**Baseline structure:**
```yaml
version: 2
scanner_version: "2.11.2"

rules:
  - id: "YR4"
    path: "SKILL.md"
    reason: >
      Triaged 2026-09-10: YARA rule 'agent_skill_prompt_injection'
      matched SKILL.md:21, a security-hardening guideline section.
      Manually verified: no hidden instructions, no exploit code.
      Cross-checked with LLM pass (claude-sonnet-5) — identical result.

fingerprints: []  # Use rules-based suppression, not fingerprints
```

### 5. Verify: Re-scan with Baseline

```bash
# Re-scan same skill against baseline
skillspector scan ./skills/<skill-name> \
  --no-llm \
  --baseline .skillspector-baseline.yaml \
  --show-suppressed

# Expected: Only new findings appear; suppressed findings show as "SUPPRESSED"
```

If findings re-appear despite baseline, investigate:
- Is the source file unchanged? (fingerprints may drift)
- Are suppressions correct? (baseline file syntax, rule IDs)
- Did SkillSpector update? (new analyzer rules may flag new patterns)

### 6. Commit & Document

```bash
# Stage baseline
git add skills/<skill-name>/.skillspector-baseline.yaml

# Commit with clear message
git commit -m "chore(skillspector): add baseline for <skill-name>

Findings audited and triaged:
- YR4: defensive doc, not exploit (suppressed)
- PE3: architecture diagram, not credential access (suppressed)
- Status: 0 active findings, all reviewed and documented
"
```

## Audit Checklist

Before marking a skill as "audited":

- [ ] Ran `skillspector scan ./skills/<skill-name> --no-llm` and reviewed all findings
- [ ] For each finding: documented decision (FIX or SUPPRESS) with reasoning
- [ ] Fixed real vulnerabilities and re-scanned to confirm they're gone
- [ ] Generated baseline with `skillspector baseline` for all suppressed findings
- [ ] Verified baseline works: re-scan shows only suppressed findings, no active ones
- [ ] Baseline is committed with clear reason for each suppression
- [ ] Baseline includes cross-check note (manual review + LLM confirmation if applicable)
- [ ] Skill risk score is acceptable (PASS or REVIEW, not REJECT)

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The finding is in documentation, not code — it's fine" | Documentation can mislead agents. If it reads like hidden instructions, suppress it with reasoning, don't ignore it. |
| "I reviewed the code, it's safe — don't need a baseline" | Baseline is the audit record. It documents what you reviewed and why findings are acceptable. Future you or collaborators need that trail. |
| "I'll use fingerprint-based suppression for precision" | Fingerprints are non-reproducible across separate CLI invocations (known SkillSpector v2 issue). Use `rules` (rule ID + path) instead — deterministic and recommended by SkillSpector's own docs. |
| "I'll scan once and never again" | Re-scan when you update the skill, when SkillSpector updates, or on a regular cadence (e.g., monthly). Baselines prevent regression; they don't prevent new issues. |
| "If SkillSpector flags it, I must fix it" | SkillSpector is a static analysis tool. Some findings are false positives in context. Your job is to triage, not blindly fix every flag. |

## Red Flags

- **No baseline for a skill** — If a skill has findings but no baseline, it was never formally audited. Create one or fix the findings.
- **Baseline with no reasoning** — A baseline that suppresses findings without explaining why is not an audit trail. Always document the why.
- **Re-scans show new active findings** — Either the baseline is wrong, the source changed, or SkillSpector updated. Investigate and update the baseline.
- **Risk score REJECT** — The skill has critical findings that don't suppress. Either fix the skill or don't install it.
- **Fingerprint-based suppression** — Switch to `rules` (rule ID + path). Fingerprints drift across invocations.
- **Manual approval without documentation** — "I trust this skill" is not an audit. Always run SkillSpector and document findings, even if you approve it afterward.

## Verification

After auditing a skill:

- [ ] Baseline file exists in `skills/<skill-name>/.skillspector-baseline.yaml`
- [ ] Baseline contains version, scanner_version, and suppression rules with reasons
- [ ] Re-scan with baseline shows `SUPPRESSED` for all baseline findings, not `ACTIVE`
- [ ] No CRITICAL or HIGH findings remain active
- [ ] Risk score is PASS or REVIEW (not REJECT)
- [ ] Baseline is committed to git with clear reasoning for each suppression
- [ ] All suppression reasons reference: manual verification + LLM cross-check (if applicable)

## Setup

SkillSpector is pre-installed in `/home/user/tools/skillspector` with Python 3.12.

Activate it:
```bash
source /home/user/tools/skillspector/.venv/bin/activate
skillspector --version  # SkillSpector v2.11.2
```

Or create a shell alias:
```bash
alias skillspector='/home/user/tools/skillspector/.venv/bin/skillspector'
```

Then use `skillspector` directly without activation.

## Resources

- **SkillSpector docs** — https://docs.nvidia.com/skills/scanning-agent-skills
- **Suppression format** — https://github.com/NVIDIA/SkillSpector/blob/main/docs/SUPPRESSION.md
- **Development guide** — https://github.com/NVIDIA/SkillSpector/blob/main/docs/DEVELOPMENT.md

## Examples

### Example 1: Audit browser-testing-with-devtools

```bash
source /home/user/tools/skillspector/.venv/bin/activate
skillspector scan ./skills/browser-testing-with-devtools --no-llm
```

Findings: `YR1`, `P1`, `YR4` (all in SKILL.md, all documentation/defensive code).

Decision: Suppress all three. Reasoning:
- YR1: Security risk warning (Profile Isolation section), not exploit code
- P1 & YR4: Example injection phrases in defensive documentation, not actual instructions

```bash
skillspector baseline ./skills/browser-testing-with-devtools \
  -o .skillspector-baseline.yaml \
  --no-llm \
  --reason "All findings are defensive documentation; no exploit code"
```

Verify:
```bash
skillspector scan ./skills/browser-testing-with-devtools \
  --no-llm \
  --baseline .skillspector-baseline.yaml \
  --show-suppressed
# Output: 0 ACTIVE, 3 SUPPRESSED
```

### Example 2: Audit a New Skill with Real Vulnerabilities

```bash
skillspector scan ./skills/my-new-skill --no-llm
# Findings: PE3 (process.exec with user input), SSRF1 (unvalidated URL fetch)
```

Decision: FIX (not suppress).

```bash
# Edit skills/my-new-skill/SKILL.md or code to remove vulnerabilities
# (e.g., validate input, use allow-list for URLs)
# Then re-scan
skillspector scan ./skills/my-new-skill --no-llm
# Output: 0 findings
```

No baseline needed — findings were fixed, not suppressed.

### Example 3: Update Baseline After Code Changes

```bash
# You updated skills/my-skill/SKILL.md
skillspector scan ./skills/my-skill \
  --no-llm \
  --baseline .skillspector-baseline.yaml \
  --show-suppressed

# Output: 2 ACTIVE (new), 3 SUPPRESSED (from baseline)
```

Investigate the 2 new findings. If they're false positives:

```bash
skillspector baseline ./skills/my-skill \
  -o .skillspector-baseline.yaml \
  --no-llm \
  --reason "Updated 2026-09-12: added new section X; YR4 still defensive doc, EA2 is new false positive"
```

Verify again:
```bash
skillspector scan ./skills/my-skill \
  --no-llm \
  --baseline .skillspector-baseline.yaml \
  --show-suppressed
# Output: 0 ACTIVE, 5 SUPPRESSED
```

Commit the updated baseline with clear reasoning for the new suppressions.
