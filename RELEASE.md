# Release Guide

This document outlines the process for releasing new versions of Revali.

## Prerequisites

Before you can release, ensure:

1. **npm Registry Access**: You are logged in to npm with publish permissions

   ```bash
   npm login
   npm whoami
   ```

2. **GitHub Repository Access**: You have push access to the main branch

3. **All CI Checks Pass**: Ensure all tests pass and CI is green

## Release Process

### Automated Release (Recommended)

We use [Changesets](https://github.com/changesets/changesets) for automated version management and releases.

1. **Create a Changeset** (for contributors):

   ```bash
   pnpm changeset
   ```

   - Choose the type of change (patch/minor/major)
   - Write a clear description of the changes
   - Commit the generated changeset file

2. **Release Process** (for maintainers):
   The release process is automated via GitHub Actions:

   - When changesets are present on `main`, a "Release PR" is automatically created
   - This PR includes version bumps and updated CHANGELOG.md
   - Review and merge the Release PR
   - The merge will trigger automatic publishing to npm

### Manual Release (Fallback)

If automated release fails, you can manually release:

```bash
# 1. Ensure you're on the main branch with latest changes
git checkout main
git pull origin main

# 2. Run the pre-publish checks
pnpm run prepublishOnly

# 3. Version and publish (will run changeset version and publish)
pnpm run version-packages
pnpm run release

# 4. Create and push git tags
git push --follow-tags
```

## Version Strategy

We follow [Semantic Versioning (SemVer)](https://semver.org/):

- **PATCH** (`0.1.1`): Bug fixes, documentation updates
- **MINOR** (`0.2.0`): New features, backwards compatible
- **MAJOR** (`1.0.0`): Breaking changes

### Pre-release Versions

For beta/alpha releases:

```bash
pnpm changeset pre enter beta
pnpm changeset version
pnpm run release --tag beta
```

## Checklist Before Release

- [ ] All tests pass (`pnpm run test`)
- [ ] Build succeeds (`pnpm run build`)
- [ ] No linting errors (`pnpm run lint`)
- [ ] Code is formatted (`pnpm run format:check`)
- [ ] Documentation is up to date
- [ ] CHANGELOG.md reflects the changes
- [ ] Version number follows SemVer

## Post-Release

After a successful release:

1. **GitHub Release**: Create a GitHub release with release notes
2. **Announcement**: Consider announcing major releases on relevant platforms
3. **Documentation**: Update any external documentation if needed

## Troubleshooting

### Release Failed

If a release fails:

1. Check npm registry status
2. Verify your npm permissions for the package
3. Check GitHub Actions logs for specific errors
4. Consider manual release as fallback

### Version Conflicts

If version conflicts occur:

```bash
# Reset changesets
pnpm changeset status
pnpm changeset version --snapshot
```

## GitHub Secrets Required

For automated releases, ensure these secrets are set in the repository:

- `NPM_TOKEN`: npm authentication token with publish permissions
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

## Support

If you encounter issues with the release process:

1. Check existing GitHub issues
2. Create a new issue with detailed error information
3. Tag maintainers for urgent release issues
