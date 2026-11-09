import django_filters

from monitors.choices import MonitorStatusChoices
from monitors.models import Monitor


class MonitorFilter(django_filters.FilterSet):
    """Query filters for the Monitor list (?status=DOWN&status=PENDING)."""

    status = django_filters.MultipleChoiceFilter(choices=MonitorStatusChoices.choices)

    class Meta:
        model = Monitor
        fields = ("status", "is_active", "is_public")
