#!/bin/bash
# Automation script to fix remaining console statements and cleanup
# Run from project root: bash fix_remaining_issues.sh

set -e

echo "🔧 Starting automated fixes..."

# 1. Fix frontend console.log statements
echo "📝 Fixing frontend console statements..."

# Frontend files that need console.log -> logger.debug
FRONTEND_FILES=(
  "frontend/src/pages/admin/SettingsPage.tsx"
  "frontend/src/pages/admin/UsersPage.tsx"
  "frontend/src/pages/auth/LoginPage.tsx"
  "frontend/src/App.tsx"
)

for file in "${FRONTEND_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  - Fixing $file"
    sed -i 's/console\.log(/logger.debug(/g' "$file"
  fi
done

# 2. Fix backend console.log statements (exclude scripts/utilities)
echo "📝 Fixing backend console statements..."

BACKEND_FILES=(
  "backend/src/utils/logStorage.ts"
  "backend/src/config/database.ts"
  "backend/src/index.ts"
)

for file in "${BACKEND_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  - Fixing $file"
    sed -i 's/console\.log(/logger.info(/g' "$file"
  fi
done

# 3. Add logger imports where missing
echo "📦 Adding logger imports..."

# SettingsPage.tsx
if ! grep -q "import.*logger.*frontendLogger" "frontend/src/pages/admin/SettingsPage.tsx" 2>/dev/null; then
  sed -i "/import.*useAuth/a import { logger } from '../../utils/frontendLogger';" "frontend/src/pages/admin/SettingsPage.tsx"
fi

# UsersPage.tsx
if ! grep -q "import.*logger.*frontendLogger" "frontend/src/pages/admin/UsersPage.tsx" 2>/dev/null; then
  sed -i "/import.*useAuth/a import { logger } from '../../utils/frontendLogger';" "frontend/src/pages/admin/UsersPage.tsx"
fi

# LoginPage.tsx
if ! grep -q "import.*logger.*frontendLogger" "frontend/src/pages/auth/LoginPage.tsx" 2>/dev/null; then
  sed -i "/import.*react/a import { logger } from '../../utils/frontendLogger';" "frontend/src/pages/auth/LoginPage.tsx"
fi

# App.tsx  
if ! grep -q "import.*logger.*frontendLogger" "frontend/src/App.tsx" 2>/dev/null; then
  sed -i "/import.*react/a import { logger } from './utils/frontendLogger';" "frontend/src/App.tsx"
fi

# 4. Run ESLint auto-fix for unused imports
echo "🧹 Running ESLint auto-fix..."
cd frontend && npx eslint --fix src/ --quiet && cd ..

echo "✅ Automated fixes complete!"
echo ""
echo "Next steps:"
echo "1. Review changes with: git diff"
echo "2. Test builds:"
echo "   - Backend: cd backend && npm run build"
echo "   - Frontend: cd frontend && npm run build"
echo "3. Commit changes: git add -A && git commit -m 'fix: replace console statements with logger'"
