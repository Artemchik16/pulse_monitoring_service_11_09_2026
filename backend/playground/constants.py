OK_DELAY_SEC = 0.1
SLOW_DELAY_SEC = (5.0, 10.0)
# Longer than the maximum monitor timeout (60 s): the client must give up first
HANG_SEC = 75
FLAPPING_FAILURE_RATE = 0.3
HUGE_BODY_BYTES = 50 * 1024 * 1024
HUGE_BODY_CHUNK_BYTES = 64 * 1024
# A redirect loop never ends on our side; the client must cut it
REDIRECT_LOOP_PARAM = "hop"
