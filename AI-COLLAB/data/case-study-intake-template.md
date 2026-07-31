# Case-study intake

**For:** Bongo
**Purpose:** Supply the raw material for evidence-led case studies. Static View addendum §8.2 requires seventeen sections per case study; `content/profile.json` currently holds 126–200 character blurbs, which cannot be expanded without inventing facts.
**How to use:** Answer in rough notes. Fragments are fine. Codex turns them into prose, and Claude reviews for accuracy against what you wrote. **Nothing gets published that you did not say.**
**Where to put it:** save answers as `AI-COLLAB/inbox/codex/case-<project-slug>.md`, or paste into chat.

Skip any question that does not apply. An honest "not measurable" is more useful than an invented number and will be published as a limitation rather than hidden.

---

## Priority order

Do these three first. They carry the homepage.

1. **FxPM** — flagship. Recommended lead case study: it is the most distinctive evidence you have, and it is a systems-engineering and applied-research story rather than another credential.
2. **MetaPOS** — the current professional role, and the only one with production and commercial context.
3. **One more of your choosing** — whichever you would most want a hiring manager or client to read.

Everything else can stay as a standard or archive card. Not every project needs a case study, and pretending otherwise is what produced the current wall of equal-weight cards.

---

## Questions

### 1. In one sentence, what is it?

Plain language, as if to a smart person outside your field.

### 2. Why does it exist?

What problem or need started it. Personal motivation counts.

### 3. What was your role?

Sole author, lead, contributor, team member. Be exact. If others were involved, say who did what.

### 4. What was genuinely hard about it?

**The most important question here.** The specific technical or analytical difficulty — the thing that took real thought, that you got wrong first, or that most people underestimate. One good answer to this question is worth more than the other sixteen sections combined.

### 5. What constraints shaped it?

Time, budget, data availability, hardware, regulation, client confidentiality, working alone, learning while building.

### 6. How is it built?

Architecture and method, at whatever depth is comfortable. Components, data flow, key algorithms or models, main libraries.

### 7. What decisions did you make, and what did you reject?

Two or three real forks. What you chose, what you turned down, and why. This is what separates an engineer from a tutorial follower.

### 8. How did you know it worked?

Testing, validation, backtesting, out-of-sample results, review, user feedback. If validation was informal, say so — informal and stated beats rigorous and implied.

### 9. What was the outcome?

What exists now, what it does, who uses it. **Only claims you can defend.** If you cannot quantify it, describe it.

### 10. What evidence can be shown publicly?

Pick every one that applies:

- Public repository — URL, and is it current or stale?
- Screenshots you are happy to publish
- Diagrams or architecture sketches
- Sample output, charts, reports
- Public write-up or documentation
- Nothing public — client-safe summary only

### 11. Confidentiality

Anything that must not be named: client names, data, credentials, proprietary methods, financial figures.

### 12. Status

Which one: production and live / prototype / research / paused / archived / actively developed.

### 13. What did you learn?

Including what you would do differently. Stated limitations read as competence, not weakness.

### 14. Related work

Other projects, roles or research this connects to.

---

## For FxPM specifically

Optional prompts, since this is the flagship and the detail is worth having:

- What does the system actually do end to end, from signal to executed position?
- How do the backtester, optimiser and live manager relate to each other?
- What does the validation regime look like — walk-forward, out-of-sample, the honesty controls you built to stop yourself fooling yourself?
- How do you model costs, spread and execution realism, and why does that matter more than it sounds?
- What is the hardest correctness problem you have hit in it?
- What is the current honest state: research, paper-traded, demo, live?
- How much of the public GitHub repository reflects the current system, and how much is superseded?

That last one matters. If the public repositories are stale relative to your current work, the case study should say so plainly. A recruiter who clicks through and finds old code with no explanation draws a worse conclusion than one who was told upfront.

---

## What happens next

1. You answer in notes.
2. Codex drafts the case study into the content model.
3. Claude reviews every published sentence against your answers and flags anything that overstates.
4. You approve before it ships.

Answering questions 1, 2, 3, 4 and 9 for a single project is already enough to build a real case study. If time is short, answer those five for FxPM and nothing else — that alone unblocks M3.
