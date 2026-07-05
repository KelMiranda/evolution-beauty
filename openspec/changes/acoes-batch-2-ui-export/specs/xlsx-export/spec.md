# Delta for xlsx-export

## ADDED Requirements

### Requirement: XLSX export format support

The system MUST support exporting participant data in XLSX (Excel) format in addition to the existing CSV format.

#### Scenario: Download filtered participant list as XLSX

- GIVEN an authenticated admin user is on the exportaciones page with active filters applied
- WHEN the user clicks the XLSX download button
- THEN the system MUST generate an Excel file containing the filtered participant records
- AND MUST return the file with correct MIME type (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
- AND MUST include the filename extension .xlsx in the Content-Disposition header

#### Scenario: XLSX export contains all visible columns

- GIVEN an authenticated admin user requests an XLSX export of the participant list
- WHEN the system generates the Excel file
- THEN the file MUST contain columns equivalent to the CSV export: ID, Código, Nombre completo, Documento, Nacimiento, Género, País, Prefijo, Número, Teléfono completo, Correo, Dirección, Municipio, Departamento, Distrito, Entidad, Función, Nivel educativo, Programa, Estado, Vigencia, Consentimiento, Creado

### Requirement: XLSX export filter parity with CSV

The system MUST apply the same filters to XLSX export as are applied to CSV export and the participant list view.

#### Scenario: Filtered XLSX export matches filtered list

- GIVEN an authenticated admin user has applied search, department, and status filters to the participant list
- WHEN the user exports the list as XLSX
- THEN the resulting Excel file MUST contain only records matching the active filters
- AND the record count MUST match the visible list count

#### Scenario: Empty filter set exports all eligible records

- GIVEN an authenticated admin user requests an XLSX export with no filters applied
- WHEN the system generates the Excel file
- THEN the file MUST contain all non-deleted participant records

### Requirement: XLSX export access control

The system MUST restrict XLSX export access to users with export permissions.

#### Scenario: Facilitadora cannot export XLSX

- GIVEN a user authenticated as facilitadora attempts to download an XLSX export
- WHEN the system evaluates the user's permissions
- THEN the system MUST deny the request with a 403 Forbidden response

#### Scenario: Unauthenticated export denied

- GIVEN a request for XLSX export without a valid authenticated session
- WHEN the system evaluates the request
- THEN the system MUST deny the request with a 401 Unauthorized response

### Requirement: XLSX file content formatting

The system SHOULD format the Excel output for readability with appropriate column widths and data formatting.

#### Scenario: Date fields formatted as dates in Excel

- GIVEN an XLSX export is generated with participant records containing date fields
- WHEN the Excel file is opened
- THEN birth_date and created_at columns SHOULD be formatted as date cells
- AND the display format SHOULD be YYYY-MM-DD

#### Scenario: Header row is bold

- GIVEN an XLSX export is generated
- WHEN the Excel file is opened
- THEN the first row containing column headers SHOULD be formatted with bold text

### Requirement: XLSX export includes metadata sheet

The system MAY include a metadata sheet in the XLSX export containing export timestamp and filter context.

#### Scenario: Export metadata available

- GIVEN an XLSX export is generated with filters applied
- WHEN the Excel file is opened
- THEN there SHOULD be a second sheet named "Metadata" or similar
- AND it SHOULD contain the export timestamp and active filter values

### Requirement: XLSX export shares query logic with CSV

The system MUST use the same filtered query logic for XLSX export as used for CSV export.

#### Scenario: Same records in CSV and XLSX

- GIVEN a filtered participant list is active
- WHEN an admin exports both CSV and XLSX formats
- THEN both files MUST contain the same set of participant records
- AND the records MUST be in the same order
