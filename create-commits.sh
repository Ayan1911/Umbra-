#!/bin/bash
set -e

git init
git config user.email "ayan1911@example.com"
git config user.name "Ayan Tamboli"

git add package.json package-lock.json tsconfig.json vite.config.ts tsconfig.tsbuildinfo .gitignore index.html old-static-index.html || true
git commit -m "Initial scaffold (repo structure, package.json, tooling config)" || true

git add contract/src/dark_pool.compact contract/build/ || true
git commit -m "Compact contract implementation (skeleton, circuits, and witnesses)" || true

git add infra/ || true
git commit -m "Standalone Docker network setup" || true

git add scripts/ test-standalone.ts test-contract.ts test-app/ || true
git commit -m "Local deployment scripts and testing boilerplate" || true

git add src/midnight-provider.ts || true
git commit -m "Wallet connector — DApp Connector API integration" || true

git add src/main.tsx src/App.tsx src/LandingPage.tsx src/styles/index.css src/components/Navbar.tsx || true
git commit -m "Landing page structure, copy, and Three.js vortex animation" || true

git add src/TradingInterface.tsx || true
git commit -m "Trading interface — order ticket UI and state management" || true

git add src/hooks/useDarkPoolContract.ts || true
git commit -m "Trading interface — real contract wiring (useDarkPoolContract.ts)" || true

git add .env.example || true
git commit -m "Preprod network config" || true

git add .github/ || true
git commit -m "CI/CD pipeline setup" || true

git add README.md || true
git commit -m "README + architecture docs" || true

git add NOTES.md || true
git commit -m "NOTES.md (technical decisions log)" || true

git add .
git commit -m "Remaining bug fixes, polish, and config changes (era mismatch fix, dependency alignment)" || true

echo "Commit history created successfully!"
