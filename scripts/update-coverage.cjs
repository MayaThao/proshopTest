// scripts/update-coverage.js
const fs = require('fs');
const path = require('path');

const SUMMARY_PATH = path.join(
  process.cwd(),
  'coverage',
  'coverage-summary.json'
);
const DOC_PATH = process.argv[2]; // truyền đường dẫn file .md khi chạy script
const TOOL_NAME = 'jest --coverage (Istanbul/nyc)';

if (!DOC_PATH) {
  console.error(
    'Cách dùng: node scripts/update-coverage.js <đường-dẫn-file.md>'
  );
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf-8')).total;

function row(label, metric) {
  const { total, covered, pct } = summary[metric];
  return `| ${label} | ${total} | ${covered} | ${pct}% | ${TOOL_NAME} |`;
}

const newTable = [
  '<!-- COVERAGE_TABLE_START -->',
  '| Metric (độ phủ) | Total | Covered | Coverage % | Tool sử dụng |',
  '|---|---:|---:|---:|---|',
  row('Statement coverage', 'statements'),
  row('Branch coverage', 'branches'),
  row('Function coverage', 'functions'),
  row('Line coverage', 'lines'),
  '<!-- COVERAGE_TABLE_END -->',
].join('\n');

const doc = fs.readFileSync(DOC_PATH, 'utf-8');
const pattern =
  /<!-- COVERAGE_TABLE_START -->[\s\S]*?<!-- COVERAGE_TABLE_END -->/;

if (!pattern.test(doc)) {
  console.error('Không tìm thấy marker COVERAGE_TABLE_START/END trong file.');
  process.exit(1);
}

fs.writeFileSync(DOC_PATH, doc.replace(pattern, newTable));
console.log(`Đã cập nhật bảng coverage trong ${DOC_PATH}`);
