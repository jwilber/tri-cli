class TriCli < Formula
  desc "Interactive CLI directory tree visualizer with treemap view"
  homepage "https://github.com/jwilber/tri-cli"
  url "https://registry.npmjs.org/tri-cli/-/tri-cli-0.0.55.tgz"
  sha256 "974243d4813065c2dac10bbc9bdc602684d244c058988861fdecbf087eaa67c9"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/tri", "--help"
  end
end
