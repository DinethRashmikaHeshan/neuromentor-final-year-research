import os
import json
import time
import datetime
import re
from llama_cpp import Llama

# --- 1. SETUP ---
print("Loading local model...")
llm = Llama(
    model_path="../server/model.gguf",
    n_gpu_layers=-1,
    n_ctx=2048,
    verbose=False
)

# --- 2. EXPANDED TEST DATASET (30 cases) ---
TEST_CASES = [
    # ── SYNTAX ERRORS ──────────────────────────────────────────────────────────
    {
        "id": "missing_semicolon",
        "category": "Syntax",
        "difficulty": "Easy",
        "code": 'int main() { printf("Hello World") return 0; }',
        "expected_error": "Missing semicolon after printf statement",
        "state": "FOCUS",
        "attempt": 1
    },
    {
        "id": "missing_closing_brace",
        "category": "Syntax",
        "difficulty": "Easy",
        "code": 'int main() { int x = 5; printf("%d", x); return 0;',
        "expected_error": "Missing closing brace for main function body",
        "state": "FOCUS",
        "attempt": 1
    },
    {
        "id": "mismatched_parentheses",
        "category": "Syntax",
        "difficulty": "Easy",
        "code": 'int main() { if (x > 5 { printf("yes"); } return 0; }',
        "expected_error": "Missing closing parenthesis in if condition",
        "state": "CONFUSE",
        "attempt": 2
    },
    {
        "id": "missing_include",
        "category": "Syntax",
        "difficulty": "Easy",
        "code": 'int main() { printf("Hello"); return 0; }',
        "expected_error": "Missing #include <stdio.h> for printf",
        "state": "FOCUS",
        "attempt": 1
    },
    {
        "id": "invalid_assignment_op",
        "category": "Syntax",
        "difficulty": "Medium",
        "code": 'int main() { int x; x =+ 5; printf("%d", x); return 0; }',
        "expected_error": "Used =+ instead of += for compound addition assignment",
        "state": "CONFUSE",
        "attempt": 2
    },

    # ── UNDECLARED / TYPE ERRORS ────────────────────────────────────────────────
    {
        "id": "undeclared_variable",
        "category": "Declaration",
        "difficulty": "Easy",
        "code": 'int main() { total = 5 + 5; printf("%d", total); return 0; }',
        "expected_error": "Variable 'total' is used without being declared with a type",
        "state": "OVERLOAD",
        "attempt": 3
    },
    {
        "id": "wrong_format_specifier",
        "category": "Declaration",
        "difficulty": "Medium",
        "code": 'int main() { float pi = 3.14; printf("%d", pi); return 0; }',
        "expected_error": "Using %d (int) format specifier for a float; should use %f",
        "state": "FOCUS",
        "attempt": 1
    },
    {
        "id": "char_vs_int_confusion",
        "category": "Declaration",
        "difficulty": "Medium",
        "code": 'int main() { char grade = 90; if (grade > 80) printf("Pass"); return 0; }',
        "expected_error": "Comparing char variable with integer; may cause sign issues on some compilers",
        "state": "CONFUSE",
        "attempt": 2
    },
    {
        "id": "implicit_int_return",
        "category": "Declaration",
        "difficulty": "Hard",
        "code": 'main() { printf("Hello"); }',
        "expected_error": "Function main missing explicit return type int and missing return 0",
        "state": "OVERLOAD",
        "attempt": 4
    },
    {
        "id": "void_return_value",
        "category": "Declaration",
        "difficulty": "Hard",
        "code": 'void greet() { return 42; } int main() { greet(); return 0; }',
        "expected_error": "Returning a value from a void function is not allowed",
        "state": "CONFUSE",
        "attempt": 2
    },

    # ── LOGIC ERRORS ────────────────────────────────────────────────────────────
    {
        "id": "infinite_loop",
        "category": "Logic",
        "difficulty": "Medium",
        "code": 'int main() { int i = 0; while(i < 5) { printf("%d", i); } return 0; }',
        "expected_error": "Missing i++ increment causing an infinite loop",
        "state": "CONFUSE",
        "attempt": 2
    },
    {
        "id": "off_by_one_loop",
        "category": "Logic",
        "difficulty": "Medium",
        "code": 'int main() { int arr[5] = {1,2,3,4,5}; for(int i = 0; i <= 5; i++) printf("%d", arr[i]); return 0; }',
        "expected_error": "Loop condition i <= 5 causes out-of-bounds access; should be i < 5",
        "state": "OVERLOAD",
        "attempt": 3
    },
    {
        "id": "assignment_in_condition",
        "category": "Logic",
        "difficulty": "Medium",
        "code": 'int main() { int x = 10; if (x = 0) printf("zero"); else printf("nonzero"); return 0; }',
        "expected_error": "Using assignment (=) instead of equality comparison (==) in if condition",
        "state": "FOCUS",
        "attempt": 1
    },
    {
        "id": "wrong_loop_variable",
        "category": "Logic",
        "difficulty": "Easy",
        "code": 'int main() { for(int i = 0; i < 5; i++) { printf("%d", i); i++; } return 0; }',
        "expected_error": "Incrementing i inside the loop body AND in the for header causes it to skip every other value",
        "state": "FOCUS",
        "attempt": 1
    },
    {
        "id": "integer_division",
        "category": "Logic",
        "difficulty": "Hard",
        "code": 'int main() { int a = 5, b = 2; float result = a / b; printf("%f", result); return 0; }',
        "expected_error": "Integer division truncates; cast to float before dividing: (float)a / b",
        "state": "OVERLOAD",
        "attempt": 3
    },

    # ── POINTER / MEMORY ERRORS ─────────────────────────────────────────────────
    {
        "id": "null_pointer_dereference",
        "category": "Memory",
        "difficulty": "Hard",
        "code": 'int main() { int *p = NULL; *p = 5; printf("%d", *p); return 0; }',
        "expected_error": "Dereferencing NULL pointer causes segmentation fault",
        "state": "OVERLOAD",
        "attempt": 4
    },
    {
        "id": "uninitialized_pointer",
        "category": "Memory",
        "difficulty": "Hard",
        "code": 'int main() { int *p; *p = 10; printf("%d", *p); return 0; }',
        "expected_error": "Pointer p is declared but never initialized before being dereferenced",
        "state": "CONFUSE",
        "attempt": 3
    },
    {
        "id": "missing_malloc",
        "category": "Memory",
        "difficulty": "Hard",
        "code": 'int main() { int *arr; arr[0] = 1; arr[1] = 2; printf("%d", arr[0]); return 0; }',
        "expected_error": "Array accessed via pointer with no memory allocated (missing malloc)",
        "state": "OVERLOAD",
        "attempt": 5
    },
    {
        "id": "stack_array_return",
        "category": "Memory",
        "difficulty": "Hard",
        "code": 'int* getArr() { int arr[3] = {1,2,3}; return arr; } int main() { int *p = getArr(); printf("%d", p[0]); return 0; }',
        "expected_error": "Returning pointer to a local (stack) array that is destroyed when function exits",
        "state": "OVERLOAD",
        "attempt": 4
    },
    {
        "id": "buffer_overflow",
        "category": "Memory",
        "difficulty": "Hard",
        "code": 'int main() { char name[5]; scanf("%s", name); printf("%s", name); return 0; }',
        "expected_error": "scanf with %s has no width limit; strings longer than 4 chars overflow buffer",
        "state": "FOCUS",
        "attempt": 2
    },

    # ── FUNCTION / SCOPE ERRORS ─────────────────────────────────────────────────
    {
        "id": "missing_function_prototype",
        "category": "Function",
        "difficulty": "Medium",
        "code": 'int main() { int r = add(3, 4); printf("%d", r); return 0; } int add(int a, int b) { return a + b; }',
        "expected_error": "Function add is used before it is declared; need a prototype before main",
        "state": "CONFUSE",
        "attempt": 2
    },
    {
        "id": "wrong_argument_count",
        "category": "Function",
        "difficulty": "Easy",
        "code": 'int add(int a, int b) { return a + b; } int main() { printf("%d", add(3)); return 0; }',
        "expected_error": "Calling add with only one argument but it requires two",
        "state": "FOCUS",
        "attempt": 1
    },
    {
        "id": "pass_by_value_swap",
        "category": "Function",
        "difficulty": "Hard",
        "code": 'void swap(int a, int b) { int t = a; a = b; b = t; } int main() { int x=1, y=2; swap(x,y); printf("%d %d", x, y); return 0; }',
        "expected_error": "swap receives copies of x and y; changes inside the function don't affect originals; use pointers",
        "state": "OVERLOAD",
        "attempt": 3
    },
    {
        "id": "scope_error",
        "category": "Function",
        "difficulty": "Medium",
        "code": 'int main() { { int x = 5; } printf("%d", x); return 0; }',
        "expected_error": "Variable x declared inside inner block is out of scope at printf",
        "state": "CONFUSE",
        "attempt": 2
    },
    {
        "id": "missing_return_value",
        "category": "Function",
        "difficulty": "Medium",
        "code": 'int square(int n) { int result = n * n; } int main() { printf("%d", square(4)); return 0; }',
        "expected_error": "Function square computes result but never returns it; missing return statement",
        "state": "FOCUS",
        "attempt": 1
    },

    # ── ARRAY / STRING ERRORS ───────────────────────────────────────────────────
    {
        "id": "array_out_of_bounds",
        "category": "Array",
        "difficulty": "Medium",
        "code": 'int main() { int arr[3] = {1,2,3}; printf("%d", arr[3]); return 0; }',
        "expected_error": "Accessing arr[3] is out of bounds; valid indices are 0, 1, 2",
        "state": "CONFUSE",
        "attempt": 2
    },
    {
        "id": "string_no_null_terminator",
        "category": "Array",
        "difficulty": "Hard",
        "code": 'int main() { char s[3] = {\'H\',\'i\',\'!\'} ; printf("%s", s); return 0; }',
        "expected_error": "Character array has no null terminator; printf with %s reads past the array",
        "state": "OVERLOAD",
        "attempt": 3
    },
    {
        "id": "strcmp_vs_equals",
        "category": "Array",
        "difficulty": "Medium",
        "code": 'int main() { char s[] = "hello"; if (s == "hello") printf("match"); return 0; }',
        "expected_error": "Comparing string with == compares pointers not content; use strcmp instead",
        "state": "FOCUS",
        "attempt": 1
    },
    {
        "id": "array_size_from_pointer",
        "category": "Array",
        "difficulty": "Hard",
        "code": 'void print(int *arr) { int n = sizeof(arr)/sizeof(arr[0]); for(int i=0;i<n;i++) printf("%d",arr[i]); } int main() { int a[5]={1,2,3,4,5}; print(a); return 0; }',
        "expected_error": "sizeof(arr) inside print() gives pointer size (8), not array size; must pass length separately",
        "state": "OVERLOAD",
        "attempt": 4
    },
    {
        "id": "strcpy_overflow",
        "category": "Array",
        "difficulty": "Hard",
        "code": 'int main() { char dest[5]; strcpy(dest, "Hello World"); printf("%s", dest); return 0; }',
        "expected_error": "strcpy copies 12 bytes into a 5-byte buffer causing a buffer overflow",
        "state": "OVERLOAD",
        "attempt": 3
    },
]

CATEGORIES = list(dict.fromkeys(t["category"] for t in TEST_CASES))
DIFFICULTIES = ["Easy", "Medium", "Hard"]
STATES = ["FOCUS", "CONFUSE", "OVERLOAD"]

# --- 3. LOCAL RULE-BASED SCORER (no external API) ---

def score_accuracy(hint, expected_error):
    key_terms = [w.lower() for w in re.findall(r'\w+', expected_error) if len(w) > 3]
    if not key_terms:
        return 3
    hint_lower = hint.lower()
    ratio = sum(1 for t in key_terms if t in hint_lower) / len(key_terms)
    if ratio >= 0.6:  return 5
    if ratio >= 0.4:  return 4
    if ratio >= 0.25: return 3
    if ratio >= 0.1:  return 2
    return 1

def score_pedagogy(hint):
    hint_lower = hint.lower()
    giveaway = ["the fix is", "you should write", "change it to", "replace with",
                "the answer is", "just add", "simply add", "add a semicolon",
                "add i++", "use malloc", "use strcmp"]
    guiding  = ["what", "have you checked", "look at", "think about", "consider",
                "notice", "try", "check", "do you see", "can you spot", "hint:"]
    score = 3
    score -= min(2, sum(1 for p in giveaway if p in hint_lower))
    score += min(2, sum(1 for p in guiding  if p in hint_lower))
    return max(1, min(5, score))

def score_tone(hint, state):
    hint_lower = hint.lower()
    word_count = len(hint.split())
    if state == "OVERLOAD":
        calm_words  = ["first", "start", "step", "don't worry", "let's", "one thing",
                       "focus on", "just look at", "simple"]
        harsh_words = ["wrong", "incorrect", "mistake", "bad", "never"]
        score = 3 + min(2, sum(1 for w in calm_words  if w in hint_lower)) \
                  - min(2, sum(1 for w in harsh_words if w in hint_lower))
        if word_count > 60: score -= 1
    elif state == "CONFUSE":
        clear_words = ["means", "because", "this is", "specifically", "in c",
                       "remember", "for example", "that is"]
        score = 3 + min(2, sum(1 for w in clear_words if w in hint_lower))
    else:  # FOCUS
        direct_words = ["look at", "check", "what happens", "trace", "think"]
        score = 3 + min(2, sum(1 for w in direct_words if w in hint_lower))
    return max(1, min(5, score))

def score_specificity(hint, code):
    code_tokens = set(re.findall(r'[a-zA-Z_]\w*|[+\-=<>!;{}()\[\]%]', code))
    hint_lower  = hint.lower()
    matched = sum(1 for tok in code_tokens if len(tok) > 1 and tok.lower() in hint_lower)
    if matched >= 4:  return 5
    if matched >= 3:  return 4
    if matched >= 2:  return 3
    if matched >= 1:  return 2
    return 1

def score_completeness(hint):
    word_count   = len(hint.split())
    has_location = any(w in hint.lower() for w in ["line", "at ", "in the", "after", "before", "inside"])
    has_guidance = any(w in hint.lower() for w in ["try", "check", "consider", "look", "should", "need"])
    score = 1
    if word_count >= 10: score += 1
    if word_count >= 20: score += 1
    if has_location:     score += 1
    if has_guidance:     score += 1
    return min(5, score)

def evaluate_hint_locally(code, state, difficulty, expected_error, generated_hint):
    acc  = score_accuracy(generated_hint, expected_error)
    ped  = score_pedagogy(generated_hint)
    tone = score_tone(generated_hint, state)
    spec = score_specificity(generated_hint, code)
    comp = score_completeness(generated_hint)
    weakest = min([("accuracy",acc),("pedagogy",ped),("tone",tone),
                   ("specificity",spec),("completeness",comp)], key=lambda x: x[1])
    feedback = (f"Composite {round((acc+ped+tone+spec+comp)/5,2)}/5. "
                f"Weakest: {weakest[0]} ({weakest[1]}/5). "
                f"Words: {len(generated_hint.split())}.")
    return {
        "accuracy_score":     acc,
        "pedagogy_score":     ped,
        "tone_score":         tone,
        "specificity_score":  spec,
        "completeness_score": comp,
        "feedback":           feedback
    }


# --- 4. EVALUATION PIPELINE ---
def run_evals(test_cases=None, tag="full"):
    if test_cases is None:
        test_cases = TEST_CASES

    results = []
    metric_keys = ["accuracy", "pedagogy", "tone", "specificity", "completeness"]
    totals = {k: 0 for k in metric_keys}
    errors = 0

    # Breakdown accumulators
    by_category  = {c: {k: [] for k in metric_keys} for c in CATEGORIES}
    by_difficulty = {d: {k: [] for k in metric_keys} for d in DIFFICULTIES}
    by_state     = {s: {k: [] for k in metric_keys} for s in STATES}

    run_start = time.time()
    timestamp = datetime.datetime.now().isoformat()

    print(f"\n🚀 Starting Evaluation — {len(test_cases)} test cases\n" + "─"*50)

    for i, test in enumerate(test_cases, 1):
        print(f"[{i:02d}/{len(test_cases)}] {test['id']:35s} | {test['state']:8s} | {test['difficulty']}")

        # Generate hint from local model
        llm_prompt = (
    f"### Instruction:\n"
    f"You are an expert C tutor helping a student debug their C code.\n"
    f"Student state: {test['state']}, Attempt: {test['attempt']}, Difficulty: {test['difficulty']}\n\n"
    f"Code:\n{test['code']}\n\n"
    f"Rules for your hint:\n"
    f"- First identify the exact C keyword, operator, or construct that is broken.\n"
    f"- Reference the specific variable name or symbol from the student's code.\n"
    f"- Write exactly 2 sentences. End with a guiding question.\n"
    f"- Do NOT give the fix directly. Guide the student to find it.\n"
    f"### Response:\n"
)
        t0 = time.time()
        output = llm(llm_prompt, max_tokens=180, stop=["### Instruction:"], echo=False)
        latency_ms = int((time.time() - t0) * 1000)
        generated_hint = output["choices"][0]["text"].strip()

        print(f"         Hint ({latency_ms}ms): {generated_hint[:90]}{'…' if len(generated_hint) > 90 else ''}")

        # Grade locally — no external API
        try:
            scores = evaluate_hint_locally(
                test["code"], test["state"], test["difficulty"],
                test["expected_error"], generated_hint
            )

            result = {
                "test_id":    test["id"],
                "category":   test["category"],
                "difficulty": test["difficulty"],
                "state":      test["state"],
                "attempt":    test["attempt"],
                "hint":       generated_hint,
                "latency_ms": latency_ms,
                "scores": {
                    "accuracy":     scores["accuracy_score"],
                    "pedagogy":     scores["pedagogy_score"],
                    "tone":         scores["tone_score"],
                    "specificity":  scores["specificity_score"],
                    "completeness": scores["completeness_score"],
                },
                "composite": round(
                    (scores["accuracy_score"] + scores["pedagogy_score"] +
                     scores["tone_score"] + scores["specificity_score"] +
                     scores["completeness_score"]) / 5, 2
                ),
                "feedback": scores["feedback"]
            }
            results.append(result)

            # Accumulate totals and breakdowns
            for k in metric_keys:
                v = result["scores"][k]
                totals[k] += v
                by_category[test["category"]][k].append(v)
                by_difficulty[test["difficulty"]][k].append(v)
                by_state[test["state"]][k].append(v)

            composite_str = f"{result['composite']:.2f}/5.00"
            print(f"         Scores → Acc:{scores['accuracy_score']} Ped:{scores['pedagogy_score']} "
                  f"Tone:{scores['tone_score']} Spec:{scores['specificity_score']} "
                  f"Comp:{scores['completeness_score']}  [{composite_str}]")
            print(f"         Judge: {scores['feedback']}\n")

        except Exception as e:
            errors += 1
            print(f"         ❌ Error: {e}\n")
            results.append({
                "test_id": test["id"], "category": test["category"],
                "difficulty": test["difficulty"], "state": test["state"],
                "attempt": test["attempt"], "hint": generated_hint,
                "latency_ms": latency_ms, "scores": {}, "composite": 0,
                "feedback": f"EVALUATION_ERROR: {e}"
            })

    # ── 5. AGGREGATE REPORT ──────────────────────────────────────────────────
    num = len(test_cases) - errors
    total_time = round(time.time() - run_start, 1)
    avg_latency = round(sum(r["latency_ms"] for r in results) / len(results), 0)

    def avg(lst): return round(sum(lst) / len(lst), 2) if lst else 0.0

    category_summary = {
        c: {k: avg(by_category[c][k]) for k in metric_keys}
        for c in CATEGORIES if any(by_category[c][metric_keys[0]])
    }
    difficulty_summary = {
        d: {k: avg(by_difficulty[d][k]) for k in metric_keys}
        for d in DIFFICULTIES if any(by_difficulty[d][metric_keys[0]])
    }
    state_summary = {
        s: {k: avg(by_state[s][k]) for k in metric_keys}
        for s in STATES if any(by_state[s][metric_keys[0]])
    }

    overall = {k: round(totals[k] / num, 2) for k in metric_keys} if num else {}
    composite_avg = round(sum(overall.values()) / len(overall), 2) if overall else 0.0

    # Identify best/worst tests
    scored = [r for r in results if r["composite"] > 0]
    best  = max(scored, key=lambda r: r["composite"]) if scored else None
    worst = min(scored, key=lambda r: r["composite"]) if scored else None

    summary = {
        "run_tag":      tag,
        "timestamp":    timestamp,
        "total_time_s": total_time,
        "num_tests":    len(test_cases),
        "errors":       errors,
        "avg_latency_ms": avg_latency,
        "overall":      overall,
        "composite_avg": composite_avg,
        "by_category":  category_summary,
        "by_difficulty": difficulty_summary,
        "by_state":     state_summary,
        "best_test":    {"id": best["test_id"], "composite": best["composite"]} if best else None,
        "worst_test":   {"id": worst["test_id"], "composite": worst["composite"]} if worst else None,
    }

    # ── 6. CONSOLE REPORT ────────────────────────────────────────────────────
    print("=" * 55)
    print("📊  EVALUATION REPORT")
    print("=" * 55)
    print(f"  Tests run : {len(test_cases)}  |  Errors: {errors}  |  Time: {total_time}s")
    print(f"  Avg latency (local model): {avg_latency}ms")
    print()
    print("  OVERALL SCORES  (avg / 5.0)")
    for k in metric_keys:
        bar = "█" * int(overall.get(k, 0)) + "░" * (5 - int(overall.get(k, 0)))
        print(f"    {k.capitalize():14s}  {bar}  {overall.get(k, 0):.2f}")
    print(f"    {'Composite':14s}  {'★' * int(composite_avg)}{'☆' * (5 - int(composite_avg))}  {composite_avg:.2f}")
    print()
    print("  BY CATEGORY")
    for cat, s in category_summary.items():
        comp = round(sum(s.values()) / len(s), 2)
        print(f"    {cat:12s}  {comp:.2f}/5.00")
    print()
    print("  BY DIFFICULTY")
    for diff, s in difficulty_summary.items():
        comp = round(sum(s.values()) / len(s), 2)
        print(f"    {diff:8s}  {comp:.2f}/5.00")
    print()
    print("  BY STUDENT STATE")
    for st, s in state_summary.items():
        comp = round(sum(s.values()) / len(s), 2)
        print(f"    {st:10s}  {comp:.2f}/5.00")
    if best:
        print()
        print(f"  🏆 Best:  {best['test_id']}  ({best['composite']:.2f})")
        print(f"  ⚠️  Worst: {worst['test_id']}  ({worst['composite']:.2f})")
    print("=" * 55)

    # ── 7. SAVE OUTPUTS ──────────────────────────────────────────────────────
    out = {
        "summary": summary,
        "results": results
    }
    fname = f"eval_results_{tag}_{timestamp[:10]}.json"
    with open(fname, "w") as f:
        json.dump(out, f, indent=2)
    print(f"\n💾  Full results saved → {fname}")
    return out


# ── CLI ENTRY POINT ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Evaluate C-tutor local model")
    parser.add_argument("--category",   choices=CATEGORIES,   default=None, help="Run only one category")
    parser.add_argument("--difficulty", choices=DIFFICULTIES, default=None, help="Run only one difficulty")
    parser.add_argument("--state",      choices=STATES,       default=None, help="Run only one student state")
    parser.add_argument("--ids",        nargs="+",            default=None, help="Run specific test IDs")
    parser.add_argument("--tag",        default="full",                     help="Label for this run")
    args = parser.parse_args()

    subset = TEST_CASES
    if args.category:
        subset = [t for t in subset if t["category"] == args.category]
    if args.difficulty:
        subset = [t for t in subset if t["difficulty"] == args.difficulty]
    if args.state:
        subset = [t for t in subset if t["state"] == args.state]
    if args.ids:
        subset = [t for t in subset if t["id"] in args.ids]

    if not subset:
        print("No test cases match your filters.")
    else:
        run_evals(subset, tag=args.tag)