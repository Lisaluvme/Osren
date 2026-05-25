# Role-Based Workflow System - Architecture Design Document

## 📋 Executive Summary

Transforming the OSREN Integrated Operations Manager from a simple CRUD application into an enterprise-grade role-based workflow system with:
- Multi-role access control
- Document workflow lifecycles
- Customer acknowledgement system
- Complete audit trail
- Dynamic, permission-driven UI

---

## 🏗️ 1. DATABASE SCHEMA DESIGN

### 1.1 Core Tables

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  department VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
```

#### Roles Table
```sql
CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL, -- 'sales', 'accounts', 'logistic', 'manager', 'customer'
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  level INTEGER NOT NULL, -- For hierarchy: sales=1, accounts=2, logistic=3, manager=4, customer=5
  is_system_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Document Types Table
```sql
CREATE TABLE document_types (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL, -- 'quotation', 'invoice', 'delivery_order', 'purchase_order'
  display_name VARCHAR(100) NOT NULL,
  prefix VARCHAR(10) NOT NULL, -- 'QT', 'INV', 'DO', 'PO'
  description TEXT,
  requires_customer_acknowledgement BOOLEAN DEFAULT FALSE,
  default_workflow_steps JSONB, -- Workflow configuration
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Documents Table (Unified Schema)
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_id INTEGER NOT NULL REFERENCES document_types(id),
  document_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  
  -- Customer/Vendor Information
  customer_id UUID,
  vendor_id UUID,
  
  -- Workflow Status
  status_id INTEGER NOT NULL REFERENCES document_statuses(id),
  previous_status_id INTEGER REFERENCES document_statuses(id),
  
  -- Ownership
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  
  -- Content
  data JSONB DEFAULT '{}', -- Flexible field storage per document type
  line_items JSONB DEFAULT '[]', -- Array of line items
  
  -- Financials
  subtotal DECIMAL(15,2),
  tax_amount DECIMAL(15,2),
  discount_amount DECIMAL(15,2),
  total_amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MYR',
  
  -- Dates
  issue_date DATE,
  due_date DATE,
  valid_until DATE,
  
  -- Customer Acknowledgement
  sent_to_customer_at TIMESTAMP,
  customer_acknowledged_at TIMESTAMP,
  customer_acknowledgement_action VARCHAR(20), -- 'approved', 'rejected'
  customer_signature_data TEXT,
  customer_ip_address INET,
  customer_comments TEXT,
  
  -- Internal
  internal_notes TEXT,
  rejection_reason TEXT,
  
  -- Timestamps
  approved_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_documents_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_documents_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  
  CHECK (total_amount >= 0)
);

CREATE INDEX idx_documents_type_status ON documents(document_type_id, status_id);
CREATE INDEX idx_documents_customer ON documents(customer_id);
CREATE INDEX idx_documents_assigned_to ON documents(assigned_to);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_number ON documents(document_number);
CREATE INDEX idx_documents_status_date ON documents(status_id, created_at);
```

#### Document Status Table
```sql
CREATE TABLE document_statuses (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL, -- 'draft', 'pending_review', 'sent_to_customer', 'approved', 'rejected', 'converted', 'completed'
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'initial', 'in_progress', 'final', 'cancelled'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Workflow Transitions Table
```sql
CREATE TABLE workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  from_status_id INTEGER NOT NULL REFERENCES document_statuses(id),
  to_status_id INTEGER NOT NULL REFERENCES document_statuses(id),
  
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_for_role_id INTEGER REFERENCES roles(id),
  
  action_type VARCHAR(50) NOT NULL, -- 'approve', 'reject', 'submit', 'request_revision', 'convert'
  comments TEXT,
  
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  
  transitioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_forward_movement CHECK (
    EXISTS (SELECT 1 FROM document_statuses fs WHERE fs.id = from_status_id AND fs.category != 'final')
  )
);

CREATE INDEX idx_workflow_transitions_document ON workflow_transitions(document_id);
CREATE INDEX idx_workflow_transitions_performed_by ON workflow_transitions(performed_by);
CREATE INDEX idx_workflow_transitions_date ON workflow_transitions(transitioned_at);
```

#### Customer Acknowledgements Table
```sql
CREATE TABLE customer_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  
  action VARCHAR(20) NOT NULL, -- 'approved', 'rejected'
  signature_data TEXT,
  
  comments TEXT,
  ip_address INET,
  user_agent TEXT,
  
  acknowledged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(document_id) -- One acknowledgement per document
);
```

#### Audit Logs Table
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  entity_type VARCHAR(50) NOT NULL, -- 'document', 'user', 'role', 'customer'
  entity_id UUID NOT NULL,
  
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'approve', 'reject', 'login', etc.
  action_category VARCHAR(50), -- 'crud', 'workflow', 'auth', 'system'
  
  performed_by UUID REFERENCES users(id),
  performed_as_role_id INTEGER REFERENCES roles(id),
  
  old_values JSONB,
  new_values JSONB,
  
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_session ON audit_logs(session_id);
```

#### Line Items Table
```sql
CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  
  discount_type VARCHAR(20) DEFAULT 'percentage', -- 'percentage', 'fixed'
  discount_value DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  
  line_total DECIMAL(15,2) GENERATED ALWAYS AS (
    (quantity * unit_price) * 
    (1 - CASE WHEN discount_type = 'percentage' THEN discount_value / 100 ELSE discount_value END) * 
    (1 + tax_rate / 100)
  ) STORED,
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_line_items_document ON line_items(document_id);
CREATE INDEX idx_line_items_product ON line_items(product_id);
```

#### Permissions Table (Dynamic RBAC)
```sql
CREATE TABLE permissions (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'document', 'workflow', 'system', 'report'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Role Permissions Table
```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  permission_id VARCHAR(100) NOT NULL REFERENCES permissions(id),
  
  can_create BOOLEAN DEFAULT FALSE,
  can_read BOOLEAN DEFAULT TRUE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  
  conditions JSONB, -- Additional conditions: {"document_type": "quotation", "status": "draft"}
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
```

#### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_variance(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  type VARCHAR(50) NOT NULL, -- 'workflow_update', 'awaiting_approval', 'document_rejected', 'system'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  action_url VARCHAR(500),
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  expires_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
```

---

## 🔀 2. WORKFLOW STATE MACHINE DEFINITION

### 2.1 Document Types and Their Workflows

#### Quotation Workflow
```yaml
name: Quotation
prefix: QT
customer_facing: true

workflow_states:
  draft:
    label: "Draft"
    category: initial
    allowed_roles: [sales]
    transitions:
      - to: pending_review
        trigger: submit
        allowed_roles: [sales]
        requires_comment: false
        
  pending_review:
    label: "Pending Review"
    category: in_progress
    allowed_roles: [sales, manager]
    transitions:
      - to: draft
        trigger: request_revision
        allowed_roles: [manager]
        requires_comment: true
      - to: sent_to_customer
        trigger: approve
        allowed_roles: [manager]
        requires_approval: true
        
  sent_to_customer:
    label: "Sent to Customer"
    category: in_progress
    allowed_roles: [manager, sales]
    transitions:
      - to: approved
        trigger: customer_approve
        requires_customer_action: true
      - to: rejected
        trigger: customer_reject
        requires_customer_action: true
        requires_comment: true
        
  approved:
    label: "Customer Approved"
    category: final
    allowed_roles: [manager, sales, accounts]
    transitions:
      - to: converted
        trigger: convert_to_invoice
        allowed_roles: [accounts]
        requires_comment: false
      - to: completed
        trigger: complete
        allowed_roles: [manager]
        requires_comment: true
        
  rejected:
    label: "Customer Rejected"
    category: cancelled
    allowed_roles: [manager, sales]
    transitions:
      - to: draft
        trigger: revise
        allowed_roles: [sales, manager]
        requires_comment: true
        
  converted:
    label: "Converted to Invoice"
    category: final
    allowed_roles: [manager, accounts]
    transitions:
      - to: completed
        trigger: complete
        allowed_roles: [manager]
        
  completed:
    label: "Completed"
    category: final
    allowed_roles: [manager]
    transitions: []
```

#### Invoice Workflow
```yaml
name: Invoice
prefix: INV
customer_facing: true

workflow_states:
  draft:
    label: "Draft"
    category: initial
    allowed_roles: [accounts]
    transitions:
      - to: pending_approval
        trigger: submit
        allowed_roles: [accounts]
        
  pending_approval:
    label: "Pending Approval"
    category: in_progress
    allowed_roles: [accounts, manager]
    transitions:
      - to: draft
        trigger: reject
        allowed_roles: [manager]
        requires_comment: true
      - to: approved
        trigger: approve
        allowed_roles: [manager]
        requires_approval: true
        
  approved:
    label: "Approved"
    category: final
    allowed_roles: [accounts, manager]
    transitions:
      - to: sent
        trigger: send_to_customer
        allowed_roles: [accounts]
      - to: paid
        trigger: record_payment
        allowed_roles: [accounts]
        
  sent:
    label: "Sent to Customer"
    category: in_progress
    allowed_roles: [accounts]
    transitions:
      - to: paid
        trigger: customer_paid
        requires_customer_action: true
        
  paid:
    label: "Paid"
    category: final
    allowed_roles: [accounts]
    transitions:
      - to: completed
        trigger: complete
        allowed_roles: [manager]
        
  completed:
    label: "Completed"
    category: final
    allowed_roles: [manager]
    transitions: []
```

#### Delivery Order Workflow
```yaml
name: Delivery Order
prefix: DO
customer_facing: true

workflow_states:
  draft:
    label: "Draft"
    category: initial
    allowed_roles: [logistic, sales]
    transitions:
      - to: pending_approval
        trigger: submit
        allowed_roles: [logistic]
        
  pending_approval:
    label: "Pending Approval"
    category: in_progress
    allowed_roles: [logistic, manager]
    transitions:
      - to: draft
        trigger: reject
        allowed_roles: [manager]
        requires_comment: true
      - to: approved
        trigger: approve
        allowed_roles: [manager]
        requires_approval: true
        
  approved:
    label: "Approved"
    category: final
    allowed_roles: [logistic, sales]
    transitions:
      - to: out_for_delivery
        trigger: assign_driver
        allowed_roles: [logistic]
        
  out_for_delivery:
    label: "Out for Delivery"
    category: in_progress
    allowed_roles: [logistic, driver]
    transitions:
      - to: delivered
        trigger: confirm_delivery
        allowed_roles: [driver]
        requires_customer_action: true
        requires_proof: true
        
  delivered:
    label: "Delivered"
    category: final
    allowed_roles: [logistic, driver]
    transitions:
      - to: completed
        trigger: complete
        allowed_roles: [logistic, manager]
        
  completed:
    label: "Completed"
    category: final
    allowed_roles: [manager]
    transitions: []
```

### 2.2 State Transition Rules

#### General Rules
```yaml
forward_only:
  - Cannot skip states (must follow sequence)
  - Cannot move from 'final' category states
  - Can move backward only if explicitly allowed
  
approval_requirements:
  - Manager approval required: quotation (>RM10,000), any amount (invoice)
  - Automatic approval: quotation (≤RM10,000) by senior sales
  
customer_action:
  - Customer acknowledgement creates immutable record
  - Cannot be edited by internal users after customer action
  
deadlines:
  - Auto-remind if pending > 3 days
  - Auto-escalate to manager if pending > 7 days
```

---

## 🔐 3. ROLE-BASED ACCESS CONTROL (RBAC)

### 3.1 Role Definitions and Permissions Matrix

#### Sales Role
```yaml
name: sales
level: 1
display_name: Sales Representative

dashboard_access:
  - view: sales_dashboard
  - widgets: [my_quotations, pending_conversions, sales_targets, leads_to_follow]

document_permissions:
  quotation:
    create: true
    edit: [draft, pending_review, rejected]
    delete: [draft, rejected]
    view: all
    submit_for_review: true
    convert_to_invoice: false
  
  invoice:
    create: false
    edit: false
    delete: false
    view: own_only
  
  delivery_order:
    create: false
    edit: false
    delete: false
    view: all
    track_status: true

actions:
  - create_quotation
  - update_quotation (draft only)
  - submit_for_approval
  - view_all_quotations
  - view_own_performance_metrics
  - manage_customer_leads

ui_restrictions:
  - hide: finance_tab, accounts_tab, user_management
  - read_only_fields: ['approved_amount', 'profit_margin']
```

#### Accounts Role
```yaml
name: accounts
level: 2
display_name: Accounts Officer

dashboard_access:
  - view: accounts_dashboard
  - widgets: [pending_invoices, payment_tracking, overdue_accounts, cash_flow]

document_permissions:
  invoice:
    create: true
    edit: [draft, pending_approval]
    delete: [draft]
    view: all
    approve_payment: true
  
  quotation:
    create: false
    edit: false
    delete: false
    view: all
    convert_to_invoice: true
  
  delivery_order:
    create: false
    edit: false
    delete: false
    view: all

actions:
  - create_invoice
  - update_invoice (draft, pending)
  - approve_payments
  - convert_quotation_to_invoice
  - view_payment_status
  - manage_receivables
  - record_payments

ui_restrictions:
  - hide: sales_tab, logistic_tab, warehouse_tab
  - read_only_fields: ['customer_notes', 'sales_commission']
```

#### Logistic Role
```yaml
name: logistic
level: 3
display_name: Logistics Coordinator

dashboard_access:
  - view: logistics_dashboard
  - widgets: [pending_deliveries, in_transit, delivery_performance, driver_status]

document_permissions:
  delivery_order:
    create: true
    edit: [draft, pending_approval, out_for_delivery]
    delete: [draft]
    view: all
    update_delivery_status: true
    assign_driver: true
  
  quotation:
    create: false
    edit: false
    delete: false
    view: all
    prepare_for_delivery: false
  
  invoice:
    create: false
    edit: false
    delete: false
    view: all

actions:
  - create_delivery_order
  - assign_drivers
  - update_delivery_status
  - view_delivery_schedule
  - generate_delivery_manifest
  - confirm_delivery_completion

ui_restrictions:
  - hide: finance_tab, sales_tab, accounts_tab
  - read_only_fields: ['profit_margin', 'cost_price']
```

#### Manager Role
```yaml
name: manager
level: 4
display_name: Operations Manager

dashboard_access:
  - view: executive_dashboard
  - widgets: [all_widgets, system_overview, team_performance, pending_approvals]

document_permissions:
  all_types:
    create: true
    edit: all_except_final
    delete: [draft, rejected]
    view: all
  special: can_override_any_approval

actions:
  - approve_any_document
  - reject_any_document
  - override_delegated_approvals
  - convert_documents
  - assign_reassign_tasks
  - view_all_reports
  - manage_users
  - modify_permissions

ui_restrictions:
  - access: all_tabs
  - all_fields: editable
```

#### Customer Role (External)
```yaml
name: customer
level: 5
display_name: Customer (External)

dashboard_access:
  - view: customer_portal
  - widgets: [my_orders, pending_approvals, order_history]

document_permissions:
  quotation:
    create: false
    edit: false
    delete: false
    view: own_only
    approve: true
    reject: true
  
  invoice:
    create: false
    edit: false
    delete: false
    view: own_only
    pay: true

actions:
  - view_assigned_documents
  - approve_reject_own_orders
  - add_comments
  - view_payment_history
  - download_documents

ui_restrictions:
  - access: customer_portal_only
  - no_internal_tabs
  - read_only_fields: ['internal_notes', 'cost_breakdown']
```

### 3.2 Permission Implementation Matrix

```sql
-- Role permissions lookup table
CREATE TABLE role_workflow_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  document_type_id INTEGER NOT NULL REFERENCES document_types(id),
  
  can_create BOOLEAN DEFAULT FALSE,
  can_view_own_only BOOLEAN DEFAULT FALSE,
  can_edit_drafts BOOLEAN DEFAULT FALSE,
  can_edit_submitted BOOLEAN DEFAULT FALSE,
  can_delete_drafts BOOLEAN DEFAULT FALSE,
  can_delete_submitted BOOLEAN DEFAULT FALSE,
  
  can_submit_for_review BOOLEAN DEFAULT FALSE,
  can_approve BOOLEAN DEFAULT FALSE,
  can_reject BOOLEAN DEFAULT FALSE,
  can_convert BOOLEAN DEFAULT FALSE,
  can_complete BOOLEAN DEFAULT FALSE,
  
  can_send_to_customer BOOLEAN DEFAULT FALSE,
  can_receive_customer_response BOOLEAN DEFAULT FALSE,
  
  view_all BOOLEAN DEFAULT FALSE,
  view_team_only BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(role_id, document_type_id)
);
```

---

## 🎨 4. FRONTEND ARCHITECTURE

### 4.1 Component Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── MainLayout.tsx          # Main app wrapper
│   │   ├── Sidebar.tsx             # Dynamic navigation
│   │   ├── TopBar.tsx              # Header with user info
│   │   └── RoleSwitcher.tsx         # Demo role switcher
│   │
│   ├── auth/
│   │   ├── LoginForm.tsx           # Login page
│   │   ├── ProtectedRoute.tsx      # Route guard
│   │   └── RequirePermission.tsx   # Component guard
│   │
│   ├── dashboard/
│   │   ├── index.tsx               # Dashboard router
│   │   ├── SalesDashboard.tsx      # Sales view
│   │   ├── AccountsDashboard.tsx   # Accounts view
│   │   ├── LogisticDashboard.tsx   # Logistic view
│   │   ├── ManagerDashboard.tsx    # Manager view
│   │   └── CustomerPortal.tsx     # Customer portal
│   │
│   ├── documents/
│   │   ├── DocumentList.tsx         # Listing with filters
│   │   ├── DocumentForm.tsx         # Create/edit form
│   │   ├── DocumentView.tsx         # Detail view
│   │   ├── DocumentActions.tsx     # Workflow action buttons
│   │   ├── CustomerAckPanel.tsx    # Customer acknowledgement
│   │   └── WorkflowTimeline.tsx    # Visual workflow progress
│   │
│   └── common/
│       ├── StatusBadge.tsx
│       ├── ActivityFeed.tsx
│       ├── AuditLogViewer.tsx
│       ├── SignatureCanvas.tsx
│       └── DocumentPreview.tsx
│
├── hooks/
│   ├── useAuth.ts                 # Authentication hook
│   ├── usePermissions.ts          # Permission checker
│   ├── useWorkflow.ts             # Workflow operations
│   ├── useDocuments.ts            # Document CRUD
│   ├── useAudit.ts                # Audit logging
│   └── useDashboard.ts            # Dashboard data
│
├── services/
│   ├── api/
│   │   ├── authApi.ts
│   │   ├── documentApi.ts
│   │   ├── workflowApi.ts
│   │   ├── auditApi.ts
│   │   └── dashboardApi.ts
│   │
│   └── workflow/
│       ├── stateMachine.ts         # Workflow definitions
│       ├── transitionRules.ts      # Business rules
│       └── validators.ts           # Workflow validation
│
├── contexts/
│   ├── AuthContext.tsx            # User auth context
│   ├── PermissionContext.tsx      # Permission provider
│   └── WorkflowContext.tsx        # Workflow state
│
├── lib/
│   ├── permissions.ts             # Permission definitions
│   ├── workflow.ts                # Workflow engine
│   └── constants.ts
│
└── types/
    ├── document.ts
    ├── workflow.ts
    ├── audit.ts
    └── dashboard.ts
```

### 4.2 State Management Architecture

```typescript
// Redux Store Structure
interface RootState {
  auth: {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    permissions: Permission[];
    currentRole: Role;
  };
  
  documents: {
    items: Document[];
    selectedDocument: Document | null;
    filters: DocumentFilters;
    pagination: PaginationMeta;
    isLoading: boolean;
  };
  
  workflow: {
    transitions: WorkflowTransition[];
    availableActions: WorkflowAction[];
    currentStatus: DocumentStatus;
  };
  
  audit: {
    logs: AuditLog[];
    filters: AuditFilters;
  };
  
  notifications: {
    items: Notification[];
    unreadCount: number;
  };
  
  dashboard: {
    metrics: DashboardMetrics;
    role: DashboardRole;
  };
}
```

---

## 🔌 5. API DESIGN

### 5.1 Document Endpoints

```yaml
/documents:
  # List documents with role-based filtering
  get:
    summary: Fetch documents
    tags: [Documents]
    parameters:
      - name: type
        in: query
        schema:
          type: string
          enum: [quotation, invoice, delivery_order, purchase_order]
      - name: status
        in: query
        schema:
          type: string
      - name: assigned_to_me
        in: query
        type: boolean
      - name: created_by_me
        in: query
        type: boolean
    responses:
      200:
        description: List of documents
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: array
                  items:
                    $ref: '#/components/schemas/Document'
                pagination:
                  $ref: '#/components/schemas/Pagination'
    security:
      - bearerAuth: []

  # Create new document
  post:
    summary: Create document
    tags: [Documents]
    security:
      - bearerAuth: []
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [document_type_id, title, line_items]
            properties:
              document_type_id:
                type: integer
              title:
                type: string
              customer_id:
                type: string
                format: uuid
              line_items:
                type: array
                items:
                  $ref: '#/components/schemas/LineItem'
    responses:
      201:
        description: Document created
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  $ref: '#/components/schemas/Document'
      401:
        description: Unauthorized
      403:
        description: Forbidden - insufficient permissions

/documents/{id}:
  # Get single document
  get:
    summary: Get document details
    tags: [Documents]
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    responses:
      200:
        description: Document details
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  allOf:
                    - $ref: '#/components/schemas/Document'
                    - type: object
                      properties:
                        workflow_history:
                          type: array
                          items:
                            $ref: '#/components/schemas/WorkflowTransition'
                        available_actions:
                          type: array
                          items:
                            type: string
      404:
        description: Document not found
      403:
        description: Forbidden - no access

  # Update document
  put:
    summary: Update document
    tags: [Documents]
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              title:
                type: string
              customer_id:
                type: string
                format: uuid
              line_items:
                type: array
              data:
                type: object
    responses:
      200:
        description: Document updated
      400:
        description: Invalid update - document locked/not editable
      403:
        description: Forbidden - no permission

  # Delete document
  delete:
    summary: Delete document
    tags: [Documents]
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
    responses:
      200:
        description: Document deleted
      400:
        description: Cannot delete document in current status
      403:
        description: Forbidden - no permission
```

### 5.2 Workflow Endpoints

```yaml
/documents/{id}/workflow:
  # Get workflow history
  get:
    summary: Get document workflow history
    tags: [Workflow]
    responses:
      200:
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: array
                  items:
                    $ref: '#/components/schemas/WorkflowTransition'

/documents/{id}/transition:
  # Execute workflow transition
  post:
    summary: Transition document status
    tags: [Workflow]
    security:
      - bearerAuth: []
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [to_status_id]
            properties:
              to_status_id:
                type: integer
              comments:
                type: string
              notify_customer:
                type: boolean
                default: false
    responses:
      200:
        description: Transition successful
      400:
        description: Invalid transition
      403:
        description: Forbidden - not authorized for this transition

/documents/{id}/approve:
  # Shortcut approval endpoint
  post:
    summary: Approve document
    tags: [Workflow]
    security:
      - bearerAuth: []
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              comments:
                type: string
    responses:
      200:
        description: Document approved

/documents/{id}/reject:
  # Shortcut rejection endpoint
  post:
    summary: Reject document
    tags: [Workflow]
    security:
      - bearerAuth: []
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [reason]
            properties:
              reason:
                type: string
    responses:
      200:
        description: Document rejected
```

### 5.3 Customer Acknowledgement Endpoints

```yaml
/documents/{id}/send-to-customer:
  post:
    summary: Send document to customer
    tags: [Customer]
    security:
      - bearerAuth: []
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [customer_email]
            properties:
              customer_email:
                type: string
                format: email
              customer_name:
                type: string
              message:
                type: string
              expiry_days:
                type: integer
                default: 7
    responses:
      200:
        description: Document sent to customer
      400:
        description: Invalid state for customer action

/customer/documents/{token}:
  get:
    summary: Customer view document
    tags: [Customer]
    parameters:
      - name: token
        in: path
        required: true
        type: string
    responses:
      200:
        description: Document details for customer
        content:
          text/html:
            schema:
              type: string

  /customer/documents/{token}/acknowledge:
  post:
    summary: Customer acknowledge action
    tags: [Customer]
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [action]
            properties:
              action:
                type: string
                enum: [approved, rejected]
              signature:
                type: string
                format: base64
              comments:
                type: string
              customer_name:
                type: string
    responses:
      200:
        description: Acknowledgement recorded
      400:
        description: Invalid acknowledgement data
```

### 5.4 Audit Endpoints

```yaml
/audit:
  get:
    summary: Get audit logs
    tags: [Audit]
    security:
      - bearerAuth: []
    parameters:
      - name: entity_type
        in: query
        type: string
      - name: entity_id
        in: query
        type: string
        format: uuid
      - name: action
        in: query
        type: string
      - name: user_id
        in: query
        type: string
        format: uuid
      - name: from_date
        in: query
        type: string
        format: date-time
      - name: to_date
        in: query
        type: string
        format: date-time
      - name: limit
        in: query
        type: integer
        default: 100
      - name: offset
        in: query
        type: integer
        default: 0
    responses:
      200:
        description: Audit logs
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: array
                  items:
                    $ref: '#/components/schemas/AuditLog'
                pagination:
                  type: object

  /audit/export:
    get:
    summary: Export audit logs
    tags: [Audit]
    security:
      - bearerAuth: []
    parameters:
      - name: entity_type
        in: query
      - name: from_date
        in: query
    responses:
      200:
        description: CSV export
        content:
          text/csv
```

---

## 🎭 6. FRONTEND DYNAMIC UI BEHAVIOR

### 6.1 Role-Based Dashboard Routing

```typescript
// Dashboard routing based on role
const DASHBOARD_ROUTES: Record<Role, string> = {
  [Role.SALES]: '/dashboard/sales',
  [Role.ACCOUNTS]: '/dashboard/accounts',
  [Role.LOGISTIC]: '/dashboard/logistic',
  [Role.MANAGER]: '/dashboard/manager',
  [Role.CUSTOMER]: '/portal/customer'
};

// Protected route wrapper
const ProtectedRoute: React.FC<{
  allowedRoles?: Role[];
  requirePermission?: string;
  children: React.ReactNode;
}> = ({ allowedRoles, requirePermission, children }) => {
  const { isAuthenticated, user, userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const location = useLocation();

  // Check authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check permission authorization
  if (requirePermission && !hasPermission(requirePermission)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
};
```

### 6.2 Dynamic Component Rendering

```typescript
// Document actions component - role-aware
const DocumentActions: React.FC<{ document: Document }> = ({ document }) => {
  const { userRole } = useAuth();
  const { canTransition, getAvailableActions } = useWorkflow();

  const actions = getAvailableActions(document, userRole);

  return (
    <div className="flex gap-2">
      {actions.map(action => (
        <Button
          key={action.type}
          onClick={() => handleAction(action)}
          disabled={action.disabled}
          variant={action.variant}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
};

// Usage in document view
<DocumentActions
  document={document}
  actions={{
    canSubmit: { roles: [Role.SALES], status: ['draft'] },
    canApprove: { roles: [Role.MANAGER], status: ['pending_review'] },
    canReject: { roles: [Role.MANAGER], status: ['pending_review', 'sent_to_customer'] },
    canConvert: { roles: [Role.ACCOUNTS], status: ['approved'] }
  }}
/>
```

### 6.3 Sidebar Navigation

```typescript
const NavigationSidebar: React.FC = () => {
  const { userRole } = useAuth();

  const MENU_ITEMS = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: [Role.SALES, Role.ACCOUNTS, Role.LOGISTIC, Role.MANAGER],
      path: '/dashboard'
    },
    {
      id: 'quotations',
      label: 'Quotations',
      icon: FileText,
      roles: [Role.SALES, Role.MANAGER],
      path: '/documents/quotation',
      permissions: ['view:quotations']
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: Receipt,
      roles: [Role.ACCOUNTS, Role.MANAGER],
      path: '/documents/invoice',
      permissions: ['view:invoices']
    },
    {
      id: 'deliveries',
      label: 'Deliveries',
      icon: Truck,
      roles: [Role.LOGISTIC, Role.MANAGER, Role.DRIVER],
      path: '/documents/delivery_order',
      permissions: ['view:deliveries']
    }
  ];

  const visibleItems = MENU_ITEMS.filter(item =>
    item.roles.includes(userRole) &&
    (!item.permissions || hasAnyPermission(item.permissions))
  );

  return (
    <Sidebar>
      {visibleItems.map(item => (
        <SidebarItem key={item.id} {...item} />
      ))}
    </Sidebar>
  );
};
```

---

## 📊 7. DASHBOARD WIDGETS BY ROLE

### 7.1 Sales Dashboard Widgets
```typescript
const SalesDashboard: React.FC = () => {
  return (
    <DashboardGrid>
      <Widget title="My Quotations" metric="count" filters={{created_by_me: true}} />
      <Widget title="Pending Conversions" metric="value" />
      <Widget title="Sales This Month" metric="target" />
      <Widget title="Top Customers" metric="list" />
      <Widget title="Leads to Follow" metric="tasks" />
    </DashboardGrid>
  );
};
```

### 7.2 Manager Dashboard Widgets
```typescript
const ManagerDashboard: React.FC = () => {
  return (
    <DashboardGrid>
      <Widget title="Pending Approvals" metric="count" filters={{status: 'pending_review'}} />
      <Widget title="All Documents by Status" metric="chart" type="donut" />
      <Widget title="Team Performance" metric="comparison" />
      <Widget title="Overdue Items" metric="alert" level="warning" />
      <Widget title="Recent Activities" metric="feed" />
      <Widget title="Revenue Overview" metric="chart" type="line" />
    </DashboardGrid>
  );
};
```

---

## 🎯 8. IMPLEMENTATION PHASES

### Phase 1: Database & Core Services (Week 1)
- Set up PostgreSQL database
- Create all tables
- Implement workflow state machine in backend
- Create authentication service
- Set up middleware structure

### Phase 2: Backend API (Week 2)
- Implement all document endpoints
- Implement workflow transition API
- Implement audit logging middleware
- Implement permission checking
- Create customer acknowledgement endpoints

### Phase 3: Frontend Foundation (Week 3)
- Set up Redux store structure
- Implement authentication flow
- Create permission checking hooks
- Create workflow hooks
- Set up routing structure

### Phase 4: UI Components (Week 4)
- Create role-based dashboard components
- Create document list/form/view components
- Implement workflow action components
- Create customer acknowledgement panel
- Create audit log viewer

### Phase 5: Integration (Week 5)
- Connect frontend to backend APIs
- Implement workflow transitions in UI
- Add customer acknowledgement flow
- Test all role-based access controls
- Add audit trail everywhere

### Phase 6: Testing & Refinement (Week 6)
- End-to-end workflow testing
- Role-based access testing
- Customer acknowledgement testing
- Performance optimization
- Security audit

---

## 🔒 9. SECURITY CONSIDERATIONS

### 9.1 Authentication
- JWT with short expiry (15 minutes for access token)
- Refresh token rotation
- Secure password hashing (bcrypt with salt rounds 12)
- Session management with IP tracking
- Account lockout after failed attempts

### 9.2 Authorization
- Permission checks on BOTH frontend AND backend
- Never rely on frontend permissions alone
- Document-level access control (ownership + role)
- Audit log for all permission denials

### 9.3 Workflow Security
- State transition validation
- Role-based transition restrictions
- Customer actions create immutable records
- Audit trail for all workflow changes

### 9.4 Customer Portal
- Time-limited access tokens (7 days expiry)
- IP address tracking
- One-time signature capture
- HTTPS required for production

---

## 📈 10. SCALING CONSIDERATIONS

### 10.1 Database Performance
- Proper indexing on frequently queried fields
- Partitioning for large audit tables (by date)
- Connection pooling (max 20 connections)
- Query optimization for document lists

### 10.2 Frontend Performance
- Memoization for expensive computations
- Virtual scrolling for large lists
- Lazy loading for dashboard widgets
- Optimistic updates for better UX

### 10.3 API Performance
- Pagination for all list endpoints (max 50 per page)
- Caching for frequently accessed data
- Rate limiting (100 requests/minute per user)
- Background job for customer notifications

---

## 🚀 11. MIGRATION STRATEGY

### 11.1 Data Migration
1. **Backup existing data** - Full database backup
2. **Create migration scripts** - Map existing fields to new schema
3. **Dry-run migrations** - Test with sample data
4. **Execute migrations** - Run during low-traffic period
5. **Verify data integrity** - Spot-check critical data

### 11.2 User Migration
1. **Communicate changes** - Email users about new system
2. **Create user accounts** - Import existing users into new system
3. **Assign roles** - Map user responsibilities to roles
4. **Training** - Provide user guides and training sessions
5. **Support period** - 2-week support period post-launch

---

## ✅ 12. ACCEPTANCE CRITERIA

System is complete when:

### Database
- [ ] All tables created with proper constraints
- [ ] Indexes created on all frequently queried fields
- [ ] Seed data inserted (roles, permissions, document types)

### Backend API
- [ ] All authentication endpoints working
- [ ] All document CRUD endpoints working
- [ ] Workflow transition API working with validation
- [ ] Permission checking middleware functional
- [ ] Audit logging captures all actions
- [ ] Customer acknowledgement endpoints working

### Frontend
- [ ] Role-based login working
- [ ] Different dashboards load per role
- [ ] Document list filters by role correctly
- [ ] Workflow actions shown/hidden based on permissions
- [ ] Customer acknowledgement UI functional
- [ ] Audit log viewer working
- [ ] Navigation menu filters correctly

### Integration
- [ ] Complete workflow cycle tested end-to-end
- [ ] All roles can perform their designated actions
- [ ] Audit trail captures all transitions
- [ ] Customer can approve/reject documents
- [ ] Performance tests pass (response time < 500ms for 95% of requests)
- [ ] Security audit passes

---

## 📝 13. SAMPLE SCENARIOS

### Scenario 1: Sales to Invoice Flow
1. Sales creates quotation (DRAFT)
2. Sales submits for review (DRAFT → PENDING_REVIEW)
3. Manager approves (PENDING_REVIEW → SENT_TO_CUSTOMER)
4. Customer approves (SENT_TO_CUSTOMER → APPROVED)
5. Accounts converts to invoice (APPROVED → CONVERTED)
6. Accounts sends invoice (CONVERTED → SENT)
7. Customer pays (SENT → PAID)
8. Accounts completes (PAID → COMPLETED)

### Scenario 2: Delivery Flow
1. Sales creates quotation, converts to order
2. Logistic creates delivery order (DRAFT)
3. Manager approves (DRAFT → PENDING_APPROVAL)
4. Logistic assigns driver (APPROVED → OUT_FOR_DELIVERY)
5. Driver delivers, customer confirms (OUT_FOR_DELIVERY → DELIVERED)
6. Logistic completes (DELIVERED → COMPLETED)

### Scenario 3: Rejection Flow
1. Sales creates quotation
2. Manager rejects (PENDING_REVIEW → REJECTED)
3. Sales revises (REJECTED → DRAFT)
4. Sales resubmits (DRAFT → PENDING_REVIEW)
5. Manager approves (PENDING_REVIEW → SENT_TO_CUSTOMER)

---

This design provides a complete blueprint for transforming your application into an enterprise-grade role-based workflow system. All components are designed to work together within a single application while providing distinct experiences per role.
