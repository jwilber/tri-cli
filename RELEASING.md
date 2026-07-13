# Releasing tri-cli

The tagged release workflow tests the project, creates the exact npm tarball
that it publishes, builds a Debian package from that tarball, generates a
matching Homebrew formula, and uploads all of them to the GitHub Release.

## One-Time Setup

1. Configure the published `tri-cli` package on npm under the account that
   will publish it.
2. Add an npm automation token with permission to publish that package as the
   `NPM_TOKEN` repository secret in GitHub.
3. Create the `jwilber/homebrew-tap` repository if you want the documented
   `brew install jwilber/tap/tri-cli` command. To update it automatically,
   add a fine-grained GitHub token with Contents read/write access to that
   repository as the `HOMEBREW_TAP_TOKEN` Actions secret.
4. Optionally choose and configure a signed APT repository host if you need
   `apt install tri-cli`; see [DEBIAN.md](DEBIAN.md).

You can run the `release` workflow manually from the GitHub Actions tab before
tagging. That validates npm packing, Debian packaging, and formula generation,
but does not publish packages or create a GitHub Release.

## Publish a Version

This checkout is prepared as `0.0.56`, the next version after the currently
published `0.0.55`. Start from a clean, tested branch, commit the release, and
push its matching tag:

```bash
git tag v0.0.56
git push origin main v0.0.56
```

For later releases, use `npm version patch` (or `minor` / `major`) to update
the version and create its tag, then push with `git push origin main
--follow-tags`. Every pushed `v<version>` tag starts
`.github/workflows/release.yml`.

The workflow publishes these GitHub Release assets:

- `tri-cli-<version>.tgz` — the exact npm package uploaded to the registry.
- `tri-cli_<version>_all.deb` — Debian/Ubuntu package.
- `tri-cli.rb` — Homebrew formula with the matching registry tarball checksum.
- `SHA256SUMS` — checksums for the generated artifacts.

## Finish the Homebrew Release

When `HOMEBREW_TAP_TOKEN` is configured, the tagged release updates the tap.
Otherwise, copy the generated `tri-cli.rb` asset into your tap as
`Formula/tri-cli.rb`, commit, and push it. Alternatively, after npm publishing
completes, run:

```bash
./scripts/update-formula.sh <version>
```

Then copy the updated [Formula/tri-cli.rb](Formula/tri-cli.rb) into the tap.

## Verify the Published Package

```bash
npx tri-cli --help
npm install -g tri-cli
tri --help
```
