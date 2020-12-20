#!/usr/bin/env node
const { exec } = require('child_process');

exec('git-lfs install', (error) => {
  const { code } = error || {};
  if (code) {
    console.error(`git-lfs installation failed:\n${error.message}`);
    console.error(`This package requires git-lfs. Please install it.
See https://git-lfs.github.com/ for instructions.`);
    process.exit(code);
  }
});
