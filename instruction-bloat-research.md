# Instruction Bloat & LLM Performance — Research Summary

*Use this as a lens when auditing Tiger Lily's existing CLAUDE.md and agent instruction files.*

---

## The Core Problem

More instructions feel like more clarity. For LLMs, they're more noise. The research consistently shows that after a surprisingly low threshold, additional instructions degrade performance rather than improve it.

---

## Key Findings

### 1. Reasoning Degrades Early

Goldberg et al. (2024) found that LLM reasoning performance degrades at around **3,000 tokens of input** — far below the 200K context window. This isn't a context limit problem; it's an attention problem. The model's ability to focus on what matters gets diluted by volume.

A separate study found that a well-structured **16K-token prompt with targeted retrieval outperformed a monolithic 128K-token prompt** in both accuracy and relevance. Less input, better retrieval, superior results.

**Audit question**: *How many tokens are your current Tiger Lily instruction files? If they exceed ~3K tokens of pure instruction (not code references), you're likely past the point of diminishing returns.*

### 2. The "Lost in the Middle" Effect

LLMs weight tokens at the **beginning and end** of input most heavily. Information in the middle gets deprioritized. This is a well-documented transformer attention pattern that persists across model generations, including through 2025 benchmarks on multimodal inputs.

This means: if your CLAUDE.md has 300 lines and the critical rule is on line 150, it's in the worst possible position.

**Audit question**: *Are your most important rules at the top and bottom of your files? Is anything critical buried in the middle of a long document?*

### 3. Irrelevant Context Is Actively Harmful

This is the most counterintuitive finding. LLMs can often **identify** irrelevant information in a prompt, but they **fail to ignore it** during generation. The model knows something doesn't matter but still lets it influence the output.

Worse: **semantically similar but irrelevant** content is the most damaging type. If your instruction file includes detailed guidance about a subsystem the agent isn't currently working on, that guidance actively interferes with the task at hand — precisely because it's close enough to the real task to confuse attention allocation.

**Audit question**: *Do your instruction files include guidance for subsystems that aren't always relevant? For example, does a general CLAUDE.md include detailed zone system rules that only matter when working on zones?*

### 4. The 150-200 Instruction Ceiling

HumanLayer's testing (2025) found that frontier thinking models (Claude Opus/Sonnet with extended thinking) can follow approximately **150-200 discrete instructions** with reasonable consistency. Beyond that, adherence drops uniformly — not catastrophically, but steadily.

Non-thinking models and smaller models hit the ceiling much sooner, with **exponential decay** rather than linear.

**Audit question**: *Count the discrete instructions in your CLAUDE.md. Each bullet point, each rule, each "always do X" or "never do Y" is an instruction. Are you over 150?*

### 5. Negative Instructions Without Alternatives

Anthropic's own best practices note that negative-only instructions ("never use --foo-bar flag") can cause agents to get stuck. The model knows what NOT to do but has no direction for what TO do instead.

**Audit question**: *Do any of your instructions say "don't do X" without providing the preferred alternative?*

### 6. Claude Code Specifically Ignores Bloated Instructions

Anthropic added behavior where Claude Code will **selectively ignore CLAUDE.md contents** it deems irrelevant to the current task. This was a deliberate engineering decision — they found that telling Claude to skip bad instructions produced better results than having it try to follow everything.

This means: if your CLAUDE.md is bloated, you don't just get diminishing returns. The model actively decides which parts to ignore, and you lose control over *which* instructions get dropped.

**Audit question**: *Have you noticed Claude Code ignoring rules you've explicitly written? That's likely a signal your file is too long, not that the model is broken.*

---

## The Practical Thresholds

| Metric | Recommended | Danger Zone |
|--------|-------------|-------------|
| CLAUDE.md length | < 150 lines | > 300 lines |
| Instruction token count | < 2-3K tokens | > 5K tokens |
| Discrete instructions | < 100 | > 200 |
| Subsystem-specific rules in root file | 0 (use scoped files) | Any |
| Negative-only instructions | 0 | Any |
| Lines that pass the "would removing this cause mistakes?" test | 100% | < 80% |

---

## The Fix: Progressive Disclosure

The solution isn't removing instructions — it's restructuring *when* they're loaded.

### Before (monolithic)
```
CLAUDE.md (400 lines)
  ├── Project identity
  ├── Build commands
  ├── General code style
  ├── Zone system rules
  ├── Entity system rules
  ├── Telemetry rules
  ├── Map rendering rules
  ├── ICS-214 formatting rules
  ├── Testing conventions
  ├── Storybook conventions
  └── Git workflow
```

Every session loads all 400 lines. Agent working on a simple UI fix still processes telemetry and ICS-214 rules. Those rules compete for attention with the actually relevant guidance.

### After (progressive disclosure)
```
CLAUDE.md (60-80 lines)
  ├── Project identity
  ├── Build commands
  ├── Non-negotiable code style (only what causes mistakes without)
  ├── "For zone system details, see docs/architecture/zone-system.md"
  ├── "For testing conventions, see .claude/rules/testing.md"
  └── Git workflow

.claude/rules/testing.md — loaded by Claude Code when relevant
.claude/rules/components.md — loaded when touching components
docs/architecture/zone-system.md — agent reads when working on zones
docs/architecture/entity-system.md — agent reads when working on entities
```

Root file stays lean. Claude Code loads scoped rules when the task context triggers them. Architecture docs are read on-demand during execution. The agent sees what it needs, when it needs it.

---

## Audit Checklist for Tiger Lily

Run through your existing instruction files with these questions:

- [ ] **Total line count of root CLAUDE.md?** Target: < 150
- [ ] **Count discrete instructions.** Target: < 100
- [ ] **For each instruction: would Claude make a mistake without it?** If no → cut or move to scoped file
- [ ] **Any subsystem-specific rules in the root file?** → Move to `.claude/rules/` or `docs/`
- [ ] **Any "don't do X" without "do Y instead"?** → Rewrite with alternatives
- [ ] **Most critical rules at top of file?** → Reorder by importance
- [ ] **Any instructions Claude has been ignoring?** → Signal the file is too long
- [ ] **Are there duplicate or overlapping instructions?** → Consolidate
- [ ] **Does the file read like documentation or like rules?** → Cut prose, keep directives

---

## Sources

1. Goldberg et al., "Same Task, More Tokens: the Impact of Input Length on the Reasoning Performance of Large Language Models" (2024) — arxiv.org/html/2402.14848v1
2. MLOps Community, "The Impact of Prompt Bloat on LLM Output Quality" (2025) — mlops.community
3. HumanLayer, "Writing a Good CLAUDE.md" (2025) — humanlayer.dev/blog/writing-a-good-claude-md
4. Anthropic, "Best Practices for Claude Code" (2025) — code.claude.com/docs/en/best-practices
5. Anthropic, "Using CLAUDE.md Files" (2025) — claude.com/blog/using-claude-md-files
6. Anthropic, "Skill Authoring Best Practices" (2025) — platform.claude.com/docs
7. PromptLayer, "Disadvantage of Long Prompt for LLM" (2025) — blog.promptlayer.com
8. Valbuena, "Why Long System Prompts Hurt Context Windows" (2025) — Medium/Data Science Collective
