"""Authenticated, bounded HTTP boundary for the deterministic engine."""

from __future__ import annotations

import argparse
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import hmac
import json
import os
import signal
import socket
import sys
from threading import Thread
from typing import Any

from .rules import (
    EngineContractError,
    EvidenceValidationError,
    canonical_timestamp,
    evaluate_candidate,
    version_manifest,
)

DEFAULT_MAX_BODY_BYTES = 1_048_576
DEFAULT_REQUEST_TIMEOUT_SECONDS = 10


class IntelligenceHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(
        self,
        server_address: tuple[str, int],
        service_token: str | None,
        max_body_bytes: int,
    ) -> None:
        super().__init__(server_address, IntelligenceRequestHandler)
        self.service_token = service_token
        self.max_body_bytes = max_body_bytes


class IntelligenceRequestHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "TaxLienIntelligence/0.1"
    sys_version = ""

    @property
    def intelligence_server(self) -> IntelligenceHTTPServer:
        return self.server  # type: ignore[return-value]

    def setup(self) -> None:
        super().setup()
        self.connection.settimeout(DEFAULT_REQUEST_TIMEOUT_SECONDS)

    def log_message(self, message_format: str, *args: Any) -> None:
        event = {
            "event": "http_request",
            "client": self.client_address[0],
            "method": self.command,
            "path": self.path.split("?", 1)[0],
            "message": message_format % args,
        }
        print(json.dumps(event, separators=(",", ":")), file=sys.stderr, flush=True)

    def _send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, separators=(",", ":"), allow_nan=False).encode("utf-8")
        self.send_response(status.value)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if self.close_connection:
            self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)

    def _send_error(
        self,
        status: HTTPStatus,
        code: str,
        message: str,
        errors: list[str] | None = None,
    ) -> None:
        self.close_connection = True
        error: dict[str, Any] = {"code": code, "message": message}
        if errors:
            error["details"] = {"errors": errors}
        self._send_json(status, {"error": error})

    def _authorized(self) -> bool:
        expected = self.intelligence_server.service_token
        if expected is None:
            return True
        header = self.headers.get("Authorization", "")
        prefix = "Bearer "
        if not header.startswith(prefix):
            return False
        supplied = header[len(prefix) :]
        return hmac.compare_digest(supplied, expected)

    def do_GET(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path == "/health":
            manifest = version_manifest()
            self._send_json(
                HTTPStatus.OK,
                {
                    "service": manifest["service"],
                    "status": "ok",
                    "timestamp": canonical_timestamp(),
                    "contractVersion": manifest["contractVersion"],
                    "engineVersion": manifest["engineVersion"],
                },
            )
            return
        if path == "/version":
            self._send_json(HTTPStatus.OK, version_manifest())
            return
        self._send_error(HTTPStatus.NOT_FOUND, "route_not_found", "The requested route does not exist.")

    def do_POST(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path != "/v1/evaluate":
            self._send_error(HTTPStatus.NOT_FOUND, "route_not_found", "The requested route does not exist.")
            return
        if not self._authorized():
            self._send_error(
                HTTPStatus.UNAUTHORIZED,
                "service_auth_required",
                "A valid internal service bearer token is required.",
            )
            return
        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if content_type != "application/json":
            self._send_error(
                HTTPStatus.UNSUPPORTED_MEDIA_TYPE,
                "content_type_unsupported",
                "Content-Type must be application/json.",
            )
            return
        length_header = self.headers.get("Content-Length")
        if length_header is None:
            self._send_error(
                HTTPStatus.LENGTH_REQUIRED,
                "content_length_required",
                "Content-Length is required.",
            )
            return
        try:
            content_length = int(length_header)
        except ValueError:
            self._send_error(
                HTTPStatus.BAD_REQUEST,
                "content_length_invalid",
                "Content-Length must be a non-negative integer.",
            )
            return
        if content_length < 0:
            self._send_error(
                HTTPStatus.BAD_REQUEST,
                "content_length_invalid",
                "Content-Length must be a non-negative integer.",
            )
            return
        if content_length > self.intelligence_server.max_body_bytes:
            self._send_error(
                HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                "request_too_large",
                "The request body exceeds the configured limit.",
            )
            return
        try:
            raw_body = self.rfile.read(content_length)
        except (TimeoutError, socket.timeout):
            self._send_error(HTTPStatus.REQUEST_TIMEOUT, "request_timeout", "The request body timed out.")
            return
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_error(HTTPStatus.BAD_REQUEST, "json_invalid", "The request body must be valid UTF-8 JSON.")
            return
        try:
            result = evaluate_candidate(payload)
        except EvidenceValidationError as error:
            self._send_error(
                HTTPStatus.BAD_REQUEST,
                "evidence_invalid",
                "Candidate evidence failed contract validation.",
                error.errors,
            )
            return
        except EngineContractError:
            self._send_error(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                "engine_contract_violation",
                "The engine refused to emit an invalid result.",
            )
            return
        except Exception:
            self._send_error(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                "engine_internal_error",
                "The engine could not complete the evaluation.",
            )
            return
        self._send_json(HTTPStatus.OK, result)

    def do_PUT(self) -> None:  # noqa: N802
        self._method_not_allowed()

    def do_PATCH(self) -> None:  # noqa: N802
        self._method_not_allowed()

    def do_DELETE(self) -> None:  # noqa: N802
        self._method_not_allowed()

    def _method_not_allowed(self) -> None:
        self._send_error(
            HTTPStatus.METHOD_NOT_ALLOWED,
            "method_not_allowed",
            "The request method is not allowed for this route.",
        )


def _is_loopback_host(host: str) -> bool:
    return host in {"127.0.0.1", "::1", "localhost"}


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the tax lien intelligence service.")
    parser.add_argument("--host", default=os.environ.get("INTELLIGENCE_HOST", "127.0.0.1"))
    parser.add_argument(
        "--port",
        default=int(os.environ.get("INTELLIGENCE_PORT", "8081")),
        type=int,
    )
    parser.add_argument(
        "--max-body-bytes",
        default=int(os.environ.get("INTELLIGENCE_MAX_BODY_BYTES", str(DEFAULT_MAX_BODY_BYTES))),
        type=int,
    )
    return parser


def main() -> None:
    args = _parser().parse_args()
    if args.port < 0 or args.port > 65535:
        raise SystemExit("INTELLIGENCE_PORT must be between 0 and 65535.")
    if args.max_body_bytes <= 0:
        raise SystemExit("INTELLIGENCE_MAX_BODY_BYTES must be positive.")
    token = os.environ.get("INTELLIGENCE_SERVICE_TOKEN")
    allow_insecure = os.environ.get("INTELLIGENCE_ALLOW_INSECURE_LOCALHOST", "").lower() == "true"
    if not token and not (allow_insecure and _is_loopback_host(args.host)):
        raise SystemExit(
            "INTELLIGENCE_SERVICE_TOKEN is required unless insecure localhost mode is explicitly enabled."
        )
    if token is not None and len(token) < 32:
        raise SystemExit("INTELLIGENCE_SERVICE_TOKEN must contain at least 32 characters.")

    server = IntelligenceHTTPServer((args.host, args.port), token, args.max_body_bytes)

    def request_shutdown(_signum: int, _frame: Any) -> None:
        Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, request_shutdown)
    signal.signal(signal.SIGINT, request_shutdown)
    host, port = server.server_address[:2]
    print(
        json.dumps(
            {
                "event": "listening",
                "service": "tax-lien-intelligence",
                "host": host,
                "port": port,
                "authRequired": token is not None,
            },
            separators=(",", ":"),
        ),
        flush=True,
    )
    try:
        server.serve_forever(poll_interval=0.25)
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
