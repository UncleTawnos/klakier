# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Most important rules
1. Don’t assume. Don’t hide confusion. Surface tradeoffs.
2. Minimum code that solves the problem. Nothing speculative.
3. Touch only what you must. Clean up only your own mess.
4. Define success criteria. Loop until verified.


## Verify Assumptions — MANDATORY

**Decisions MUST be grounded in verified facts, not in guesswork dressed up as caution.** "MIGHT", "MAY", "PROBABLY", "I THINK", "PER SOME VERSIONS" are not foundations on which to take a decision, write code, set defaults, or pick an algorithm. They are signals to **stop and verify**, or to **ask Tawnos**.

Concrete rules:

- **If a claim is load-bearing for a decision, verify it.** Run the command. Read the docs. Query the system. Check the actual version in the dependency manifest (e.g. `go.mod`, `package.json`, `pyproject.toml`, `Cargo.toml`, compose/IaC files). "I think feature X is only in the Enterprise tier" is NOT a basis to default to an alternative — it is a basis to query the live system or read the release notes and find out.
- **If verification is impractical or you genuinely don't know, ASK Tawnos.** A 30-second clarification beats a multi-day rework. Asking is cheap; guessing wrong and shipping it is expensive.
- **Hedging language in your own writing is a tell.** When you find yourself writing "MIGHT", "MAY", "is in some versions", "probably available", "I believe", treat it as a flag that you have not actually checked. Either go check, or ask. Do NOT ship the hedge as a defensive justification for a default.
- **Story / ADR / spec text counts as a decision artifact.** Don't bake unverified assumptions into stories ("library X MAY not support feature Y — fall back to Z"). If you don't know, write "verify before implementing" as an explicit prerequisite, not as a hedge wrapped around a chosen default.
- **Past you is not a verified source.** A claim made in a previous session, a previous ADR, or a previous story without citation is just as unverified as a guess made now. Cite the primary source (the upstream release notes, the pinned version in the manifest, the actual config file) or re-verify.
- **"It worked in my head" is not verification.** Reasoning about what an API or algorithm should do is a hypothesis. The test, the query, the doc page — those are evidence.

If unsure between two paths and verification doesn't resolve it: **ask Tawnos.** Do not pick the "safer-feeling" default and document the hedge — that is exactly the failure mode this rule exists to prevent.

## Coding Rules — MANDATORY

## Tool Usage Discipline — MANDATORY

Pick the simplest tool that does the job. Cleverness is a cost, not a feature.

- **Prefer `Edit` over shell edits.** For any single-file change, use `Edit` (or `Write` for new files). It is reviewable, atomic, and shows up in diffs cleanly.
- **`sed` / `awk` / `python` / shell rewriters are ONLY for multi-file edits** where running `Edit` N times would be wasteful (e.g. project-wide rename across 20+ files). Single-file `sed -i` is forbidden — use `Edit`.
- **Avoid command substitution (`$(...)`, backticks, pipelines into `eval`) unless there is no direct alternative.** Each `$(...)` is a place where quoting bugs, word-splitting, or injection of unexpected data (filenames with spaces, untrusted output) can break the command. Before using `$(...)`, ask: is there a tool flag, a direct file read, or a built-in that does this without composing strings? If yes, use it.
- **Use relative paths when invoking commands in this repo.** Prefer `./scripts/build-plugin.sh` over `/Users/<name>/develop/.../scripts/build-plugin.sh`. Absolute paths break portability across worktrees, agents, and machines, and leak environment details into commit-adjacent artifacts (logs, error messages). Absolute paths are fine for `Read` / `Edit` tool args (the tools require them) but NOT for shell command invocation.
- **Repetitive command sequences belong in a script under `scripts/`.** If you find yourself running the same 3+ commands in order more than once (lint pipeline, reset-and-reseed, build-and-restart), add a script and invoke it. Don't copy-paste shell pipelines across turns.

When in doubt: simpler tool, fewer layers, fewer string concatenations.

## No Claude Attribution — MANDATORY

**Claude MUST NOT claim authorship, co-authorship, or any form of credit for work performed in this repository.** This is non-negotiable.

Concrete rules:

- **No `Co-Authored-By: Claude ...` trailers in commits.** Strip the trailer from commit message templates. Do not add it back.
- **No "Generated with Claude Code" footers in PR descriptions, issue comments, or commit bodies.**
- **No "🤖" robot emoji or similar markers** indicating AI authorship in any committed artifact (commits, PRs, issues, code comments, docs, ADRs, stories).
- **No self-references in code or docs.** Do not write "added by Claude", "Claude generated this", "AI-assisted", or equivalent in source files, comments, README, CHANGELOG, or any committed file.
- **Commit author / `user.name` / `user.email` MUST NOT be set to Claude or Anthropic.** Use the configured human author. Never run `git config` to change identity.
- **PRs and commits speak as the human author.** First person, no disclaimers about AI involvement.

If a tool, hook, or template injects attribution automatically, remove it before the artifact is finalized. If unsure whether something counts as attribution, strip it.

## Mistakes Log — MANDATORY

When you (or a previous agent) make a mistake — wrong assumption, broken build, regression, dropped requirement, hallucinated API, anything that the user had to correct or that wasted a round-trip — record it in `docs/MISTAKES.md` with:

1. **What happened** (the mistake)
2. **Why it happened** (root cause, not just symptom)
3. **The rule** (concrete, generalizable instruction so it never happens again)

Read `docs/MISTAKES.md` at the start of any non-trivial task. Mistakes recorded there MUST NOT be repeated.
