import django_filters

from checks.models import CheckResult


class CheckResultFilter(django_filters.FilterSet):
    """?ok=false: only failed checks."""

    class Meta:
        model = CheckResult
        fields = ("ok",)
