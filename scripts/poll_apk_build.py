#!/usr/bin/env python3
"""Poll GitHub Actions run status for the APK build workflow."""
import json
import os
import sys
import time
import urllib.request

TOKEN = os.environ.get("GITHUB_TOKEN")
REPO = "tohid6080/IHMS-Emergency"
API = f"https://api.github.com/repos/{REPO}"


def get(url: str) -> dict:
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"token {TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def latest_run() -> dict:
    data = get(f"{API}/actions/runs?per_page=5")
    for run in data.get("workflow_runs", []):
        if run["path"] == ".github/workflows/build-android.yml":
            return run
    return {}


run = latest_run()
if not run:
    print("NO_RUN_YET")
    sys.exit(0)

print(f"run #{run['run_number']} | {run['status']} | {run.get('conclusion') or '-'} | {run['html_url']}")

deadline = time.time() + 8 * 60
while time.time() < deadline and run["status"] != "completed":
    time.sleep(30)
    run = latest_run()
    print(f"  ... {run['status']} | {run.get('conclusion') or '-'}", flush=True)

print(f"FINAL: status={run['status']} conclusion={run.get('conclusion')}")
if run.get("conclusion") == "failure":
    jobs = get(run["jobs_url"])
    for job in jobs.get("jobs", []):
        for step in job.get("steps", []):
            if step["conclusion"] == "failure":
                print(f"  failed step: {step['name']}")
