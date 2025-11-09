import { SheetConfig, StatusOption } from '@/types';

// Manual Case Options
const manualCaseOptions: StatusOption[] = [
  { label: 'Fake NDR Remark', value: 'Fake NDR Remark', color: '#ef4444' },
  { label: 'Delivery Issue', value: 'Delivery Issue', color: '#f97316' },
  { label: 'Delayed RTO', value: 'Delayed RTO', color: '#f59e0b' },
  { label: 'Reverse Pickup', value: 'Reverse Pickup', color: '#84cc16' },
  { label: 'Reverse delivery issues', value: 'Reverse delivery issues', color: '#22c55e' },
  { label: 'Delayed Pickup', value: 'Delayed Pickup', color: '#10b981' },
  { label: 'Re Attempt', value: 'Re Attempt', color: '#14b8a6' },
  { label: 'COD Delay', value: 'COD Delay', color: '#06b6d4' },
  { label: 'EDD Breach', value: 'EDD Breach', color: '#8b5cf6' },
  { label: 'EDD Urgent', value: 'EDD Urgent', color: '#d946ef' },
];

// Manual Ticket Status Options
const manualTicketStatusOptions: StatusOption[] = [
  { label: 'Open', value: 'Open', color: '#f59e0b' },
  { label: 'Close', value: 'Close', color: '#10b981' },
];

// Escalation Sheet Configuration
export const escalationSheetConfig: SheetConfig = {
  id: 'escalations',
  name: 'Escalation Sheet',
  icon: 'AlertCircle',
  description: 'Manage shipment escalations and track resolution status',
  views: [
    {
      id: 'open',
      name: 'Open Escalations',
      description: 'View all open escalations that need attention',
      filters: [
        {
          columnId: 'is_closed',
          operator: 'equals',
          value: 0, // 0 means open/not closed
        },
      ],
      isDefault: true,
    },
    {
      id: 'closed',
      name: 'Closed Escalations',
      description: 'View all closed and resolved escalations',
      filters: [
        {
          columnId: 'is_closed',
          operator: 'equals',
          value: 1, // 1 means closed
        },
      ],
      isDefault: false,
    },
  ],
  columns: [
    {
      id: 'shipment_no',
      label: 'Shipment No',
      type: 'number',
      width: 120,
      required: false,
      editable: true,
    },
    {
      id: 'awb_no',
      label: 'AWB No',
      type: 'text',
      width: 120,
      required: false,
      editable: false,
    },
    {
      id: 'notes',
      label: 'Notes',
      type: 'longtext',
      width: 200,
      required: false,
      editable: true,
    },
    {
      id: 'partner_name',
      label: 'Partner Name',
      type: 'text',
      width: 150,
      required: false,
      editable: false,
    },
    {
      id: 'manual_case',
      label: 'Manual Case',
      type: 'status',
      width: 180,
      required: false,
      editable: true,
      options: manualCaseOptions,
    },
    {
      id: 'partner_remarks',
      label: 'Partner Remarks',
      type: 'longtext',
      width: 200,
      required: false,
      editable: false,
    },
    {
      id: 'followup_remarks',
      label: 'Followup Remarks',
      type: 'longtext',
      width: 200,
      required: false,
      editable: true,
    },
    {
      id: 'vamashipper',
      label: 'Vamashipper',
      type: 'text',
      width: 120,
      required: false,
      editable: false,
    },
    {
      id: 'source_of_complaint',
      label: 'Source of Complaint',
      type: 'text',
      width: 180,
      required: false,
      editable: true,
    },
    {
      id: 'auto_ticket_status',
      label: 'Auto Ticket Status',
      type: 'text',
      width: 150,
      required: false,
      editable: false,
    },
    {
      id: 'manual_ticket_status',
      label: 'Manual Ticket Status',
      type: 'status',
      width: 180,
      required: false,
      editable: true,
      options: manualTicketStatusOptions,
    },
    {
      id: 'created_at',
      label: 'Created At',
      type: 'datetime',
      width: 150,
      required: false,
      editable: false,
    },
    {
      id: 'updated_at',
      label: 'Updated At',
      type: 'datetime',
      width: 150,
      required: false,
      editable: false,
    },
    {
      id: 'latest_tracking_status',
      label: 'Latest Tracking Status',
      type: 'text',
      width: 180,
      required: false,
      editable: false,
    },
    {
      id: 'consignee_name',
      label: 'Consignee Name',
      type: 'text',
      width: 150,
      required: false,
      editable: false,
    },
    {
      id: 'consignee_no',
      label: 'Consignee No',
      type: 'phone',
      width: 120,
      required: false,
      editable: false,
    },
    {
      id: 'duplicate_awb',
      label: 'Duplicate AWB',
      type: 'text',
      width: 120,
      required: false,
      editable: false,
    },
    {
      id: 'email_subject',
      label: 'Email Subject',
      type: 'text',
      width: 200,
      required: false,
      editable: true,
    },
    {
      id: 'last_modified_by',
      label: 'Last Modified By',
      type: 'text',
      width: 150,
      required: false,
      editable: false,
    },
    {
      id: 'shipment_booking_date',
      label: 'Booking Date',
      type: 'date',
      width: 150,
      required: false,
      editable: false,
    },
    {
      id: 'seller_name',
      label: 'Seller Name',
      type: 'text',
      width: 150,
      required: false,
      editable: false,
    },
    {
      id: 'seller_mobile',
      label: 'Seller Mobile',
      type: 'phone',
      width: 120,
      required: false,
      editable: false,
    },
    {
      id: 'entity_id',
      label: 'Entity ID',
      type: 'number',
      width: 100,
      required: false,
      editable: false,
    },
    {
      id: 'ticket_delay',
      label: 'Ticket Delay',
      type: 'number',
      width: 120,
      required: false,
      editable: false,
    },
    {
      id: 'lr_number',
      label: 'LR Number',
      type: 'text',
      width: 120,
      required: false,
      editable: true,
    },
    {
      id: 'closure_datetime',
      label: 'Closure DateTime',
      type: 'datetime',
      width: 180,
      required: false,
      editable: true,
    },
    {
      id: 'partner_comment_ndr',
      label: 'Partner Comment NDR',
      type: 'text',
      width: 180,
      required: false,
      editable: false,
    },
    {
      id: 'edd_partner',
      label: 'EDD Partner',
      type: 'text',
      width: 120,
      required: false,
      editable: false,
    },
    {
      id: 'reattempt_count',
      label: 'Reattempt Count',
      type: 'number',
      width: 140,
      required: false,
      editable: false,
    },
  ],
  defaultSort: {
    columnId: 'created_at',
    direction: 'desc',
  },
  permissions: {
    admin: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
    },
    editor: {
      canView: true,
      canEdit: true,
      canDelete: false,
      canExport: true,
    },
    viewer: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canExport: false,
    },
  },
};

// Portfolio Sheet Configuration
export const portfolioSheetConfig: SheetConfig = {
  id: 'portfolio',
  name: 'Portfolio',
  icon: 'Star',
  description: 'Excellence in action - A showcase of talent and innovation',
  views: [],
  columns: [
    {
      id: 'title',
      label: 'Title',
      type: 'text',
      width: 200,
      required: false,
      editable: true,
    },
    {
      id: 'description',
      label: 'Description',
      type: 'longtext',
      width: 300,
      required: false,
      editable: true,
    },
    {
      id: 'status',
      label: 'Status',
      type: 'status',
      width: 150,
      required: false,
      editable: true,
      options: [
        { label: 'Active', value: 'Active', color: '#10b981' },
        { label: 'In Progress', value: 'In Progress', color: '#f59e0b' },
        { label: 'Completed', value: 'Completed', color: '#8b5cf6' },
      ],
    },
    {
      id: 'created_date',
      label: 'Created Date',
      type: 'date',
      width: 150,
      required: false,
      editable: true,
    },
  ],
  defaultSort: {
    columnId: 'created_date',
    direction: 'desc',
  },
  permissions: {
    admin: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
    },
    editor: {
      canView: true,
      canEdit: true,
      canDelete: false,
      canExport: true,
    },
    viewer: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canExport: false,
    },
  },
};

// All available sheets
export const sheets: SheetConfig[] = [escalationSheetConfig, portfolioSheetConfig];

// Helper to get sheet by ID
export const getSheetById = (id: string): SheetConfig | undefined => {
  return sheets.find((sheet) => sheet.id === id);
};
