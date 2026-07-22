'use strict';

const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const defaultRunnerDir = repoRoot;
const runnerArg = process.argv[2] || defaultRunnerDir;
const runnerDir = path.isAbsolute(runnerArg)
  ? path.resolve(runnerArg)
  : path.resolve(repoRoot, runnerArg);
const electronPath = require('electron');
const env = { ...process.env };

delete env.ELECTRON_RUN_AS_NODE;
env.ICUE_WIDGET_RUNNER_DIR = runnerDir;

const child = spawn(electronPath, ['.'], {
  cwd: repoRoot,
  env,
  stdio: 'inherit',
  windowsHide: false
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});

child.on('error', error => {
  console.error(error);
  process.exit(1);
});
