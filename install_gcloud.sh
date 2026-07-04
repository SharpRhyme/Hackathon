#!/usr/bin/env bash
set -euo pipefail

echo "=== Downloading Google Cloud CLI ==="
curl -sSL https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz -o google-cloud-cli.tar.gz

echo "=== Extracting Google Cloud CLI ==="
tar -xf google-cloud-cli.tar.gz
rm google-cloud-cli.tar.gz

echo "=== Installing Google Cloud CLI ==="
./google-cloud-sdk/install.sh --quiet --path-update false

echo "=== Google Cloud CLI Installed successfully! ==="
./google-cloud-sdk/bin/gcloud --version
