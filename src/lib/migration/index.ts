/**
 * PostalMate → ShipOS Migration Module
 *
 * This module handles importing data from a PostalMate Firebird database
 * backup (.7z file containing a Firebird gbak backup) into ShipOS.
 *
 * ## Architecture
 *
 * 1. Upload: User uploads .7z backup file
 * 2. Analyze: Extract and analyze the Firebird database, return record counts
 * 3. Configure: User selects what to import and conflict resolution strategy
 * 4. Migrate: Transform and insert data in batches with progress tracking
 * 5. Validate: Verify migrated data integrity
 * 6. Rollback: Optionally undo migration by deleting tagged records
 *
 * ## PostalMate Database
 *
 * - Engine: Firebird 2.5/3.0
 * - Format: gbak backup (TMPBCK file inside .7z archive)
 * - Encoding: WIN1252
 * - Key tables: CUSTOMER, SHIPTO, SHIPMENTXN, PACKAGEXN, PKGRECVXN,
 *               PRODUCT, CRTOTALXN, CRITEMXN, CRPAYMENTXN, MBDETAIL
 *
 * ## Schema Mapping
 *
 * PostalMate → ShipOS:
 * - CUSTOMER + MBDETAIL → Customer (with pmbNumber, status, renewalDate)
 * - SHIPTO → ShipToAddress (new model)
 * - SHIPMENTXN + PACKAGEXN → Shipment
 * - PKGRECVXN → Package
 * - PRODUCT → Product (future model)
 * - CRTOTALXN + CRITEMXN → Invoice
 *
 * All migrated records are tagged with a migrationId for rollback support.
 */

export * from './types';
export * from './engine';
