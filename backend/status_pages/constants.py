MAX_PAGES_PER_USER = 5

SLUG_MIN_LENGTH = 3
SLUG_MAX_LENGTH = 50
# Lowercase latin, digits and single hyphens; no leading/trailing hyphen
SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"

TITLE_MAX_LENGTH = 100

# Public page: anonymous, may be hit by many visitors; data changes at most once a minute
PUBLIC_CACHE_TTL_SEC = 30
PUBLIC_UPTIME_WINDOWS_DAYS = (1, 30)
