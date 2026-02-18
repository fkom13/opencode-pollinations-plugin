# 🔧 Fix Documentation - Search Tools JSON Parse Error

**Date:** 2026-02-17  
**Status:** ✅ FIXED & VERIFIED  
**Affected Tools:** `deepsearch`, `search_crawl_scrape`  
**Impact:** 2/7 ENTER tools  
**Severity:** 🔴 Critical (complete tool failure)

---

## 📋 Executive Summary

Two search tools (`deepsearch` and `search_crawl_scrape`) were failing with a JSON parsing error due to **incorrect destructuring of the `httpsPost` response object**. The functions were attempting to parse the entire response object as JSON instead of extracting the `data` Buffer property first.

### Error Message
```
❌ Erreur Deep Search: JSON Parse error: Unexpected identifier "object"
❌ Erreur Web Search: JSON Parse error: Unexpected identifier "object"
```

### Root Cause
```javascript
const response = await httpsPost(...);  // Returns { data: Buffer, headers: {...} }
const data = JSON.parse(response.toString());  // Tries to parse "[object Object]" ❌
```

---

## 🔍 Technical Analysis

### The Problem

#### `httpsPost` Return Type (shared.ts:289-333)
```typescript
export function httpsPost(
    url: string,
    body: any,
    headers: Record<string, string> = {}
): Promise<{ data: Buffer; headers: Record<string, string> }>
```

**Returns:**
```typescript
{
    data: Buffer,           // ← Contains the JSON response body
    headers: {...}          // ← Response headers (cost tracking, etc.)
}
```

#### What Went Wrong

**File:** `deepsearch.ts:76` (and `search_crawl_scrape.ts:83`)

```typescript
// ❌ INCORRECT
const response = await httpsPost(...);
const data = JSON.parse(response.toString());
// response.toString() = "[object Object]"
// JSON.parse("[object Object]") throws SyntaxError
```

**Why it failed:**
1. `response` is a **plain JavaScript object**, not a Buffer
2. Calling `.toString()` on a plain object returns the default `"[object Object]"` string
3. `JSON.parse()` cannot parse `"[object Object]"` as valid JSON
4. Error: `Unexpected identifier "object"`

---

## ✅ The Solution

### Pattern Comparison

#### ❌ WRONG (2 tools affected)
```typescript
// deepsearch.ts:61-76 (BEFORE)
const response = await httpsPost(
    'https://gen.pollinations.ai/v1/chat/completions',
    {...},
    {...}
);

const data = JSON.parse(response.toString());  // ❌ Wrong
const content = data.choices?.[0]?.message?.content;
```

#### ✅ CORRECT (5 other tools use this pattern)
```typescript
// gen_image.ts (working reference)
const { data } = await httpsPost(  // ✅ Destructure
    'https://gen.pollinations.ai/image',
    {...},
    {...}
);

const jsonData = JSON.parse(data.toString());  // ✅ Correct
const content = jsonData.choices?.[0]?.message?.content;
```

### Changes Applied

#### File: `src/tools/pollinations/deepsearch.ts`

**Line 61: Add destructuring**
```diff
- const response = await httpsPost(
+ const { data } = await httpsPost(
      'https://gen.pollinations.ai/v1/chat/completions',
      {
          model: model,
          messages: [
              { role: 'system', content: systemPrompts[depth] },
              { role: 'user', content: args.query },
          ],
          max_tokens: depth === 'thorough' ? 8000 : depth === 'standard' ? 4000 : 2000,
      },
      {
          'Authorization': `Bearer ${apiKey}`,
      }
  );
```

**Line 76: Parse only the data Buffer**
```diff
- const data = JSON.parse(response.toString());
+ const jsonData = JSON.parse(data.toString());
- const content = data.choices?.[0]?.message?.content || 'No response';
+ const content = jsonData.choices?.[0]?.message?.content || 'No response';
```

---

#### File: `src/tools/pollinations/search_crawl_scrape.ts`

**Line 68: Add destructuring**
```diff
- const response = await httpsPost(
+ const { data } = await httpsPost(
      'https://gen.pollinations.ai/v1/chat/completions',
      {
          model: model,
          messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: args.query },
          ],
          max_tokens: 2000,
      },
      {
          'Authorization': `Bearer ${apiKey}`,
      }
  );
```

**Line 83: Parse only the data Buffer**
```diff
- const data = JSON.parse(response.toString());
+ const jsonData = JSON.parse(data.toString());
- const content = data.choices?.[0]?.message?.content || 'No results found';
+ const content = jsonData.choices?.[0]?.message?.content || 'No results found';
```

---

## 📊 Impact Analysis

### Tools Affected

| Tool                  | Status | Issue                        | Fix Applied |
| --------------------- | ------ | ---------------------------- | ----------- |
| `gen_image`           | ✅     | None (correct pattern)       | N/A         |
| `gen_video`           | ✅     | None (correct pattern)       | N/A         |
| `gen_audio`           | ✅     | None (correct pattern)       | N/A         |
| `transcribe_audio`    | ✅     | None (correct pattern)       | N/A         |
| `gen_music`           | ✅     | None (correct pattern)       | N/A         |
| **`deepsearch`**          | ❌→✅ | **Destructuring missing**    | ✅ Fixed    |
| **`search_crawl_scrape`** | ❌→✅ | **Destructuring missing**    | ✅ Fixed    |

### Coverage

- **Total ENTER tools:** 7
- **Broken tools:** 2 (28.6%)
- **Fixed tools:** 2
- **Fix coverage:** 100%

---

## 🧪 Verification & Testing

### Pre-Fix Testing
```bash
❌ deepsearch(query="AI developments 2026", depth="quick")
   → Error: JSON Parse error: Unexpected identifier "object"

❌ search_crawl_scrape(query="Python best practices", recency="month")
   → Error: JSON Parse error: Unexpected identifier "object"
```

### Post-Fix Testing
```bash
✅ deepsearch(query="AI developments 2026", depth="quick")
   → 🔍 Deep Search Results [complete output with citations]

✅ search_crawl_scrape(query="Python best practices", recency="month")
   → 🔎 Web Search Results [complete output with sources]
```

### Test Results Summary
| Test Case                           | Before | After |
| ----------------------------------- | ------ | ----- |
| Parse response object correctly     | ❌     | ✅    |
| Extract Buffer from response        | ❌     | ✅    |
| Parse JSON content                  | ❌     | ✅    |
| Return formatted results            | ❌     | ✅    |
| Source citations included           | ❌     | ✅    |
| Error handling works                | ✅     | ✅    |

---

## 🔧 Technical Details

### TypeScript Type System

**HttpsPost Return Type:**
```typescript
Promise<{
    data: Buffer;              // The actual response body (JSON)
    headers: Record<string, string>;  // Response headers
}>
```

**Correct usage pattern:**
```typescript
// Option 1: Destructuring (used in fixed code)
const { data } = await httpsPost(...);
const parsed = JSON.parse(data.toString());

// Option 2: Accessing property
const response = await httpsPost(...);
const parsed = JSON.parse(response.data.toString());
```

### Why Other Tools Work

All 5 working tools correctly use destructuring:
- `gen_image.ts:85` - `const { data } = await httpsPost(...)`
- `gen_video.ts:95` - `const { data } = await httpsPost(...)`
- `gen_audio.ts:105` - `const { data } = await httpsPost(...)`
- `transcribe_audio.ts:110` - `const { data } = await httpsPost(...)`
- `gen_music.ts:90` - `const { data } = await httpsPost(...)`

The two broken tools deviated from this established pattern.

---

## 📝 Code Quality Observations

### Root Cause Analysis

**Why did this bug occur?**
1. **Inconsistent pattern application** - 5 tools use correct destructuring, 2 don't
2. **Likely copy-paste error** - Code wasn't properly adapted from template
3. **No TypeScript validation** - The type system didn't catch this (both compile fine)
4. **Missing code review** - Pattern deviation not caught during development

### Prevention Recommendations

1. **Enforce linting rules** - Add ESLint rule for consistent httpsPost usage
2. **Code templates** - Create standardized snippets for httpsPost calls
3. **Type guards** - Consider creating a wrapper that enforces destructuring
4. **Code review checklist** - Verify httpsPost pattern in search tools

---

## 🚀 Build & Deployment

### Build Status
```bash
$ npm run build

✓ TypeScript compilation successful
✓ 0 errors, 0 warnings
✓ dist/ generated with latest code
```

### Snapshot History
```
[1] before-search-tools-fix
    📝 Initial snapshot before search tools bugfix
    📅 2026-02-17T02:27:37

[2] after-search-tools-fix
    📝 Fixed search tools destructuring bug
    📅 2026-02-17T02:28:51
```

### Deployment Notes
- Plugin requires restart after code changes
- No database migrations needed
- No API changes
- No breaking changes to tool interfaces

---

## 📚 References

### Files Modified
- `src/tools/pollinations/deepsearch.ts` (lines 61, 76)
- `src/tools/pollinations/search_crawl_scrape.ts` (lines 68, 83)

### Related Files
- `src/tools/pollinations/shared.ts` - httpsPost implementation
- `src/tools/pollinations/gen_image.ts` - Reference for correct pattern
- `src/tools/pollinations/gen_video.ts` - Reference for correct pattern

### API Documentation
- **Endpoint:** `https://gen.pollinations.ai/v1/chat/completions`
- **Models:** `perplexity-reasoning`, `perplexity-fast`
- **Authentication:** Bearer token (API key)

---

## ✨ Summary

| Aspect                | Details                                    |
| --------------------- | ------------------------------------------ |
| **Bug Type**          | Destructuring / Object property access    |
| **Severity**          | Critical (complete tool failure)           |
| **Scope**             | 2 tools (28.6% of ENTER universe)          |
| **Fix Complexity**    | Trivial (2 lines per file)                 |
| **Risk Level**        | Minimal (proven pattern used by 5 tools)   |
| **Testing**           | ✅ Verified working                        |
| **Build Status**      | ✅ Successful compilation                  |
| **Documentation**     | ✅ Complete                                |
| **Ready for Deploy**  | ✅ Yes                                     |

---

**Fix verified and documented on 2026-02-17**
