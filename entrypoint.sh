#!/bin/bash

set -e

/usr/src/app/action

# The action pipeline does not throw an errors if there is nothing to process.
cd $GITHUB_WORKSPACE

if git diff --quiet && git diff --staged --quiet; then
  exit 0
fi

/usr/src/scripts/create-pr