import { Project, Task, User, TaskTemplate } from '@/types';

export const mockUsers: User[] = [
  { 
    id: '1', 
    role: 'manager', 
    email: 'manager@example.com',
    full_name: 'Manager User',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  { 
    id: '2', 
    role: 'worker', 
    email: 'worker1@example.com',
    full_name: 'Worker 1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  { 
    id: '3', 
    role: 'worker', 
    email: 'worker2@example.com',
    full_name: 'Worker 2',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
];

export const mockTemplates: TaskTemplate[] = [
  {
    id: 'template-1',
    name: 'Content Quality Rating Template',
    description: 'Template for rating blog post quality',
    google_sheet_url: 'https://docs.google.com/spreadsheets/d/template1',
    created_by: '1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    column_config: [
      { id: 'title', name: 'Title', type: 'read' },
      { id: 'content', name: 'Content', type: 'read' },
      { id: 'quality_rating', name: 'Quality Rating', type: 'write', inputType: 'rating', required: true, validation: { min: 1, max: 5 } },
      { id: 'comments', name: 'Comments', type: 'write', inputType: 'textarea' },
    ],
  },
  {
    id: 'template-2',
    name: 'Product Categorization Template',
    description: 'Template for categorizing products',
    google_sheet_url: 'https://docs.google.com/spreadsheets/d/template2',
    created_by: '1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    column_config: [
      { id: 'product_name', name: 'Product Name', type: 'read' },
      { id: 'description', name: 'Description', type: 'read' },
      { id: 'price', name: 'Price', type: 'read' },
      { id: 'category', name: 'Category', type: 'write', inputType: 'select', required: true, options: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Other'] },
      { id: 'confidence', name: 'Confidence Level', type: 'write', inputType: 'radio', required: true, options: ['High', 'Medium', 'Low'] },
    ],
  },
];

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Content Quality Rating',
    description: 'Rate the quality of blog posts on a scale of 1-5',
    template_id: 'template-1',
    language: 'English',
    google_sheet_url: 'https://docs.google.com/spreadsheets/d/1234567890',
    status: 'active',
    created_by: '1',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    total_tasks: 50,
    completed_tasks: 12,
  },
  {
    id: '2',
    name: 'Product Categorization',
    description: 'Categorize products into appropriate categories',
    template_id: 'template-2',
    language: 'English',
    google_sheet_url: 'https://docs.google.com/spreadsheets/d/0987654321',
    status: 'active',
    created_by: '1',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
    total_tasks: 100,
    completed_tasks: 45,
  },
  {
    id: '3',
    name: 'Survey Responses Validation',
    description: 'Validate and clean survey response data',
    template_id: 'template-1',
    language: 'English',
    google_sheet_url: 'https://docs.google.com/spreadsheets/d/1122334455',
    status: 'paused',
    created_by: '1',
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
    total_tasks: 200,
    completed_tasks: 89,
  },
];

export const mockTasks: Task[] = [
  {
    id: '1',
    project_id: '1',
    row_index: 1,
    status: 'pending',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    data: {
      title: 'How to Build Better React Components',
      content: 'React components are the building blocks of modern web applications. In this comprehensive guide, we will explore best practices for creating reusable, maintainable, and performant React components.',
    },
  },
  {
    id: '2',
    project_id: '1',
    row_index: 2,
    status: 'pending',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    data: {
      title: 'Understanding TypeScript Generics',
      content: 'TypeScript generics provide a way to create reusable components that can work with multiple types while maintaining type safety.',
    },
  },
  {
    id: '3',
    project_id: '2',
    row_index: 1,
    status: 'pending',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
    data: {
      product_name: 'Wireless Bluetooth Headphones',
      description: 'High-quality noise-cancelling headphones with 30-hour battery life',
      price: '$149.99',
    },
  },
  {
    id: '4',
    project_id: '2',
    row_index: 2,
    status: 'completed',
    completed_at: '2024-01-22T10:30:00Z',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-22T10:30:00Z',
    data: {
      product_name: 'Cotton T-Shirt',
      description: 'Comfortable 100% cotton t-shirt available in multiple colors',
      price: '$19.99',
      category: 'Clothing',
      confidence: 'High',
    },
  },
];