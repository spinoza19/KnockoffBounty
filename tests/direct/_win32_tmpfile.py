"""Windows workaround for the direct-mode loader.

`gltest.direct.loader` writes the encoded message to a temp file, dup2s that
descriptor onto stdin, then immediately unlinks the file. Deleting a file that
still has an open handle is fine on POSIX and raises WinError 32 on Windows, so
on Windows every direct-mode test fails before the contract is even reached.

The loader imports `os` inside the function, so the only seam is `os.unlink`
itself. This wraps it for the duration of the test session: PermissionError is
swallowed and the path is deleted at interpreter exit instead. Every other
error still propagates, and the original function is restored afterwards.

No-op on POSIX.
"""

import atexit
import os
import sys

_deferred: list[str] = []
_original = None


def _cleanup() -> None:
    while _deferred:
        try:
            os.unlink(_deferred.pop())
        except OSError:
            pass


def install() -> None:
    global _original

    if sys.platform != "win32" or _original is not None:
        return

    _original = os.unlink

    def tolerant_unlink(path, *args, **kwargs):
        try:
            _original(path, *args, **kwargs)
        except PermissionError:
            _deferred.append(os.fspath(path))

    os.unlink = tolerant_unlink  # type: ignore[assignment]
    atexit.register(_cleanup)


def uninstall() -> None:
    global _original

    if _original is None:
        return
    os.unlink = _original  # type: ignore[assignment]
    _original = None
    _cleanup()
