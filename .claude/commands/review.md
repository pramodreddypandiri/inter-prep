You are performing a pre-push code review. Follow these steps exactly:

## Step 1: Identify changes

Run `git diff main...HEAD` to see all changes on this branch compared to main. Also run `git status` to check for any uncommitted changes. Run `git log main..HEAD --oneline` to see all commits being reviewed.

## Step 2: Review the changes

Analyze the diff thoroughly. Check for:

- **Bugs & Logic Errors**: Off-by-one errors, null/undefined handling, race conditions, missing edge cases
- **Security**: Hardcoded secrets, SQL injection, XSS, command injection, insecure dependencies
- **Performance**: N+1 queries, unnecessary re-renders, missing indexes, large bundle imports
- **Code Quality**: Dead code, duplicated logic, unclear naming, missing error handling
- **Type Safety**: Any/unknown types, missing validations, type mismatches
- **API Contracts**: Breaking changes, missing fields, inconsistent response shapes
- **Tests**: Missing test coverage for new logic, broken existing tests

## Step 3: Present the review

Present your findings organized as:

1. **Summary**: One paragraph overview of what changed
2. **Critical Issues** (must fix before push): Bugs, security issues, breaking changes
3. **Warnings** (should fix): Performance concerns, code quality issues
4. **Suggestions** (nice to have): Style improvements, minor refactors
5. **Verdict**: PASS (safe to push), WARN (push with caution), or BLOCK (fix before pushing)

## Step 4: Log the review

After presenting the review, append an entry to `docs/reviewshistory.md` with the following format:

```
## Review — {YYYY-MM-DD HH:MM}

**Branch**: {current branch name}
**Commits reviewed**: {list of commit hashes and messages}
**Verdict**: {PASS / WARN / BLOCK}

### Summary
{one paragraph summary}

### Issues Found
{list of issues, or "None" if clean}

---
```

If `docs/reviewshistory.md` does not exist, create it with a `# Code Review History` heading first.

Important: Always log the review, even if the code is clean. The log serves as an audit trail.
