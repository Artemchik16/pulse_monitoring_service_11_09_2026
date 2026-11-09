# Consecutive failed checks that turn a monitor DOWN and open an incident
FAILURES_TO_DOWN = 2

# A failure streak is stale if the gap since the previous check exceeds
# STALE_GAP_INTERVALS * interval + STALE_GAP_GRACE_SEC (host was asleep / worker was down):
# a failure before the gap and one after it are not "consecutive"
STALE_GAP_INTERVALS = 2
STALE_GAP_GRACE_SEC = 60
