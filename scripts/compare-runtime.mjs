import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

// 型消去後の実行構文を比較する。型assertionが残す括弧と空blockの空白のみ正規化。
function executionTree(source) {
  const file = ts.createSourceFile('runtime.js', source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.JS);
  function visit(node) {
    if (ts.isParenthesizedExpression(node)) return visit(node.expression);
    const children = [];
    ts.forEachChild(node, child => { const entry = visit(child); if (entry !== null) children.push(entry); });
    return children.length ? [ts.SyntaxKind[node.kind], ...children] : [ts.SyntaxKind[node.kind], ts.isBlock(node) ? '{}' : node.getText(file)];
  }
  return visit(file);
}
const base = process.argv[2] || 'f6fc2ab12e4c1781527b3ac77d77bb92e63dde3a';
for (const filename of readdirSync('src').filter(name => name.endsWith('.ts') && !name.endsWith('.d.ts') && !name.endsWith('.type-test.ts'))) {
  const path = `js/${filename.replace(/\.ts$/, '.js')}`;
  const before = execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8' });
  assert.deepEqual(executionTree(readFileSync(path, 'utf8')), executionTree(before), `${path}: 実行構文が変化`);
  console.log(`${path}: 実行構文一致`);
}
