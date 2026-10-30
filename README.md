# Maintenance

## Production date and shift

Fetch the configured production date and shift for a line:

```http
GET /api/productionSupervisor/production-date-shift?lineId=1
```

The response data contains `ProdDate` and `ProdShift`.

## Unassigned production downtime

Fetch downtime records where both `LossID` and `SubLossID` are NULL or blank:

```http
GET /api/productionSupervisor/unassigned-downtime
```

For a local server using the default port:

```text
http://localhost:5000/api/productionSupervisor/unassigned-downtime
```

Update the assignment fields of a downtime record by `DowntimeID`. Other
downtime columns are left unchanged:

```http
PUT /api/productionSupervisor/downtime/:downtimeId
Content-Type: application/json
```

```json
{
  "lossId": 12,
  "subLossId": 3,
  "reason": "Updated downtime reason",
  "lastUpdatedTime": "2026-10-26T16:55:00.000Z",
  "userId": 42
}
```
