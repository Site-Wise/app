# Deprecated Features & Schema Items

This document tracks features, UI elements, and database schema items that are deprecated or scheduled for removal. These items should not be used in new development and will be removed in future versions.

## Status Levels

- **🟡 DEPRECATED** - Still functional but marked for removal
- **🔴 REMOVAL_PENDING** - Scheduled for removal in next major version
- **⚫ REMOVED** - No longer available

---

## UI Components & Fields

### Sites Management

#### Site.admin_user Field
- **Status**: 🟡 DEPRECATED
- **Location**: Site interface, database schema
- **Reason**: User-site relationships are properly handled through SiteUser table with roles
- **Date Deprecated**: 2025-06-23
- **Removal Target**: v0.2.0
- **Migration**: Use SiteUser table to query users with 'owner' role for a site
- **Impact**:
  - Remove `admin_user` field from Site interface
  - Update queries that check site ownership
  - Remove from site creation/update forms

#### Site.users Field
- **Status**: 🟡 DEPRECATED
- **Location**: Site interface, database schema
- **Reason**: User-site relationships are properly handled through SiteUser table with roles
- **Date Deprecated**: 2025-06-23
- **Removal Target**: v0.2.0
- **Migration**: Use SiteUser table to query all users associated with a site
- **Impact**:
  - Remove `users` field from Site interface
  - Update queries that fetch site users
  - Remove from site creation/update forms

### Tag System Overhaul

#### Service.tags Array Field
- **Status**: 🟡 DEPRECATED
- **Location**: Service interface, database schema
- **Reason**: JSON array storage prevents proper filtering, searching, and autocomplete functionality
- **Date Deprecated**: 2025-06-23
- **Removal Target**: v0.2.0
- **Migration**: Replace with relational Tag system (Service → ServiceTag ← Tag)
- **Impact**:
  - Replace `tags: string[]` with proper relationship table
  - Implement autocomplete UI with existing tags
  - Enable advanced filtering and search capabilities
  - Update service creation/editing forms

#### Service.category Enum Field  
- **Status**: 🟡 DEPRECATED
- **Location**: Service interface, database schema
- **Reason**: Should be unified with Tag system for consistent filtering across all entities
- **Date Deprecated**: 2025-06-23
- **Removal Target**: v0.2.0
- **Migration**: Convert categories to Tags in unified system
- **Impact**:
  - Replace hardcoded enum with flexible tag relationships
  - Maintain existing categories as default tags during migration
  - Update UI to use unified tag selector

#### Vendor.tags Array Field
- **Status**: 🟡 DEPRECATED
- **Location**: Vendor interface, database schema  
- **Reason**: JSON array storage prevents proper filtering and autocomplete - should use unified Tag system
- **Date Deprecated**: 2025-06-23
- **Removal Target**: v0.2.0
- **Migration**: Replace with relational Tag system (Vendor → VendorTag ← Tag)
- **Impact**:
  - Replace `tags: string[]` with proper relationship table
  - Implement autocomplete UI with existing vendor tags
  - Enable unified filtering across Services, Vendors, and Items
  - Update vendor creation/editing forms

### Items Management

#### Stock Quantity Field (item.quantity)
- **Status**: ⚫ REMOVED
- **Location**: Item creation/editing forms
- **Reason**: Field serves no practical purpose in construction site management context - actual inventory is tracked through delivery history
- **Date Deprecated**: 2025-06-23
- **Removal Target**: v0.2.0
- **Migration**: Remove field from forms, keep database column for data integrity
- **Impact**: 
  - Remove quantity input from `ItemsView.vue` creation form (lines 112-114)
  - Remove quantity display from `ItemDetailView.vue` (lines 45-47)
  - Update related tests
  - Form validation and reactive form object
  - **Note**: Keep delivery quantity calculations and "Total Delivered" statistics

#### Category Field (item.category)
- **Status**: ⚫ REMOVED
- **Location**: Item creation/editing forms, item display components
- **Reason**: Inconsistent implementation - Services use proper tags system, Items use simple string field
- **Date Deprecated**: 2025-06-23
- **Removal Target**: v0.2.0
- **Migration**: If categorization needed, implement tags system similar to Services
- **Impact**:
  - Remove category input from `ItemsView.vue` creation form (lines 122-124)
  - Remove category display from `ItemsView.vue` (lines 36-38)
  - Remove category display from `ItemDetailView.vue` (lines 48-51)
  - Update related tests and form validation

---

## Database Schema

### Sites Table

#### admin_user Column
- **Status**: 🟡 DEPRECATED
- **Table**: `sites`
- **Column**: `admin_user` (relation to users)
- **Reason**: User-site relationships are properly managed through `site_users` table
- **Date Deprecated**: 2025-06-23
- **Removal Target**: v3.0.0
- **Migration**: Use `site_users` table with role='owner' instead
- **Dependencies**: Site creation logic, ownership checks, UI components

#### users Column
- **Status**: 🟡 DEPRECATED  
- **Table**: `sites`
- **Column**: `users` (JSON array of user IDs)
- **Reason**: User-site relationships are properly managed through `site_users` table
- **Date Deprecated**: 2025-06-23
- **Removal Target**: v3.0.0
- **Migration**: Use `site_users` table for all user associations
- **Dependencies**: Site user management, permissions, UI components

### Services Table

#### tags Column
- **Status**: 🟡 DEPRECATED
- **Table**: `services`
- **Column**: `tags` (JSON array)
- **Reason**: JSON array prevents proper relationships, filtering, and autocomplete functionality
- **Date Deprecated**: 2025-06-23
- **Removal Target**: v3.0.0
- **Migration**: Replace with `tags` table + `tag_ids` relation field
- **Dependencies**: Service forms, filtering, search functionality

#### category Column (services)
- **Status**: 🟡 DEPRECATED
- **Table**: `services`
- **Column**: `category` (enum)
- **Reason**: Should be unified with relational Tag system for consistent filtering
- **Date Deprecated**: 2025-06-23
- **Removal Target**: v3.0.0
- **Migration**: Convert enum values to Tags in unified system
- **Dependencies**: Service forms, category filtering, UI components

### Vendors Table

#### tags Column (vendors)
- **Status**: 🟡 DEPRECATED
- **Table**: `vendors`
- **Column**: `tags` (JSON array)
- **Reason**: JSON array prevents proper relationships, filtering, and autocomplete functionality
- **Date Deprecated**: 2025-06-23
- **Removal Target**: v3.0.0
- **Migration**: Replace with `tags` table + `tag_ids` relation field
- **Dependencies**: Vendor forms, tag filtering, search functionality

### Items Table

#### quantity Column
- **Status**: ⚫ REMOVED
- **Table**: `items`
- **Column**: `quantity` (integer)
- **Reason**: Not relevant for construction material tracking workflow - actual inventory tracked through deliveries
- **Date Deprecated**: 2025-06-23
- **Removal Target**: v3.0.0 (allow buffer time for data migration)
- **Migration**: 
  - Phase 1: Remove from UI (current)
  - Phase 2: Stop writing to field
  - Phase 3: Remove column entirely
- **Dependencies**: 
  - UI forms
  - API endpoints
  - TypeScript interfaces
  - Test data

#### category Column
- **Status**: ⚫ REMOVED
- **Table**: `items`
- **Column**: `category` (string)
- **Reason**: Inconsistent with Services tags implementation - should use proper tagging system
- **Date Deprecated**: 2025-06-23
- **Removal Target**: v3.0.0
- **Migration**: 
  - Phase 1: Remove from UI (current)
  - Phase 2: If categorization needed, implement tags system similar to Services
  - Phase 3: Remove column entirely
- **Dependencies**: 
  - UI forms and displays
  - Search/filter functionality
  - TypeScript interfaces
  - Test data

---

## API Endpoints

_No deprecated API endpoints at this time._

---

## Configuration Options

_No deprecated configuration options at this time._

---

## Proposed Unified Tag System

### New Database Schema

#### Tags Table
```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT, -- For UI categorization
  type TEXT, -- 'service_category', 'specialty', 'item_category', 'custom'
  site TEXT NOT NULL, -- Site-specific tags
  usage_count INTEGER DEFAULT 0, -- For popularity-based autocomplete
  created DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Entity Schema Updates
```sql
-- Add tag_ids relation field to existing tables
ALTER TABLE services ADD COLUMN tag_ids TEXT; -- JSON array of tag IDs for PocketBase relations
ALTER TABLE vendors ADD COLUMN tag_ids TEXT;  -- JSON array of tag IDs for PocketBase relations  
ALTER TABLE items ADD COLUMN tag_ids TEXT;    -- JSON array of tag IDs for PocketBase relations

-- PocketBase will handle the relationships via expand functionality
-- No junction tables needed - simpler implementation
```

### Benefits of Unified Tag System

1. **Consistent Filtering**: Same tag system across Services, Vendors, and Items
2. **Autocomplete**: Reuse existing tags with popularity-based suggestions
3. **Advanced Search**: Query by multiple tags, tag combinations
4. **Data Integrity**: Proper foreign key relationships
5. **Analytics**: Track tag usage and popularity
6. **Flexible Categorization**: Mix predefined and custom tags
7. **Site Isolation**: Tags are site-specific for multi-tenancy

### Migration Strategy

1. **Phase 1**: Create new tag system tables
2. **Phase 2**: Migrate existing data:
   - Service categories → Tags with type='service_category'  
   - Service tags array → Individual tag records, map to tag_ids field
   - Vendor tags array → Tags with type='specialty', map to tag_ids field
   - Item categories → Tags with type='item_category', map to tag_ids field
3. **Phase 3**: Update UI to use unified tag selector component
4. **Phase 4**: Remove deprecated fields from schema

## Migration Guidelines

### For Developers

1. **Do not use deprecated features** in new code
2. **Update existing code** to avoid deprecated features when possible
3. **Check this document** before using any field or feature
4. **Update tests** when removing deprecated UI elements

### For Database Changes

1. **Never remove columns immediately** - follow phased approach
2. **Maintain data integrity** during deprecation period
3. **Create migration scripts** for data preservation
4. **Document rollback procedures**

### For UI Changes

1. **Remove deprecated fields** from forms first
2. **Update TypeScript interfaces** to mark fields as optional
3. **Update tests** to reflect UI changes
4. **Maintain backward compatibility** in data handling

---

## Cleanup Checklist

When removing deprecated items, ensure:

- [ ] All references removed from codebase
- [ ] Tests updated or removed
- [ ] Documentation updated
- [ ] TypeScript interfaces updated
- [ ] API documentation updated
- [ ] Migration scripts created (if needed)
- [ ] Rollback plan documented

---

*Last Updated: 2025-06-23*
*Next Review: 2025-02-23*