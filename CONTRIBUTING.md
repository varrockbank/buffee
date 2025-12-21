# Commits 

## Scopes:

web - github pages related stuff
test - test related stuff 

## Files 

assets - for github pages assets 

## Extensions 

1. Add to extensions directory
2. update web/extensions.html 

## Distributable

There is no build process needed to vendor `Buffee` global function nor is there to work on the code. However, the minified distributable is created with globally installed `Terser`. This is done by a pre-commit hook ensuring `dist/buffee.min.js` is updated in sync. 
`scripts/setup-hooks.sh` symlinks:

```sh
ln -s ../../hooks/pre-commit .git/hooks/pre-commit
```

## Screenshot Tests

Playwright screenshot tests run in GitHub Actions on every push. The workflow:

1. Takes screenshots of all HTML pages
2. If screenshots changed, auto-commits updated baselines
3. If screenshots changed, requires manual approval before deploy
4. Deploys to GitHub Pages

To update baselines intentionally: push your changes, review the screenshot diff in the commit, then approve the deployment in GitHub Actions.

Screenshot test files are in `snapshot_testing/`.

## pre-commit checks
Further, The precommit additionally checks

1. buffee.js changed, then version should be updated (past style.js)
2. style.js changed, then version should be updated (past buffee.js)
3. buffee.js or style.js updated then devlog.txt must grab largest

```
 Error: changelog.txt version doesn't match the highest version
  buffee.js:     7.6.4-alpha.1
  style.css:     7.6.0-alpha.1
  changelog.txt: 7.6.5-alpha.1
  Please add a new entry to dev/changelog.txt for version 7.6.4-alpha.1
```
