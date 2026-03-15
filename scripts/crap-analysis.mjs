/**
 * CRAP (Change Risk Anti-Patterns) Analysis
 *
 * Combines cyclomatic complexity with test coverage to identify
 * high-risk functions. Formula: comp² × (1 - cov/100)³ + comp
 *
 * Usage: node scripts/crap-analysis.mjs [--threshold=30]
 *
 * Prerequisites: run from monorepo root. Runs vitest with coverage
 * automatically, then analyzes app/src/lib/ functions.
 */

import { Project, SyntaxKind } from "ts-morph";
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { resolve, relative } from "path";

const THRESHOLD = parseInt(
  process.argv.find((a) => a.startsWith("--threshold="))?.split("=")[1] ?? "30",
  10
);
if (isNaN(THRESHOLD)) {
  console.error("Invalid --threshold value. Must be a number.");
  process.exit(1);
}
const APP_DIR = resolve("app");
const LIB_DIR = resolve("app/src/lib");
const COVERAGE_DIR = resolve("app/coverage");

// Step 1: Run vitest with coverage
console.log("Running tests with coverage...\n");
try {
  execSync(
    "npx vitest run --coverage --coverage.reporter=json --coverage.include=src/lib/**",
    { cwd: APP_DIR, stdio: "pipe" }
  );
} catch (e) {
  // Tests may fail but coverage is still generated
  if (!existsSync(resolve(COVERAGE_DIR, "coverage-final.json"))) {
    console.error("Coverage generation failed. Ensure tests can run.");
    process.exit(1);
  }
}

// Step 2: Parse coverage data
const coverageData = JSON.parse(
  readFileSync(resolve(COVERAGE_DIR, "coverage-final.json"), "utf-8")
);

// Step 3: Compute cyclomatic complexity via ts-morph
const project = new Project({
  tsConfigFilePath: resolve(APP_DIR, "tsconfig.app.json"),
  skipAddingFilesFromTsConfig: true,
});

// Add only lib source files (not tests)
project.addSourceFilesAtPaths([
  resolve(LIB_DIR, "**/*.ts"),
  resolve(LIB_DIR, "**/*.tsx"),
  "!" + resolve(LIB_DIR, "**/*.test.*"),
  "!" + resolve(LIB_DIR, "firebase.ts"),
  "!" + resolve(LIB_DIR, "constants.ts"),
  "!" + resolve(LIB_DIR, "errorReporting.ts"),
]);

function computeComplexity(node) {
  let complexity = 1; // base path

  node.forEachDescendant((child) => {
    switch (child.getKind()) {
      case SyntaxKind.IfStatement:
      case SyntaxKind.ConditionalExpression: // ternary
      case SyntaxKind.ForStatement:
      case SyntaxKind.ForInStatement:
      case SyntaxKind.ForOfStatement:
      case SyntaxKind.WhileStatement:
      case SyntaxKind.DoStatement:
      case SyntaxKind.CatchClause:
      case SyntaxKind.CaseClause:
        complexity++;
        break;
      case SyntaxKind.BinaryExpression: {
        const op = child.getOperatorToken().getKind();
        if (
          op === SyntaxKind.AmpersandAmpersandToken ||
          op === SyntaxKind.BarBarToken ||
          op === SyntaxKind.QuestionQuestionToken
        ) {
          complexity++;
        }
        break;
      }
    }
  });

  return complexity;
}

function getFunctionCoverage(filePath, funcName, startLine, endLine) {
  const fileCoverage = Object.values(coverageData).find(
    (entry) => entry.path && resolve(entry.path) === resolve(filePath)
  );

  if (!fileCoverage) return null;

  // Try to match by function name in fnMap
  const fnMap = fileCoverage.fnMap || {};
  const f = fileCoverage.f || {};
  for (const [id, fn] of Object.entries(fnMap)) {
    if (fn.name === funcName) {
      return f[id] > 0 ? getBranchCoverageForRange(
        fileCoverage, fn.loc.start.line, fn.loc.end.line
      ) : 0;
    }
  }

  // Fallback: match by line range
  return getBranchCoverageForRange(fileCoverage, startLine, endLine);
}

function getBranchCoverageForRange(fileCoverage, startLine, endLine) {
  const branchMap = fileCoverage.branchMap || {};
  const b = fileCoverage.b || {};

  let totalBranches = 0;
  let coveredBranches = 0;

  for (const [id, branch] of Object.entries(branchMap)) {
    const branchLine = branch.loc?.start?.line ?? branch.locations?.[0]?.start?.line;
    if (branchLine && branchLine >= startLine && branchLine <= endLine) {
      const counts = b[id] || [];
      for (const count of counts) {
        totalBranches++;
        if (count > 0) coveredBranches++;
      }
    }
  }

  if (totalBranches === 0) {
    // No branches in function — use statement coverage
    const s = fileCoverage.s || {};
    const statementMap = fileCoverage.statementMap || {};
    let totalStmts = 0;
    let coveredStmts = 0;
    for (const [id, stmt] of Object.entries(statementMap)) {
      if (stmt.start.line >= startLine && stmt.end.line <= endLine) {
        totalStmts++;
        if (s[id] > 0) coveredStmts++;
      }
    }
    return totalStmts === 0 ? 100 : (coveredStmts / totalStmts) * 100;
  }

  return (coveredBranches / totalBranches) * 100;
}

function computeCrap(complexity, coverage) {
  return (
    Math.pow(complexity, 2) * Math.pow(1 - coverage / 100, 3) + complexity
  );
}

// Step 4: Analyze all exported functions
const results = [];

for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();
  const relPath = relative(resolve("."), filePath);

  const functions = [
    ...sourceFile.getFunctions().filter((f) => f.isExported()),
    ...sourceFile
      .getVariableDeclarations()
      .filter(
        (v) =>
          v.isExported() &&
          (v.getInitializerIfKind(SyntaxKind.ArrowFunction) ||
            v.getInitializerIfKind(SyntaxKind.FunctionExpression))
      ),
  ];

  for (const func of functions) {
    const name = func.getName() || "(anonymous)";
    const startLine = func.getStartLineNumber();
    const endLine = func.getEndLineNumber();
    const node =
      func.getInitializerIfKind?.(SyntaxKind.ArrowFunction) ||
      func.getInitializerIfKind?.(SyntaxKind.FunctionExpression) ||
      func;
    const complexity = computeComplexity(node);
    const coverage = getFunctionCoverage(filePath, name, startLine, endLine);
    const crap =
      coverage !== null ? computeCrap(complexity, coverage) : null;

    results.push({
      file: relPath,
      function: name,
      complexity,
      coverage: coverage !== null ? Math.round(coverage) : "N/A",
      crap: crap !== null ? Math.round(crap * 100) / 100 : "N/A",
    });
  }
}

// Step 5: Print results
results.sort((a, b) => {
  if (a.crap === "N/A" && b.crap === "N/A") return 0;
  if (a.crap === "N/A") return 1;
  if (b.crap === "N/A") return -1;
  return b.crap - a.crap;
});

console.log("\n" + "=".repeat(90));
console.log("CRAP Analysis Results (threshold: " + THRESHOLD + ")");
console.log("=".repeat(90));
console.log(
  "File".padEnd(35) +
    "Function".padEnd(25) +
    "Comp".padStart(6) +
    "Cov%".padStart(6) +
    "CRAP".padStart(8) +
    "  Status"
);
console.log("-".repeat(90));

let hasFailures = false;
for (const r of results) {
  const status =
    r.crap === "N/A"
      ? "⚠ no coverage"
      : r.crap > THRESHOLD
        ? "✗ FAIL"
        : "✓ ok";
  if (r.crap !== "N/A" && r.crap > THRESHOLD) hasFailures = true;
  if (r.crap === "N/A") hasFailures = true;

  console.log(
    r.file.padEnd(35) +
      r.function.padEnd(25) +
      String(r.complexity).padStart(6) +
      String(r.coverage).padStart(6) +
      String(r.crap).padStart(8) +
      "  " +
      status
  );
}

console.log("-".repeat(90));

if (hasFailures) {
  console.log(
    "\n✗ CRAP check failed — functions above threshold or missing coverage.\n"
  );
  process.exit(1);
} else {
  console.log("\n✓ All functions pass CRAP check.\n");
  process.exit(0);
}
