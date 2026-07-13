# Homebrew Installation Guide

This document explains how to make `tri-cli` installable via Homebrew.

The recommended release flow is:

1. Publish the npm package through the tagged GitHub release workflow.
2. The workflow updates the tap automatically when `HOMEBREW_TAP_TOKEN` is
   configured. Otherwise, download the generated `tri-cli.rb` release asset,
   or run `scripts/update-formula.sh <version>` after publishing.
3. Copy the formula to your tap repository when using the manual path.

That keeps Homebrew aligned with the same npm tarball used by the cluster installer.

## Option 1: Install Directly from Formula File

Users can install directly from the formula file without setting up a tap:

```bash
brew install Formula/tri-cli.rb
```

## Option 2: Create a Homebrew Tap (Recommended)

A Homebrew tap is a custom repository that allows users to install your formula with a shorter command.

### Steps to Create a Tap:

1. **Create a new GitHub repository** named `homebrew-tap` in your account

   - Repository name MUST be `homebrew-tap` or `homebrew-<name>`
   - Example: `https://github.com/jwilber/homebrew-tap`

2. **Copy the formula** to the tap repository:

   ```bash
   # Clone your tap repository
   git clone https://github.com/jwilber/homebrew-tap.git

   # Copy the formula
   mkdir -p homebrew-tap/Formula
   cp Formula/tri-cli.rb homebrew-tap/Formula/tri-cli.rb

   # Commit and push
   cd homebrew-tap
   git add Formula/tri-cli.rb
   git commit -m "Add tri-cli formula"
   git push
   ```

3. **Users can now install with**:

   ```bash
   brew install jwilber/tap/tri-cli
   ```

   Or tap it first:

   ```bash
   brew tap jwilber/tap
   brew install tri-cli
   ```

### Automate Formula Updates

To have a tagged release update the tap automatically, create a fine-grained
GitHub token with **Contents: Read and write** access limited to the tap
repository. Store it in this repository as the `HOMEBREW_TAP_TOKEN` Actions
secret.

The workflow defaults to these values:

- Tap repository: `jwilber/homebrew-tap`
- Branch: `main`
- Formula path: `Formula/tri-cli.rb`

Override any of them with repository variables named
`HOMEBREW_TAP_REPOSITORY`, `HOMEBREW_TAP_BRANCH`, and
`HOMEBREW_TAP_FORMULA_PATH`.

## Option 3: Submit to Homebrew Core

For maximum visibility, submit to the official Homebrew repository. Requirements:

- Project must be stable and well-maintained
- Must meet [Homebrew's acceptable formulae criteria](https://docs.brew.sh/Acceptable-Formulae)
- Must have 75+ GitHub stars or equivalent notability

See [Homebrew's contribution guide](https://docs.brew.sh/How-To-Open-a-Homebrew-Pull-Request) for submission instructions.

## Updating the Formula

When you publish a new version to npm:

```bash
./scripts/update-formula.sh
```

Or for an explicit version:

```bash
./scripts/update-formula.sh 0.0.56
```

This updates both the tarball URL and SHA256 in the formula.

## Testing the Formula

Test the formula locally before publishing:

```bash
# Audit the formula
brew audit --new-formula Formula/tri-cli.rb

# Install locally to test
brew install --build-from-source Formula/tri-cli.rb

# Test it works
tri --help

# Uninstall
brew uninstall tri-cli
```

## Current Formula Location

The formula is located at: `Formula/tri-cli.rb`
