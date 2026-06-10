
    # ERP ERD
    
    ```mermaid

    erDiagram


TENANTS {
        uuid id PK
        string name
        string slug
        timestamp created_at
    }

    ROLES {
        uuid id PK
        string name
        string description
    }

    USERS {
        uuid id PK
        uuid tenant_id FK
        uuid role_id FK
        uuid auth_user_id
        string email
        string password_hash
        string full_name
        string avatar_url
        boolean is_active
        timestamp last_login
        decimal hourly_cost_rate
        decimal billable_rate
        jsonb skills
        string designation
        string experience
        string availability
        decimal current_workload
        string team
        timestamp created_at
        timestamp updated_at
    }

    CLIENTS {
        uuid id PK
        uuid tenant_id FK
        string name
        string industry
        string service_type
        string contact_name
        string contact_email
        string contact_phone
        text address
        string status
        decimal monthly_retainer
        string currency
        integer contract_duration
        date contract_start
        date contract_end
        text payment_terms
        date renewal_date
        text notes
        string brand_url
        string instagram_profile
        jsonb social_profiles
        string brand_guidelines
        jsonb logo_assets
        jsonb color_palette
        jsonb fonts
        text target_audience
        jsonb competitor_list
        text positioning_statement
        jsonb campaign_history
        jsonb communication_history
        uuid scope_template_id FK
        decimal health_score
        integer retainer_hours
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
        decimal ad_spend
        decimal total_investment
        string invoice_status
        date next_invoice_date
    }

    SCOPE_TEMPLATES {
        uuid id PK
        uuid tenant_id FK
        string name
        string industry
        string service_type
        text description
        integer duration_months
        jsonb default_tasks
        jsonb kpi_framework
        boolean is_active
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    WORKFLOWS {
        uuid id PK
        uuid tenant_id FK
        uuid client_id FK
        uuid template_id FK
        uuid project_manager_id FK
        string title
        string status
        integer month_number
        decimal completion_percentage
        date start_date
        date end_date
        timestamp created_at
        timestamp updated_at
        boolean auto_generated
    }

    TASKS {
        uuid id PK
        uuid tenant_id FK
        uuid workflow_id FK
        uuid assigned_to FK
        uuid parent_task_id FK
        uuid completed_by FK
        string title
        text description
        string status
        string priority
        integer sort_order
        timestamp due_date
        uuid[] depends_on
        boolean is_subtask
        string blocked_previous_status
        timestamp completed_at
        timestamp created_at
        timestamp updated_at
    }

    BLOCKERS {
        uuid id PK
        uuid tenant_id FK
        uuid task_id FK
        uuid client_id FK
        uuid flagged_by FK
        uuid resolved_by FK
        uuid assigned_to FK
        string title
        text description
        string severity
        string status
        text impact
        text resolution_notes
        timestamp flagged_at
        timestamp resolved_at
        timestamp created_at
        timestamp updated_at
        jsonb notify
    }

    ACTIVITY_LOGS {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        string action_type
        string entity_type
        uuid entity_id
        jsonb before_values
        jsonb after_values
        timestamp created_at
    }

    TASK_COMMENTS {
        uuid id PK
        uuid tenant_id FK
        uuid task_id FK
        uuid author_id FK
        text content
        timestamp created_at
        timestamp updated_at
    }

    TASK_ATTACHMENTS {
        uuid id PK
        uuid tenant_id FK
        uuid task_id FK
        uuid uploaded_by FK
        string file_name
        string file_url
        integer file_size
        string mime_type
        timestamp created_at
    }

    TIME_ENTRIES {
        uuid id PK
        uuid tenant_id FK
        uuid task_id FK
        uuid user_id FK
        decimal hours
        date date
        text description
        boolean is_billable
        timestamp created_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        string type
        string title
        text message
        boolean is_read
        string related_entity_type
        uuid related_entity_id
        timestamp created_at
        timestamp read_at
    }

    NOTIFICATION_PREFERENCES {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        string notification_type
        boolean in_app_enabled
        boolean email_enabled
        timestamp created_at
        timestamp updated_at
    }

    HISTORY {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        date date
        jsonb payload
        timestamp created_at
        timestamp updated_at
    }

    CLIENT_USERS {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        uuid client_id FK
        timestamp created_at
    }

    TENANTS ||--o{ USERS : has
    TENANTS ||--o{ CLIENTS : has
    TENANTS ||--o{ SCOPE_TEMPLATES : has
    TENANTS ||--o{ WORKFLOWS : has
    TENANTS ||--o{ TASKS : has
    TENANTS ||--o{ BLOCKERS : has
    TENANTS ||--o{ ACTIVITY_LOGS : has
    TENANTS ||--o{ TASK_COMMENTS : has
    TENANTS ||--o{ TASK_ATTACHMENTS : has
    TENANTS ||--o{ TIME_ENTRIES : has
    TENANTS ||--o{ NOTIFICATIONS : has
    TENANTS ||--o{ NOTIFICATION_PREFERENCES : has
    TENANTS ||--o{ HISTORY : has
    TENANTS ||--o{ CLIENT_USERS : has

    ROLES ||--o{ USERS : assigned_to

    USERS ||--o{ CLIENTS : created_by
    USERS ||--o{ WORKFLOWS : manages
    USERS ||--o{ TASKS : assigned_to
    USERS ||--o{ TASKS : completed_by
    USERS ||--o{ BLOCKERS : flagged_by
    USERS ||--o{ BLOCKERS : resolved_by
    USERS ||--o{ BLOCKERS : assigned_to
    USERS ||--o{ ACTIVITY_LOGS : performs
    USERS ||--o{ TASK_COMMENTS : writes
    USERS ||--o{ TASK_ATTACHMENTS : uploads
    USERS ||--o{ TIME_ENTRIES : logs
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ NOTIFICATION_PREFERENCES : configures
    USERS ||--o{ HISTORY : has
    USERS ||--o{ CLIENT_USERS : assigned_to

    SCOPE_TEMPLATES ||--o{ CLIENTS : assigned_to
    SCOPE_TEMPLATES ||--o{ WORKFLOWS : generates

    CLIENTS ||--o{ WORKFLOWS : contains
    CLIENTS ||--o{ BLOCKERS : affected_by
    CLIENTS ||--o{ CLIENT_USERS : assigned_to

    WORKFLOWS ||--o{ TASKS : contains

    TASKS ||--o{ TASKS : parent_of
    TASKS ||--o{ BLOCKERS : blocked_by
    TASKS ||--o{ TASK_COMMENTS : contains
    TASKS ||--o{ TASK_ATTACHMENTS : contains
    TASKS ||--o{ TIME_ENTRIES : tracked_in
```
