# Debian and Ubuntu Packaging

Each version-tagged GitHub Release publishes a self-contained
`tri-cli_<version>_all.deb` package. It bundles tri-cli's JavaScript
dependencies and declares Node.js 16 or newer as a system dependency.

## Install a Release Asset

Download the `.deb` asset for the release you want, then install it locally:

```bash
sudo apt install ./tri-cli_<version>_all.deb
tri .
```

Using `apt install ./…deb` is preferred to `dpkg -i` because apt resolves the
Node.js dependency from configured repositories.

## Build a Debian Package Locally

On Debian or Ubuntu with Node.js 16+ and `dpkg-deb` installed:

```bash
npm ci
npm run package:deb
sudo apt install ./release/tri-cli_*_all.deb
```

The package is installed under `/usr/lib/tri-cli` with a `/usr/bin/tri`
symlink.

## Enable `apt install tri-cli`

That command requires more than a `.deb` file: the package must be uploaded to
a signed APT repository. The release workflow creates the package but does not
publish to a repository because that needs a hosting provider, signing key,
and credentials.

After choosing an APT repository host, configure clients with its signing key
and repository URL. The usual client-side shape is:

```bash
curl -fsSL https://apt.example.com/public.gpg |
  sudo gpg --dearmor -o /usr/share/keyrings/tri-cli-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/tri-cli-archive-keyring.gpg] https://apt.example.com stable main" |
  sudo tee /etc/apt/sources.list.d/tri-cli.list
sudo apt update
sudo apt install tri-cli
```

Replace `apt.example.com`, `stable`, and `main` with the values supplied by
your chosen repository host. Upload every `release/tri-cli_*_all.deb` artifact
there as part of the tagged release process.
