# Attachment Storage Guide

## Overview

This document describes the changes made to the attachment storage system and how to use the updated API endpoints.

## What Changed

### Database Storage Instead of External Storage

Previously, the system was designed to use external storage (S3) with presigned URLs. We've now changed it to store attachments directly in the PostgreSQL database using the `BYTEA` data type.

### Key Changes

1. **Database Schema**
   - Added `file_data bytea` column to `ticket_attachment` table
   - Made `storage_url` nullable (kept for backward compatibility)
   - Migration file: `sql/005_store_attachments_in_db.sql`

2. **API Endpoints**
   - Removed: `POST /tickets/:id/attachments/presign` (presigned URL generation)
   - Removed: `POST /tickets/:id/attachments/confirm` (confirmation after external upload)
   - Added: `POST /tickets/:id/attachments` (direct file upload)
   - Added: `GET /attachments/:id/download` (file download)
   - Updated: `POST /tickets` now supports optional attachments during ticket creation

3. **Service Layer**
   - New `uploadAttachment()` function stores files directly in database
   - New `getAttachmentData()` function retrieves file data for downloads
   - Removed presigned URL generation logic


## API Endpoints

### 1. Create Ticket with Optional Attachments

**Endpoint:** `POST /tickets`

Supports both JSON and multipart/form-data formats.

#### Option A: JSON (No Attachments)

```bash
curl -X POST http://localhost:3000/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "streamId": "123e4567-e89b-12d3-a456-426614174001",
    "subjectId": "123e4567-e89b-12d3-a456-426614174002",
    "priorityId": "123e4567-e89b-12d3-a456-426614174003",
    "statusId": "123e4567-e89b-12d3-a456-426614174004",
    "title": "New Ticket",
    "descriptionMd": "Ticket description",
    "assignedToUserId": "123e4567-e89b-12d3-a456-426614174005"
  }'
```

**Response:**
```json
{
  "id": "ticket-uuid",
  "projectId": "...",
  "title": "New Ticket",
  "descriptionMd": "Ticket description",
  ...other fields...,
  "attachments": []
}
```

#### Option B: Multipart/Form-Data (With Attachments)

```bash
curl -X POST http://localhost:3000/tickets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "projectId=123e4567-e89b-12d3-a456-426614174000" \
  -F "streamId=123e4567-e89b-12d3-a456-426614174001" \
  -F "subjectId=123e4567-e89b-12d3-a456-426614174002" \
  -F "priorityId=123e4567-e89b-12d3-a456-426614174003" \
  -F "statusId=123e4567-e89b-12d3-a456-426614174004" \
  -F "title=New Ticket with Attachment" \
  -F "descriptionMd=Ticket description with file" \
  -F "file1=@/path/to/file1.pdf" \
  -F "file2=@/path/to/file2.jpg"
```

**Response:**
```json
{
  "id": "ticket-uuid",
  "projectId": "...",
  "title": "New Ticket with Attachment",
  ...other fields...,
  "attachments": [
    {
      "id": "attachment-uuid-1",
      "ticketId": "ticket-uuid",
      "uploadedBy": "user-uuid",
      "fileName": "file1.pdf",
      "mimeType": "application/pdf",
      "fileSize": 12345,
      "storageUrl": null,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "attachment-uuid-2",
      "ticketId": "ticket-uuid",
      "uploadedBy": "user-uuid",
      "fileName": "file2.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 67890,
      "storageUrl": null,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. List Attachments for a Ticket

**Endpoint:** `GET /tickets/:id/attachments`

```bash
curl -X GET http://localhost:3000/tickets/TICKET_ID/attachments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
[
  {
    "id": "attachment-uuid",
    "ticketId": "ticket-uuid",
    "uploadedBy": "user-uuid",
    "fileName": "document.pdf",
    "mimeType": "application/pdf",
    "fileSize": 12345,
    "storageUrl": null,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### 3. Upload Attachment to Existing Ticket

**Endpoint:** `POST /tickets/:id/attachments`

```bash
curl -X POST http://localhost:3000/tickets/TICKET_ID/attachments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/file.pdf"
```

**Response:**
```json
{
  "id": "attachment-uuid",
  "ticketId": "ticket-uuid",
  "uploadedBy": "user-uuid",
  "fileName": "file.pdf",
  "mimeType": "application/pdf",
  "fileSize": 12345,
  "storageUrl": null,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 4. Download Attachment

**Endpoint:** `GET /attachments/:id/download`

```bash
curl -X GET http://localhost:3000/attachments/ATTACHMENT_ID/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output downloaded-file.pdf
```

**Response:**
- Content-Type: Based on file's mimeType
- Content-Disposition: `attachment; filename="original-filename.pdf"`
- Body: Binary file data

### 5. Delete Attachment

**Endpoint:** `DELETE /attachments/:id`

```bash
curl -X DELETE http://localhost:3000/attachments/ATTACHMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `204 No Content`

## Frontend Integration Guide

### React/TypeScript Example

#### 1. Create Ticket with Attachments

```typescript
interface CreateTicketData {
  projectId: string;
  streamId: string;
  subjectId: string;
  priorityId: string;
  statusId: string;
  title: string;
  descriptionMd?: string;
  assignedToUserId?: string;
}

interface CreateTicketWithFilesParams extends CreateTicketData {
  files?: File[];
}

async function createTicketWithAttachments(
  token: string,
  data: CreateTicketWithFilesParams
) {
  const { files, ...ticketData } = data;
  
  // If no files, use JSON
  if (!files || files.length === 0) {
    const response = await fetch('http://localhost:3000/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(ticketData),
    });
    return await response.json();
  }
  
  // If files exist, use FormData
  const formData = new FormData();
  
  // Add ticket fields
  Object.entries(ticketData).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  
  // Add files (field names: file1, file2, file3, etc.)
  files.forEach((file, index) => {
    formData.append(`file${index + 1}`, file);
  });
  
  const response = await fetch('http://localhost:3000/tickets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type - browser will set it with boundary
    },
    body: formData,
  });
  
  return await response.json();
}

// Usage
const ticket = await createTicketWithAttachments(token, {
  projectId: '123e4567-e89b-12d3-a456-426614174000',
  streamId: '123e4567-e89b-12d3-a456-426614174001',
  subjectId: '123e4567-e89b-12d3-a456-426614174002',
  priorityId: '123e4567-e89b-12d3-a456-426614174003',
  statusId: '123e4567-e89b-12d3-a456-426614174004',
  title: 'New Ticket',
  descriptionMd: 'Description',
  files: [file1, file2], // Optional
});
```

#### 2. Upload Attachment to Existing Ticket

```typescript
async function uploadAttachment(
  token: string,
  ticketId: string,
  file: File
) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(
    `http://localhost:3000/tickets/${ticketId}/attachments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }
  );
  
  return await response.json();
}
```

#### 3. Download Attachment

```typescript
async function downloadAttachment(
  token: string,
  attachmentId: string,
  fileName: string
) {
  const response = await fetch(
    `http://localhost:3000/attachments/${attachmentId}/download`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to download attachment');
  }
  
  const blob = await response.blob();
  
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```

#### 4. List Attachments

```typescript
async function listAttachments(token: string, ticketId: string) {
  const response = await fetch(
    `http://localhost:3000/tickets/${ticketId}/attachments`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  return await response.json();
}
```

#### 5. Delete Attachment

```typescript
async function deleteAttachment(token: string, attachmentId: string) {
  const response = await fetch(
    `http://localhost:3000/attachments/${attachmentId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  return response.status === 204;
}
```

### React Component Example

```typescript
import React, { useState } from 'react';

interface TicketFormProps {
  token: string;
  onSubmit: (ticket: any) => void;
}

function TicketForm({ token, onSubmit }: TicketFormProps) {
  const [formData, setFormData] = useState({
    projectId: '',
    streamId: '',
    subjectId: '',
    priorityId: '',
    statusId: '',
    title: '',
    descriptionMd: '',
    assignedToUserId: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const ticket = await createTicketWithAttachments(token, {
        ...formData,
        files: files.length > 0 ? files : undefined,
      });
      onSubmit(ticket);
    } catch (error) {
      console.error('Failed to create ticket:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />
      
      <textarea
        placeholder="Description"
        value={formData.descriptionMd}
        onChange={(e) => setFormData({ ...formData, descriptionMd: e.target.value })}
      />
      
      {/* Other form fields... */}
      
      <input
        type="file"
        multiple
        onChange={handleFileChange}
      />
      
      {files.length > 0 && (
        <div>
          <p>Selected files:</p>
          <ul>
            {files.map((file, index) => (
              <li key={index}>{file.name} ({(file.size / 1024).toFixed(2)} KB)</li>
            ))}
          </ul>
        </div>
      )}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Ticket'}
      </button>
    </form>
  );
}
```

### Axios Example

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

// Create ticket with attachments
const formData = new FormData();
formData.append('projectId', '...');
formData.append('streamId', '...');
formData.append('title', 'New Ticket');
formData.append('file1', file1);
formData.append('file2', file2);

const response = await api.post('/tickets', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Upload attachment
const attachmentFormData = new FormData();
attachmentFormData.append('file', file);

const attachment = await api.post(
  `/tickets/${ticketId}/attachments`,
  attachmentFormData
);

// Download attachment
const downloadResponse = await api.get(
  `/attachments/${attachmentId}/download`,
  {
    responseType: 'blob',
  }
);

// Create blob and download
const blob = new Blob([downloadResponse.data]);
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'filename.pdf';
link.click();
```

## Important Notes

### File Size Limits

- Maximum file size: **25 MB** per file (configured in `src/plugins/multipart.ts`)
- Maximum files per request: **5 files** (configured in `src/plugins/multipart.ts`)

### Content Types

The API automatically detects file MIME types. Common types:
- PDF: `application/pdf`
- Images: `image/jpeg`, `image/png`, `image/gif`
- Documents: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Text: `text/plain`

### Error Handling

```typescript
try {
  const ticket = await createTicketWithAttachments(token, data);
} catch (error: any) {
  if (error.response) {
    // API error response
    console.error('API Error:', error.response.data);
  } else if (error.request) {
    // Network error
    console.error('Network Error:', error.request);
  } else {
    // Other error
    console.error('Error:', error.message);
  }
}
```

### Backward Compatibility

- JSON requests without attachments continue to work as before
- Existing endpoints remain unchanged (list, delete)
- Only the upload flow has changed (no more presigned URLs)

## Migration Checklist

- [ ] Run database migration: `005_store_attachments_in_db.sql`
- [ ] Update frontend to use new multipart upload endpoints
- [ ] Remove any presigned URL generation logic from frontend
- [ ] Update file upload components to use FormData
- [ ] Test ticket creation with and without attachments
- [ ] Test attachment upload, download, and deletion
- [ ] Update API documentation/Swagger if needed

## Troubleshooting

### "No file provided" error
- Ensure the form field name is `file` (or `file1`, `file2`, etc. for multiple files)
- Check that Content-Type header is `multipart/form-data` (usually set automatically)

### "Attachment file data not found" error
- The attachment record exists but file_data is null
- This can happen if migration wasn't run or file wasn't uploaded properly

### File size errors
- Check file size limits (25 MB default)
- Consider compressing large files before upload

### CORS issues
- Ensure your API server allows multipart/form-data requests
- Check CORS configuration in `src/plugins/security.ts`

