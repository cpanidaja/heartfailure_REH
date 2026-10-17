#!/usr/bin/env python3
"""Measure sequential HTTP latency; never prints auth tokens or response bodies."""
import argparse
import math
import os
import statistics
import subprocess
import time
import urllib.error
import urllib.request


def percentile(values, p):
    ordered = sorted(values)
    if not ordered:
        return 0
    rank = max(0, math.ceil((p / 100) * len(ordered)) - 1)
    return ordered[rank]


def identity_token():
    return subprocess.check_output(
        ["gcloud", "auth", "print-identity-token"], text=True
    ).strip()


def measure(url, samples, warmup, auth):
    headers = {"Accept": "application/json"}
    if auth:
        headers["Authorization"] = "Bearer " + identity_token()
    timings, failures = [], 0
    for index in range(warmup + samples):
        request = urllib.request.Request(url, headers=headers)
        started = time.perf_counter()
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                response.read()
                if response.status < 200 or response.status >= 300:
                    failures += 1
        except (urllib.error.URLError, TimeoutError):
            failures += 1
        elapsed_ms = (time.perf_counter() - started) * 1000
        if index >= warmup:
            timings.append(elapsed_ms)
    return timings, failures


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True, help="Authenticated /summary URL")
    parser.add_argument("--samples", type=int, default=30)
    parser.add_argument("--warmup", type=int, default=3)
    parser.add_argument("--no-auth", action="store_true", help="Local-only testing")
    args = parser.parse_args()
    if args.samples < 1 or args.warmup < 0:
        parser.error("samples must be positive and warmup cannot be negative")
    timings, failures = measure(args.url, args.samples, args.warmup, not args.no_auth)
    print(f"samples={len(timings)} failures={failures}")
    print(f"p50_ms={statistics.median(timings):.1f}")
    print(f"p95_ms={percentile(timings, 95):.1f}")
    print(f"max_ms={max(timings):.1f}")


if __name__ == "__main__":
    main()
