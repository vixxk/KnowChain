import asyncio
import time
from app.config import settings

_last_request_time = 0.0
_lock = asyncio.Lock()

def get_request_delay() -> float:
    return settings.REQUEST_DELAY_MS / 1000.0

async def throttle_request():
    global _last_request_time
    async with _lock:
        request_delay = get_request_delay()
        now = time.time()
        time_since_last = now - _last_request_time
        if time_since_last < request_delay:
            wait_time = request_delay - time_since_last
            print(f"⏳ [BETA-THROTTLE-V2] Waiting {int(wait_time * 1000)}ms for API limits...")
            await asyncio.sleep(wait_time)
        _last_request_time = time.time()

def force_backoff(additional_delay: float = 5.0):
    global _last_request_time
    _last_request_time = time.time() + additional_delay
