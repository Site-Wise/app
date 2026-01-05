# Analytics Backend Requirements

## New PocketBase Collection: `analytics_settings`

### Purpose
Store saved filter configurations for tag-based cost analytics, allowing users to create reusable analysis templates.

### Schema

```javascript
{
  "name": "analytics_settings",
  "type": "base",
  "system": false,
  "schema": [
    {
      "name": "site",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "sites",
        "cascadeDelete": true,
        "maxSelect": 1
      }
    },
    {
      "name": "name",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 100
      }
    },
    {
      "name": "tag_ids",
      "type": "json",
      "required": false,
      "options": {}
    },
    {
      "name": "date_from",
      "type": "date",
      "required": false,
      "options": {}
    },
    {
      "name": "date_to",
      "type": "date",
      "required": false,
      "options": {}
    },
    {
      "name": "amount_min",
      "type": "number",
      "required": false,
      "options": {
        "min": 0
      }
    },
    {
      "name": "amount_max",
      "type": "number",
      "required": false,
      "options": {
        "min": 0
      }
    }
  ],
  "indexes": [
    "CREATE INDEX idx_analytics_settings_site ON analytics_settings (site)"
  ],
  "listRule": "@request.auth.id != '' && site.site_users.user ?= @request.auth.id",
  "viewRule": "@request.auth.id != '' && site.site_users.user ?= @request.auth.id",
  "createRule": "@request.auth.id != '' && site.site_users.user ?= @request.auth.id",
  "updateRule": "@request.auth.id != '' && site.site_users.user ?= @request.auth.id",
  "deleteRule": "@request.auth.id != '' && site.site_users.user ?= @request.auth.id"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | auto | ✓ | Unique identifier (auto-generated) |
| `site` | relation | ✓ | Reference to sites collection (cascade delete) |
| `name` | text | ✓ | User-defined name for this saved filter (1-100 chars) |
| `tag_ids` | json | ✗ | Array of tag IDs to filter by (e.g., `["tag1", "tag2"]`) |
| `date_from` | date | ✗ | Start date for delivery date range filter |
| `date_to` | date | ✗ | End date for delivery date range filter |
| `amount_min` | number | ✗ | Minimum total amount filter (≥ 0) |
| `amount_max` | number | ✗ | Maximum total amount filter (≥ 0) |
| `created` | auto | ✓ | Record creation timestamp |
| `updated` | auto | ✓ | Record last update timestamp |

### Security Rules

All rules enforce site-based multi-tenancy:
- **List/View**: User must be a member of the site (via `site_users`)
- **Create**: User must be a member of the site
- **Update**: User must be a member of the site
- **Delete**: User must be a member of the site

### Indexes

- `idx_analytics_settings_site`: Optimizes queries filtering by site

## Data Flow for Analytics Calculations

### Query Logic

1. **Filter Items by Tags**
   ```
   items WHERE tags ?~ tag_ids AND site = current_site
   ```

2. **Get Related Delivery Items**
   ```
   delivery_items WHERE item IN filtered_items AND site = current_site
   ```

3. **Filter by Delivery Date**
   ```
   JOIN deliveries ON delivery_items.delivery = deliveries.id
   WHERE deliveries.delivery_date >= date_from
     AND deliveries.delivery_date <= date_to
   ```

4. **Filter by Amount Range**
   ```
   WHERE delivery_items.total_amount >= amount_min
     AND delivery_items.total_amount <= amount_max
   ```

### Calculations

- **Total Cost**: `SUM(delivery_items.total_amount)`
- **Average Cost per Item**: `SUM(delivery_items.total_amount) / COUNT(DISTINCT delivery_items.item)`
- **Average Cost per Delivery**: `SUM(delivery_items.total_amount) / COUNT(DISTINCT delivery_items.delivery)`
- **Item Count**: `COUNT(DISTINCT delivery_items.item)`
- **Delivery Count**: `COUNT(DISTINCT delivery_items.delivery)`
- **Total Quantity**: `SUM(delivery_items.quantity)`

## Migration Steps

### 1. Create Collection via PocketBase Admin UI

1. Navigate to PocketBase Admin (http://localhost:8090/_/)
2. Go to "Collections" → "New Collection" → "Base Collection"
3. Name: `analytics_settings`
4. Add fields as per schema above
5. Set API rules as specified
6. Create index: `CREATE INDEX idx_analytics_settings_site ON analytics_settings (site)`

### 2. Verify Collection

Test with API calls:
```bash
# List analytics settings for a site
GET /api/collections/analytics_settings/records?filter=(site='SITE_ID')

# Create new setting
POST /api/collections/analytics_settings/records
{
  "site": "SITE_ID",
  "name": "Cement & Steel Analysis",
  "tag_ids": ["TAG_ID_1", "TAG_ID_2"],
  "date_from": "2024-01-01",
  "date_to": "2024-12-31"
}
```

## Frontend Service Implementation

The `analyticsService` in the frontend will:
- Use `getCurrentSiteId()` to auto-filter by current site
- Include `getById()` with site validation for cross-site access prevention
- Follow existing service patterns from `itemService`, `deliveryService`, etc.
- Handle JSON serialization for `tag_ids` field

## Testing Considerations

- Test cross-site access prevention (settings from Site A shouldn't be accessible from Site B)
- Test cascade delete (deleting a site should delete its analytics settings)
- Test permission enforcement (only site members can access)
- Test data calculations with various filter combinations
- Test edge cases (no tags selected, no date range, etc.)
