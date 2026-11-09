from datetime import datetime

from django.db.models import Q, QuerySet

from incidents.models import Incident


class IncidentRepository:
    """Incident database operations."""

    def list_by_owner(self, *, owner_id: int) -> QuerySet[Incident]:
        """List incidents of the owner's monitors, newest first."""

        return Incident.objects.filter(monitor__owner_id=owner_id).select_related("monitor")

    def get_by_id(self, *, incident_id: int, owner_id: int) -> Incident:
        """Get an incident of the owner's monitor by ID."""

        return Incident.objects.select_related("monitor").get(
            id=incident_id, monitor__owner_id=owner_id
        )

    def count_overlapping(self, *, monitor_id: int, since: datetime) -> int:
        """Count incidents that were open at any moment since the given time."""

        return Incident.objects.filter(
            Q(resolved_at__isnull=True) | Q(resolved_at__gte=since), monitor_id=monitor_id
        ).count()

    def find_open(self, *, monitor_id: int) -> Incident | None:
        """Find the open incident of a monitor."""

        return Incident.objects.filter(monitor_id=monitor_id, resolved_at__isnull=True).first()

    def create_open(
        self, *, monitor_id: int, started_at: datetime, cause_code: str, cause: str
    ) -> Incident:
        """Open an incident."""

        return Incident.objects.create(
            monitor_id=monitor_id, started_at=started_at, cause_code=cause_code, cause=cause
        )

    def resolve(self, *, incident: Incident, resolved_at: datetime) -> Incident:
        """Close an incident and fix its duration."""

        incident.resolved_at = resolved_at
        incident.duration_sec = max(int((resolved_at - incident.started_at).total_seconds()), 0)
        incident.save(update_fields=("resolved_at", "duration_sec"))
        return incident
