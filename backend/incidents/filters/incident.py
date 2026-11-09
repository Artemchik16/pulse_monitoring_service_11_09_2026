import django_filters

from incidents.models import Incident


class IncidentFilter(django_filters.FilterSet):
    """Query filters for the incident list (?monitor=1&is_open=true)."""

    monitor = django_filters.NumberFilter(field_name="monitor_id")
    is_open = django_filters.BooleanFilter(field_name="resolved_at", lookup_expr="isnull")

    class Meta:
        model = Incident
        fields = ("monitor", "is_open")
