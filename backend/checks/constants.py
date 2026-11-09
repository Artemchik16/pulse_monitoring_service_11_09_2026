# Max monitors claimed per tick: bounds the burst after downtime/cold start
SCHEDULER_BATCH_SIZE = 100

# Probe limits: never hang, never download huge bodies, never loop on redirects
MAX_REDIRECTS = 5
MAX_BODY_BYTES = 1024 * 1024
BODY_CHUNK_BYTES = 64 * 1024
USER_AGENT = "PulseMonitor/1.0 (+uptime checker)"

# Extra seconds the per-monitor lock outlives the probe timeout
CHECK_LOCK_MARGIN_SEC = 30

# History retention: rows older than this are purged by the hourly task
RETENTION_DAYS = 30
# Rows deleted per statement: each batch is a short transaction with row locks only
PURGE_BATCH_SIZE = 5000
# Pause between batches so live writes, autovacuum and replicas keep up
PURGE_BATCH_PAUSE_SEC = 0.05
# One run stops after this long; the rest is picked up by the next run
PURGE_TIME_BUDGET_SEC = 4 * 60
PURGE_LOCK_KEY = "checks:purge:lock"
