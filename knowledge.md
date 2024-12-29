# TypeScript ESLint Rules

## no-unused-vars

- Must disable base ESLint `no-unused-vars` rule when using `@typescript-eslint/no-unused-vars`
- Variables prefixed with `_` are conventionally ignored
- Recommended configuration:
```json
{
  "rules": {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error", {
      "args": "all",
      "argsIgnorePattern": "^_",
      "caughtErrors": "all", 
      "caughtErrorsIgnorePattern": "^_",
      "destructuredArrayIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "ignoreRestSiblings": true
    }]
  }
}
```

Benefits over TypeScript's `noUnusedLocals`/`noUnusedParameters`:
- More configurable patterns for ignoring variables
- Can be disabled inline or per file
- Won't block builds

Reference: https://typescript-eslint.io/rules/no-unused-vars/
