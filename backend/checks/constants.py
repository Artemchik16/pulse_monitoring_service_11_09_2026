# Max monitors claimed per tick: bounds the burst after downtime/cold start
SCHEDULER_BATCH_SIZE = 100

# Probe limits: never hang, never download huge bodies, never loop on redirects
MAX_REDIRECTS = 5
MAX_BODY_BYTES = 1024 * 1024
BODY_CHUNK_BYTES = 64 * 1024
USER_AGENT = "PulseMonitor/1.0 (+uptime checker)"

# Extra seconds the per-monitor lock outlives the probe timeout
CHECK_LOCK_MARGIN_SEC = 30
