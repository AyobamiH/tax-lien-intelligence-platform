from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
import urllib.request


def wait_for_intelligence() -> None:
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen("http://127.0.0.1:8081/health", timeout=1) as response:
                if response.status == 200:
                    return
        except OSError:
            time.sleep(0.2)
    raise RuntimeError("intelligence service did not become ready")


def terminate(processes: list[subprocess.Popen[bytes]]) -> None:
    for process in processes:
        if process.poll() is None:
            process.terminate()
    deadline = time.monotonic() + 15
    for process in processes:
        remaining = max(0.1, deadline - time.monotonic())
        try:
            process.wait(timeout=remaining)
        except subprocess.TimeoutExpired:
            process.kill()


def main() -> int:
    processes: list[subprocess.Popen[bytes]] = []
    stopping = False

    def handle_signal(_signum: int, _frame: object) -> None:
        nonlocal stopping
        stopping = True
        terminate(processes)

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    intelligence = subprocess.Popen(
        [sys.executable, "-m", "tax_lien_intelligence.server"],
        env=os.environ.copy(),
    )
    processes.append(intelligence)

    try:
        wait_for_intelligence()
        api = subprocess.Popen(["node", "/app/apps/api/dist/index.js"], env=os.environ.copy())
        processes.append(api)

        while True:
            if stopping:
                return 0
            for process in processes:
                exit_code = process.poll()
                if exit_code is not None:
                    terminate(processes)
                    return exit_code
            time.sleep(0.2)
    except BaseException:
        terminate(processes)
        raise


if __name__ == "__main__":
    raise SystemExit(main())
