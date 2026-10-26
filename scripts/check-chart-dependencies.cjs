const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');

const project = createRequire(path.join(path.resolve(process.argv[2] || '.'), 'package.json'));
const react = project('react');
const fromCharts = createRequire(project.resolve('recharts/package.json'));
const fromProps = createRequire(project.resolve('prop-types/package.json'));
assert(fromCharts('react-is').isElement(react.createElement('div')), 'Recharts cannot recognize the installed React elements');
console.log(`Chart dependency check passed: React ${react.version}, Recharts react-is ${fromCharts('react-is/package.json').version}, prop-types react-is ${fromProps('react-is/package.json').version}`);
