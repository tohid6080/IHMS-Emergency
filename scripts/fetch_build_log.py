#!/usr/bin/env python3
"""Fetch failed step logs from the latest APK build run."""
import json
import os
import sys
import urllib.request

TOKEN = os.environ.get("GITHUB_TOKEN")
REPO = "tohid6080/IHMS-Emergency"
API = f"https://api.github.com/repos/{REPO}"


def get(url: str, raw: bool = False):
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"token {TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(req) as resp:
            data = resp.read()
    except urllib.error.HTTPError as e:
        if e.code in (301, 302, 303, 307):
            # Redirect to Azure blob: re-fetch WITHOUT auth header
            loc = e.headers["Location"]
            req2 = urllib.request.Request(loc)
            req2.add_header("Accept", "application/vnd.github+json")
            with urllib.request.urlopen(req2) as resp2:
                data = resp2.read()
        else:
            raise
    if raw:
        return data.decode("utf-8", errors="replace")
    return json.loads(data.decode("utf-8"))


runs = get(f"{API}/actions/runs?per_page=5")
run = next(r for r in runs["workflow_runs"] if r["path"] == ".github/workflows/build-android.yml")
jobs = get(run["jobs_url"])
for job in jobs["jobs"]:
    print(f"JOB: {job['name']} -> {job['conclusion']}")
    for step in job["steps"]:
        print(f"  step: {step['name']} -> {step['conclusion']}")
    if job["conclusion"] == "failure":
        logs = get(job["url"] + "/logs", raw=True)
        lines = logs.splitlines()
        # print tail where gradle error appears
        print("----- LOG TAIL (last 80 lines) -----")
        print("\n".join(lines[-80:]))
